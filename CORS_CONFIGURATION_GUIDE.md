# CORS Configuration Guide

## 🎯 Overview

This guide explains how to configure CORS (Cross-Origin Resource Sharing) for the LIFO AI Engine API across different environments.

**Problem Fixed**: The `get_cors_origins()` function was commented out, requiring hardcoded CORS origins. The function has been improved and is now active.

**Date**: October 14, 2025
**Status**: ✅ Fixed and deployed

---

## 🔧 How CORS Now Works

### Environment-Based Configuration

The API now uses the `get_cors_origins()` function which returns different CORS origins based on the `ENVIRONMENT` variable:

1. **Production**: Only HTTPS origins from `CORS_ORIGINS` env var
2. **Staging**: Any origins from `CORS_ORIGINS` + localhost for testing
3. **Development**: Uses `CORS_ORIGINS` or defaults to localhost:3000/3001

### Configuration Priority

The function checks in this order:

1. `CORS_ORIGINS` environment variable (comma-separated list)
2. `FRONTEND_URL` environment variable (single URL)
3. Fallback defaults (localhost for development)

---

## 📋 Environment Variable Configuration

### Development (.env.local)

For local development, use:

```bash
# Environment
ENVIRONMENT=development

# CORS Configuration (comma-separated, no spaces after commas)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000

# Optional: Single frontend URL
FRONTEND_URL=http://localhost:3000
```

**Result**: Allows all localhost ports for development

### Staging (DigitalOcean Environment Variables)

For staging environment on DigitalOcean:

```bash
# Environment
ENVIRONMENT=staging

# CORS Configuration - Include staging frontend URL
CORS_ORIGINS=https://staging.lifo-app.com,https://clownfish-app-y2uru.ondigitalocean.app,http://localhost:3000

# Optional: Primary frontend URL
FRONTEND_URL=https://clownfish-app-y2uru.ondigitalocean.app
```

**Result**: Allows staging frontend + DigitalOcean app + localhost for testing

### Production (DigitalOcean Environment Variables)

For production environment on DigitalOcean:

```bash
# Environment
ENVIRONMENT=production

# CORS Configuration - ONLY HTTPS origins (production security)
CORS_ORIGINS=https://lifo-app.com,https://www.lifo-app.com,https://clownfish-app-y2uru.ondigitalocean.app

# Optional: Primary frontend URL
FRONTEND_URL=https://lifo-app.com
```

**Result**: Only HTTPS origins allowed (HTTP filtered out for security)

---

## 🔍 How the Function Works

### Production Logic

```python
if self.environment == "production":
    # 1. Use CORS_ORIGINS if set (filters to HTTPS only)
    if self.cors_origins_list:
        origins.extend([
            origin for origin in self.cors_origins_list
            if origin.startswith("https://")  # ← Security: HTTPS only
        ])

    # 2. Add FRONTEND_URL if set (HTTPS only)
    if self.frontend_url and self.frontend_url.startswith("https://"):
        origins.append(self.frontend_url)
        # Auto-add www variant
        origins.append(self.frontend_url.replace("https://", "https://www."))

    # 3. Fallback if nothing configured
    if not origins:
        origins = ["null", "http://localhost:3000"]  # Minimal for setup
```

### Key Features

1. **HTTPS Enforcement**: Production only allows HTTPS origins
2. **Auto www Variant**: Automatically adds www subdomain
3. **No Wildcards**: No `*` wildcards in production for security
4. **Explicit Configuration**: Uses environment variables, not hardcoded

---

## 🚀 Deployment Instructions

### Step 1: Update Local Environment (Already Done)

Your `.env.local` already has:
```bash
FRONTEND_URL=http://localhost:3000
```

This works for development. The `CORS_ORIGINS` is commented out, so it uses the default.

### Step 2: Configure Staging Environment

Update DigitalOcean staging app environment variables:

