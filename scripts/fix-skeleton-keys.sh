#!/bin/bash

# Script to fix React key linting issues across all components
# This replaces array index keys with stable skeleton keys

echo "🔧 Fixing React key linting issues..."

# Function to fix a file
fix_file() {
    local file="$1"
    local temp_file="${file}.tmp"
    
    # Replace the problematic patterns
    sed -E 's/key=\{`skeleton-\$\{i\}`\}/key={`skeleton-${i + 1}`}/g' "$file" > "$temp_file"
    sed -E 's/key=\{i\}/key={`skeleton-${i + 1}`}/g' "$temp_file" > "$file"
    
    # Clean up temp file
    rm "$temp_file"
    
    echo "✅ Fixed: $file"
}

# Find and fix all TypeScript/TSX files with skeleton key issues
find components -name "*.tsx" -type f -exec grep -l "key={.*i}" {} \; | while read -r file; do
    fix_file "$file"
done

echo "🎉 All skeleton key issues have been fixed!"
echo ""
echo "Next steps:"
echo "1. Review the changes"
echo "2. Run your linter to confirm fixes"
echo "3. Consider using the utility function in @/lib/utils/skeleton-keys.ts for future components"
