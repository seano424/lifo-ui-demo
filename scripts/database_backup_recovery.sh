#!/bin/bash

# Database Backup and Recovery System for LIFO
# Handles Supabase PostgreSQL backup with enterprise scaling
# Supports both MCP-based operations and traditional pg_dump

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
LOG_DIR="${LOG_DIR:-$PROJECT_ROOT/logs}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Backup retention policy
DAILY_RETENTION_DAYS=${DAILY_RETENTION_DAYS:-7}
WEEKLY_RETENTION_WEEKS=${WEEKLY_RETENTION_WEEKS:-4}
MONTHLY_RETENTION_MONTHS=${MONTHLY_RETENTION_MONTHS:-12}

# Performance settings
BACKUP_COMPRESSION_LEVEL=${BACKUP_COMPRESSION_LEVEL:-6}
PARALLEL_JOBS=${PARALLEL_JOBS:-4}

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_DIR}/backup_$(date +%Y%m%d).log"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${LOG_DIR}/backup_$(date +%Y%m%d).log" >&2
}

# Initialize directories
init_directories() {
    log "Initializing backup directories"
    mkdir -p "${BACKUP_DIR}"/{daily,weekly,monthly,temp}
    mkdir -p "${LOG_DIR}"
    chmod 750 "${BACKUP_DIR}"
    chmod 750 "${LOG_DIR}"
}

# Load environment variables
load_env() {
    if [[ -f "${PROJECT_ROOT}/.env.local" ]]; then
        source "${PROJECT_ROOT}/.env.local"
        log "Environment loaded from .env.local"
    else
        error "Environment file not found: ${PROJECT_ROOT}/.env.local"
        return 1
    fi
}

# Test database connection
test_connection() {
    log "Testing database connection"
    
    if [[ -z "${DATABASE_URL:-}" ]]; then
        error "DATABASE_URL not set"
        return 1
    fi
    
    # Parse DATABASE_URL to get connection parameters
    DB_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg:/postgresql:/')
    
    if psql "$DB_URL" -c "SELECT 1;" >/dev/null 2>&1; then
        log "Database connection successful"
        return 0
    else
        error "Database connection failed"
        return 1
    fi
}

