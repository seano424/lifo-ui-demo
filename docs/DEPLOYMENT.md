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

### Monitoring

#### Check App Status

```bash
# List all apps
doctl apps list

# Get specific app info
doctl apps get YOUR_APP_ID

# Check deployment status
doctl apps get YOUR_APP_ID --format Name,Status,LiveURL
```

#### View Logs

```bash
# View build logs
doctl apps logs YOUR_APP_ID --type=build --follow

# View runtime logs
doctl apps logs YOUR_APP_ID --type=run --follow

# View deployment logs
doctl apps logs YOUR_APP_ID --type=deploy --follow
```

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
# Copy environment file
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

- [ ] Update repository URLs in `.do/app.yaml`
- [ ] Set all environment variables
- [ ] Configure Supabase JWT settings
- [ ] Test database connectivity
- [ ] Verify CORS configuration
- [ ] Run health checks
- [ ] Monitor application logs
- [ ] Test API endpoints
- [ ] Verify frontend functionality
- [ ] Configure custom domains (if needed)
- [ ] Set up monitoring/alerting
- [ ] Document environment variables
- [ ] Plan backup strategy

## Support

For deployment issues:

1. Check Digital Ocean documentation
2. Review application logs
3. Test with debug endpoints
4. Verify environment configuration
5. Contact support if needed
