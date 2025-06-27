# LIFO.AI

Food surplus management system helping retailers reduce edible inventory loss through AI-driven batch-level inventory intelligence.

## 🎯 What We're Building

LIFO.AI solves the **batch visibility problem** that costs retailers millions in unnecessary waste. Instead of managing inventory with statistical guesswork, we provide precise, batch-level tracking by expiration date.

**Current Focus**: MVP validation with Dutch grocery stores

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm (latest version)

### Get Running in 5 Minutes

```bash
# 1. Clone and install
git clone https://github.com/lifo-ai/lifo-app.git
cd lifo-app
npm install

# 2. Environment setup
cp .env.example .env.local
# Ask team lead for actual values to put in .env.local

# 3. Generate database types
npm run update-types

# 4. Start development
npm run dev
# Visit http://localhost:3000
```

**Stuck?** Check our [Developer Onboarding Guide](docs/DEV_ONBOARDING.MD) or ask in Slack!

## 🗄️ Database & Environment

### Environment Variables

Get these values from your team lead:
```env
NEXT_PUBLIC_SUPABASE_URL=https://jrgmetdsohowtxickqij.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ask for this]
SUPABASE_SERVICE_ROLE_KEY=[keep this secret!]
```

### Keeping Types Updated

```bash
# Generate fresh TypeScript types from database
npm run update-types

# After any schema changes in Supabase Dashboard
```

## 📚 Documentation

### Start Here
- 🏗️ **[Technical Architecture](docs/TECHNICAL_ARCHITECTURE.MD)** - System overview and architectural decisions
- 👋 **[Developer Onboarding](docs/DEV_ONBOARDING.MD)** - New team member setup guide

### Implementation Guides
- 📖 **[Data Fetching Guide](docs/DATA_FETCHING_GUIDE.MD)** - How to add new features and CRUD operations

### For Different Audiences
- **New to the project?** → Developer Onboarding → Technical Architecture
- **Building a feature?** → Data Fetching Guide  
- **Understanding our architecture?** → Technical Architecture
- **Business context?** → Technical Architecture (Executive Summary)

## 🛠️ Development Workflow

### Useful Scripts
```bash
npm run dev              # Start development server (with Turbopack)
npm run build            # Build for production
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
npm run update-types     # Generate Supabase TypeScript types
npm run supabase:login   # Authenticate with Supabase CLI (one-time)
```

### Adding a New Feature
1. **Check patterns** in [Data Fetching Guide](docs/DATA_FETCHING_GUIDE.MD)
2. **Create raw queries** in `lib/queries/[table].ts`
3. **Add query keys** to `lib/queries/query-keys.ts`  
4. **Build React hook** in `hooks/use-[table].ts`
5. **Use in components** with the standard patterns

### Git Workflow
```bash
git checkout -b feature/what-youre-working-on
# Make your changes
git add .
git commit -m "feat: describe what you did"
git push origin feature/what-youre-working-on
# Create PR for review
```

## 🏗️ Tech Stack

**Frontend**: Next.js 15 + TypeScript + Tailwind CSS v4  
**Database**: Supabase (PostgreSQL with RLS)  
**UI Components**: shadcn/ui + Radix primitives  
**Data Fetching**: React Query (TanStack Query)  
**Deployment**: Vercel Pro

**Key Principle**: Direct database access with intelligent caching for real-time inventory updates.

## 🔐 Security

- **Row Level Security (RLS)**: All data protection at database level
- **Multi-schema design**: `inventory`, `user_mgmt`, `scoring` schemas
- **Role-based access**: Store admin, manager, employee permissions
- **Direct client access**: Secure via Supabase RLS policies

See [Technical Architecture](docs/TECHNICAL_ARCHITECTURE.MD) for security deep-dive.

## 🤝 Team Onboarding

### New Developer Checklist
- [ ] Clone repo and run `npm install`
- [ ] Get `.env.local` values from team lead  
- [ ] Run `npm run update-types` to generate database types
- [ ] Start with `npm run dev` and explore the app
- [ ] Read [Developer Onboarding](docs/DEV_ONBOARDING.MD)
- [ ] Pick up your first small task

### Getting Help
- **Slack**: `#dev` channel for technical questions
- **Stuck on setup?** Ask immediately, don't spend more than 15 minutes alone
- **Architecture questions?** Check Technical Architecture doc first
- **Code patterns?** Data Fetching Guide has examples

## 📊 Project Status

- **Stage**: MVP development
- **Database**: 3 schemas with batch-level inventory tracking
- **Frontend**: Dashboard with product and batch management
- **Target**: Dutch grocery store validation

## 🔗 Quick Links

- **GitHub**: [lifo-ai/lifo-app](https://github.com/lifo-ai/lifo-app)
- **Supabase Dashboard**: [Project jrgmetdsohowtxickqij](https://supabase.com/dashboard/project/jrgmetdsohowtxickqij)
- **Slack**: Team communication
- **Figma**: Design files _(ask for access)_

---

**Questions?** Check our docs first, then ask in Slack. We're here to help! 🚀