# Get database size and statistics
get_db_stats() {
    local db_url="$1"
    
    log "Gathering database statistics"
    
    # Get database size
    local db_size=$(psql "$db_url" -t -c "SELECT pg_size_pretty(pg_database_size(current_database()));")
    
    # Get table count and largest tables
    local table_stats=$(psql "$db_url" -t -c "
        SELECT 
            schemaname || '.' || tablename as table_name,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname IN ('business', 'inventory', 'analytics') 
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
        LIMIT 10;
    ")
    
    log "Database size: $db_size"
    log "Top tables by size:"
    echo "$table_stats" | while read -r line; do
        log "  $line"
    done
}

# Create full database backup
create_full_backup() {
    local backup_type="$1"  # daily, weekly, monthly
    local backup_file="${BACKUP_DIR}/${backup_type}/lifo_full_${TIMESTAMP}.sql"
    local compressed_file="${backup_file}.gz"
    
    log "Starting full backup: $backup_type"
    
    # Parse DATABASE_URL
    DB_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg:/postgresql:/')
    
    # Get database statistics before backup
    get_db_stats "$DB_URL"
    
    # Create backup with optimal settings for large databases
    log "Creating backup file: $backup_file"
    
    if pg_dump "$DB_URL" \
        --verbose \
        --no-password \
        --format=plain \
        --no-privileges \
        --no-owner \
        --compress=0 \
        --jobs="$PARALLEL_JOBS" \
        --file="$backup_file" 2>&1 | tee -a "${LOG_DIR}/backup_$(date +%Y%m%d).log"; then
        
        log "Backup creation successful"
        
        # Compress the backup
        log "Compressing backup with level $BACKUP_COMPRESSION_LEVEL"
        if gzip -"$BACKUP_COMPRESSION_LEVEL" "$backup_file"; then
            log "Compression successful: $compressed_file"
            
            # Get file sizes
            local compressed_size=$(du -h "$compressed_file" | cut -f1)
            log "Backup size: $compressed_size"
            
            # Verify backup integrity
            if verify_backup "$compressed_file"; then
                log "Backup verification successful"
                return 0
            else
                error "Backup verification failed"
                rm -f "$compressed_file"
                return 1
            fi
        else
            error "Backup compression failed"
            rm -f "$backup_file"
            return 1
        fi
    else
        error "Backup creation failed"
        rm -f "$backup_file"
        return 1
    fi
}

# Verify backup integrity
verify_backup() {
    local backup_file="$1"
    
    log "Verifying backup integrity: $(basename "$backup_file")"
    
    # Test gzip integrity
    if ! gzip -t "$backup_file" >/dev/null 2>&1; then
        error "Backup file is corrupted (gzip test failed)"
        return 1
    fi
    
    # Test SQL syntax by parsing the first few lines
    if ! zcat "$backup_file" | head -100 | grep -q "PostgreSQL database dump"; then
        error "Backup file does not appear to be a valid PostgreSQL dump"
        return 1
    fi
    
    log "Backup integrity verification passed"
    return 0
}

# Create schema-only backup (for faster recovery testing)
create_schema_backup() {
    local backup_file="${BACKUP_DIR}/daily/lifo_schema_${TIMESTAMP}.sql"
    
    log "Creating schema-only backup"
    
    DB_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg:/postgresql:/')
    
    if pg_dump "$DB_URL" \
        --verbose \
        --no-password \
        --schema-only \
        --format=plain \
        --file="$backup_file" 2>&1 | tee -a "${LOG_DIR}/backup_$(date +%Y%m%d).log"; then
        
        gzip -"$BACKUP_COMPRESSION_LEVEL" "$backup_file"
        log "Schema backup created: ${backup_file}.gz"
        return 0
    else
        error "Schema backup failed"
        return 1
    fi
}

# Export specific tables for MCP operations
export_mcp_tables() {
    local backup_dir="${BACKUP_DIR}/temp/mcp_export_${TIMESTAMP}"
    mkdir -p "$backup_dir"
    
    log "Exporting MCP-critical tables"
    
    DB_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg:/postgresql:/')
    
    # Tables critical for MCP operations
    local mcp_tables=(
        "business.stores"
        "inventory.products"
        "inventory.store_products"
        "inventory.batches"
        "analytics.product_scores"
    )
    
    for table in "${mcp_tables[@]}"; do
        local table_file="${backup_dir}/${table//\./_}_${TIMESTAMP}.sql"
        
        log "Exporting table: $table"
        
        if pg_dump "$DB_URL" \
            --verbose \
            --no-password \
            --table="$table" \
            --format=plain \
            --data-only \
            --file="$table_file"; then
            
            gzip -"$BACKUP_COMPRESSION_LEVEL" "$table_file"
            log "Table export successful: ${table_file}.gz"
        else
            error "Table export failed: $table"
        fi
    done
    
    # Create manifest file
    echo "MCP Tables Export - $(date)" > "${backup_dir}/manifest.txt"
    echo "Timestamp: $TIMESTAMP" >> "${backup_dir}/manifest.txt"
    echo "Tables exported:" >> "${backup_dir}/manifest.txt"
    printf '%s\n' "${mcp_tables[@]}" >> "${backup_dir}/manifest.txt"
    
    log "MCP tables export completed: $backup_dir"
}

# Cleanup old backups based on retention policy
cleanup_old_backups() {
    log "Starting backup cleanup with retention policy"
    
    # Daily backups - keep last N days
    log "Cleaning daily backups older than $DAILY_RETENTION_DAYS days"
    find "${BACKUP_DIR}/daily" -name "*.sql.gz" -mtime +$DAILY_RETENTION_DAYS -exec rm -f {} \;
    
    # Weekly backups - keep last N weeks
    log "Cleaning weekly backups older than $((WEEKLY_RETENTION_WEEKS * 7)) days"
    find "${BACKUP_DIR}/weekly" -name "*.sql.gz" -mtime +$((WEEKLY_RETENTION_WEEKS * 7)) -exec rm -f {} \;
    
    # Monthly backups - keep last N months
    log "Cleaning monthly backups older than $((MONTHLY_RETENTION_MONTHS * 30)) days"
    find "${BACKUP_DIR}/monthly" -name "*.sql.gz" -mtime +$((MONTHLY_RETENTION_MONTHS * 30)) -exec rm -f {} \;
    
    # Temp exports - keep for 7 days
    log "Cleaning temp exports older than 7 days"
    find "${BACKUP_DIR}/temp" -type d -name "mcp_export_*" -mtime +7 -exec rm -rf {} \;
    
    log "Backup cleanup completed"
}

# Test backup restoration (dry run)
test_restore() {
    local backup_file="$1"
    local test_db_name="lifo_restore_test_${TIMESTAMP}"
    
    log "Testing backup restoration: $(basename "$backup_file")"
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        return 1
    fi
    
    # Create test database
    DB_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg:/postgresql:/')
    local db_host_url=$(echo "$DB_URL" | sed "s|/[^/]*$|/postgres|")
    
    log "Creating test database: $test_db_name"
    if psql "$db_host_url" -c "CREATE DATABASE \"$test_db_name\";" >/dev/null 2>&1; then
        
        local test_db_url=$(echo "$DB_URL" | sed "s|/[^/]*$|/$test_db_name|")
        
        # Restore backup to test database
        log "Restoring backup to test database"
        if zcat "$backup_file" | psql "$test_db_url" >/dev/null 2>&1; then
            
            # Test basic queries
            log "Testing restored database"
            local table_count=$(psql "$test_db_url" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('business', 'inventory', 'analytics');")
            
            log "Restored database has $table_count tables"
            
            # Cleanup test database
            psql "$db_host_url" -c "DROP DATABASE \"$test_db_name\";" >/dev/null 2>&1
            log "Test restoration successful"
            return 0
        else
            error "Test restoration failed"
            psql "$db_host_url" -c "DROP DATABASE \"$test_db_name\";" >/dev/null 2>&1 || true
            return 1
        fi
    else
        error "Failed to create test database"
        return 1
    fi
}

# Monitor replication lag (for production setups)
check_replication_lag() {
    log "Checking replication lag"
    
    DB_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg:/postgresql:/')
    
    # Check if this is a replica
    local is_replica=$(psql "$DB_URL" -t -c "SELECT pg_is_in_recovery();")
    
    if [[ "$is_replica" == "t" ]]; then
        log "This is a replica database"
        
        # Get replication lag
        local lag=$(psql "$DB_URL" -t -c "
            SELECT 
                CASE 
                    WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn() THEN 0
                    ELSE EXTRACT (EPOCH FROM now() - pg_last_xact_replay_timestamp())
                END as lag_seconds;
        ")
        
        log "Replication lag: ${lag} seconds"
        
        # Alert if lag is too high
        if (( $(echo "$lag > 300" | bc -l) )); then
            error "Replication lag is high: ${lag} seconds"
            return 1
        fi
    else
        log "This is the primary database"
    fi
    
    return 0
}

# Generate backup report
generate_backup_report() {
    local report_file="${LOG_DIR}/backup_report_${TIMESTAMP}.txt"
    
    log "Generating backup report"
    
    {
        echo "LIFO Database Backup Report"
        echo "Generated: $(date)"
        echo "======================================="
        echo
        
        echo "Backup Statistics:"
        echo "- Daily backups: $(find "${BACKUP_DIR}/daily" -name "*.sql.gz" | wc -l)"
        echo "- Weekly backups: $(find "${BACKUP_DIR}/weekly" -name "*.sql.gz" | wc -l)"
        echo "- Monthly backups: $(find "${BACKUP_DIR}/monthly" -name "*.sql.gz" | wc -l)"
        echo
        
        echo "Storage Usage:"
        echo "- Total backup size: $(du -sh "${BACKUP_DIR}" | cut -f1)"
        echo "- Daily backup size: $(du -sh "${BACKUP_DIR}/daily" | cut -f1)"
        echo "- Weekly backup size: $(du -sh "${BACKUP_DIR}/weekly" | cut -f1)"
        echo "- Monthly backup size: $(du -sh "${BACKUP_DIR}/monthly" | cut -f1)"
        echo
        
        echo "Recent Backups:"
        find "${BACKUP_DIR}" -name "*.sql.gz" -mtime -1 -exec ls -lh {} \;
        echo
        
        echo "Configuration:"
        echo "- Daily retention: $DAILY_RETENTION_DAYS days"
        echo "- Weekly retention: $WEEKLY_RETENTION_WEEKS weeks"
        echo "- Monthly retention: $MONTHLY_RETENTION_MONTHS months"
        echo "- Compression level: $BACKUP_COMPRESSION_LEVEL"
        echo "- Parallel jobs: $PARALLEL_JOBS"
        
    } > "$report_file"
    
    log "Backup report generated: $report_file"
}

# Main backup function
run_backup() {
    local backup_type="${1:-daily}"
    
    log "Starting LIFO database backup - Type: $backup_type"
    
    # Initialize
    init_directories
    load_env
    
    # Test connection
    if ! test_connection; then
        error "Cannot proceed without database connection"
        exit 1
    fi
    
    # Create backups
    case "$backup_type" in
        "daily")
            create_full_backup "daily"
            create_schema_backup
            export_mcp_tables
            ;;
        "weekly")
            create_full_backup "weekly"
            ;;
        "monthly")
            create_full_backup "monthly"
            ;;
        *)
            error "Invalid backup type: $backup_type"
            exit 1
            ;;
    esac
    
    # Check replication lag
    check_replication_lag
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_backup_report
    
    log "Backup process completed successfully"
}

