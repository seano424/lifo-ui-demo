# DigitalOcean App Platform Setup Guide

## 🚀 Apps Created

### Staging App
- **Name**: `lifo-ai-api-staging`
- **ID**: `2f2d7605-d69f-41d2-856b-fdac6011faae`
- **URL**: https://lifo-ai-api-staging-d5tjh.ondigitalocean.app
- **Branch**: `staging`
- **Config**: `.do/staging.yaml`

### Production App
- **Name**: `lifo-ai-api`
- **ID**: `7ad1242b-0f17-42fe-a0d1-dc8ca88956bc`
- **URL**: Will be assigned after first deployment
- **Branch**: `main`
- **Config**: `.do/production.yaml`

## 🔑 Environment Variables Setup

### ⚠️ CRITICAL: Set These in DigitalOcean Console ONLY

**DO NOT** include these in YAML files as they will override console values:

#### Required for Both Apps:
```bash
DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=eyJ[...]
SUPABASE_SERVICE_ROLE_KEY=eyJ[...]
SUPABASE_JWT_SECRET=your-jwt-secret
SECRET_KEY=your-secret-key-for-sessions
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

#### Setting Environment Variables:
1. Go to DigitalOcean Console > Apps
2. Select your app (staging or production)
3. Go to Settings tab
4. Find "App-Level Environment Variables" section
5. Add each variable as type "SECRET"
6. Click "Save" and redeploy

## 🔧 GitHub Secrets Required

Add these to your repository secrets (Settings > Secrets and variables > Actions):

```bash
DIGITALOCEAN_ACCESS_TOKEN=dop_v1_[your-token]
DO_STAGING_APP_ID=2f2d7605-d69f-41d2-856b-fdac6011faae
DO_PRODUCTION_APP_ID=7ad1242b-0f17-42fe-a0d1-dc8ca88956bc

# For health checks during deployment
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ[...]
SUPABASE_JWT_SECRET=your-jwt-secret
```

## 🚦 Deployment Workflow

### Automatic Deployments:
- **Staging**: Push to `staging` branch → deploys to staging app
- **Production**: Push to `main` branch → deploys to production app

### Manual Deployments:
```bash
# Staging
doctl apps update 2f2d7605-d69f-41d2-856b-fdac6011faae --spec .do/staging.yaml

# Production
doctl apps update 7ad1242b-0f17-42fe-a0d1-dc8ca88956bc --spec .do/production.yaml
```

## 🔍 Health Check Endpoints

Both apps respond to:
- `/health`
- `/api/v1/health`
- `/api/v1/health/`

## 🐛 Common Issues & Solutions

### 1. Environment Variables Reset
**Problem**: Variables set in DO console get overwritten by deployment
**Solution**: Remove ALL SECRET env vars from YAML files. Only set them in DO console.

### 2. API Routing Issues
**Problem**: `/api/v1/endpoint` returns 404
**Solution**:
- DO strips `/api` prefix automatically
- App includes both `/api/v1/*` and `/v1/*` routes for compatibility
- Use `/api/v1/endpoint` in frontend calls

### 3. Health Check Failures
**Problem**: Health checks fail during deployment
**Solution**:
- Health check bypass middleware detects DO health checks
- Responds immediately without complex middleware chain
- Check logs for specific errors

### 4. GitHub Workflow Failures
**Problem**: Deployment workflow fails
**Solution**:
- Ensure correct app IDs in GitHub secrets
- Verify DigitalOcean access token has App Platform permissions
- Check branch-specific deployment logic

## 📊 Monitoring & Logs

### View App Status:
```bash
doctl apps list
doctl apps get <app-id>
```

### View Logs:
```bash
# Staging logs
doctl apps logs 2f2d7605-d69f-41d2-856b-fdac6011faae --type=run --follow

# Production logs
doctl apps logs 7ad1242b-0f17-42fe-a0d1-dc8ca88956bc --type=run --follow
```

### Test Endpoints:
```bash
# Health check
curl https://lifo-ai-api-staging-d5tjh.ondigitalocean.app/api/v1/health

# API docs
curl https://lifo-ai-api-staging-d5tjh.ondigitalocean.app/docs
```

## 🔄 Environment Variable Troubleshooting

If environment variables are still being overwritten:

1. **Remove from YAML**: Ensure NO secret env vars in `.do/*.yaml` files
2. **Set in Console**: Use DO App Platform console only for secrets
3. **Redeploy**: Trigger new deployment after console changes
4. **Verify**: Check app logs for proper environment variable loading

The key insight is that DigitalOcean App Platform gives precedence to environment variables defined in the YAML spec over those set in the console, which is counterintuitive but documented behavior.