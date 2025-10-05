# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LIFO.AI is an intelligent food waste management platform with AI-powered inventory optimization. The system consists of a Next.js 15 frontend, FastAPI backend, and Supabase PostgreSQL database. It provides mobile-optimized scanning interfaces with AI scoring, Google Vision OCR, and real-time analytics.

## Development Commands

### Frontend (Next.js)
```bash
# Development
npm run dev                    # Start Next.js dev server with Turbopack
npm run dev:all               # Start both frontend and backend
npm run build                 # Build for production
npm run start                 # Start production server

# Code Quality
npm run check                 # Run Biome linting and TypeScript checks
npm run check:fix             # Auto-fix linting issues
npm run format               # Format code with Biome
```

### Backend (FastAPI)
```bash
# Development
npm run api:dev              # Start FastAPI with reload (port 8000)
npm run api                  # Start production API server
cd lifo_api && uvicorn app.main:app --reload  # Direct command

# Code Quality & Testing
npm run api:check            # Run ruff + mypy checks
npm run api:check:fix        # Auto-fix ruff issues
npm run api:type-check       # TypeScript-style checking with mypy
```

### Testing
```bash
# Run all tests (from lifo_api directory)
cd lifo_api && pytest

# Specific test suites
pytest tests/unit/              # Unit tests
pytest tests/integration/       # Integration tests
pytest tests/security/          # Security & auth tests
pytest tests/performance/       # Performance benchmarks

# Run single test file or function
pytest tests/unit/test_scoring.py
pytest tests/unit/test_scoring.py::test_calculate_expiry_score

# Run with coverage
pytest --cov=app --cov-report=html
```

**Test Infrastructure**:
- **Fixtures**: `tests/conftest.py` contains comprehensive shared fixtures (~20k characters)
- **Coverage Target**: Maintain >85% code coverage
- **Test Types**: Unit, integration, security, and performance tests

### Database & Supabase
```bash
npm run supabase:start       # Start local Supabase instance
npm run supabase:stop        # Stop local Supabase
npm run supabase:status      # Check Supabase status
npm run update-types         # Generate TypeScript types from Supabase schema
```

## Architecture Overview

### High-Level Structure
```
lifo-app/
├── app/                     # Next.js 15 App Router Frontend
│   ├── (dashboard)/        # Protected dashboard routes
│   ├── (marketing)/        # Public marketing pages
│   ├── (onboarding)/       # User onboarding flow
│   ├── api/               # Next.js API routes
│   └── protected/         # Protected application pages
├── components/            # Shared React components (Radix UI + shadcn/ui)
├── lib/                  # Utility functions & Supabase client
├── lifo_api/            # FastAPI Backend Service
│   └── app/
│       ├── core/        # Business logic (scoring, donation engine)
│       ├── api/v1/      # 26 API endpoint files (~11,700 lines)
│       ├── auth/        # Supabase authentication
│       ├── database/    # Models & operations
│       ├── security/    # Security utilities & monitoring
│       └── middleware/  # CORS, rate limiting, performance
└── supabase/           # Database schema & migrations
```

### Core Architecture Patterns

**Backend (FastAPI)**:
- `lifo_api/app/core/` contains consolidated business logic:
  - `scoring.py` - AI-powered inventory scoring system
  - `donation_engine.py` - European pilot donation management
  - `database.py` - Database connection re-exports for backward compatibility
- Authentication via Supabase API keys and JWT tokens
- Security-first design with input validation, rate limiting, CORS
- Performance optimized for mobile (<300ms response targets)

**Frontend (Next.js)**:
- App Router with TypeScript and React 19
- Supabase SSR authentication patterns
- Component architecture with Radix UI primitives
- State management with Zustand
- Mobile-first responsive design

**Database (Supabase PostgreSQL)**:
- Row Level Security (RLS) enabled on all tables
- Multiple schemas: `user_mgmt`, `inventory`, `scoring`, `business`, `analytics`
- Performance indexes for mobile query optimization
- Schema-specific RLS policies

### Database Connection Pattern
- **Connection Layer**: `app/database/connection.py` provides centralized async session management
- **Core Re-export**: `app/core/database.py` re-exports for backward compatibility
- **FastAPI Dependencies**: Use `get_db()` or `get_database_session()` for dependency injection
- **Important**: Always use async context managers with database sessions
- **Pattern**:
  ```python
  from app.database.connection import get_db

  async def endpoint(db: AsyncSession = Depends(get_db)):
      # Use db session here
  ```