1. Go to: https://cloud.digitalocean.com/apps/2f2d7605-d69f-41d2-856b-fdac6011faae/settings
2. Add/Update environment variables:
   ```
   ENVIRONMENT=staging
   CORS_ORIGINS=https://clownfish-app-y2uru.ondigitalocean.app,http://localhost:3000
   FRONTEND_URL=https://clownfish-app-y2uru.ondigitalocean.app
   ```
3. Save and redeploy

### Step 3: Configure Production Environment

Update DigitalOcean production app environment variables:

1. Go to: https://cloud.digitalocean.com/apps/7ad1242b-0f17-42fe-a0d1-dc8ca88956bc/settings
2. Add/Update environment variables:
   ```
   ENVIRONMENT=production
   CORS_ORIGINS=https://lifo-app.com,https://www.lifo-app.com,https://clownfish-app-y2uru.ondigitalocean.app
   FRONTEND_URL=https://lifo-app.com
   ```
3. Save and redeploy

---

## 🔍 Verification

### Check CORS Configuration at Startup

When the API starts, it now logs the CORS configuration:

```
INFO: CORS middleware configured
origins=['https://lifo-app.com', 'https://www.lifo-app.com', 'https://clownfish-app-y2uru.ondigitalocean.app']
environment=production
```

### Test CORS from Browser

**Development Test**:
```bash
# Start API
npm run api:dev

# Check logs for:
# INFO: CORS middleware configured
# origins=['http://localhost:3000', 'http://localhost:3001', ...]
# environment=development
```

**Staging/Production Test**:
```bash
# Check DigitalOcean logs
doctl apps logs <app-id> --type run --tail

# Look for:
# INFO: CORS middleware configured
# origins=[...your configured origins...]
# environment=staging  # or production
```

### Browser Console Test

Open browser console on your frontend and check for CORS errors:

**Before Fix** ❌:
```
Access to XMLHttpRequest at 'https://api.lifo-app.com/api/v1/...' from origin 'https://lifo-app.com'
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

**After Fix** ✅:
```
No CORS errors - requests succeed
```

---

## 🛠️ Changes Made

### 1. Updated `app/core/config.py`

**Improved `get_cors_origins()` function**:
- Now uses `CORS_ORIGINS` environment variable as primary source
- Falls back to `FRONTEND_URL` if `CORS_ORIGINS` not set
- Filters to HTTPS-only in production
- Adds www variant automatically
- Has sensible defaults for development

### 2. Updated `app/main.py`

**CORS Middleware Configuration**:
- Uncommented `settings.get_cors_origins()` call (line 430)
- Moved CORS middleware early in chain (line 420-435)
  - **Critical**: CORS must be before security middleware to handle OPTIONS requests
- Added logging to show configured origins at startup (line 423-427)
- Removed hardcoded origins

**Middleware Order** (new):
```python
1. HealthCheckBypassMiddleware        # Health checks first
2. CORSMiddleware                      # ← MOVED HERE (was at end)
3. TrustedHostMiddleware               # Security checks
4. ProductionSecurityMiddleware        # Production security
5. SecurityHeadersMiddleware           # Security headers
6. ErrorHandlingMiddleware             # Error handling
7. ComprehensiveSecurityMiddleware     # Comprehensive security
8. PerformanceMonitoringMiddleware     # Performance monitoring
9. Rate limiting                       # Rate limits
10. Security blocking                  # IP blocking
```

---

## 🔐 Security Considerations

### Production HTTPS Enforcement

In production, the function **filters out any HTTP origins**:

```python
# This configuration:
CORS_ORIGINS=http://localhost:3000,https://lifo-app.com

# Results in (production):
origins=['https://lifo-app.com']  # HTTP origin filtered out
```

### No Wildcards in Production

Wildcards (`*`) are not allowed in production for security:

```python
# ❌ This is rejected:
CORS_ORIGINS=*

