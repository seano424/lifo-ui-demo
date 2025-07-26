"""
Main API router for LIFO AI Engine v1
Optimized architecture with clear frontend-backend separation:
- Frontend: Handles barcode scanning and OpenFoodFacts API calls  
- Backend: Provides complex Google Vision OCR and AI processing
"""

from fastapi import APIRouter

from app.api.v1 import (
    analytics,
    csv,
    csv_upload,
    donation_queries,
    donations,
    # global_products,  # Disabled - global schema not implemented
    image_recognition,  # Re-enabled with optimized architecture
    mobile_endpoints,
    mvp_analytics,
    product_scanning,  # New OCR-focused endpoints
    scan_workflows,
    scoring,
)

# Create the main v1 router
router = APIRouter()

# Include AI feature routers only (CRUD operations removed)
router.include_router(
    scoring.router,
    prefix="/scoring",
    tags=["AI Scoring"],
    responses={404: {"description": "Not found"}},
)

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

# EU-compliant donation system
router.include_router(
    donations.router,
    prefix="/donations",
    tags=["EU Donation System"],
    responses={404: {"description": "Not found"}},
)

# Global products catalog (read-only) - Disabled: global schema not implemented
# router.include_router(
#     global_products.router,
#     prefix="/global",
#     tags=["Global Products Catalog"],
#     responses={404: {"description": "Not found"}},
# )

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
