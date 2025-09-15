#!/bin/bash
# Digital Ocean App Platform Deployment Script for LIFO AI FastAPI Backend

set -e

echo "🚀 LIFO AI FastAPI Deployment Script"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo -e "${RED}❌ doctl CLI is not installed${NC}"
    echo "Install it from: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    echo "Mac: brew install doctl"
    echo "Ubuntu: snap install doctl"
    exit 1
fi

echo -e "${GREEN}✅ doctl CLI found${NC}"

# Check if authenticated
if ! doctl auth list | grep -q "default"; then
    echo -e "${YELLOW}⚠️  Not authenticated with Digital Ocean${NC}"
    echo "Please run: doctl auth init"
    exit 1
fi

echo -e "${GREEN}✅ Digital Ocean authentication verified${NC}"

# Function to create new app
create_app() {
    echo -e "${BLUE}📦 Creating new app...${NC}"
    APP_ID=$(doctl apps create --spec .do/app.yaml --format ID --no-header)
    echo -e "${GREEN}✅ App created with ID: $APP_ID${NC}"
    echo -e "${YELLOW}📝 Save this App ID: $APP_ID${NC}"
    echo "$APP_ID" > .do/app_id.txt
    echo -e "${BLUE}🌐 Your app will be available at: https://lifo-ai-api-$APP_ID.ondigitalocean.app${NC}"
}

# Function to update existing app
update_app() {
    if [ -f ".do/app_id.txt" ]; then
        APP_ID=$(cat .do/app_id.txt)
        echo -e "${BLUE}🔄 Updating existing app: $APP_ID${NC}"
        doctl apps update $APP_ID --spec .do/app.yaml
        echo -e "${GREEN}✅ App updated successfully${NC}"
    else
        echo -e "${RED}❌ No app_id.txt found. Creating new app...${NC}"
        create_app
    fi
}

# Function to show app status
show_status() {
    if [ -f ".do/app_id.txt" ]; then
        APP_ID=$(cat .do/app_id.txt)
        echo -e "${BLUE}📊 App Status:${NC}"
        doctl apps get $APP_ID
        echo -e "${BLUE}📋 Recent deployments:${NC}"
        doctl apps list-deployments $APP_ID
    else
        echo -e "${YELLOW}⚠️  No deployed app found${NC}"
    fi
}

# Function to show logs
show_logs() {
    if [ -f ".do/app_id.txt" ]; then
        APP_ID=$(cat .do/app_id.txt)
        echo -e "${BLUE}📋 Showing logs for app: $APP_ID${NC}"
        doctl apps logs $APP_ID --follow
    else
        echo -e "${RED}❌ No app_id.txt found${NC}"
    fi
}

# Function to check prerequisites  
check_prereqs() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check required files
    local required_files=("lifo_api/requirements.txt" "lifo_api/Procfile" ".do/app.yaml")
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
    
    echo -e "${GREEN}✅ All prerequisites met${NC}"
}

# Main menu
case "$1" in
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
        echo -e "${GREEN}✅ Ready for deployment${NC}"
        ;;
    *)
        echo "Usage: $0 {create|update|status|logs|check}"
        echo ""
        echo "Commands:"
        echo "  create  - Create a new app on Digital Ocean"
        echo "  update  - Update existing app with current configuration"
        echo "  status  - Show current app status and deployments"
        echo "  logs    - Follow app logs in real-time"
        echo "  check   - Check if all prerequisites are met"
        echo ""
        echo "Examples:"
        echo "  $0 check   # Check if ready for deployment"
        echo "  $0 create  # Deploy new app"
        echo "  $0 update  # Update existing app"
        echo "  $0 status  # Check deployment status"
        echo "  $0 logs    # View live logs"
        echo ""
        echo -e "${YELLOW}💡 Tip: Run '$0 check' first to verify prerequisites${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Deployment script completed!${NC}"
echo -e "${BLUE}📚 Next steps:${NC}"
echo "1. Set environment variables in DO App Platform console"
echo "2. Update frontend to use production API URL"
echo "3. Test your deployed API at /docs endpoint"
echo "4. Monitor performance and scale as needed"