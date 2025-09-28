# LIFO AI Engine API

## Overview

The LIFO AI Engine is an enterprise-ready inventory management system designed to minimize waste and maximize efficiency in retail operations. Using advanced AI algorithms and real-time analytics, it provides intelligent recommendations for inventory optimization, focusing on Last-In-First-Out (LIFO) principles tailored for perishable goods management.

### Key Features

- **AI-Powered Scoring**: Advanced urgency scoring algorithms considering expiry dates, sales velocity, and profit margins
- **Multi-Store Support**: Phase 3 MVP architecture optimized for 5-10 stores
- **Mobile Optimization**: Sub-200ms response times for mobile endpoints
- **Real-Time Analytics**: Comprehensive dashboards and performance metrics
- **Smart Recommendations**: Intelligent discount and donation recommendations
- **CSV Processing**: Secure bulk data import with validation
- **Image Recognition**: OCR and product identification capabilities
- **European Compliance**: GDPR and EU food waste regulations support

## Architecture

### Phase 3 Multi-Store MVP

The system has evolved through three phases:
- **Phase 1**: Core LIFO algorithm implementation
- **Phase 2**: Performance optimization achieving >1000 ops/second
- **Phase 3**: Multi-tenant enterprise architecture (current)

### System Architecture

```
Frontend Applications
    ├── Mobile Apps (iOS/Android)
    ├── Web Dashboard
    └── POS Integration
           │
           ↓
      API Gateway
    (Authentication & Routing)
           │
           ↓
    LIFO AI Engine API
    ├── Inventory Management
    ├── Scoring Engine
    ├── Analytics Service
    ├── Mobile Endpoints
    └── Batch Processing
           │
           ↓
    Data Layer
    ├── PostgreSQL (Primary)
    ├── In-Memory Caching (MVP)
    └── Local/Cloud File Storage
```

### Performance Metrics

- **Mobile Response Time**: <200ms (achieved)
- **API Response Time**: <500ms for complex operations
- **Bulk Operations**: <100ms per 25 items
- **CSV Processing**: 8 seconds for 1000 rows
- **Database Throughput**: >1000 operations/second
- **Cache Hit Rate**: >85% (in-memory MVP cache)

## Phase 3 MVP Features

### Multi-Store Analytics

The Phase 3 implementation introduces comprehensive multi-store analytics designed for 5-10 store operations:

#### 🔥 **Core Endpoints**
- **`/api/v1/multi-store/overview`** - Aggregated store metrics with 10x performance improvement
- **`/api/v1/multi-store/comparison`** - Performance comparison across stores
- **`/api/v1/multi-store/alerts`** - Cross-store alerting system
- **`/api/v1/multi-store/performance-metrics`** - KPI tracking and analytics

#### ⚡ **Performance Optimizations**
- **Concurrent Processing**: `asyncio.gather()` for 10x faster store processing
- **Smart Caching**: In-memory TTL cache with automatic cleanup
- **Memory Efficient**: `__slots__` optimization for reduced memory footprint
- **Type Safety**: Complete type annotations for production reliability

#### 🚀 **Deployment Ready**
- **Docker Containerization**: Multi-stage optimized builds
- **Digital Ocean App Platform**: Auto-scaling 1-3 instances configuration
- **CI/CD Pipeline**: Automated GitHub Actions deployment
- **Health Monitoring**: Comprehensive endpoint health checks

## Quick Start

### Prerequisites

- Python 3.11 or higher
- PostgreSQL 14+
- Supabase account (or PostgreSQL 14+)
- Docker (optional)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/lifo-api.git
cd lifo-api
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Initialize the database:
```bash
alembic upgrade head
python scripts/init_db.py
```

6. Run the application:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Setup

```bash
docker-compose up -d
```

## API Documentation

### Interactive Documentation

Once running, access the interactive API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Key Endpoints

#### Mobile Endpoints (Optimized for <200ms)
- `GET /api/v1/mobile-summary/{store_id}` - Store inventory summary
- `GET /api/v1/batch-quick-score/{batch_id}` - Quick batch scoring
- `GET /api/v1/store-health/{store_id}` - Store health metrics

#### Inventory Management
- `POST /api/v1/inventory/batch` - Create inventory batch
- `GET /api/v1/inventory/batches` - List inventory batches
- `PUT /api/v1/inventory/batch/{batch_id}` - Update batch
- `DELETE /api/v1/inventory/batch/{batch_id}` - Remove batch

#### Analytics & Scoring
- `POST /api/v1/scoring/calculate` - Calculate urgency scores
- `GET /api/v1/analytics/store/{store_id}` - Store analytics
- `GET /api/v1/analytics/trends` - Trend analysis

#### Data Processing
- `POST /api/v1/csv/upload` - Upload CSV data
- `POST /api/v1/csv/validate` - Validate CSV format
- `GET /api/v1/csv/template` - Download CSV template

#### Optimized Write Operations
- `POST /api/v1/unified-writes/inventory/bulk-operations` - Bulk operations
- `POST /api/v1/unified-writes/mobile/sync` - Mobile data sync
- `POST /api/v1/unified-writes/analytics/scoring/bulk-write` - Bulk scoring

### Authentication

The API uses API key authentication with store-level authorization:

```bash
curl -H "X-API-Key: your-api-key" https://api.lifo.ai/v1/inventory/batches
```

## Development

### Project Structure

