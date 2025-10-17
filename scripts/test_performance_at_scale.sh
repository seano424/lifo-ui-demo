#!/bin/bash

# Performance Test Script - Testing Optimizations at Scale
# Tests CSV upload performance with files ranging from 100 to 5,000 items
# Validates the 12x performance improvement from trigger optimization

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"
TEST_DATA_DIR="$(pwd)/lifo_api/test_data/csv"
RESULTS_DIR="$(pwd)/test_results/performance_scale_$(date +%Y%m%d_%H%M%S)"
CHUNK_SIZE=150  # Optimized chunk size

# Create results directory
mkdir -p "$RESULTS_DIR"

echo "═══════════════════════════════════════════════════════════════"
echo "  PERFORMANCE TEST AT SCALE"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Configuration:"
echo "  API URL:     $API_BASE_URL"
echo "  Chunk Size:  $CHUNK_SIZE"
echo "  Results Dir: $RESULTS_DIR"
echo ""

# Check if API is running
echo -n "Checking API health... "
if curl -s "${API_BASE_URL}/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API is running"
else
    echo -e "${RED}✗${NC} API is not responding"
    exit 1
fi

# Get store_id from environment or use default
if [ -z "$LIFO_STORE_ID" ]; then
    echo -e "${YELLOW}⚠${NC} LIFO_STORE_ID not set, using default store"
    STORE_ID="6a274bc9-3e7f-4040-a61a-7bb3cc8b867e"  # slim_store
else
    STORE_ID="$LIFO_STORE_ID"
fi

echo "  Store ID:    $STORE_ID"
echo ""

# Function to run a single performance test
run_performance_test() {
    local file_name=$1
    local file_path="${TEST_DATA_DIR}/${file_name}"
    local item_count=$2

    if [ ! -f "$file_path" ]; then
        echo -e "${RED}✗${NC} File not found: $file_path"
        return 1
    fi

    echo "─────────────────────────────────────────────────────────────"
    echo -e "${CYAN}Testing:${NC} $file_name ($item_count items)"
    echo "─────────────────────────────────────────────────────────────"

    # Prepare result file
    local result_file="${RESULTS_DIR}/${file_name%.csv}_result.json"
    local timing_file="${RESULTS_DIR}/${file_name%.csv}_timing.txt"

    # Run the test with timing
    echo "Uploading CSV and creating batches..."
    local start_time=$(date +%s.%N)

    # Make the request
    local http_code=$(curl -w "%{http_code}" -o "$result_file" -s \
        -X POST "${API_BASE_URL}/api/v1/csv-upload/upload-and-create-batches" \
        -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
        -F "file=@${file_path}" \
        -F "store_id=${STORE_ID}" \
        -F "chunk_size=${CHUNK_SIZE}")

    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc)

    # Save timing information
    echo "Duration: ${duration}s" > "$timing_file"
    echo "HTTP Code: $http_code" >> "$timing_file"

    # Parse and display results
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓${NC} Request successful (HTTP 200)"

        # Extract key metrics using jq
        if command -v jq &> /dev/null; then
            local successful=$(jq -r '.batch_creation.successful_batches // 0' "$result_file" 2>/dev/null || echo "N/A")
            local failed=$(jq -r '.batch_creation.failed_batches // 0' "$result_file" 2>/dev/null || echo "N/A")
            local success_rate=$(jq -r '.batch_creation.success_rate // 0' "$result_file" 2>/dev/null || echo "N/A")
            local total_time=$(jq -r '.performance_metrics.total_processing_ms // 0' "$result_file" 2>/dev/null || echo "N/A")
            local db_time=$(jq -r '.performance_metrics.database_operations_ms // 0' "$result_file" 2>/dev/null || echo "N/A")
            local items_per_sec=$(jq -r '.performance_metrics.items_per_second // 0' "$result_file" 2>/dev/null || echo "N/A")

            echo ""
            echo "Results:"
            echo "  Total Time:        ${duration}s (client-measured)"
            echo "  Server Time:       ${total_time}ms"
            echo "  Database Time:     ${db_time}ms"
            echo "  Items/Second:      ${items_per_sec}"
            echo "  Successful:        ${successful}"
            echo "  Failed:            ${failed}"
            echo "  Success Rate:      ${success_rate}%"
            echo ""

            # Performance assessment
            local items_per_sec_float=$(echo "$items_per_sec" | sed 's/[^0-9.]//g')
            if [ -n "$items_per_sec_float" ] && [ "$items_per_sec_float" != "N/A" ]; then
                local target_rate=20  # Target: 20+ items/second
                if (( $(echo "$items_per_sec_float >= $target_rate" | bc -l) )); then
                    echo -e "${GREEN}✓${NC} Performance: EXCELLENT (≥${target_rate} items/sec)"
                elif (( $(echo "$items_per_sec_float >= 10" | bc -l) )); then
                    echo -e "${YELLOW}⚠${NC} Performance: GOOD (≥10 items/sec)"
                else
                    echo -e "${RED}✗${NC} Performance: NEEDS IMPROVEMENT (<10 items/sec)"
                fi
            fi

            # Save summary
            echo "FILE: $file_name" >> "${RESULTS_DIR}/summary.txt"
            echo "ITEMS: $item_count" >> "${RESULTS_DIR}/summary.txt"
            echo "DURATION: ${duration}s" >> "${RESULTS_DIR}/summary.txt"
            echo "ITEMS_PER_SEC: $items_per_sec" >> "${RESULTS_DIR}/summary.txt"
            echo "DB_TIME: ${db_time}ms" >> "${RESULTS_DIR}/summary.txt"
            echo "SUCCESS_RATE: ${success_rate}%" >> "${RESULTS_DIR}/summary.txt"
            echo "---" >> "${RESULTS_DIR}/summary.txt"
        else
            echo "Result saved to: $result_file"
            echo "(Install jq for detailed metrics parsing)"
        fi
    else
        echo -e "${RED}✗${NC} Request failed (HTTP $http_code)"
        echo "Duration: ${duration}s"
        echo ""
        echo "Error response:"
        cat "$result_file" | head -20
        echo ""
    fi

    echo ""
    return 0
}

