[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/26avg.svg)](https://uptime.betterstack.com/?utm_source=status_badge)
# LIFO.AI - Frontend Application

**Transform inventory management from reactive to predictive, reducing food waste through AI-driven insights.**

This repository contains the **Next.js 15 frontend application** for LIFO.AI, an intelligent food waste management platform. The frontend provides a modern, mobile-optimized interface for retailers to manage inventory, track waste, and optimize operations through AI-driven insights.

> **Note**: The backend has been moved to a separate repository: [lifo-ai/lifo-api](https://github.com/lifo-ai/lifo-api)

## 🚀 Frontend Features

- **📱 Mobile-First Design**: Optimized responsive interface for all devices
- **🎨 Modern UI**: Radix UI components + shadcn/ui design system with Tailwind CSS 4.1
- **🔐 Secure Authentication**: Supabase SSR authentication with Row Level Security
- **🌍 Internationalization**: Multi-language support (English, French, Dutch)
- **📊 Real-time Dashboards**: Interactive analytics and performance metrics
- **🔍 Barcode Scanning**: Mobile barcode scanning with OCR integration
- **📁 Data Management**: CSV upload, batch management, and donation workflows
- **⚡ Performance**: Optimized for Core Web Vitals and fast load times

## 📚 Documentation

**📖 [Complete Documentation](./DOCUMENTATION.md)** - Everything you need in one place:
- Quick Start & Setup
- System Architecture  
- API Reference (65+ endpoints)
- Authentication Guide
- European Pilot System
- Production Deployment
- Troubleshooting

## 🏗️ Architecture Overview

```
lifo-app/
├── app/                      # Next.js 15 App Router
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── (marketing)/         # Public marketing pages
│   ├── (auth)/              # Authentication pages
│   └── api/                 # Next.js API routes
├── components/              # React UI Components (171 files)
│   ├── ui/                  # Base shadcn/ui components
│   ├── todos/               # Batch management components
│   ├── donation/            # Donation management
│   └── scanning/            # Barcode/OCR scanning
├── lib/                     # Utilities & services (79 files)
│   ├── supabase/           # Supabase client
│   ├── queries/            # React Query hooks
│   ├── stores/             # Zustand state management
│   └── api/                # API clients
├── supabase/migrations/     # Database schema & migrations
├── messages/                # i18n translations (en, fr, nl)
└── lifo_api/               # [DEPRECATED] Local backend copy
                             # Use: https://github.com/lifo-ai/lifo-api
```

## 🛠️ Technology Stack

- **Framework**: Next.js 15 with React 19 and App Router
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4.1
- **UI Components**: Radix UI + shadcn/ui
- **State Management**: Zustand (client state) + React Query v5 (server state)
- **Authentication**: Supabase SSR
- **Database**: Supabase PostgreSQL with Row Level Security
- **Forms**: React Hook Form + Zod validation
- **i18n**: next-intl (English, French, Dutch)
- **Testing**: Jest + React Testing Library

## ⚡ Quick Start

### Frontend Setup

```bash
# Clone the repository
git clone https://github.com/lifo-ai/lifo-app.git
cd lifo-app

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start local Supabase (optional, for local development)
npm run supabase:start

# Generate TypeScript types from database
npm run update-types

# Start development server
npm run dev
```

**Frontend**: http://localhost:3000
**Supabase Studio**: http://localhost:54323 (if running locally)

### Backend Setup

The backend runs in a separate repository. For backend development:

```bash
# Clone the backend repository
git clone https://github.com/lifo-ai/lifo-api.git
cd lifo-api

# Follow the setup instructions in the backend README
```

**Backend API Documentation**: http://localhost:8000/docs (when backend is running)
**Backend Repository**: [lifo-ai/lifo-api](https://github.com/lifo-ai/lifo-api)

## 🏃‍♂️ Getting Started

### Frontend Development

1. **Setup**: Follow the Quick Start guide above
2. **Components**: Explore `components/` directory for UI patterns
3. **Routing**: Check `app/` directory for page structure
4. **State**: Use Zustand stores in `lib/stores/` and React Query in `lib/queries/`
5. **Database**: Migrations in `supabase/migrations/`, types generated via `npm run update-types`
6. **i18n**: Update translations in `messages/` directory (en, fr, nl)

### Key Documentation

- **Frontend Documentation**: This repository's DOCUMENTATION.md
- **Backend API**: [lifo-ai/lifo-api](https://github.com/lifo-ai/lifo-api) repository
- **Database Schema**: `supabase/migrations/` directory
- **Component Patterns**: `components/` with organized feature folders

---

## 📦 Related Repositories

- **Backend API**: [lifo-ai/lifo-api](https://github.com/lifo-ai/lifo-api) - FastAPI backend service with AI scoring and OCR
- **Database Migrations**: Managed in this repository (`supabase/migrations/`)

**🎯 Ready to build the future of food waste management?** Start with the frontend setup above and explore the component library!
