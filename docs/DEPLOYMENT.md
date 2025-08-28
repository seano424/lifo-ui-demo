# LIFO AI Platform Deployment Guide

## Digital Ocean App Platform Deployment

This guide covers deploying the LIFO AI Platform to Digital Ocean App Platform.

### Prerequisites

1. **Digital Ocean Account** with App Platform access
2. **doctl CLI** installed and configured
3. **GitHub Repository** with your code
4. **Supabase Project** configured
5. **Environment Variables** prepared

### Installation

#### 1. Install doctl CLI

**macOS:**

```bash
brew install doctl
```

**Linux:**

```bash
snap install doctl
```

**Windows:**

```bash
# Download from https://github.com/digitalocean/doctl/releases
```

#### 2. Authenticate with Digital Ocean

```bash
doctl auth init
```

### Configuration

#### 1. Update App Specification

Edit `.do/app.yaml` and update:

```yaml
# Update repository information
github:
  repo: your-username/lifo-app
  branch: main

# Update environment variables
envs:
  - key: SUPABASE_URL
    value: https://your-project.supabase.co
  - key: SUPABASE_JWT_SECRET
    value: your-jwt-secret
  - key: SUPABASE_SERVICE_ROLE_KEY
    value: your-service-role-key
  - key: SUPABASE_ANON_KEY
    value: your-anon-key
```

#### 2. Environment Variables

> **Note**: We now use a unified `.env.example` file at the root level instead of separate environment files. This replaces the old dual environment setup.

Set these environment variables in Digital Ocean:

**Global Variables:**

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_JWT_SECRET`: Your Supabase JWT secret
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key
- `SUPABASE_ANON_KEY`: Your Supabase anonymous key

**Frontend Variables:**

- `NEXT_PUBLIC_API_URL`: Auto-populated by Digital Ocean
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key

**API Variables:**

- `ENVIRONMENT`: `production`
- `DEBUG`: `false`
- `LOG_LEVEL`: `INFO`
- `DATABASE_URL`: Auto-populated by Digital Ocean
- `FRONTEND_URL`: Auto-populated by Digital Ocean
- `API_URL`: Auto-populated by Digital Ocean

### Deployment

#### Method 1: Using the Deploy Script

```bash
# Make script executable
chmod +x scripts/deploy-digital-ocean.sh

# Run deployment
./scripts/deploy-digital-ocean.sh
```

#### Method 2: Manual Deployment

```bash
# Create new app
doctl apps create --spec .do/app.yaml --wait

# Or update existing app
doctl apps update YOUR_APP_ID --spec .do/app.yaml --wait
```

### Monitoring & Error Tracking

#### App Platform Monitoring

```bash
# List all apps
doctl apps list

# Get specific app info
doctl apps get YOUR_APP_ID

# Check deployment status
doctl apps get YOUR_APP_ID --format Name,Status,LiveURL
```

#### Log Monitoring

```bash
# View build logs
doctl apps logs YOUR_APP_ID --type=build --follow

# View runtime logs (includes structured error logs)
doctl apps logs YOUR_APP_ID --type=run --follow

# View deployment logs
doctl apps logs YOUR_APP_ID --type=deploy --follow
```

#### Comprehensive Error Monitoring

The LIFO AI Engine includes built-in error monitoring endpoints:

```bash
# System health with error statistics
curl https://your-api-url.ondigitalocean.app/health

# Comprehensive error statistics
curl https://your-api-url.ondigitalocean.app/api/errors/stats

# API information with monitoring features
curl https://your-api-url.ondigitalocean.app/api/info
```

**Example Error Monitoring Response:**

```json
{
  "error_tracking": {
    "total_errors": 42,
    "errors_last_24h": 3,
    "errors_last_1h": 0,
    "category_breakdown_24h": {
      "validation": 2,
      "database": 1
    },
    "recovery_success_rates": {
      "OperationalError": {
        "success_rate": 1.0,
        "attempted": 5,
        "successful": 5
      }
    }
  },
  "system_health": {
    "overall_status": "healthy",
    "monitoring_active": true
  }
}
```

#### Production Logging Configuration

Ensure these environment variables are set for optimal production monitoring:

```bash
# Structured logging for better log analysis
LOG_LEVEL=WARNING
LOG_FORMAT=json

# Enable comprehensive monitoring
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_ALERTING=true
ENABLE_DETAILED_REQUEST_LOGGING=false  # Reduce log volume in production
```

#### Error Alert Monitoring

Monitor these key metrics in production:

- Error rate exceeding 10 errors/hour on any endpoint
- Critical severity errors (require immediate attention)
- Recovery failure rate above 50% for any error type
- Database connection failures
- External service timeout patterns

### Testing

#### Health Check

```bash
# Test API health
curl https://your-api-url.ondigitalocean.app/health

