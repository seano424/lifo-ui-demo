# 📚 LIFO.AI API Documentation

## Overview

The LIFO.AI API is a comprehensive FastAPI-based microservice that provides intelligent inventory management capabilities for retail stores. This documentation covers all available endpoints, authentication methods, request/response formats, and integration guidelines.

## 🔗 Base Information

### API Base URLs
- **Development**: `http://localhost:8000`
- **Staging**: `https://staging-api.lifoai.com`
- **Production**: `https://api.lifoai.com`

### API Version
Current API version: `v1`

All endpoints are prefixed with `/api/v1/`

### Content Type
All requests and responses use `application/json` unless otherwise specified.

## 🔐 Authentication

### JWT Bearer Token
All API endpoints require authentication using Supabase JWT tokens:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Authentication Levels
- **Anonymous**: No authentication required (public endpoints only)
- **Authenticated User**: Valid JWT token required
- **Service Role**: Service role token required for administrative operations

### Getting Authentication Tokens

#### Client-Side (Supabase)
```javascript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
```

#### Server-Side (Service Role)
```javascript
const serviceToken = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

## 📊 API Endpoints

### 🏥 Health & System

#### GET / - API Root
Returns basic API information and service status.

**Request:**
```bash
curl -X GET "https://api.lifoai.com/"
```

**Response:**
```json
{
  "service": "LIFO AI Engine",
  "version": "1.0.0",
  "description": "Intelligent inventory scoring and waste reduction microservice",
  "status": "operational",
  "features": [
    "Multi-factor inventory scoring",
    "Real-time recommendations",
    "CSV bulk processing",
    "Store-aware analytics",
    "Supabase authentication"
  ]
}
```

#### GET /health - Health Check
Comprehensive health check including database connectivity.

**Request:**
```bash
curl -X GET "https://api.lifoai.com/health"
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "response_time_ms": 23
  },
  "dependencies": {
    "supabase": "operational",
    "redis": "operational"
  }
}
```

### 📱 Mobile-Optimized Endpoints

#### GET /api/v1/mobile/mobile-summary/{store_id} - Mobile Dashboard
Fast overview for mobile scanning interface (target <300ms).

**Parameters:**
- `store_id` (path, required): Store UUID
- `include_details` (query, optional): Include detailed batch information
- `limit_urgent` (query, optional): Limit urgent items returned (default: 10)

**Request:**
```bash
curl -X GET "https://api.lifoai.com/api/v1/mobile/mobile-summary/123e4567-e89b-12d3-a456-426614174000?include_details=true&limit_urgent=15" \
  -H "Authorization: Bearer $TOKEN"
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
      "potential_loss_eur": 14.40
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

#### POST /api/v1/mobile/batch-quick-score/{batch_id} - Quick Batch Scoring
Real-time scoring for scanned items (target <200ms).

**Parameters:**
- `batch_id` (path, required): Batch UUID
- `store_id` (query, required): Store UUID

**Request:**
```bash
curl -X POST "https://api.lifoai.com/api/v1/mobile/batch-quick-score/456e7890-f12a-34b5-c678-567890123456?store_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $TOKEN"
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
    "potential_loss_eur": 12.50,
    "profit_at_risk_eur": 8.75
  },
  "processing_time_ms": 145
}
```

### 🔍 Scan Workflow Endpoints

#### POST /api/v1/scan/scan-in/{store_id} - Scan-In Workflow
Register new inventory via mobile scanning (proof of delivery).

**Parameters:**
- `store_id` (path, required): Store UUID

**Request Body:**
```json
{
  "product_sku": "APPLE-RED-001",
  "barcode": "1234567890123",
  "product_name": "Red Apples",
  "category": "fresh_produce",
  "expiry_date": "2024-02-15",
  "quantity": 50,
  "cost_price": 1.50,
  "selling_price": 2.99,
  "manufacture_date": "2024-01-10",
  "location_code": "PRODUCE",
  "unit_type": "kg",
  "supplier_info": "Fresh Farms Ltd",
  "batch_notes": "Premium quality batch"
}
```

