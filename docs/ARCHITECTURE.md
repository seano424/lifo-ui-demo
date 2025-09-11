# LIFO Architecture

Technical architecture overview for the LIFO AI food waste management platform.

## System Overview

LIFO is a full-stack application built with Next.js frontend and FastAPI backend, designed for intelligent inventory management and food waste reduction.

### Core Technologies

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.11+, Pydantic
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase API keys with Row Level Security
- **AI/ML**: Custom scoring algorithms, Google Vision OCR

## Architecture Components

### Frontend (Next.js)
```
app/
├── (dashboard)/          # Protected dashboard routes
├── (marketing)/          # Public marketing pages
├── api/                 # API route handlers (Next.js API routes)
└── components/          # Reusable UI components

components/              # Shared React components
├── batches/            # Batch management UI
├── dashboard/          # Dashboard widgets
├── scanning/           # Mobile scanning interfaces
└── ui/                # Base UI components

lib/                    # Utility functions
├── database/          # Frontend database operations
├── services/          # API client functions
└── utils/            # Helper functions
```

### Backend (FastAPI)
```
lifo_api/
├── app/
│   ├── core/              # Core business logic (consolidated)
│   │   ├── auth.py        # Supabase authentication
│   │   ├── config.py      # Application configuration
│   │   ├── scoring.py     # AI scoring system
│   │   └── donation_engine.py  # European pilot donation system
│   ├── api/v1/           # API endpoints (65+ endpoints)
│   │   ├── analytics.py   # Analytics & reporting
│   │   ├── batch_creation.py  # Batch management
│   │   ├── csv_upload.py  # CSV processing
│   │   ├── health.py      # System health checks
│   │   ├── mobile_endpoints.py  # Mobile-optimized APIs
│   │   ├── scanning.py    # OCR & scanning workflows
│   │   └── security.py    # Authentication endpoints
│   ├── database/         # Database operations
│   │   ├── models.py     # SQLAlchemy models
│   │   ├── connection.py # Database connection
│   │   └── operations.py # Database operations
│   └── auth/            # Authentication system
│       ├── supabase_api_key_auth.py  # Supabase API key handling
│       └── monitoring.py # Auth monitoring
└── tests/              # Test suites
```

## Data Flow

### Authentication Flow
1. Client requests with Supabase API key in Authorization header
2. Backend validates key with Supabase API
3. User information extracted and permissions checked
4. Request processed with user context

### Scanning Workflow
1. Mobile client captures barcode/image
2. Frontend sends to OCR endpoint
3. Google Vision API processes image
4. Product information extracted and scored
5. Donation recommendations generated
6. Results returned to client

### European Pilot Donation System
1. Batch data analyzed for donation suitability
2. Bulk quantity thresholds applied
3. AI scoring (0-1 scale) integrated
4. Donation priority calculated
5. Recipient recommendations provided
6. Action tracking recorded

## Key Design Patterns

### Authentication
- **Supabase API Keys**: Modern token-based authentication
- **Row Level Security**: Database-level access control
- **Permission System**: Role-based access (owner, manager, staff, viewer)
- **Multi-schema Access**: Store-specific, global products, donations

### API Design
- **RESTful Endpoints**: Standard HTTP methods and status codes
- **Pydantic Models**: Type-safe request/response validation
- **Error Handling**: Consistent error response format
- **Rate Limiting**: Protection against API abuse
- **Caching**: Performance optimization with TTL

### Database Architecture
- **Multi-tenant**: Store-level data isolation
- **Audit Trails**: Action tracking for compliance
- **Optimized Queries**: Indexed for mobile performance
- **Migration System**: Version-controlled schema changes

## Performance Optimizations

### Mobile Performance
- **Sub-300ms Response Times**: Optimized for mobile scanning
- **Lightweight Responses**: Minimal data transfer
- **Caching Strategy**: Server-side caching with configurable TTL
- **Connection Pooling**: Efficient database connections

### European Pilot System
- **Bulk Processing**: Optimized for large quantity analysis
- **In-memory Calculations**: Fast recommendation generation
- **Configurable Thresholds**: European market-specific settings
- **Scalable Architecture**: Ready for multi-region deployment

## Security Considerations

### Authentication Security
- **API Key Validation**: Supabase-backed token verification
- **Request Monitoring**: Authentication event tracking
- **Rate Limiting**: Protection against brute force attacks
- **Secure Headers**: CORS and security headers configured

### Data Protection
- **Row Level Security**: Database-level access control
- **Input Validation**: Pydantic model validation
- **SQL Injection Prevention**: Parameterized queries
- **Environment Isolation**: Secure configuration management

## Deployment Architecture

### Development
- **Local Database**: PostgreSQL via Supabase
- **Hot Reload**: FastAPI and Next.js development servers
- **Environment Variables**: `.env` file configuration

### Production
- **Containerized Deployment**: Docker containers
- **Load Balancing**: Multiple API instances
- **Database**: Managed PostgreSQL (Supabase)
- **CDN**: Static asset delivery
- **Monitoring**: Health checks and metrics

## European Pilot Considerations

### Donation System Features
- **Bulk Quantity Awareness**: Handles 100+ unit batches
- **European Thresholds**: Market-specific donation criteria  
- **Compliance Tracking**: EU food safety compliance
- **Multi-recipient Support**: Food banks, charities, community groups

### Scalability
- **Multi-region Ready**: Architecture supports EU expansion
- **Configurable Settings**: Country-specific thresholds
- **Language Support**: Prepared for localization
- **Performance Targets**: Sub-second response times

## API Overview

### Core Endpoints
- **Health & Monitoring** (8 endpoints): System status and diagnostics
- **Authentication & Security** (6 endpoints): User management and security
- **Batch Management** (4 endpoints): Inventory batch operations
- **Analytics & Reporting** (10 endpoints): Business intelligence
- **Mobile Endpoints** (5 endpoints): Mobile-optimized APIs
- **Scanning & OCR** (10 endpoints): Image processing workflows
- **Donation Management** (11 endpoints): European pilot system
- **CSV Processing** (7 endpoints): Bulk data import/export
- **Database Monitoring** (10 endpoints): Internal system monitoring

### API Standards
- **Base URL**: `/api/v1`
- **Authentication**: Supabase API key in Authorization header
- **Content Type**: JSON request/response
- **Error Format**: Consistent HTTP status codes and error messages
- **Documentation**: OpenAPI/Swagger at `/docs`

## Future Considerations

### Scalability
- **Microservices**: Potential service decomposition
- **Event Streaming**: Real-time data processing
- **Multi-region**: European expansion support
- **API Gateway**: Centralized API management

### Technology Evolution
- **ML Pipeline**: Enhanced AI scoring models
- **Real-time Updates**: WebSocket integration
- **Mobile Apps**: Native iOS/Android development
- **Advanced Analytics**: Business intelligence platform

This architecture supports the current European pilot deployment while providing a foundation for future expansion and enhancement.