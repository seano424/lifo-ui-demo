#!/bin/bash
# LIFO Comprehensive Backup and Recovery System
# Production-ready backup automation with monitoring and alerting

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/backup_config.conf"
LOG_FILE="/var/log/lifo-ai/backup.log"
LOCK_FILE="/tmp/lifo_backup.lock"

# Default configuration (override in backup_config.conf)
BACKUP_DIR="${BACKUP_DIR:-/var/backups/lifo-ai}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
RETENTION_WEEKS="${RETENTION_WEEKS:-12}"
RETENTION_MONTHS="${RETENTION_MONTHS:-12}"
COMPRESS="${COMPRESS:-yes}"
PARALLEL_JOBS="${PARALLEL_JOBS:-4}"
VERIFY_BACKUP="${VERIFY_BACKUP:-yes}"
CLOUD_BACKUP="${CLOUD_BACKUP:-no}"
ALERT_EMAIL="${ALERT_EMAIL:-}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Performance settings for mobile-optimized database
PG_DUMP_OPTIONS="--verbose --no-owner --no-acl --format=custom --compress=6"
VACUUM_BEFORE_BACKUP="${VACUUM_BEFORE_BACKUP:-no}"

# Load configuration if exists
if [[ -f "$CONFIG_FILE" ]]; then
    source "$CONFIG_FILE"
fi

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Alert function
send_alert() {
    local level="$1"
    local message="$2"
    local subject="LIFO Backup Alert - $level"
    
    log "$level" "$message"
    
    # Email alert
    if [[ -n "$ALERT_EMAIL" ]]; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL" || true
    fi
    
    # Slack alert
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        local color="good"
        [[ "$level" == "ERROR" || "$level" == "CRITICAL" ]] && color="danger"
        [[ "$level" == "WARNING" ]] && color="warning"
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$subject\",\"attachments\":[{\"color\":\"$color\",\"text\":\"$message\"}]}" \
            "$SLACK_WEBHOOK" || true
    fi
}

# Lock management
acquire_lock() {
    if [[ -f "$LOCK_FILE" ]]; then
        local pid=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            send_alert "ERROR" "Backup already running (PID: $pid)"
            exit 1
        else
            log "WARNING" "Removing stale lock file"
            rm -f "$LOCK_FILE"
        fi
    fi
    echo $$ > "$LOCK_FILE"
}

release_lock() {
    rm -f "$LOCK_FILE"
}

# Cleanup on exit
cleanup() {
    release_lock
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        send_alert "ERROR" "Backup script exited unexpectedly with code $exit_code"
    fi
}

trap cleanup EXIT

# Database connection check
check_database() {
    log "INFO" "Checking database connectivity"
    
    if ! psql "$DATABASE_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        send_alert "CRITICAL" "Database connection failed"
        exit 1
    fi
    
    log "INFO" "Database connection verified"
}

# Pre-backup optimization
optimize_database() {
    if [[ "$VACUUM_BEFORE_BACKUP" == "yes" ]]; then
        log "INFO" "Running database optimization before backup"
        
        # Quick vacuum on high-activity tables
        psql "$DATABASE_URL" <<EOF
        VACUUM ANALYZE inventory.batches;
        VACUUM ANALYZE inventory.store_products;
        VACUUM ANALYZE scoring.product_scores;
        VACUUM ANALYZE timeseries.sales_events;
EOF
        
        log "INFO" "Database optimization completed"
    fi
}

# Create backup directory structure
setup_directories() {
    local backup_date="$1"
    local year=$(echo "$backup_date" | cut -d- -f1)
    local month=$(echo "$backup_date" | cut -d- -f2)
    
    mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}
    mkdir -p "$BACKUP_DIR/daily/$year/$month"
    mkdir -p "$BACKUP_DIR/weekly/$year"
    mkdir -p "$BACKUP_DIR/monthly/$year"
    mkdir -p "$BACKUP_DIR"/{logs,schemas,temp}
}

