# 🔧 Digital Ocean Environment Variables Import Checklist

## **YOUR CURRENT SETUP DETECTED:**
- **Supabase Project**: LIFO (jrgmetdsohowtxickqij.supabase.co)
- **Database**: PostgreSQL via Supabase pooler
- **Frontend**: Already deployed on DO (calls localhost:8000)
- **Current API**: Running on localhost:8000

---

## ✅ **REQUIRED ENVIRONMENT VARIABLES TO SET IN DO APP PLATFORM**

### 1. **CORE APPLICATION SETTINGS**
Set these in DO App Platform Console → Settings → Environment Variables:

```bash
# Application
ENVIRONMENT=production  # or staging
PROJECT_NAME=LIFO AI API
API_V1_STR=/api/v1
DEBUG=false  # true for staging

# Server (App Platform will handle these, but good to set)
HOST=0.0.0.0
PORT=8080  # App Platform requires 8080
```

### 2. **SUPABASE CONFIGURATION** (FROM YOUR .env.local)
```bash
# Main Supabase settings
SUPABASE_URL=https://jrgmetdsohowtxickqij.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ21ldGRzb2hvd3R4aWNrcWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAzNjExMjcsImV4cCI6MjA2NTkzNzEyN30.9fHTP00ExZaA-7BphiirBijS0E5m4V-ZFgKMOMHgKcg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZ21ldGRzb2hvd3R4aWNrcWlqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDM2MTEyNywiZXhwIjoyMDY1OTM3MTI3fQ.EW2y7hsv75so4Zp6iOtdFrlOGo4HJAtySD4O7SF_qXU

# New Supabase API Keys (recommended)
SUPABASE_PUBLISHABLE_KEY=sb_publishable_-L4VSb4-_nDhrlQf0EoPbQ_oCVS2Ywy
SUPABASE_SECRET_KEY=sb_secret_YTaH6ijzniGW8dVpqT8_mw_YaxVKbLP
SUPABASE_JWT_SECRET=nCCdUdI+tKOv/xilCNyyQw5t52HXeahpn2KhmDb6cPcyeR9UZaSallSdGmy6AbRwU3cI19ljytZDucZRJcMv6A==
```

### 3. **DATABASE CONFIGURATION** (FROM YOUR .env.local)
```bash
# Your current database URL (Supabase pooler)
DATABASE_URL=postgresql://postgres.jrgmetdsohowtxickqij:iK24kRUOoWIF1GJk@aws-0-eu-west-3.pooler.supabase.com:6543/postgres

# Database pool settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600
SUPABASE_DB_PASSWORD=iK24kRUOoWIF1GJk
```

### 4. **SECURITY & AUTHENTICATION**
```bash
# Your existing secret key
SECRET_KEY=24O4jgHRxq6-Xb5IIABabUhrFaMnMuM5jPRtc-rSIM4
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# FastAPI key (for internal communication)  
FASTAPI_API_KEY=s9riTMpl9Sc1MmlkG8VS9FSz-abZitbdPaommCcF7fU
```

### 5. **CORS & FRONTEND INTEGRATION**
```bash
# Update this with your actual frontend domain
BACKEND_CORS_ORIGINS=https://your-frontend-domain.ondigitalocean.app,https://localhost:3000
FRONTEND_URL=https://your-frontend-domain.ondigitalocean.app
API_URL=https://lifo-ai-api-<your-app-id>.ondigitalocean.app
```

### 6. **EXTERNAL SERVICES** (FROM YOUR .env.local)
```bash
# Resend for emails
RESEND_API=re_TEANqPNv_Fn8ntgKhRJogP17JMJbsGE2e

# Performance settings
MOBILE_CACHE_TTL=300
MOBILE_PERFORMANCE_THRESHOLD_MS=500
SCAN_WORKFLOW_RATE_LIMIT=30
REALTIME_QUEUE_SIZE=1000
```

### 7. **AI & SCORING CONFIGURATION**
```bash
# AI Scoring weights
SCORING_WEIGHTS_EXPIRY=0.5
SCORING_WEIGHTS_VELOCITY=0.3
SCORING_WEIGHTS_MARGIN=0.2

# OCR & Vision settings
OCR_CONFIDENCE_THRESHOLD=0.7
BARCODE_CONFIDENCE_THRESHOLD=0.8
EXPIRY_CONFIDENCE_THRESHOLD=0.65
MAX_PROCESSING_TIME_MS=10000

# File upload limits
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=csv,xlsx,jpg,jpeg,png
```

### 8. **RATE LIMITING & CACHING**
```bash
RATE_LIMIT_ENABLED=true
CACHE_TTL=300
CACHE_ENABLED=true
```

---

## 🎯 **STEP-BY-STEP IMPORT PROCESS**

### **For STAGING Deployment:**
1. Go to DO App Platform Console
2. Create staging app: `.do/deploy-multi.sh --env staging create`
3. Go to Settings → Environment Variables
4. Add all variables above with `type: SECRET` for sensitive data
5. Set `ENVIRONMENT=staging` and `DEBUG=true`

### **For PRODUCTION Deployment:**
1. Test staging first!
2. Create production app: `.do/deploy-multi.sh --env production create`
3. Add same variables but set `ENVIRONMENT=production` and `DEBUG=false`
4. Update `BACKEND_CORS_ORIGINS` with your actual production domain

---

## ⚠️ **IMPORTANT SECURITY NOTES**

### **Mark as SECRET (encrypted) in DO:**
- All `SUPABASE_*` keys
- `SECRET_KEY`
- `DATABASE_URL` and `SUPABASE_DB_PASSWORD`
- `RESEND_API`
- `FASTAPI_API_KEY`

### **Frontend Integration:**
Your frontend currently calls `localhost:8000`. After deployment, update it to:
- **Staging**: `https://lifo-ai-api-staging-<id>.ondigitalocean.app`
- **Production**: `https://lifo-ai-api-<id>.ondigitalocean.app`

---

## 🔗 **CURRENT INTEGRATION POINTS**

Based on your setup:
1. **Database**: ✅ Supabase PostgreSQL (pooler connection)
2. **Authentication**: ✅ Supabase Auth (JWT tokens)
3. **Email**: ✅ Resend API
4. **File Storage**: ✅ Local (can add DO Spaces later)
5. **Frontend**: ✅ Already deployed on DO

---

## 🚀 **QUICK DEPLOY COMMAND**

```bash
# Set all these variables in DO console, then:
.do/deploy-multi.sh --env staging create

# Test the API
curl https://lifo-ai-api-staging-<id>.ondigitalocean.app/api/v1/health

# If staging works, deploy to production
.do/deploy-multi.sh --env production create
```

All your current configuration is preserved and will work seamlessly with the 25x performance improvements!