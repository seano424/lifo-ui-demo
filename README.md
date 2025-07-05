# LIFO.AI - Intelligent Food Waste Management Platform

**Transform inventory management from reactive to predictive, reducing food waste through AI-driven insights.**

## 🎯 Mission

LIFO.AI helps retailers minimize food waste by providing intelligent scoring, demand prediction, and automated recommendations for inventory optimization. Our ML-enhanced platform reduces waste while maximizing profitability.

## 🚀 Complete Data Platform Implementation

This repository contains the implementation of LIFO.AI's data platform

- **Database Schema**: Complete PostgreSQL schema with time series support
- **Core Scoring Engine**: Algorithmic scoring based on expiry, velocity, and margin
- **ETL Pipeline**: CSV processing with comprehensive validation
- **API Infrastructure**: Next.js API routes for all core functionality

- **Data Collection**: Automated hourly inventory snapshots
- **Pattern Analysis**: Demand trend detection and seasonality analysis
- **External Factors**: Weather and holiday impact integration
- **Advanced Analytics**: Category insights and performance metrics

- **Feature Engineering**: 50+ features from inventory, sales, and external data
- **ML Models**: Random Forest and Gradient Boosting for demand prediction
- **Enhanced Scoring**: ML-augmented recommendations with confidence levels
- **Discount Optimization**: AI-driven pricing recommendations

## 🏗️ Architecture Overview

```
lifo-app/
├── app/                      # Next.js 15 Frontend
├── lifo-ai-core/            # Python Business Logic
│   ├── database/            # Data models and connections
│   ├── scoring/             # Scoring algorithms (base + ML)
│   ├── etl/                # CSV processing pipeline
│   ├── timeseries/         # Data collection and analysis
│   ├── ml/                 # Machine learning pipeline
│   └── api/                # Business logic APIs
├── app/api/                # Next.js API routes
├── supabase/migrations/    # Database migrations
└── components/             # React UI components
```

## 🛠️ Technology Stack

**Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui
**Backend**: Python, Supabase PostgreSQL, TimescaleDB
**ML/AI**: scikit-learn, pandas, numpy, scipy
**Infrastructure**: Supabase (Auth, Database, Real-time), Vercel (Hosting)

## 📦 Installation & Setup

### 1. Prerequisites

```bash
Node.js 18+
Python 3.12+
Supabase account
```

### 2. Clone and Install

```bash
git clone https://github.com/lifo-ai/lifo-app.git
cd lifo-app
npm install

# Set up Python environment
cd lifo-ai-core
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -e .  # Install the package in development mode
cd ..
```

### 3. Environment Configuration

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Database Setup

```bash
# Authenticate with Supabase CLI
npx supabase login

# Generate TypeScript types (includes all schemas)
npm run update-types
```

### 5. Python Integration

The Python CSV processor is fully integrated with the Next.js application:

```bash
# Test Python integration
npm run dev
# Upload CSV files via the web interface or API endpoints
```

**Important**: The Python environment must be activated for CSV processing to work:
```bash
cd lifo-ai-core && source venv/bin/activate && cd ..
```

**Note**: The `venv/` directory is not included in git (as it should be). Each developer needs to create their own virtual environment locally.

## 🚦 Getting Started

### Development Server

```bash
npm run dev
```

### Current State & Next Steps

✅ **Completed**:
- Python CSV processor fully integrated with Next.js
- All API endpoints working and properly configured
- Database operations and TypeScript types generated

⚠️ **Known Issues**:
- Store creation UI component needs frontend developer review
- Users need to create stores via API for now

🔧 **Next Steps**:
1. Frontend developer to fix store creation dialog rendering issues
2. Implement proper store selector UI component

### Key Operations

**CSV Upload & Processing**:

```bash
# Upload via UI at /protected or API
curl -X POST /api/inventory/upload -F "file=@inventory.csv"
```

**Score Calculation**:

```bash
# Recalculate all scores
npm run scoring:recalculate

# Or via API
curl -X POST /api/scores/recalculate
```

**ML Model Training**:

```bash
# Train ML models (requires historical data)
npm run ml:train
```

**Time Series Collection**:

