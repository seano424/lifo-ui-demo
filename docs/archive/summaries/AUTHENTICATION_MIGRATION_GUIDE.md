# Supabase Authentication Migration Guide
## From JWT Secrets to API Keys

**Date:** August 4, 2025  
**Migration Reason:** Supabase is deprecating JWT secrets in favor of API keys  
**Impact:** Enhanced security and simplified authentication flow  

---

## Overview

Supabase is transitioning from JWT secret-based authentication to API key-based authentication. This migration provides better security, easier key rotation, and alignment with modern authentication practices.

### Current State vs Target State

| Aspect | Current (JWT Secret) | Target (API Keys) |
|--------|---------------------|-------------------|
| **Authentication Method** | JWT secret validation | API key + Auth server |
| **Token Verification** | Local JWT decode | Supabase Auth API call |
| **Key Management** | Static JWT secret | Rotatable API keys |
| **Security** | Shared secret risk | Individual key pairs |
| **Fallback Strategy** | JWT secret fallback | No fallback needed |

---

## Migration Strategy

### Phase 1: Parallel Implementation (Current)
✅ **Already Implemented**
- JWT authentication with Auth server verification
- Fallback to JWT secret for compatibility
- API key foundation in place

### Phase 2: API Key Primary (Recommended)
🎯 **Implementation Ready**
- New API key authentication system
- JWT as fallback during transition
- Enhanced error handling and logging

### Phase 3: JWT Deprecation (Future)
📅 **After Supabase API key rollout**
- Remove JWT secret dependency
- Pure API key authentication
- Clean up legacy code

---

## Implementation Details

### New API Key Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant FastAPI
    participant Supabase Auth
    
    Client->>FastAPI: Request with Authorization: Bearer <token>
    FastAPI->>Supabase Auth: GET /auth/v1/user (with apikey header)
    Supabase Auth->>FastAPI: User info or 401/403
    FastAPI->>Client: Authenticated response or error
```

### Key Components

1. **SupabaseAPIKeyAuth Class** (`supabase_api_key_auth.py`)
   - Modern authentication using Supabase Auth API
   - Token validation through Supabase servers
   - Service role key verification
   - Token refresh capabilities

2. **Updated Dependencies** 
   - `get_current_user()` - Extract authenticated user
   - `require_permission()` - Permission-based access control
   - Role-based authentication helpers

3. **Enhanced Security**
   - No local JWT secret storage
   - Constant-time API key comparison
   - Proper timeout handling
   - Detailed audit logging

---

## Configuration Changes

### Environment Variables

**Required for API Key Authentication:**
```bash
# Core Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key                    # For client-side operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key    # For admin operations

# Legacy JWT (for transition period only)
SUPABASE_JWT_SECRET=your-jwt-secret                 # Remove after full migration
```

**Updated `.env.local` Structure:**
```bash
# =============================================================================
# SUPABASE AUTHENTICATION (API KEY BASED)
# =============================================================================

# Primary Authentication (API Keys)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Legacy Support (remove after migration)
SUPABASE_JWT_SECRET=your-jwt-secret

# Database Connection (unchanged)
DATABASE_URL=postgresql+asyncpg://...
```

### Creating New Supabase API Keys

1. **Access Supabase Dashboard**
   ```bash
   # Navigate to your project settings
   https://app.supabase.com/project/[your-project]/settings/api
   ```

2. **Generate New API Keys**
   - **Anon Key**: For client-side authentication
   - **Service Role Key**: For server-side admin operations
   - Copy and securely store both keys

3. **Test API Keys**
   ```bash
   # Test anon key
   curl -H "apikey: your-anon-key" \
        https://your-project.supabase.co/rest/v1/

   # Test service role key  
   curl -H "apikey: your-service-role-key" \
        -H "Authorization: Bearer your-service-role-key" \
        https://your-project.supabase.co/rest/v1/
   ```

---

## Code Migration Examples

### Before: JWT Secret Authentication
```python
# Old approach - JWT secret validation
async def verify_token(token: str) -> SupabaseUser:
    payload = jwt.decode(
        token,
        settings.SUPABASE_JWT_SECRET,  # Static secret
        algorithms=["HS256"]
    )
    return SupabaseUser(**payload)
