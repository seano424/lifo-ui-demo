# LIFO.AI Technical Architecture

## Executive Summary

### Why These Architectural Decisions Matter for LIFO

**The Problem**: Retailers need real-time, batch-level inventory intelligence to prevent food waste, but traditional architectures create bottlenecks that slow down time-sensitive decisions.

**Our Solution**: Direct database access with intelligent caching enables instant inventory updates across all devices while maintaining enterprise-grade security.

### Key Business Benefits

- **⚡ Speed**: No API route bottlenecks for time-sensitive inventory decisions
- **🔄 Real-time**: When one employee marks a batch as discounted, all devices see it immediately
- **🛡️ Security**: Database-level protection that's more robust than application-layer security
- **💰 Cost-Effective**: Pay for database usage, not server complexity
- **📱 Mobile-First**: Optimized for in-store scanning and inventory management

### Security Approach: Database-First Protection

**Decision**: We use direct Supabase client access instead of traditional API routes

**Why This Is Secure**:

- ✅ **RLS at Database Level**: All security logic lives in PostgreSQL policies, not fragile application code
- ✅ **Principle of Least Privilege**: Client uses limited `anon` key; sensitive operations use `service_role` server-side
- ✅ **Authentication Required**: Every data operation requires a valid user session
- ✅ **Audit Trail**: All changes are logged at the database level with user context

**Trade-offs Considered**:

- ❌ **Complex Business Logic**: Advanced validation must use database functions/triggers
- ✅ **Performance**: Fewer network hops = faster inventory updates
- ✅ **Real-time**: Direct subscriptions enable live inventory synchronization
- ✅ **Reliability**: Database-level security is harder to misconfigure than scattered API permissions

---

## System Architecture Overview

### Data Flow Architecture

```
📱 Store Employee Device
    ↓ (scan product, update batch)
🌐 Direct Supabase Connection
    ↓ (RLS enforced)
🗄️  PostgreSQL Database
    ↓ (real-time subscription)
📱 Manager's Dashboard (instant update)
```

**Key Principle**: **Direct Client Access with Intelligent Caching**

- Raw data operations in `lib/queries/` (server/client agnostic)
- React Query hooks in `hooks/` (caching, optimistic updates)
- UI components in `components/` (rendering only)

### Database Schema Organization

```
Supabase Project (jrgmetdsohowtxickqij)
├── inventory schema     # Products, batches, stock management
├── user_mgmt schema     # Users, roles, permissions
└── scoring schema       # Analytics, category weights
```

**Batch-Level Intelligence**: Every product is tracked by expiration date batches, enabling precise waste reduction decisions instead of statistical guesswork.

### Component Architecture

```
lifo-app/
├── app/              # Next.js routing (server components)
├── components/       # UI components (feature-organized)
│   ├── ui/          # shadcn/ui primitives
│   ├── products/    # Product management
│   └── batches/     # Batch tracking
├── lib/             # Core business logic
│   ├── queries/     # Database operations
│   ├── supabase/    # Client configuration
│   └── react-query/ # Caching setup
├── hooks/           # Data hooks with mutations
├── lifo_ai_core/    # Python ETL & scoring engine
│   ├── pyproject.toml  # Modern Python project config
│   ├── etl/         # CSV processing & data validation
│   ├── scoring/     # AI-powered scoring algorithms
│   └── Makefile     # Development commands
└── lifo_api/        # FastAPI microservice
    ├── pyproject.toml  # Modern Python project config
    ├── app/         # FastAPI application
    │   ├── api/     # API endpoints
    │   ├── auth/    # Authentication & security
    │   └── core/    # Business logic
    └── Makefile     # Development commands
```

**Patterns**:

- **Frontend**: Features organized by domain with clear data/UI separation
- **Backend**: Modern Python services with uv + ruff + mypy toolchain
- **Integration**: Python services provide AI-powered insights to Next.js frontend

