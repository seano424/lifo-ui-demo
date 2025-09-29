# DigitalOcean App Platform Deployment Runbook

## Quick Reference

### Current Apps
- **Staging**: `lifo-ai-api-staging` (from staging branch)
- **Production**: `lifo-ai-api` (from main branch) - *To be created*

### Environment Variables Setup

#### 1. Staging Environment
Set these in DO App Platform Console (NOT in yaml):
```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-staging-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Security
SECRET_KEY=your-staging-secret-key
SUPABASE_JWT_SECRET=your-jwt-secret

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

#### 2. Production Environment
Set these in DO App Platform Console (NOT in yaml):
```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://your-production-project.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Security
SECRET_KEY=your-strong-production-secret-key
SUPABASE_JWT_SECRET=your-production-jwt-secret

# Google Cloud
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

## Deployment Commands

### Create Staging App (if needed)
```bash
doctl apps create --spec .do/staging.yaml
```

### Create Production App
```bash
doctl apps create --spec .do/production.yaml
```

### Update Existing Apps
```bash
# Update staging
doctl apps update <staging-app-id> --spec .do/staging.yaml

# Update production
doctl apps update <production-app-id> --spec .do/production.yaml
```

### Monitor Deployments
```bash
# List deployments
doctl apps list-deployments <app-id>

# Get deployment logs
doctl apps logs <app-id> --type=run --follow

# Get build logs
doctl apps logs <app-id> --type=build --follow
```

## Troubleshooting

### Health Check Failures
1. **Check health endpoint directly**:
   ```bash
   curl -v https://your-app.ondigitalocean.app/api/v1/health
   ```

2. **Check application logs**:
   ```bash
   doctl apps logs <app-id> --type=run --follow=false | tail -50
   ```

3. **Common issues**:
   - Environment variables not set in DO console
   - Database connectivity issues
   - Middleware blocking health checks

### Environment Variable Issues
1. **Verify environment variables are set in DO console, not in yaml**
2. **Check logs for missing env vars**:
   ```bash
   doctl apps logs <app-id> --type=run | grep -i "environment\|error\|warning"
   ```

### API Routing Issues
1. **Test different endpoint patterns**:
   ```bash
   curl https://your-app.ondigitalocean.app/api/v1/health
   curl https://your-app.ondigitalocean.app/v1/health
   curl https://your-app.ondigitalocean.app/health
   ```

2. **Check if `preserve_path_prefix: true` is set in yaml**

### Build Failures
1. **Check build logs**:
   ```bash
   doctl apps logs <app-id> --type=build
   ```

2. **Common issues**:
   - Python dependencies issues
   - UV package manager errors
   - Missing files in source_dir

## Performance Optimization

### Resource Scaling
```yaml
# In your app.yaml
instance_count: 2              # Scale horizontally
instance_size_slug: professional-xs  # Scale vertically
```

### Health Check Tuning
```yaml
health_check:
  http_path: /api/v1/health
  initial_delay_seconds: 30    # Allow more startup time
  period_seconds: 10
  timeout_seconds: 5
  failure_threshold: 3
  success_threshold: 1
```

## Security Checklist

### Environment Variables
- [ ] All secrets set in DO console, not in yaml files
- [ ] Strong SECRET_KEY for production
- [ ] Proper CORS origins configured
- [ ] Database URLs using encrypted connections

### Network Security
- [ ] TrustedHostMiddleware configured with proper hosts
- [ ] Rate limiting enabled
- [ ] Security headers middleware active

### Monitoring
- [ ] Health checks passing
- [ ] Application logs clean
- [ ] Performance monitoring active
- [ ] Alerts configured

## Common Commands

### Get App Information
```bash
# List all apps
doctl apps list

# Get app details
doctl apps get <app-id>

# Get app URL
doctl apps get <app-id> --format LiveURL --no-header
```

### Environment Management
```bash
# Get app spec
doctl apps get <app-id> --format Spec

# Update app
doctl apps update <app-id> --spec /path/to/app.yaml
```

### Debugging Tools
```bash
# Real-time logs
doctl apps logs <app-id> --type=run --follow

# Get recent logs
doctl apps logs <app-id> --type=run --follow=false | tail -100

# Check deployment history
doctl apps list-deployments <app-id>
```

## Emergency Procedures

### Rollback
```bash
# List deployments to find previous version
doctl apps list-deployments <app-id>

# Rollback to previous deployment
doctl apps create-deployment <app-id> --force-rebuild
```

### Scale Down (Emergency)
```bash
# Temporarily scale to 0 instances
doctl apps update <app-id> --spec <(sed 's/instance_count: [0-9]*/instance_count: 0/' .do/production.yaml)
```

### Quick Health Check
```bash
#!/bin/bash
APP_URL="https://your-app.ondigitalocean.app"
curl -f "${APP_URL}/api/v1/health" && echo "✅ Healthy" || echo "❌ Unhealthy"
```