**Request:**
```bash
curl -X POST "https://api.lifoai.com/api/v1/scan/scan-in/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "product_sku": "APPLE-RED-001",
    "barcode": "1234567890123",
    "expiry_date": "2024-02-15",
    "quantity": 50,
    "cost_price": 1.50,
    "selling_price": 2.99,
    "location_code": "PRODUCE"
  }'
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

#### POST /api/v1/scan/scan-out/{store_id}/{batch_id} - Scan-Out Workflow
Track when inventory is sold, discounted, or disposed.

**Parameters:**
- `store_id` (path, required): Store UUID
- `batch_id` (path, required): Batch UUID

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

**Request:**
```bash
curl -X POST "https://api.lifoai.com/api/v1/scan/scan-out/123e4567-e89b-12d3-a456-426614174000/456e7890-f12a-34b5-c678-567890123456" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sold_discounted",
    "quantity_moved": 10,
    "actual_selling_price": 2.39,
    "discount_percent": 20,
    "destination_location": "CHECKOUT"
  }'
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "trans-789e0123-f45a",
  "batch_id": "456e7890-f12a-34b5-c678-567890123456",
  "action_taken": "sold_discounted",
  "quantity_processed": 10,
  "remaining_quantity": 40,
  "financial_impact": {
    "revenue_generated": 23.90,
    "discount_amount": 6.00,
    "profit_margin": 8.90
  },
  "updated_score": 0.42,
  "effectiveness_score": 0.85,
  "processed_at": "2024-01-15T10:30:00Z"
}
```

### 📊 Analytics Endpoints

#### GET /api/v1/analytics/store/{store_id} - Store Analytics
Comprehensive analytics for a store with configurable time periods.

**Parameters:**
- `store_id` (path, required): Store UUID
- `days` (query, optional): Analysis period in days (default: 30, max: 365)

**Request:**
```bash
curl -X GET "https://api.lifoai.com/api/v1/analytics/store/123e4567-e89b-12d3-a456-426614174000?days=30" \
  -H "Authorization: Bearer $TOKEN"
```

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
      "total_value_eur": 12450.00,
      "at_risk_value_eur": 1230.00
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
        "total_value": 2340.00,
        "waste_rate": 0.08,
        "average_score": 0.65
      },
      {
        "category": "dairy",
        "batch_count": 32,
        "total_value": 1890.00,
        "waste_rate": 0.05,
        "average_score": 0.45
      }
    ],
    "performance_metrics": {
      "waste_reduction_percent": 23.5,
      "revenue_recovery_eur": 2340.00,
      "discount_effectiveness": 0.78,
      "staff_response_time_hours": 2.4
    },
    "recent_actions": [
      {
        "action_id": "action-123",
        "batch_id": "456e7890-f12a-34b5-c678-567890123456",
        "action_type": "discount_applied",
        "timestamp": "2024-01-15T09:30:00Z",
        "effectiveness_score": 0.85,
        "financial_impact": 23.90
      }
    ]
  },
  "generated_at": "2024-01-15T10:30:00Z"
}
```

#### GET /api/v1/analytics/dashboard/{store_id} - Dashboard Data
Quick dashboard overview optimized for frontend displays.

**Request:**
```bash
curl -X GET "https://api.lifoai.com/api/v1/analytics/dashboard/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "store_id": "123e4567-e89b-12d3-a456-426614174000",
  "summary": {
    "total_batches": 156,
    "expired_count": 3,
    "expiring_soon_count": 12,
    "total_value_eur": 8450.00
  },
  "alerts": {
    "expired_items": 3,
    "expiring_soon": 12,
    "high_urgency": 18
  },
  "top_categories": [
    {
      "category": "fresh_produce",
      "batch_count": 45,
      "urgency_score": 0.72
    },
    {
      "category": "dairy",
      "batch_count": 32,
      "urgency_score": 0.58
    }
  ],
  "recent_activity": [
    {
      "type": "scan_in",
      "product_sku": "APPLE-RED-001",
      "timestamp": "2024-01-15T09:45:00Z"
    },
    {
      "type": "discount_applied",
      "product_sku": "MILK-WHOLE-1L",
      "discount_percent": 20,
      "timestamp": "2024-01-15T09:30:00Z"
    }
  ],
  "last_updated": "2024-01-15T10:30:00Z"
}
```

### 📁 CSV Processing Endpoints

#### POST /api/v1/csv/upload - Upload CSV File
Upload and process CSV inventory file with comprehensive validation.

**Parameters:**
- `store_id` (form, required): Store UUID
- `file` (form, required): CSV file (max 10MB)

**Request:**
```bash
curl -X POST "https://api.lifoai.com/api/v1/csv/upload" \
  -H "Authorization: Bearer $TOKEN" \
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
      },
      {
        "row": 45,
        "field": "category",
        "message": "Category normalized from 'vegetables' to 'fresh_produce'",
        "original_value": "vegetables"
      }
    ],
    "errors": [],
    "store_id": "123e4567-e89b-12d3-a456-426614174000",
    "metadata": {
      "processing_time_ms": 1245,
      "categories_found": ["fresh_produce", "dairy", "bakery_fresh"],
      "duplicate_skus_resolved": 2,
      "date_formats_detected": ["%Y-%m-%d", "%d/%m/%Y"]
    }
  }
}
```

