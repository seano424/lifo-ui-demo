# OCR Staging Deployment Guide

## 🚀 Deploying OCR to DigitalOcean Staging

### Prerequisites
- Google Cloud project with Vision API enabled
- Google Cloud service account with Vision API permissions
- DigitalOcean App Platform access

---

## 1. Google Cloud Setup

### Create Service Account
```bash
# 1. Go to Google Cloud Console
# 2. Navigate to IAM & Admin > Service Accounts
# 3. Create new service account with name: "lifo-ocr-staging"
# 4. Grant role: "Cloud Vision API User"
# 5. Create JSON key and download it
```

---

## 2. Configure DigitalOcean Environment Variables

Add these environment variables to your DigitalOcean App Platform:

### Required: Google Cloud Credentials
```bash
# Option 1: JSON credentials as environment variable (RECOMMENDED for DigitalOcean)
GOOGLE_APPLICATION_CREDENTIALS_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'

# Option 2: Base64-encoded credentials (alternative)
GOOGLE_APPLICATION_CREDENTIALS_JSON='<base64-encoded-json>'

# Project ID
GOOGLE_CLOUD_PROJECT_ID=lifo-app-467022
```

### How to Set GOOGLE_APPLICATION_CREDENTIALS_JSON

**Method 1: Direct JSON (Recommended)**
1. Open your downloaded service account JSON file
2. Copy the entire JSON content
3. In DigitalOcean App Platform, add environment variable:
   - Key: `GOOGLE_APPLICATION_CREDENTIALS_JSON`
   - Value: Paste the entire JSON (keep it as one line or properly escaped)

**Method 2: Base64 Encoded**
```bash
# Encode the JSON file
cat service-account.json | base64

# Copy output and set as GOOGLE_APPLICATION_CREDENTIALS_JSON
```

---

## 3. Frontend Environment Variables

Update your `.env.production` or DigitalOcean frontend app settings:

```bash
# API URLs
NEXT_PUBLIC_FASTAPI_URL=https://lifo-ai-api-staging-d5tjh.ondigitalocean.app

# Debug logging (set to false for production)
NEXT_PUBLIC_DEBUG_OCR=false
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_LOG_QUERIES=false
```

---

## 4. Enable Debug Logging on Staging (Temporary)

**To debug OCR issues on staging**, temporarily enable logging:

### Frontend
```bash
NEXT_PUBLIC_DEBUG_OCR=true  # Shows OCR client logs in browser console
```

### Backend
```bash
DEBUG=true           # Backend already has this set
LOG_LEVEL=DEBUG      # Change from INFO to DEBUG for more verbose logs
```

**Remember to turn these OFF after debugging!**

---

## 5. Verify Deployment

### Test Vision API Connection
```bash
# Check backend logs for this message on startup:
"Google Vision API client initialized successfully"
credential_method=service_account_info  # Should show this, not "default_chain"
```

### Test OCR Endpoint
```bash
curl -X POST https://lifo-ai-api-staging-d5tjh.ondigitalocean.app/api/v1/health
# Should return: {"status": "healthy"}
```

---

## 6. Troubleshooting

### Issue: "Google Vision client not available"

**Check logs for:**
```
"No explicit Google credentials found"
"Google Vision API client initialized with default credentials"
```

**Solution:**
- Verify `GOOGLE_APPLICATION_CREDENTIALS_JSON` is set correctly
- Check JSON is valid (use a JSON validator)
- Ensure JSON contains all required fields: `type`, `project_id`, `private_key`, `client_email`

### Issue: "Vision API returns no text"

**Check:**
1. Vision API is enabled in Google Cloud project
2. Service account has "Cloud Vision API User" role
3. No API quota limits reached
4. Network connectivity from DigitalOcean to Google Cloud

### Issue: "Date not parsing"

**Enable debug logs temporarily:**
```bash
# Backend logs will show:
"Starting date parsing" | texts_to_parse=[...]
"European date parsing completed" | expiry_dates_parsed=X
```

---

## 7. Production Checklist

Before going to production:

- [ ] Google Cloud credentials configured
- [ ] Vision API enabled and quotas checked
- [ ] Debug logging disabled (`NEXT_PUBLIC_DEBUG_OCR=false`)
- [ ] Auto-download removed (already done in code)
- [ ] Test with multiple date formats
- [ ] Monitor Vision API costs
- [ ] Set up error alerting

---

## 8. Cost Monitoring

Google Vision API pricing (as of 2024):
- First 1,000 units/month: FREE
- 1,001 - 5,000,000: $1.50 per 1,000 units
- Text detection: 1 unit per image

**Recommendation:** Set up budget alerts in Google Cloud Console.

---

## Quick Reference

### Local Development
- Uses Application Default Credentials (ADC)
- Run: `gcloud auth application-default login`
- No service account needed

### Staging/Production
- Uses service account JSON
- Set `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable
- Can use direct JSON or base64-encoded

### Debug Flags
- `NEXT_PUBLIC_DEBUG_OCR=true` - Frontend OCR logs
- `DEBUG=true` - Backend general logs
- `LOG_LEVEL=DEBUG` - Backend verbose logs
