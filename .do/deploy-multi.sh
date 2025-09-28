#!/bin/bash
# Multi-Environment Deployment Script for LIFO AI FastAPI Backend
# Supports both staging and production deployments

set -e

echo "🚀 LIFO AI Multi-Environment Deployment Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT="staging"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --env|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        *)
            ACTION="$1"
            shift
            ;;
    esac
done

# Help function
show_help() {
    echo "Usage: $0 [OPTIONS] {create|update|status|logs|check|destroy}"
    echo ""
    echo "Options:"
    echo "  -e, --env ENV     Environment: staging or production (default: staging)"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Commands:"
    echo "  create            Create a new app in the specified environment"
    echo "  update            Update existing app with current configuration"
    echo "  status            Show current app status and deployments"
    echo "  logs              Follow app logs in real-time"
    echo "  check             Check if all prerequisites are met"
    echo "  destroy           Destroy the app (use with caution!)"
    echo ""
    echo "Examples:"
    echo "  $0 check                      # Check prerequisites for staging"
    echo "  $0 create                     # Deploy to staging"
    echo "  $0 --env production create    # Deploy to production"
    echo "  $0 --env staging update       # Update staging deployment"
    echo "  $0 --env production logs      # View production logs"
    echo ""
    echo "Environment URLs after deployment:"
    echo "  Staging:    https://lifo-ai-api-staging-<id>.ondigitalocean.app"
    echo "  Production: https://lifo-ai-api-<id>.ondigitalocean.app"
}

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Valid environments: staging, production"
    exit 1
fi

# Set environment-specific variables
if [[ "$ENVIRONMENT" == "staging" ]]; then
    APP_SPEC=".do/staging.yaml"
    APP_ID_FILE=".do/staging_app_id.txt"
    ENV_EXAMPLE=".env.staging.example"
    APP_NAME="lifo-ai-api-staging"
    BRANCH="staging"
    COLOR=$YELLOW
elif [[ "$ENVIRONMENT" == "production" ]]; then
    APP_SPEC=".do/app.yaml"
    APP_ID_FILE=".do/production_app_id.txt"
    ENV_EXAMPLE=".env.production.example"
    APP_NAME="lifo-ai-api"
    BRANCH="main"
    COLOR=$GREEN
fi

echo -e "${COLOR}🎯 Target Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}📝 App Spec: $APP_SPEC${NC}"
echo -e "${BLUE}🌿 Branch: $BRANCH${NC}"

# Check if doctl is installed
check_doctl() {
    if ! command -v doctl &> /dev/null; then
        echo -e "${RED}❌ doctl CLI is not installed${NC}"
        echo "Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
        echo "Mac: brew install doctl"
        echo "Ubuntu: snap install doctl"
        exit 1
    fi
    echo -e "${GREEN}✅ doctl CLI found${NC}"
}

# Check if authenticated
check_auth() {
    if ! doctl auth list | grep -q "default"; then
        echo -e "${YELLOW}⚠️  Not authenticated with Digital Ocean${NC}"
        echo "Please run: doctl auth init"
        exit 1
    fi
    echo -e "${GREEN}✅ Digital Ocean authentication verified${NC}"
}

# Check prerequisites
check_prereqs() {
    echo -e "${BLUE}🔍 Checking prerequisites for $ENVIRONMENT...${NC}"
    
    check_doctl
    check_auth
    
    # Check required files
    local required_files=("lifo_api/requirements.txt" "lifo_api/Procfile" "$APP_SPEC")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            echo -e "${RED}❌ Missing required file: $file${NC}"
            exit 1
        fi
    done
    
    # Check if gunicorn is in requirements
    if ! grep -q "gunicorn" lifo_api/requirements.txt; then
        echo -e "${YELLOW}⚠️  gunicorn not found in requirements.txt${NC}"
        echo "Adding gunicorn to requirements.txt..."
        echo "gunicorn>=21.2.0" >> lifo_api/requirements.txt
    fi
    
    # Check environment example file
    if [ ! -f "$ENV_EXAMPLE" ]; then
        echo -e "${YELLOW}⚠️  Environment example file not found: $ENV_EXAMPLE${NC}"
    else
        echo -e "${GREEN}✅ Environment example file found: $ENV_EXAMPLE${NC}"
    fi
    
    echo -e "${GREEN}✅ All prerequisites met for $ENVIRONMENT${NC}"
}

# Create new app
create_app() {
    echo -e "${COLOR}📦 Creating new $ENVIRONMENT app...${NC}"
    
    if [ -f "$APP_ID_FILE" ]; then
        echo -e "${YELLOW}⚠️  App ID file already exists: $APP_ID_FILE${NC}"
        echo "An app for $ENVIRONMENT may already be deployed."
        read -p "Continue creating new app? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Aborted."
            exit 1
        fi
    fi
    
    APP_ID=$(doctl apps create --spec "$APP_SPEC" --format ID --no-header)
    echo -e "${GREEN}✅ $ENVIRONMENT app created with ID: $APP_ID${NC}"
    echo -e "${YELLOW}📝 Save this App ID: $APP_ID${NC}"
    echo "$APP_ID" > "$APP_ID_FILE"
    
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        echo -e "${YELLOW}🌐 Your staging app will be available at: https://lifo-ai-api-staging-$APP_ID.ondigitalocean.app${NC}"
    else
        echo -e "${GREEN}🌐 Your production app will be available at: https://lifo-ai-api-$APP_ID.ondigitalocean.app${NC}"
    fi
    
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "1. Set environment variables in Digital Ocean App Platform console"
    echo "2. Wait for deployment to complete (5-10 minutes)"
    echo "3. Test the deployment at the URL above"
    echo "4. Update your frontend to use this API URL"
}

