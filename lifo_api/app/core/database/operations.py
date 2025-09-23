"""
Database operations module for LIFO AI Core

This module provides database operations specifically designed for AI/ETL workflows,
inventory management, and data processing operations. It maintains backward
compatibility with existing imports while providing a foundation for future
machine learning and analytics features.

Key Features:
- Async/await support for all database operations
- Comprehensive error handling and logging
- ETL pipeline support with batch processing
- ML feature preparation capabilities
- Analytics data aggregation
- Type-safe operations with full type hints
"""

import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timedelta
from typing import Any

# Conditional imports to handle missing dependencies gracefully
try:
    from sqlalchemy import text
    from sqlalchemy.exc import SQLAlchemyError
    from sqlalchemy.ext.asyncio import AsyncSession

    SQLALCHEMY_AVAILABLE = True
except ImportError:
    # Mock classes for when SQLAlchemy is not available
    class MockAsyncSession:
        pass

    class MockSQLAlchemyError(Exception):
        pass

    class IntegrityError(MockSQLAlchemyError):
        pass

    def text(query_string):
        return query_string

    AsyncSession = MockAsyncSession  # type: ignore
    SQLAlchemyError = MockSQLAlchemyError  # type: ignore

    SQLALCHEMY_AVAILABLE = False

# Import settings and logger utilities with fallbacks
try:
    from ..config.settings import get_settings

    settings = get_settings()
except ImportError:
    # Fallback for when dependencies are not available
    settings = type("Settings", (), {"debug": False})()

try:
    from ..utils.logger import get_logger

    logger = get_logger("lifo_api.database")
except ImportError:
    # Fallback for when dependencies are not available
    import logging
    from typing import Any

    class FallbackLogger:
        def __init__(self, name: str):
            self._logger = logging.getLogger(name)

        def debug(self, msg: str, **kwargs: Any) -> None:
            if hasattr(self._logger, "debug"):
                self._logger.debug(msg)
            else:
                print(f"DEBUG: {msg}")

        def info(self, msg: str, **kwargs: Any) -> None:
            if hasattr(self._logger, "info"):
                self._logger.info(msg)
            else:
                print(f"INFO: {msg}")

        def warning(self, msg: str, **kwargs: Any) -> None:
            if hasattr(self._logger, "warning"):
                self._logger.warning(msg)
            else:
                print(f"WARNING: {msg}")

        def error(self, msg: str, **kwargs: Any) -> None:
            if hasattr(self._logger, "error"):
                self._logger.error(msg)
            else:
                print(f"ERROR: {msg}")

    logger = FallbackLogger("lifo_api.database")  # type: ignore

# Type aliases for better readability
ProductDict = dict[str, Any]
BatchDict = dict[str, Any]
OperationResult = dict[str, Any]
FilterParams = dict[str, Any]


