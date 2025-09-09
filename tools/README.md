# LIFO AI JWT Token Extraction Tools

A comprehensive suite of tools for automatically extracting JWT tokens from various sources to make API testing even more convenient. Perfect for lazy developers who want authentication to "just work"! 🚀

## 🎯 Overview

These tools solve the common problem of constantly having to manually copy JWT tokens for API testing. They automatically detect and extract valid tokens from multiple sources with intelligent fallbacks.

## 🛠️ Tools Included

### 1. `jwt_extractor.py` - The Core Engine
The main Python script that handles all token extraction logic.

**Features:**
- 🔍 **Multiple extraction sources** with smart fallbacks
- 🌐 **Browser storage** extraction (localStorage/sessionStorage)
- 🍪 **Cookie extraction** from Chrome/Firefox  
- 🔐 **Supabase programmatic auth** with refresh tokens
- 📜 **Development log parsing** for token discovery
- 🌍 **Environment variable** detection
- ✅ **Token validation** and expiry checking
- 💾 **Intelligent caching** for reuse
- 🎨 **Rich terminal output** with progress indicators

### 2. `get_jwt.sh` - Quick Access Wrapper
A user-friendly bash wrapper for common use cases.

### 3. `test_api_with_auto_auth.py` - Enhanced API Testing
Combines token extraction with comprehensive API testing.

## 🚀 Quick Start

### Install Dependencies

```bash
# Install required Python packages
pip install httpx pyjwt rich

# Or use the built-in installer
./tools/get_jwt.sh --install-deps
```

### Basic Usage

```bash
# Auto-extract token (tries all sources)
python tools/jwt_extractor.py

# Quick bash wrapper - just get the token
./tools/get_jwt.sh

# Interactive login if no tokens found
python tools/jwt_extractor.py --interactive

# Test API with auto-authentication
python tools/test_api_with_auto_auth.py
```

## 📋 Detailed Usage

### JWT Extractor (`jwt_extractor.py`)

```bash
# Auto-detect and extract best token
python tools/jwt_extractor.py

# Interactive login mode
python tools/jwt_extractor.py --interactive

# Force refresh (skip cache)
python tools/jwt_extractor.py --refresh

# Validate a specific token
python tools/jwt_extractor.py --validate "your.jwt.token"

# List available sources
python tools/jwt_extractor.py --list-sources

# Different output formats
python tools/jwt_extractor.py --output json
python tools/jwt_extractor.py --output env
python tools/jwt_extractor.py --output token  # default
```

### Bash Wrapper (`get_jwt.sh`)

```bash
# Basic extraction
./tools/get_jwt.sh

# Interactive mode
./tools/get_jwt.sh -i

# Quiet mode (just the token)
./tools/get_jwt.sh -q

# Export as environment variables
./tools/get_jwt.sh -e

# Test the extracted token
./tools/get_jwt.sh -t

# Use in other commands
curl -H "Authorization: Bearer $(./tools/get_jwt.sh -q)" http://localhost:8000/api/v1/health

# Save to variable
TOKEN=$(./tools/get_jwt.sh -q)

# Source environment variables
source <(./tools/get_jwt.sh -e)
```

### API Testing (`test_api_with_auto_auth.py`)

```bash
# Test all endpoints with auto-extracted token
python tools/test_api_with_auto_auth.py

# Interactive login and test
python tools/test_api_with_auto_auth.py --interactive

# Test specific endpoints
python tools/test_api_with_auto_auth.py --endpoints health,stores,analytics

# Use specific token
python tools/test_api_with_auto_auth.py --token "your.jwt.token"

# Save results to file
python tools/test_api_with_auto_auth.py --save-results results.json

# JSON output
python tools/test_api_with_auto_auth.py --output json
```

## 🔍 Token Sources (In Priority Order)

1. **💾 Cached Tokens** - Previously saved valid tokens
2. **🌍 Environment Variables** - JWT_TOKEN, ACCESS_TOKEN, etc.
3. **🌐 Browser Storage** - localStorage/sessionStorage from Chrome/Firefox
4. **🍪 Browser Cookies** - JWT tokens stored in cookies
5. **🔐 Supabase Authentication** - Programmatic login/refresh
6. **📜 Development Logs** - Parsing server logs for tokens

## ⚙️ Configuration

The tools automatically detect configuration from:
- Environment variables
- `.env.local` files
- `.env` files in project root and `lifo_api/`

### Key Environment Variables

```bash
# Supabase Configuration (Required for auth)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# API Configuration
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8000

# Environment Detection
ENVIRONMENT=development  # development, staging, production
```

## 🎨 Rich Terminal Output

The tools provide beautiful, informative output:
- 🎯 **Progress indicators** for multi-step operations
- 📊 **Detailed tables** for token analysis and API results
- 🎨 **Color-coded status** messages
- 📋 **Token validation** with expiry and signature checking
- 🔍 **JWT payload inspection**

