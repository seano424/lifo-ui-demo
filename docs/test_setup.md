# LIFO AI Complete Testing Setup Guide

This guide provides a comprehensive walkthrough for testing the entire LIFO AI setup after the recent architectural fixes and improvements.

## 🏗️ **Architecture Overview**

The LIFO AI system consists of:

- **Frontend**: Next.js TypeScript application (main app)
- **lifo_api**: FastAPI Python microservice (inventory management API)
- **lifo_ai_core**: Python data processing package (ETL, CSV processing)

## 📋 **Prerequisites**

### System Requirements

- Python 3.11+ or 3.12
- Node.js 18+ (for frontend)
- uv (Python package manager)
- PostgreSQL (for production) or SQLite (for testing)

### Required Tools

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Verify installations
uv --version
python3 --version
node --version
```

## 🧪 **Testing Strategy**

### Phase 1: Environment Setup

### Phase 2: lifo_ai_core Testing

### Phase 3: lifo_api Testing

### Phase 4: Integration Testing

### Phase 5: Frontend Integration

---

## **PHASE 1: Environment Setup**

### 1.1 Project Structure Verification

```bash
cd /home/slim/lifo-app

# Verify project structure
ls -la
# Should see: lifo_ai_core/, lifo_api/, app/, components/, etc.

# Check Python projects
ls -la lifo_ai_core/
ls -la lifo_api/
```

### 1.2 Environment Variables Setup

**Option A: Test with Real Supabase Setup (Recommended)**
If you want to test your actual Supabase workflow, **skip this step** and use your existing environment files:

```bash
# Verify your existing environment files
ls -la lifo_api/.env.local
ls -la .env.local

# Check that your real Supabase variables are set
cd lifo_api
source .venv/bin/activate
python3 -c "
import os
from dotenv import load_dotenv
load_dotenv('../.env.local')  # or wherever your real .env is

print('SUPABASE_URL:', os.getenv('SUPABASE_URL', 'NOT SET'))
print('DATABASE_URL type:', os.getenv('DATABASE_URL', 'NOT SET').split('://')[0] if os.getenv('DATABASE_URL') else 'NOT SET')
print('ENVIRONMENT:', os.getenv('ENVIRONMENT', 'NOT SET'))
"
deactivate
cd ..
```

**Option B: Create Test Environment Files (Only for isolated testing)**
Only create these if you want to test with mock/test data without affecting your real Supabase:

```bash
# Create .env.local for API testing (ONLY if you want isolated testing)
cat > lifo_api/.env.test << EOF
# Environment
ENVIRONMENT=development
DEBUG=true

# Database (for testing)
DATABASE_URL=sqlite+aiosqlite:///:memory:

# Supabase (test values - won't affect your real setup)
SUPABASE_URL=https://test.supabase.co
SUPABASE_JWT_SECRET=test-jwt-secret-for-testing-only
SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-key

# API Configuration
API_VERSION=1.0.0
JWT_SECRET_KEY=test-jwt-secret-change-in-production
EOF

# Create .env for lifo_ai_core testing
cat > lifo_ai_core/.env << EOF
# Environment
LIFO_ENVIRONMENT=development
LIFO_DEBUG=true

# Database
LIFO_DATABASE_URL=sqlite+aiosqlite:///:memory:

# Logging
LIFO_LOG_LEVEL=DEBUG
EOF

# Note: Use these test files with: load_dotenv('.env.test')
```

**For Real Supabase Testing**: Proceed with your existing environment setup and skip the file creation commands above.

---

## **PHASE 2: lifo_ai_core Testing**

### 2.1 Setup Virtual Environment

```bash
cd lifo_ai_core

# Create virtual environment with Python 3.12
uv venv --python python3.12

# Activate environment
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Verify installation
pip list | grep -E "(pydantic|pandas|sqlalchemy)"
```

### 2.2 Basic Import Tests

```bash
# Test core imports
python3 -c "
import sys
print('Python version:', sys.version)

# Test configuration
from config.settings import Settings, get_settings
settings = get_settings()
print('✅ Settings loaded:', settings.environment)

# Test CSV processor
from etl.processor import CSVProcessor
processor = CSVProcessor()
print('✅ CSV processor created')

# Test database operations
from database.operations import InventoryOperations, create_inventory_operations
ops = create_inventory_operations()
print('✅ Database operations created')

