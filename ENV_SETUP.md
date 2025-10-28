# Environment Setup - Frontend (lifo-app)

## Overview

The frontend uses Next.js conventions with a `.env.local` file for local development.

## Quick Start

```bash
# Copy the example file
cp .env.example .env.local

# Edit with your credentials
nano .env.local  # or your preferred editor
```

## File Structure

```
lifo-app/
├── .env.example      # Template with placeholder values (committed to git)
└── .env.local        # Your local config with real values (NOT committed)
```

## Required Configuration

### 1. Supabase Credentials (Public)

Get these from your Supabase project dashboard: https://app.supabase.com/project/_/settings/api

```bash
# Public - Safe to expose to browser
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-side only - For Next.js API routes
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Important**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets there!

### 2. Backend API URL

Point to your FastAPI backend:

```bash
# Development (local backend)
NEXT_PUBLIC_API_URL=http://localhost:8000

# Staging
NEXT_PUBLIC_API_URL=https://lifo-ai-api-staging.ondigitalocean.app

# Production
NEXT_PUBLIC_API_URL=https://api.lifo.ai
```

### 3. Email Service (Optional)

For sending emails from Next.js API routes:

```bash
RESEND_API_KEY=your-resend-api-key
```

Get your key from: https://resend.com/

## Environment-Specific Configs

### Development
```bash
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_DEBUG=true
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Staging
```bash
NEXT_PUBLIC_ENVIRONMENT=staging
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_API_URL=https://lifo-ai-api-staging.ondigitalocean.app
```

### Production
```bash
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_DEBUG=false
NEXT_PUBLIC_API_URL=https://api.lifo.ai
NEXT_PUBLIC_SITE_URL=https://app.lifo.ai
```

## Optional Features

### Debug Flags (Development)
```bash
NEXT_PUBLIC_DEBUG=true                    # General debug logs
NEXT_PUBLIC_DEBUG_OCR=true               # OCR-specific logs
NEXT_PUBLIC_DEBUG_ACTIONS=true           # Batch action logs
NEXT_PUBLIC_LOG_QUERIES=true             # Database query logs
```

**Recommendation**: Keep all false in production for cleaner logs.

### Feature Flags
```bash
# Auto-OCR scanning (hands-free)
NEXT_PUBLIC_AUTO_OCR_ENABLED=false

# OCR sensitivity thresholds
NEXT_PUBLIC_AUTO_OCR_MIN_TEXT_CONFIDENCE=0.05
NEXT_PUBLIC_AUTO_OCR_MIN_DATE_CONFIDENCE=0.35
```

### Analytics & Monitoring
```bash
# PostHog Analytics (EU region for GDPR compliance)
NEXT_PUBLIC_POSTHOG_KEY=phc_XXXXXXXXXXXXXXXXX
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Sentry Error Tracking
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### Google Services
```bash
# Google Places API (for location autocomplete)
NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=your-places-api-key
```

## Verification

Check your configuration:
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

## Next.js Environment Variable Priorities

Next.js loads environment variables in this order (later = higher priority):

1. `.env` - Shared across all environments
2. `.env.local` - Local overrides, ignored by git
3. `.env.development` / `.env.production` - Environment-specific
4. `.env.development.local` / `.env.production.local` - Local environment-specific

**Recommendation**: Use `.env.local` for local development to keep it simple.

## Public vs Server-Only Variables

### Public Variables (NEXT_PUBLIC_*)
✅ Can use:
- API URLs
- Feature flags
- Public IDs
- Environment indicators

❌ Never use:
- API keys
- Service role keys
- Database credentials
- Secret tokens

### Server-Only Variables
✅ Use for:
- Service role keys
- Email API keys
- Secret tokens
- Internal credentials

## Security Checklist

- [ ] `.env.local` created from `.env.example`
- [ ] All placeholder values replaced
- [ ] No secrets in `NEXT_PUBLIC_` variables
- [ ] `.env.local` in `.gitignore` (should already be there)
- [ ] Backend API URL points to correct environment
- [ ] Debug flags disabled in production
- [ ] Supabase anon key is the public key (not service role)

## Troubleshooting

### Frontend Can't Connect to Backend
- Check `NEXT_PUBLIC_API_URL` is correct
- Ensure backend is running
- Verify CORS is configured in backend

### Supabase Connection Issues
- Verify `NEXT_PUBLIC_SUPABASE_URL` format
- Check anon key is correct
- Test in Supabase Studio

### Environment Variables Not Loading
- Restart dev server after changing `.env.local`
- Check variable naming (must start with `NEXT_PUBLIC_` for client-side)
- Verify no typos in variable names

### Build Issues
- Ensure all required `NEXT_PUBLIC_` variables are set
- Check for missing environment variables
- Review Next.js build logs

## Related Documentation

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Supabase Docs](https://supabase.com/docs)
- [Backend Setup](https://github.com/lifo-ai/lifo-api)
