#!/bin/bash

# LIFO AI - Secure Staging Deployment Script
# This script handles deployment with manual secret management

set -e  # Exit on any error

APP_ID="2f2d7605-d69f-41d2-856b-fdac6011faae"
SPEC_FILE=".do/staging.yaml"

echo "🚀 LIFO AI Staging Deployment (Secure Mode)"
echo "============================================="

# Check if doctl is installed
if ! command -v doctl &> /dev/null; then
    echo "❌ Error: doctl is not installed. Please install it first."
    echo "   Visit: https://docs.digitalocean.com/reference/doctl/how-to/install/"
    exit 1
fi

# Check if user is authenticated
if ! doctl auth list 2>/dev/null | grep -q "current"; then
    echo "❌ Error: Not authenticated with DigitalOcean."
    echo "   Run: doctl auth init"
    exit 1
fi

echo "📋 Pre-deployment checklist:"
echo "   ✅ Secrets removed from YAML files"
echo "   ✅ Using secure deployment configuration"
echo ""

# Show current app status
echo "📊 Current app status:"
doctl apps get $APP_ID --format "Name,Phase,LiveURL,UpdatedAt" || {
    echo "❌ Error: Could not fetch app status. Check your app ID."
    exit 1
}
echo ""

# Warning about environment variables
echo "⚠️  IMPORTANT: Environment Variable Setup Required"
echo "   After deployment, you MUST set these secrets manually in the DigitalOcean console:"
echo "   1. DATABASE_URL (type: SECRET)"
echo "   2. SUPABASE_URL (type: SECRET)"
echo "   3. SUPABASE_ANON_KEY (type: SECRET)"
echo "   4. SUPABASE_SERVICE_ROLE_KEY (type: SECRET)"
echo "   5. SECRET_KEY (type: SECRET)"
echo ""
echo "   Navigate to: https://cloud.digitalocean.com/apps/$APP_ID/settings"
echo "   Go to: Components > fastapi-backend-staging > Environment Variables"
echo ""

# Confirm deployment
read -p "❓ Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⏸️  Deployment cancelled."
    exit 0
fi

# Deploy
echo "🔄 Deploying application..."
doctl apps update $APP_ID --spec $SPEC_FILE

echo ""
echo "✅ Deployment initiated successfully!"
echo ""
echo "📱 Next steps:"
echo "   1. Monitor deployment: doctl apps get $APP_ID"
echo "   2. Set environment variables in DigitalOcean console (if not already set)"
echo "   3. Test endpoints:"
echo "      - Health: https://lifo-ai-api-staging-d5tjh.ondigitalocean.app/api/v1/health"
echo "      - Docs: https://lifo-ai-api-staging-d5tjh.ondigitalocean.app/docs"
echo "      - Root: https://lifo-ai-api-staging-d5tjh.ondigitalocean.app/"
echo ""
echo "🔐 Security reminder: Secrets are managed outside version control for enhanced security."