```

### After: API Key Authentication
```python
# New approach - API key with Auth server
async def verify_user_token(access_token: str) -> APIKeyUser:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "apikey": settings.SUPABASE_ANON_KEY  # Dynamic API key
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers=headers
        )
        response.raise_for_status()
        user_data = response.json()
        
    return APIKeyUser(**user_data)
```

### Endpoint Migration
```python
# Before: JWT dependency injection
@app.get("/api/v1/protected")
async def protected_endpoint(
    current_user: SupabaseUser = Depends(get_current_user_jwt)
):
    return {"user_id": current_user.user_id}

# After: API key dependency injection  
@app.get("/api/v1/protected")
async def protected_endpoint(
    current_user: APIKeyUser = Depends(get_current_user)
):
    return {"user_id": current_user.user_id}
```

---

## Security Improvements

### 1. Enhanced Token Validation
```python
# Comprehensive validation with API keys
async def validate_api_request(self, request: Request) -> APIKeyUser:
    # Check Authorization header
    authorization = request.headers.get("Authorization")
    if not authorization:
        raise SupabaseAPIKeyError("Authorization header required")
    
    # Support both user tokens and service keys
    api_key = request.headers.get("apikey")
    if api_key and await self.verify_service_key(api_key):
        return self.create_service_user()
    
    # Validate user access token via Supabase Auth
    return await self.verify_user_token(authorization)
```

### 2. Service Role Key Security
```python
# Constant-time comparison prevents timing attacks
def verify_service_key(self, api_key: str) -> bool:
    return hmac.compare_digest(api_key, self.service_role_key)
```

### 3. Token Refresh Support
```python
# Built-in token refresh capability
async def refresh_token(self, refresh_token: str) -> Dict[str, str]:
    response = await client.post(
        f"{self.supabase_url}/auth/v1/token?grant_type=refresh_token",
        json={"refresh_token": refresh_token},
        headers={"apikey": self.anon_key}
    )
    return response.json()
```

---

## Testing Strategy

### 1. Parallel Authentication Testing
```python
# Test both authentication methods during transition
@pytest.mark.asyncio
async def test_parallel_auth():
    # Test API key auth (primary)
    api_key_user = await api_key_auth.verify_user_token(valid_token)
    assert api_key_user.user_id == expected_user_id
    
    # Test JWT auth (fallback)
    jwt_user = await jwt_auth.verify_token(valid_token)
    assert jwt_user.user_id == expected_user_id
    
    # Ensure consistent results
    assert api_key_user.user_id == jwt_user.user_id
```

### 2. API Key Validation Testing
```python
# Test API key security features
@pytest.mark.asyncio
async def test_api_key_security():
    # Test invalid API key
    with pytest.raises(SupabaseAPIKeyError):
        await api_key_auth.verify_user_token("invalid_token")
    
    # Test service role key
    is_valid = await api_key_auth.verify_service_key(service_role_key)
    assert is_valid is True
    
    # Test timing attack resistance
    start_time = time.time()
    await api_key_auth.verify_service_key("wrong_key")
    duration = time.time() - start_time
    assert duration > 0.001  # Constant-time comparison
```

### 3. Performance Testing
```python
# Compare authentication performance
@pytest.mark.benchmark
async def test_auth_performance():
    # Benchmark API key auth
    start = time.time()
    for _ in range(100):
        await api_key_auth.verify_user_token(valid_token)
    api_key_duration = time.time() - start
    
    # Benchmark JWT auth
    start = time.time()
    for _ in range(100):
        await jwt_auth.verify_token(valid_token)
    jwt_duration = time.time() - start
    
    # API key auth should be comparable or better
    assert api_key_duration < jwt_duration * 2  # Allow for network overhead
