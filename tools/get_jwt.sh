#!/bin/bash
# Quick JWT Token Extraction Script for LIFO AI
# A simple wrapper around the Python JWT extractor for lazy developers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Python extractor path
EXTRACTOR="$SCRIPT_DIR/jwt_extractor.py"

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to show help
show_help() {
    cat << EOF
🚀 LIFO AI Quick JWT Token Extractor

Usage: $0 [options]

Options:
    -h, --help          Show this help
    -i, --interactive   Interactive login mode
    -r, --refresh       Force refresh token (skip cache)
    -v, --validate      Validate a token (provide token as next arg)
    -l, --list          List available token sources
    -q, --quiet         Quiet mode (token only)
    -e, --env           Output as environment variables
    -j, --json          Output as JSON
    -t, --test          Test the extracted token with API
    --install-deps      Install required Python dependencies

Examples:
    $0                  # Auto-extract token
    $0 -i               # Interactive login
    $0 -r               # Force refresh
    $0 -q               # Just the token, nothing else
    $0 -e               # Export as env vars
    
    # Use with curl
    curl -H "Authorization: Bearer \$($0 -q)" http://localhost:8000/api/v1/health

    # Save token to variable
    TOKEN=\$($0 -q)

    # Use in another script
    source <($0 -e)

EOF
}

# Function to check dependencies
check_dependencies() {
    if ! command -v python3 &> /dev/null; then
        print_color $RED "❌ Python 3 is required but not found"
        exit 1
    fi
    
    # Check if extractor exists
    if [[ ! -f "$EXTRACTOR" ]]; then
        print_color $RED "❌ JWT extractor not found at $EXTRACTOR"
        exit 1
    fi
}

# Function to install dependencies
install_dependencies() {
    print_color $BLUE "📦 Installing Python dependencies..."
    
    # Try pip install
    if command -v pip3 &> /dev/null; then
        pip3 install httpx pyjwt rich
    elif command -v pip &> /dev/null; then
        pip install httpx pyjwt rich
    else
        print_color $RED "❌ pip not found. Please install pip first."
        exit 1
    fi
    
    print_color $GREEN "✅ Dependencies installed successfully"
}

# Function to test token with API
test_token() {
    local token=$1
    
    if [[ -z "$token" ]]; then
        print_color $RED "❌ No token provided for testing"
        return 1
    fi
    
    print_color $BLUE "🧪 Testing token with API..."
    
    # Get API URL from environment
    API_URL="${NEXT_PUBLIC_FASTAPI_URL:-http://localhost:8000}"
    
    # Test health endpoint
    if response=$(curl -s -H "Authorization: Bearer $token" "$API_URL/health" 2>/dev/null); then
        print_color $GREEN "✅ Token works! API responded successfully"
        if [[ -n "$response" ]]; then
            print_color $BLUE "📋 Response: $response"
        fi
    else
        print_color $YELLOW "⚠️ API test failed - but token might still be valid"
        print_color $BLUE "💡 API might not be running at $API_URL"
    fi
}

# Function to save token for easy access
save_token() {
    local token=$1
    local token_file="$HOME/.lifo_current_token"
    
    echo "$token" > "$token_file"
    chmod 600 "$token_file" 2>/dev/null || true
    
    print_color $GREEN "💾 Token saved to $token_file"
    print_color $BLUE "💡 Use: export JWT_TOKEN=\$(cat $token_file)"
}

# Main function
main() {
    local mode="auto"
    local quiet=false
    local output_format="token"
    local validate_token=""
    local test_extracted=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -i|--interactive)
                mode="interactive"
                shift
                ;;
            -r|--refresh)
                mode="refresh"
                shift
                ;;
            -l|--list)
                mode="list"
                shift
                ;;
            -v|--validate)
                mode="validate"
                validate_token="$2"
                shift 2
                ;;
            -q|--quiet)
                quiet=true
                shift
                ;;
            -e|--env)
                output_format="env"
                shift
                ;;
            -j|--json)
                output_format="json"
                shift
                ;;
            -t|--test)
                test_extracted=true
                shift
                ;;
            --install-deps)
                install_dependencies
                exit 0
                ;;
            *)
                print_color $RED "❌ Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Check dependencies
    check_dependencies
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Build Python command
    local python_cmd="python3 $EXTRACTOR"
    
    if [[ $quiet == true ]]; then
        python_cmd="$python_cmd --quiet"
    fi
    
    python_cmd="$python_cmd --output $output_format"
    
    case $mode in
        auto)
            # Standard extraction
            ;;
        interactive)
            python_cmd="$python_cmd --interactive"
            ;;
        refresh)
            python_cmd="$python_cmd --refresh"
            ;;
        list)
            python_cmd="$python_cmd --list-sources"
            ;;
        validate)
            if [[ -z "$validate_token" ]]; then
                print_color $RED "❌ Token required for validation"
                exit 1
            fi
            python_cmd="$python_cmd --validate '$validate_token'"
            ;;
    esac
    
    # Execute the extraction
    if [[ $mode == "validate" || $mode == "list" ]]; then
        # These modes don't return tokens
        eval $python_cmd
    else
        # These modes return tokens
        local token
        if token=$(eval $python_cmd 2>/dev/null); then
            if [[ $quiet == true ]]; then
                echo "$token"
            else
                case $output_format in
                    token)
                        echo "$token"
                        ;;
                    env)
                        echo "export JWT_TOKEN=\"$token\""
                        echo "export BEARER_TOKEN=\"Bearer $token\""
                        ;;
                    json)
                        echo "$token"
                        ;;
                esac
                
                # Save token for future use
                if [[ $output_format == "token" ]]; then
                    save_token "$token"
                fi
            fi
            
            # Test token if requested
            if [[ $test_extracted == true && $output_format == "token" ]]; then
                test_token "$token"
            fi
            
        else
            if [[ $quiet != true ]]; then
                print_color $RED "❌ Failed to extract token"
                print_color $BLUE "💡 Try: $0 --interactive"
            fi
            exit 1
        fi
    fi
}

# Handle Ctrl+C gracefully
trap 'print_color $YELLOW "\n🛑 Operation cancelled"; exit 1' INT

# Run main function
main "$@"