# Test frontend
curl https://your-frontend-url.ondigitalocean.app
```

#### CORS Testing

```bash
# Test CORS configuration (development only)
curl https://your-api-url.ondigitalocean.app/api/v1/debug/cors-info
```

### Troubleshooting

#### Common Issues

1. **Build Failures**

   - Check build logs: `doctl apps logs YOUR_APP_ID --type=build`
   - Verify dependencies in `requirements.txt` and `package.json`

2. **Runtime Errors**

   - Check runtime logs: `doctl apps logs YOUR_APP_ID --type=run`
   - Verify environment variables are set correctly

3. **Database Connection Issues**

   - Ensure database is created and accessible
   - Check `DATABASE_URL` environment variable

4. **CORS Issues**
   - Verify `FRONTEND_URL` is set correctly
   - Check CORS origins in health endpoint

#### Debug Endpoints (Development)

When `ENVIRONMENT=development`, these endpoints are available:

- `/api/v1/debug/cors-info` - CORS configuration
- `/api/v1/debug/config` - Application configuration
- `/api/v1/debug/health-extended` - Extended health check

### Environment-Specific Configurations

#### Production

- Docs disabled (`/docs`, `/redoc` return 404)
- Debug endpoints disabled
- CORS origins restricted to configured URLs
- Logging level set to `WARNING`

#### Development

- All endpoints enabled
- Debug endpoints available
- CORS origins include localhost
- Logging level set to `DEBUG`

### Database Migration

After deployment, run database migrations:

```bash
# Connect to your app container
doctl apps exec YOUR_APP_ID --component api -- bash

# Run migrations
python -m alembic upgrade head
```

### SSL/TLS

Digital Ocean App Platform automatically provides SSL certificates for your domains.

### Custom Domains

To use custom domains:

1. Add domain in Digital Ocean dashboard
2. Update DNS records
3. Update CORS configuration

### Scaling

Adjust scaling in `.do/app.yaml`:

```yaml
services:
  - name: api
    instance_count: 2 # Scale to 2 instances
    instance_size_slug: basic-s # Upgrade to larger instance
```

### Cost Optimization

- Use appropriate instance sizes
- Monitor resource usage
- Consider auto-scaling for variable workloads

### Security

- Environment variables are encrypted at rest
- Use service role keys for database access
- Regular security updates applied automatically

### Backup

- Database backups are automatic
- Application code is backed up in GitHub
- Environment variables should be documented securely

### Rollback

```bash
# View deployment history
doctl apps list-deployments YOUR_APP_ID

# Revert to previous deployment
doctl apps create-deployment YOUR_APP_ID --force-rebuild
```

## Local Development with Docker

### Docker Compose Setup

```bash
# Copy unified environment file from root level
cp .env.example .env

# Edit environment variables
nano .env

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8001
- **Database**: localhost:5432
- **Redis**: localhost:6379

## Production Checklist

### Pre-Deployment

- [ ] Update repository URLs in `.do/app.yaml`
- [ ] Set all environment variables
- [ ] Configure Supabase JWT settings
- [ ] Test database connectivity
- [ ] Verify CORS configuration

### Deployment & Verification

- [ ] Deploy application to App Platform
- [ ] Run comprehensive health checks (`/health`)
- [ ] Test error monitoring endpoints (`/api/errors/stats`)
- [ ] Verify API endpoints functionality
- [ ] Test frontend integration
- [ ] Validate error tracking is active

### Production Monitoring Setup

- [x] **Built-in Error Monitoring** - Comprehensive error tracking system active
- [x] **Performance Monitoring** - Real-time metrics collection enabled
- [x] **Health Check Endpoints** - Enhanced health monitoring available
- [x] **Structured Logging** - JSON logs with error correlation
- [x] **Automatic Recovery** - Database connection recovery implemented
- [ ] Configure external log aggregation (optional)
- [ ] Set up custom alerting (optional)

### Post-Deployment

- [ ] Monitor application logs for errors
- [ ] Check error statistics via `/api/errors/stats`
- [ ] Verify automatic recovery mechanisms
- [ ] Configure custom domains (if needed)
- [ ] Document monitoring endpoints
- [ ] Plan backup strategy
- [ ] Test disaster recovery procedures

### Monitoring Endpoints to Bookmark

- `GET /health` - System health with error statistics
- `GET /api/errors/stats` - Comprehensive error tracking data
- `GET /api/errors/endpoints/{path}` - Endpoint-specific error analysis
- `GET /api/info` - API capabilities and monitoring features

## Support

For deployment issues:

1. Check Digital Ocean documentation
2. Review application logs
3. Test with debug endpoints
4. Verify environment configuration
5. Contact support if needed