class DatabaseOperationError(Exception):
    """
    Custom exception for database operation errors

    This exception is raised when database operations fail due to:
    - Connection issues
    - Constraint violations
    - Data validation errors
    - Transaction rollback scenarios
    """

    def __init__(
        self,
        message: str,
        operation: str | None = None,
        error_code: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.operation = operation
        self.error_code = error_code
        self.details = details or {}
        super().__init__(message)

        # Log error with structured context
        logger.error(
            "Database operation error",
            error_message=message,
            operation=operation,
            error_code=error_code,
            **self.details,
        )


class InventoryOperations:
    """
    Comprehensive inventory operations class for LIFO AI Core

    This class provides async database operations specifically designed for:
    - Inventory management and tracking
    - ETL data processing workflows
    - ML feature preparation and analytics
    - Batch operations for performance
    - Global product catalog management

    All operations are designed to be:
    - Thread-safe and async-friendly
    - Performance optimized with batch processing
    - Fully logged for debugging and monitoring
    - Type-safe with comprehensive error handling
    """

    def __init__(self, session: AsyncSession):
        """
        Initialize operations with database session

        Args:
            session: Active SQLAlchemy async session
        """
        if not SQLALCHEMY_AVAILABLE:
            raise ImportError(
                "SQLAlchemy is required for database operations. "
                "Please install dependencies: pip install sqlalchemy asyncpg"
            )
        self.session = session
        self.logger = logger

    async def __aenter__(self):
        """Async context manager entry"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit with automatic session cleanup"""
        if exc_type:
            await self.session.rollback()
            self.logger.error(
                "Transaction rolled back due to exception",
                exception_type=exc_type.__name__ if exc_type else None,
                exception_message=str(exc_val) if exc_val else None,
            )
        else:
            await self.session.commit()
        await self.session.close()

    # Global Product Management Operations

    async def findGlobalProductByBarcode(self, barcode: str) -> ProductDict | None:
        """
        Find global product by barcode

        Args:
            barcode: Product barcode to search for

        Returns:
            Product dictionary if found, None otherwise

        Raises:
            DatabaseOperationError: If database query fails
        """
        try:
            # Placeholder query structure - would use actual models in production
            query = text("""
                SELECT
                    product_id,
                    name,
                    brand,
                    barcode,
                    primary_category,
                    typical_shelf_life_days,
                    unit_type,
                    created_at,
                    updated_at
                FROM business.global_products
                WHERE barcode = :barcode
                AND is_active = true
            """)

            result = await self.session.execute(query, {"barcode": barcode})
            row = result.first()

            if row:
                product = {
                    "product_id": str(row.product_id),
                    "name": row.name,
                    "brand": row.brand,
                    "barcode": row.barcode,
                    "primary_category": row.primary_category,
                    "typical_shelf_life_days": row.typical_shelf_life_days,
                    "unit_type": row.unit_type,
                    "created_at": row.created_at,
                    "updated_at": row.updated_at,
                }

                self.logger.info(
                    "Global product found by barcode",
                    product_id=product["product_id"],
                    barcode=barcode,
                )
                return product

            self.logger.debug("No global product found for barcode", barcode=barcode)
            return None

        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to find global product by barcode: {str(e)}",
                operation="findGlobalProductByBarcode",
                details={"barcode": barcode},
            ) from e

    async def searchGlobalProducts(
        self, search_term: str, store_id: str, limit: int = 10
    ) -> list[ProductDict]:
        """
        Search global products by name with fuzzy matching

        Args:
            search_term: Text to search for in product names
            store_id: Store ID for context (future feature)
            limit: Maximum number of results to return

        Returns:
            List of matching product dictionaries

        Raises:
            DatabaseOperationError: If database query fails
        """
        try:
            # Use PostgreSQL full-text search and similarity functions
            query = text("""
                SELECT
                    product_id,
                    name,
                    brand,
                    barcode,
                    primary_category,
                    typical_shelf_life_days,
                    unit_type,
                    similarity(name, :search_term) as score
                FROM business.global_products
                WHERE
                    is_active = true
                    AND (
                        name ILIKE :search_pattern
                        OR similarity(name, :search_term) > 0.3
                    )
                ORDER BY score DESC, name ASC
                LIMIT :limit
            """)

            search_pattern = f"%{search_term}%"
            result = await self.session.execute(
                query,
                {
                    "search_term": search_term,
                    "search_pattern": search_pattern,
                    "limit": limit,
                },
            )

            products = []
            for row in result:
                products.append(
                    {
                        "product_id": str(row.product_id),
                        "name": row.name,
                        "brand": row.brand,
                        "barcode": row.barcode,
                        "primary_category": row.primary_category,
                        "typical_shelf_life_days": row.typical_shelf_life_days,
                        "unit_type": row.unit_type,
                        "similarity_score": float(row.score) if row.score else 0.0,
                    }
                )

            self.logger.info(
                "Global products search completed",
                search_term=search_term,
                results_count=len(products),
                store_id=store_id,
            )

            return products

        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to search global products: {str(e)}",
                operation="searchGlobalProducts",
                details={"search_term": search_term, "store_id": store_id},
            ) from e

    async def createGlobalProduct(self, product_data: ProductDict) -> ProductDict:
        """
        Create a new global product

        Args:
            product_data: Dictionary containing product information

        Returns:
            Created product dictionary with generated ID

        Raises:
            DatabaseOperationError: If product creation fails
        """
        try:
            product_id = str(uuid.uuid4())

            query = text("""
                INSERT INTO business.global_products (
                    product_id,
                    name,
                    brand,
                    barcode,
                    primary_category,
                    typical_shelf_life_days,
                    unit_type,
                    created_by,
                    created_at,
                    updated_at,
                    is_active
                ) VALUES (
                    :product_id,
                    :name,
                    :brand,
                    :barcode,
                    :primary_category,
                    :typical_shelf_life_days,
                    :unit_type,
                    :created_by,
                    :created_at,
                    :updated_at,
                    true
                )
                RETURNING product_id, name, brand, barcode, primary_category,
                          typical_shelf_life_days, unit_type, created_at, updated_at
            """)

            now = datetime.utcnow()
            params = {
                "product_id": product_id,
                "name": product_data["name"],
                "brand": product_data.get("brand", ""),
                "barcode": product_data.get("barcode"),
                "primary_category": product_data.get("primary_category", "dry_goods"),
                "typical_shelf_life_days": product_data.get(
                    "typical_shelf_life_days", 30
                ),
                "unit_type": product_data.get("unit_type", "pcs"),
                "created_by": product_data.get("created_by"),
                "created_at": now,
                "updated_at": now,
            }

            result = await self.session.execute(query, params)
            row = result.first()
            if not row:
                raise Exception("Failed to retrieve created product")

            created_product = {
                "product_id": str(row.product_id),
                "name": row.name,
                "brand": row.brand,
                "barcode": row.barcode,
                "primary_category": row.primary_category,
                "typical_shelf_life_days": row.typical_shelf_life_days,
                "unit_type": row.unit_type,
                "created_at": row.created_at,
                "updated_at": row.updated_at,
            }

            self.logger.info(
                "Global product created",
                product_id=created_product["product_id"],
                name=product_data["name"],
                category=product_data.get("primary_category"),
            )

            return created_product

        except IntegrityError as e:
            raise DatabaseOperationError(
                "Product creation failed - duplicate or constraint violation",
                operation="createGlobalProduct",
                error_code="CONSTRAINT_VIOLATION",
                details={"product_data": product_data},
            ) from e
        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to create global product: {str(e)}",
                operation="createGlobalProduct",
                details={"product_data": product_data},
            ) from e

    # Store Product Management Operations

    async def addProductToStore(
        self,
        store_id: str,
        product_id: str,
        store_product_data: dict[str, Any],
        user_id: str,
    ) -> OperationResult:
        """
        Add a global product to a store's catalog

        Args:
            store_id: Store identifier
            product_id: Global product identifier
            store_product_data: Store-specific product information
            user_id: User performing the operation

        Returns:
            Operation result dictionary

        Raises:
            DatabaseOperationError: If operation fails
        """
        try:
            query = text("""
                INSERT INTO business.store_products (
                    store_id,
                    global_product_id,
                    default_cost_price,
                    default_selling_price,
                    store_specific_sku,
                    supplier_code,
                    added_by,
                    added_at,
                    is_active
                ) VALUES (
                    :store_id,
                    :product_id,
                    :default_cost_price,
                    :default_selling_price,
                    :store_specific_sku,
                    :supplier_code,
                    :added_by,
                    :added_at,
                    true
                )
                ON CONFLICT (store_id, global_product_id)
                DO UPDATE SET
                    default_cost_price = EXCLUDED.default_cost_price,
                    default_selling_price = EXCLUDED.default_selling_price,
                    store_specific_sku = EXCLUDED.store_specific_sku,
                    supplier_code = EXCLUDED.supplier_code,
                    updated_at = :added_at,
                    is_active = true
            """)

            params = {
                "store_id": store_id,
                "product_id": product_id,
                "default_cost_price": store_product_data.get("default_cost_price"),
                "default_selling_price": store_product_data.get(
                    "default_selling_price"
                ),
                "store_specific_sku": store_product_data.get("store_specific_sku"),
                "supplier_code": store_product_data.get("supplier_code"),
                "added_by": user_id,
                "added_at": datetime.utcnow(),
            }

            await self.session.execute(query, params)

            self.logger.info(
                "Product added to store catalog",
                store_id=store_id,
                product_id=product_id,
                user_id=user_id,
            )

            return {
                "success": True,
                "store_id": store_id,
                "product_id": product_id,
                "operation": "addProductToStore",
            }

        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to add product to store: {str(e)}",
                operation="addProductToStore",
                details={
                    "store_id": store_id,
                    "product_id": product_id,
                    "user_id": user_id,
                },
            ) from e

    # Batch Management Operations

    async def createBatchWithGlobalProduct(self, batch_data: BatchDict) -> BatchDict:
        """
        Create an inventory batch linked to a global product

        Args:
            batch_data: Dictionary containing batch information

        Returns:
            Created batch dictionary with generated ID

        Raises:
            DatabaseOperationError: If batch creation fails
        """
        try:
            batch_id = str(uuid.uuid4())

            query = text("""
                INSERT INTO business.inventory_batches (
                    batch_id,
                    global_product_id,
                    store_id,
                    batch_number,
                    expiry_date,
                    manufacture_date,
                    initial_quantity,
                    current_quantity,
                    cost_price,
                    selling_price,
                    location_code,
                    batch_source,
                    barcode_scanned,
                    created_by,
                    created_at,
                    updated_at,
                    is_active
                ) VALUES (
                    :batch_id,
                    :global_product_id,
                    :store_id,
                    :batch_number,
                    :expiry_date,
                    :manufacture_date,
                    :initial_quantity,
                    :current_quantity,
                    :cost_price,
                    :selling_price,
                    :location_code,
                    :batch_source,
                    :barcode_scanned,
                    :created_by,
                    :created_at,
                    :updated_at,
                    true
                )
                RETURNING batch_id, batch_number, expiry_date, initial_quantity,
                          current_quantity, created_at
            """)

            now = datetime.utcnow()
            params = {
                "batch_id": batch_id,
                "global_product_id": batch_data["global_product_id"],
                "store_id": batch_data["store_id"],
                "batch_number": batch_data["batch_number"],
                "expiry_date": batch_data["expiry_date"],
                "manufacture_date": batch_data.get("manufacture_date"),
                "initial_quantity": batch_data["initial_quantity"],
                "current_quantity": batch_data["current_quantity"],
                "cost_price": batch_data.get("cost_price"),
                "selling_price": batch_data.get("selling_price"),
                "location_code": batch_data.get("location_code", "MAIN"),
                "batch_source": batch_data.get("batch_source", "manual"),
                "barcode_scanned": batch_data.get("barcode_scanned"),
                "created_by": batch_data.get("created_by"),
                "created_at": now,
                "updated_at": now,
            }

            result = await self.session.execute(query, params)
            row = result.first()
            if not row:
                raise Exception("Failed to retrieve created batch")

            created_batch = {
                "batch_id": str(row.batch_id),
                "batch_number": row.batch_number,
                "expiry_date": row.expiry_date,
                "initial_quantity": float(row.initial_quantity),
                "current_quantity": float(row.current_quantity),
                "created_at": row.created_at,
            }

            self.logger.info(
                "Inventory batch created",
                batch_id=created_batch["batch_id"],
                batch_number=row.batch_number,
                store_id=batch_data["store_id"],
                product_id=batch_data["global_product_id"],
            )

            return created_batch

        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to create inventory batch: {str(e)}",
                operation="createBatchWithGlobalProduct",
                details={"batch_data": batch_data},
            ) from e

    # ETL and Analytics Operations

    async def getBatchesForETLProcessing(
        self,
        store_id: str | None = None,
        days_to_expiry: int | None = None,
        batch_size: int = 1000,
    ) -> AsyncGenerator[list[BatchDict], None]:
        """
        Get batches for ETL processing in chunks

        Args:
            store_id: Optional store filter
            days_to_expiry: Optional expiry filter (batches expiring within X days)
            batch_size: Number of records per batch

        Yields:
            Lists of batch dictionaries for processing

        Raises:
            DatabaseOperationError: If query fails
        """
        try:
            # Build dynamic query based on filters
            where_conditions = ["ib.is_active = true"]
            params: dict[str, Any] = {"batch_size": batch_size}

            if store_id:
                where_conditions.append("ib.store_id = :store_id")
                params["store_id"] = store_id

            if days_to_expiry is not None:
                where_conditions.append("ib.expiry_date <= :expiry_threshold")
                params["expiry_threshold"] = datetime.now().date() + timedelta(
                    days=days_to_expiry
                )

            where_clause = " AND ".join(where_conditions)

            count_query = text(f"""
                SELECT COUNT(*)
                FROM business.inventory_batches ib
                JOIN business.global_products gp ON ib.global_product_id = gp.product_id
                WHERE {where_clause}
            """)

            # Get total count for logging
            count_result = await self.session.execute(count_query, params)
            total_count = count_result.scalar() or 0

            self.logger.info(
                "Starting ETL batch processing",
                total_batches=total_count,
                batch_size=batch_size,
                store_id=store_id,
                days_to_expiry=days_to_expiry,
            )

            offset = 0
            processed = 0

            while offset < total_count:
                query = text(f"""
                    SELECT
                        ib.batch_id,
                        ib.batch_number,
                        ib.expiry_date,
                        ib.manufacture_date,
                        ib.initial_quantity,
                        ib.current_quantity,
                        ib.cost_price,
                        ib.selling_price,
                        ib.location_code,
                        ib.created_at,
                        ib.updated_at,
                        gp.name as product_name,
                        gp.brand,
                        gp.primary_category,
                        gp.unit_type,
                        ib.store_id,
                        EXTRACT(EPOCH FROM (ib.expiry_date - CURRENT_DATE)) / 86400 as days_to_expiry
                    FROM business.inventory_batches ib
                    JOIN business.global_products gp ON ib.global_product_id = gp.product_id
                    WHERE {where_clause}
                    ORDER BY ib.expiry_date ASC, ib.created_at ASC
                    LIMIT :batch_size OFFSET :offset
                """)

                batch_params = {**params, "offset": offset}
                result = await self.session.execute(query, batch_params)

                batch_data = []
                for row in result:
                    batch_data.append(
                        {
                            "batch_id": str(row.batch_id),
                            "batch_number": row.batch_number,
                            "expiry_date": row.expiry_date,
                            "manufacture_date": row.manufacture_date,
                            "initial_quantity": float(row.initial_quantity),
                            "current_quantity": float(row.current_quantity),
                            "cost_price": float(row.cost_price)
                            if row.cost_price
                            else None,
                            "selling_price": float(row.selling_price)
                            if row.selling_price
                            else None,
                            "location_code": row.location_code,
                            "created_at": row.created_at,
                            "updated_at": row.updated_at,
                            "product_name": row.product_name,
                            "brand": row.brand,
                            "primary_category": row.primary_category,
                            "unit_type": row.unit_type,
                            "store_id": row.store_id,
                            "days_to_expiry": int(row.days_to_expiry)
                            if row.days_to_expiry
                            else None,
                        }
                    )

                if not batch_data:
                    break

                processed += len(batch_data)
                self.logger.debug(
                    "ETL batch yielded",
                    batch_count=len(batch_data),
                    processed=processed,
                    total=total_count,
                )

                yield batch_data
                offset += batch_size

            self.logger.info(
                "ETL batch processing completed",
                total_processed=processed,
                total_available=total_count,
            )

        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to get batches for ETL processing: {str(e)}",
                operation="getBatchesForETLProcessing",
                details={
                    "store_id": store_id,
                    "days_to_expiry": days_to_expiry,
                    "batch_size": batch_size,
                },
            ) from e

    async def aggregateInventoryMetrics(
        self,
        store_id: str,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Aggregate inventory metrics for analytics

        Args:
            store_id: Store to analyze
            start_date: Optional start date filter
            end_date: Optional end date filter

        Returns:
            Dictionary containing aggregated metrics

        Raises:
            DatabaseOperationError: If aggregation fails
        """
        try:
            # Default to last 30 days if no dates provided
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=30)

            query = text("""
                SELECT
                    COUNT(DISTINCT ib.batch_id) as total_batches,
                    COUNT(DISTINCT ib.global_product_id) as unique_products,
                    SUM(ib.current_quantity) as total_quantity,
                    SUM(ib.current_quantity * COALESCE(ib.cost_price, 0)) as total_cost_value,
                    SUM(ib.current_quantity * COALESCE(ib.selling_price, 0)) as total_selling_value,
                    COUNT(CASE WHEN ib.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
                               THEN 1 END) as expiring_soon_count,
                    COUNT(CASE WHEN ib.expiry_date <= CURRENT_DATE
                               THEN 1 END) as expired_count,
                    AVG(EXTRACT(EPOCH FROM (ib.expiry_date - CURRENT_DATE)) / 86400) as avg_days_to_expiry,
                    COUNT(CASE WHEN ib.current_quantity <= 5 THEN 1 END) as low_stock_count,
                    AVG(ib.current_quantity) as avg_batch_quantity
                FROM business.inventory_batches ib
                WHERE
                    ib.store_id = :store_id
                    AND ib.is_active = true
                    AND ib.created_at >= :start_date
                    AND ib.created_at <= :end_date
            """)

            result = await self.session.execute(
                query,
                {"store_id": store_id, "start_date": start_date, "end_date": end_date},
            )

            row = result.first()

            if not row:
                # Return empty metrics if no data found
                return {
                    "store_id": store_id,
                    "analysis_period": {
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                    },
                    "inventory_summary": {
                        "total_batches": 0,
                        "unique_products": 0,
                        "total_quantity": 0.0,
                        "total_cost_value": 0.0,
                        "total_selling_value": 0.0,
                        "potential_profit": 0.0,
                    },
                    "expiry_analysis": {
                        "expiring_soon_count": 0,
                        "expired_count": 0,
                        "avg_days_to_expiry": 0.0,
                    },
                    "stock_analysis": {
                        "low_stock_count": 0,
                        "avg_batch_quantity": 0.0,
                    },
                    "generated_at": datetime.utcnow().isoformat(),
                }

            metrics: dict[str, Any] = {
                "store_id": store_id,
                "analysis_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                },
                "inventory_summary": {
                    "total_batches": int(row.total_batches or 0),
                    "unique_products": int(row.unique_products or 0),
                    "total_quantity": float(row.total_quantity or 0),
                    "total_cost_value": float(row.total_cost_value or 0),
                    "total_selling_value": float(row.total_selling_value or 0),
                    "potential_profit": float(
                        (row.total_selling_value or 0) - (row.total_cost_value or 0)
                    ),
                },
                "expiry_analysis": {
                    "expiring_soon_count": int(row.expiring_soon_count or 0),
                    "expired_count": int(row.expired_count or 0),
                    "avg_days_to_expiry": float(row.avg_days_to_expiry or 0),
                },
                "stock_analysis": {
                    "low_stock_count": int(row.low_stock_count or 0),
                    "avg_batch_quantity": float(row.avg_batch_quantity or 0),
                },
                "generated_at": datetime.utcnow().isoformat(),
            }

            self.logger.info(
                "Inventory metrics aggregated",
                store_id=store_id,
                total_batches=metrics["inventory_summary"]["total_batches"],
                total_value=metrics["inventory_summary"]["total_selling_value"],
            )

            return metrics

        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to aggregate inventory metrics: {str(e)}",
                operation="aggregateInventoryMetrics",
                details={
                    "store_id": store_id,
                    "start_date": start_date,
                    "end_date": end_date,
                },
            ) from e

    # ML Feature Preparation Operations

    async def prepareMLFeatures(
        self, store_id: str, feature_types: list[str] | None = None
    ) -> dict[str, Any]:
        """
        Prepare features for machine learning models

        Args:
            store_id: Store to prepare features for
            feature_types: List of feature types to include

        Returns:
            Dictionary containing ML-ready features

        Raises:
            DatabaseOperationError: If feature preparation fails
        """
        try:
            if feature_types is None:
                feature_types = [
                    "expiry",
                    "quantity",
                    "pricing",
                    "category",
                    "velocity",
                ]

            query = text("""
                SELECT
                    ib.batch_id,
                    gp.primary_category,
                    EXTRACT(EPOCH FROM (ib.expiry_date - CURRENT_DATE)) / 86400 as days_to_expiry,
                    ib.current_quantity,
                    ib.initial_quantity,
                    (ib.initial_quantity - ib.current_quantity) as quantity_sold,
                    CASE WHEN ib.initial_quantity > 0
                         THEN (ib.initial_quantity - ib.current_quantity) / ib.initial_quantity
                         ELSE 0 END as sell_through_rate,
                    COALESCE(ib.cost_price, 0) as cost_price,
                    COALESCE(ib.selling_price, 0) as selling_price,
                    CASE WHEN ib.cost_price > 0
                         THEN (ib.selling_price - ib.cost_price) / ib.cost_price
                         ELSE 0 END as margin_percentage,
                    gp.typical_shelf_life_days,
                    EXTRACT(EPOCH FROM (CURRENT_DATE - ib.created_at)) / 86400 as days_in_inventory,
                    gp.unit_type,
                    ib.location_code
                FROM business.inventory_batches ib
                JOIN business.global_products gp ON ib.global_product_id = gp.product_id
                WHERE
                    ib.store_id = :store_id
                    AND ib.is_active = true
                    AND ib.current_quantity > 0
                ORDER BY ib.expiry_date ASC
            """)

            result = await self.session.execute(query, {"store_id": store_id})

            features = []
            for row in result:
                feature_row = {
                    "batch_id": str(row.batch_id),
                    "primary_category": row.primary_category,
                    "days_to_expiry": float(row.days_to_expiry or 0),
                    "current_quantity": float(row.current_quantity),
                    "initial_quantity": float(row.initial_quantity),
                    "quantity_sold": float(row.quantity_sold),
                    "sell_through_rate": float(row.sell_through_rate),
                    "cost_price": float(row.cost_price),
                    "selling_price": float(row.selling_price),
                    "margin_percentage": float(row.margin_percentage),
                    "typical_shelf_life_days": int(row.typical_shelf_life_days or 0),
                    "days_in_inventory": float(row.days_in_inventory or 0),
                    "unit_type": row.unit_type,
                    "location_code": row.location_code,
                }

                # Note: Scoring logic has been moved to lifo_api/app/core/scoring.py
                # AI core should only prepare raw features for ML, not apply business scoring logic

                features.append(feature_row)

            # Category encoding for ML
            categories = list({f["primary_category"] for f in features})
            category_mapping = {cat: idx for idx, cat in enumerate(sorted(categories))}

            ml_features = {
                "features": features,
                "metadata": {
                    "store_id": store_id,
                    "feature_count": len(features),
                    "feature_types": feature_types,
                    "category_mapping": category_mapping,
                    "generated_at": datetime.utcnow().isoformat(),
                },
                "schema": {
                    "numerical_features": [
                        "days_to_expiry",
                        "current_quantity",
                        "initial_quantity",
                        "quantity_sold",
                        "sell_through_rate",
                        "cost_price",
                        "selling_price",
                        "margin_percentage",
                        "typical_shelf_life_days",
                        "days_in_inventory",
                    ],
                    "categorical_features": [
                        "primary_category",
                        "unit_type",
                        "location_code",
                    ],
                },
            }

            self.logger.info(
                "ML features prepared",
                store_id=store_id,
                feature_count=len(features),
                categories=len(categories),
            )

            return ml_features

        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to prepare ML features: {str(e)}",
                operation="prepareMLFeatures",
                details={"store_id": store_id, "feature_types": feature_types},
            ) from e

    # NOTE: Scoring methods removed - business logic moved to lifo_api/app/core/scoring.py
    # AI core should focus only on data operations, not business scoring logic

    # Batch Processing Utilities

    async def batchUpdateQuantities(
        self, updates: list[dict[str, Any]]
    ) -> OperationResult:
        """
        Batch update quantities for multiple batches (SECURE VERSION)

        Args:
            updates: List of dictionaries with batch_id and new_quantity

        Returns:
            Operation result with success count

        Raises:
            DatabaseOperationError: If batch update fails
        """
        try:
            if not updates:
                return {"success": True, "updated_count": 0}

            # Validate and sanitize all inputs first
            validated_updates = []
            for i, update in enumerate(updates):
                try:
                    # Validate batch_id is UUID format
                    batch_id = str(update.get("batch_id", "")).strip()
                    if not batch_id:
                        raise ValueError(f"Missing batch_id in update {i}")

                    # Validate UUID format (basic pattern check)
                    import re

                    if not re.match(
                        r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
                        batch_id.lower(),
                    ):
                        raise ValueError(f"Invalid batch_id format: {batch_id}")

                    # Validate quantity is numeric and non-negative
                    try:
                        quantity = float(update.get("new_quantity", 0))
                        if quantity < 0:
                            raise ValueError(f"Quantity cannot be negative: {quantity}")
                    except (ValueError, TypeError) as e:
                        raise ValueError(
                            f"Invalid quantity in update {i}: {update.get('new_quantity')} - {str(e)}"
                        ) from e

                    validated_updates.append(
                        {"batch_id": batch_id, "new_quantity": quantity}
                    )

                except ValueError as e:
                    raise DatabaseOperationError(
                        f"Invalid input in batch update: {str(e)}",
                        operation="batchUpdateQuantities",
                        error_code="INVALID_INPUT",
                    ) from e

            # Use secure parameterized query with VALUES clause
            # Build parameter placeholders for each update
            value_params = {}
            value_clauses = []

            for i, update in enumerate(validated_updates):
                batch_param = f"batch_id_{i}"
                quantity_param = f"quantity_{i}"

                value_params[batch_param] = update["batch_id"]
                value_params[quantity_param] = update["new_quantity"]
                value_clauses.append(
                    f"(:{batch_param}::uuid, :{quantity_param}::numeric)"
                )

            # Add timestamp parameter
            value_params["updated_at"] = datetime.utcnow()

            # Create secure query using VALUES clause
            values_clause = ", ".join(value_clauses)
            query = text(f"""
                UPDATE business.inventory_batches
                SET
                    current_quantity = update_data.new_quantity,
                    updated_at = :updated_at
                FROM (VALUES {values_clause}) AS update_data(batch_id, new_quantity)
                WHERE business.inventory_batches.batch_id = update_data.batch_id
                  AND business.inventory_batches.is_active = true
            """)

            result = await self.session.execute(query, value_params)

            updated_count = result.rowcount if hasattr(result, "rowcount") else 0

            self.logger.info(
                "Batch quantity update completed (SECURE)",
                requested_updates=len(updates),
                actual_updates=updated_count,
                validated_inputs=len(validated_updates),
            )

            return {
                "success": True,
                "updated_count": updated_count,
                "requested_count": len(updates),
            }

        except SQLAlchemyError as e:
            raise DatabaseOperationError(
                f"Failed to batch update quantities: {str(e)}",
                operation="batchUpdateQuantities",
                details={"update_count": len(updates)},
            ) from e

    # Health Check and Monitoring

    async def healthCheck(self) -> dict[str, Any]:
        """
        Perform database health check

        Returns:
            Health check results
        """
        try:
            start_time = datetime.utcnow()

            # Test basic connectivity
            test_query = text("SELECT 1 as test")
            await self.session.execute(test_query)

            # Test table access
            count_query = text("""
                SELECT
                    (SELECT COUNT(*) FROM business.inventory_batches WHERE is_active = true) as active_batches,
                    (SELECT COUNT(*) FROM business.global_products WHERE is_active = true) as active_products
            """)

            result = await self.session.execute(count_query)
            row = result.first()

            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds() * 1000

            if not row:
                health_status: dict[str, Any] = {
                    "status": "warning",
                    "response_time_ms": round(response_time, 2),
                    "database_stats": {
                        "active_batches": 0,
                        "active_products": 0,
                    },
                    "checked_at": end_time.isoformat(),
                    "warning": "No data returned from database",
                }
            else:
                health_status = {
                    "status": "healthy",
                    "response_time_ms": round(response_time, 2),
                    "database_stats": {
                        "active_batches": int(row.active_batches),
                        "active_products": int(row.active_products),
                    },
                    "checked_at": end_time.isoformat(),
                }

            self.logger.debug(
                "Database health check completed",
                response_time_ms=health_status["response_time_ms"],
                active_batches=health_status["database_stats"]["active_batches"],
            )

            return health_status

        except Exception as e:
            end_time = datetime.utcnow()
            response_time = (end_time - start_time).total_seconds() * 1000

            return {
                "status": "unhealthy",
                "response_time_ms": round(response_time, 2),
                "error": str(e),
                "checked_at": end_time.isoformat(),
            }


# Factory function for creating InventoryOperations instances


def create_inventory_operations(session: AsyncSession) -> InventoryOperations:
    """
    Factory function to create InventoryOperations instance

    Args:
        session: Active SQLAlchemy async session

    Returns:
        Configured InventoryOperations instance

    Example:
        ```python
        async with get_database_session() as session:
            inventory_ops = create_inventory_operations(session)

            # Use with context manager for automatic cleanup
            async with inventory_ops:
                product = await inventory_ops.findGlobalProductByBarcode("123456789")
                if product:
                    print(f"Found product: {product['name']}")
        ```
    """
    if not SQLALCHEMY_AVAILABLE:
        raise ImportError(
            "SQLAlchemy is required for database operations. "
            "Please install dependencies: pip install sqlalchemy asyncpg"
        )

    if hasattr(logger, "debug"):
        logger.debug("Creating InventoryOperations instance")
    return InventoryOperations(session)


# Async context manager for operations


class InventoryOperationsManager:
    """
    Async context manager for InventoryOperations

    Provides convenient session management for inventory operations
    """

    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.session = None
        self.operations = None

    async def __aenter__(self) -> InventoryOperations:
        """Create session and operations instance"""
        self.session = self.session_factory()
        self.operations = create_inventory_operations(self.session)
        return self.operations

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Clean up session"""
        if self.session:
            if exc_type:
                await self.session.rollback()
            else:
                await self.session.commit()
            await self.session.close()


# Utility functions for common operations


async def validateInventoryData(data: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Validate inventory data for common issues

    Args:
        data: List of inventory records to validate

    Returns:
        Validation results with errors and warnings
    """
    errors = []
    warnings = []

    required_fields = [
        "global_product_id",
        "store_id",
        "current_quantity",
        "expiry_date",
    ]

    for i, record in enumerate(data):
        record_id = f"Record {i + 1}"

        # Check required fields
        for field in required_fields:
            if field not in record or record[field] is None:
                errors.append(f"{record_id}: Missing required field '{field}'")

        # Validate quantities
        if "current_quantity" in record:
            try:
                qty = float(record["current_quantity"])
                if qty < 0:
                    errors.append(f"{record_id}: Negative quantity not allowed")
                elif qty == 0:
                    warnings.append(
                        f"{record_id}: Zero quantity - consider removing batch"
                    )
            except (ValueError, TypeError):
                errors.append(f"{record_id}: Invalid quantity value")

        # Validate expiry dates
        if "expiry_date" in record:
            try:
                if isinstance(record["expiry_date"], str):
                    expiry = datetime.fromisoformat(
                        record["expiry_date"].replace("Z", "+00:00")
                    )
                else:
                    expiry = record["expiry_date"]

                if expiry.date() < datetime.now().date():
                    warnings.append(f"{record_id}: Expired item detected")
                elif expiry.date() <= (datetime.now() + timedelta(days=7)).date():
                    warnings.append(f"{record_id}: Item expires within 7 days")

            except (ValueError, TypeError):
                errors.append(f"{record_id}: Invalid expiry date format")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "total_records": len(data),
        "validation_timestamp": datetime.utcnow().isoformat(),
    }


# Export all required symbols
__all__ = [
    "DatabaseOperationError",
    "InventoryOperations",
    "create_inventory_operations",
    "InventoryOperationsManager",
    "validateInventoryData",
]