#### GET /api/v1/csv/template - Download CSV Template
Get CSV template with sample data and formatting guidelines.

**Request:**
```bash
curl -X GET "https://api.lifoai.com/api/v1/csv/template" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "content": "sku,product_name,category,quantity,expiry_date,brand,cost_price,selling_price,manufacture_date,location_code,unit_type\\nAPPLE001,Red Apples,fresh_produce,50,2024-07-20,FreshFarms,2.50,3.99,2024-07-13,MAIN,kg\\n...",
    "filename": "inventory_template.csv",
    "headers": ["sku", "product_name", "category", "quantity", "expiry_date", "brand", "cost_price", "selling_price", "manufacture_date", "location_code", "unit_type"],
    "sample_rows": 3,
    "instructions": {
      "required_columns": ["sku", "product_name", "category", "quantity", "expiry_date"],
      "optional_columns": ["brand", "cost_price", "selling_price", "manufacture_date", "location_code", "unit_type"],
      "category_examples": ["fresh_produce", "fresh_meat_fish", "dairy", "bakery_fresh", "frozen", "beverages", "dry_goods", "canned_jarred"],
      "date_format": "YYYY-MM-DD (e.g., 2024-07-20)",
      "notes": [
        "SKU must be unique within your store",
        "Quantities should be positive numbers",
        "Dates should be in YYYY-MM-DD format",
        "Categories will be normalized to standard values"
      ]
    }
  }
}
```

### 🎯 Scoring Endpoints

#### POST /api/v1/scoring/calculate-score - Calculate Batch Score
Calculate urgency score for a specific batch.

**Request Body:**
```json
{
  "store_id": "123e4567-e89b-12d3-a456-426614174000",
  "batch_id": "456e7890-f12a-34b5-c678-567890123456"
}
```

**Request:**
```bash
curl -X POST "https://api.lifoai.com/api/v1/scoring/calculate-score" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "123e4567-e89b-12d3-a456-426614174000",
    "batch_id": "456e7890-f12a-34b5-c678-567890123456"
  }'
```

**Response:**
```json
{
  "batch_id": "456e7890-f12a-34b5-c678-567890123456",
  "score": 0.78,
  "urgency_level": "high",
  "factors": {
    "expiry_urgency": 0.85,
    "category_risk": 0.80,
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

## 📋 Data Models

### Store Model
```json
{
  "store_id": "uuid",
  "store_name": "string",
  "store_type": "supermarket|convenience|restaurant",
  "location": {
    "address": "string",
    "city": "string",
    "country": "string",
    "coordinates": {
      "lat": "number",
      "lng": "number"
    }
  },
  "settings": {
    "timezone": "string",
    "currency": "EUR",
    "default_markup": "number"
  }
}
```

### Product Batch Model
```json
{
  "batch_id": "uuid",
  "store_id": "uuid",
  "product_sku": "string",
  "product_name": "string",
  "category": "fresh_produce|dairy|bakery_fresh|...",
  "barcode": "string|null",
  "quantity": "number",
  "unit_type": "kg|pcs|liter|...",
  "cost_price": "number",
  "selling_price": "number",
  "manufacture_date": "date|null",
  "expiry_date": "date",
  "location_code": "string|null",
  "brand": "string|null",
  "supplier_info": "string|null",
  "batch_number": "string",
  "current_score": "number",
  "urgency_level": "low|medium|high|critical",
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### Analytics Model
```json
{
  "store_id": "uuid",
  "period_start": "date",
  "period_end": "date",
  "inventory_summary": {
    "total_batches": "number",
    "active_batches": "number",
    "expired_count": "number",
    "total_value_eur": "number"
  },
  "performance_metrics": {
    "waste_reduction_percent": "number",
    "revenue_recovery_eur": "number",
    "discount_effectiveness": "number"
  },
  "category_breakdown": [
    {
      "category": "string",
      "batch_count": "number",
      "total_value": "number",
      "waste_rate": "number"
    }
  ]
}
```

## ⚠️ Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": "Error message",
  "error_code": "ErrorType",
  "error_id": "abc12345",
  "timestamp": "2024-01-15T10:30:00Z",
  "details": "Additional error details (development only)",
  "path": "/api/v1/endpoint"
}
```

### HTTP Status Codes

| Code | Description | When Used |
|------|-------------|-----------|
| 200 | OK | Successful request |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Common Error Codes

- `ValidationError` - Input validation failed
- `AuthenticationError` - Authentication failed
- `AuthorizationError` - Insufficient permissions
- `NotFoundError` - Requested resource not found
- `RateLimitError` - Rate limit exceeded
- `ProcessingError` - Data processing failed
- `DatabaseError` - Database operation failed

## 🔄 Rate Limiting

### Rate Limits by Endpoint Category

| Category | Development | Production | Headers |
|----------|-------------|------------|---------|
| Mobile Endpoints | 60/minute | 40/minute | `X-RateLimit-*` |
| Scan Workflows | 40/minute | 30/minute | `X-RateLimit-*` |
| CSV Processing | 10/hour | 3/hour | `X-RateLimit-*` |
| Analytics | 60/minute | 30/minute | `X-RateLimit-*` |
| Scoring | 40/minute | 20/minute | `X-RateLimit-*` |

### Rate Limit Headers
```bash
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1642248600
Retry-After: 60
```

## 🛡️ Security

### Authentication Requirements
- All endpoints require valid JWT token except health endpoints
- Service role required for administrative operations
- Store access validated for store-specific operations

### Input Validation
- All UUID parameters validated for format
- String inputs sanitized to prevent injection
- File uploads validated for content and size
- Rate limiting prevents abuse

### Security Headers
```bash
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