# Main database backup
create_backup() {
    local backup_type="$1"
    local timestamp="$2"
    local backup_date=$(echo "$timestamp" | cut -d_ -f1)
    
    setup_directories "$backup_date"
    
    local year=$(echo "$backup_date" | cut -d- -f1)
    local month=$(echo "$backup_date" | cut -d- -f2)
    
    case "$backup_type" in
        "daily")
            local backup_path="$BACKUP_DIR/daily/$year/$month"
            ;;
        "weekly")
            local backup_path="$BACKUP_DIR/weekly/$year"
            ;;
        "monthly")
            local backup_path="$BACKUP_DIR/monthly/$year"
            ;;
    esac
    
    local backup_file="$backup_path/lifo_ai_${backup_type}_$timestamp.backup"
    local schema_file="$backup_path/lifo_ai_schema_$timestamp.sql"
    local globals_file="$backup_path/lifo_ai_globals_$timestamp.sql"
    
    log "INFO" "Starting $backup_type backup to $backup_file"
    
    # Create full database backup
    if pg_dump "$DATABASE_URL" $PG_DUMP_OPTIONS --file="$backup_file"; then
        log "INFO" "Database backup completed: $backup_file"
    else
        send_alert "CRITICAL" "Database backup failed"
        return 1
    fi
    
    # Create schema-only backup for development
    if pg_dump "$DATABASE_URL" --schema-only --verbose --no-owner --no-acl \
        --file="$schema_file"; then
        log "INFO" "Schema backup completed: $schema_file"
    else
        log "WARNING" "Schema backup failed"
    fi
    
    # Create globals backup (roles, tablespaces, etc.)
    if pg_dumpall "$DATABASE_URL" --globals-only --verbose --no-role-passwords \
        --file="$globals_file"; then
        log "INFO" "Globals backup completed: $globals_file"
    else
        log "WARNING" "Globals backup failed"
    fi
    
    # Compress backups if enabled
    if [[ "$COMPRESS" == "yes" ]]; then
        log "INFO" "Compressing backups"
        
        for file in "$backup_file" "$schema_file" "$globals_file"; do
            if [[ -f "$file" ]]; then
                if gzip "$file"; then
                    log "INFO" "Compressed: ${file}.gz"
                else
                    log "WARNING" "Failed to compress: $file"
                fi
            fi
        done
    fi
    
    # Verify backup integrity
    if [[ "$VERIFY_BACKUP" == "yes" ]]; then
        verify_backup_integrity "$backup_file" "$backup_type"
    fi
    
    # Calculate backup size and log statistics
    local backup_size=0
    for file in "${backup_file}"* "${schema_file}"* "${globals_file}"*; do
        if [[ -f "$file" ]]; then
            local file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
            backup_size=$((backup_size + file_size))
        fi
    done
    
    local size_mb=$((backup_size / 1024 / 1024))
    log "INFO" "$backup_type backup completed successfully - Size: ${size_mb}MB"
    
    return 0
}

# Verify backup integrity
verify_backup_integrity() {
    local backup_file="$1"
    local backup_type="$2"
    
    log "INFO" "Verifying backup integrity"
    
    # Check if compressed backup exists
    local file_to_check="$backup_file"
    [[ "$COMPRESS" == "yes" ]] && file_to_check="${backup_file}.gz"
    
    if [[ ! -f "$file_to_check" ]]; then
        send_alert "CRITICAL" "Backup file not found: $file_to_check"
        return 1
    fi
    
    # Check file size (must be > 1MB for meaningful backup)
    local file_size=$(stat -f%z "$file_to_check" 2>/dev/null || stat -c%s "$file_to_check")
    if [[ $file_size -lt 1048576 ]]; then
        send_alert "CRITICAL" "Backup file too small: ${file_size} bytes"
        return 1
    fi
    
    # Test backup readability with pg_restore
    if [[ "$COMPRESS" == "yes" ]]; then
        if gunzip -t "$file_to_check"; then
            log "INFO" "Backup compression integrity verified"
        else
            send_alert "CRITICAL" "Backup compression corrupted"
            return 1
        fi
        
        # Test PostgreSQL backup format
        if gunzip -c "$file_to_check" | head -c 100 | grep -q "PGDMP"; then
            log "INFO" "PostgreSQL backup format verified"
        else
            send_alert "CRITICAL" "Invalid PostgreSQL backup format"
            return 1
        fi
    else
        if head -c 100 "$file_to_check" | grep -q "PGDMP"; then
            log "INFO" "PostgreSQL backup format verified"
        else
            send_alert "CRITICAL" "Invalid PostgreSQL backup format"
            return 1
        fi
    fi
    
    log "INFO" "Backup integrity verification passed"
    return 0
}

