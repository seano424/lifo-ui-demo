# LIFO.AI - Intelligent Food Waste Management Platform

**Transform inventory management from reactive to predictive, reducing food waste through AI-driven insights.**

## 🎯 Mission

LIFO.AI helps retailers minimize food waste by providing intelligent scoring, demand prediction, and automated recommendations for inventory optimization. Our ML-enhanced platform reduces waste while maximizing profitability.

## 🚀 Complete Data Platform Implementation

This repository contains the implementation of LIFO.AI's data platform

- **Database Schema**: Complete PostgreSQL schema with multi-tenant support
- **Inventory Management**: Batch-level tracking with LIFO methodology
- **ETL Pipeline**: Secure CSV processing with comprehensive validation
- **API Infrastructure**: Next.js API routes + FastAPI backend

- **Multi-tenant Architecture**: Store-based access control with RLS
- **Authentication System**: Supabase Auth + PIN-based employee access
- **Real-time Dashboard**: Live inventory monitoring and analytics
- **Donation Workflows**: Coordinated food rescue management

- **Data Processing**: Advanced CSV validation and category normalization
- **Business Intelligence**: Comprehensive analytics and KPI tracking
- **Employee Management**: Role-based permissions and PIN authentication
- **Audit System**: Complete action tracking and compliance logging

## 🏗️ Architecture Overview

**Single Unified Deployment** - All components integrated for streamlined development and deployment.

```
lifo-app/
├── app/                      # Next.js 15 Frontend & API Routes
│   ├── (auth)/              # Authentication routes
│   ├── (dashboard)/         # Main dashboard application
│   ├── (marketing)/         # Marketing pages
│   ├── (onboarding)/        # User onboarding flow
│   ├── api/                 # Next.js API routes
│   ├── protected/           # Protected pages
│   └── globals.css          # Global styles
├── components/               # React UI Components
│   ├── auth/                # Authentication components
│   ├── dashboard/           # Dashboard-specific components
│   ├── products/            # Product management UI
│   ├── batches/             # Batch management UI
│   ├── settings/            # Settings pages
│   └── ui/                  # Reusable UI components (shadcn/ui)
├── lib/                     # Shared Frontend Utilities
│   ├── supabase/            # Supabase client configuration
│   ├── queries/             # React Query hooks
│   ├── services/            # External service integrations
│   └── utils.ts             # General utilities
├── lifo_ai_core/            # Python Data Processing Core
│   ├── etl/                 # CSV processing pipeline
│   ├── config/              # Configuration management
│   └── utils/               # Core utilities
├── lifo_api/                # FastAPI Backend Application
│   ├── app/                 # FastAPI application structure
│   │   ├── api/v1/          # API version 1 endpoints
│   │   ├── auth/            # Authentication logic
│   │   ├── core/            # Core business logic
│   │   ├── database/        # Database models & operations
│   │   ├── models/          # Pydantic models
│   │   └── services/        # Business services
│   └── tests/               # Comprehensive test suite
├── hooks/                   # React custom hooks
├── messages/                # i18n translation files
├── supabase/migrations/     # Database schema & migrations
└── docs/                    # Documentation
```

## 🛠️ Technology Stack

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
**Backend**: FastAPI (Python), Supabase PostgreSQL
**Data Processing**: pandas, numpy, pydantic, asyncpg
**Product Scanning**: Google Vision API, OpenFoodFacts API, PIL/Pillow
**Infrastructure**: Supabase (Auth, Database, Real-time), Vercel (Hosting)
**State Management**: Zustand, React Query (TanStack Query)
**Internationalization**: next-intl (French, English, Dutch)
**Testing**: pytest, FastAPI TestClient, 124+ comprehensive tests

## 📦 Installation & Setup

### 1. Prerequisites

```bash
Node.js 18+
Python 3.12+
Supabase account
```

### 2. Clone and Install

```bash
git clone https://github.com/lifo-ai/lifo-app.git
cd lifo-app

# Install frontend dependencies
npm install

# Set up Python dependencies (using modern uv - recommended)
curl -LsSf https://astral.sh/uv/install.sh | sh  # Install uv
cd lifo_api && uv sync && cd ..                  # API dependencies
cd lifo_ai_core && uv pip install -r requirements.txt && cd ..  # Core dependencies
```

### 3. Environment Configuration

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Database Setup

```bash
# Authenticate with Supabase CLI
npx supabase login

# Generate TypeScript types (includes all schemas)
npm run update-types
```

