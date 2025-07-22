# 🔒 LIFO API Security Implementation Guide

## Overview

This document outlines the comprehensive security measures implemented in the LIFO.AI FastAPI microservice and lifo_ai_core components following a thorough security audit and remediation process.

> 📚 **Development Setup**: This project uses modern Python tooling with uv + ruff. See [PYTHON_DEVELOPMENT.md](../PYTHON_DEVELOPMENT.md) for complete setup instructions.

## 🚨 Security Audit Summary

### Critical Vulnerabilities Resolved

1. **Hardcoded Credentials** - FIXED ✅

   - Removed all hardcoded database credentials from version control
   - Updated `.env.example` files with secure placeholder values
   - Added security warnings about credential management

2. **JWT Secret Exposure** - FIXED ✅

   - Implemented secure logging that masks sensitive authentication data
   - Added environment-based credential disclosure controls
   - Enhanced security event logging

3. **Authentication Bypass** - FIXED ✅

   - Fixed JWT algorithm confusion vulnerabilities
   - Implemented constant-time token comparison
   - Enforced proper signature verification

4. **File Upload Security** - FIXED ✅

   - Added comprehensive file content validation
   - Implemented magic number verification for uploaded files
   - Added executable and malicious content detection

5. **SQL Injection Prevention** - FIXED ✅
   - Enhanced parameterized query validation
   - Added dangerous SQL pattern detection
   - Implemented secure database operation wrappers

## 🛡️ Security Architecture

### Authentication & Authorization

#### JWT Token Security

```python
# Secure JWT configuration in app/auth/supabase_jwt.py
class SupabaseAuth:
    def __init__(self):
        # JWT algorithm - enforce HS256 only for security
        self.algorithms = ["HS256"]
        # Secure secret loading with validation
        self.jwt_secret = self._load_jwt_secret()
```

#### Constant-Time Comparison

```python
# Prevent timing attacks in authentication
import hmac
if hmac.compare_digest(token, settings.supabase_service_role_key):
    return True
```

#### Role-Based Access Control

- **Service Role**: Administrative operations only
- **Authenticated Users**: Store-specific access with validation
- **Anonymous**: Read-only public endpoints only

### Input Validation & Sanitization

#### UUID Validation

```python
def validate_store_id_format(store_id: str) -> str:
    """Validate store ID format and return sanitized value"""
    if not store_id:
        raise HTTPException(status_code=400, detail="Store ID is required")

    store_id = store_id.strip()
    try:
        uuid_obj = uuid.UUID(store_id)
        return str(uuid_obj)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid store ID format")
```

#### String Sanitization

```python
def sanitize_string_input(value: str, max_length: int = 255, field_name: str = "field") -> str:
    """Sanitize string input to prevent injection attacks"""
    # Remove control characters except newlines and tabs
    value = ''.join(char for char in value if ord(char) >= 32 or char in '\n\t')

    # Check for dangerous patterns
    dangerous_patterns = [
        r'<script', r'javascript:', r'vbscript:', r'onload=', r'onerror=',
        r'<iframe', r'<object', r'<embed', r'<link', r'<meta'
    ]
```

### File Upload Security

#### Content Validation

```python
def _validate_csv_content(self, content: bytes) -> None:
    """Validate that file content is actually CSV data"""
    # Check for executable content indicators
    dangerous_headers = [
        b'MZ',  # Windows executable
        b'\x7fELF',  # Linux executable
        b'\x89PNG',  # PNG image
        b'PK\x03\x04',  # ZIP archive
    ]
    for header in dangerous_headers:
        if content.startswith(header):
            raise HTTPException(status_code=400, detail="File appears to be binary data, not CSV")
```

#### File Size and Type Restrictions

- Maximum file size: 10MB
- Allowed file types: CSV only
- Content type validation beyond file extensions
- Magic number verification for file integrity

### Rate Limiting & DDoS Protection

#### Adaptive Rate Limiting

```python
# Production rate limits in app/middleware/rate_limiting.py
PRODUCTION_RATE_LIMITS = {
    "csv_upload": "3/hour",          # CSV uploads are resource intensive
    "scoring_batch": "15/minute",    # Batch scoring operations
    "analytics_dashboard": "30/minute",  # Dashboard analytics
    "ai_suggestions": "20/minute",   # AI-powered suggestions
}
```

#### Security Rate Limiter

```python
class SecurityRateLimiter:
    """Advanced rate limiter with security features"""

    def record_failed_attempt(self, client_ip: str, endpoint: str):
        """Record failed authentication/validation attempt"""
        # Block IP if too many failed attempts
        if len(self.failed_attempts[client_ip]) >= 10:
            self.blocked_ips.add(client_ip)
```

### Database Security

#### SQL Injection Prevention

```python
async def execute_safe_query(self, query: str, params: dict = None):
    """Execute parameterized SQL query with security validation"""
    # Security validation: ensure query uses parameterized format
    if params and not all(f":{param}" in query for param in params.keys()):
        raise ValueError("Query must use parameterized format (:param_name)")

    # Block dangerous SQL patterns
    dangerous_patterns = [r'\bDROP\b', r'\bUNION\b.*\bSELECT\b', r'--', r'/\*']
    for pattern in dangerous_patterns:
        if re.search(pattern, query.upper(), re.IGNORECASE):
            raise ValueError("Query contains potentially unsafe SQL patterns")
```

### Error Handling & Information Disclosure

#### Secure Error Responses