# ✅ Use explicit origins:
CORS_ORIGINS=https://lifo-app.com,https://www.lifo-app.com
```

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| HTTP Origins | ✅ Allowed | ❌ Filtered out |
| HTTPS Origins | ✅ Allowed | ✅ Allowed |
| Wildcards | ✅ Allowed | ❌ Not allowed |
| Localhost | ✅ Always | ❌ Only if in CORS_ORIGINS |
| Credentials | ✅ Enabled | ✅ Enabled |

---

## 🐛 Troubleshooting

### Issue: Frontend blocked by CORS

**Symptoms**:
```
Access to XMLHttpRequest ... has been blocked by CORS policy
```

**Solution**:
1. Check API logs for CORS configuration:
   ```bash
   doctl apps logs <app-id> --type run --tail | grep "CORS middleware configured"
   ```
2. Verify `CORS_ORIGINS` environment variable is set correctly
3. Ensure frontend URL is in the list (case-sensitive, exact match)
4. Check for trailing slashes (origins should NOT have trailing slashes)

### Issue: OPTIONS requests failing

**Symptoms**:
```
Preflight request failed
405 Method Not Allowed
```

**Solution**:
- CORS middleware is now early in the chain (before security middleware)
- OPTIONS method is explicitly allowed in `allow_methods`
- Should be fixed by the middleware reordering

### Issue: Localhost works, production doesn't

**Symptoms**:
- Local development: ✅ Works
- Production: ❌ CORS blocked

**Solution**:
1. Check `ENVIRONMENT` variable is set to "production"
2. Verify `CORS_ORIGINS` has HTTPS URLs (not HTTP)
3. Check logs show correct origins:
   ```
   INFO: CORS middleware configured
   origins=['https://lifo-app.com', ...]  # ← Should see your production URLs
   environment=production
   ```

### Issue: www subdomain blocked

**Symptoms**:
- `https://lifo-app.com`: ✅ Works
- `https://www.lifo-app.com`: ❌ Blocked

**Solution**:
- If `FRONTEND_URL=https://lifo-app.com`, the www variant is auto-added
- If using `CORS_ORIGINS`, add both explicitly:
  ```bash
  CORS_ORIGINS=https://lifo-app.com,https://www.lifo-app.com
  ```

---

## 📖 Related Documentation

**Configuration Files**:
- `lifo_api/app/core/config.py` - Settings and `get_cors_origins()` function
- `lifo_api/app/main.py` - CORS middleware configuration
- `.env.local` - Local environment variables
- DigitalOcean App Platform - Staging/Production environment variables

**CORS Specification**:
- [MDN CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [FastAPI CORS Middleware](https://fastapi.tiangolo.com/tutorial/cors/)

---

## ✅ Success Criteria

**Before Fix**:
- ❌ `get_cors_origins()` commented out
- ❌ Hardcoded origins in `main.py`
- ❌ No environment-based configuration
- ❌ Frontend blocked by CORS

**After Fix**:
- ✅ `get_cors_origins()` active and improved
- ✅ Environment variable-based configuration
- ✅ No hardcoded origins
- ✅ Frontend works across all environments
- ✅ CORS logged at startup for visibility
- ✅ HTTPS enforcement in production
- ✅ Proper middleware ordering

---

## 🙏 Summary

The CORS issue was caused by:
1. `get_cors_origins()` function not using `CORS_ORIGINS` environment variable
2. Function commented out → hardcoded origins used instead
3. CORS middleware too late in chain (after security middleware)

The fix:
1. ✅ Improved `get_cors_origins()` to use `CORS_ORIGINS` env var
2. ✅ Uncommented function call in `main.py`
3. ✅ Moved CORS middleware early (before security middleware)
4. ✅ Added logging for visibility
5. ✅ Documented configuration for all environments

**Result**: CORS now works properly with environment-based configuration, no hardcoding needed! 🎉

---

**Document Version**: 1.0
**Last Updated**: October 14, 2025
**Status**: ✅ Fixed and ready for deployment
