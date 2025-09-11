# LIFO Development Setup

Simple setup guide for the LIFO AI application with current consolidated architecture.

## Prerequisites

- Python 3.11+ 
- Git
- A Supabase account and project

## Quick Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd lifo-app
cd lifo_api
pip install -r requirements.txt
```

### 2. Environment Configuration

Create `.env` file in the `lifo_api` directory:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Application
API_VERSION=1.0.0
ENVIRONMENT=development
DEBUG=true
```

### 3. Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Get your project URL and API keys from Settings > API
3. Update the `.env` file with your credentials
4. Run database migrations (if applicable)

### 4. Start the Application

```bash
cd lifo_api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000

## Verification

### Health Check
```bash
curl http://localhost:8000/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-09-11T17:00:00Z"
}
```

### Authentication Test
```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
     http://localhost:8000/api/v1/auth/health
```

### European Pilot Donation System Test
```bash
python -c "
from app.core.donation_engine import SimplifiedDonationEngine
engine = SimplifiedDonationEngine()
result = engine.evaluate_action_recommendation(
    {'category': 'Food', 'quantity': 100, 'days_until_expiry': 5}, 
    0.75
)
print('European pilot system:', result.recommended_action)
"
```

## Architecture Overview

```
lifo-app/
├── lifo_api/                  # Main API application
│   ├── app/
│   │   ├── core/             # Core business logic (consolidated)
│   │   │   ├── auth.py       # Authentication
│   │   │   ├── scoring.py    # AI scoring system
│   │   │   └── donation_engine.py  # European pilot system
│   │   ├── api/v1/           # API endpoints
│   │   └── database/         # Database operations
│   └── requirements.txt      # Dependencies
└── docs/                     # Documentation
```

## API Documentation

- **API Reference**: See `lifo_api/API_REFERENCE.md` for all endpoints
- **Interactive Docs**: http://localhost:8000/docs (when running)
- **Base URL**: `http://localhost:8000/api/v1`

## Key Features

- **Supabase Authentication**: Modern API key-based auth
- **European Pilot System**: Bulk donation management with quantity awareness  
- **65+ API Endpoints**: Comprehensive inventory and analytics APIs
- **Mobile Optimized**: Sub-300ms response times
- **AI Scoring**: Multi-factor inventory analysis

## Troubleshooting

### Common Issues

**Authentication Errors**
- Verify Supabase keys are correct
- Check that SUPABASE_URL includes `https://`
- Ensure service role key has proper permissions

**Database Connection Issues**
- Verify DATABASE_URL format and credentials
- Check network connectivity to database
- Ensure database exists and is accessible

**Import Errors**
- Verify all dependencies are installed: `pip install -r requirements.txt`
- Check Python version (3.11+ required)
- Ensure you're in the `lifo_api` directory

**European Pilot System Issues**
- Verify core modules are accessible: `python -c "from app.core.donation_engine import SimplifiedDonationEngine"`
- Check that consolidation is complete (no lifo_ai_core references)

### Getting Help

- Check the logs: Application logs show detailed error information
- API Interactive Docs: http://localhost:8000/docs for endpoint testing
- Health endpoints: `/health`, `/health/database`, `/health/supabase`

## Development Workflow

1. Make changes in `lifo_api/app/`
2. Test with `pytest` (if tests are available)
3. Verify with health checks
4. Test specific endpoints with curl or API docs

## Next Steps

- See `API_REFERENCE.md` for detailed endpoint documentation
- Check main `README.md` for feature overview
- Review architecture documentation for system design