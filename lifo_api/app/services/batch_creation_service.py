"""
Batch Creation Service
Creates inventory batches from frontend scan data using existing database schema
"""

import uuid
from datetime import date, datetime, timedelta
from typing import List, Optional

import structlog
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session

logger = structlog.get_logger()


class BatchFromScanRequest(BaseModel):
    """Request model for creating a batch from scan data"""
    barcode: str = Field(..., min_length=8, max_length=50, description="Scanned barcode")
    product_name: str = Field(..., min_length=1, max_length=255, description="Product name from OpenFoodFacts or manual")
    brand: Optional[str] = Field(None, max_length=100, description="Product brand")
    category: Optional[str] = Field(None, max_length=100, description="Product category")
    
    # Batch details
    quantity: float = Field(..., gt=0, description="Initial quantity")
    expiry_date: date = Field(..., description="Product expiry date")
    
    # Pricing (optional)
    cost_price: Optional[float] = Field(None, ge=0, description="Cost price per unit")
    selling_price: Optional[float] = Field(None, ge=0, description="Selling price per unit")
    
    # Scan metadata
    scan_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Barcode scan confidence")
    ocr_extracted_date: Optional[str] = Field(None, description="Raw OCR text for expiry date")
    ocr_confidence: Optional[float] = Field(None, ge=0.0, le=1.0, description="OCR confidence score")
    
    # OpenFoodFacts data (optional)
    openfoodfacts_data: Optional[dict] = Field(None, description="OpenFoodFacts product data")

    # Note: Expiry date validation moved to business logic for OpenAPI compatibility


class BatchCreationResponse(BaseModel):
    """Response model for batch creation"""
    batch_id: str = Field(..., description="Created batch ID")
    product_id: str = Field(..., description="Associated product ID")
    batch_number: str = Field(..., description="Generated batch number")
    was_product_created: bool = Field(..., description="True if product was created new")
    was_product_updated: bool = Field(..., description="True if existing product was updated")
    scan_metadata: dict = Field(..., description="Scan confidence and metadata")
    created_at: datetime = Field(..., description="Batch creation timestamp")