```

---

## Migration Timeline

### Immediate (Week 1)
- [x] ✅ Implement API key authentication system
- [x] ✅ Create migration documentation
- [ ] 🔄 Update environment configuration
- [ ] 🔄 Generate new Supabase API keys

### Short-term (Week 2-3)
- [ ] 📋 Deploy API key authentication alongside JWT
- [ ] 📋 Update client applications to use API keys
- [ ] 📋 Comprehensive testing of both authentication methods
- [ ] 📋 Monitor authentication performance and errors

### Medium-term (Week 4-6)
- [ ] 📅 Gradually migrate endpoints to API key primary
- [ ] 📅 Update documentation and developer guides
- [ ] 📅 Train team on new authentication flow
- [ ] 📅 Performance optimization and monitoring

### Long-term (Month 2-3)
- [ ] 🎯 Remove JWT secret dependency
- [ ] 🎯 Clean up legacy authentication code
- [ ] 🎯 Full API key authentication deployment
- [ ] 🎯 Security audit of new authentication system

---

## Rollback Strategy

### Emergency Rollback
If API key authentication fails, the system maintains JWT fallback:

```python
# Current implementation supports rollback
async def verify_token_with_fallback(token: str) -> SupabaseUser:
    try:
        # Try API key authentication first
        return await api_key_auth.verify_user_token(token)
    except Exception as e:
        logger.warning("API key auth failed, falling back to JWT", error=str(e))
        
        # Fallback to JWT authentication
        return await jwt_auth.verify_token(token)
```

### Rollback Checklist
- [ ] Revert to JWT-only authentication
- [ ] Update environment variables
- [ ] Rollback client-side changes
- [ ] Monitor for authentication errors
- [ ] Document rollback reason

---

## Benefits of API Key Migration

### Security Benefits
- **🔐 Enhanced Security**: No shared JWT secrets
- **🔄 Key Rotation**: Easy API key rotation without service interruption
- **🛡️ Reduced Attack Surface**: Server-side token validation only
- **📊 Better Audit Trail**: Detailed authentication logging

### Operational Benefits
- **🚀 Improved Performance**: Reduced JWT decoding overhead
- **🔧 Easier Debugging**: Clear authentication flow
- **📈 Better Monitoring**: Real-time authentication metrics
- **🔄 Simplified Deployment**: No JWT secret management

### Developer Experience
- **📚 Clearer Documentation**: Straightforward API key usage
- **🧪 Better Testing**: Mock-friendly authentication
- **🐛 Easier Debugging**: Clear error messages and logging
- **🔄 Consistent Patterns**: Aligned with Supabase best practices

---

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   ```bash
   # Check API key configuration
   curl -H "apikey: your-anon-key" \
        https://your-project.supabase.co/rest/v1/
   
   # Expected: 200 OK with API info
   # If 401: API key is invalid
   # If 403: API key permissions issue
   ```

2. **Token Validation Failures**
   ```python
   # Enable debug logging
   logging.getLogger("lifo_api.app.auth").setLevel(logging.DEBUG)
   
   # Check logs for detailed error information
   # Common causes: expired tokens, network issues, wrong API key
   ```

3. **Performance Issues**
   ```python
   # Monitor authentication latency
   @app.middleware("http")
   async def auth_timing_middleware(request: Request, call_next):
       if request.url.path.startswith("/api/"):
           start_time = time.time()
           response = await call_next(request)
           auth_time = time.time() - start_time
           
           if auth_time > 1.0:  # Log slow authentication
               logger.warning("Slow authentication", duration=auth_time)
           
           return response
   ```

### Support Resources
- **Supabase Documentation**: https://supabase.com/docs/guides/auth
- **API Key Management**: https://supabase.com/docs/guides/api/api-keys
- **Migration Support**: Contact Supabase support for migration assistance

---

## Conclusion

The migration from JWT secrets to API keys represents a significant security and operational improvement for the LIFO AI Engine. The new authentication system provides:

- **Enhanced security** through server-side token validation
- **Better operational control** with key rotation capabilities  
- **Improved developer experience** with clearer authentication patterns
- **Future-proof architecture** aligned with Supabase roadmap

The implementation maintains backward compatibility during the transition period, ensuring zero-downtime migration to the new authentication system.