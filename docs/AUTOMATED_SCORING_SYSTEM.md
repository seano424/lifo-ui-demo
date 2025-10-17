# Automated Scoring System Documentation

## Overview

The LIFO AI Automated Scoring System provides cron-like scheduling for automatic inventory scoring updates. This production-ready system integrates with the existing scoring engine to provide hands-off, scheduled scoring operations with comprehensive monitoring and management capabilities.

## System Architecture

### Core Components

#### 1. AutomatedScoringScheduler (`app/core/automated_scoring.py`)
- **Purpose**: Main orchestrator for automated inventory scoring
- **Backend**: APScheduler (Advanced Python Scheduler) with AsyncIO support
- **Features**:
  - Cron expressions and interval-based scheduling
  - Retry logic with exponential backoff
  - Performance monitoring and metrics collection
  - Graceful error handling and recovery
  - Automatic cleanup of old job results

#### 2. REST API Management (`app/api/v1/automated_scoring.py`)
- **Purpose**: Complete CRUD interface for schedule management
- **Authentication**: Integrated with existing Supabase authentication
- **Rate Limiting**: Uses existing AI endpoint rate limiting
- **Endpoints**: 8 fully-featured management endpoints

#### 3. Configuration System (`app/core/config.py`)
- **Purpose**: Centralized configuration management
- **Features**: Environment-based settings with sensible defaults
- **Integration**: Extends existing settings system

## API Endpoints

| Method | Endpoint | Purpose | Rate Limit | Description |
|--------|----------|---------|------------|-------------|
| `POST` | `/api/v1/automated-scoring/schedules` | Create schedule | 10/min | Create new automated scoring schedule |
| `GET` | `/api/v1/automated-scoring/schedules` | List schedules | 30/min | List all active schedules with filters |
| `GET` | `/api/v1/automated-scoring/schedules/{id}` | Get schedule | 50/min | Get detailed schedule information |
| `PUT` | `/api/v1/automated-scoring/schedules/{id}` | Update schedule | 20/min | Update existing schedule configuration |
| `DELETE` | `/api/v1/automated-scoring/schedules/{id}` | Delete schedule | 10/min | Remove schedule (stops future executions) |
| `POST` | `/api/v1/automated-scoring/trigger/{store_id}` | Manual trigger | 5/min | Trigger immediate scoring for a store |
| `GET` | `/api/v1/automated-scoring/jobs/{job_id}` | Job status | 100/min | Get status and results of specific job |
| `GET` | `/api/v1/automated-scoring/system/status` | System status | 10/min | Get overall system health and statistics |

## Configuration Options

```python
# Core Settings (app/core/config.py)
enable_automated_scoring: bool = True              # Master enable/disable switch
default_scoring_cron: str = "0 */4 * * *"         # Default cron (every 4 hours)
default_scoring_timezone: str = "UTC"              # Default timezone
scoring_max_retries: int = 3                       # Maximum retry attempts
scoring_retry_delay_minutes: int = 5               # Minutes between retries
scoring_timeout_minutes: int = 15                  # Job timeout (prevents runaway jobs)
scoring_batch_size: int = 500                      # Default batch size
max_concurrent_scoring_jobs: int = 5               # Resource protection
```

## Scheduling Types

### Cron Expression Scheduling
Use standard cron syntax for complex scheduling patterns:

```python
# Business hours only (9 AM, 12 PM, 3 PM, 6 PM on weekdays)
"0 9,12,15,18 * * 1-5"

# High-frequency for critical stores (every 2 hours)
"0 */2 * * *"

# Weekend intensive scoring (every 3 hours on Saturday and Sunday)
"0 */3 * * 0,6"

# Daily at specific times with timezone support
cron_expression = "0 6,14,22 * * *"
timezone = "America/New_York"
```

### Interval-Based Scheduling
Simple frequency-based scheduling:

```python
interval_hours = 4          # Every 4 hours
interval_hours = 24         # Daily
interval_hours = 168        # Weekly
```

## Usage Examples

### Creating Schedules

#### High-Frequency Schedule (Every 2 Hours)
```bash
curl -X POST /api/v1/automated-scoring/schedules \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "critical-store-001",
    "schedule_type": "interval",
    "interval_hours": 2,
    "force_recalculate": false,
    "enabled": true
  }'
```

#### Business Hours Cron Schedule
```bash
curl -X POST /api/v1/automated-scoring/schedules \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "store_id": "business-store-002",
    "schedule_type": "cron",
    "cron_expression": "0 9,13,17 * * 1-5",
    "timezone": "America/New_York",
    "enabled": true
  }'
```

