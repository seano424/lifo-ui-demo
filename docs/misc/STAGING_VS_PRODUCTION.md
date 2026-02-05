# Staging vs Production Deployment Guide

## 🎯 **The Correct Approach for Development Testing**

You're absolutely right to ask about staging! Here's the **recommended multi-environment deployment strategy**:

## 📋 **Environment Strategy**

### 1. **STAGING Environment** (Test Your Development)
- **Purpose**: Test performance optimizations and new features
- **Branch**: `staging` 
- **URL**: `https://lifo-ai-api-staging-<id>.ondigitalocean.app`
- **Database**: Separate staging database
- **Resources**: Minimal (cost-effective testing)
- **CORS**: Permissive (includes localhost for development)

### 2. **PRODUCTION Environment** (Live Application)  
- **Purpose**: Serve real users
- **Branch**: `main`
- **URL**: `https://lifo-ai-api-<id>.ondigitalocean.app`  
- **Database**: Production database
- **Resources**: Optimized for performance
- **CORS**: Restricted to production domains only

## 🚀 **Deployment Workflow**

### **Step 1: Deploy Staging**
```bash
# Deploy to staging for testing
.do/deploy-multi.sh --env staging create

# Test your performance improvements
curl https://lifo-ai-api-staging-<id>.ondigitalocean.app/api/v1/health
```

### **Step 2: Test & Validate**
- Test CSV upload with 25x performance improvements
- Verify bulk operations work correctly
- Test frontend integration
- Validate database migrations

### **Step 3: Deploy Production** 
```bash
# After staging tests pass, deploy to production
.do/deploy-multi.sh --env production create
```

## 🔧 **Key Differences**

| Feature | Staging | Production |
|---------|---------|------------|
| **Workers** | 1 (minimal) | 2-4 (optimized) |
| **Debug** | Enabled | Disabled |
| **Logging** | Verbose | Minimal |
| **CORS** | Localhost + staging domains | Production domains only |
| **Database** | Staging database | Production database |
| **Cost** | ~$5/month | ~$12+/month |
| **Auto-deploy** | On `staging` branch push | On `main` branch push |

## 📊 **Configuration Files**

- **`.do/staging.yaml`** - Staging environment configuration
- **`.do/app.yaml`** - Production environment configuration  
- **`.env.staging.example`** - Staging environment variables
- **`.env.production.example`** - Production environment variables

## 🎯 **Best Practices**

### **Development Flow**
1. **Develop** → Push to `staging` branch
2. **Auto-deploy** to staging environment  
3. **Test** performance and features
4. **Merge** `staging` → `main` 
5. **Auto-deploy** to production

### **Database Strategy**
- **Staging**: Separate database with test data
- **Production**: Live database with real data
- **Migrations**: Test in staging first, then production

### **Frontend Configuration**
```typescript
// frontend config
const API_BASE_URL = {
  development: 'http://localhost:8000',
  staging: 'https://lifo-ai-api-staging-<id>.ondigitalocean.app',
  production: 'https://lifo-ai-api-<id>.ondigitalocean.app'
}
```

## 🛠️ **Management Commands**

```bash
# Check both environments
.do/deploy-multi.sh --env staging status
.do/deploy-multi.sh --env production status

# View staging logs
.do/deploy-multi.sh --env staging logs

# Update staging  
.do/deploy-multi.sh --env staging update

# Update production
.do/deploy-multi.sh --env production update

# Compare environments
.do/deploy-multi.sh compare
```

## 💡 **Why This Approach?**

1. **Risk Mitigation**: Test changes before they hit production
2. **Performance Validation**: Verify 25x improvements work in cloud environment  
3. **Integration Testing**: Test frontend-backend integration
4. **Cost Control**: Staging uses minimal resources
5. **Confidence**: Deploy to production with confidence after staging validation

## ⚡ **Quick Start**

```bash
# 1. Deploy staging first
.do/deploy-multi.sh --env staging check
.do/deploy-multi.sh --env staging create

# 2. Test your API
curl https://lifo-ai-api-staging-<id>.ondigitalocean.app/docs

# 3. Test CSV performance improvements
# Use test_performance.py with staging URL

# 4. When ready, deploy production
.do/deploy-multi.sh --env production create
```

This approach gives you a **safe testing environment** to validate your performance optimizations before they go live!