# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LIFO.AI is an intelligent food waste management platform with AI-powered inventory optimization. This repository contains the **Next.js 15 frontend** application with Supabase PostgreSQL database integration. It provides mobile-optimized scanning interfaces with AI scoring, Google Vision OCR, and real-time analytics.

**Repository Split**: The backend has been moved to a separate repository.
- **Frontend (this repo)**: https://github.com/lifo-ai/lifo-app - Next.js 15 frontend
- **Backend repo**: https://github.com/lifo-ai/lifo-api - FastAPI backend service

**Note**: A deprecated local copy of the backend (`lifo_api/`) may still exist in this repository for local development. For production backend changes, use the dedicated backend repository.

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

### Backend (FastAPI) - Local Development Only
**Note**: For production backend development, use the dedicated backend repository at https://github.com/lifo-ai/lifo-api

If using the local deprecated backend copy:
```bash
# Development (local copy only - deprecated)
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
│   ├── (auth)/            # Authentication pages
│   ├── api/               # Next.js API routes
│   └── protected/         # Protected application pages
├── components/            # React components (171 files)
│   ├── ui/               # Base UI components (Radix UI + shadcn/ui)
│   ├── todos/            # Todo/batch management
│   ├── donation/         # Donation management
│   ├── scanning/         # Barcode/OCR scanning
│   └── ... (various feature components)
├── lib/                  # Utility functions & services (79 files)
│   ├── api/             # API clients
│   ├── auth/            # Authentication utilities
│   ├── supabase/        # Supabase client configuration
│   ├── queries/         # React Query setup
│   └── ... (various utilities)
├── supabase/            # Database schema & migrations
│   └── migrations/      # SQL migration files
├── messages/            # Internationalization (en, fr, nl)
└── lifo_api/           # [DEPRECATED] Local backend copy for development
                         # Use https://github.com/lifo-ai/lifo-api for backend work
```

### Core Architecture Patterns

**Frontend (Next.js)**:
- **Routing**: App Router with TypeScript and React 19
- **Authentication**: Supabase SSR authentication patterns
- **UI Components**: Radix UI primitives + shadcn/ui design system
- **State Management**:
  - Zustand for client state
  - React Query v5 for server state
- **Styling**: Tailwind CSS 4.1 with mobile-first responsive design
- **Internationalization**: next-intl (English, French, Dutch)
- **Forms**: React Hook Form + Zod validation