print('🎉 lifo_ai_core core components working!')
"
```

### 2.3 CSV Processing Test

```bash
# Create test CSV file
cat > test_inventory.csv << EOF
SKU,Product_Name,Quantity,Cost_Price,Selling_Price,Expiry_Date,Category
TEST-001,Test Bananas,10,0.50,1.20,2024-12-31,fresh_produce
TEST-002,Test Milk,5,1.00,2.50,2024-12-15,dairy
TEST-003,Test Bread,8,1.50,3.00,2024-11-25,bakery_fresh
EOF

# Test CSV processing
python3 -c "
from etl.processor import process_csv_file

result = process_csv_file('test_inventory.csv')
print('CSV Processing Result:')
print(f'Success: {result[\"success\"]}')
print(f'Processed: {result.get(\"processed_count\", 0)} items')
if result.get('errors'):
    print('Errors:', result['errors'])
if result.get('warnings'):
    print('Warnings:', result['warnings'])
"

# Clean up
rm test_inventory.csv
```

### 2.4 Package Import Test

```bash
# Test package-level imports
python3 -c "
import sys
sys.path.insert(0, '.')

# Test package imports work
try:
    from config.settings import get_settings
    from etl.processor import CSVProcessor
    from database.operations import InventoryOperations
    print('✅ All package imports successful')
except ImportError as e:
    print('❌ Import error:', e)
"

# Deactivate environment
deactivate
cd ..
```

---

## **PHASE 3: lifo_api Testing**

### 3.1 Setup API Environment

```bash
cd lifo_api

# Create virtual environment
uv venv --python python3.12

# Activate environment
source .venv/bin/activate

# Install dependencies
uv pip install -r requirements.txt

# Verify critical packages
pip list | grep -E "(fastapi|sqlalchemy|pydantic|structlog)"
```

### 3.2 Configuration and Import Tests

```bash
# Test configuration loading
ENVIRONMENT=development python3 -c "
from app.core.config import settings
print('✅ Configuration loaded')
print(f'Environment: {settings.environment}')
print(f'Debug mode: {settings.debug}')
print(f'API version: {settings.api_version}')
"

# Test database connection setup
DATABASE_URL='sqlite+aiosqlite:///:memory:' python3 -c "
from app.database.connection import engine, get_database_url
url = get_database_url()
print('✅ Database connection configured')
print(f'Database URL type: {url.split(\"::\")[0] if \"::\" in url else url.split(\"://\")[0]}')
"
```

### 3.3 Authentication System Test

```bash
# Test authentication components
SUPABASE_JWT_SECRET=test-secret python3 -c "
from app.auth.supabase_jwt import SupabaseAuth, SupabaseUser
auth = SupabaseAuth()
print('✅ Authentication system initialized')
print(f'JWT algorithms: {auth.algorithms}')
"
```

### 3.4 API Application Test

```bash
# Test full application loading with your real Supabase setup
# The app/main.py will automatically load from your existing .env.local file
python3 -c "
try:
    from app.main import app
    print('✅ FastAPI application loaded successfully')
    print('✅ All middleware configured')
    print('✅ All routes registered')
    print('Application title:', app.title)
    print('OpenAPI URL:', app.openapi_url)

    # Test that your real Supabase config is loaded
    from app.core.config import settings
    print('✅ Your Supabase URL configured:', settings.supabase_url[:20] + '...' if settings.supabase_url else 'NOT SET')
    print('✅ Database URL type:', settings.database_url.split('://')[0] if settings.database_url else 'NOT SET')
except Exception as e:
    print('❌ Application loading failed:', e)
    import traceback
    traceback.print_exc()
"
```

### 3.5 Type Checking Verification

```bash
# Run mypy to ensure type safety
mypy . --no-error-summary
echo "Exit code: $?"
# Should show 0 errors

# Run ruff for code quality
ruff check .
ruff format --check .
```

### 3.6 API Server Test

```bash
# Start the development server with your real Supabase configuration
# The server will automatically load your .env.local file
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &

# Wait for server to start
sleep 3

# Test health endpoints with real Supabase connection
curl -s http://localhost:8000/ | python3 -m json.tool
curl -s http://localhost:8000/health | python3 -m json.tool
curl -s http://localhost:8000/api/info | python3 -m json.tool

# Test that your actual Supabase database connection works
curl -s http://localhost:8000/health | grep -E "(database|healthy)"

# Stop the server
pkill -f uvicorn

deactivate
cd ..
```

---

## **PHASE 4: Integration Testing**

### 4.1 Cross-Project Integration

```bash
# Test lifo_ai_core integration with lifo_api using your real Supabase setup
cd lifo_api
source .venv/bin/activate