## 🔧 Integration Examples

### JavaScript/TypeScript Integration

```typescript
// API client setup
class LifoApiClient {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Mobile summary
  async getMobileSummary(storeId: string): Promise<MobileSummaryResponse> {
    return this.request(`/api/v1/mobile/mobile-summary/${storeId}`);
  }

  // Scan in workflow
  async scanIn(storeId: string, data: ScanInRequest): Promise<ScanInResponse> {
    return this.request(`/api/v1/scan/scan-in/${storeId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // CSV upload
  async uploadCsv(storeId: string, file: File): Promise<CsvUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('store_id', storeId);

    return this.request('/api/v1/csv/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
  }
}

// Usage example
const client = new LifoApiClient('https://api.lifoai.com', userToken);

// Get mobile dashboard data
const summary = await client.getMobileSummary(storeId);
console.log(`Urgent batches: ${summary.urgent_batches.length}`);

// Scan in new product
const scanResult = await client.scanIn(storeId, {
  product_sku: 'APPLE-001',
  expiry_date: '2024-02-15',
  quantity: 50,
  cost_price: 1.50,
  selling_price: 2.99,
});
console.log(`New batch created: ${scanResult.batch_id}`);
```

### Python Integration

```python
import httpx
import asyncio
from typing import Dict, Any, Optional

class LifoApiClient:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url.rstrip('/')
        self.token = token
        self.client = httpx.AsyncClient(
            headers={'Authorization': f'Bearer {token}'}
        )

    async def request(
        self, 
        method: str, 
        endpoint: str, 
        **kwargs
    ) -> Dict[str, Any]:
        """Make authenticated API request"""
        url = f"{self.base_url}{endpoint}"
        response = await self.client.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    async def get_mobile_summary(
        self, 
        store_id: str, 
        include_details: bool = True
    ) -> Dict[str, Any]:
        """Get mobile dashboard summary"""
        params = {'include_details': include_details}
        return await self.request(
            'GET', 
            f'/api/v1/mobile/mobile-summary/{store_id}',
            params=params
        )

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

# Usage example
async def main():
    client = LifoApiClient('https://api.lifoai.com', user_token)
    
    # Get store summary
    summary = await client.get_mobile_summary(store_id)
    print(f"Store health score: {summary['store_health_score']}")
    
    # Scan in new product
    product = {
        'product_sku': 'MILK-001',
        'product_name': 'Whole Milk 1L',
        'category': 'dairy',
        'expiry_date': '2024-02-15',
        'quantity': 20,
        'cost_price': 1.20,
        'selling_price': 1.89
    }
    
    result = await client.scan_in_product(store_id, product)
    print(f"Created batch: {result['batch_id']}")
    
    # Calculate score for the new batch
    score = await client.calculate_score(store_id, result['batch_id'])
    print(f"Initial score: {score['score']} ({score['urgency_level']})")

# Run the example
asyncio.run(main())
```

## 📞 Support & Resources

### API Documentation
- **Interactive Docs**: `https://api.lifoai.com/docs`
- **OpenAPI Spec**: `https://api.lifoai.com/openapi.json`
- **Postman Collection**: Available on request

### Support Channels
- **Technical Support**: support@lifoai.com
- **API Questions**: api-support@lifoai.com
- **Documentation Issues**: docs@lifoai.com

### Rate Limits & Quotas
For higher rate limits or custom quotas, contact our enterprise team at enterprise@lifoai.com.

---

**This API documentation is regularly updated. For the latest information, always refer to the interactive documentation at `/docs`.**