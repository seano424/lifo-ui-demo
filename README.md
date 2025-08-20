# LIFO.AI - Intelligent Food Waste Management Platform

**Transform inventory management from reactive to predictive, reducing food waste through AI-driven insights.**

LIFO.AI helps retailers minimize food waste by providing intelligent scoring, demand prediction, and automated recommendations for inventory optimization. Our ML-enhanced platform reduces waste while maximizing profitability.

## 🚀 Key Features

- **🤖 AI-Powered Scoring**: Multi-factor inventory scoring with intelligent recommendations
- **🔍 Google Vision OCR**: Automated barcode scanning and expiry date extraction  
- **📱 Mobile-Optimized**: Sub-300ms response times for mobile scanning interfaces
- **📊 Real-time Analytics**: Comprehensive store performance metrics
- **📁 Bulk Processing**: CSV upload with validation and error handling
- **🔐 Enterprise Security**: JWT authentication with store-level authorization
- **🎯 Donation Engine**: Coordinated food rescue management workflows

## 📚 Documentation

**👉 [Complete FastAPI Microservice Documentation](./docs/COMPREHENSIVE_FASTAPI_MICROSERVICE_DOCUMENTATION.md)** - The definitive guide covering setup, API routes, deployment, and usage examples.

### Quick Links
- **[📖 Documentation Hub](./docs/README.md)** - All documentation organized by topic
- **[⚡ Quick Setup Guide](./docs/COMPLETE_SETUP_TESTING_GUIDE.md)** - Get running in 15 minutes
- **[🔌 API Reference](./docs/API_DOCUMENTATION.md)** - Complete endpoint documentation
- **[🚀 Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment instructions

## 🏗️ Architecture Overview

```
lifo-app/
├── app/                      # Next.js 15 Frontend & API Routes
├── lifo_api/                # FastAPI Backend Application  
├── lifo_ai_core/            # Python Data Processing Core
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

# Set up unified Python environment (new!)
./scripts/setup-python-env.sh

# Set up unified environment (new!)
cp .env.example .env.local
# Add your Supabase and API credentials to .env.local

# Run the application
npm run dev
```

**📚 New: [Unified Python Setup Guide](./docs/UNIFIED_PYTHON_SETUP_GUIDE.md)** - Single environment for both API and core
**📚 Complete setup: [Full Setup Guide](./docs/COMPLETE_SETUP_TESTING_GUIDE.md)**

## 🏃‍♂️ Getting Started

1. **[📖 Read the Complete Documentation](./docs/COMPREHENSIVE_FASTAPI_MICROSERVICE_DOCUMENTATION.md)** - Everything you need to know
2. **[⚡ Follow the Setup Guide](./docs/COMPLETE_SETUP_TESTING_GUIDE.md)** - Get running in 15 minutes  
3. **[🔌 Explore the API](./docs/API_DOCUMENTATION.md)** - Complete endpoint reference
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