#### Manual Trigger
```bash
curl -X POST /api/v1/automated-scoring/trigger/store-123?force_recalculate=false \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

### Monitoring

#### System Status
```bash
curl -X GET /api/v1/automated-scoring/system/status \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

#### Job Status
```bash
curl -X GET /api/v1/automated-scoring/jobs/{job_id} \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>"
```

## Performance Integration

### Scoring Engine Integration
- **Uses Existing Service**: Leverages `score_store_inventory_bulk()` from existing scoring service
- **Performance**: Inherits 48+ items/second performance from optimized bulk scoring
- **Database Compatibility**: Uses pgbouncer-compatible queries
- **Resource Efficiency**: Bounded resource usage with configurable limits

### Performance Metrics
```python
# Typical Job Result
{
    "job_id": "job_abc123",
    "status": "completed",
    "total_items": 500,
    "processed_items": 500,
    "processing_time_ms": 10240,
    "items_per_second": 48.81,
    "high_priority_count": 23,
    "error_message": null
}
```

## Production Features

### Fault Tolerance
- **Automatic Retries**: Configurable retry attempts with exponential backoff
- **Timeout Protection**: Prevents runaway jobs with configurable timeouts
- **Resource Limits**: Maximum concurrent jobs to prevent system overload
- **Graceful Degradation**: System continues operation despite individual job failures

### Monitoring & Observability
- **Real-time Status**: System health dashboard with success rates
- **Job History**: Track last 5 executions per schedule
- **Performance Metrics**: Items/second, processing time, error tracking
- **Memory Management**: Automatic cleanup (keeps last 100 results per schedule)

### Lifecycle Management
- **Graceful Startup**: Integrated with FastAPI application lifecycle
- **Clean Shutdown**: Proper scheduler shutdown on application termination
- **Hot Configuration**: Create, update, delete schedules without restart

## Integration Points

### Existing System Integration
✅ **Scoring Engine**: Uses existing `ScoringService` with bulk optimizations
✅ **Database Layer**: Leverages optimized pgbouncer-compatible connections
✅ **Authentication**: Integrates with Supabase auth system
✅ **Rate Limiting**: Uses existing AI endpoint rate limiting
✅ **Configuration**: Extends existing settings system
✅ **Logging**: Integrated with structured logging (structlog)

### Dependencies
- **APScheduler 3.10.4+**: Core scheduling engine
- **FastAPI**: Web framework integration
- **Pydantic**: Configuration models and validation
- **Supabase**: Authentication and database
- **structlog**: Structured logging

## Troubleshooting

### Common Issues

#### Schedule Not Executing
1. Check if automated scoring is enabled: `settings.enable_automated_scoring`
2. Verify schedule is enabled: `GET /api/v1/automated-scoring/schedules/{id}`
3. Check system status: `GET /api/v1/automated-scoring/system/status`

#### Job Failures
1. Check job details: `GET /api/v1/automated-scoring/jobs/{job_id}`
2. Review retry configuration in settings
3. Verify database connectivity and store permissions

#### Performance Issues
1. Monitor concurrent job count vs `max_concurrent_scoring_jobs`
2. Check timeout settings vs actual processing time
3. Review database performance during scheduled runs

### Logging
The system uses structured logging with the following components:
- `component=automated_scoring_scheduler`: Core scheduler events
- `schedule_id`: Specific schedule operations
- `job_id`: Individual job execution tracking

## Security Considerations

### Authentication
- **Supabase Integration**: Uses existing authentication system
- **Service Role Access**: Admin-level operations require service role key
- **Rate Limiting**: Prevents abuse with endpoint-specific limits

### Resource Protection
- **Concurrent Limits**: Prevents resource exhaustion
- **Timeout Protection**: Prevents long-running jobs
- **Memory Management**: Automatic cleanup prevents memory leaks

## Future Enhancements

### Potential Improvements
- **Store Discovery**: Automatic detection and scheduling for new stores
- **Dynamic Scaling**: Adjust frequency based on inventory activity
- **Advanced Monitoring**: Integration with alerting systems
- **Batch Operations**: Bulk schedule management operations

### Extension Points
- **Custom Triggers**: Event-based scoring triggers
- **Integration APIs**: Webhooks for external system integration
- **Advanced Patterns**: Conditional scheduling based on business rules

## Support

For issues with the automated scoring system:
1. Check system status endpoint for health information
2. Review application logs for scheduler events
3. Verify configuration settings match requirements
4. Test manual triggers to isolate scheduling vs execution issues