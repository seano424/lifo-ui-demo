"""
Main API router for LIFO AI Engine v1
Optimized architecture with clear frontend-backend separation:
- Frontend: Handles barcode scanning and OpenFoodFacts API calls
- Backend: Provides complex Google Vision OCR and AI processing
"""

from fastapi import APIRouter

# Import modules directly using absolute imports to bypass __init__.py
from app.api.v1.analytics import router as analytics_router
# from app.api.v1.automated_scoring import router as automated_scoring_router  # TODO: Module on different branch
from app.api.v1.batch_creation import router as batch_creation_router
from app.api.v1.csv import router as csv_router
from app.api.v1.csv_upload import router as csv_upload_router
from app.api.v1.debug_health import router as debug_health_router
from app.api.v1.donation_queries import router as donation_queries_router
from app.api.v1.donations import router as donations_router
from app.api.v1.health import router as health_router
from app.api.v1.image_recognition import router as image_recognition_router
from app.api.v1.mobile_endpoints import router as mobile_endpoints_router
from app.api.v1.multi_store_analytics import router as multi_store_analytics_router
from app.api.v1.mvp_analytics import router as mvp_analytics_router
from app.api.v1.product_scanning import router as product_scanning_router
from app.api.v1.scan_workflows import router as scan_workflows_router
from app.api.v1.scoring import router as scoring_router
from app.api.v1.security import router as security_router

# Create the main v1 router
router = APIRouter()

# Health check endpoints (no authentication required)
router.include_router(
    health_router,
    prefix="/health",
    tags=["Health Checks"],
    responses={503: {"description": "Service unavailable"}},
)

# Debug health endpoints (for production troubleshooting)
router.include_router(
    debug_health_router,
    prefix="/debug",
    tags=["Debug & Troubleshooting"],
    responses={503: {"description": "Service unavailable"}},
)

# Include AI feature routers only (CRUD operations removed)
router.include_router(
    scoring_router,
    prefix="/scoring",
    tags=["AI Scoring"],
    responses={404: {"description": "Not found"}},
)

# Automated scoring system management
# TODO: Commented out - module on different branch
# router.include_router(
#     automated_scoring.router,
#     prefix="/automated-scoring",
#     tags=["Automated Scoring Management"],
#     responses={404: {"description": "Not found"}},
# )

router.include_router(
    analytics_router,
    prefix="/analytics",
    tags=["AI Analytics"],
    responses={404: {"description": "Not found"}},
)

router.include_router(
    csv_router,
    prefix="/csv",
    tags=["AI CSV Processing"],
    responses={404: {"description": "Not found"}},
)

router.include_router(
    csv_upload_router,
    prefix="/csv-upload",
    tags=["CSV Upload"],
    responses={404: {"description": "Not found"}},
)

# MVP-specific routers for scan workflows and mobile optimization
router.include_router(
    scan_workflows_router,
    prefix="/scan",
    tags=["MVP Scan Workflows"],
    responses={404: {"description": "Not found"}},
)

router.include_router(
    mobile_endpoints_router,
    prefix="/mobile",
    tags=["Mobile Optimized"],
    responses={404: {"description": "Not found"}},
)

router.include_router(
    mvp_analytics_router,
    prefix="/mvp",
    tags=["MVP Analytics"],
    responses={404: {"description": "Not found"}},
)

# Simplified donation system
router.include_router(
    donations_router,
    prefix="/donations",
    tags=["Donation System"],
    responses={404: {"description": "Not found"}},
)

# Donation queries (read-only)
router.include_router(
    donation_queries_router,
    prefix="/donation-queries",
    tags=["Donation Analytics & Queries"],
    responses={404: {"description": "Not found"}},
)

# Google Vision API for complex OCR and image analysis
router.include_router(
    image_recognition_router,
    prefix="/vision",
    tags=["Google Vision OCR"],
    responses={404: {"description": "Not found"}},
)

# OCR-focused product scanning (complex image processing only)
router.include_router(
    product_scanning_router,
    prefix="/ocr",
    tags=["OCR Product Scanning"],
    responses={404: {"description": "Not found"}},
)

# Batch creation from scan data
router.include_router(
    batch_creation_router,
    prefix="/batches",
    tags=["Batch Creation from Scans"],
    responses={404: {"description": "Not found"}},
)

# Security monitoring and management endpoints (authenticated)
router.include_router(
    security_router,
    prefix="/security",
    tags=["Security Monitoring"],
    responses={404: {"description": "Not found"}},
)

# Multi-store analytics for Phase 3 MVP (5-10 stores)
router.include_router(
    multi_store_analytics_router,
    prefix="/multi-store",
    tags=["Multi-Store Analytics"],
    responses={404: {"description": "Not found"}},
)

# Note: Frontend handles product lookup via OpenFoodFacts API directly
# Backend focuses on AI processing (OCR, scoring, analytics)