class BatchCreationService:
    """Service for creating inventory batches from scan data"""
    
    def __init__(self):
        self.async_session = async_session()
    
    async def create_batch_from_scan(
        self,
        store_id: str,
        user_id: str,
        batch_data: BatchFromScanRequest
    ) -> BatchCreationResponse:
        """
        Create an inventory batch from frontend scan data
        Uses existing database schema - no new tables needed
        """
        async with self.async_session() as session:
            try:
                # 1. Find or create product
                product_id, was_created, was_updated = await self._find_or_create_product(
                    session, store_id, batch_data
                )
                
                # 2. Generate unique batch number
                batch_number = await self._generate_batch_number(session, store_id)
                
                # 3. Create batch using existing schema
                batch_id = await self._create_batch_record(
                    session, store_id, user_id, product_id, batch_number, batch_data
                )
                
                await session.commit()
                
                logger.info(
                    "Batch created from scan data",
                    batch_id=batch_id,
                    product_id=product_id,
                    barcode=batch_data.barcode,
                    store_id=store_id,
                    was_product_created=was_created
                )
                
                return BatchCreationResponse(
                    batch_id=str(batch_id),
                    product_id=str(product_id),
                    batch_number=batch_number,
                    was_product_created=was_created,
                    was_product_updated=was_updated,
                    scan_metadata={
                        "scan_confidence": batch_data.scan_confidence,
                        "ocr_confidence": batch_data.ocr_confidence,
                        "ocr_extracted_date": batch_data.ocr_extracted_date,
                        "batch_source": "barcode"
                    },
                    created_at=datetime.utcnow()
                )
                
            except Exception as e:
                await session.rollback()
                logger.error(
                    "Failed to create batch from scan",
                    error=str(e),
                    barcode=batch_data.barcode,
                    store_id=store_id
                )
                raise
    
    async def _find_or_create_product(
        self,
        session: AsyncSession,
        store_id: str,
        batch_data: BatchFromScanRequest
    ) -> tuple[uuid.UUID, bool, bool]:
        """Find existing product by barcode or create new one"""
        from app.database.inventory_models import Product, StoreProduct
        
        # First, try to find existing product by barcode
        result = await session.execute(
            select(Product)
            .join(StoreProduct, Product.product_id == StoreProduct.product_id)
            .where(
                and_(
                    Product.barcode == batch_data.barcode,
                    StoreProduct.store_id == store_id,
                    StoreProduct.is_active == True
                )
            )
        )
        existing_product = result.scalar_one_or_none()
        
        if existing_product:
            # Update product with new information if provided
            was_updated = False
            if batch_data.openfoodfacts_data:
                # Note: The Product model may not have open_food_facts_data field
                # This can be stored separately or in a JSONB field if needed
                existing_product.last_scanned_at = datetime.utcnow()
                was_updated = True
            
            return existing_product.product_id, False, was_updated
        
        # Create new product
        new_product = Product(
            sku=f"SCAN-{batch_data.barcode}",
            name=batch_data.product_name,
            category=batch_data.category or "Scanned Products",
            brand=batch_data.brand,
            unit_type="pcs",
            typical_shelf_life_days=30,  # Default
            barcode=batch_data.barcode,
            is_verified=True,
            created_by=uuid.UUID(user_id)
        )
        session.add(new_product)
        await session.flush()  # Get the product_id
        
        # Create store-product relationship
        store_product = StoreProduct(
            store_id=uuid.UUID(store_id),
            product_id=new_product.product_id,
            cost_price=batch_data.cost_price,
            selling_price=batch_data.selling_price,
            is_active=True,
            added_by=uuid.UUID(user_id)
        )
        session.add(store_product)
        
        return new_product.product_id, True, False
    
    async def _generate_batch_number(self, session: AsyncSession, store_id: str) -> str:
        """Generate unique batch number for the store"""
        from app.database.inventory_models import Batch
        
        # Get today's batch count for this store
        today = date.today()
        result = await session.execute(
            select(Batch.batch_id)
            .where(
                and_(
                    Batch.store_id == store_id,
                    Batch.created_at >= today
                )
            )
        )
        daily_count = len(result.all()) + 1
        
        return f"SCAN-{today.strftime('%Y%m%d')}-{daily_count:03d}"
    
    async def _create_batch_record(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        product_id: uuid.UUID,
        batch_number: str,
        batch_data: BatchFromScanRequest
    ) -> uuid.UUID:
        """Create the batch record using existing schema"""
        from app.database.inventory_models import Batch
        
        # Calculate manufacture date (default to 30 days before expiry if not provided)
        manufacture_date = batch_data.expiry_date - timedelta(days=30)
        
        batch = Batch(
            product_id=product_id,
            batch_number=batch_number,
            initial_quantity=batch_data.quantity,
            current_quantity=batch_data.quantity,
            manufacture_date=manufacture_date,
            expiry_date=batch_data.expiry_date,
            cost_price=batch_data.cost_price or 0,
            selling_price=batch_data.selling_price or 0,
            
            # Scan-specific fields (using existing schema!)
            batch_source="barcode",
            scanned_barcode=batch_data.barcode,
            scan_confidence=batch_data.scan_confidence,
            verification_status="verified",
            
            # OCR fields (from Supabase schema)
            ocr_extracted_date=batch_data.ocr_extracted_date,
            ocr_confidence=batch_data.ocr_confidence,
            
            # Store and audit
            store_id=uuid.UUID(store_id),
            created_by=uuid.UUID(user_id),
            status="active"
        )
        
        session.add(batch)
        await session.flush()
        
        return batch.batch_id
    
    async def get_recent_batches_from_scans(
        self,
        store_id: str,
        user_id: str,
        limit: int = 20
    ) -> List[dict]:
        """Get recent batches created from scans"""
        async with self.async_session() as session:
            from app.database.inventory_models import Batch, Product
            
            result = await session.execute(
                select(Batch, Product)
                .join(Product, Batch.product_id == Product.product_id)
                .where(
                    and_(
                        Batch.store_id == store_id,
                        Batch.batch_source == "barcode"
                    )
                )
                .order_by(desc(Batch.created_at))
                .limit(limit)
            )
            
            batches = []
            for batch, product in result.all():
                batches.append({
                    "batch_id": str(batch.batch_id),
                    "batch_number": batch.batch_number,
                    "product_name": product.name,
                    "brand": product.brand,
                    "barcode": batch.scanned_barcode,
                    "quantity": float(batch.current_quantity),
                    "expiry_date": batch.expiry_date.isoformat(),
                    "scan_confidence": float(batch.scan_confidence) if batch.scan_confidence else None,
                    "ocr_confidence": float(batch.ocr_confidence) if batch.ocr_confidence else None,
                    "verification_status": batch.verification_status,
                    "created_at": batch.created_at.isoformat()
                })
            
            return batches