### 5. Run the Application

```bash
# Start the unified LIFO.AI application
npm run dev

# The application integrates:
# - Next.js frontend (port 3000)
# - Python API backend and AI core
# - Supabase database and authentication
```

**📚 For detailed Python development setup, see [docs/PYTHON_DEVELOPMENT.md](docs/PYTHON_DEVELOPMENT.md)**

## 🚦 Getting Started

### Development Server

```bash
npm run dev
```

### Current State & Next Steps

✅ **Completed**:

- Python CSV processor fully integrated with Next.js
- All API endpoints working and properly configured
- Database operations and TypeScript types generated

⚠️ **Known Issues**:

- Store creation UI component needs frontend developer review
- Users need to create stores via API for now

🔧 **Next Steps**:

1. Frontend developer to fix store creation dialog rendering issues
2. Implement proper store selector UI component

### Key Operations

**CSV Upload & Processing**:

```bash
# Upload via UI at /dashboard or API
curl -X POST /api/inventory/upload -F "file=@inventory.csv"
```

**Analytics & Reporting**:

```bash
# Get comprehensive analytics via API
curl -X GET /api/analytics

# Business validation checks
curl -X POST /api/business/check
```

**Employee Management**:

```bash
# Create store employee
curl -X POST /api/employees/create \
  -H "Content-Type: application/json" \
  -d '{"email": "employee@store.com", "role": "employee"}'
```

**Development & Testing**:

```bash
# Run backend tests
cd lifo_api && pytest

# Run frontend development server
npm run dev
```

## 📊 API Endpoints

### Store Management

- `GET /api/stores` - Get user's stores
- `POST /api/stores` - Create new store

### Core Inventory Management (🔐 Auth Required)

- `GET /api/inventory` - Paginated inventory with filtering
- `POST /api/inventory/upload` - CSV file upload and processing
- `GET /api/alerts` - High-priority inventory alerts
- `GET /api/csv/sample` - Download CSV template

### Analytics & Business Intelligence (🔐 Auth Required)

- `GET /api/analytics` - Comprehensive analytics and KPIs
- `POST /api/business/check` - Business validation and checks

### Authentication & User Management

- `POST /api/auth/pin-session` - PIN-based authentication for store employees
- `POST /api/employees/create` - Create new store employee
- `POST /api/email/send-pin-reset` - Send PIN reset email
- `POST /api/email/send-welcome` - Send welcome email

### FastAPI Backend Endpoints (`/api/v1/`)

- `POST /api/v1/analytics` - Advanced analytics processing
- `POST /api/v1/csv-upload` - Secure CSV processing
- `GET /api/v1/donations` - Donation workflow management
- `POST /api/v1/mobile-endpoints` - Mobile app integration

### Product Scanning Endpoints (`/api/v1/`) ✅ NEW

- `POST /api/v1/product-scanning/scan/{store_id}` - Complete product scanning with AI
- `POST /api/v1/scan-sessions/create/{store_id}` - Scan session management
- `POST /api/v1/product-enrichment/enrich/{store_id}` - Product data enrichment
- `POST /api/v1/batch-creation/create-from-scan/{store_id}` - Inventory batch creation

### CSV Format

Expected CSV columns:

```
SKU,Product_Name,Category,Quantity,Cost_Price,Selling_Price,Expiry_Date,Batch_Number,Manufacture_Date,Location
```

### Advanced Features

- Multi-tenant store management with role-based access
- PIN-based authentication for store employees
- Real-time inventory tracking and batch management
- **AI-Powered Product Scanning** with Google Vision API ✅ NEW
- **Automated Product Enrichment** with OpenFoodFacts integration ✅ NEW
- **Smart Barcode Recognition** and expiry date extraction ✅ NEW
- Comprehensive CSV validation and processing
- Donation workflow management and tracking
- Multi-language support (English, French, Dutch)

## 🔍 Core Features

### Inventory Management

- **Batch-level tracking** with LIFO methodology
- **Product categorization** with global product catalog
- **Expiry date monitoring** and alert system
- **Multi-store inventory** with tenant isolation

### Data Processing Pipeline

- **Secure CSV upload** with comprehensive validation
- **Business rule enforcement** for inventory consistency
- **Category normalization** with standardized taxonomies
- **Batch processing** with error handling and rollback

### Authentication & Security