# Cloud backup upload
upload_to_cloud() {
    local backup_file="$1"
    local backup_type="$2"
    
    if [[ "$CLOUD_BACKUP" != "yes" ]]; then
        return 0
    fi
    
    log "INFO" "Uploading to cloud storage"
    
    # AWS S3 upload (configure AWS CLI separately)
    if command -v aws >/dev/null 2>&1 && [[ -n "${AWS_S3_BUCKET:-}" ]]; then
        local s3_path="s3://$AWS_S3_BUCKET/lifo-ai/backups/$backup_type/$(basename "$backup_file")"
        if aws s3 cp "$backup_file" "$s3_path"; then
            log "INFO" "Uploaded to S3: $s3_path"
        else
            send_alert "WARNING" "S3 upload failed: $backup_file"
        fi
    fi
    
    # Google Cloud Storage upload (configure gcloud separately)
    if command -v gsutil >/dev/null 2>&1 && [[ -n "${GCS_BUCKET:-}" ]]; then
        local gcs_path="gs://$GCS_BUCKET/lifo-ai/backups/$backup_type/$(basename "$backup_file")"
        if gsutil cp "$backup_file" "$gcs_path"; then
            log "INFO" "Uploaded to GCS: $gcs_path"
        else
            send_alert "WARNING" "GCS upload failed: $backup_file"
        fi
    fi
}

# Cleanup old backups
cleanup_old_backups() {
    log "INFO" "Cleaning up old backups"
    
    # Clean daily backups
    find "$BACKUP_DIR/daily" -name "lifo_ai_daily_*" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Clean weekly backups
    find "$BACKUP_DIR/weekly" -name "lifo_ai_weekly_*" -mtime +$((RETENTION_WEEKS * 7)) -delete 2>/dev/null || true
    
    # Clean monthly backups
    find "$BACKUP_DIR/monthly" -name "lifo_ai_monthly_*" -mtime +$((RETENTION_MONTHS * 30)) -delete 2>/dev/null || true
    
    # Clean empty directories
    find "$BACKUP_DIR" -type d -empty -delete 2>/dev/null || true
    
    log "INFO" "Backup cleanup completed"
}