# Update existing app
update_app() {
    if [ -f "$APP_ID_FILE" ]; then
        APP_ID=$(cat "$APP_ID_FILE")
        echo -e "${COLOR}🔄 Updating existing $ENVIRONMENT app: $APP_ID${NC}"
        doctl apps update "$APP_ID" --spec "$APP_SPEC"
        echo -e "${GREEN}✅ $ENVIRONMENT app updated successfully${NC}"
    else
        echo -e "${RED}❌ No $APP_ID_FILE found. Creating new app...${NC}"
        create_app
    fi
}

# Show app status
show_status() {
    if [ -f "$APP_ID_FILE" ]; then
        APP_ID=$(cat "$APP_ID_FILE")
        echo -e "${COLOR}📊 $ENVIRONMENT App Status:${NC}"
        doctl apps get "$APP_ID"
        echo ""
        echo -e "${BLUE}📋 Recent deployments:${NC}"
        doctl apps list-deployments "$APP_ID"
    else
        echo -e "${YELLOW}⚠️  No deployed $ENVIRONMENT app found${NC}"
    fi
}

# Show logs
show_logs() {
    if [ -f "$APP_ID_FILE" ]; then
        APP_ID=$(cat "$APP_ID_FILE")
        echo -e "${COLOR}📋 Showing logs for $ENVIRONMENT app: $APP_ID${NC}"
        doctl apps logs "$APP_ID" --follow
    else
        echo -e "${RED}❌ No $APP_ID_FILE found${NC}"
    fi
}

# Destroy app
destroy_app() {
    if [ -f "$APP_ID_FILE" ]; then
        APP_ID=$(cat "$APP_ID_FILE")
        echo -e "${RED}⚠️  WARNING: This will destroy your $ENVIRONMENT app!${NC}"
        echo "App ID: $APP_ID"
        read -p "Are you sure you want to destroy this app? (type 'destroy' to confirm): " -r
        if [[ $REPLY == "destroy" ]]; then
            doctl apps delete "$APP_ID" --force
            rm "$APP_ID_FILE"
            echo -e "${GREEN}✅ $ENVIRONMENT app destroyed${NC}"
        else
            echo "Aborted."
        fi
    else
        echo -e "${YELLOW}⚠️  No deployed $ENVIRONMENT app found${NC}"
    fi
}

# Compare environments
compare_envs() {
    echo -e "${PURPLE}📊 Environment Comparison:${NC}"
    echo ""
    echo -e "${YELLOW}STAGING:${NC}"
    echo "  • Purpose: Testing and development"
    echo "  • Branch: staging"
    echo "  • Resources: Minimal (1 worker, basic-xxs)"
    echo "  • Debug: Enabled"
    echo "  • CORS: Permissive (includes localhost)"
    echo "  • Database: Separate staging database"
    echo ""
    echo -e "${GREEN}PRODUCTION:${NC}"
    echo "  • Purpose: Live application"
    echo "  • Branch: main"
    echo "  • Resources: Optimized (2+ workers)"
    echo "  • Debug: Disabled"
    echo "  • CORS: Restricted to production domains"
    echo "  • Database: Production database"
}

# Main command handling
case "$ACTION" in
    "create")
        check_prereqs
        create_app
        ;;
    "update")
        check_prereqs
        update_app
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "check")
        check_prereqs
        echo -e "${GREEN}✅ Ready for $ENVIRONMENT deployment${NC}"
        ;;
    "destroy")
        destroy_app
        ;;
    "compare")
        compare_envs
        ;;
    *)
        show_help
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 $ENVIRONMENT deployment script completed!${NC}"

if [[ "$ACTION" == "create" || "$ACTION" == "update" ]]; then
    echo ""
    echo -e "${BLUE}🔗 Useful links after deployment:${NC}"
    if [ -f "$APP_ID_FILE" ]; then
        APP_ID=$(cat "$APP_ID_FILE")
        if [[ "$ENVIRONMENT" == "staging" ]]; then
            echo "  API Docs: https://lifo-ai-api-staging-$APP_ID.ondigitalocean.app/docs"
            echo "  Health: https://lifo-ai-api-staging-$APP_ID.ondigitalocean.app/api/v1/health"
        else
            echo "  API Docs: https://lifo-ai-api-$APP_ID.ondigitalocean.app/docs"
            echo "  Health: https://lifo-ai-api-$APP_ID.ondigitalocean.app/api/v1/health"
        fi
    fi
    echo ""
    echo -e "${YELLOW}📝 Don't forget to:${NC}"
    echo "1. Set environment variables in DO console"
    echo "2. Test API endpoints"
    echo "3. Update frontend configuration"
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        echo "4. Test performance optimizations"
        echo "5. Deploy to production when ready"
    fi
fi