- **Supabase Auth integration** with JWT validation
- **Row Level Security (RLS)** for multi-tenant data isolation
- **PIN-based employee access** for store operations
- **Comprehensive middleware** for CORS, rate limiting, and security headers

## 📈 Business Impact

### Key Metrics Tracked

- **Inventory Efficiency**: Real-time batch tracking and expiry monitoring
- **Operational Insights**: Store performance and product movement analytics
- **Donation Tracking**: Coordinated food rescue and waste reduction efforts
- **Employee Productivity**: Streamlined workflows with PIN-based access

### Current Capabilities

- **Multi-store management** with unified inventory tracking
- **Automated CSV processing** for inventory updates
- **Real-time dashboard** for inventory insights
- **Donation coordination** for food rescue initiatives
- **Comprehensive audit trails** for compliance and analysis

## 🔧 Development Workflow

### Database Changes

1. **Modify schema** in Supabase Dashboard
2. **Update types**: `npm run update-types`
3. **Update models** in `lifo_ai_core/database/models.py`
4. **Test changes** with sample data

### Backend Development

1. **Update FastAPI models** in `lifo_api/app/models/`
2. **Test API endpoints** with `pytest`
3. **Validate authentication** and authorization logic

### Database Management

- **Monitor migrations** in `supabase/migrations/`
- **Track RLS policies** for multi-tenant security
- **Backup critical data** before major changes

### Testing & Quality Assurance

- **Run comprehensive test suite** with 124+ tests across all layers
- **Product Scanning Tests**: Unit, integration, API, and E2E validation
- **Performance Benchmarks**: Latency, throughput, and stress testing
- **Security Testing**: Authentication, rate limiting, input sanitization
- **Test CSV processing** with various data formats
- **Validate multi-tenant isolation** and permissions

#### Running Product Scanning Tests

```bash
cd lifo_api

# Run all product scanning tests
python -m pytest tests/ -v

# Run specific test categories
python -m pytest tests/unit/ -v                    # Unit tests (46 tests)
python -m pytest tests/integration/ -v             # Integration tests (25 tests)
python -m pytest tests/api/ -v                     # API tests (35 tests)
python -m pytest tests/e2e/ -v                     # E2E tests (18 tests)
```

## 🚀 Deployment

### Production Environment

```bash
# Build and deploy
npm run build
npm run start

# Ensure Python dependencies in production
pip install -r requirements.txt --production
```

### Environment Variables (Production)

```env
NEXT_PUBLIC_SUPABASE_URL=production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
SUPABASE_SERVICE_ROLE_KEY=production-service-key
DB_PASSWORD=production-db-password
WEATHER_API_KEY=optional-weather-key
```

### Database Maintenance

Set up regular maintenance tasks:

```bash
# Database backup (recommended daily)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Log rotation for FastAPI
logrotate /var/log/lifo_api.log

# Monitor application health
curl -f http://localhost:3000/api/health || alert-system
```

## 🚀 Deployment

LIFO.AI uses a **single deployment architecture** for simplified operations:

- **Frontend + API**: Deploy to Vercel with integrated backend
- **Database**: Supabase managed PostgreSQL with migrations
- **All-in-one**: No microservice complexity, unified codebase

**📖 See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed deployment guide**

## 📚 Documentation

Comprehensive documentation is organized in the `docs/` folder:

- **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.MD)**: System overview and design
- **[Python Development](docs/PYTHON_DEVELOPMENT.md)**: Backend development guide
- **[API Documentation](docs/API_DOCUMENTATION.md)**: Endpoint reference
- **[Deployment Guide](docs/DEPLOYMENT.md)**: Production deployment
- **[Security Guide](docs/LIFO_API_SECURITY_GUIDE.md)**: Security implementation

### Product Scanning Documentation ✅ NEW

- **[Product Scanning Demo Setup](docs/PRODUCT_SCANNING_DEMO_SETUP.md)**: Complete setup and testing guide
- **[Frontend Scanning API Spec](docs/FRONTEND_SCANNING_API_SPEC.md)**: API specifications for frontend
- **[Product Scanning Test Guide](docs/PRODUCT_SCANNING_TEST_GUIDE.md)**: Comprehensive testing documentation
- **[Product Scanning Implementation Plan](docs/PRODUCT_SCANNING_OCR_PLAN.md)**: Implementation status and roadmap

## 🌟 Team

**LIFO.AI** - Transforming food retail through intelligent inventory management.

---

**Built with ❤️ for a sustainable future** 🌱
