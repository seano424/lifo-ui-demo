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
# Run all tests
cd lifo_api && pytest

# Specific test suites (from root directory)
./run_authenticated_tests.sh  # Authenticated API tests
pytest tests/unit/           # Unit tests only
pytest tests/security/       # Security tests only  
pytest tests/performance/    # Performance tests only
pytest tests/integration/    # Integration tests only

# Test with coverage
pytest --cov=app --cov-report=html
```

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
│       ├── api/v1/      # 65+ API endpoints
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
  - `database.py` - Database operations and caching
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
- Row Level Security (RLS) enabled
- Multiple schemas: `user_mgmt`, `inventory`, `scoring`, `business`, `analytics`
- Performance indexes for mobile query optimization

## Environment Setup

### Required Files
- Copy `.env.example` to `.env.local` and configure:
  - `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
  - `SUPABASE_SERVICE_ROLE_KEY` & `DATABASE_URL` (backend)
  - Google Vision API credentials for OCR

### Installation
```bash
# Frontend dependencies
npm install

# Backend dependencies  
cd lifo_api && pip install -r requirements.txt
```

## Key Development Patterns

### API Development
- All API endpoints in `lifo_api/app/api/v1/`
- Business logic centralized in `lifo_api/app/core/`
- Use dependency injection for database and auth
- Follow mobile performance requirements (<300ms)

### Frontend Development
- Use existing component patterns from `components/`
- Leverage Supabase SSR for authentication
- Follow existing routing patterns in `app/`
- Use TypeScript strictly (configured in `tsconfig.json`)

### Security Considerations
- CSV upload security with formula injection prevention
- API key authentication with store-level authorization
- Rate limiting configured per endpoint
- Input validation on all user inputs

### Testing Requirements
- Maintain >85% code coverage
- Security tests for authentication and input validation
- Performance tests for mobile endpoints
- Integration tests for complete workflows

## Code Quality Standards

- **Python**: Configured with ruff (linting/formatting) + mypy (type checking)
- **TypeScript**: Biome for linting/formatting, strict TypeScript compiler settings  
- **Git hooks**: Pre-commit configuration in `.pre-commit-config.yaml`
- **Testing**: pytest with comprehensive fixtures in `conftest.py`

## Performance Targets

- Mobile API endpoints: <300ms response time
- Quick batch scoring: <200ms  
- Store health checks: <400ms
- Database queries optimized with proper indexing
- Bounded caching to prevent memory leaks

## Documentation References

- **Complete System Documentation**: `DOCUMENTATION.md`
- **Testing Guide**: `lifo_api/TESTING.md` 
- **Product Scoring Rules**: `PRODUCT_SCORING_RULES_DOCUMENTATION.md`
- **API Documentation**: http://localhost:8000/docs (when running)