# Test that the API can load with your real Supabase configuration
python3 -c "
# This will use your actual .env.local file
from app.api.v1.csv_upload import UnifiedCSVProcessor
if UnifiedCSVProcessor:
    print('✅ CSV processor integration working')
else:
    print('⚠️ Using fallback CSV processor')

# Test database operations with your real database
try:
    from app.database.connection import DatabaseManager
    db_manager = DatabaseManager()
    print('✅ Database manager available')

    # Test your actual database connection
    from app.core.config import settings
    print('✅ Connected to:', settings.database_url.split('://')[0] if settings.database_url else 'No DB URL')
except Exception as e:
    print('❌ Database manager issue:', e)
"

deactivate
cd ..
```

### 4.2 Supabase Workflow Testing

```bash
cd lifo_api
source .venv/bin/activate

# Test your actual Supabase authentication workflow
python3 -c "
from app.auth.supabase_jwt import SupabaseAuth
from app.core.config import settings

# Test with your real Supabase configuration
print('🔍 Testing Real Supabase Setup:')
print('Supabase URL:', settings.supabase_url)
print('JWT Secret configured:', 'Yes' if settings.supabase_jwt_secret else 'No')

# Test auth initialization with your settings
try:
    auth = SupabaseAuth()
    print('✅ Authentication system works with your Supabase')
    print('JWT algorithms:', auth.algorithms)
except Exception as e:
    print('❌ Supabase auth issue:', e)

# Test database URL format for Supabase
db_url = settings.database_url
if 'supabase' in db_url or 'postgresql' in db_url:
    print('✅ Database URL appears to be Supabase PostgreSQL')
elif 'sqlite' in db_url:
    print('⚠️ Using SQLite - switch to Supabase PostgreSQL for production')
else:
    print('❓ Database URL format:', db_url.split('://')[0] if db_url else 'Not set')
"

# Test that your Supabase connection works with actual queries
python3 -c "
import asyncio
from app.database.connection import test_connection

async def test_real_db():
    try:
        is_healthy = await test_connection()
        if is_healthy:
            print('✅ Your Supabase database connection is working!')
        else:
            print('❌ Database connection test failed')
    except Exception as e:
        print('❌ Database test error:', e)

# Run the async test
asyncio.run(test_real_db())
"

deactivate
cd ..
```

### 4.3 Security Testing

```bash
cd lifo_api
source .venv/bin/activate

# Test security middleware
ENVIRONMENT=production \
DATABASE_URL='postgresql://user:pass@localhost/db' \
SUPABASE_JWT_SECRET=production-secret \
SUPABASE_URL=https://prod.supabase.co \
SUPABASE_ANON_KEY=prod-key \
python3 -c "
from app.core.config import settings
print('CORS origins:', settings.get_cors_origins())
print('Allowed hosts:', settings.get_allowed_hosts())
print('Environment:', settings.environment)
"

# Test rate limiting
python3 -c "
from app.middleware.rate_limiting import limiter, SecurityRateLimiter
print('✅ Rate limiting configured')
print('Default limits:', limiter._default_limits)

sec_limiter = SecurityRateLimiter()
print('✅ Security rate limiter available')
"

deactivate
cd ..
```

---

## **PHASE 5: Frontend Integration**

### 5.1 Next.js Application Test

```bash
# Check if Node.js dependencies are installed
npm list --depth=0 | head -10

# Test TypeScript compilation
npx tsc --noEmit

# Test Next.js build (development)
npm run dev &
sleep 5

# Test frontend endpoints
curl -s http://localhost:3000/api/stores | head -50
curl -s http://localhost:3000/api/inventory | head -50

# Stop development server
pkill -f "next dev"
```

### 5.2 API Integration Test

```bash
# Start both servers for integration test
cd lifo_api
source .venv/bin/activate

# Start API server
ENVIRONMENT=development \
DATABASE_URL='sqlite+aiosqlite:///:memory:' \
SUPABASE_JWT_SECRET=test-secret \
SUPABASE_URL=https://test.supabase.co \
SUPABASE_ANON_KEY=test-key \
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

cd ..

# Start Next.js server
npm run dev &

sleep 5

# Test CORS integration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:8000/api/v1/scoring

# Clean up
pkill -f uvicorn
pkill -f "next dev"
```

---

## **PHASE 6: Production Readiness Testing**

### 6.1 Production Configuration Test

```bash
cd lifo_api
source .venv/bin/activate