```bash
# Collect hourly snapshots (run via cron)
npm run timeseries:collect
```

## 📊 API Endpoints

### Store Management
- `GET /api/stores` - Get user's stores
- `POST /api/stores` - Create new store

### Core Inventory Management (🔐 Auth Required)

- `GET /api/inventory` - Paginated inventory with filtering
- `POST /api/inventory/upload` - CSV file upload and processing
- `GET /api/alerts` - High-priority inventory alerts
- `GET /api/csv/sample` - Download CSV template

### Scoring & Analytics (🔐 Auth Required)

- `POST /api/scores/recalculate` - Trigger score recalculation
- `GET /api/analytics` - Comprehensive analytics and KPIs

### CSV Format
Expected CSV columns:
```
SKU,Product_Name,Category,Quantity,Cost_Price,Selling_Price,Expiry_Date,Batch_Number,Manufacture_Date,Location
```

### Advanced Features

- ML-enhanced scoring with discount optimization
- Time series pattern analysis and forecasting
- External factor integration (weather, holidays)
- Real-time inventory alerts and recommendations

## 🧠 ML Features

### Demand Prediction Models

- **24h, 48h, 7-day forecasts** with confidence levels
- **Discount scenario modeling** for optimal pricing
- **Sellthrough rate prediction** for inventory planning

### Feature Engineering (50+ Features)

- **Product Features**: Category, brand, pricing, margins
- **Temporal Features**: Seasonality, day-of-week patterns
- **Sales History**: Velocity trends, transaction patterns
- **Inventory State**: Expiry urgency, quantity ratios
- **External Factors**: Weather, holidays, market conditions

### Enhanced Scoring Algorithm

```python
enhanced_score = (
    0.4 * base_algorithmic_score +
    0.35 * ml_prediction_score +
    0.15 * pattern_analysis_score +
    0.1 * external_factors_score
)
```

## 📈 Business Impact

### Key Metrics Tracked

- **Waste Reduction Rate**: Items saved vs. at-risk items
- **Revenue Recovery**: Revenue from discounted vs. wasted items
- **Action Effectiveness**: Success rate of recommendations
- **Inventory Turnover**: Improved velocity through optimization

### Expected Outcomes

- **30-50% reduction** in food waste
- **15-25% increase** in margin recovery
- **Automated decision-making** for 80%+ of inventory
- **Real-time insights** for proactive management

## 🔧 Development Workflow

### Database Changes

1. **Modify schema** in Supabase Dashboard
2. **Update types**: `npm run update-types`
3. **Update models** in `lifo-ai-core/database/models.py`
4. **Test changes** with sample data

### ML Model Updates

1. **Retrain models** with new data: `npm run ml:train`
2. **Validate performance** with test datasets
3. **Deploy updated models** via API

### Monitoring & Maintenance

- **Hourly data collection** via automated snapshots
- **Daily score recalculation** for all active inventory
- **Weekly ML model retraining** with fresh data

## 🚀 Deployment

### Production Environment

```bash
# Build and deploy
npm run build
npm run start

# Ensure Python dependencies in production
pip install -r requirements.txt --production
```

### Environment Variables (Production)

```env
NEXT_PUBLIC_SUPABASE_URL=production-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=production-anon-key
SUPABASE_SERVICE_ROLE_KEY=production-service-key
DB_PASSWORD=production-db-password
WEATHER_API_KEY=optional-weather-key
```

### Scheduled Jobs

Set up cron jobs for automated operations:

```bash
# Hourly data collection
0 * * * * npm run timeseries:collect

# Daily score recalculation
0 2 * * * npm run scoring:recalculate

# Weekly ML retraining
0 3 * * 0 npm run ml:train
```

## 📚 Documentation

- **API Documentation**: Auto-generated from TypeScript interfaces
- **Database Schema**: Complete ERD in `supabase/migrations/`
- **ML Pipeline**: Feature engineering and model documentation
- **Business Logic**: Comprehensive scoring algorithm documentation

## 🌟 Team

**LIFO.AI** - Transforming food retail through intelligent inventory management.

---

**Built with ❤️ for a sustainable future** 🌱
