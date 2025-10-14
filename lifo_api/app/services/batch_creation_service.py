"""
Batch Creation Service
Creates inventory batches from frontend scan data using existing database schema
"""

import uuid
from datetime import date, datetime, timedelta
from typing import Any

import structlog
from pydantic import BaseModel, Field
from sqlalchemy import and_, desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.connection import async_session

logger = structlog.get_logger()


class BatchFromScanRequest(BaseModel):
    """Request model for creating a batch from scan data"""

    barcode: str = Field(
        ..., min_length=8, max_length=50, description="Scanned barcode"
    )
    product_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Product name from OpenFoodFacts or manual",
    )
    brand: str | None = Field(None, max_length=100, description="Product brand")
    category: str | None = Field(None, max_length=100, description="Product category")

    # CSV imports provide SKU - add this field for proper handling
    sku: str | None = Field(
        None, max_length=100, description="Product SKU from CSV import"
    )

    # Batch details
    quantity: float = Field(..., gt=0, description="Initial quantity")
    expiry_date: date = Field(..., description="Product expiry date")
    batch_number: str | None = Field(
        None, max_length=100, description="Optional batch number from CSV or user input"
    )

    # Pricing (optional)
    cost_price: float | None = Field(None, ge=0, description="Cost price per unit")
    selling_price: float | None = Field(
        None, ge=0, description="Selling price per unit"
    )

    # Scan metadata
    scan_confidence: float | None = Field(
        None, ge=0.0, le=1.0, description="Barcode scan confidence"
    )
    ocr_extracted_date: str | None = Field(
        None, description="Raw OCR text for expiry date"
    )
    ocr_confidence: float | None = Field(
        None, ge=0.0, le=1.0, description="OCR confidence score"
    )

    # OpenFoodFacts data (optional)
    openfoodfacts_data: dict | None = Field(
        None, description="OpenFoodFacts product data"
    )

    # Note: Expiry date validation moved to business logic for OpenAPI compatibility


class BatchCreationResponse(BaseModel):
    """Response model for batch creation"""

    batch_id: str = Field(..., description="Created batch ID")
    product_id: str = Field(..., description="Associated product ID")
    batch_number: str = Field(..., description="Generated batch number")
    was_product_created: bool = Field(
        ..., description="True if product was created new"
    )
    was_product_updated: bool = Field(
        ..., description="True if existing product was updated"
    )
    scan_metadata: dict = Field(..., description="Scan confidence and metadata")
    created_at: datetime = Field(..., description="Batch creation timestamp")