**Backend Integration**:
- Backend API deployed separately (https://github.com/lifo-ai/lifo-api)
- FastAPI service with AI-powered scoring and OCR
- Authentication via Supabase API keys and JWT tokens
- Performance optimized for mobile (<300ms response targets)
- API Documentation: Available at backend service /docs endpoint

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

**Migration Reset - October 26, 2025**
We performed a clean migration reset to fix schema drift and inconsistent migration naming. All previous migrations (47 files) were consolidated into a single migration that captures the complete working schema from production.

- **Current State**: Single migration file `20251026181700_001_complete_schema.sql` (14,257 lines)
- **Backup**: Old migrations archived in `supabase/migrations_backup/` for reference
- **Source**: Exported directly from production database
- **Includes**: All 8 schemas (admin, analytics, business, inventory, sales, scoring, timeseries, user_mgmt)

**Setup for New Team Members**:
```bash
git pull
npm run supabase:start    # Start local Supabase
npm run update-types      # Generate TypeScript types
```

**Existing Team Members** (after reset):
```bash
git pull
supabase db reset         # Reset local database with new migration
npm run update-types      # Regenerate types
```

**Migration Guidelines Going Forward**:
- **Location**: `supabase/migrations/*.sql`
- **Pattern**: Use timestamp-based naming (Supabase CLI auto-generates)
- **Multi-Schema**: Changes span multiple schemas - always use schema prefixes in queries
- **RLS**: Row Level Security policies are schema-specific
- **Local Development**: Use `npm run supabase:start` for local Supabase instance
- **Type Generation**: Run `npm run update-types` after schema changes
- **Never skip migrations**: All schema changes must go through migration files
- **Test locally first**: Always test migrations with `supabase db reset` before committing

**Pre-Commit Migration Checklist**:
Before committing any new migration, verify:
- [ ] Migration tested locally with `supabase db reset`
- [ ] TypeScript types regenerated with `npm run update-types`
- [ ] No test data or sensitive information in migration
- [ ] RLS policies tested (verify unauthorized access is blocked)
- [ ] Migration is idempotent (safe to re-run without errors)
- [ ] Performance indexes added for new tables/columns where needed
- [ ] Foreign key constraints and cascades are correct
- [ ] All schema changes use proper schema prefixes (e.g., `inventory.`, `business.`)

## Environment Setup

### Required Files
- **Environment file**: Copy `.env.example` → `.env.local`
- **Frontend-focused config**: Frontend variables prefixed with `NEXT_PUBLIC_*` (exposed to client)
- **Critical frontend variables**:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - `NEXT_PUBLIC_API_URL` - Backend API URL (if using external backend)
- **Server-side variables** (for Next.js API routes):
  - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side operations
  - `RESEND_API_KEY` - For email functionality

**Backend Configuration**: Backend environment is managed separately in the lifo-api repository.

### Installation
```bash
# Frontend dependencies
npm install

# Start local Supabase (optional, for local development)
npm run supabase:start

# Generate TypeScript types from database schema
npm run update-types
```

## Key Development Patterns

### Frontend Development
- **Component Patterns**: Use existing patterns from `components/` directory
  - 171 React components organized by feature
  - Radix UI primitives + shadcn/ui components
  - Co-location of components by feature (todos/, donation/, scanning/, etc.)
- **Authentication**: Leverage Supabase SSR patterns from `lib/auth/`
- **Routing**: Follow App Router patterns in `app/` directory
  - Protected routes: `app/(dashboard)/`
  - Public routes: `app/(marketing)/`
  - Auth routes: `app/(auth)/`
- **Type Safety**: Strict TypeScript (configured in `tsconfig.json`)
- **Styling**: Tailwind CSS 4.1 with mobile-first responsive design
- **State Management**:
  - Use Zustand stores from `lib/stores/` for client state
  - React Query from `lib/queries/` for server state
- **API Integration**: Use API clients from `lib/api/` to communicate with backend
- **Internationalization**: Use next-intl for i18n (messages/ directory)

### Backend API Integration
**Note**: Backend development happens in the separate repository (https://github.com/lifo-ai/lifo-api)
- **API Client**: Use OCR client from `lib/api/ocr-client.ts` as reference
- **Authentication**: Pass Supabase tokens to backend via headers
- **Error Handling**: Handle API errors gracefully with user-friendly messages

### Security Considerations
- **Authentication**: Supabase SSR authentication with secure session handling
- **Row Level Security**: RLS policies enforced at database level
- **Input Validation**: Zod schemas for form validation
- **XSS Protection**: React's built-in XSS protection + Content Security Policy
- **CSRF Protection**: Next.js CSRF protection for API routes
- **Environment Variables**: Never expose secrets in NEXT_PUBLIC_* variables

### Testing Requirements
- **Test Framework**: Jest + React Testing Library
- **Component Testing**: Test user interactions and accessibility
- **Integration Testing**: Test complete user flows
- **Type Safety**: Strict TypeScript compilation serves as static testing
- **E2E Testing**: Consider Playwright or Cypress for critical flows

## Code Quality Standards

- **TypeScript**: Biome for linting/formatting, strict TypeScript compiler settings
- **Code Formatting**: Biome with automatic formatting on save
- **Type Safety**: Strict TypeScript with no implicit any
- **Testing**: Jest + React Testing Library
- **Component Standards**: Follow existing patterns from components/ directory
- **Accessibility**: WCAG 2.1 AA compliance with ARIA labels

## Performance Targets

- **First Contentful Paint (FCP)**: <1.8s
- **Largest Contentful Paint (LCP)**: <2.5s
- **Time to Interactive (TTI)**: <3.8s
- **Cumulative Layout Shift (CLS)**: <0.1
- **Mobile Performance**: Optimized for 3G networks
- **Image Optimization**: Next.js Image component for automatic optimization
- **Code Splitting**: Automatic route-based code splitting with App Router

## Critical Development Notes

### Database Operations
- **Migrations**: Located in `supabase/migrations/*.sql`
- **Type Generation**: Run `npm run update-types` after schema changes
- **Direct Database Access**: Use Supabase client from `lib/supabase/`
- **RLS**: All tables have Row Level Security enabled
- **Schema Prefixes**: Always use schema prefixes when querying (user_mgmt, inventory, etc.)

### Component Development
- **shadcn/ui**: Use `components.json` for shadcn component configuration
- **Radix UI**: Leverage Radix primitives for accessible components
- **Styling**: Use Tailwind CSS classes, avoid inline styles
- **Icons**: Use Lucide React icons
- **Forms**: Use React Hook Form + Zod for form validation

### Internationalization
- **Languages**: English (en), French (fr), Dutch (nl)
- **Messages**: Update all three language files in `messages/` directory
- **Usage**: Import from `next-intl` and use `useTranslations()` hook

### API Integration
- **Backend URL**: Configure in `NEXT_PUBLIC_API_URL` environment variable
- **Authentication**: Pass Supabase session token in Authorization header
- **Error Handling**: Use try/catch with user-friendly error messages
- **Loading States**: Always show loading indicators for async operations

## Documentation References

- **Frontend Documentation**: This repository's README.md
- **Backend API Documentation**: https://github.com/lifo-ai/lifo-api
- **Backend API Endpoints**: http://[backend-url]/docs (Swagger UI)
- **Database Schema**: `supabase/migrations/` directory
- **Component Library**: `components/` directory with organized features

## Related Repositories

- **Backend API**: https://github.com/lifo-ai/lifo-api - FastAPI backend service
- **Database Migrations**: Managed in this repository (`supabase/migrations/`)
