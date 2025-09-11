# LIFO Documentation

Essential documentation for the LIFO AI food waste management platform.

## Quick Start

New to LIFO? Start here:

1. **[Setup Guide](./SETUP.md)** - Get running quickly with current architecture
2. **[Architecture Guide](./ARCHITECTURE.md)** - Technical overview and system design
3. **[API Reference](../lifo_api/API_REFERENCE.md)** - Complete endpoint documentation (65+ endpoints)

## Documentation Structure

### Core Documentation

- **[SETUP.md](./SETUP.md)** - Development environment setup
  - Environment configuration
  - Supabase API key setup
  - Quick verification tests
  - Troubleshooting

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture
  - System overview and components
  - API design patterns
  - European pilot system details
  - Performance optimizations
  - Security considerations

### Production

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Production deployment guide
  - Production environment setup
  - Deployment procedures
  - Monitoring and maintenance

- **[PRODUCTION_READINESS_CHECKLIST.md](./PRODUCTION_READINESS_CHECKLIST.md)** - Pre-deployment checklist
  - Security verification
  - Performance validation
  - Operational readiness

### API Documentation

- **[API Reference](../lifo_api/API_REFERENCE.md)** - Complete API documentation
  - All 65+ endpoints organized by function
  - Authentication requirements
  - Request/response examples
  - Error handling

## System Overview

The LIFO application uses a consolidated architecture:

```
lifo-app/
├── lifo_api/app/core/    # Consolidated Python backend core
├── lifo_api/api/v1/      # 65+ API endpoints  
├── app/                  # Next.js frontend
└── docs/                 # Essential documentation (this folder)
```

## Key Features

- **Supabase Authentication**: Modern API key-based authentication
- **European Pilot System**: Advanced donation management with bulk quantity awareness
- **Mobile Optimized**: Sub-300ms response times for mobile scanning
- **AI Scoring**: Multi-factor inventory analysis
- **65+ API Endpoints**: Comprehensive inventory and analytics APIs

## Getting Help

- **Setup Issues**: See troubleshooting section in [SETUP.md](./SETUP.md)
- **API Questions**: Check [API Reference](../lifo_api/API_REFERENCE.md)
- **Architecture Questions**: See [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Production Issues**: See [DEPLOYMENT.md](./DEPLOYMENT.md)

## Archive

Historical documentation is preserved in the `archive/` directory for reference but is not maintained.

---

*This documentation reflects the current consolidated architecture with backend consolidated into `lifo_api/app/core` and Supabase API key authentication.*