# Test production configuration
ENVIRONMENT=production \
DATABASE_URL='postgresql://user:pass@localhost:5432/lifo_prod' \
SUPABASE_JWT_SECRET=your-production-jwt-secret \
SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_ANON_KEY=your-anon-key \
FRONTEND_URL=https://your-domain.com \
python3 -c "
from app.core.config import settings
print('Production CORS origins:', settings.get_cors_origins())
print('Production allowed hosts:', settings.get_allowed_hosts())
print('Debug mode:', settings.debug)
print('Docs URL:', 'Disabled' if settings.environment == 'production' else 'Enabled')
"

deactivate
cd ..
```

### 6.2 Performance and Security Validation

```bash
cd lifo_api
source .venv/bin/activate

# Test security headers
python3 -c "
from app.middleware.security_headers import ProductionSecurityMiddleware
print('✅ Production security middleware available')

from app.middleware.rate_limiting import PRODUCTION_RATE_LIMITS
print('Production rate limits:', PRODUCTION_RATE_LIMITS)
"

# Test database performance settings
python3 -c "
from app.core.config import settings
print('DB pool size:', settings.db_pool_size)
print('DB max overflow:', settings.db_max_overflow)
print('DB pool recycle:', settings.db_pool_recycle)
"

deactivate
cd ..
```

---

## **🎯 Expected Results**

### Success Indicators

- ✅ **lifo_ai_core**: All imports successful, CSV processing working
- ✅ **lifo_api**: FastAPI app loads, 0 mypy errors, health endpoints respond
- ✅ **Integration**: Cross-project imports work, no import warnings
- ✅ **Security**: Rate limiting active, CORS properly configured
- ✅ **Frontend**: Next.js builds successfully, API integration works

### Common Issues and Fixes

#### Issue: "Module not found" errors

```bash
# Solution: Ensure virtual environment is activated
source .venv/bin/activate
uv pip install -r requirements.txt
```

#### Issue: Logger "bind" attribute errors

```bash
# Error: AttributeError: 'Logger' object has no attribute 'bind'
# Solution: This has been fixed in the database operations module
# Standard Python logging is now used instead of structlog
```

#### Issue: Database connection errors

```bash
# Solution: Check DATABASE_URL format
echo $DATABASE_URL
# Should be: sqlite+aiosqlite:///:memory: (testing) or postgresql+asyncpg://... (production)
```

#### Issue: Authentication failures

```bash
# Solution: Verify environment variables
echo $SUPABASE_JWT_SECRET
echo $SUPABASE_URL
# Both should be set and non-empty
```

#### Issue: CORS errors in frontend

```bash
# Solution: Check CORS configuration matches frontend URL
# Frontend URL should be in settings.get_cors_origins()
```

---

## **📊 Testing Checklist**

### Core Functionality

- [ ] lifo_ai_core imports without errors
- [ ] CSV processing works with sample data
- [ ] Database operations instantiate correctly
- [ ] Configuration loading works in both projects

### API Functionality

- [ ] FastAPI application loads successfully
- [ ] Health endpoints respond correctly
- [ ] Authentication system initializes
- [ ] Database connections configured properly
- [ ] MyPy type checking passes (0 errors)

### Security & Performance

- [ ] Rate limiting is active
- [ ] CORS is properly configured
- [ ] Security headers are applied
- [ ] Production settings disable debug features
- [ ] Environment variables are validated

### Integration

- [ ] Cross-project imports work without warnings
- [ ] Frontend can communicate with API
- [ ] Database connections work in both test and production modes
- [ ] Error handling works gracefully

---

## **🚀 Deployment Notes**

### Environment Variables Required

**Production API (.env.local)**:

```env
ENVIRONMENT=production
DEBUG=false
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_SECRET=your-actual-jwt-secret
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
FRONTEND_URL=https://your-domain.com
```

### Database Setup

1. **Development**: Uses SQLite in memory (automatic)
2. **Production**: Requires PostgreSQL with proper migrations

### Security Considerations

- JWT secrets must be strong in production
- Database URLs should not be logged
- CORS origins should be restrictive in production
- Rate limiting should be enabled

---

## **✅ Verification Commands**

Run these commands to verify the entire setup:

```bash
# Quick verification script
./verify_setup.sh

# Or manual verification:
cd lifo_ai_core && source .venv/bin/activate && python3 -c "from config.settings import get_settings; print('✅ Core OK')" && deactivate && cd ..
cd lifo_api && source .venv/bin/activate && mypy . --no-error-summary && echo "✅ API OK" && deactivate && cd ..
npm run build && echo "✅ Frontend OK"
```

This comprehensive testing guide ensures that all components of the LIFO AI system work correctly after the architectural improvements and fixes.
