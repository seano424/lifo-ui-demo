"""
Main API router for LIFO AI Engine v1
Combines all API endpoints into a single router
Updated for MVP with scan workflows and mobile optimization
"""
from fastapi import APIRouter

from app.api.v1 import scoring, analytics, csv, scan_workflows, mobile_endpoints, mvp_analytics, image_recognition, csv_upload

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

# Future-ready endpoints for image recognition
router.include_router(
    image_recognition.router,
    prefix="/image",
    tags=["Image Recognition (Future)"],
    responses={404: {"description": "Not found"}},
)

