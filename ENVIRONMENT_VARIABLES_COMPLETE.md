# 🔑 Complete Environment Variables List for LIFO.AI

Based on comprehensive codebase analysis, here are ALL environment variables used across the system:

## 📋 **CRITICAL (Required for Deployment)**

### Supabase Authentication & Database
```bash
# Frontend (Public) - Client-side access
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

# Backend (Private) - Server-side only
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-settings
DATABASE_URL=postgresql+asyncpg://postgres:[password]@[host]:5432/postgres

# Optional Supabase DB Password (for direct connections)
SUPABASE_DB_PASSWORD=your-database-password
```

### Application Core Settings
```bash
ENVIRONMENT=production  # development, staging, production
DEBUG=false  # true for development, false for production
SECRET_KEY=your-super-secret-key-generate-with-openssl-rand-hex-32
```

### Google Cloud Vision API (for OCR)
```bash
# For DigitalOcean/Cloud deployment (JSON format)
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# Alternative for local development (file path)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
```

## 🌐 **Frontend Configuration (Next.js)**

### API Integration
```bash
# FastAPI Backend URLs
NEXT_PUBLIC_FASTAPI_URL=https://your-api-domain.ondigitalocean.app
FASTAPI_URL=https://your-api-domain.ondigitalocean.app  # Server-side calls
FASTAPI_BASE_URL=https://your-api-domain.ondigitalocean.app  # Scoring integration
FASTAPI_API_KEY=your-api-authentication-key

# Base URLs
NEXT_PUBLIC_BASE_URL=https://your-frontend-domain.com
VERCEL_URL=your-app.vercel.app  # If using Vercel
```

### Feature Toggles
```bash
# Auto-scoring configuration
ENABLE_AUTO_SCORING=true  # Server-side toggle
NEXT_PUBLIC_ENABLE_AUTO_SCORING=true  # Client-side toggle
NEXT_PUBLIC_DISABLE_DEV_SCORING=false  # Disable scoring in development

# Development flags
NEXT_PUBLIC_DEBUG=false  # Enable debug logging
ENABLE_FASTAPI=true  # Enable FastAPI integration
```

## ⚙️ **Backend Configuration (FastAPI)**

### Server Settings
```bash
API_HOST=0.0.0.0
API_PORT=8000
API_V1_STR=/api/v1
PROJECT_NAME=LIFO AI API
```

### Security & CORS
```bash
ALLOWED_HOSTS=your-domain.com,*.ondigitalocean.app
BACKEND_CORS_ORIGINS=https://your-frontend.com,https://www.your-frontend.com
CORS_ORIGINS=https://your-frontend.com  # Alternative format
```

### Database Configuration
```bash
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600
```

### JWT & Authentication
```bash
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24 hours
JWT_SECRET_KEY=your-jwt-secret-for-internal-tokens
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## 🤖 **AI/ML Configuration**

### OCR Processing
```bash
# Vision API Settings
VISION_API_TIMEOUT=10000
VISION_MAX_IMAGE_SIZE=15728640
VISION_SUPPORTED_FORMATS=jpeg,jpg,png,webp

# OCR Confidence Thresholds
OCR_CONFIDENCE_THRESHOLD=0.7
BARCODE_CONFIDENCE_THRESHOLD=0.6
EXPIRY_CONFIDENCE_THRESHOLD=0.65
MAX_PROCESSING_TIME_MS=10000
```

### Scoring Algorithm
```bash
SCORING_WEIGHTS_EXPIRY=0.5
SCORING_WEIGHTS_VELOCITY=0.3
SCORING_WEIGHTS_MARGIN=0.2
```

### Performance Monitoring
```bash
ENABLE_PERFORMANCE_MONITORING=true
ENABLE_DETAILED_REQUEST_LOGGING=false
ENABLE_ALERTING=true
RATE_LIMIT_ENABLED=true
```

## 📧 **Email Services**

### Resend API (Primary)
```bash
RESEND_API=re_YourResendAPIKey
```

### SMTP (Alternative)
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@domain.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=noreply@your-domain.com
```

## 🔧 **Optional Services**

### Google Places API
```bash
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=AIzaSyC...  # For store location features
```

### Caching (Redis)
```bash
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=300
```

### File Upload Limits
```bash
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=csv,xlsx
```

### Monitoring
```bash
ENABLE_METRICS=true
METRICS_PORT=9090
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR
LOG_FORMAT=json  # json or console
```

## 🧪 **Development & Testing**

### Test Configuration
```bash
TEST_DATABASE_URL=sqlite+aiosqlite:///:memory:
MANUAL_ACCESS_TOKEN=your-test-token-for-auth-tests
```

### Development Services
```bash
SUPABASE_SERVICE_EMAIL=dev@example.com
SUPABASE_SERVICE_PASSWORD=dev-password
DEV_USER_EMAIL=dev@example.com
DEV_USER_PASSWORD=dev-password
STAGING_USER_EMAIL=staging@example.com
STAGING_USER_PASSWORD=staging-password
```

### Development Flags
```bash
ENABLE_DEBUG_TOOLBAR=false
ENABLE_SQL_LOGGING=false
SEED_TEST_DATA=false
ONBOARDING_MODE=production  # mock, test, production
```

### Dataset Tools (if using)
```bash
AWS_DEFAULT_REGION=us-east-1
MAX_PRODUCTS=100
MAX_FILES=1000
```

## 🚀 **DigitalOcean Specific**

### App Platform Environment Variables
Set these in DigitalOcean Console (NOT in YAML):
```bash
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=your-secret
SECRET_KEY=your-secret
GOOGLE_APPLICATION_CREDENTIALS_JSON={"type":"service_account",...}
```

### Performance Settings
```bash
WORKERS=2  # Gunicorn workers for production
MAX_WORKERS=4
```

## 📋 **Environment-Specific Recommendations**

### Development (.env.local)
```bash
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000
FASTAPI_URL=http://localhost:8000
# Use gcloud auth application-default login for Google Cloud
```

### Staging
```bash
ENVIRONMENT=staging
DEBUG=false
LOG_LEVEL=INFO
# Use staging Supabase project
# Use staging Google Cloud project
```

### Production
```bash
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
ENABLE_PERFORMANCE_MONITORING=true
RATE_LIMIT_ENABLED=true
# Use production domains and keys
```

## ⚠️ **Security Notes**

1. **Never commit .env files** with real credentials
2. **Use different keys** for each environment
3. **Set SECRET_KEY** to a strong random string in production
4. **Restrict CORS_ORIGINS** to your actual domains
5. **Use HTTPS URLs** in production
6. **Google Cloud credentials** can be JSON string or file path
7. **DigitalOcean precedence**: YAML variables override console variables

## 🔍 **Missing Variable Detection**

If you encounter errors about missing environment variables, check:
1. **FastAPI logs** for backend variables
2. **Browser console** for frontend (NEXT_PUBLIC_*) variables
3. **Application startup logs** for configuration errors
4. **Health check endpoints** for service connectivity

This list is based on actual usage found in the codebase as of the latest analysis.