---

## Authentication & Security Deep Dive

### Row Level Security in Action

```sql
-- Example: Users can only access their store's products
CREATE POLICY "store_isolation" ON inventory.products
FOR ALL USING (
  store_id IN (
    SELECT store_id FROM user_mgmt.users
    WHERE id = auth.uid()
  )
);

-- Example: Only managers can modify discount settings
CREATE POLICY "manager_discounts" ON inventory.products
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_mgmt.user_roles ur
    JOIN user_mgmt.roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
    AND r.name IN ('manager', 'admin')
  )
);
```

**Why This Works**: Security is enforced at the data layer, making it impossible for application bugs to leak sensitive information.

### Multi-User Access Patterns

- **Store Admin**: Full access to store data, user management
- **Store Manager**: Inventory management, discount decisions
- **Store Employee**: Product scanning, batch updates
- **System Admin**: Cross-store analytics, system configuration

Each role is enforced through RLS policies, not application-level checks.

---

## Performance & Scalability Strategy

### Current Architecture (MVP - Scale)

**Direct Client Pattern**:

- Perfect for LIFO's real-time inventory needs
- Handles 1-50 stores efficiently
- Costs scale with usage, not infrastructure complexity

### Migration Strategy (Future Scale)

**Phase 1 (Current)**: Direct client for all operations

- ✅ MVP speed and simplicity
- ✅ Real-time updates
- ✅ Cost-effective

**Phase 2 (Growth)**: Hybrid approach for complex operations

- Keep direct client for core CRUD
- Add API routes for:
  - Bulk CSV imports (1000+ products)
  - POS system integrations
  - Complex analytics aggregations
  - Compliance reporting

**Phase 3 (Enterprise)**: Server-side optimization

- Move high-volume operations to API routes
- Implement advanced caching strategies
- Consider self-hosted Postgres for cost optimization

### When to Trigger Migration

- **$300+/month** in Vercel hosting costs
- **Complex business logic** that's hard to express in SQL
- **Enterprise compliance** requirements
- **POS integrations** needing server-side processing

---

## Development Workflow & Team Process

### Core Development Principles

- **Type Safety First**: All database operations use auto-generated TypeScript types
- **Separation of Concerns**: Data logic never mixed with UI components
- **Optimistic Updates**: UI responds instantly, syncs in background
- **Cache Invalidation**: Automatic data consistency across all users

### Team Scripts & Tools

**Frontend (Next.js)**:

```bash
npm run dev              # Development with Turbopack
npm run update-types     # Sync TypeScript with database schema
npm run supabase:start   # Local database for development
npm run format           # Prettier code formatting
```

**Backend Python Services** (lifo_ai_core, lifo_api):

```bash
# Modern Python development with uv + ruff
make dev-setup           # One-time development environment setup
make quality             # Run all code quality checks (ruff + mypy)
make test-cov            # Run tests with coverage
make run                 # Start API development server (lifo_api only)

# Individual commands
uv run ruff check .      # Ultra-fast linting
uv run ruff format .     # Ultra-fast code formatting
uv run mypy .            # Type checking
uv run pytest           # Run tests
```

> 📚 **Python Development**: See [PYTHON_DEVELOPMENT.md](../PYTHON_DEVELOPMENT.md) for complete setup guide

### Code Review Standards

**Frontend (TypeScript/Next.js)**:

- **Type Safety**: No `any` types, full TypeScript coverage
- **Performance**: Queries must be optimized for mobile usage
- **Security**: RLS policies reviewed for all schema changes

**Backend (Python)**:

- **Modern Tooling**: All Python code uses uv + ruff workflow
- **Code Quality**: Must pass `make quality` checks (ruff linting + mypy)
- **Type Safety**: All functions require proper type hints
- **Security**: Security linting with ruff's bandit rules (`--select=S`)
- **Testing**: New features require comprehensive tests

