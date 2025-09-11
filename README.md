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

**Essential Documentation:**

- **[⚡ Setup Guide](./docs/SETUP.md)** - Get running quickly with current architecture
- **[🔌 API Reference](./lifo_api/API_REFERENCE.md)** - Complete endpoint documentation (65+ endpoints)
- **[🚀 Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions

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
**Detailed Setup**: [Setup Guide](./docs/SETUP.md)

## 🏃‍♂️ Getting Started

1. **[⚡ Setup Guide](./docs/SETUP.md)** - Get running quickly
2. **[🏗️ Architecture Guide](./docs/ARCHITECTURE.md)** - Technical overview  
3. **[🔌 API Reference](./lifo_api/API_REFERENCE.md)** - Complete endpoint documentation
4. **[🚀 Deploy to Production](./docs/DEPLOYMENT.md)** - Production deployment guide

## 🤝 Contributing

We welcome contributions! Please see our [Documentation Hub](./docs/README.md) for:

- Development setup instructions
- API documentation and examples
- Architecture guides and best practices
- Deployment and production guidelines

## 📄 License

This project is licensed under the MIT License - see the documentation for details.

---

**🎯 Ready to reduce food waste with AI?** Start with the [Complete FastAPI Documentation](./docs/COMPREHENSIVE_FASTAPI_MICROSERVICE_DOCUMENTATION.md) for everything you need to know about the LIFO AI Engine.