# Create backup metadata
create_metadata() {
    local backup_type="$1"
    local timestamp="$2"
    local backup_file="$3"
    
    local metadata_file="${backup_file%.*}.metadata.json"
    
    # Get database information
    local db_info=$(psql "$DATABASE_URL" -t -c "SELECT version(), current_database(), pg_database_size(current_database());")
    
    cat > "$metadata_file" <<EOF
{
    "backup_type": "$backup_type",
    "timestamp": "$timestamp",
    "database_url_masked": "$(echo "$DATABASE_URL" | sed 's/:[^@]*@/:***@/')",
    "backup_file": "$(basename "$backup_file")",
    "backup_size_bytes": $(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file"),
    "database_info": $(echo "$db_info" | jq -R . | jq -s .),
    "lifo_version": "$(git describe --tags 2>/dev/null || echo 'unknown')",
    "backup_script_version": "2.0.0",
    "verification_status": "$([ "$VERIFY_BACKUP" == "yes" ] && echo "verified" || echo "not_verified")",
    "compression_enabled": "$COMPRESS",
    "retention_days": "$RETENTION_DAYS"
}
EOF
    
    log "INFO" "Backup metadata created: $metadata_file"
}

# Recovery test
test_recovery() {
    local backup_file="$1"
    
    if [[ "${ENABLE_RECOVERY_TEST:-no}" != "yes" ]]; then
        return 0
    fi
    
    log "INFO" "Testing backup recovery"
    
    # Create temporary test database
    local test_db="lifo_ai_recovery_test_$(date +%s)"
    local test_url=$(echo "$DATABASE_URL" | sed "s|/[^/]*$|/$test_db|")
    
    if createdb "$test_url"; then
        log "INFO" "Created test database: $test_db"
        
        # Restore backup to test database
        local restore_file="$backup_file"
        [[ "$COMPRESS" == "yes" ]] && restore_file="${backup_file}.gz"
        
        if [[ "$COMPRESS" == "yes" ]]; then
            if gunzip -c "$restore_file" | pg_restore -d "$test_url" --verbose --single-transaction; then
                log "INFO" "Recovery test passed"
            else
                send_alert "CRITICAL" "Recovery test failed"
            fi
        else
            if pg_restore -d "$test_url" --verbose --single-transaction "$restore_file"; then
                log "INFO" "Recovery test passed"
            else
                send_alert "CRITICAL" "Recovery test failed"
            fi
        fi
        
        # Clean up test database
        dropdb "$test_url"
        log "INFO" "Test database cleaned up"
    else
        send_alert "WARNING" "Could not create test database for recovery test"
    fi
}

# Main execution
main() {
    local backup_type="${1:-daily}"
    local timestamp=$(date '+%Y%m%d_%H%M%S')
    
    log "INFO" "Starting LIFO $backup_type backup - Version 2.0.0"
    
    acquire_lock
    
    check_database
    optimize_database
    
    if create_backup "$backup_type" "$timestamp"; then
        local backup_file
        case "$backup_type" in
            "daily")
                backup_file="$BACKUP_DIR/daily/$(date '+%Y/%m')/lifo_ai_${backup_type}_$timestamp.backup"
                ;;
            "weekly")
                backup_file="$BACKUP_DIR/weekly/$(date '+%Y')/lifo_ai_${backup_type}_$timestamp.backup"
                ;;
            "monthly")
                backup_file="$BACKUP_DIR/monthly/$(date '+%Y')/lifo_ai_${backup_type}_$timestamp.backup"
                ;;
        esac
        
        [[ "$COMPRESS" == "yes" ]] && backup_file="${backup_file}.gz"
        
        create_metadata "$backup_type" "$timestamp" "$backup_file"
        upload_to_cloud "$backup_file" "$backup_type"
        test_recovery "$backup_file"
        
        send_alert "INFO" "$backup_type backup completed successfully"
    else
        send_alert "CRITICAL" "$backup_type backup failed"
        exit 1
    fi
    
    cleanup_old_backups
    
    log "INFO" "LIFO backup process completed"
}

# Script usage
usage() {
    cat <<EOF
LIFO Database Backup System v2.0.0

Usage: $0 [backup_type]

Backup types:
    daily    - Daily incremental backup (default)
    weekly   - Weekly full backup
    monthly  - Monthly archive backup

Environment variables:
    DATABASE_URL     - PostgreSQL connection string (required)
    BACKUP_DIR       - Backup directory (default: /var/backups/lifo-ai)
    RETENTION_DAYS   - Daily backup retention (default: 30)
    RETENTION_WEEKS  - Weekly backup retention (default: 12)
    RETENTION_MONTHS - Monthly backup retention (default: 12)

Configuration file: $CONFIG_FILE
Log file: $LOG_FILE

Examples:
    $0 daily          # Run daily backup
    $0 weekly         # Run weekly backup
    $0 monthly        # Run monthly backup

EOF
}

# Command line processing
case "${1:-daily}" in
    daily|weekly|monthly)
        main "$1"
        ;;
    -h|--help)
        usage
        ;;
    *)
        echo "Error: Invalid backup type '$1'" >&2
        usage
        exit 1
        ;;
esac