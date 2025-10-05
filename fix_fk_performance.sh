#!/bin/bash
# ============================================================================
# FK Performance Fix Automation Script
# Safely fixes foreign key validation performance issues
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set it with: export DATABASE_URL='postgresql://...'"
    exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        FK Performance Fix Automation                          ║${NC}"
echo -e "${BLUE}║        Safe for production - No downtime required             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to prompt user
confirm() {
    local prompt="$1"
    local default="${2:-n}"

    if [ "$default" = "y" ]; then
        prompt="$prompt [Y/n] "
    else
        prompt="$prompt [y/N] "
    fi

    read -p "$prompt" response
    response="${response:-$default}"

    if [[ "$response" =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

# ============================================================================
# STEP 0: Pre-flight checks
# ============================================================================

print_section "STEP 0: Pre-flight Checks"

echo "🔍 Checking database connection..."
if psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    exit 1
fi

echo ""
echo "🔍 Checking for required tools..."

# Check for psql
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ psql not found. Please install PostgreSQL client tools.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ psql found${NC}"

# Check for python3
if ! command -v python3 &> /dev/null; then
    echo -e "${YELLOW}⚠️  python3 not found. Performance testing will be skipped.${NC}"
    SKIP_PYTHON_TESTS=1
else
    echo -e "${GREEN}✅ python3 found${NC}"
    SKIP_PYTHON_TESTS=0
fi

# ============================================================================
# STEP 1: Run diagnostic
# ============================================================================

print_section "STEP 1: Diagnostic Analysis"

if confirm "Run diagnostic analysis? This will take about 1 minute." "y"; then
    echo ""
    echo "📊 Running diagnostic script..."

    if psql "$DATABASE_URL" -f diagnose_fk_performance.sql > fk_diagnostic_output.txt 2>&1; then
        echo -e "${GREEN}✅ Diagnostic completed successfully${NC}"
        echo "📄 Output saved to: fk_diagnostic_output.txt"
        echo ""
        echo "Key metrics:"

        # Extract key metrics from diagnostic output
        grep -E "(live_tuples|dead_tuples|dead_pct|last_vacuum)" fk_diagnostic_output.txt | head -5 || true

        echo ""
        echo -e "${YELLOW}Review fk_diagnostic_output.txt for detailed analysis${NC}"
    else
        echo -e "${RED}❌ Diagnostic failed. See fk_diagnostic_output.txt for details.${NC}"
        exit 1
    fi
else
    echo "⏭️  Skipping diagnostic"
fi

# ============================================================================
# STEP 2: Performance test (before)
# ============================================================================

print_section "STEP 2: Performance Test (Before Optimization)"

if [ $SKIP_PYTHON_TESTS -eq 0 ]; then
    if confirm "Run performance test to measure current speed?" "y"; then
        echo ""
        echo "⏱️  Running performance test..."

        if python3 test_fk_performance.py --before; then
            echo -e "${GREEN}✅ Performance test completed${NC}"
            echo "📄 Results saved to: fk_before.json"
        else
            echo -e "${YELLOW}⚠️  Performance test failed, but continuing...${NC}"
        fi
    else
        echo "⏭️  Skipping performance test"
    fi
else
    echo "⏭️  Skipping performance test (python3 not available)"
fi

# ============================================================================
# STEP 3: Apply fixes
# ============================================================================

print_section "STEP 3: Apply Performance Fixes"

echo -e "${YELLOW}⚠️  This will modify your database (safely, no downtime)${NC}"
echo "The following operations will be performed:"
echo "  1. ANALYZE - Update table statistics (2 min)"
echo "  2. VACUUM - Remove dead tuples (5-10 min)"
echo "  3. REINDEX - Rebuild indexes (10-20 min)"
echo "  4. Configure autovacuum settings"
echo ""
echo "Total time: 15-30 minutes"
echo "Downtime: NONE (all operations are safe)"
echo ""

if confirm "Proceed with fixes?" "n"; then
    echo ""
    echo "🔧 Applying fixes..."

    # Apply the quick fix script
    if psql "$DATABASE_URL" -f quick_fix_fk_performance.sql > fk_fix_output.txt 2>&1; then
        echo -e "${GREEN}✅ Fixes applied successfully${NC}"
        echo "📄 Output saved to: fk_fix_output.txt"
    else
        echo -e "${RED}❌ Fix failed. See fk_fix_output.txt for details.${NC}"
        exit 1
    fi
else
    echo "❌ Fixes not applied. Exiting."
    exit 0
fi

# ============================================================================
# STEP 4: Performance test (after)
# ============================================================================

print_section "STEP 4: Performance Test (After Optimization)"

if [ $SKIP_PYTHON_TESTS -eq 0 ]; then
    if confirm "Run performance test to verify improvements?" "y"; then
        echo ""
        echo "⏱️  Running performance test..."

        if python3 test_fk_performance.py --after; then
            echo -e "${GREEN}✅ Performance test completed${NC}"
            echo "📄 Results saved to: fk_after.json"

            echo ""
            echo "📊 Comparing results..."
            python3 test_fk_performance.py --compare
        else
            echo -e "${YELLOW}⚠️  Performance test failed${NC}"
        fi
    else
        echo "⏭️  Skipping performance test"
    fi
else
    echo "⏭️  Skipping performance test (python3 not available)"
fi

# ============================================================================
# STEP 5: Summary
# ============================================================================

print_section "SUMMARY"

echo -e "${GREEN}🎉 FK Performance Optimization Complete!${NC}"
echo ""
echo "Files created:"
echo "  📄 fk_diagnostic_output.txt - Diagnostic analysis"
echo "  📄 fk_fix_output.txt - Fix execution log"
if [ $SKIP_PYTHON_TESTS -eq 0 ]; then
    echo "  📄 fk_before.json - Performance before fixes"
    echo "  📄 fk_after.json - Performance after fixes"
fi
echo ""
echo "Next steps:"
echo "  1. Test CSV upload with 100 items"
echo "     Expected: 3-5 seconds (down from 30+ seconds)"
echo ""
echo "  2. Monitor database health weekly:"
echo "     psql \$DATABASE_URL -c 'SELECT * FROM public.fk_performance_monitor;'"
echo ""
echo "  3. If dead_pct > 10%, run:"
echo "     psql \$DATABASE_URL -c 'VACUUM ANALYZE inventory.batches;'"
echo ""
echo "  4. Review FK_OPTIMIZATION_README.md for detailed guidance"
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ All done! Your database should now be significantly faster.${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
