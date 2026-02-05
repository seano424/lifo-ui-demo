# 🔍 Managing Existing DigitalOcean Deployment
## Finding Your Current App ID and Setting Up Staging

Since you already have a production deployment running from the main branch, here's how to identify it and properly set up your staging environment.

## 📋 **Step 1: Install and Setup DigitalOcean CLI**

### Install doctl (if not already installed)
```bash
# macOS
brew install doctl

# Ubuntu/Debian
sudo apt update
sudo apt install doctl

# Or using snap
sudo snap install doctl

# Windows (via PowerShell)
# Download from: https://github.com/digitalocean/doctl/releases
```

### Authenticate with DigitalOcean
```bash
# Initialize authentication
doctl auth init

# You'll be prompted to enter your API token
# Get your API token from: https://cloud.digitalocean.com/account/api/tokens
```

## 🔍 **Step 2: Find Your Existing Production App**

### List All Your Apps
```bash
# List all apps in your DigitalOcean account
doctl apps list

# Example output:
# ID                                   Name          Status    Created At
# 12345678-1234-5678-9abc-123456789abc lifo-ai-api   RUNNING   2024-01-15T10:30:00Z
```

### Get Detailed App Information
```bash
# Replace <APP_ID> with the ID from the list above
doctl apps get <APP_ID>

# This will show you:
# - App name
# - Current URL (https://lifo-ai-api-<ID>.ondigitalocean.app)
# - GitHub repository connection
# - Branch being deployed
# - Environment variables
```

### Alternative: Find via DigitalOcean Console
1. Go to [DigitalOcean Apps Console](https://cloud.digitalocean.com/apps)
2. Look for your existing LIFO app
3. Click on it to see details
4. The URL will be displayed as: `https://lifo-ai-api-<ID>.ondigitalocean.app`
5. Copy the `<ID>` part (the random string after "lifo-ai-api-")

## 📝 **Step 3: Document Your Production App**

Once you find your app, save the information:

```bash
# Create production app ID file
cd /home/slim/lifo-app
echo "YOUR_PRODUCTION_APP_ID" > .do/production_app_id.txt

# Example:
# echo "12345678-1234-5678-9abc-123456789abc" > .do/production_app_id.txt
```

### Your Production URLs
After finding your app ID, your production URLs are:
```
API Base URL: https://lifo-ai-api-<YOUR_ID>.ondigitalocean.app
Health Check: https://lifo-ai-api-<YOUR_ID>.ondigitalocean.app/api/v1/health
API Docs: https://lifo-ai-api-<YOUR_ID>.ondigitalocean.app/docs
```

## 🚀 **Step 4: Set Up Staging Environment**

### Check Prerequisites
```bash
cd /home/slim/lifo-app
.do/deploy-multi.sh --env staging check
```

### Deploy Staging for Testing
```bash
# Deploy new staging environment
.do/deploy-multi.sh --env staging create

# This will:
# 1. Create a NEW app for staging
# 2. Deploy from your 'staging' branch
# 3. Give you a NEW staging URL: https://lifo-ai-api-staging-<STAGING_ID>.ondigitalocean.app
# 4. Save the staging app ID in .do/staging_app_id.txt
```

## 🔧 **Step 5: Configure Environment Variables**

### For Your EXISTING Production App
If your production app needs environment variable updates:

```bash
# Update production app with new configuration
doctl apps update <PRODUCTION_APP_ID> --spec .do/app.yaml

# OR manually in DigitalOcean console:
# 1. Go to https://cloud.digitalocean.com/apps
# 2. Select your production app
# 3. Go to Settings → Environment Variables
# 4. Add/update required variables
```

### For Your NEW Staging App
After staging deployment:

```bash
# Get your staging app ID
STAGING_APP_ID=$(cat .do/staging_app_id.txt)

# View current staging app
doctl apps get $STAGING_APP_ID

# Configure via DigitalOcean console:
# 1. Go to https://cloud.digitalocean.com/apps  
# 2. Select your staging app (lifo-ai-api-staging)
# 3. Go to Settings → Environment Variables
# 4. Add staging environment variables
```

### Required Environment Variables for Staging
```bash
# Database Configuration
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-eu-west-3.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://jrgmetdsohowtxickqij.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Security (use different key for staging)
SECRET_KEY=staging-different-secret-key-here

# Environment Settings
ENVIRONMENT=staging
DEBUG=true
LOG_LEVEL=DEBUG

# Performance Settings
WORKERS=1
MAX_WORKERS=2
```

## 📊 **Step 6: Verify Both Environments**

### Check Production Status
```bash
# Check your existing production deployment
PROD_APP_ID=$(cat .do/production_app_id.txt)
doctl apps get $PROD_APP_ID

# Test production health
curl https://lifo-ai-api-<PROD_ID>.ondigitalocean.app/api/v1/health
```

### Check Staging Status
```bash
# Check new staging deployment
STAGING_APP_ID=$(cat .do/staging_app_id.txt)
doctl apps get $STAGING_APP_ID

# Test staging health
curl https://lifo-ai-api-staging-<STAGING_ID>.ondigitalocean.app/api/v1/health
```

## 🎯 **Step 7: Test Your Performance Optimizations**

### Update Your Frontend Configuration
If you have a frontend connecting to the API, update it to use staging for testing:

```typescript
// In your frontend config
const API_CONFIG = {
  development: 'http://localhost:8000',
  staging: 'https://lifo-ai-api-staging-<STAGING_ID>.ondigitalocean.app',
  production: 'https://lifo-ai-api-<PROD_ID>.ondigitalocean.app'
}
```

### Test CSV Performance in Staging
1. Use staging URL for your CSV upload tests
2. Verify you get ~10.24 seconds for 500 items (vs original 16.1 seconds)
3. Check for no pgbouncer prepared statement errors
4. Validate all batch creation functionality

## 🔄 **Step 8: Management Commands**

### Common Operations
```bash
# View both environments
.do/deploy-multi.sh --env production status
.do/deploy-multi.sh --env staging status

# Update deployments
.do/deploy-multi.sh --env staging update
.do/deploy-multi.sh --env production update

# View logs
.do/deploy-multi.sh --env staging logs
.do/deploy-multi.sh --env production logs

# Compare environments
.do/deploy-multi.sh compare
```

## 📁 **Final File Structure**

After setup, you should have:
```
/home/slim/lifo-app/
├── .do/
│   ├── production_app_id.txt     # Your existing production app ID
│   ├── staging_app_id.txt        # New staging app ID (after deployment)
│   ├── app.yaml                  # Production config (your existing deployment)
│   ├── staging.yaml              # Staging config
│   ├── production.yaml           # Alternative production config
│   └── deploy-multi.sh           # Management script
```

## ⚠️ **Important Notes**

1. **Don't Delete Production**: Your existing production app will continue running normally
2. **Separate Apps**: Staging creates a completely new app - no interference with production
3. **Branch Strategy**: Production stays on `main`, staging uses `staging` branch
4. **Costs**: Staging adds ~$5/month for testing environment
5. **Environment Variables**: Set different values for staging (especially SECRET_KEY)

## 🎉 **Quick Start Summary**

```bash
# 1. Find your existing app
doctl apps list

# 2. Save production app ID
echo "YOUR_PROD_APP_ID" > .do/production_app_id.txt

# 3. Deploy staging
.do/deploy-multi.sh --env staging create

# 4. Configure staging environment variables in DO console

# 5. Test your performance improvements in staging!
```

This setup gives you complete separation between your existing production deployment and new staging environment for testing your performance optimizations!