```python
async def general_exception_handler(request: Request, exc: Exception):
    """Handle all other exceptions with secure error messages"""

    # Generate unique error ID for tracking
    error_id = str(uuid.uuid4())[:8]

    # Return sanitized error response
    error_response = {
        "success": False,
        "error": "Internal server error",
        "error_code": "InternalServerError",
        "error_id": error_id,
        "timestamp": datetime.utcnow().isoformat()
    }

    # Only include detailed error in development
    if is_development:
        error_response["debug_info"] = {
            "exception_type": type(exc).__name__,
            "path": request.url.path,
            "message": "Check logs for details"
        }
```

## 🔧 Configuration & Deployment

### Environment Variables Security

#### Development Environment

```env
# .env.local - NEVER COMMIT THIS FILE
# SECURITY WARNING: Replace all placeholder values with actual credentials

SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=your-jwt-secret-key-here

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_STORAGE=memory://

# Security Headers
SECURITY_HEADERS_ENABLED=true
```

#### Production Environment

```env
# Production security configuration
ENVIRONMENT=production
LOG_LEVEL=WARNING
DEBUG=false

# Strict CORS policy
CORS_ORIGINS=https://yourdomain.com

# Production rate limits
RATE_LIMIT_STORAGE=redis://redis-server:6379

# Security headers
CSP_POLICY=default-src 'self'
HSTS_MAX_AGE=31536000
```

### Security Headers Middleware

```python
# Security headers implementation
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)

    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response
```

## 🚀 Security Best Practices

### Development Guidelines

1. **Never Commit Secrets**

   - Use `.env.local` for development credentials
   - Add `.env` files to `.gitignore`
   - Use placeholder values in `.env.example`

2. **Input Validation**

   - Validate all user inputs at the API boundary
   - Use Pydantic models for request validation
   - Sanitize string inputs to prevent injection

3. **Authentication**

   - Use secure JWT tokens with proper algorithm restrictions
   - Implement constant-time comparison for sensitive operations
   - Log authentication events for security monitoring

4. **File Handling**
   - Validate file content, not just extensions
   - Check magic numbers for file type verification
   - Implement file size and type restrictions

### Production Deployment

1. **Environment Isolation**

   ```bash
   # Production deployment checklist
   export ENVIRONMENT=production
   export DEBUG=false
   export LOG_LEVEL=WARNING
   ```

2. **Database Security**

   - Use connection pooling with limits
   - Enable SSL/TLS for database connections
   - Implement database-level access controls

3. **Monitoring & Alerting**
   - Enable security event logging
   - Monitor for rate limit violations
   - Set up alerts for authentication failures

## 📊 Security Monitoring

### Security Event Logging

```python
# Security events are logged with structured data
logger.warning(
    "Rate limit exceeded - potential abuse",
    client_ip=client_ip,
    endpoint=str(request.url.path),
    method=request.method,
    user_agent=request.headers.get("user-agent", "unknown"),
    limit=exc.detail,
    retry_after=exc.retry_after
)
```

### Key Metrics to Monitor

- **Authentication Failures**: Failed login attempts per IP
- **Rate Limit Violations**: Excessive requests indicating abuse
- **File Upload Anomalies**: Large files or suspicious content
- **SQL Injection Attempts**: Dangerous patterns in queries
- **Error Rates**: Unusual error patterns indicating attacks

## 🔍 Security Testing

### Automated Security Tests

**Modern testing with uv + ruff security checks**

Run security tests regularly:

```bash
# Security test suite with uv
uv run pytest tests/security/ -v

# Specific security test categories
uv run pytest tests/security/test_auth_edge_cases.py
uv run pytest tests/security/test_csv_vulnerabilities.py
uv run pytest tests/security/test_cors_network_vulnerabilities.py

# Run security-focused linting with ruff
uv run ruff check --select=S .     # Bandit security rules via ruff

# Complete security check workflow
make test                          # All tests including security
make quality                       # Code quality + security linting
```

### Manual Security Verification

1. **Authentication Testing**

   - Test JWT token validation
   - Verify role-based access controls
   - Check for authentication bypass vulnerabilities

2. **Input Validation Testing**

   - Test with malicious payloads
   - Verify SQL injection prevention
   - Check file upload restrictions

3. **Rate Limiting Testing**
   - Verify rate limits are enforced
   - Test IP blocking functionality
   - Check rate limit headers

## 🎯 Security Compliance

### Data Protection

- **GDPR Compliance**: Secure handling of user data
- **Data Minimization**: Only collect necessary information
- **Encryption**: Sensitive data encrypted in transit and at rest
- **Access Controls**: Role-based permissions with audit logging

### Industry Standards

- **OWASP Top 10**: Protection against common web vulnerabilities
- **ISO 27001**: Information security management best practices
- **SOC 2**: Security, availability, and confidentiality controls

## 📝 Incident Response

### Security Incident Procedure

1. **Detection**: Monitor security events and alerts
2. **Assessment**: Evaluate the scope and impact
3. **Containment**: Isolate affected systems
4. **Investigation**: Analyze logs and determine root cause
5. **Recovery**: Restore services and implement fixes
6. **Documentation**: Record lessons learned and improve security

### Emergency Contacts

- **Security Team**: security@lifoai.com
- **Infrastructure Team**: infra@lifoai.com
- **On-Call Engineer**: +31-XXX-XXXX-XXX

---

**Security is an ongoing process. This document should be reviewed and updated regularly as new threats emerge and security measures evolve.**
