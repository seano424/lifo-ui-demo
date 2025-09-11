# LIFO Application API Reference (v1)

## Overview

The LIFO AI Engine API provides a comprehensive set of endpoints for managing food waste reduction through intelligent scanning, donation tracking, and analytics. The API is designed with a clear frontend-backend separation, focusing on complex AI processing and workflow optimization.

## Authentication

Unless specified, most endpoints require authentication. Ensure you have a valid access token for API requests.

## Base URL

`https://api.lifo.app/v1`

## Endpoint Categories

### 1. Health & Monitoring

#### Health Check Endpoints
- `GET /health`: Overall system health status
- `GET /health/supabase`: Supabase database connection status
- `GET /health/database`: Database health check
- `GET /health/ready`: Readiness probe
- `GET /health/live`: Liveness probe
- `GET /health/performance`: System performance metrics
- `GET /health/mobile-performance`: Mobile app performance metrics

#### Database Monitoring
- `GET /database/health/comprehensive`: Detailed database health overview
- `GET /database/connections`: Active database connections
- `GET /database/performance/queries`: Query performance analysis
- `GET /database/storage/tables`: Table storage metrics
- `GET /database/replication`: Replication status
- `GET /database/locks`: Database lock information
- `GET /database/cache`: Database cache performance
- `GET /database/metrics/lifo`: LIFO-specific database metrics
- `GET /database/alerts/generate`: Generate database health alerts
- `POST /database/maintenance/analyze`: Trigger database maintenance analysis

### 2. Authentication & Security

- `GET /security/statistics`: Security usage statistics
- `GET /auth/health`: Authentication system health
- `GET /auth/metrics`: Authentication system metrics
- `GET /auth/security-report`: Comprehensive security report
- `GET /security/threats`: Current security threats
- `GET /security/ip/{ip_address}`: IP address security check

### 3. Batch Management

- `POST /batches/create`: Create a new batch
- `GET /batches/{store_id}`: List batches for a specific store
- `POST /batches/quick-score/{batch_id}`: Perform quick batch scoring
- `GET /scan/scan-donation-quick-list/{store_id}`: Quick list of donation scans

### 4. CSV Processing

- `POST /csv/validate/{store_id}`: Validate CSV file
- `GET /csv/template`: Get CSV upload template
- `POST /csv/analyze/{store_id}`: Analyze CSV file
- `POST /csv-upload/upload`: Upload CSV file
- `POST /csv-upload/validate`: Validate uploaded CSV
- `POST /csv-upload/upload-and-create-batches`: Upload and create batches

### 5. Analytics & Reporting

#### Store Analytics
- `GET /analytics/store/{store_id}`: Store-specific analytics
- `GET /analytics/dashboard/{store_id}`: Store dashboard overview
- `GET /analytics/performance/{store_id}`: Performance metrics
- `GET /analytics/trends/{store_id}`: Trend analysis
- `GET /analytics/exports/{store_id}`: Export analytics data

#### MVP Analytics
- `GET /mvp/mvp-metrics/{store_id}`: MVP-specific metrics
- `GET /mvp/batch-insights/{store_id}`: Batch-level insights
- `GET /mvp/scan-workflow-stats/{store_id}`: Scan workflow statistics
- `GET /mvp/waste-prevention-impact/{store_id}`: Waste prevention impact analysis
- `GET /mvp/action-effectiveness/{store_id}`: Action effectiveness report

### 6. Mobile Endpoints

- `GET /mobile/mobile-summary/{store_id}`: Mobile batch summary
- `POST /mobile/batch-quick-score/{batch_id}`: Quick batch scoring for mobile
- `GET /mobile/store-health/{store_id}`: Store health for mobile
- `GET /mobile/batch-list-mobile/{store_id}`: Mobile batch list
- `GET /mobile/mobile-performance-health`: Mobile app performance health

### 7. Scanning & OCR

#### Image Recognition
- `POST /vision/analyze-image/{store_id}`: Analyze product image
- `POST /vision/extract-expiry-date/{store_id}`: Extract expiry date from image
- `GET /vision/ml-models/status`: ML model status

#### Product Scanning
- `POST /ocr/scan/ocr-expiry/{store_id}`: OCR expiry date scanning
- `POST /ocr/scan/full-ocr/{store_id}`: Full OCR scanning
- `POST /ocr/scan/text-extraction/{store_id}`: Text extraction from image

#### Scan Workflows
- `POST /scan/debug-scan/{store_id}`: Debug scan workflow
- `POST /scan/scan-in/{store_id}`: Scan-in process
- `POST /scan/scan-out/{store_id}/{batch_id}`: Scan-out process
- `POST /scan/process-scan/{store_id}`: Process scan
- `POST /scan/scan-donation-check/{store_id}/{batch_id}`: Donation scan check
- `POST /scan/scan-donation-action/{store_id}/{batch_id}`: Perform donation scan action

### 8. Donation Management

#### Donation Queries
- `GET /donation-queries/recipients`: List donation recipients
- `GET /donation-queries/actions`: Donation actions
- `GET /donation-queries/analytics/summary`: Donation analytics summary
- `GET /donation-queries/compliance/alerts`: Compliance alerts
- `GET /donation-queries/analytics/kpi`: Donation KPIs

#### Donation Operations
- `POST /donations/create`: Create a new donation
- `GET /donations/list`: List donations

### 9. Scoring & Recommendations

- `POST /scoring/batch/{store_id}`: Score a batch
- `GET /scoring/alerts/{store_id}`: Get scoring alerts
- `GET /scoring/recommendations/{store_id}`: Get recommendations
- `GET /scoring/analytics/{store_id}`: Scoring analytics

## Error Handling

The API uses standard HTTP status codes:
- 200: Successful request
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 500: Internal server error
- 503: Service unavailable

Each error response includes:
- Error code
- Descriptive message
- Potential resolution steps

## Rate Limiting

To prevent abuse, the API implements rate limiting. Exceeding limits will result in a 429 (Too Many Requests) status.

## Versioning

Current API version: v1
Base path: `/v1/`

## Support

For additional support, contact `support@lifo.app`

---

*Generated on 2025-09-11*