# LIFO AI Engine - Comprehensive FastAPI Microservice Documentation

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Environment Setup & Configuration](#3-environment-setup--configuration)
4. [API Routes Documentation](#4-api-routes-documentation)
5. [Authentication & Security](#5-authentication--security)
6. [Database Integration](#6-database-integration)
7. [Error Handling & Monitoring](#7-error-handling--monitoring)
8. [Development Guide](#8-development-guide)
9. [Deployment](#9-deployment)
10. [Usage Examples](#10-usage-examples)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Project Overview

### What is LIFO AI Engine?

The **LIFO AI Engine** is an intelligent inventory management microservice designed to reduce food waste through AI-driven insights. It serves as the backend component of the LIFO.AI platform, providing advanced OCR capabilities, intelligent scoring algorithms, and comprehensive analytics.

### Key Features and Capabilities

- **🔍 Google Vision OCR Processing**: Complex image processing and text extraction for product scanning
- **📊 Multi-factor Inventory Scoring**: Expiry, velocity, and margin analysis with intelligent recommendations
- **📱 Mobile-Optimized Endpoints**: Fast response times (<300ms) for mobile scanning interfaces
- **📈 Real-time Recommendations**: Automated discount and action suggestions based on AI analysis
- **📁 CSV Processing**: Bulk inventory upload with comprehensive validation and error handling
- **📊 Analytics & Insights**: Comprehensive inventory analytics with performance metrics
- **🎯 Donation System**: EU-compliant donation eligibility checking and workflow management
- **🔐 Enterprise Security**: JWT authentication, rate limiting, and comprehensive security headers
- **🛡️ Error Tracking & Recovery**: Comprehensive error monitoring with automatic recovery mechanisms
- **📈 Performance Monitoring**: Real-time system health tracking with alerting and metrics collection

### Architecture Overview

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Next.js Frontend] --> B[OpenFoodFacts API]
        A --> C[Mobile Scanner]
    end

    subgraph "LIFO AI Engine (FastAPI)"
        D[Main Application] --> E[Error Handling Middleware]
        E --> F[Security Middleware]
        F --> G[Performance Monitoring]
        G --> H[API v1 Router]
        H --> I[OCR & Vision Services]
        H --> J[Scoring Engine]
        H --> K[Analytics Engine]
        H --> L[CSV Processing]
        H --> M[Mobile Endpoints]
    end

    subgraph "Data Layer"
        N[Supabase PostgreSQL] --> O[Row Level Security]
        P[Google Vision API] --> I
        Q[Redis Cache] --> J
    end

    subgraph "Monitoring & Recovery"
        R[Error Tracker] --> S[Recovery Manager]
        T[Metrics Collector] --> U[Alert Manager]
        E --> R
        G --> T
    end

    A --> D
    D --> N
```

### Technology Stack

- **Framework**: FastAPI 0.104+ with async/await support
- **Language**: Python 3.9+ with modern type hints
- **Database**: PostgreSQL with AsyncPG and Supabase integration
- **Authentication**: Supabase JWT with custom validation
- **Image Processing**: Google Cloud Vision API v3.4+
- **Caching**: Redis for performance optimization
- **Security**: Comprehensive middleware stack with rate limiting
- **Error Handling**: Comprehensive error tracking with automatic recovery
- **Monitoring**: Real-time performance metrics and health monitoring
- **Logging**: Structured logging with error correlation and analysis
- **Documentation**: Auto-generated OpenAPI specs with interactive docs

---

## 2. Quick Start Guide

### Prerequisites

- **Python**: 3.9 or higher
- **Database**: PostgreSQL (Supabase recommended)
- **Google Cloud**: Vision API credentials
- **Redis**: For caching (optional but recommended)

### Installation Steps

#### 1. Clone and Setup Environment

```bash
# Navigate to the API directory
cd lifo-app/lifo_api

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### 2. Environment Configuration

Create `.env.local` file:

```bash
# Copy unified environment file from root level
cp .env.example .env.local
```

Fill in your configuration:

```env
# API Configuration
ENVIRONMENT=development
API_VERSION=1.0.0
DEBUG=true
LOG_LEVEL=DEBUG

# Database Configuration (Supabase)
DATABASE_URL=postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Vision API
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Security
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256

# Performance
REDIS_URL=redis://localhost:6379/0
```

#### 3. Database Setup

```bash
# Test database connection
python -c "
import asyncio
from app.database.connection import test_connection
print('✅ Database connected!' if asyncio.run(test_connection()) else '❌ Connection failed')
"
```

#### 4. Running the Application

```bash
# Development mode (with auto-reload)
uvicorn app.main:app --reload --port 8000 --log-level debug

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

### First API Call Example

```bash
# Health check
curl http://localhost:8000/health

# API information
curl http://localhost:8000/api/info

# Interactive documentation
open http://localhost:8000/docs
```

---

## 3. Environment Setup & Configuration

### Environment Variables Documentation

> **Note**: We now use a unified `.env.example` file at the root level instead of separate environment files. This replaces the old dual environment setup with a single, comprehensive configuration file.

#### Core API Settings

| Variable      | Description            | Default       | Required |
| ------------- | ---------------------- | ------------- | -------- |
| `ENVIRONMENT` | Deployment environment | `development` | No       |
| `API_VERSION` | API version string     | `1.0.0`       | No       |
| `DEBUG`       | Enable debug mode      | `false`       | No       |
| `LOG_LEVEL`   | Logging level          | `INFO`        | No       |
| `HOST`        | Server host            | `0.0.0.0`     | No       |
| `PORT`        | Server port            | `8000`        | No       |

#### Database Configuration

| Variable                    | Description                           | Required |
| --------------------------- | ------------------------------------- | -------- |
| `DATABASE_URL`              | PostgreSQL connection string          | Yes      |
| `SUPABASE_URL`              | Supabase project URL                  | Yes      |
| `SUPABASE_JWT_SECRET`       | JWT secret for token validation       | Yes      |
| `SUPABASE_ANON_KEY`         | Anonymous key for public access       | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for admin operations | Yes      |

#### External Services

| Variable                         | Description                               | Required |
| -------------------------------- | ----------------------------------------- | -------- |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to Google Cloud service account JSON | Yes      |
| `GOOGLE_CLOUD_PROJECT_ID`        | Google Cloud project ID                   | Yes      |
| `REDIS_URL`                      | Redis connection string                   | No       |
| `WEATHER_API_KEY`                | OpenWeatherMap API key                    | No       |

### Development vs Production Settings

#### Development Configuration

```env
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
CORS_ORIGINS=["http://localhost:3000", "http://localhost:3001"]
ALLOWED_HOSTS=["*"]
```

#### Production Configuration

```env
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING
FRONTEND_URL=https://your-app.com
API_URL=https://api.your-app.com
# CORS origins and allowed hosts are dynamically generated from URLs
```

### Security Configuration

#### Rate Limiting Settings

```env
# Rate limits (requests per time period)
RATE_LIMIT_PER_MINUTE=100
CSV_UPLOAD_RATE_LIMIT=3/hour
AI_ENDPOINT_RATE_LIMIT=30/minute
ANALYTICS_RATE_LIMIT=40/minute
```

#### Database Connection Pooling

```env
# Connection pool settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600
```

---

## 4. API Routes Documentation

### Base URL and Versioning

- **Base URL**: `http://localhost:8000` (development) / `https://your-api.com` (production)
- **API Prefix**: `/api/v1`
- **Content Type**: `application/json`

### Health and System Endpoints

#### `GET /` - API Root

Returns basic service information and status.

**Response:**

```json
{
  "service": "LIFO AI Engine",
  "version": "1.0.0",
  "description": "Intelligent inventory scoring and waste reduction microservice",
  "status": "operational",
  "features": [
    "Google Vision OCR processing",
    "Multi-factor inventory scoring",
    "Real-time recommendations",
    "CSV bulk processing",
    "Mobile-optimized endpoints"
  ]
}
```

#### `GET /health` - Health Check

Comprehensive health check including database connectivity.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": 1705320600.123,
  "version": "1.0.0",
  "database": "connected",
  "environment": "development",
  "cors_origins": ["http://localhost:3000"]
}
```

#### `GET /api/info` - Detailed API Information

Extended API capabilities and endpoint information.

### Mobile-Optimized Endpoints

#### `GET /api/v1/mobile/mobile-summary/{store_id}` - Mobile Dashboard

Fast overview for mobile scanning interface (target <300ms).

**Parameters:**

- `store_id` (path, required): Store UUID
- `include_details` (query, optional): Include detailed batch information
- `limit_urgent` (query, optional): Limit urgent items returned (default: 10)

**Authentication**: JWT Bearer token required

**Request:**

```bash
curl -X GET "http://localhost:8000/api/v1/mobile/mobile-summary/123e4567-e89b-12d3-a456-426614174000?include_details=true" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**

```json
{
  "urgent_batches": [
    {
      "batch_id": "456e7890-f12a-34b5-c678-567890123456",
      "product_sku": "MILK-WHOLE-1L",
      "product_name": "Whole Milk 1L",
      "score": 0.92,
      "urgency_level": "critical",
      "expires_in_hours": 8,
      "quantity_remaining": 12,
      "recommended_action": "Apply 30% discount immediately",
      "potential_loss_eur": 14.4
    }
  ],
  "expiring_today": [
    {
      "batch_id": "789e0123-f45a-67b8-c901-234567890123",
      "product_sku": "BREAD-SOUR-500G",
      "score": 0.78,
      "quantity": 8
    }
  ],
  "action_needed": 3,
  "total_active_batches": 156,
  "store_health_score": 0.85,
  "categories_at_risk": ["dairy", "bakery_fresh"],
  "last_updated": "2024-01-15T10:30:00Z",
  "cache_expires_in": 300
}
```

#### `POST /api/v1/mobile/batch-quick-score/{batch_id}` - Quick Batch Scoring

Real-time scoring for scanned items (target <200ms).

**Parameters:**

- `batch_id` (path, required): Batch UUID
- `store_id` (query, required): Store UUID

**Request:**

```bash
curl -X POST "http://localhost:8000/api/v1/mobile/batch-quick-score/456e7890-f12a-34b5-c678-567890123456?store_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response:**

```json
{
  "batch_id": "456e7890-f12a-34b5-c678-567890123456",
  "current_score": 0.78,
  "urgency_level": "high",
  "expires_in_hours": 18,
  "days_until_expiry": 1,
  "recommended_actions": [
    "Apply 15-20% discount within 6 hours",
    "Move to quick-sale section",
    "Alert staff for proactive selling"
  ],
  "category_risk_factor": 0.8,
  "economic_impact": {
    "potential_loss_eur": 12.5,
    "profit_at_risk_eur": 8.75
  },
  "processing_time_ms": 145
}
```

### Google Vision OCR Endpoints

#### `POST /api/v1/vision/analyze-image/{store_id}` - Advanced Image Analysis

Comprehensive image analysis with Google Vision API for complex scenarios.

**Parameters:**

- `store_id` (path, required): Store UUID
- `image` (form, required): Image file (JPEG, PNG, WebP, max 10MB)
- `analysis_type` (form, optional): "expiry_date", "barcode", "full" (default: "full")
- `confidence_threshold` (form, optional): 0.1-1.0 (default: 0.7)

**Request:**

```bash
curl -X POST "http://localhost:8000/api/v1/vision/analyze-image/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "image=@product_image.jpg" \
  -F "analysis_type=full" \
  -F "confidence_threshold=0.7"
```

**Response:**

```json
{
  "success": true,
  "image_id": "uuid-generated-id",
  "analysis_type": "full",
  "confidence_threshold": 0.7,
  "analysis_results": {
    "detections": [
      {
        "type": "barcode_ean13",
        "value": "1234567890123",
        "confidence": 0.95,
        "bounding_box": { "x": 50, "y": 200, "width": 150, "height": 40 }
      },
      {
        "type": "expiry_date",
        "value": "2024-03-25",
        "confidence": 0.89,
        "original_text": "25/03/24",
        "bounding_box": { "x": 120, "y": 340, "width": 80, "height": 20 }
      }
    ],
    "analysis_metadata": {
      "processing_confidence": 0.9,
      "data_sources": ["google_vision"],
      "requires_user_confirmation": false
    }
  },
  "processing_info": {
    "model_version": "google_vision_v3.4",
    "processing_time_ms": 2145,
    "image_size_bytes": 1024768,
    "confidence_score": 0.9
  }
}
```

### OCR Product Scanning Endpoints

#### `POST /api/v1/ocr/scan/full-ocr/{store_id}` - Complete OCR Analysis

Comprehensive OCR analysis with barcode detection, text extraction, and expiry date parsing.

**Parameters:**

- `store_id` (path, required): Store UUID
- `image` (form, required): Image file (JPEG, PNG, WebP, max 15MB)
- `confidence_threshold` (form, optional): 0.1-1.0 (default: 0.7)
- `max_processing_time_ms` (form, optional): 1000-10000 (default: 5000)

**Request:**

```bash
curl -X POST "http://localhost:8000/api/v1/ocr/scan/full-ocr/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "image=@complex_product.jpg" \
  -F "confidence_threshold=0.7"
```

**Response:**

```json
{
  "success": true,
  "scan_type": "full_ocr_analysis",
  "barcode": "1234567890123",
  "suggested_name": "Organic Milk 1L",
  "expiry_date": "2024-03-20",
  "manufacture_date": "2024-02-15",
  "raw_text_blocks": ["Organic Milk", "1L", "Use by 20/03/24", "PRO: 15/02/24", "1234567890123"],
  "confidence_scores": {
    "overall": 0.85,
    "barcode": 0.95,
    "expiry": 0.78
  },
  "processing_info": {
    "processing_time_ms": 2340,
    "data_sources": ["google_vision"],
    "requires_user_confirmation": false,
    "image_dimensions": { "width": 1024, "height": 768 }
  },
  "vision_details": {
    "detected_barcodes": 1,
    "detected_text_blocks": 5,
    "expiry_candidates": 2
  },
  "date_extraction_metadata": {
    "total_dates_detected": 2,
    "expiry_candidates": 1,
    "manufacture_candidates": 1,
    "extraction_strategy": "dual_context_based"
  }
}
```

#### `POST /api/v1/ocr/scan/ocr-expiry/{store_id}` - OCR Expiry Date Extraction

Extract expiry dates from product images using Google Vision OCR.

**Parameters:**

- `store_id` (path, required): Store UUID
- `image` (form, required): Image file (JPEG, PNG, WebP, max 10MB)
- `confidence_threshold` (form, optional): 0.1-1.0 (default: 0.65)

**Response:**

```json
{
  "success": true,
  "scan_type": "expiry_date_extraction",
  "expiry_date": "2024-03-15",
  "manufacture_date": "2024-01-20",
  "confidence_threshold": 0.65,
  "processing_type": "google_vision_ocr",
  "date_extraction_metadata": {
    "extraction_strategy": "dual_context_based",
    "total_dates_detected": 2
  }
}
```

### Scan Workflow Endpoints

#### `POST /api/v1/scan/scan-in/{store_id}` - Scan-In Workflow

Register new inventory via mobile scanning (proof of delivery).

**Request Body:**

```json
{
  "product_sku": "APPLE-RED-001",
  "barcode": "1234567890123",
  "product_name": "Red Apples",
  "category": "fresh_produce",
  "expiry_date": "2024-02-15",
  "quantity": 50,
  "cost_price": 1.5,
  "selling_price": 2.99,
  "manufacture_date": "2024-01-10",
  "location_code": "PRODUCE",
  "unit_type": "kg",
  "supplier_info": "Fresh Farms Ltd",
  "batch_notes": "Premium quality batch"
}
```

**Response:**

```json
{
  "success": true,
  "batch_id": "456e7890-f12a-34b5-c678-567890123456",
  "batch_number": "STORE123_APPLE-RED-001_20240215_001",
  "initial_score": 0.35,
  "urgency_level": "low",
  "expires_in_days": 30,
  "recommendations": [
    "Monitor in 25 days for proactive actions",
    "Schedule quality check in 20 days"
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "processing_time_ms": 245
}
```

#### `POST /api/v1/scan/scan-out/{store_id}/{batch_id}` - Scan-Out Workflow

Track when inventory is sold, discounted, or disposed.

**Request Body:**

```json
{
  "action": "sold_discounted",
  "quantity_moved": 10,
  "actual_selling_price": 2.39,
  "discount_percent": 20,
  "destination_location": "CHECKOUT",
  "staff_member_id": "staff-uuid",
  "notes": "Quick sale discount applied",
  "reason_code": "approaching_expiry"
}
```

**Action Types:**

- `sold_full_price` - Regular sale at full price
- `sold_discounted` - Discounted sale
- `donated` - Donation to charity
- `discarded` - Waste disposal
- `moved_location` - Location transfer within store
- `returned_supplier` - Supplier return

### CSV Processing Endpoints

#### `POST /api/v1/csv/upload` - Upload CSV File

Upload and process CSV inventory file with comprehensive validation.

**Parameters:**

- `store_id` (form, required): Store UUID
- `file` (form, required): CSV file (max 10MB)

**Request:**

```bash
curl -X POST "http://localhost:8000/api/v1/csv/upload" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@inventory_data.csv" \
  -F "store_id=123e4567-e89b-12d3-a456-426614174000"
```

**Response:**

```json
{
  "success": true,
  "message": "Successfully processed 145 items with 3 warnings",
  "data": {
    "processed_count": 145,
    "total_items": 148,
    "status": "success_with_warnings",
    "warnings": [
      {
        "row": 12,
        "field": "expiry_date",
        "message": "Date format unusual but successfully parsed",
        "original_value": "02/30/2024"
      }
    ],
    "errors": [],
    "store_id": "123e4567-e89b-12d3-a456-426614174000",
    "metadata": {
      "processing_time_ms": 1245,
      "categories_found": ["fresh_produce", "dairy", "bakery_fresh"],
      "duplicate_skus_resolved": 2
    }
  }
}
```

#### `GET /api/v1/csv/template` - Download CSV Template

Get CSV template with sample data and formatting guidelines.

**Response:**

```json
{
  "success": true,
  "data": {
    "content": "sku,product_name,category,quantity,expiry_date,brand,cost_price,selling_price...",
    "filename": "inventory_template.csv",
    "headers": [
      "sku",
      "product_name",
      "category",
      "quantity",
      "expiry_date",
      "brand",
      "cost_price",
      "selling_price",
      "manufacture_date",
      "location_code",
      "unit_type"
    ],
    "sample_rows": 3,
    "instructions": {
      "required_columns": ["sku", "product_name", "category", "quantity", "expiry_date"],
      "optional_columns": [
        "brand",
        "cost_price",
        "selling_price",
        "manufacture_date",
        "location_code",
        "unit_type"
      ],
      "category_examples": [
        "fresh_produce",
        "fresh_meat_fish",
        "dairy",
        "bakery_fresh",
        "frozen",
        "beverages",
        "dry_goods",
        "canned_jarred"
      ],
      "date_format": "YYYY-MM-DD (e.g., 2024-07-20)"
    }
  }
}
```

### Analytics Endpoints

#### `GET /api/v1/analytics/store/{store_id}` - Store Analytics

Comprehensive analytics for a store with configurable time periods.

**Parameters:**

- `store_id` (path, required): Store UUID
- `days` (query, optional): Analysis period in days (default: 30, max: 365)

**Response:**

```json
{
  "store_id": "123e4567-e89b-12d3-a456-426614174000",
  "analysis_period": "30 days",
  "data": {
    "inventory_summary": {
      "total_batches": 234,
      "active_batches": 156,
      "expired_count": 12,
      "expiring_soon_count": 23,
      "total_value_eur": 12450.0,
      "at_risk_value_eur": 1230.0
    },
    "urgency_distribution": {
      "critical": 8,
      "high": 23,
      "medium": 67,
      "low": 58
    },
    "category_breakdown": [
      {
        "category": "fresh_produce",
        "batch_count": 45,
        "total_value": 2340.0,
        "waste_rate": 0.08,
        "average_score": 0.65
      }
    ],
    "performance_metrics": {
      "waste_reduction_percent": 23.5,
      "revenue_recovery_eur": 2340.0,
      "discount_effectiveness": 0.78,
      "staff_response_time_hours": 2.4
    }
  },
  "generated_at": "2024-01-15T10:30:00Z"
}
```

### Scoring Endpoints

#### `POST /api/v1/scoring/calculate-score` - Calculate Batch Score

Calculate urgency score for a specific batch.

**Request Body:**

```json
{
  "store_id": "123e4567-e89b-12d3-a456-426614174000",
  "batch_id": "456e7890-f12a-34b5-c678-567890123456"
}
```

**Response:**

```json
{
  "batch_id": "456e7890-f12a-34b5-c678-567890123456",
  "score": 0.78,
  "urgency_level": "high",
  "factors": {
    "expiry_urgency": 0.85,
    "category_risk": 0.8,
    "economic_impact": 0.65,
    "sales_velocity": 0.45
  },
  "recommendations": [
    "Apply 15-20% discount within 24 hours",
    "Move to quick-sale section",
    "Alert staff for proactive selling"
  ],
  "expires_in_days": 2,
  "economic_impact": {
    "potential_loss_eur": 15.75,
    "profit_at_risk_eur": 11.25
  },
  "calculated_at": "2024-01-15T10:30:00Z"
}
```

---

## 5. Authentication & Security

### JWT Authentication Flow

The LIFO AI Engine uses **Supabase JWT tokens** for authentication, providing seamless integration with the frontend application.

#### Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1705324200,
  "iss": "https://your-project.supabase.co/auth/v1",
  "sub": "user-uuid",
  "email": "user@example.com",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "role": "store_manager"
  },
  "role": "authenticated"
}
```

#### Authentication Implementation

```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer
from app.auth.dependencies import get_current_user

security = HTTPBearer()

@app.get("/protected-endpoint")
async def protected_endpoint(
    current_user: SupabaseUser = Depends(get_current_user)
):
    return {"user_id": current_user.user_id, "email": current_user.email}
```

### API Key Usage (Alternative)

For service-to-service communication, you can use API keys:

```bash
curl -X GET "http://localhost:8000/api/v1/endpoint" \
  -H "X-API-Key: your-service-api-key"
```

### Store-Level Authorization

The system implements store-level access control using role hierarchies:

```python
# Role hierarchy: employee < staff < manager < owner
async def validate_store_access(
    store_id: str,
    current_user: SupabaseUser = Depends(get_current_user),
    required_role: str = "staff"
) -> bool:
    # Validate user has minimum required role for the store
    pass
```

**Role Levels:**

- **employee** (1): Basic store access
- **staff** (2): Standard operations
- **manager** (3): Management functions
- **owner** (4): Full administrative access

### Rate Limiting

#### Rate Limits by Endpoint Category

| Category         | Development | Production | Time Window |
| ---------------- | ----------- | ---------- | ----------- |
| Mobile Endpoints | 60/minute   | 40/minute  | Per IP      |
| Scan Workflows   | 40/minute   | 30/minute  | Per User    |
| CSV Processing   | 10/hour     | 3/hour     | Per User    |
| Analytics        | 60/minute   | 30/minute  | Per User    |
| OCR/Vision       | 30/minute   | 20/minute  | Per User    |

#### Rate Limit Headers

```http
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1642248600
Retry-After: 60
```

### CORS Configuration

#### Development CORS

```python
CORS_ORIGINS = [
    "http://localhost:3000",  # Next.js development
    "http://localhost:3001",  # Alternative dev port
]
```

#### Production CORS (Dynamic)

```python
def get_cors_origins(environment: str, frontend_url: str) -> list[str]:
    if environment == "production":
        origins = []
        if frontend_url and frontend_url.startswith("https://"):
            origins.append(frontend_url)
            # Add www subdomain if not present
            if not frontend_url.startswith("https://www."):
                www_url = frontend_url.replace("https://", "https://www.")
                origins.append(www_url)
        return origins
    return DEVELOPMENT_CORS_ORIGINS
```

---

## 6. Database Integration

### Supabase Integration

The LIFO AI Engine primarily uses **Supabase** as its database service, with SQLAlchemy for complex queries.

#### Connection Configuration

```python
# Async PostgreSQL with Supabase
DATABASE_URL = "postgresql+asyncpg://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

# Connection pooling settings
POOL_SIZE = 20
MAX_OVERFLOW = 30
POOL_RECYCLE = 3600  # 1 hour
```

#### Dual Database Strategy

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Primary: Supabase service for RLS and real-time features
    supabase_service = get_supabase_service()
    connection_ok = await supabase_service.test_connection()

    if connection_ok:
        logger.info("Supabase database connection established successfully")

    # Secondary: SQLAlchemy for complex analytical queries
    try:
        await init_database()
        logger.info("SQLAlchemy database connection also established")
    except Exception as sql_error:
        logger.warning("SQLAlchemy connection failed, using Supabase only", error=str(sql_error))

    yield
    await engine().dispose()
```

### Row Level Security (RLS)

Supabase RLS policies ensure multi-tenant data isolation:

```sql
-- Example RLS policy for inventory batches
CREATE POLICY "Users can only access their store's batches" ON inventory_batches
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM store_users
    WHERE store_users.store_id = inventory_batches.store_id
    AND store_users.user_id = auth.uid()
    AND store_users.is_active = true
  )
);
```

### Database Models

#### Core Models Structure

```python
# Store Model
class Store(BaseModel):
    store_id: UUID
    store_name: str
    store_type: StoreType
    location: LocationInfo
    settings: StoreSettings
    created_at: datetime
    updated_at: datetime

# Product Batch Model
class ProductBatch(BaseModel):
    batch_id: UUID
    store_id: UUID
    product_sku: str
    product_name: str
    category: ProductCategory
    barcode: Optional[str]
    quantity: float
    unit_type: UnitType
    cost_price: Decimal
    selling_price: Decimal
    manufacture_date: Optional[date]
    expiry_date: date
    location_code: Optional[str]
    current_score: float
    urgency_level: UrgencyLevel
    created_at: datetime
    updated_at: datetime
```

### Connection Pooling

#### Production Pool Configuration

```python
def get_engine():
    if settings.environment == "production":
        engine = create_async_engine(
            database_url,
            echo=False,
            future=True,
            pool_size=settings.db_pool_size,
            max_overflow=settings.db_max_overflow,
            pool_pre_ping=True,
            pool_recycle=settings.db_pool_recycle,
            connect_args={
                "command_timeout": 60,
                "ssl": "require",  # Required for Supabase
                "server_settings": {
                    "jit": "off",  # Disable JIT for predictable performance
                },
            },
        )
    return engine
```

#### Database Health Monitoring

```python
async def health_check() -> dict:
    try:
        async with engine().begin() as conn:
            # Test basic connectivity
            await conn.execute(text("SELECT 1"))

            # Get connection pool status
            return {
                "status": "healthy",
                "connection_pool": {
                    "size": engine.pool.size(),
                    "checked_in": engine.pool.checkedin(),
                    "checked_out": engine.pool.checkedout(),
                    "overflow": engine.pool.overflow(),
                    "invalid": engine.pool.invalid(),
                }
            }
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}
```

---

## 7. Error Handling & Monitoring

The LIFO AI Engine implements a comprehensive error handling and monitoring system that provides production-ready error management, automatic recovery, and detailed tracking for system reliability.

### 7.1 Error Handling Architecture

#### Error Categories and Severity Levels

The system categorizes errors into specific types with defined severity levels:

**Error Categories:**

- **Database**: Connection issues, query failures, integrity violations
- **Authentication**: JWT validation, user verification failures
- **Authorization**: Permission denied, resource access errors
- **Validation**: Request data validation, schema violations
- **External Service**: API timeouts, third-party service failures
- **Business Logic**: Domain-specific validation failures
- **System**: Server errors, resource exhaustion, crashes
- **Performance**: Timeouts, slow response alerts
- **Security**: Rate limiting violations, suspicious activity

**Severity Levels:**

- **Low**: Minor issues, validation errors (logged as info)
- **Medium**: Service degradation, auth failures (logged as warning)
- **High**: System errors, external service failures (logged as error)
- **Critical**: System crashes, data corruption (logged as error with alerts)

#### Error Tracking System

The system automatically tracks all errors with comprehensive metadata:

```python
# Error events include:
{
  "error_id": "abc123def456",           # Unique identifier
  "error_type": "ValidationError",      # Exception type
  "category": "validation",             # Error category
  "severity": "low",                    # Severity level
  "endpoint": "/api/v1/mobile/scan",    # Affected endpoint
  "user_id": "user-uuid",               # User context
  "client_ip": "192.168.1.1",          # Client IP
  "timestamp": "2024-01-15T10:30:00Z",  # UTC timestamp
  "context": {                          # Additional metadata
    "processing_time": 1250,
    "request_method": "POST",
    "recovery_attempted": true,
    "recovery_successful": false
  }
}
```

### 7.2 Automatic Error Recovery

The system implements intelligent error recovery for specific error types:

#### Database Connection Recovery

```python
@error_handler(
    category=ErrorCategory.DATABASE,
    severity=ErrorSeverity.HIGH,
    recovery_enabled=True
)
async def database_operation():
    # Operation that might fail
    # System will automatically attempt recovery
    pass
```

**Recovery Strategy:**

1. Test current connection
2. Reinitialize database connection if needed
3. Retry operation with exponential backoff
4. Maximum 3 retry attempts

#### External Service Recovery

- **Timeout Recovery**: Wait and retry with exponential backoff
- **Rate Limit Recovery**: Implement intelligent backoff based on rate limit headers
- **Connection Recovery**: Retry with different endpoints if available

### 7.3 Error Monitoring Endpoints

#### Get Error Statistics

```bash
GET /api/errors/stats
```

**Response:**

```json
{
  "error_tracking": {
    "total_errors": 1250,
    "errors_last_24h": 15,
    "errors_last_1h": 2,
    "category_breakdown_24h": {
      "validation": 8,
      "database": 4,
      "external_service": 2,
      "authentication": 1
    },
    "severity_breakdown_24h": {
      "low": 10,
      "medium": 4,
      "high": 1
    },
    "top_error_endpoints": [
      ["/api/v1/mobile/scan", 5],
      ["/api/v1/vision/analyze-image", 3]
    ],
    "recovery_success_rates": {
      "OperationalError": {
        "success_rate": 0.85,
        "attempted": 20,
        "successful": 17
      }
    }
  },
  "system_health": {
    "overall_status": "healthy",
    "error_rate_last_hour": 2,
    "monitoring_active": true
  }
}
```

#### Get Endpoint-Specific Analysis

```bash
GET /api/errors/endpoints/api/v1/mobile/scan
```

**Response:**

```json
{
  "endpoint_analysis": {
    "endpoint": "/api/v1/mobile/scan",
    "total_errors": 25,
    "errors_last_24h": 3,
    "error_types": {
      "ValidationError": 2,
      "TimeoutError": 1
    },
    "severity_breakdown": {
      "low": 2,
      "medium": 1
    },
    "avg_time_between_errors_seconds": 3600,
    "most_recent_errors": [
      {
        "error_id": "def456ghi789",
        "error_type": "ValidationError",
        "timestamp": "2024-01-15T10:25:00Z",
        "recovery_successful": false
      }
    ]
  }
}
```

### 7.4 Error Response Format

All errors follow a standardized response format:

```json
{
  "error": true,
  "error_id": "abc123def456",
  "code": "VALIDATION_ERROR",
  "message": "The request data is invalid. Please check your input and try again.",
  "timestamp": "2024-01-15T10:30:00Z",
  "debug": {
    // Only in debug mode
    "error_type": "ValidationError",
    "error_message": "Field 'store_id' is required",
    "category": "validation",
    "severity": "low"
  }
}
```

**Response Headers:**

```
X-Error-ID: abc123def456
X-Error-Category: validation
X-Error-Timestamp: 1705315800
Cache-Control: no-store, no-cache, must-revalidate
```

### 7.5 Performance Monitoring Integration

#### Metrics Collection

The error handling system integrates with performance monitoring:

- **Error Rate Metrics**: Tracked per endpoint and time window
- **Response Time Impact**: Correlation between errors and performance
- **Recovery Time Tracking**: Time to recover from failures
- **Cascade Detection**: Identify cascading failures across endpoints

#### Alert Thresholds

**Automatic Alerts:**

- Error rate > 10 errors/hour on any endpoint
- Critical severity errors (immediate alert)
- Recovery failure rate > 50% for any error type
- Error cascades detected (5+ errors in 5 minutes)

### 7.6 Development Usage

#### Using the Error Handler Decorator

```python
from app.utils.error_handling import error_handler, ErrorCategory, ErrorSeverity

@error_handler(
    category=ErrorCategory.EXTERNAL_SERVICE,
    severity=ErrorSeverity.MEDIUM,
    recovery_enabled=True
)
async def call_external_api():
    # Your code here
    # Errors will be automatically tracked and recovery attempted
    pass
```

#### Manual Error Tracking

```python
from app.utils.error_handling import get_error_tracker, ErrorEvent

error_tracker = get_error_tracker()

# Create and track custom error events
error_event = ErrorEvent(
    error=exception,
    category=ErrorCategory.BUSINESS_LOGIC,
    severity=ErrorSeverity.MEDIUM,
    endpoint="/api/v1/custom",
    context={"custom_data": "value"}
)

error_tracker.track_error(error_event)
```

### 7.7 Production Monitoring

#### Health Check Integration

The `/health` endpoint includes error monitoring status:

```json
{
  "status": "healthy",
  "error_monitoring": {
    "active": true,
    "errors_last_hour": 2,
    "recovery_success_rate": 0.85,
    "system_health": "normal"
  }
}
```

#### Log Integration

Errors are automatically logged with structured data:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "ERROR",
  "message": "Database connection failed",
  "error_id": "abc123def456",
  "category": "database",
  "severity": "high",
  "endpoint": "/api/v1/mobile/scan",
  "recovery_attempted": true,
  "recovery_successful": false,
  "context": {
    "processing_time_ms": 1250,
    "user_id": "user-uuid"
  }
}
```

---

## 8. Development Guide

### Project Structure

```
lifo_api/
├── app/
│   ├── main.py                 # FastAPI application entry point
│   ├── api/
│   │   ├── dependencies.py     # Shared dependencies
│   │   └── v1/
│   │       ├── router.py       # Main API router
│   │       ├── analytics.py    # Analytics endpoints
│   │       ├── csv.py          # CSV processing endpoints
│   │       ├── mobile_endpoints.py # Mobile-optimized endpoints
│   │       ├── product_scanning.py # OCR scanning endpoints
│   │       ├── scoring.py      # AI scoring endpoints
│   │       └── ...
│   ├── auth/
│   │   ├── dependencies.py     # Authentication dependencies
│   │   ├── supabase_jwt.py     # JWT validation logic
│   │   └── ...
│   ├── core/
│   │   └── config.py           # Configuration management
│   ├── database/
│   │   ├── connection.py       # Database connection management
│   │   ├── models.py           # SQLAlchemy models
│   │   └── ...
│   ├── middleware/
│   │   ├── rate_limiting.py    # Rate limiting middleware
│   │   └── security_headers.py # Security headers middleware
│   ├── services/
│   │   ├── vision_service.py   # Google Vision API service
│   │   └── ...
│   └── utils/
│       ├── exceptions.py       # Custom exception handlers
│       ├── logging.py          # Logging configuration
│       └── ...
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── api/                    # API endpoint tests
│   └── e2e/                    # End-to-end tests
├── requirements.txt            # Python dependencies
└── README.md
```

### Running Tests

#### Comprehensive Test Suite

The LIFO API includes 124+ comprehensive tests across all layers:

```bash
# Run all tests
pytest tests/ -v

# Run specific test categories
pytest tests/unit/ -v          # Unit tests (46 tests)
pytest tests/integration/ -v   # Integration tests (25 tests)
pytest tests/api/ -v           # API tests (35 tests)
pytest tests/e2e/ -v           # E2E tests (18 tests)

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run performance tests
pytest tests/performance/ -v
```

#### Test Configuration

```python
# conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    return TestClient(app)

@pytest.fixture
def auth_headers():
    return {"Authorization": "Bearer test-jwt-token"}

@pytest.fixture
async def db_session():
    # Provide test database session
    pass
```

### Code Quality Tools

#### Ruff (Linting and Formatting)

```bash
# Check code quality
ruff check app/ tests/

# Auto-fix issues
ruff check app/ tests/ --fix

# Format code
ruff format app/ tests/
```

#### MyPy (Type Checking)

```bash
# Run type checking
mypy app/ --strict

# Generate type coverage report
mypy app/ --html-report=mypy-report/
```

#### Configuration Files

**pyproject.toml:**

```toml
[tool.ruff]
target-version = "py39"
select = ["E", "W", "F", "I", "B", "C", "UP"]
ignore = ["E501", "B008", "C901"]

[tool.mypy]
python_version = "3.9"
strict = true
warn_return_any = true
warn_unused_configs = true
```

### Development Workflow

#### 1. Feature Development

```bash
# Create feature branch
git checkout -b feature/new-endpoint

# Install dependencies in development mode
pip install -e .

# Run application with auto-reload
uvicorn app.main:app --reload --port 8000
```

#### 2. Testing Workflow

```bash
# Run tests before committing
pytest tests/ -v

# Check code quality
ruff check app/
mypy app/

# Run specific endpoint tests
pytest tests/api/test_mobile_endpoints.py -v
```

#### 3. API Documentation

```bash
# Access interactive docs
open http://localhost:8000/docs

# Generate OpenAPI spec
curl http://localhost:8000/openapi.json > openapi.json
```

### Contributing Guidelines

#### Code Standards

1. **Type Hints**: All functions must have complete type annotations
2. **Docstrings**: Use Google-style docstrings for all public functions
3. **Error Handling**: Implement comprehensive error handling with structured logging
4. **Testing**: Maintain >90% test coverage for all new code

#### Pull Request Process

1. Create feature branch from `main`
2. Implement feature with tests
3. Run full test suite and code quality checks
4. Update documentation if needed
5. Submit pull request with clear description

#### Example Code Style

```python
async def process_inventory_batch(
    batch_data: BatchCreateRequest,
    store_id: UUID,
    user: SupabaseUser,
    db: AsyncSession = Depends(get_database)
) -> BatchResponse:
    """
    Process new inventory batch with validation and scoring.

    Args:
        batch_data: Batch creation request data
        store_id: Store UUID for the batch
        user: Current authenticated user
        db: Database session

    Returns:
        BatchResponse: Created batch with initial scoring

    Raises:
        HTTPException: If validation fails or processing error occurs
    """
    try:
        # Validate store access
        await validate_store_access(str(store_id), user, db)

        # Process batch creation
        batch = await create_batch_from_data(batch_data, store_id, db)

        # Calculate initial score
        score = await calculate_batch_score(batch.batch_id, db)

        logger.info(
            "Batch created successfully",
            batch_id=batch.batch_id,
            store_id=store_id,
            user_id=user.user_id
        )

        return BatchResponse(
            batch_id=batch.batch_id,
            initial_score=score.score,
            urgency_level=score.urgency_level
        )

    except ValidationException as e:
        logger.error("Batch validation failed", error=str(e))
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error("Batch processing failed", error=str(e))
        raise HTTPException(status_code=500, detail="Internal processing error")
```

---

## 8. Deployment

### Production Environment Setup

#### Environment Variables (Production)

```env
# Core Configuration
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=WARNING
API_VERSION=1.0.0

# Database (Supabase Production)
DATABASE_URL=postgresql+asyncpg://postgres:[PROD_PASSWORD]@db.[PROD_PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROD_PROJECT].supabase.co
SUPABASE_JWT_SECRET=[PROD_JWT_SECRET]
SUPABASE_SERVICE_ROLE_KEY=[PROD_SERVICE_KEY]

# Security
JWT_SECRET_KEY=[STRONG_PRODUCTION_SECRET]
FRONTEND_URL=https://app.lifoai.com
API_URL=https://api.lifoai.com

# External Services
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials/service-account.json
REDIS_URL=redis://redis-cluster:6379/0

# Performance
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
CACHE_TTL_SECONDS=300
```

#### Docker Deployment

**Dockerfile:**

```dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY tests/ ./tests/

# Create non-root user
RUN useradd --create-home --shell /bin/bash lifo
RUN chown -R lifo:lifo /app
USER lifo

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**docker-compose.yml:**

```yaml
version: '3.8'

services:
  lifo-api:
    build: .
    ports:
      - '8000:8000'
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - redis
    volumes:
      - ./credentials:/app/credentials:ro
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

#### Digital Ocean App Platform

**app.yaml:**

```yaml
name: lifo-ai-engine
services:
  - name: api
    source_dir: /
    github:
      repo: your-org/lifo-app
      branch: main
    run_command: uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 4
    environment_slug: python
    instance_count: 2
    instance_size_slug: basic-s

    envs:
      - key: ENVIRONMENT
        value: production
      - key: DATABASE_URL
        value: ${DATABASE_URL}
      - key: SUPABASE_JWT_SECRET
        value: ${SUPABASE_JWT_SECRET}
        type: SECRET
      - key: GOOGLE_APPLICATION_CREDENTIALS
        value: /app/service-account.json

    health_check:
      http_path: /health

databases:
  - name: redis
    engine: REDIS
    version: '7'
```

### Health Checks and Monitoring

#### Health Check Endpoint

```python
@app.get("/health")
async def comprehensive_health_check():
    """Comprehensive health check for production monitoring"""
    health_status = {
        "status": "healthy",
        "timestamp": time.time(),
        "version": settings.api_version,
        "environment": settings.environment,
        "checks": {}
    }

    # Database health
    try:
        db_healthy = await test_connection()
        health_status["checks"]["database"] = {
            "status": "healthy" if db_healthy else "unhealthy",
            "response_time_ms": await get_db_response_time()
        }
    except Exception as e:
        health_status["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }

    # Redis health (if configured)
    if settings.redis_url:
        try:
            redis_healthy = await test_redis_connection()
            health_status["checks"]["redis"] = {
                "status": "healthy" if redis_healthy else "unhealthy"
            }
        except Exception as e:
            health_status["checks"]["redis"] = {
                "status": "unhealthy",
                "error": str(e)
            }

    # Google Vision API health
    try:
        vision_healthy = await test_vision_api()
        health_status["checks"]["vision_api"] = {
            "status": "healthy" if vision_healthy else "unhealthy"
        }
    except Exception as e:
        health_status["checks"]["vision_api"] = {
            "status": "unhealthy",
            "error": str(e)
        }

    # Overall status
    all_healthy = all(
        check.get("status") == "healthy"
        for check in health_status["checks"].values()
    )

    if not all_healthy:
        health_status["status"] = "unhealthy"
        return JSONResponse(status_code=503, content=health_status)

    return health_status
```

#### Application Metrics

```python
from prometheus_client import Counter, Histogram, generate_latest

# Metrics collection
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()

    response = await call_next(request)

    duration = time.time() - start_time
    REQUEST_DURATION.observe(duration)
    REQUEST_COUNT.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    return response

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), media_type="text/plain")
```

### Scaling Considerations

#### Horizontal Scaling

```bash
# Scale with multiple workers (CPU intensive tasks)
uvicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker

# Scale with multiple instances (I/O intensive tasks)
# Use load balancer + multiple app instances
```

#### Database Optimization

```python
# Connection pool optimization for high load
PRODUCTION_DB_CONFIG = {
    "pool_size": 20,
    "max_overflow": 30,
    "pool_pre_ping": True,
    "pool_recycle": 3600,
    "pool_timeout": 30,
}

# Read replicas for analytics queries
ANALYTICS_DB_URL = "postgresql+asyncpg://readonly_user:pass@read-replica:5432/db"
```

#### Caching Strategy

```python
import redis.asyncio as redis
from functools import wraps

redis_client = redis.from_url(settings.redis_url)

def cache_result(ttl: int = 300):
    """Cache decorator for expensive operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{hash(str(args) + str(kwargs))}"

            # Try to get from cache
            cached = await redis_client.get(cache_key)
            if cached:
                return json.loads(cached)

            # Execute function and cache result
            result = await func(*args, **kwargs)
            await redis_client.setex(cache_key, ttl, json.dumps(result, default=str))

            return result
        return wrapper
    return decorator

@cache_result(ttl=600)  # 10 minutes
async def get_store_analytics(store_id: str, days: int = 30):
    """Cached analytics computation"""
    pass
```

---

## 9. Usage Examples

### JavaScript/TypeScript Integration

#### Complete API Client

```typescript
interface ApiClientConfig {
  baseUrl: string
  token: string
  timeout?: number
}

class LifoApiClient {
  private baseUrl: string
  private token: string
  private timeout: number

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.token = config.token
    this.timeout = config.timeout || 30000
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`API Error ${response.status}: ${errorData.error || response.statusText}`)
      }

      return response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  // Mobile endpoints
  async getMobileSummary(
    storeId: string,
    options: { includeDetails?: boolean; limitUrgent?: number } = {},
  ): Promise<MobileSummaryResponse> {
    const params = new URLSearchParams()
    if (options.includeDetails) params.set('include_details', 'true')
    if (options.limitUrgent) params.set('limit_urgent', options.limitUrgent.toString())

    return this.request(`/api/v1/mobile/mobile-summary/${storeId}?${params}`)
  }

  async quickScoreBatch(batchId: string, storeId: string): Promise<QuickScoreResponse> {
    return this.request(`/api/v1/mobile/batch-quick-score/${batchId}?store_id=${storeId}`, {
      method: 'POST',
    })
  }

  // OCR scanning endpoints
  async fullOcrScan(
    storeId: string,
    image: File,
    options: {
      confidenceThreshold?: number
      maxProcessingTime?: number
    } = {},
  ): Promise<FullOcrResponse> {
    const formData = new FormData()
    formData.append('image', image)
    if (options.confidenceThreshold) {
      formData.append('confidence_threshold', options.confidenceThreshold.toString())
    }
    if (options.maxProcessingTime) {
      formData.append('max_processing_time_ms', options.maxProcessingTime.toString())
    }

    return this.request(`/api/v1/ocr/scan/full-ocr/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
        // Don't set Content-Type for FormData
      },
      body: formData,
    })
  }

  async expiryDateScan(storeId: string, image: File): Promise<ExpiryDateResponse> {
    const formData = new FormData()
    formData.append('image', image)

    return this.request(`/api/v1/ocr/scan/ocr-expiry/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    })
  }

  // Scan workflow endpoints
  async scanIn(storeId: string, data: ScanInRequest): Promise<ScanInResponse> {
    return this.request(`/api/v1/scan/scan-in/${storeId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async scanOut(storeId: string, batchId: string, data: ScanOutRequest): Promise<ScanOutResponse> {
    return this.request(`/api/v1/scan/scan-out/${storeId}/${batchId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Analytics endpoints
  async getStoreAnalytics(storeId: string, days: number = 30): Promise<AnalyticsResponse> {
    return this.request(`/api/v1/analytics/store/${storeId}?days=${days}`)
  }

  async getDashboardData(storeId: string): Promise<DashboardResponse> {
    return this.request(`/api/v1/analytics/dashboard/${storeId}`)
  }

  // CSV processing
  async uploadCsv(storeId: string, file: File): Promise<CsvUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('store_id', storeId)

    return this.request('/api/v1/csv/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
      body: formData,
    })
  }

  async getCsvTemplate(): Promise<CsvTemplateResponse> {
    return this.request('/api/v1/csv/template')
  }

  // Scoring
  async calculateScore(storeId: string, batchId: string): Promise<ScoreResponse> {
    return this.request('/api/v1/scoring/calculate-score', {
      method: 'POST',
      body: JSON.stringify({ store_id: storeId, batch_id: batchId }),
    })
  }
}

// Usage example
const client = new LifoApiClient({
  baseUrl: 'https://api.lifoai.com',
  token: userToken,
  timeout: 30000,
})

// React hook for mobile scanning
function useMobileScanning(storeId: string) {
  const [summary, setSummary] = useState<MobileSummaryResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshSummary = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await client.getMobileSummary(storeId, {
        includeDetails: true,
        limitUrgent: 15,
      })
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [storeId])

  const scanProduct = useCallback(
    async (image: File) => {
      try {
        const result = await client.fullOcrScan(storeId, image, {
          confidenceThreshold: 0.7,
          maxProcessingTime: 5000,
        })

        if (result.success && result.barcode) {
          // Process successful scan
          await refreshSummary() // Refresh dashboard
          return result
        }

        throw new Error('Scan failed or no barcode detected')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Scan failed')
        throw err
      }
    },
    [storeId, refreshSummary],
  )

  useEffect(() => {
    refreshSummary()
  }, [refreshSummary])

  return {
    summary,
    loading,
    error,
    refreshSummary,
    scanProduct,
  }
}
```

### Python Integration

#### Complete Python Client

```python
import asyncio
import json
from typing import Dict, Any, Optional, List
from pathlib import Path
import httpx
from pydantic import BaseModel

class LifoApiClient:
    """Async Python client for LIFO AI Engine API"""

    def __init__(
        self,
        base_url: str,
        token: str,
        timeout: int = 30
    ):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.timeout = timeout
        self.client = httpx.AsyncClient(
            headers={'Authorization': f'Bearer {token}'},
            timeout=timeout
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

    async def request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Dict[str, Any]:
        """Make authenticated API request"""
        url = f"{self.base_url}{endpoint}"

        try:
            response = await self.client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            error_detail = "Unknown error"
            try:
                error_data = e.response.json()
                error_detail = error_data.get('error', error_data.get('detail', str(e)))
            except:
                pass
            raise Exception(f"API Error {e.response.status_code}: {error_detail}")

    # Mobile endpoints
    async def get_mobile_summary(
        self,
        store_id: str,
        include_details: bool = True,
        limit_urgent: int = 10
    ) -> Dict[str, Any]:
        """Get mobile dashboard summary"""
        params = {
            'include_details': include_details,
            'limit_urgent': limit_urgent
        }
        return await self.request(
            'GET',
            f'/api/v1/mobile/mobile-summary/{store_id}',
            params=params
        )

    async def quick_score_batch(
        self,
        batch_id: str,
        store_id: str
    ) -> Dict[str, Any]:
        """Get quick batch score"""
        return await self.request(
            'POST',
            f'/api/v1/mobile/batch-quick-score/{batch_id}',
            params={'store_id': store_id}
        )

    # OCR scanning endpoints
    async def full_ocr_scan(
        self,
        store_id: str,
        image_path: Path,
        confidence_threshold: float = 0.7,
        max_processing_time: int = 5000
    ) -> Dict[str, Any]:
        """Perform full OCR analysis on product image"""
        with open(image_path, 'rb') as img_file:
            files = {'image': img_file}
            data = {
                'confidence_threshold': confidence_threshold,
                'max_processing_time_ms': max_processing_time
            }

            return await self.request(
                'POST',
                f'/api/v1/ocr/scan/full-ocr/{store_id}',
                files=files,
                data=data
            )

    async def expiry_date_scan(
        self,
        store_id: str,
        image_path: Path,
        confidence_threshold: float = 0.65
    ) -> Dict[str, Any]:
        """Extract expiry date from product image"""
        with open(image_path, 'rb') as img_file:
            files = {'image': img_file}
            data = {'confidence_threshold': confidence_threshold}

            return await self.request(
                'POST',
                f'/api/v1/ocr/scan/ocr-expiry/{store_id}',
                files=files,
                data=data
            )

    # Scan workflow endpoints
    async def scan_in_product(
        self,
        store_id: str,
        product_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Scan in new product batch"""
        return await self.request(
            'POST',
            f'/api/v1/scan/scan-in/{store_id}',
            json=product_data
        )

    async def scan_out_product(
        self,
        store_id: str,
        batch_id: str,
        scan_out_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Scan out product batch"""
        return await self.request(
            'POST',
            f'/api/v1/scan/scan-out/{store_id}/{batch_id}',
            json=scan_out_data
        )

    # Analytics endpoints
    async def get_store_analytics(
        self,
        store_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get comprehensive store analytics"""
        return await self.request(
            'GET',
            f'/api/v1/analytics/store/{store_id}',
            params={'days': days}
        )

    async def get_dashboard_data(
        self,
        store_id: str
    ) -> Dict[str, Any]:
        """Get dashboard overview data"""
        return await self.request(
            'GET',
            f'/api/v1/analytics/dashboard/{store_id}'
        )

    # CSV processing
    async def upload_csv(
        self,
        store_id: str,
        csv_file_path: Path
    ) -> Dict[str, Any]:
        """Upload and process CSV inventory file"""
        with open(csv_file_path, 'rb') as csv_file:
            files = {'file': csv_file}
            data = {'store_id': store_id}

            return await self.request(
                'POST',
                '/api/v1/csv/upload',
                files=files,
                data=data
            )

    async def get_csv_template(self) -> Dict[str, Any]:
        """Get CSV template with instructions"""
        return await self.request('GET', '/api/v1/csv/template')

    # Scoring
    async def calculate_score(
        self,
        store_id: str,
        batch_id: str
    ) -> Dict[str, Any]:
        """Calculate batch urgency score"""
        return await self.request(
            'POST',
            '/api/v1/scoring/calculate-score',
            json={'store_id': store_id, 'batch_id': batch_id}
        )

    # Health check
    async def health_check(self) -> Dict[str, Any]:
        """Check API health status"""
        return await self.request('GET', '/health')

# Usage examples
async def main():
    """Example usage of the LIFO API client"""

    async with LifoApiClient(
        base_url='https://api.lifoai.com',
        token='your-jwt-token',
        timeout=30
    ) as client:

        store_id = "123e4567-e89b-12d3-a456-426614174000"

        # Health check
        health = await client.health_check()
        print(f"API Status: {health['status']}")

        # Get mobile summary
        try:
            summary = await client.get_mobile_summary(
                store_id=store_id,
                include_details=True,
                limit_urgent=15
            )
            print(f"Store health score: {summary['store_health_score']}")
            print(f"Urgent batches: {len(summary['urgent_batches'])}")

            # Process urgent batches
            for batch in summary['urgent_batches']:
                if batch['urgency_level'] == 'critical':
                    print(f"CRITICAL: {batch['product_name']} expires in {batch['expires_in_hours']} hours")

        except Exception as e:
            print(f"Failed to get mobile summary: {e}")

        # OCR scanning example
        try:
            image_path = Path("test_images/product_scan.jpg")
            if image_path.exists():
                ocr_result = await client.full_ocr_scan(
                    store_id=store_id,
                    image_path=image_path,
                    confidence_threshold=0.7
                )

                if ocr_result['success']:
                    print(f"OCR Detection:")
                    print(f"  Barcode: {ocr_result.get('barcode', 'Not detected')}")
                    print(f"  Product: {ocr_result.get('suggested_name', 'Not detected')}")
                    print(f"  Expiry: {ocr_result.get('expiry_date', 'Not detected')}")
                    print(f"  Confidence: {ocr_result['confidence_scores']['overall']}")

                    # If OCR was successful, create a batch
                    if ocr_result.get('barcode') and ocr_result.get('expiry_date'):
                        product_data = {
                            'product_sku': f"AUTO_{ocr_result['barcode']}",
                            'barcode': ocr_result['barcode'],
                            'product_name': ocr_result.get('suggested_name', 'Unknown Product'),
                            'category': 'unknown',  # Would be determined by business logic
                            'expiry_date': ocr_result['expiry_date'],
                            'quantity': 1,  # Default quantity
                            'cost_price': 0.0,  # Would be filled by user
                            'selling_price': 0.0,  # Would be filled by user
                        }

                        scan_result = await client.scan_in_product(store_id, product_data)
                        print(f"Created batch: {scan_result['batch_id']}")
                        print(f"Initial score: {scan_result['initial_score']}")

        except Exception as e:
            print(f"OCR scanning failed: {e}")

        # Analytics example
        try:
            analytics = await client.get_store_analytics(store_id, days=7)

            print(f"\n7-Day Analytics:")
            print(f"  Total batches: {analytics['data']['inventory_summary']['total_batches']}")
            print(f"  Active batches: {analytics['data']['inventory_summary']['active_batches']}")
            print(f"  Expired count: {analytics['data']['inventory_summary']['expired_count']}")
            print(f"  Total value: €{analytics['data']['inventory_summary']['total_value_eur']}")

            # Category breakdown
            for category in analytics['data']['category_breakdown']:
                print(f"  {category['category']}: {category['batch_count']} batches, {category['waste_rate']:.1%} waste rate")

        except Exception as e:
            print(f"Analytics retrieval failed: {e}")

# Batch processing example
class ProductBatchProcessor:
    """Process multiple products efficiently"""

    def __init__(self, client: LifoApiClient, store_id: str):
        self.client = client
        self.store_id = store_id

    async def process_image_directory(
        self,
        image_dir: Path,
        max_concurrent: int = 3
    ) -> List[Dict[str, Any]]:
        """Process all images in a directory concurrently"""

        image_files = list(image_dir.glob("*.jpg")) + list(image_dir.glob("*.png"))

        async def process_single_image(image_path: Path) -> Dict[str, Any]:
            try:
                result = await self.client.full_ocr_scan(
                    store_id=self.store_id,
                    image_path=image_path,
                    confidence_threshold=0.6
                )
                result['image_path'] = str(image_path)
                return result
            except Exception as e:
                return {
                    'image_path': str(image_path),
                    'success': False,
                    'error': str(e)
                }

        # Process images with concurrency limit
        semaphore = asyncio.Semaphore(max_concurrent)

        async def process_with_semaphore(image_path: Path):
            async with semaphore:
                return await process_single_image(image_path)

        tasks = [process_with_semaphore(img) for img in image_files]
        results = await asyncio.gather(*tasks)

        # Summary
        successful = [r for r in results if r.get('success')]
        failed = [r for r in results if not r.get('success')]

        print(f"Processed {len(image_files)} images:")
        print(f"  Successful: {len(successful)}")
        print(f"  Failed: {len(failed)}")

        return results

# Run the examples
if __name__ == "__main__":
    asyncio.run(main())
```

### Error Handling Examples

#### Comprehensive Error Handling

```python
import logging
from typing import Optional
from enum import Enum

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class LifoApiError(Exception):
    """Base exception for LIFO API errors"""

    def __init__(
        self,
        message: str,
        status_code: Optional[int] = None,
        error_code: Optional[str] = None,
        severity: ErrorSeverity = ErrorSeverity.MEDIUM,
        context: Optional[Dict[str, Any]] = None
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.severity = severity
        self.context = context or {}

class ApiErrorHandler:
    """Centralized error handling for API interactions"""

    def __init__(self, logger: Optional[logging.Logger] = None):
        self.logger = logger or logging.getLogger(__name__)

    def handle_api_error(self, error: Exception, context: Dict[str, Any] = None) -> LifoApiError:
        """Convert various error types to standardized LifoApiError"""

        context = context or {}

        if isinstance(error, httpx.HTTPStatusError):
            # HTTP errors from API
            status_code = error.response.status_code

            try:
                error_data = error.response.json()
                message = error_data.get('error', error_data.get('detail', str(error)))
                error_code = error_data.get('error_code', f'HTTP_{status_code}')
            except:
                message = str(error)
                error_code = f'HTTP_{status_code}'

            severity = self._determine_severity(status_code)

            self.logger.error(
                f"API HTTP Error: {message}",
                extra={
                    'status_code': status_code,
                    'error_code': error_code,
                    'context': context
                }
            )

            return LifoApiError(
                message=message,
                status_code=status_code,
                error_code=error_code,
                severity=severity,
                context=context
            )

        elif isinstance(error, httpx.TimeoutException):
            # Timeout errors
            message = f"API request timed out: {str(error)}"

            self.logger.warning(
                f"API Timeout: {message}",
                extra={'context': context}
            )

            return LifoApiError(
                message=message,
                error_code='TIMEOUT',
                severity=ErrorSeverity.MEDIUM,
                context=context
            )

        elif isinstance(error, httpx.NetworkError):
            # Network connectivity errors
            message = f"Network error: {str(error)}"

            self.logger.error(
                f"API Network Error: {message}",
                extra={'context': context}
            )

            return LifoApiError(
                message=message,
                error_code='NETWORK_ERROR',
                severity=ErrorSeverity.HIGH,
                context=context
            )

        else:
            # Generic errors
            message = f"Unexpected error: {str(error)}"

            self.logger.error(
                f"API Unexpected Error: {message}",
                extra={'context': context, 'error_type': type(error).__name__}
            )

            return LifoApiError(
                message=message,
                error_code='UNEXPECTED_ERROR',
                severity=ErrorSeverity.HIGH,
                context=context
            )

    def _determine_severity(self, status_code: int) -> ErrorSeverity:
        """Determine error severity based on HTTP status code"""
        if status_code >= 500:
            return ErrorSeverity.CRITICAL
        elif status_code == 429:  # Rate limit
            return ErrorSeverity.MEDIUM
        elif status_code in [401, 403]:  # Auth errors
            return ErrorSeverity.HIGH
        elif status_code >= 400:
            return ErrorSeverity.MEDIUM
        else:
            return ErrorSeverity.LOW

# Usage in client with error handling
class RobustLifoApiClient(LifoApiClient):
    """LIFO API client with comprehensive error handling"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.error_handler = ApiErrorHandler()
        self.retry_config = {
            'max_retries': 3,
            'backoff_factor': 1.0,
            'retry_status_codes': [500, 502, 503, 504]
        }

    async def request_with_retry(
        self,
        method: str,
        endpoint: str,
        context: Optional[Dict[str, Any]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """Make API request with retry logic and error handling"""

        context = context or {}
        last_error = None

        for attempt in range(self.retry_config['max_retries'] + 1):
            try:
                return await self.request(method, endpoint, **kwargs)

            except Exception as e:
                last_error = e

                # Convert to standardized error
                api_error = self.error_handler.handle_api_error(e, context)

                # Check if we should retry
                should_retry = (
                    attempt < self.retry_config['max_retries'] and
                    self._should_retry_error(api_error)
                )

                if not should_retry:
                    raise api_error

                # Wait before retry
                wait_time = self.retry_config['backoff_factor'] * (2 ** attempt)
                await asyncio.sleep(wait_time)

                context['retry_attempt'] = attempt + 1

        # If we get here, all retries failed
        raise self.error_handler.handle_api_error(last_error, context)

    def _should_retry_error(self, error: LifoApiError) -> bool:
        """Determine if an error should trigger a retry"""

        # Don't retry client errors (4xx except rate limit)
        if error.status_code and 400 <= error.status_code < 500 and error.status_code != 429:
            return False

        # Don't retry authentication errors
        if error.error_code in ['AUTHENTICATION_ERROR', 'AUTHORIZATION_ERROR']:
            return False

        # Retry server errors, timeouts, and network errors
        return error.status_code in self.retry_config['retry_status_codes'] or \
               error.error_code in ['TIMEOUT', 'NETWORK_ERROR']

# Usage example with error handling
async def robust_scanning_workflow():
    """Example of robust error handling in scanning workflow"""

    async with RobustLifoApiClient(
        base_url='https://api.lifoai.com',
        token='your-token'
    ) as client:

        store_id = "your-store-id"
        image_path = Path("product_image.jpg")

        try:
            # Attempt OCR scanning with retry logic
            result = await client.request_with_retry(
                'POST',
                f'/api/v1/ocr/scan/full-ocr/{store_id}',
                context={
                    'operation': 'ocr_scan',
                    'store_id': store_id,
                    'image_path': str(image_path)
                },
                files={'image': open(image_path, 'rb')},
                data={'confidence_threshold': 0.7}
            )

            if result['success'] and result.get('barcode'):
                print(f"✅ OCR successful: {result['suggested_name']}")

                # Proceed with batch creation
                try:
                    batch_data = {
                        'product_sku': f"AUTO_{result['barcode']}",
                        'barcode': result['barcode'],
                        'product_name': result['suggested_name'],
                        'expiry_date': result['expiry_date'],
                        'quantity': 1,
                        'category': 'unknown'
                    }

                    batch_result = await client.request_with_retry(
                        'POST',
                        f'/api/v1/scan/scan-in/{store_id}',
                        context={
                            'operation': 'batch_creation',
                            'ocr_result_id': result.get('image_id')
                        },
                        json=batch_data
                    )

                    print(f"✅ Batch created: {batch_result['batch_id']}")
                    print(f"   Initial score: {batch_result['initial_score']}")

                except LifoApiError as e:
                    if e.severity in [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL]:
                        print(f"❌ Critical batch creation error: {e.message}")
                        # Potentially alert administrators
                    else:
                        print(f"⚠️  Batch creation failed: {e.message}")
                        # Might retry later or use fallback
            else:
                print("⚠️  OCR completed but no usable data extracted")

        except LifoApiError as e:
            # Handle different error types appropriately
            if e.error_code == 'AUTHENTICATION_ERROR':
                print("❌ Authentication failed - check your token")
                # Redirect to login
            elif e.error_code == 'RATE_LIMIT_EXCEEDED':
                print(f"⏳ Rate limit exceeded - retry after {e.context.get('retry_after', 60)} seconds")
                # Implement exponential backoff
            elif e.severity == ErrorSeverity.CRITICAL:
                print(f"🚨 Critical error: {e.message}")
                # Alert monitoring systems
            else:
                print(f"❌ Operation failed: {e.message}")
                # Log for debugging

        except Exception as e:
            print(f"💥 Unexpected error: {e}")
            # Fallback error handling

if __name__ == "__main__":
    asyncio.run(robust_scanning_workflow())
```

---

## 10. Troubleshooting

### Common Issues and Solutions

#### 1. Authentication Issues

**Problem**: `401 Unauthorized` errors

**Solutions:**

```bash
# Check JWT token validity
python -c "
import jwt
token = 'your-jwt-token'
try:
    decoded = jwt.decode(token, options={'verify_signature': False})
    print('Token valid, expires:', decoded.get('exp'))
except:
    print('Invalid token format')
"

# Test with service role token
curl -X GET "http://localhost:8000/health" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Verify Supabase configuration
python -c "
from app.auth.supabase_jwt import supabase_auth
print('JWT Secret configured:', bool(supabase_auth.jwt_secret))
"
```

**Environment Check:**

```env
# Ensure these are set correctly
SUPABASE_JWT_SECRET=your-actual-jwt-secret
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 2. Database Connection Issues

**Problem**: Database connection failures

**Diagnostic Steps:**

```bash
# Test basic database connectivity
python -c "
import asyncio
from app.database.connection import test_connection
result = asyncio.run(test_connection())
print('Database connected:', result)
"

# Check connection pool status
python -c "
import asyncio
from app.database.connection import get_db_manager
async def check_pool():
    db_manager = get_db_manager()
    info = await db_manager.get_connection_info()
    print('Connection info:', info)
asyncio.run(check_pool())
"

# Test Supabase service connection
python -c "
import asyncio
from app.database.supabase_service import get_supabase_service
async def test_supabase():
    service = get_supabase_service()
    result = await service.test_connection()
    print('Supabase connected:', result)
asyncio.run(test_supabase())
"
```

**Common Fixes:**

```env
# Ensure correct async database URL format
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/db

# Check SSL requirements for Supabase
# SSL is required for Supabase connections
DATABASE_URL=postgresql+asyncpg://postgres:password@db.project.supabase.co:5432/postgres?sslmode=require
```

#### 3. Google Vision API Issues

**Problem**: OCR endpoints returning errors

**Diagnostic Steps:**

```bash
# Check Google Cloud credentials
echo $GOOGLE_APPLICATION_CREDENTIALS
test -f "$GOOGLE_APPLICATION_CREDENTIALS" && echo "Credentials file exists" || echo "Credentials file missing"

# Test Google Vision API directly
python -c "
from google.cloud import vision
try:
    client = vision.ImageAnnotatorClient()
    print('✅ Google Vision API client initialized successfully')

    # Test with a simple request
    image = vision.Image()
    image.content = b'dummy'
    try:
        response = client.text_detection(image=image)
        print('✅ Vision API accessible')
    except Exception as e:
        if 'INVALID_ARGUMENT' in str(e):
            print('✅ Vision API accessible (invalid image expected)')
        else:
            print('❌ Vision API error:', e)
except Exception as e:
    print('❌ Vision API initialization failed:', e)
"

# Check project ID configuration
python -c "
import os
print('Google Cloud Project ID:', os.getenv('GOOGLE_CLOUD_PROJECT_ID'))
"
```

**Common Solutions:**

```bash
# Set up Google Cloud credentials
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
export GOOGLE_CLOUD_PROJECT_ID="your-project-id"

# Verify service account permissions
gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"
gcloud projects get-iam-policy $GOOGLE_CLOUD_PROJECT_ID

# Test Vision API quota
gcloud services list --enabled --filter="name:vision.googleapis.com"
```

#### 4. Rate Limiting Issues

**Problem**: `429 Too Many Requests` errors

**Monitoring and Solutions:**

```bash
# Check current rate limit status
curl -I "http://localhost:8000/api/v1/mobile/mobile-summary/test-store" \
  -H "Authorization: Bearer $TOKEN"

# Look for rate limit headers:
# X-RateLimit-Limit: 30
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1642248600
# Retry-After: 60
```

**Rate Limit Configuration:**

```python
# Adjust rate limits in configuration
RATE_LIMITS = {
    "development": {
        "csv_upload": "10/hour",
        "ocr_scan": "60/minute",
        "mobile_endpoints": "100/minute"
    },
    "production": {
        "csv_upload": "3/hour",
        "ocr_scan": "30/minute",
        "mobile_endpoints": "40/minute"
    }
}
```

**Client-side Rate Limit Handling:**

```python
async def handle_rate_limit(client, endpoint, **kwargs):
    """Handle rate limiting with exponential backoff"""
    max_retries = 3
    base_delay = 1

    for attempt in range(max_retries):
        try:
            return await client.request(endpoint, **kwargs)
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                retry_after = int(e.response.headers.get('retry-after', base_delay * (2 ** attempt)))
                print(f"Rate limited, waiting {retry_after} seconds...")
                await asyncio.sleep(retry_after)
                continue
            raise

    raise Exception("Max retries exceeded due to rate limiting")
```

#### 5. Performance Issues

**Problem**: Slow response times

**Performance Monitoring:**

```bash
# Check application performance
curl -w "@curl-format.txt" -s -o /dev/null "http://localhost:8000/health"

# curl-format.txt content:
# time_namelookup:  %{time_namelookup}\n
# time_connect:     %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_redirect:    %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total:       %{time_total}\n

# Monitor database query performance
python -c "
import asyncio
import time
from app.database.connection import get_db_manager

async def monitor_db():
    db_manager = get_db_manager()
    start = time.time()
    health = await db_manager.health_check()
    end = time.time()
    print(f'Database response time: {(end-start)*1000:.2f}ms')
    print('Health status:', health)

asyncio.run(monitor_db())
"
```

**Optimization Strategies:**

```python
# Enable connection pooling
DB_POOL_SIZE = 20
DB_MAX_OVERFLOW = 30
DB_POOL_RECYCLE = 3600

# Use Redis caching for expensive operations
@cache_result(ttl=300)  # 5 minutes
async def get_expensive_analytics(store_id: str):
    # Expensive computation here
    pass

# Optimize OCR processing
VISION_CONFIG = {
    "max_processing_time_ms": 3000,  # Reduce for faster response
    "confidence_threshold": 0.6,     # Lower for better speed
    "image_resize_max_dimension": 1024  # Resize large images
}
```

#### 6. Memory Issues

**Problem**: High memory usage or OOM errors

**Memory Monitoring:**

```bash
# Monitor memory usage
import psutil
import os

def check_memory():
    process = psutil.Process(os.getpid())
    memory_info = process.memory_info()
    print(f"RSS: {memory_info.rss / 1024 / 1024:.2f} MB")
    print(f"VMS: {memory_info.vms / 1024 / 1024:.2f} MB")

    # System memory
    system_memory = psutil.virtual_memory()
    print(f"System memory usage: {system_memory.percent}%")

check_memory()
```

**Memory Optimization:**

```python
# Limit concurrent operations
MAX_CONCURRENT_OCR = 3
MAX_CONCURRENT_CSV = 1

# Use streaming for large files
async def process_large_csv(file_path: str):
    async with aiofiles.open(file_path, 'r') as f:
        async for line in f:
            # Process line by line instead of loading entire file
            pass

# Implement proper cleanup
async def cleanup_temp_files():
    """Clean up temporary files after processing"""
    temp_dir = Path("temp")
    if temp_dir.exists():
        for file in temp_dir.glob("*"):
            if file.stat().st_mtime < time.time() - 3600:  # Older than 1 hour
                file.unlink()
```

### Logging and Debugging

#### Structured Logging Configuration

```python
# Enable debug logging
import structlog
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)
```

#### Debug Endpoints

Add these endpoints for debugging in development:

```python
if settings.environment == "development":

    @app.get("/debug/config")
    async def debug_config():
        """Debug configuration (development only)"""
        return {
            "environment": settings.environment,
            "database_configured": bool(settings.database_url),
            "supabase_configured": bool(settings.supabase_url),
            "google_credentials_configured": bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")),
            "redis_configured": bool(settings.redis_url),
            "cors_origins": settings.get_cors_origins(),
            "allowed_hosts": settings.get_allowed_hosts(),
        }

    @app.get("/debug/health/detailed")
    async def debug_detailed_health():
        """Detailed health check for debugging"""
        from app.database.connection import get_db_manager

        db_manager = get_db_manager()
        health_data = await db_manager.health_check()

        return {
            "timestamp": time.time(),
            "database": health_data,
            "environment_vars": {
                "ENVIRONMENT": os.getenv("ENVIRONMENT"),
                "DATABASE_URL_SET": bool(os.getenv("DATABASE_URL")),
                "GOOGLE_CREDENTIALS_SET": bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")),
            },
            "system_info": {
                "python_version": sys.version,
                "platform": platform.platform(),
                "memory_usage": psutil.virtual_memory()._asdict(),
            }
        }
```

### Health Monitoring Scripts

#### Automated Health Check Script

```bash
#!/bin/bash
# health_monitor.sh - Comprehensive health monitoring

API_URL="http://localhost:8000"
JWT_TOKEN="your-token-here"
LOG_FILE="/var/log/lifo-health.log"

echo "=== LIFO AI Engine Health Check $(date) ===" | tee -a $LOG_FILE

# Function to log with timestamp
log_with_timestamp() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Test basic API health
log_with_timestamp "Testing API health..."
health_response=$(curl -s -w "HTTPSTATUS:%{http_code}" "$API_URL/health")
http_code=$(echo $health_response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
response_body=$(echo $health_response | sed -e 's/HTTPSTATUS:.*//g')

if [ $http_code -eq 200 ]; then
    log_with_timestamp "✅ API Health: OK"
    echo $response_body | jq '.status' 2>/dev/null | tee -a $LOG_FILE
else
    log_with_timestamp "❌ API Health: FAILED (HTTP $http_code)"
fi

# Test authenticated endpoint
log_with_timestamp "Testing authentication..."
auth_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    "$API_URL/api/info")
auth_http_code=$(echo $auth_response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

if [ $auth_http_code -eq 200 ]; then
    log_with_timestamp "✅ Authentication: OK"
else
    log_with_timestamp "❌ Authentication: FAILED (HTTP $auth_http_code)"
fi

# Test OCR endpoint with dummy request
log_with_timestamp "Testing OCR capabilities..."
# This would require a test image - skip if no test image available
if [ -f "test_image.jpg" ]; then
    ocr_response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -F "image=@test_image.jpg" \
        "$API_URL/api/v1/ocr/scan/ocr-expiry/test-store")
    ocr_http_code=$(echo $ocr_response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')

    if [ $ocr_http_code -eq 200 ]; then
        log_with_timestamp "✅ OCR Endpoint: OK"
    else
        log_with_timestamp "❌ OCR Endpoint: FAILED (HTTP $ocr_http_code)"
    fi
else
    log_with_timestamp "⚠️  OCR Test: Skipped (no test image)"
fi

# Check system resources
log_with_timestamp "Checking system resources..."
memory_usage=$(free | grep Mem | awk '{printf("%.1f%%", $3/$2 * 100.0)}')
disk_usage=$(df -h / | awk 'NR==2{printf "%s", $5}')
log_with_timestamp "Memory usage: $memory_usage"
log_with_timestamp "Disk usage: $disk_usage"

# Check if any critical processes are running
if pgrep -f "uvicorn.*app.main:app" > /dev/null; then
    log_with_timestamp "✅ LIFO API process: Running"
else
    log_with_timestamp "❌ LIFO API process: Not found"
fi

log_with_timestamp "Health check completed"
echo "=========================" | tee -a $LOG_FILE
```

Make the script executable and set up a cron job:

```bash
chmod +x health_monitor.sh

# Add to crontab for regular monitoring
# Run every 5 minutes
*/5 * * * * /path/to/health_monitor.sh

# Or run hourly for production
0 * * * * /path/to/health_monitor.sh
```

---

This comprehensive documentation provides complete coverage of the LIFO AI Engine FastAPI microservice, from basic setup to advanced troubleshooting. The documentation is designed to serve both developers implementing new features and deployment teams managing production environments.

For the most up-to-date API specifications, always refer to the interactive documentation at `/docs` when the application is running.