## 🔐 Security Features

- **Secure token storage** with proper file permissions (600)
- **Token expiry checking** to avoid using expired tokens
- **Signature validation** when JWT secrets are available
- **No hardcoded credentials** - all from environment/config
- **Automatic cleanup** of temporary files

## 🤖 Integration Examples

### With curl

```bash
# Basic API call
curl -H "Authorization: Bearer $(./tools/get_jwt.sh -q)" \
     http://localhost:8000/api/v1/health

# Store token for multiple calls
export JWT_TOKEN=$(./tools/get_jwt.sh -q)
curl -H "Authorization: Bearer $JWT_TOKEN" http://localhost:8000/api/v1/stores
```

### In Scripts

```bash
#!/bin/bash
# Load JWT token
source <(./tools/get_jwt.sh -e)

# Now use $JWT_TOKEN or $BEARER_TOKEN
echo "Using token: $JWT_TOKEN"

# Or get token directly
TOKEN=$(./tools/get_jwt.sh -q)
```

### Python Integration

```python
import subprocess
import json

# Get token via subprocess
result = subprocess.run(['./tools/get_jwt.sh', '-q'], capture_output=True, text=True)
token = result.stdout.strip()

# Or use the extractor directly
from tools.jwt_extractor import JWTExtractor
extractor = JWTExtractor()
token = await extractor.extract_best_token()
```

## 🛠️ Development Workflow

### For API Development

```bash
# 1. Start your API server
npm run api:dev

# 2. Login to the frontend in browser
npm run dev

# 3. Test API with auto-extracted token
python tools/test_api_with_auto_auth.py

# 4. Use token in curl/postman
./tools/get_jwt.sh -q
```

### For CI/CD

```bash
# In CI environment with stored credentials
python tools/jwt_extractor.py --interactive --quiet > jwt_token.txt
export JWT_TOKEN=$(cat jwt_token.txt)

# Run tests
python tools/test_api_with_auto_auth.py --output json > test_results.json
```

## 🔧 Troubleshooting

### No Tokens Found

```bash
# Try interactive login
python tools/jwt_extractor.py --interactive

# Check available sources
python tools/jwt_extractor.py --list-sources

# Verify configuration
cat .env.local | grep SUPABASE
```

### Token Invalid

```bash
# Validate token
python tools/jwt_extractor.py --validate "your.token.here"

# Force refresh
python tools/jwt_extractor.py --refresh

# Clear cache
rm ~/.lifo_jwt_cache.json
```

### Browser Storage Issues

```bash
# Try different browsers
# Chrome: ~/.config/google-chrome/Default/
# Firefox: ~/.mozilla/firefox/

# Or use interactive login instead
./tools/get_jwt.sh -i
```

## 📁 File Locations

The tools create several files for caching and persistence:

- `~/.lifo_jwt_cache.json` - Token cache
- `~/.lifo_jwt_credentials.json` - Stored credentials  
- `~/.lifo_jwt_session.json` - Session data
- `~/.lifo_current_token` - Last extracted token

All files have secure permissions (600).

## 🎯 Advanced Usage

### Custom Token Sources

You can extend the `jwt_extractor.py` to add custom token sources by subclassing `TokenSource`:

```python
class CustomTokenExtractor(TokenSource):
    def __init__(self):
        super().__init__("custom", "My custom token source")
        
    async def extract_token(self) -> Optional[str]:
        # Your custom extraction logic
        return "your.jwt.token"
```

### Environment-Specific Behavior

The tools automatically adapt to different environments:

- **Development**: Tries all sources, detailed logging
- **Staging**: Limited sources, moderate logging  
- **Production**: Secure sources only, minimal logging

## 📊 Token Analysis

The `--validate` option provides detailed token analysis:

```bash
python tools/jwt_extractor.py --validate "your.jwt.token"
```

Shows:
- ✅ **Token validity** and format
- ⏰ **Expiry information** 
- 🔏 **Signature validation** (if JWT secret available)
- 👤 **User information** (subject, audience, etc.)
- 📋 **Full payload** inspection
- 🔗 **API accessibility** testing

## 🤝 Contributing

These tools are designed to be easily extensible. To add new token sources:

1. Create a new class inheriting from `TokenSource`
2. Implement the `extract_token()` method
3. Add to the `sources` list in `JWTExtractor`
4. Test with various scenarios

## 🎉 Happy Testing!

No more manual token copying! These tools make JWT authentication completely transparent for development and testing. Focus on building features, not wrestling with authentication tokens.

**Pro tip**: Add `./tools/get_jwt.sh -q` to your shell aliases for instant token access! 

```bash
# Add to your ~/.bashrc or ~/.zshrc
alias jwt='./tools/get_jwt.sh -q'
alias jwt-test='python tools/test_api_with_auto_auth.py'

# Now you can just run:
jwt
jwt-test
```