class BatchCreationService:
    """Service for creating inventory batches from scan data"""

    def __init__(self):
        self.async_session = async_session()
        # System UUID for service_role and system operations
        self.SYSTEM_USER_UUID = uuid.UUID("00000000-0000-0000-0000-000000000000")

    def _parse_user_id_to_uuid(self, user_id: str) -> uuid.UUID:
        """
        Convert user_id string to UUID, handling special cases like service_role

        Args:
            user_id: User ID string (can be UUID or 'service_role')

        Returns:
            UUID object
        """
        # Handle service_role and other non-UUID user IDs
        if user_id in ("service_role", "system", "service"):
            return self.SYSTEM_USER_UUID

        # Try to parse as UUID
        try:
            return uuid.UUID(user_id)
        except (ValueError, AttributeError) as e:
            logger.warning(
                "Invalid user_id format, using system UUID",
                user_id=user_id,
                error=str(e),
            )
            return self.SYSTEM_USER_UUID

    async def create_batch_from_scan(
        self, store_id: str, user_id: str, batch_data: BatchFromScanRequest
    ) -> BatchCreationResponse:
        """
        Create an inventory batch from frontend scan data
        Uses existing database schema - no new tables needed
        """
        async with self.async_session() as session:
            try:
                # Convert user_id to UUID - handle service_role special case
                user_uuid = self._parse_user_id_to_uuid(user_id)

                # 1. Find or create product
                (
                    product_id,
                    was_created,
                    was_updated,
                ) = await self._find_or_create_product(
                    session, store_id, user_uuid, batch_data
                )

                # 2. Use provided batch number or generate unique one
                batch_number = (
                    batch_data.batch_number
                    if batch_data.batch_number
                    else await self._generate_batch_number(session, store_id)
                )

                # 3. Create batch using existing schema
                batch_id = await self._create_batch_record(
                    session, store_id, user_uuid, product_id, batch_number, batch_data
                )

                await session.commit()

                logger.info(
                    "Batch created from scan data",
                    batch_id=batch_id,
                    product_id=product_id,
                    barcode=batch_data.barcode,
                    store_id=store_id,
                    was_product_created=was_created,
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
                        "batch_source": "barcode",
                    },
                    created_at=datetime.utcnow(),
                )

            except Exception as e:
                await session.rollback()
                logger.error(
                    "Failed to create batch from scan",
                    error=str(e),
                    barcode=batch_data.barcode,
                    store_id=store_id,
                )
                raise

    async def _find_or_create_product(
        self,
        session: AsyncSession,
        store_id: str,
        user_uuid: uuid.UUID,
        batch_data: BatchFromScanRequest,
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
                    StoreProduct.is_active,
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
                existing_product.last_scanned_at = datetime.utcnow()  # type: ignore[assignment]
                was_updated = True

            return existing_product.product_id, False, was_updated  # type: ignore[return-value]

        # Find or create category if provided
        if batch_data.category:
            await self._find_or_create_category(session, batch_data.category, user_uuid)

        # Create new product - use provided SKU or generate one
        product_sku = batch_data.sku if batch_data.sku else f"SCAN-{batch_data.barcode}"

        new_product = Product(
            sku=product_sku,
            name=batch_data.product_name,
            category_id=await self._resolve_category_to_uuid(
                session, batch_data.category, "dry_goods"
            ),  # Use resolved UUID
            brand=batch_data.brand,
            unit_type="pcs",
            typical_shelf_life_days=30,  # Default
            barcode=batch_data.barcode,
            is_verified=True,
            created_by=user_uuid,
            # Required pricing fields from Supabase schema (must be > 0 due to check constraints)
            base_cost_price=batch_data.cost_price
            if batch_data.cost_price and batch_data.cost_price > 0
            else 0.01,
            base_selling_price=batch_data.selling_price
            if batch_data.selling_price and batch_data.selling_price > 0
            else 0.01,
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
            added_by=user_uuid,
        )
        session.add(store_product)
        await session.flush()  # Ensure store_product exists before batch creation

        return new_product.product_id, True, False  # type: ignore[return-value]

    async def _find_or_create_category(
        self, session: AsyncSession, category_name: str, user_uuid: uuid.UUID
    ) -> uuid.UUID:
        """Find existing category by name or create a new one"""
        from app.database.inventory_models import Category

        # First, try to find existing category by display name
        result = await session.execute(
            select(Category).where(Category.display_name_en == category_name)
        )
        existing_category = result.scalar_one_or_none()

        if existing_category:
            return existing_category.category_id  # type: ignore[return-value]

        # Create new category
        category_code = (
            category_name.lower()
            .replace(" ", "_")
            .replace("-", "_")
            .replace("&", "and")[:50]  # Limit to 50 characters
        )

        # Ensure category code is unique
        counter = 1
        original_code = category_code
        while True:
            result = await session.execute(
                select(Category).where(Category.category_code == category_code)
            )
            if not result.scalar_one_or_none():
                break
            category_code = f"{original_code}_{counter}"
            counter += 1

        new_category = Category(
            category_code=category_code,
            display_name_en=category_name,
            display_name_fr=category_name,  # Use same name for French
            typical_shelf_life_days=30,  # Default shelf life
            is_active=True,
        )
        session.add(new_category)
        await session.flush()

        return new_category.category_id  # type: ignore[return-value]

    async def _generate_batch_number(self, session: AsyncSession, store_id: str) -> str:
        """Generate unique batch number for the store"""
        from app.database.inventory_models import Batch

        # Get today's batch count for this store
        today = date.today()
        result = await session.execute(
            select(Batch.batch_id).where(
                and_(Batch.store_id == store_id, Batch.created_at >= today)
            )
        )
        daily_count = len(result.all()) + 1

        return f"SCAN-{today.strftime('%Y%m%d')}-{daily_count:03d}"

    async def _create_batch_record(
        self,
        session: AsyncSession,
        store_id: str,
        user_uuid: uuid.UUID,
        product_id: uuid.UUID,
        batch_number: str,
        batch_data: BatchFromScanRequest,
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
            created_by=user_uuid,
            status="active",
        )

        session.add(batch)
        await session.flush()

        return batch.batch_id  # type: ignore[return-value]

    # PERFORMANCE OPTIMIZATION: Bulk database operations
    async def _bulk_lookup_products(
        self, session: AsyncSession, store_id: str, barcodes: list[str]
    ) -> dict[str, tuple[uuid.UUID, bool]]:
        """
        Bulk lookup products by barcodes for a specific store
        Returns dict mapping barcode -> (product_id, exists_in_store)
        """
        from app.database.inventory_models import Product, StoreProduct

        # Remove duplicates and empty barcodes
        unique_barcodes = list({b for b in barcodes if b and b.strip()})

        if not unique_barcodes:
            return {}

        # Bulk query for existing products
        result = await session.execute(
            select(Product.barcode, Product.product_id, StoreProduct.store_id)
            .join(
                StoreProduct,
                Product.product_id == StoreProduct.product_id,
                isouter=True,
            )
            .where(
                and_(
                    Product.barcode.in_(unique_barcodes),
                    or_(
                        StoreProduct.store_id.is_(
                            None
                        ),  # Product exists but not in this store
                        and_(StoreProduct.store_id == store_id, StoreProduct.is_active),
                    ),
                )
            )
        )

        existing_products = {}
        for row in result:
            barcode, product_id, store_id_result = row
            exists_in_store = store_id_result == store_id
            existing_products[barcode] = (product_id, exists_in_store)

        logger.info(
            "Bulk product lookup completed",
            requested_barcodes=len(unique_barcodes),
            found_products=len(existing_products),
            store_id=store_id,
        )

        return existing_products

    async def _bulk_create_missing_products(
        self,
        session: AsyncSession,
        batch_requests: list[BatchFromScanRequest],
        existing_products: dict[str, tuple[uuid.UUID, bool]],
        store_id: str,
        user_id: str,
    ) -> dict[str, uuid.UUID]:
        """
        Bulk create products that don't exist yet
        Returns dict mapping barcode -> product_id for newly created products
        """

        from app.database.inventory_models import Product, StoreProduct

        new_products = {}
        products_to_create = []
        store_products_to_create = []

        for request in batch_requests:
            barcode = request.barcode

            # Skip if product already exists
            if barcode in existing_products:
                product_id, exists_in_store = existing_products[barcode]

                # If product exists but not in store, add to store
                if not exists_in_store:
                    store_product = StoreProduct(
                        store_id=uuid.UUID(store_id),
                        product_id=product_id,
                        cost_price=request.cost_price or 0,
                        selling_price=request.selling_price or 0,
                        is_active=True,
                        added_by=uuid.UUID(user_id),
                        updated_by=uuid.UUID(user_id),
                    )
                    store_products_to_create.append(store_product)
                continue

            # Create new product
            product_id = uuid.uuid4()
            new_products[barcode] = product_id

            # Estimate shelf life from category
            category_shelf_life = {
                "fresh_produce": 7,
                "fresh_meat_fish": 3,
                "bakery_fresh": 2,
                "dairy_eggs": 14,
                "frozen_foods": 365,
                "beverages": 180,
            }
            shelf_life = category_shelf_life.get(request.category or "other", 30)

            # Use provided SKU from CSV or generate unique one
            if hasattr(request, "sku") and request.sku:
                product_sku = request.sku
            else:
                # Generate unique SKU for products without SKU
                import uuid as uuid_lib

                product_sku = f"CSV_{barcode[:10]}_{uuid_lib.uuid4().hex[:8].upper()}"

            product = Product(
                product_id=product_id,
                sku=product_sku,  # Use provided SKU or generated unique one
                name=request.product_name,
                brand=request.brand,
                barcode=barcode,
                barcode_type="CSV_IMPORT",
                typical_shelf_life_days=shelf_life,
                base_cost_price=request.cost_price or 0,
                base_selling_price=request.selling_price or 0,
                created_by=uuid.UUID(user_id),
                is_verified=True,  # CSV imports are considered verified
            )
            products_to_create.append(product)

            # Create corresponding store product
            store_product = StoreProduct(
                store_id=uuid.UUID(store_id),
                product_id=product_id,
                cost_price=request.cost_price or 0,
                selling_price=request.selling_price or 0,
                is_active=True,
                added_by=uuid.UUID(user_id),
                updated_by=uuid.UUID(user_id),
            )
            store_products_to_create.append(store_product)

        # Bulk insert new products
        if products_to_create:
            session.add_all(products_to_create)
            logger.info("Bulk created products", count=len(products_to_create))

        # Bulk insert store products
        if store_products_to_create:
            session.add_all(store_products_to_create)
            logger.info(
                "Bulk created store products", count=len(store_products_to_create)
            )

        await session.flush()
        return new_products

    async def _bulk_create_batches(
        self,
        session: AsyncSession,
        batch_requests: list[BatchFromScanRequest],
        existing_products: dict[str, tuple[uuid.UUID, bool]],
        new_products: dict[str, uuid.UUID],
        store_id: str,
        user_id: str,
        chunk_start: int,
    ) -> list[dict[str, Any]]:
        """
        Bulk create batch records for all requests
        Returns list of successful batch records
        """
        from app.database.inventory_models import Batch

        batches_to_create = []
        successful_batches = []

        for i, request in enumerate(batch_requests):
            try:
                # Get product ID
                if request.barcode in existing_products:
                    product_id, _ = existing_products[request.barcode]
                elif request.barcode in new_products:
                    product_id = new_products[request.barcode]
                else:
                    logger.error(
                        "Product ID not found for barcode",
                        barcode=request.barcode,
                        chunk_start=chunk_start,
                        index=i,
                    )
                    continue

                # Use provided batch number or generate one
                if request.batch_number:
                    batch_number = request.batch_number
                else:
                    batch_number = await self._generate_csv_batch_number(
                        session, store_id, chunk_start, i
                    )

                # Calculate manufacture date
                manufacture_date = request.expiry_date - timedelta(days=30)

                batch = Batch(
                    product_id=product_id,
                    batch_number=batch_number,
                    initial_quantity=request.quantity,
                    current_quantity=request.quantity,
                    manufacture_date=manufacture_date,
                    expiry_date=request.expiry_date,
                    cost_price=request.cost_price or 0,
                    selling_price=request.selling_price or 0,
                    batch_source="csv_import",
                    scanned_barcode=request.barcode,
                    scan_confidence=1.0,
                    verification_status="verified",
                    store_id=uuid.UUID(store_id),
                    created_by=uuid.UUID(user_id),
                    status="active",
                )

                batches_to_create.append(batch)

                # Prepare success record
                successful_batches.append(
                    {
                        "batch_id": str(batch.batch_id),
                        "product_id": str(product_id),
                        "batch_number": batch_number,
                        "barcode": request.barcode,
                        "product_name": request.product_name,
                        "quantity": request.quantity,
                        "expiry_date": request.expiry_date.isoformat(),
                    }
                )

            except Exception as e:
                logger.error(
                    "Failed to prepare batch for bulk creation",
                    barcode=request.barcode,
                    error=str(e),
                    chunk_start=chunk_start,
                    index=i,
                )
                continue

        # Bulk insert all batches
        if batches_to_create:
            session.add_all(batches_to_create)
            logger.info("Bulk created batches", count=len(batches_to_create))

        await session.flush()
        return successful_batches

    async def _process_batch_chunk_optimized(
        self,
        store_id: str,
        user_id: str,
        chunk_requests: list[BatchFromScanRequest],
        chunk_start: int,
    ) -> dict[str, list]:
        """
        OPTIMIZED: Process a chunk of batch requests using bulk operations
        Replaces individual database calls with bulk operations for better performance
        """
        async with self.async_session() as session:
            try:
                # Validate all requests first
                for i, request in enumerate(chunk_requests):
                    self._validate_batch_request(request, chunk_start + i)

                # Step 1: Bulk lookup existing products
                barcodes = [req.barcode for req in chunk_requests]
                existing_products = await self._bulk_lookup_products(
                    session, store_id, barcodes
                )

                # Step 2: Bulk create missing products
                new_products = await self._bulk_create_missing_products(
                    session, chunk_requests, existing_products, store_id, user_id
                )

                # Step 3: Bulk create all batches
                successful_batches = await self._bulk_create_batches(
                    session,
                    chunk_requests,
                    existing_products,
                    new_products,
                    store_id,
                    user_id,
                    chunk_start,
                )

                # Commit all changes
                await session.commit()

                logger.info(
                    "Optimized chunk processing completed",
                    chunk_start=chunk_start,
                    total_requests=len(chunk_requests),
                    successful_batches=len(successful_batches),
                    created_products=len(new_products),
                )

                return {
                    "successful": successful_batches,
                    "failed": [],
                    "created_products": list(new_products.values()),
                    "updated_products": [],
                }

            except Exception as e:
                await session.rollback()
                logger.error(
                    "Optimized chunk processing failed",
                    chunk_start=chunk_start,
                    error=str(e),
                )
                # Return all as failed
                failed_batches = []
                for i, request in enumerate(chunk_requests):
                    failed_batches.append(
                        {
                            "index": chunk_start + i,
                            "barcode": request.barcode,
                            "product_name": request.product_name,
                            "error": f"Bulk processing failed: {str(e)}",
                        }
                    )

                return {
                    "successful": [],
                    "failed": failed_batches,
                    "created_products": [],
                    "updated_products": [],
                }

    async def get_recent_batches_from_scans(
        self, store_id: str, user_id: str, limit: int = 20
    ) -> list[dict]:
        """Get recent batches created from scans"""
        async with self.async_session() as session:
            from app.database.inventory_models import Batch, Product

            result = await session.execute(
                select(Batch, Product)
                .join(Product, Batch.product_id == Product.product_id)
                .where(
                    and_(Batch.store_id == store_id, Batch.batch_source == "barcode")
                )
                .order_by(desc(Batch.created_at))
                .limit(limit)
            )

            batches = []
            for batch, product in result.all():
                batches.append(
                    {
                        "batch_id": str(batch.batch_id),
                        "batch_number": batch.batch_number,
                        "product_name": product.name,
                        "brand": product.brand,
                        "barcode": batch.scanned_barcode,
                        "quantity": float(batch.current_quantity),
                        "expiry_date": batch.expiry_date.isoformat(),
                        "scan_confidence": float(batch.scan_confidence)
                        if batch.scan_confidence
                        else None,
                        "ocr_confidence": float(batch.ocr_confidence)
                        if batch.ocr_confidence
                        else None,
                        "verification_status": batch.verification_status,
                        "created_at": batch.created_at.isoformat(),
                    }
                )

            return batches

    async def create_batches_from_csv_bulk(
        self,
        store_id: str,
        user_id: str,
        batch_requests: list[BatchFromScanRequest],
        chunk_size: int = 50,
    ) -> dict[str, Any]:
        """
        Create multiple batches from CSV data with transaction management and chunking

        Args:
            store_id: Store ID for the batches
            user_id: User ID creating the batches
            batch_requests: List of batch creation requests from CSV
            chunk_size: Number of batches to process per transaction chunk

        Returns:
            Dictionary with creation results and statistics
        """
        if not batch_requests:
            raise ValueError("No batch requests provided")

        if chunk_size < 1 or chunk_size > 500:
            raise ValueError("Chunk size must be between 1 and 500")

        total_requests = len(batch_requests)
        successful_batches = []
        failed_batches = []
        created_products = []
        updated_products = []

        logger.info(
            "Starting bulk CSV batch creation",
            total_requests=total_requests,
            chunk_size=chunk_size,
            store_id=store_id,
            user_id=user_id,
        )

        # Process in chunks to avoid large transactions
        for chunk_start in range(0, total_requests, chunk_size):
            chunk_end = min(chunk_start + chunk_size, total_requests)
            chunk_requests = batch_requests[chunk_start:chunk_end]

            try:
                chunk_results = await self._process_batch_chunk_optimized(
                    store_id, user_id, chunk_requests, chunk_start
                )

                successful_batches.extend(chunk_results["successful"])
                failed_batches.extend(chunk_results["failed"])
                created_products.extend(chunk_results["created_products"])
                updated_products.extend(chunk_results["updated_products"])

                logger.info(
                    "Chunk processed successfully",
                    chunk_start=chunk_start,
                    chunk_end=chunk_end,
                    successful=len(chunk_results["successful"]),
                    failed=len(chunk_results["failed"]),
                )

            except Exception as e:
                logger.error(
                    "Chunk processing failed",
                    chunk_start=chunk_start,
                    chunk_end=chunk_end,
                    error=str(e),
                )

                # Mark entire chunk as failed
                for i, request in enumerate(chunk_requests):
                    failed_batches.append(
                        {
                            "index": chunk_start + i,
                            "barcode": request.barcode,
                            "product_name": request.product_name,
                            "error": f"Chunk processing failed: {str(e)}",
                        }
                    )

        # Calculate final statistics
        success_rate = (
            (len(successful_batches) / total_requests) * 100
            if total_requests > 0
            else 0
        )

        return {
            "store_id": store_id,
            "user_id": user_id,
            "total_requests": total_requests,
            "successful": len(successful_batches),
            "failed": len(failed_batches),
            "success_rate": round(success_rate, 2),
            "successful_batches": successful_batches,
            "failed_batches": failed_batches,
            "product_statistics": {
                "created_products": len(created_products),
                "updated_products": len(updated_products),
                "unique_products": len(set(created_products + updated_products)),
            },
            "processing_metadata": {
                "chunk_size": chunk_size,
                "total_chunks": (total_requests + chunk_size - 1) // chunk_size,
                "processed_at": datetime.utcnow().isoformat(),
            },
        }

    async def _process_batch_chunk(
        self,
        store_id: str,
        user_id: str,
        chunk_requests: list[BatchFromScanRequest],
        chunk_start: int,
    ) -> dict[str, list]:
        """
        Process a chunk of batch requests in a single transaction

        Args:
            store_id: Store ID
            user_id: User ID
            chunk_requests: List of batch requests to process
            chunk_start: Starting index for this chunk

        Returns:
            Dictionary with successful and failed batch results
        """
        async with self.async_session() as session:
            try:
                successful = []
                failed = []
                created_products = []
                updated_products = []

                for i, batch_request in enumerate(chunk_requests):
                    request_index = chunk_start + i

                    try:
                        # Validate batch request
                        self._validate_batch_request(batch_request, request_index)

                        # Find or create product
                        (
                            product_id,
                            was_created,
                            was_updated,
                        ) = await self._find_or_create_product(
                            session, store_id, user_id, batch_request
                        )

                        if was_created:
                            created_products.append(str(product_id))
                        elif was_updated:
                            updated_products.append(str(product_id))

                        # Use provided batch number or generate one
                        if batch_request.batch_number:
                            batch_number = batch_request.batch_number
                            logger.info(
                                "Using provided batch number from CSV",
                                barcode=batch_request.barcode,
                                provided_batch_number=batch_number,
                            )
                        else:
                            batch_number = await self._generate_csv_batch_number(
                                session, store_id, chunk_start, i
                            )
                            logger.info(
                                "Generated CSV batch number",
                                barcode=batch_request.barcode,
                                generated_batch_number=batch_number,
                            )

                        # Create batch record
                        batch_id = await self._create_csv_batch_record(
                            session,
                            store_id,
                            user_id,
                            product_id,
                            batch_number,
                            batch_request,
                        )

                        successful.append(
                            {
                                "index": request_index,
                                "batch_id": str(batch_id),
                                "product_id": str(product_id),
                                "batch_number": batch_number,
                                "barcode": batch_request.barcode,
                                "product_name": batch_request.product_name,
                                "quantity": batch_request.quantity,
                                "was_product_created": was_created,
                                "was_product_updated": was_updated,
                            }
                        )

                    except Exception as e:
                        logger.warning(
                            "Failed to process individual batch request",
                            request_index=request_index,
                            barcode=batch_request.barcode,
                            error=str(e),
                        )

                        failed.append(
                            {
                                "index": request_index,
                                "barcode": batch_request.barcode,
                                "product_name": batch_request.product_name,
                                "error": str(e),
                            }
                        )

                # Commit the entire chunk
                await session.commit()

                return {
                    "successful": successful,
                    "failed": failed,
                    "created_products": created_products,
                    "updated_products": updated_products,
                }

            except Exception:
                await session.rollback()
                raise

    def _validate_batch_request(self, request: BatchFromScanRequest, index: int):
        """Validate a batch request before processing"""
        if not request.barcode or len(request.barcode.strip()) < 8:
            raise ValueError(
                f"Row {index}: Invalid barcode - must be at least 8 characters"
            )

        if not request.product_name or not request.product_name.strip():
            raise ValueError(f"Row {index}: Product name is required")

        if request.quantity <= 0:
            raise ValueError(f"Row {index}: Quantity must be positive")

        # Check expiry date is reasonable
        today = date.today()
        if request.expiry_date < today - timedelta(days=30):
            raise ValueError(f"Row {index}: Expiry date is too far in the past")

        if request.expiry_date > today + timedelta(days=3650):  # 10 years
            raise ValueError(f"Row {index}: Expiry date is too far in the future")

    async def _generate_csv_batch_number(
        self, session: AsyncSession, store_id: str, chunk_start: int, chunk_index: int
    ) -> str:
        """Generate unique batch number for CSV import"""
        today = date.today()
        # Use chunk info to ensure uniqueness
        sequence = chunk_start + chunk_index + 1
        return f"CSV-{today.strftime('%Y%m%d')}-{sequence:05d}"

    async def _create_csv_batch_record(
        self,
        session: AsyncSession,
        store_id: str,
        user_id: str,
        product_id: uuid.UUID,
        batch_number: str,
        batch_data: BatchFromScanRequest,
    ) -> uuid.UUID:
        """Create batch record specifically for CSV imports"""
        from app.database.inventory_models import Batch

        # Calculate manufacture date (default to 30 days before expiry)
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
            # CSV-specific metadata
            batch_source="csv_import",
            scanned_barcode=batch_data.barcode,
            scan_confidence=1.0,  # CSV data is considered 100% confident
            verification_status="verified",
            # Store and audit
            store_id=uuid.UUID(store_id),
            created_by=uuid.UUID(user_id),
            status="active",
        )

        session.add(batch)
        await session.flush()

        return batch.batch_id  # type: ignore[return-value]

    # PERFORMANCE OPTIMIZATION: Bulk database operations
    async def _bulk_lookup_products(
        self, session: AsyncSession, store_id: str, barcodes: list[str]
    ) -> dict[str, tuple[uuid.UUID, bool]]:
        """
        Bulk lookup products by barcodes for a specific store
        Returns dict mapping barcode -> (product_id, exists_in_store)
        """
        from app.database.inventory_models import Product, StoreProduct

        # Remove duplicates and empty barcodes
        unique_barcodes = list({b for b in barcodes if b and b.strip()})

        if not unique_barcodes:
            return {}

        # Bulk query for existing products
        result = await session.execute(
            select(Product.barcode, Product.product_id, StoreProduct.store_id)
            .join(
                StoreProduct,
                Product.product_id == StoreProduct.product_id,
                isouter=True,
            )
            .where(
                and_(
                    Product.barcode.in_(unique_barcodes),
                    or_(
                        StoreProduct.store_id.is_(
                            None
                        ),  # Product exists but not in this store
                        and_(StoreProduct.store_id == store_id, StoreProduct.is_active),
                    ),
                )
            )
        )

        existing_products = {}
        for row in result:
            barcode, product_id, store_id_result = row
            exists_in_store = store_id_result == store_id
            existing_products[barcode] = (product_id, exists_in_store)

        logger.info(
            "Bulk product lookup completed",
            requested_barcodes=len(unique_barcodes),
            found_products=len(existing_products),
            store_id=store_id,
        )

        return existing_products

    async def _bulk_create_missing_products(
        self,
        session: AsyncSession,
        batch_requests: list[BatchFromScanRequest],
        existing_products: dict[str, tuple[uuid.UUID, bool]],
        store_id: str,
        user_id: str,
    ) -> dict[str, uuid.UUID]:
        """
        Bulk create products that don't exist yet
        Returns dict mapping barcode -> product_id for newly created products
        """

        from app.database.inventory_models import Product, StoreProduct

        new_products = {}
        products_to_create = []
        store_products_to_create = []

        for request in batch_requests:
            barcode = request.barcode

            # Skip if product already exists
            if barcode in existing_products:
                product_id, exists_in_store = existing_products[barcode]

                # If product exists but not in store, add to store
                if not exists_in_store:
                    store_product = StoreProduct(
                        store_id=uuid.UUID(store_id),
                        product_id=product_id,
                        cost_price=request.cost_price or 0,
                        selling_price=request.selling_price or 0,
                        is_active=True,
                        added_by=uuid.UUID(user_id),
                        updated_by=uuid.UUID(user_id),
                    )
                    store_products_to_create.append(store_product)
                continue

            # Create new product
            product_id = uuid.uuid4()
            new_products[barcode] = product_id

            # Estimate shelf life from category
            category_shelf_life = {
                "fresh_produce": 7,
                "fresh_meat_fish": 3,
                "bakery_fresh": 2,
                "dairy_eggs": 14,
                "frozen_foods": 365,
                "beverages": 180,
            }
            shelf_life = category_shelf_life.get(request.category or "other", 30)

            # Use provided SKU from CSV or generate unique one
            if hasattr(request, "sku") and request.sku:
                product_sku = request.sku
            else:
                # Generate unique SKU for products without SKU
                import uuid as uuid_lib

                product_sku = f"CSV_{barcode[:10]}_{uuid_lib.uuid4().hex[:8].upper()}"

            product = Product(
                product_id=product_id,
                sku=product_sku,  # Use provided SKU or generated unique one
                name=request.product_name,
                brand=request.brand,
                barcode=barcode,
                barcode_type="CSV_IMPORT",
                typical_shelf_life_days=shelf_life,
                base_cost_price=request.cost_price or 0,
                base_selling_price=request.selling_price or 0,
                created_by=uuid.UUID(user_id),
                is_verified=True,  # CSV imports are considered verified
            )
            products_to_create.append(product)

            # Create corresponding store product
            store_product = StoreProduct(
                store_id=uuid.UUID(store_id),
                product_id=product_id,
                cost_price=request.cost_price or 0,
                selling_price=request.selling_price or 0,
                is_active=True,
                added_by=uuid.UUID(user_id),
                updated_by=uuid.UUID(user_id),
            )
            store_products_to_create.append(store_product)

        # Bulk insert new products
        if products_to_create:
            session.add_all(products_to_create)
            logger.info("Bulk created products", count=len(products_to_create))

        # Bulk insert store products
        if store_products_to_create:
            session.add_all(store_products_to_create)
            logger.info(
                "Bulk created store products", count=len(store_products_to_create)
            )

        await session.flush()
        return new_products

    async def _bulk_create_batches(
        self,
        session: AsyncSession,
        batch_requests: list[BatchFromScanRequest],
        existing_products: dict[str, tuple[uuid.UUID, bool]],
        new_products: dict[str, uuid.UUID],
        store_id: str,
        user_id: str,
        chunk_start: int,
    ) -> list[dict[str, Any]]:
        """
        Bulk create batch records for all requests
        Returns list of successful batch records
        """
        from app.database.inventory_models import Batch

        batches_to_create = []
        successful_batches = []

        for i, request in enumerate(batch_requests):
            try:
                # Get product ID
                if request.barcode in existing_products:
                    product_id, _ = existing_products[request.barcode]
                elif request.barcode in new_products:
                    product_id = new_products[request.barcode]
                else:
                    logger.error(
                        "Product ID not found for barcode",
                        barcode=request.barcode,
                        chunk_start=chunk_start,
                        index=i,
                    )
                    continue

                # Use provided batch number or generate one
                if request.batch_number:
                    batch_number = request.batch_number
                else:
                    batch_number = await self._generate_csv_batch_number(
                        session, store_id, chunk_start, i
                    )

                # Calculate manufacture date
                manufacture_date = request.expiry_date - timedelta(days=30)

                batch = Batch(
                    product_id=product_id,
                    batch_number=batch_number,
                    initial_quantity=request.quantity,
                    current_quantity=request.quantity,
                    manufacture_date=manufacture_date,
                    expiry_date=request.expiry_date,
                    cost_price=request.cost_price or 0,
                    selling_price=request.selling_price or 0,
                    batch_source="csv_import",
                    scanned_barcode=request.barcode,
                    scan_confidence=1.0,
                    verification_status="verified",
                    store_id=uuid.UUID(store_id),
                    created_by=uuid.UUID(user_id),
                    status="active",
                )

                batches_to_create.append(batch)

                # Prepare success record
                successful_batches.append(
                    {
                        "batch_id": str(batch.batch_id),
                        "product_id": str(product_id),
                        "batch_number": batch_number,
                        "barcode": request.barcode,
                        "product_name": request.product_name,
                        "quantity": request.quantity,
                        "expiry_date": request.expiry_date.isoformat(),
                    }
                )

            except Exception as e:
                logger.error(
                    "Failed to prepare batch for bulk creation",
                    barcode=request.barcode,
                    error=str(e),
                    chunk_start=chunk_start,
                    index=i,
                )
                continue

        # Bulk insert all batches
        if batches_to_create:
            session.add_all(batches_to_create)
            logger.info("Bulk created batches", count=len(batches_to_create))

        await session.flush()
        return successful_batches

    async def _process_batch_chunk_optimized(
        self,
        store_id: str,
        user_id: str,
        chunk_requests: list[BatchFromScanRequest],
        chunk_start: int,
    ) -> dict[str, list]:
        """
        OPTIMIZED: Process a chunk of batch requests using bulk operations
        Replaces individual database calls with bulk operations for better performance
        """
        async with self.async_session() as session:
            try:
                # Validate all requests first
                for i, request in enumerate(chunk_requests):
                    self._validate_batch_request(request, chunk_start + i)

                # Step 1: Bulk lookup existing products
                barcodes = [req.barcode for req in chunk_requests]
                existing_products = await self._bulk_lookup_products(
                    session, store_id, barcodes
                )

                # Step 2: Bulk create missing products
                new_products = await self._bulk_create_missing_products(
                    session, chunk_requests, existing_products, store_id, user_id
                )

                # Step 3: Bulk create all batches
                successful_batches = await self._bulk_create_batches(
                    session,
                    chunk_requests,
                    existing_products,
                    new_products,
                    store_id,
                    user_id,
                    chunk_start,
                )

                # Commit all changes
                await session.commit()

                logger.info(
                    "Optimized chunk processing completed",
                    chunk_start=chunk_start,
                    total_requests=len(chunk_requests),
                    successful_batches=len(successful_batches),
                    created_products=len(new_products),
                )

                return {
                    "successful": successful_batches,
                    "failed": [],
                    "created_products": list(new_products.values()),
                    "updated_products": [],
                }

            except Exception as e:
                await session.rollback()
                logger.error(
                    "Optimized chunk processing failed",
                    chunk_start=chunk_start,
                    error=str(e),
                )
                # Return all as failed
                failed_batches = []
                for i, request in enumerate(chunk_requests):
                    failed_batches.append(
                        {
                            "index": chunk_start + i,
                            "barcode": request.barcode,
                            "product_name": request.product_name,
                            "error": f"Bulk processing failed: {str(e)}",
                        }
                    )

                return {
                    "successful": [],
                    "failed": failed_batches,
                    "created_products": [],
                    "updated_products": [],
                }

    async def _resolve_category_to_uuid(
        self,
        session: AsyncSession,
        category_str: str | None,
        fallback: str = "dry_goods",
    ) -> uuid.UUID:
        """Resolve category string to category UUID from database"""
        from app.database.inventory_models import Category

        if not category_str:
            category_str = fallback

        category_str = category_str.lower().strip()

        # Simple category mapping for common variations
        category_mapping = {
            "produce": "fresh_produce",
            "fruits": "fresh_produce",
            "vegetables": "fresh_produce",
            "meat": "fresh_meat_fish",
            "fish": "fresh_meat_fish",
            "dairy": "dairy_eggs",
            "milk": "dairy_eggs",
            "cheese": "dairy_eggs",
            "bakery": "bakery_fresh",
            "bread": "bakery_fresh",
            "frozen": "frozen_foods",
            "beverages": "beverages",
            "drinks": "beverages",
            "canned": "canned_jarred",
            "jarred": "canned_jarred",
        }

        # Map to standard category code
        category_code = category_mapping.get(category_str, category_str)

        # Try exact match first
        result = await session.execute(
            select(Category.category_id).where(Category.category_code == category_code)
        )
        category = result.scalar_one_or_none()

        if category:
            return category

        # Fallback to default category
        result = await session.execute(
            select(Category.category_id).where(Category.category_code == fallback)
        )
        fallback_category = result.scalar_one_or_none()

        if fallback_category:
            return fallback_category

        # Ultimate fallback - return first available category
        result = await session.execute(select(Category.category_id).limit(1))
        first_category = result.scalar_one_or_none()

        if first_category:
            return first_category

        # This should never happen if categories table is populated
        raise ValueError("No categories found in database")