### Database Migrations
- **Location**: `supabase/migrations/*.sql`
- **Pattern**: Numbered SQL files (001_*, 002_*, etc.)
- **Multi-Schema**: Changes span multiple schemas - always use schema prefixes in queries
- **RLS**: Row Level Security policies are schema-specific
- **Local Development**: Use `npm run supabase:start` for local Supabase instance
- **Type Generation**: Run `npm run update-types` after schema changes

## Environment Setup

### Required Files
- **Single environment file**: `.env.example` → `.env.local`
- **Shared config**: Both Next.js and FastAPI read from same `.env.local`
- **Frontend vars**: Prefixed with `NEXT_PUBLIC_*` (exposed to client)
- **Backend vars**: No prefix (server-side only)
- **Critical variables**:
  - `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
  - `SUPABASE_SERVICE_ROLE_KEY` & `DATABASE_URL` (backend)
  - `GOOGLE_CLOUD_PROJECT_ID` for OCR
  - **Important**: Use Application Default Credentials (ADC) for Google Cloud auth
    - Run: `gcloud auth application-default login`
    - Do NOT set `GOOGLE_APPLICATION_CREDENTIALS` in development

### Installation
```bash
# Frontend dependencies
npm install

# Backend dependencies
cd lifo_api && pip install -r requirements.txt
```

## Key Development Patterns

### API Development
- **26 endpoint files** in `lifo_api/app/api/v1/` (~11,700 total lines)
- **Key endpoints**:
  - `automated_scoring.py` - Bulk scoring with chunking for performance
  - `csv_upload.py` - CSV processing with security validation
  - `image_recognition.py` - Google Vision OCR integration
  - `donation_queries.py` - European pilot donation logic
- **Business logic**: Always centralize in `lifo_api/app/core/` (not in endpoints)
- **Dependencies**: Use FastAPI dependency injection:
  ```python
  async def endpoint(db: AsyncSession = Depends(get_db)):
  ```
- **Performance**: Mobile endpoints must respond in <300ms
- **Error Handling**: Use structured logging with `structlog`

### Frontend Development
- Use existing component patterns from `components/`
- Leverage Supabase SSR for authentication
- Follow existing routing patterns in `app/`
- Use TypeScript strictly (configured in `tsconfig.json`)
- Mobile-first responsive design with Tailwind CSS

### Security Considerations
- CSV upload security with formula injection prevention
- API key authentication with store-level authorization
- Rate limiting configured per endpoint
- Input validation on all user inputs using Pydantic models
- Row Level Security (RLS) enforced at database level

### Testing Requirements
- Maintain >85% code coverage
- Security tests for authentication and input validation
- Performance tests for mobile endpoints
- Integration tests for complete workflows
- Use fixtures from `tests/conftest.py` for consistency

## Code Quality Standards

- **Python**: Configured with ruff (linting/formatting) + mypy (type checking)
- **TypeScript**: Biome for linting/formatting, strict TypeScript compiler settings
- **Git hooks**: Pre-commit configuration in `.pre-commit-config.yaml`
- **Testing**: pytest with comprehensive fixtures in `conftest.py`
- **Type Safety**: Strict type checking enabled in both Python (mypy) and TypeScript

## Performance Targets

- Mobile API endpoints: <300ms response time
- Quick batch scoring: <200ms
- Store health checks: <400ms
- Database queries optimized with proper indexing
- Bounded caching to prevent memory leaks
- Async/await patterns for I/O operations

## Critical Development Notes

### Database Operations
- Always use schema prefixes when querying across schemas
- Use async sessions with proper context managers
- Prefer direct PostgreSQL queries over PostgREST for performance-critical operations
- Database connection pooling configured: 20 pool size, 30 max overflow

### CSV Upload Security
- Formula injection prevention implemented
- File size limits: 10MB max
- Validation before processing
- Chunked processing for large files

### Google Vision OCR
- Confidence thresholds:
  - OCR general: 0.7
  - Barcode: 0.6
  - Expiry date: 0.65
- Max image size: 15MB
- Supported formats: JPEG, JPG, PNG, WebP
- Timeout: 10 seconds

### Scoring System
- Weights configurable: expiry (0.5), velocity (0.3), margin (0.2)
- Must sum to 1.0
- AI scoring engine in `app/core/scoring.py`
- Chunked batch processing for performance

## Documentation References

- **Complete System Documentation**: `DOCUMENTATION.md`
- **Testing Guide**: `lifo_api/TESTING.md`
- **Product Scoring Rules**: `PRODUCT_SCORING_RULES_DOCUMENTATION.md`
- **API Documentation**: http://localhost:8000/docs (when running)
- **Comprehensive API Guide**: `docs/COMPREHENSIVE_FASTAPI_MICROSERVICE_DOCUMENTATION.md`