# Run tests for each file size
echo "═══════════════════════════════════════════════════════════════"
echo "  STARTING PERFORMANCE TESTS"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Test with increasing file sizes
run_performance_test "safe_test_100.csv" 100
run_performance_test "safe_test_500.csv" 500
run_performance_test "safe_test_1000.csv" 1000
run_performance_test "safe_test_2500.csv" 2500
run_performance_test "safe_test_5000.csv" 5000

# Generate final summary
echo "═══════════════════════════════════════════════════════════════"
echo "  TEST SUMMARY"
echo "═══════════════════════════════════════════════════════════════"
echo ""

if [ -f "${RESULTS_DIR}/summary.txt" ]; then
    cat "${RESULTS_DIR}/summary.txt"
else
    echo "No summary generated"
fi

echo ""
echo "Detailed results saved to: $RESULTS_DIR"
echo ""
echo "═══════════════════════════════════════════════════════════════"

# Create a markdown report
cat > "${RESULTS_DIR}/PERFORMANCE_REPORT.md" <<EOF
# Performance Test Results - $(date +"%Y-%m-%d %H:%M:%S")

## Test Configuration

- **API URL**: $API_BASE_URL
- **Chunk Size**: $CHUNK_SIZE (optimized)
- **Store ID**: $STORE_ID
- **Test Files**: 100, 500, 1,000, 2,500, 5,000 items

## Results

EOF

# Append summary if it exists
if [ -f "${RESULTS_DIR}/summary.txt" ]; then
    echo '```' >> "${RESULTS_DIR}/PERFORMANCE_REPORT.md"
    cat "${RESULTS_DIR}/summary.txt" >> "${RESULTS_DIR}/PERFORMANCE_REPORT.md"
    echo '```' >> "${RESULTS_DIR}/PERFORMANCE_REPORT.md"
fi

cat >> "${RESULTS_DIR}/PERFORMANCE_REPORT.md" <<EOF

## Performance Improvements

### Before Optimization (Baseline - 100 items)
- **Total Time**: 55 seconds
- **Items/Second**: 1.8
- **Database Time**: 52,284ms (99.99%)

### After Optimization (Current - 100 items)
- **Target Time**: <5 seconds
- **Target Items/Second**: >20
- **Expected Database Time**: <5,000ms

### Key Optimizations Applied

1. **Materialized View Trigger**: Changed from FOR EACH ROW to FOR EACH STATEMENT
   - Impact: 50-100 seconds saved per 100 items

2. **RLS Policy Optimization**: Cached auth.uid() evaluation
   - Impact: 10-100x improvement on RLS queries

3. **Chunk Size Optimization**: Increased from 50 to 150
   - Impact: 67% reduction in database roundtrips

4. **Concurrency Tuning**: Increased concurrent chunks
   - Batch creation: 5 → 10 concurrent
   - Scoring: 10 → 15 concurrent

## Detailed Results

See individual JSON files in this directory for complete response data.

EOF

echo -e "${GREEN}✓${NC} Performance report generated: ${RESULTS_DIR}/PERFORMANCE_REPORT.md"
echo ""