# Restore function
restore_backup() {
    local backup_file="$1"
    local target_db="${2:-}"
    
    if [[ -z "$backup_file" ]]; then
        error "Backup file not specified"
        exit 1
    fi
    
    if [[ ! -f "$backup_file" ]]; then
        error "Backup file not found: $backup_file"
        exit 1
    fi
    
    log "Starting database restore from: $backup_file"
    
    load_env
    
    # Verify backup first
    if ! verify_backup "$backup_file"; then
        error "Backup verification failed"
        exit 1
    fi
    
    # Determine target database
    DB_URL=$(echo "$DATABASE_URL" | sed 's/postgresql+asyncpg:/postgresql:/')
    
    if [[ -n "$target_db" ]]; then
        DB_URL=$(echo "$DB_URL" | sed "s|/[^/]*$|/$target_db|")
        log "Restoring to database: $target_db"
    else
        log "Restoring to main database"
        echo "WARNING: This will overwrite the current database!"
        read -p "Are you sure? (yes/no): " -r
        if [[ $REPLY != "yes" ]]; then
            log "Restore cancelled by user"
            exit 0
        fi
    fi
    
    # Perform restore
    log "Starting restore process"
    
    if zcat "$backup_file" | psql "$DB_URL" 2>&1 | tee -a "${LOG_DIR}/restore_$(date +%Y%m%d).log"; then
        log "Database restore completed successfully"
    else
        error "Database restore failed"
        exit 1
    fi
}

# Command line interface
case "${1:-}" in
    "backup")
        run_backup "${2:-daily}"
        ;;
    "restore")
        restore_backup "$2" "$3"
        ;;
    "test-restore")
        test_restore "$2"
        ;;
    "report")
        load_env
        generate_backup_report
        ;;
    "cleanup")
        init_directories
        cleanup_old_backups
        ;;
    "check-replication")
        load_env
        check_replication_lag
        ;;
    *)
        echo "LIFO Database Backup and Recovery System"
        echo
        echo "Usage: $0 <command> [options]"
        echo
        echo "Commands:"
        echo "  backup [daily|weekly|monthly]  - Create database backup"
        echo "  restore <file> [target_db]     - Restore from backup"
        echo "  test-restore <file>            - Test backup restoration"
        echo "  report                         - Generate backup report"
        echo "  cleanup                        - Clean old backups"
        echo "  check-replication              - Check replication status"
        echo
        echo "Examples:"
        echo "  $0 backup daily"
        echo "  $0 backup weekly"
        echo "  $0 restore /path/to/backup.sql.gz"
        echo "  $0 test-restore /path/to/backup.sql.gz"
        echo
        exit 1
        ;;
esac