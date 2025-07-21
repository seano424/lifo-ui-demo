"""
Global Products API - Read-only operations for global product catalog
Provides endpoints for querying the global products schema
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from typing import List, Optional, Dict, Any
import structlog

from app.database.connection import get_database
from app.database.global_models import GlobalProduct, StoreProduct, ProductCategory, BarcodeFormat, OCRExtractionLog
from app.core.auth import get_current_user

logger = structlog.get_logger()

router = APIRouter()


@router.get("/products", response_model=Dict[str, Any])
async def get_global_products(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search term for name/brand/barcode"),
    category: Optional[str] = Query(None, description="Filter by category"),
    verified_only: bool = Query(True, description="Show only verified products"),
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get global products with pagination and filtering"""
    try:
        query = select(GlobalProduct).where(GlobalProduct.is_active == True)
        
        # Apply filters
        if verified_only:
            query = query.where(GlobalProduct.verification_status == 'verified')
        
        if category:
            query = query.where(GlobalProduct.primary_category == category)
        
        if search:
            search_filter = or_(
                GlobalProduct.name.ilike(f"%{search}%"),
                GlobalProduct.brand.ilike(f"%{search}%"),
                GlobalProduct.barcode == search
            )
            query = query.where(search_filter)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        query = query.order_by(GlobalProduct.created_at.desc())
        
        result = await db.execute(query)
        products = result.scalars().all()
        
        # Convert to dict format
        products_data = []
        for product in products:
            product_dict = {
                "product_id": str(product.product_id),
                "name": product.name,
                "brand": product.brand,
                "barcode": product.barcode,
                "primary_category": product.primary_category,
                "typical_shelf_life_days": product.typical_shelf_life_days,
                "unit_type": product.unit_type,
                "verification_status": product.verification_status,
                "created_at": product.created_at.isoformat() if product.created_at else None,
                "updated_at": product.updated_at.isoformat() if product.updated_at else None
            }
            products_data.append(product_dict)
        
        return {
            "products": products_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            }
        }
        
    except Exception as e:
        logger.error("Error fetching global products", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/products/{product_id}")
async def get_global_product(
    product_id: str,
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific global product by ID"""
    try:
        query = select(GlobalProduct).where(
            and_(
                GlobalProduct.product_id == product_id,
                GlobalProduct.is_active == True
            )
        )
        
        result = await db.execute(query)
        product = result.scalar_one_or_none()
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return {
            "product_id": str(product.product_id),
            "name": product.name,
            "brand": product.brand,
            "barcode": product.barcode,
            "primary_category": product.primary_category,
            "typical_shelf_life_days": product.typical_shelf_life_days,
            "unit_type": product.unit_type,
            "verification_status": product.verification_status,
            "nutritional_info": product.nutritional_info,
            "allergen_info": product.allergen_info,
            "created_at": product.created_at.isoformat() if product.created_at else None,
            "updated_at": product.updated_at.isoformat() if product.updated_at else None,
            "created_by": product.created_by
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error fetching global product", product_id=product_id, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/products/search/barcode/{barcode}")
async def search_by_barcode(
    barcode: str,
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Search for a global product by barcode"""
    try:
        query = select(GlobalProduct).where(
            and_(
                GlobalProduct.barcode == barcode,
                GlobalProduct.is_active == True
            )
        )
        
        result = await db.execute(query)
        product = result.scalar_one_or_none()
        
        if not product:
            return {"found": False, "product": None}
        
        return {
            "found": True,
            "product": {
                "product_id": str(product.product_id),
                "name": product.name,
                "brand": product.brand,
                "barcode": product.barcode,
                "primary_category": product.primary_category,
                "typical_shelf_life_days": product.typical_shelf_life_days,
                "unit_type": product.unit_type,
                "verification_status": product.verification_status
            }
        }
        
    except Exception as e:
        logger.error("Error searching product by barcode", barcode=barcode, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/store-products/{store_id}")
async def get_store_products(
    store_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    category: Optional[str] = Query(None),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get products available in a specific store"""
    try:
        # Join StoreProduct with GlobalProduct
        query = select(StoreProduct, GlobalProduct).join(
            GlobalProduct, StoreProduct.product_id == GlobalProduct.product_id
        ).where(StoreProduct.store_id == store_id)
        
        if active_only:
            query = query.where(
                and_(
                    StoreProduct.is_active == True,
                    GlobalProduct.is_active == True
                )
            )
        
        if category:
            query = query.where(GlobalProduct.primary_category == category)
        
        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(count_query)
        total_count = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)
        query = query.order_by(StoreProduct.created_at.desc())
        
        result = await db.execute(query)
        store_products = result.all()
        
        products_data = []
        for store_product, global_product in store_products:
            product_dict = {
                "store_product_id": str(store_product.store_product_id),
                "global_product_id": str(global_product.product_id),
                "name": global_product.name,
                "brand": global_product.brand,
                "barcode": global_product.barcode,
                "category": global_product.primary_category,
                "default_cost_price": float(store_product.default_cost_price) if store_product.default_cost_price else None,
                "default_selling_price": float(store_product.default_selling_price) if store_product.default_selling_price else None,
                "store_specific_sku": store_product.store_specific_sku,
                "supplier_code": store_product.supplier_code,
                "is_active": store_product.is_active,
                "added_at": store_product.created_at.isoformat() if store_product.created_at else None
            }
            products_data.append(product_dict)
        
        return {
            "store_products": products_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "pages": (total_count + limit - 1) // limit
            }
        }
        
    except Exception as e:
        logger.error("Error fetching store products", store_id=store_id, error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/categories")
async def get_product_categories(
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get all product categories with counts"""
    try:
        query = select(
            GlobalProduct.primary_category,
            func.count(GlobalProduct.product_id).label('count')
        ).where(
            GlobalProduct.is_active == True
        ).group_by(GlobalProduct.primary_category).order_by(GlobalProduct.primary_category)
        
        result = await db.execute(query)
        categories = result.all()
        
        categories_data = [
            {
                "category": category,
                "product_count": count
            }
            for category, count in categories
        ]
        
        return {"categories": categories_data}
        
    except Exception as e:
        logger.error("Error fetching product categories", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/barcode-formats")
async def get_barcode_formats(
    db: AsyncSession = Depends(get_database),
    current_user: dict = Depends(get_current_user)
):
    """Get supported barcode formats"""
    try:
        query = select(BarcodeFormat).where(BarcodeFormat.is_active == True)
        result = await db.execute(query)
        formats = result.scalars().all()
        
        formats_data = []
        for fmt in formats:
            format_dict = {
                "format_id": str(fmt.format_id),
                "format_name": fmt.format_name,
                "description": fmt.description,
                "validation_pattern": fmt.validation_pattern,
                "example": fmt.example
            }
            formats_data.append(format_dict)
        
        return {"barcode_formats": formats_data}
        
    except Exception as e:
        logger.error("Error fetching barcode formats", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error")