**Universal Standards**:

- **Required**: All changes must be reviewed before merging
- **Documentation**: Update relevant docs when changing architecture
- **Performance**: Profile performance-critical operations

---

## Cost & Infrastructure Planning

### Current Costs (MVP Phase)

| Service       | Cost           | Usage             |
| ------------- | -------------- | ----------------- |
| Supabase Free | $0             | < 50MB database   |
| Vercel Pro    | $80/month      | Team deployment   |
| **Total**     | **~$80/month** | Covers 1-5 stores |

### Scaling Projections

**Phase 1 (1-10 stores)**: $200-300/month

- Supabase Pro upgrade needed
- Increased bandwidth costs

**Phase 2 (10-50 stores)**: $600-900/month

- **Migration trigger**: When Vercel hits $300+/month
- Consider Railway/Render alternatives

**Phase 3 (50+ stores)**: $400-800/month

- Post-migration costs with optimized infrastructure
- Enterprise features and compliance

### Cost Optimization Strategy

- **Stay on free tiers** during MVP validation
- **Monitor usage** and upgrade only when hitting limits
- **Evaluate alternatives** before costs become prohibitive
- **Plan migrations** early to avoid emergency decisions

---

## Implementation Guides

Ready to build features? These guides provide hands-on implementation details:

### 📖 Core Implementation

- **[Data Fetching Guide](docs/DATA_FETCHING_GUIDE.md)** - How to add new features following our patterns
- **[Component Standards](docs/COMPONENT_STANDARDS.md)** - UI patterns and conventions
- **[Developer Onboarding](docs/DEVELOPER_ONBOARDING.md)** - Environment setup and first contributions

### 🔧 Specialized Guides

- **[Database Schema](docs/DATABASE_SCHEMA.md)** - Table relationships and RLS policies
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production setup and monitoring
- **[Security Checklist](docs/SECURITY_CHECKLIST.md)** - Compliance and data protection

---

## Future Enhancements

### Planned Technical Improvements

**Short-term (3-6 months)**:

- Real-time subscriptions for live inventory updates
- Advanced caching for offline mobile usage
- Bulk import workflows for large inventories

**Medium-term (6-12 months)**:

- POS system integrations via API routes
- Predictive analytics for waste reduction
- Multi-store management for retail chains

**Long-term (12+ months)**:

- AI-powered expiration date recognition
- Advanced compliance reporting
- Enterprise customer features

### Business Impact Timeline

- **Month 1-3**: Validate core batch-level intelligence with Dutch retailers
- **Month 3-9**: Scale to 10+ stores, prove ROI and waste reduction
- **Month 9-18**: Expand across EU markets, add enterprise features
- **Month 18+**: Platform integrations and predictive analytics

---

## For Non-Technical Team Members

### What This Architecture Means for LIFO

**Instant Updates**: When a store employee scans a product and marks it for discount, every device in the store sees the update immediately. No delays, no double-processing.

**Bulletproof Security**: Data protection happens at the database level, which is like having security guards at the bank vault instead of just at the front door.

**Mobile-First**: Designed specifically for employees working on phones and tablets in busy store environments.

**Cost-Predictable**: We pay for what we use (database storage and bandwidth) rather than expensive server infrastructure.

**Real-Time Intelligence**: The system provides instant insights into which specific product batches are selling versus expiring, enabling data-driven decisions instead of guesswork.

### When We Might Need Architecture Changes

- **Bulk Operations**: If stores want to upload 1000+ products at once
- **POS Integration**: When connecting to existing store computer systems
- **Enterprise Features**: Multi-store chains with complex reporting needs
- **Compliance**: Advanced audit trails for regulatory requirements

The current architecture is designed to scale smoothly through these transitions without disrupting core functionality.

---

_This architecture provides the foundation for LIFO's mission: giving retailers precise, batch-level inventory intelligence that eliminates guesswork in food waste management._
