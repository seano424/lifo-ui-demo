# LIFO AI - Complete Documentation

**Intelligent Food Waste Management Platform**

Transform inventory management from reactive to predictive, reducing food waste through AI-driven insights.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Overview](#system-overview)
3. [Development Setup](#development-setup)
4. [Architecture](#architecture)
5. [API Reference](#api-reference)
6. [Authentication](#authentication)
7. [European Pilot System](#european-pilot-system)
8. [Production Deployment](#production-deployment)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Git
- Supabase account

### Get Running in 5 Minutes

```bash
# 1. Clone repository
git clone <repository-url>
cd lifo-app

# 2. Backend setup
cd lifo_api
pip install -r requirements.txt

# 3. Configure environment
# Create .env file with:
DATABASE_URL=postgresql://user:password@host:port/database
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 4. Start backend
uvicorn app.main:app --reload

# 5. Start frontend (new terminal)
cd ../
npm install
npm run dev
```

**Verify Setup:**
- API: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Health check: `curl http://localhost:8000/api/v1/health`

---

## System Overview

### Key Features
- **AI-Powered Scoring**: Multi-factor inventory scoring with intelligent recommendations
- **Mobile-Optimized**: Sub-300ms response times for mobile scanning interfaces
- **Google Vision OCR**: Automated barcode scanning and expiry date extraction
- **Real-time Analytics**: Comprehensive store performance metrics
- **European Pilot**: Advanced donation management with bulk quantity awareness
- **Modern Security**: Supabase API key authentication with Row Level Security

### Architecture Overview

```
lifo-app/
├── app/                      # Next.js Frontend
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── (marketing)/         # Public marketing pages
│   ├── api/                 # API route handlers
│   └── components/          # Reusable UI components
├── components/              # Shared React components
├── lib/                    # Utility functions & database
├── lifo_api/               # FastAPI Backend Service
│   ├── app/
│   │   ├── core/           # Business logic (consolidated)
│   │   │   ├── auth.py     # Supabase authentication
│   │   │   ├── scoring.py  # AI scoring system
│   │   │   └── donation_engine.py  # European pilot system
│   │   ├── api/v1/        # 65+ API endpoints
│   │   └── database/      # Database models & operations
│   └── tests/             # Test suites
└── supabase/              # Database schema & migrations
```

### Core Components
- **Frontend (Next.js)**: Mobile-optimized interface with real-time scanning
- **Backend API (FastAPI)**: High-performance Python API with consolidated core logic
- **European Pilot System**: Advanced donation management with bulk quantity awareness
- **Database (Supabase)**: PostgreSQL with API key authentication and Row Level Security

---

## Development Setup

### Environment Configuration

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

### Supabase Setup

1. Create a Supabase project at https://supabase.com
2. Get your project URL and API keys from Settings > API
3. Update the `.env` file with your credentials
4. Run database migrations (if applicable)

### Verification Tests

**Health Check:**
```bash
curl http://localhost:8000/api/v1/health
```

**Authentication Test:**
```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
     http://localhost:8000/api/v1/auth/health
```

**European Pilot System Test:**
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

---

## Architecture

### Data Flow

#### Authentication Flow
1. Client requests with Supabase API key in Authorization header
2. Backend validates key with Supabase API
3. User information extracted and permissions checked
4. Request processed with user context

#### Scanning Workflow
1. Mobile client captures barcode/image
2. Frontend sends to OCR endpoint
3. Google Vision API processes image
4. Product information extracted and scored
5. Donation recommendations generated
6. Results returned to client

#### European Pilot Donation System
1. Batch data analyzed for donation suitability
2. Bulk quantity thresholds applied
3. AI scoring (0-1 scale) integrated
4. Donation priority calculated
5. Recipient recommendations provided
6. Action tracking recorded

### Performance Optimizations

#### Mobile Performance
- **Sub-300ms Response Times**: Optimized for mobile scanning
- **Lightweight Responses**: Minimal data transfer
- **Caching Strategy**: Server-side caching with configurable TTL
- **Connection Pooling**: Efficient database connections

#### European Pilot System
- **Bulk Processing**: Optimized for large quantity analysis
- **In-memory Calculations**: Fast recommendation generation
- **Configurable Thresholds**: European market-specific settings
- **Scalable Architecture**: Ready for multi-region deployment

### Security Considerations

#### Authentication Security
- **API Key Validation**: Supabase-backed token verification
- **Request Monitoring**: Authentication event tracking
- **Rate Limiting**: Protection against brute force attacks
- **Secure Headers**: CORS and security headers configured

#### Data Protection
- **Row Level Security**: Database-level access control
- **Input Validation**: Pydantic model validation
- **SQL Injection Prevention**: Parameterized queries
- **Environment Isolation**: Secure configuration management

---

## API Reference

**Base URL**: `http://localhost:8000/api/v1`
**Authentication**: Supabase API key in Authorization header
**Interactive Docs**: http://localhost:8000/docs

### Core Endpoints by Category

#### Health & Monitoring (8 endpoints)
- `GET /health` - Basic health check
- `GET /health/supabase` - Supabase connection status
- `GET /health/database` - Database health
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /health/performance` - Performance metrics
- `GET /health/mobile-performance` - Mobile-specific metrics
- `GET /metrics` - System metrics

#### Authentication & Security (6 endpoints)
- `GET /security/statistics` - Security statistics
- `GET /auth/health` - Authentication system health
- `GET /auth/metrics` - Authentication metrics
- `GET /auth/security-report` - Security report
- `GET /security/threats` - Threat detection
- `GET /security/health` - Security system health

#### Batch Management (4 endpoints)
- `POST /batch-creation/create/{store_id}` - Create new batch
- `GET /batch-creation/batches/{store_id}` - List batches
- `POST /batch-creation/validate/{store_id}` - Validate batch data
- `GET /batch-creation/templates` - Batch templates

#### Analytics & Reporting (10 endpoints)
- `GET /analytics/store/{store_id}` - Store analytics
- `GET /analytics/dashboard/{store_id}` - Dashboard data
- `GET /analytics/performance/{store_id}` - Performance metrics
- `GET /analytics/trends/{store_id}` - Trend analysis
- `GET /analytics/exports/{store_id}` - Export data
- `GET /mvp-analytics/mvp-metrics/{store_id}` - MVP metrics
- `GET /mvp-analytics/batch-insights/{store_id}` - Batch insights
- `GET /mvp-analytics/scan-workflow-stats/{store_id}` - Workflow stats
- `GET /mvp-analytics/waste-prevention-impact/{store_id}` - Impact metrics
- `GET /mvp-analytics/action-effectiveness/{store_id}` - Action effectiveness

#### Mobile Endpoints (5 endpoints)
- `GET /mobile-endpoints/mobile-summary/{store_id}` - Mobile batch summary
- `POST /mobile-endpoints/batch-quick-score/{batch_id}` - Quick batch scoring
- `GET /mobile-endpoints/store-health/{store_id}` - Store health for mobile
- `GET /mobile-endpoints/batch-list-mobile/{store_id}` - Mobile batch list
- `GET /mobile-endpoints/mobile-performance-health` - Mobile performance

#### Scanning & OCR (10 endpoints)
- `POST /scan-workflows/debug-scan/{store_id}` - Debug scanning
- `POST /scan-workflows/scan-in/{store_id}` - Scan in products
- `POST /scan-workflows/scan-out/{store_id}/{batch_id}` - Scan out products
- `POST /scan-workflows/process-scan/{store_id}` - Process scan results
- `POST /image-recognition/analyze-image/{store_id}` - Image analysis
- `POST /image-recognition/extract-expiry-date/{store_id}` - Expiry extraction
- `GET /image-recognition/ml-models/status` - ML model status
- `POST /product-scanning/scan/ocr-expiry/{store_id}` - OCR expiry scanning
- `POST /product-scanning/scan/full-ocr/{store_id}` - Full OCR scanning
- `POST /product-scanning/scan/text-extraction/{store_id}` - Text extraction

#### Donation Management (11 endpoints)
- `POST /donations/create` - Create donation record
- `GET /donations/list` - List donations
- `GET /donation-preferences/preferences/{store_id}` - Get preferences
- `PUT /donation-preferences/preferences/{store_id}` - Update preferences
- `GET /donation-queries/recipients` - List recipients
- `GET /donation-queries/actions` - List actions
- `GET /donation-queries/analytics/summary` - Analytics summary
- `GET /donation-queries/compliance/alerts` - Compliance alerts
- `GET /donation-queries/analytics/kpi` - Donation KPIs
- `POST /scan-workflows/scan-donation-check/{store_id}/{batch_id}` - Check donations
- `POST /scan-workflows/scan-donation-action/{store_id}/{batch_id}` - Donation actions

#### CSV Processing (7 endpoints)
- `POST /csv-upload/upload` - Upload CSV file
- `GET /csv-upload/template` - Download CSV template
- `POST /csv-upload/validate` - Validate CSV data
- `POST /csv-upload/upload-and-create-batches` - Upload and create batches
- `POST /csv/validate/{store_id}` - Validate CSV for store
- `GET /csv/template` - Get CSV template
- `POST /csv/analyze/{store_id}` - Analyze CSV data

#### Scoring System (4 endpoints)
- `POST /scoring/batch/{store_id}` - Score batch
- `GET /scoring/alerts/{store_id}` - Get scoring alerts
- `GET /scoring/recommendations/{store_id}` - Get recommendations
- `GET /scoring/analytics/{store_id}` - Scoring analytics

### Authentication

All API endpoints require Supabase API key authentication:

```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_API_KEY" \
     -H "Content-Type: application/json" \
     http://localhost:8000/api/v1/endpoint
```

### Error Handling

Standard HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

---

## Authentication

### Supabase API Key System

LIFO uses modern Supabase API key authentication instead of legacy JWT tokens.

#### Configuration
```bash
# In .env file
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### Permission System
- **Owner**: Full access to store and all operations
- **Manager**: Management operations, analytics, and reporting  
- **Staff**: Basic operations and scanning workflows
- **Viewer**: Read-only access to basic information

#### Multi-schema Access
- **Store-specific**: Access to specific store data
- **Global Products**: Access to global product database
- **Donations**: European pilot donation system access

---

## European Pilot System

### Donation Engine Features

The European pilot includes advanced donation management capabilities:

#### Bulk Quantity Awareness
- Handles 100+ unit batches efficiently
- European market-specific thresholds
- Optimized for bulk donation scenarios

#### AI-Powered Recommendations
- Integrated AI scoring (0-1 scale)
- Multi-factor analysis including:
  - Days until expiry
  - Product category suitability
  - Quantity thresholds
  - Market conditions

#### Recipient Management
- **Food Banks**: Primary donation recipients
- **Charities**: Secondary recipients for suitable items
- **Community Groups**: Local distribution networks

#### Example Usage

```python
from app.core.donation_engine import SimplifiedDonationEngine

# Initialize engine
engine = SimplifiedDonationEngine()

# Analyze batch for donation
batch_data = {
    'category': 'Food',
    'sub_category': 'Dairy',
    'quantity': 150,  # Bulk quantity
    'days_until_expiry': 3,
    'product_name': 'Organic Milk'
}

# Get recommendation with AI score
ai_score = 0.82  # AI-generated score (0-1)
recommendation = engine.evaluate_action_recommendation(batch_data, ai_score)

print(f"Action: {recommendation.recommended_action}")
print(f"Priority: {recommendation.priority}")
print(f"Recipients: {recommendation.suggested_recipient_types}")
print(f"Estimated Value: ${recommendation.estimated_recovered_value}")
```

#### Compliance Features
- EU food safety compliance tracking
- Audit trail for all donation activities
- Regulatory reporting capabilities
- Quality assurance workflows

---

## Production Deployment

### Environment Setup

**Production Environment Variables:**
```bash
# Production Database
DATABASE_URL=postgresql://prod_user:password@prod_host:5432/prod_db

# Supabase Production
SUPABASE_URL=https://your-prod-project.supabase.co
SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key

# Application
ENVIRONMENT=production
DEBUG=false
API_VERSION=1.0.0

# Security
ALLOWED_HOSTS=your-domain.com,api.your-domain.com
CORS_ORIGINS=https://your-app.com,https://admin.your-app.com
```

### Deployment Steps

1. **Environment Preparation**
   ```bash
   # Set production environment variables
   export ENVIRONMENT=production
   export DEBUG=false
   ```

2. **Database Migration**
   ```bash
   # Run database migrations
   alembic upgrade head
   ```

3. **Application Deployment**
   ```bash
   # Install production dependencies
   pip install -r requirements.txt
   
   # Start with production settings
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

4. **Frontend Deployment**
   ```bash
   # Build production frontend
   npm run build
   npm start
   ```

### Production Checklist

#### Security
- [ ] API keys configured securely
- [ ] HTTPS enabled
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation active
- [ ] SQL injection protection verified

#### Performance
- [ ] Database connection pooling configured
- [ ] Caching enabled with appropriate TTL
- [ ] Mobile response times < 300ms verified
- [ ] Load testing completed
- [ ] Memory usage optimized

#### Monitoring
- [ ] Health checks responding
- [ ] Performance metrics collection active
- [ ] Error logging configured
- [ ] Authentication monitoring enabled
- [ ] Database performance monitoring active

#### European Pilot
- [ ] Donation engine functional
- [ ] Bulk quantity processing verified
- [ ] Compliance reporting active
- [ ] Recipient management configured
- [ ] EU regulatory requirements met

---

## Troubleshooting

### Common Setup Issues

#### Authentication Errors
**Symptom**: `401 Unauthorized` responses
**Solutions**:
- Verify Supabase keys are correct
- Check that `SUPABASE_URL` includes `https://`
- Ensure service role key has proper permissions
- Verify API key format and expiration

#### Database Connection Issues
**Symptom**: Database connection errors
**Solutions**:
- Verify `DATABASE_URL` format and credentials
- Check network connectivity to database
- Ensure database exists and is accessible
- Verify connection pool configuration

#### Import Errors
**Symptom**: Module import failures
**Solutions**:
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check Python version (3.11+ required)
- Ensure you're in the `lifo_api` directory
- Verify no `lifo_ai_core` references remain

#### European Pilot System Issues
**Symptom**: Donation engine errors
**Solutions**:
- Verify core modules accessible: `python -c "from app.core.donation_engine import SimplifiedDonationEngine"`
- Check that consolidation is complete
- Verify AI score is between 0-1
- Ensure batch data has required fields

#### Performance Issues
**Symptom**: Slow response times
**Solutions**:
- Check database query performance
- Verify caching is enabled
- Monitor connection pool usage
- Review mobile endpoint optimizations
- Check network latency

#### Frontend Integration Issues
**Symptom**: Frontend cannot connect to API
**Solutions**:
- Verify API is running on correct port (8000)
- Check CORS configuration
- Verify API base URL in frontend
- Ensure authentication tokens are passed correctly

### Debug Commands

**System Health:**
```bash
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/health/database
curl http://localhost:8000/api/v1/health/supabase
```

**Authentication Test:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/auth/health
```

**Performance Check:**
```bash
curl http://localhost:8000/api/v1/health/performance
curl http://localhost:8000/api/v1/health/mobile-performance
```

**European Pilot Verification:**
```python
# Test donation engine
python -c "
from app.core.donation_engine import SimplifiedDonationEngine
engine = SimplifiedDonationEngine()
print('Donation engine initialized successfully')
"
```

### Getting Help

- **API Issues**: Check interactive docs at http://localhost:8000/docs
- **Authentication**: Verify Supabase configuration and permissions
- **Performance**: Monitor health endpoints and system metrics
- **European Pilot**: Verify consolidation and core module access

---

## Additional Resources

### Development Tools
- **API Documentation**: http://localhost:8000/docs
- **Database Admin**: Supabase dashboard
- **Performance Monitoring**: Built-in health endpoints
- **Interactive Testing**: Swagger UI at `/docs`

### External Integrations
- **Google Vision API**: OCR and image processing
- **Supabase**: Authentication and database
- **OpenFoodFacts API**: Product information enrichment

### Support
- Architecture questions: See Architecture section above
- API questions: Check API Reference section
- Setup issues: See Troubleshooting section
- Production deployment: See Production Deployment section

---

*This documentation reflects the current consolidated architecture with backend consolidated into `lifo_api/app/core` and Supabase API key authentication. Last updated: September 2025.*