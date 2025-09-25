"""
Main API router for LIFO AI Engine v1
Optimized architecture with clear frontend-backend separation:
- Frontend: Handles barcode scanning and OpenFoodFacts API calls
- Backend: Provides complex Google Vision OCR and AI processing
"""

from fastapi import APIRouter

# Import modules directly to avoid __init__.py dependencies
from app.api.v1 import analytics
# from app.api.v1 import automated_scoring  # TODO: Module on different branch
from app.api.v1 import batch_creation
from app.api.v1 import csv
from app.api.v1 import csv_upload
from app.api.v1 import debug_health
from app.api.v1 import donation_queries
from app.api.v1 import donations
from app.api.v1 import health
from app.api.v1 import image_recognition
from app.api.v1 import mobile_endpoints
from app.api.v1 import multi_store_analytics
from app.api.v1 import mvp_analytics
from app.api.v1 import product_scanning
from app.api.v1 import scan_workflows
from app.api.v1 import scoring
from app.api.v1 import security

# Create the main v1 router
router = APIRouter()

# Health check endpoints (no authentication required)
router.include_router(
    health.router,
    prefix="/health",
    tags=["Health Checks"],
    responses={503: {"description": "Service unavailable"}},
)

# Debug health endpoints (for production troubleshooting)
router.include_router(
    debug_health.router,
    prefix="/debug",
    tags=["Debug & Troubleshooting"],
    responses={503: {"description": "Service unavailable"}},
)

# Include AI feature routers only (CRUD operations removed)
router.include_router(
    scoring.router,
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
    analytics.router,
    prefix="/analytics",
    tags=["AI Analytics"],
    responses={404: {"description": "Not found"}},
)

router.include_router(
    csv.router,
    prefix="/csv",
    tags=["AI CSV Processing"],
    responses={404: {"description": "Not found"}},
)

router.include_router(
    csv_upload.router,
    prefix="/csv-upload",
    tags=["CSV Upload"],
    responses={404: {"description": "Not found"}},
)

# MVP-specific routers for scan workflows and mobile optimization
router.include_router(
    scan_workflows.router,
    prefix="/scan",
    tags=["MVP Scan Workflows"],
    responses={404: {"description": "Not found"}},
)

router.include_router(
    mobile_endpoints.router,
    prefix="/mobile",
    tags=["Mobile Optimized"],
    responses={404: {"description": "Not found"}},
)

router.include_router(
    mvp_analytics.router,
    prefix="/mvp",
    tags=["MVP Analytics"],
    responses={404: {"description": "Not found"}},
)

# Simplified donation system
router.include_router(
    donations.router,
    prefix="/donations",
    tags=["Donation System"],
    responses={404: {"description": "Not found"}},
)

# Donation queries (read-only)
router.include_router(
    donation_queries.router,
    prefix="/donation-queries",
    tags=["Donation Analytics & Queries"],
    responses={404: {"description": "Not found"}},
)

# Google Vision API for complex OCR and image analysis
router.include_router(
    image_recognition.router,
    prefix="/vision",
    tags=["Google Vision OCR"],
    responses={404: {"description": "Not found"}},
)

# OCR-focused product scanning (complex image processing only)
router.include_router(
    product_scanning.router,
    prefix="/ocr",
    tags=["OCR Product Scanning"],
    responses={404: {"description": "Not found"}},
)

# Batch creation from scan data
router.include_router(
    batch_creation.router,
    prefix="/batches",
    tags=["Batch Creation from Scans"],
    responses={404: {"description": "Not found"}},
)

# Security monitoring and management endpoints (authenticated)
router.include_router(
    security.router,
    prefix="/security",
    tags=["Security Monitoring"],
    responses={404: {"description": "Not found"}},
)

# Multi-store analytics for Phase 3 MVP (5-10 stores)
router.include_router(
    multi_store_analytics.router,
    prefix="/multi-store",
    tags=["Multi-Store Analytics"],
    responses={404: {"description": "Not found"}},
)

# Note: Frontend handles product lookup via OpenFoodFacts API directly
# Backend focuses on AI processing (OCR, scoring, analytics)
