[![Better Stack Badge](https://uptime.betterstack.com/status-badges/v1/monitor/26avg.svg)](https://uptime.betterstack.com/?utm_source=status_badge)
# LIFO.AI - Intelligent Food Waste Management Platform

**Transform inventory management from reactive to predictive, reducing food waste through AI-driven insights.**

LIFO.AI helps retailers minimize food waste by providing intelligent scoring, demand prediction, and automated recommendations for inventory optimization. Our ML-enhanced platform reduces waste while maximizing profitability.

## 🚀 Key Features

- **🤖 AI-Powered Scoring**: Multi-factor inventory scoring with intelligent recommendations
- **🔍 Google Vision OCR**: Automated barcode scanning and expiry date extraction
- **📱 Mobile-Optimized**: Sub-300ms response times for mobile scanning interfaces
- **📊 Real-time Analytics**: Comprehensive store performance metrics
- **📁 Bulk Processing**: CSV upload with validation and error handling
- **🔐 Modern Security**: Supabase API key authentication with Row Level Security
- **🎯 European Pilot**: Advanced donation management with bulk quantity awareness

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
├── app/                      # Next.js 15 Frontend & API Routes
├── lifo_api/                # FastAPI Backend Application
├── lifo_api/app/core/       # Python Data Processing & API Core
├── components/              # React UI Components
├── supabase/migrations/     # Database schema & migrations
└── docs/                    # Comprehensive Documentation
```

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python), Supabase PostgreSQL
- **AI/ML**: Google Vision API, OpenFoodFacts API, pandas
- **Testing**: 124+ comprehensive tests with pytest

## ⚡ Quick Start

```bash
# Clone the repository
git clone https://github.com/lifo-ai/lifo-app.git
cd lifo-app

# Install frontend dependencies
npm install

# Backend setup
cd lifo_api
pip install -r requirements.txt
# Configure .env with Supabase credentials
uvicorn app.main:app --reload

# Frontend setup (separate terminal)
npm install
npm run dev
```

**API Documentation**: http://localhost:8000/docs  
**Complete Guide**: [Full Documentation](./DOCUMENTATION.md)

## 🏃‍♂️ Getting Started

**👉 [Read the Complete Documentation](./DOCUMENTATION.md)** - Everything in one place:

1. **Quick Start** - Get running in 5 minutes
2. **Architecture** - Technical overview and system design
3. **API Reference** - All 65+ endpoints with examples  
4. **Authentication** - Supabase API key setup
5. **European Pilot** - Advanced donation system
6. **Production** - Deployment and monitoring


---

**🎯 Ready to reduce food waste with AI?** Start with the [Complete FastAPI Documentation](./docs/COMPREHENSIVE_FASTAPI_MICROSERVICE_DOCUMENTATION.md) for everything you need to know about the LIFO AI Engine.
