# Environment Security Guide - LIFO AI Engine

**CRITICAL SECURITY NOTICE**: This guide documents the proper handling of sensitive environment variables and secrets.

## ⚠️ Security Alert - Action Taken

**Date**: August 4, 2025  
**Action**: Production credentials have been secured and replaced with safe placeholders  
**Impact**: All sensitive production data has been removed from the repository

### What Was Secured:

- ✅ Supabase API keys (publishable and secret)
- ✅ Database connection strings with embedded passwords
- ✅ JWT secrets
- ✅ Third-party API keys (Resend)
- ✅ FastAPI secret keys

---

## 🔒 Environment Security Best Practices

### 1. Development vs Production Separation

**Development Environment (.env.local)**:

```bash
# Safe placeholder values for development
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-publishable-api-key-here
SUPABASE_SERVICE_ROLE_KEY=your-secret-api-key-here
```

**Production Environment**:

- Use proper secret management services (AWS Secrets Manager, Azure Key Vault, etc.)
- Never store production secrets in code repositories
- Use environment-specific deployment configurations

### 2. File Security Checklist

#### ✅ Secure Files (.gitignore protected):

- `.env.local` - Local development secrets
- `.env.production` - Production secrets (if used locally)
- Any files with real API keys or passwords

#### ⚠️ Safe for Repository:

- `.env.example` - Template file with placeholders only
- Configuration files with no actual secrets

### 3. Secret Management Hierarchy

**Priority 1 - Critical Secrets (Never in repos)**:

- Database passwords
- Service role keys
- JWT secrets
- Third-party API keys
- Encryption keys

**Priority 2 - Configuration (Safe with placeholders)**:

- Database hostnames
- Service URLs
- Port numbers
- Feature flags

---

## 🛠️ Setting Up Your Development Environment

### Step 1: Copy Template

```bash
cp .env.example .env.local
```

### Step 2: Replace Placeholders

Edit `.env.local` and replace these placeholders with your actual values:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-secret-key

# Database
DATABASE_URL=postgresql+asyncpg://postgres:your-actual-password@your-actual-host:5432/postgres

# API Keys
RESEND_API=your-actual-resend-key
```

### Step 3: Verify Security

```bash
# Check that .env.local is ignored
git status
# Should not show .env.local as changed/new

# Verify no secrets in example
grep -E "(secret|key|password)" .env.example
# Should only show placeholder values
```

---

## 🔐 Production Deployment Security

### 1. Secret Management Services

**AWS Deployment**:

```bash
# Use AWS Secrets Manager
aws secretsmanager get-secret-value --secret-id lifo-ai-engine/supabase

# Or use environment variables in ECS/Lambda
export SUPABASE_SERVICE_ROLE_KEY="${AWS_SECRET_VALUE}"
```

**Docker Deployment**:

```dockerfile
# Use Docker secrets
COPY secrets/supabase_key /run/secrets/supabase_key
ENV SUPABASE_SERVICE_ROLE_KEY_FILE=/run/secrets/supabase_key
```

**Kubernetes Deployment**:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: lifo-secrets
data:
  supabase-service-role-key: <base64-encoded-key>
```

### 2. Environment-Specific Configuration

**Development**:

- Use `.env.local` with safe development credentials
- Enable debug logging and development features
- Use localhost URLs and development databases

**Staging**:

- Use staging-specific secrets
- Mirror production security but with staging data
- Test secret rotation and deployment procedures

**Production**:

- Use proper secret management services
- Enable security monitoring and alerting
- Implement secret rotation policies
- Use production-grade authentication

---

## 🚨 Security Incident Response

### If Secrets Are Accidentally Committed:

1. **Immediate Action**:

   ```bash
   # Remove from git history (if just committed)
   git reset --hard HEAD~1

   # Or if already pushed
   git filter-branch --force --index-filter \
   'git rm --cached --ignore-unmatch .env.local' \
   --prune-empty --tag-name-filter cat -- --all
   ```

2. **Rotate All Affected Secrets**:

   - Generate new Supabase API keys
   - Update database passwords
   - Replace all exposed API keys
   - Update production deployments

3. **Verify Security**:
   - Check git history for any traces
   - Audit access logs for unauthorized usage
   - Monitor for suspicious activity

### Security Monitoring

**Regular Audits**:

```bash
# Check for accidentally committed secrets
git log --all --full-history -- .env.local

# Scan for potential secret patterns
grep -r "sk_live_\|pk_live_\|eyJ" . --exclude-dir=node_modules
```

---

## 📋 Security Checklist

### Development Setup:

- [ ] `.env.local` contains only development values
- [ ] `.env.local` is in `.gitignore`
- [ ] `.env.example` contains only placeholders
- [ ] No production secrets in any committed files
- [ ] Local development uses secure generated keys

### Production Deployment:

- [ ] Secrets managed through proper secret management service
- [ ] Environment variables set securely in deployment platform
- [ ] No secrets in container images or deployment files
- [ ] Secret rotation procedures documented and tested
- [ ] Security monitoring and alerting enabled

### Code Repository:

- [ ] No committed `.env.local` files
- [ ] Git history clean of secret exposure
- [ ] `.gitignore` properly configured
- [ ] Security documentation up to date
- [ ] Team trained on security practices

---

## 🔧 Development Tools

### Generate Secure Random Keys:

```bash
# For FastAPI SECRET_KEY
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_urlsafe(32))"

# For API keys
python3 -c "import secrets; print('API_KEY=' + secrets.token_urlsafe(32))"

# For JWT secrets
openssl rand -base64 64
```

### Validate Environment Security:

```bash
# Check for exposed secrets
./scripts/check-secrets.sh

# Validate environment configuration
./scripts/validate-env.sh
```

---

## 📞 Security Contact

If you discover a security vulnerability or accidentally expose secrets:

1. **Immediate**: Remove/rotate the exposed secrets
2. **Report**: Document the incident and actions taken
3. **Review**: Audit access logs and monitor for abuse
4. **Improve**: Update procedures to prevent future incidents

---

**Remember**: Security is everyone's responsibility. When in doubt, treat data as sensitive and follow the principle of least privilege.