```
lifo_api/
├── app/
│   ├── api/           # API endpoints
│   │   └── v1/        # Version 1 endpoints
│   ├── core/          # Core functionality
│   │   ├── config.py  # Configuration
│   │   ├── security/  # Security modules
│   │   └── etl/       # Data processing
│   ├── database/      # Database models
│   ├── models/        # Pydantic models
│   ├── services/      # Business logic
│   └── utils/         # Utilities
├── tests/             # Test suite
│   ├── unit/          # Unit tests
│   ├── integration/   # Integration tests
│   ├── performance/   # Performance tests
│   └── security/      # Security tests
├── docs/              # Documentation
├── scripts/           # Utility scripts
└── requirements.txt   # Dependencies
```

### Testing

Run the comprehensive test suite:

```bash
# All tests
pytest tests/ -v

# Unit tests only
pytest tests/unit/ -v

# Performance tests
pytest tests/performance/ -v -m performance

# Security tests
pytest tests/security/ -v -m security

# With coverage
pytest tests/ -v --cov=app --cov-report=html
```

### Code Quality

```bash
# Linting
ruff check app/

# Type checking
mypy app/

# Security scan
bandit -r app/

# Format code
black app/
```

## Performance Optimizations

### Database Optimizations

- **Connection Pooling**: Optimized pools for different operation types
- **Bulk Operations**: Chunked processing with COPY operations
- **Indexes**: Composite indexes for common query patterns
- **Materialized Views**: Pre-computed analytics aggregations

### Caching Strategy

- **Multi-tier Caching**: Memory → Redis → Database
- **Bounded Cache**: LRU eviction for mobile endpoints (max 1000 items)
- **Smart Invalidation**: Dependency-based cache invalidation
- **Write-Behind Processing**: Asynchronous batch processing

### Mobile Optimizations

- **Response Compression**: Gzip/Brotli for large responses
- **Progressive Loading**: Critical data first
- **Offline Sync**: Conflict resolution for mobile data
- **Network-Aware**: Adaptive optimization based on connection quality

## Deployment

### Production Deployment

1. **Environment Configuration**:
```bash
export ENVIRONMENT=production
export DATABASE_URL=postgresql://user:pass@host/db
export REDIS_URL=redis://host:6379
export SECRET_KEY=your-secret-key
```

2. **Database Migrations**:
```bash
alembic upgrade head
```

3. **Start with Gunicorn**:
```bash
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes Deployment

See `docs/deployment/kubernetes.yaml` for complete K8s manifests.

## Monitoring

### Health Checks

- `GET /health` - Basic health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

### Metrics

Prometheus metrics available at `/metrics`:
- Request latency histograms
- Operation counters
- Error rates
- Database connection pool metrics
- Cache hit/miss ratios

### Logging

Structured JSON logging with correlation IDs:
```python
logger.info("Operation completed", extra={
    "operation": "batch_create",
    "store_id": store_id,
    "duration_ms": duration,
    "correlation_id": request_id
})
```

## Security

### Security Features

- **CSV Security**: Formula injection prevention
- **API Authentication**: API key with store-level authorization
- **CORS Protection**: Configurable origin validation
- **Input Validation**: Comprehensive sanitization
- **Rate Limiting**: Endpoint-specific limits
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content security headers

### Security Testing

Regular security audits using:
- OWASP ZAP
- Bandit
- Safety
- Custom security test suite

## Documentation

### Technical Documentation

Detailed technical documentation available in the `docs/` directory:

- [Algorithm Optimization Analysis](docs/algorithm_optimization_analysis.md)
- [Performance Optimization Guide](docs/performance_optimization.md)
- [Database Write Optimization](docs/database_optimization.md)
- [Testing Strategy](docs/testing_strategy.md)
- [API Consolidation Guide](docs/api_consolidation.md)
- [Phase 3 Architecture](docs/phase3_architecture.md)

## Deployment

### Digital Ocean App Platform (Recommended for MVP)

The application is optimized for Digital Ocean App Platform deployment:

```bash
# 1. Build and deploy using the included configuration
doctl apps create --spec .do/app.yaml

# 2. Monitor deployment
doctl apps list
```

The `.do/app.yaml` configuration includes:
- Auto-scaling (1-3 instances)
- Health checks on `/health`
- Environment variable management
- Automatic HTTPS

### Docker Deployment

```bash
# Build optimized production image
docker build -t lifo-api:latest .

# Run with environment variables
docker run -d \
  -p 8000:8000 \
  -e SUPABASE_URL=${SUPABASE_URL} \
  -e SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY} \
  --name lifo-api \
  lifo-api:latest
```

### Environment Variables

Required for production deployment:

```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Application Settings
ENVIRONMENT=production
LOG_LEVEL=info

# Optional: External Services
GOOGLE_VISION_API_KEY=your_api_key  # For image recognition
```

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pytest tests/`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards

- Follow PEP 8 style guidelines
- Add type hints to all functions
- Write comprehensive docstrings
- Maintain test coverage above 85%
- Update documentation for API changes

## Support

### Resources

- [API Documentation](http://localhost:8000/docs)
- [Technical Docs](docs/)
- [Issue Tracker](https://github.com/your-org/lifo-api/issues)

### Contact

- Technical Support: support@lifo.ai
- Sales: sales@lifo.ai
- Security: security@lifo.ai

## License

This project is proprietary software. All rights reserved.

---

**Version**: 3.0.0 (Phase 3 Multi-Store MVP)  
**Last Updated**: September 2024