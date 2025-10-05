"""
Duplicate Detection Service
Analyzes CSV data against database to detect existing products/batches
"""

from typing import Any
import structlog
from collections import Counter

from app.database.supabase_service import SupabaseService

logger = structlog.get_logger()


class DuplicateDetectionService:
    """Service for detecting duplicate products and batches before CSV upload"""

    def __init__(self):
        self.supabase = SupabaseService()

    async def analyze_csv_duplicates(
        self, csv_data: list[dict[str, Any]], store_id: str
    ) -> dict[str, Any]:
        """
        Analyze CSV data for duplicates against database

        Args:
            csv_data: Parsed CSV rows with product/batch information
            store_id: Store ID for scoped queries

        Returns:
            Comprehensive duplicate analysis report with actionable recommendations
        """
        # Extract SKUs and batch numbers from CSV
        skus = []
        batch_numbers = []

        for row in csv_data:
            if sku := row.get("sku"):
                skus.append(sku)
            if batch_num := row.get("batch_number"):
                batch_numbers.append(batch_num)

        total_rows = len(csv_data)
        unique_skus = list(set(skus))

        # Check for duplicates within the CSV itself
        sku_counts = Counter(skus)
        within_csv_duplicates = [
            {"sku": sku, "count": count, "message": f"SKU '{sku}' appears {count} times in your CSV"}
            for sku, count in sku_counts.items()
            if count > 1
        ]

        # Query database for existing products with these SKUs
        existing_products = await self._check_existing_products(unique_skus, store_id)
        existing_batches = await self._check_existing_batches(batch_numbers, store_id)

        # Create lookup maps for faster matching
        existing_product_skus = {p.get("sku"): p for p in existing_products}
        existing_batch_numbers = {b.get("batch_number"): b for b in existing_batches}

        # Track unique rows with conflicts (a row is a duplicate if EITHER the SKU OR batch exists)
        duplicate_rows = set()
        conflicts = []

        # Check each CSV row for conflicts
        for idx, csv_row in enumerate(csv_data):
            row_sku = csv_row.get("sku")
            row_batch = csv_row.get("batch_number")
            row_conflicts = []

            # Check if product (SKU) already exists
            if row_sku in existing_product_skus:
                product = existing_product_skus[row_sku]
                duplicate_rows.add(idx)
                row_conflicts.append({
                    "row_index": idx + 1,  # 1-indexed for user display
                    "sku": row_sku,
                    "batch_number": row_batch,
                    "product_name_csv": csv_row.get("product_name"),
                    "product_name_db": product.get("name"),
                    "quantity_csv": csv_row.get("quantity"),
                    "cost_price_csv": csv_row.get("cost_price"),
                    "cost_price_db": product.get("base_cost_price"),
                    "selling_price_csv": csv_row.get("selling_price"),
                    "selling_price_db": product.get("base_selling_price"),
                    "product_id": product.get("product_id"),
                    "conflict_type": "existing_product",
                    "can_update": True,
                    "suggested_action": "update_product_prices",
                    "message": f"Product with SKU '{row_sku}' already exists. Prices will be updated."
                })

            # Check if batch already exists
            if row_batch in existing_batch_numbers:
                batch = existing_batch_numbers[row_batch]
                duplicate_rows.add(idx)
                row_conflicts.append({
                    "row_index": idx + 1,
                    "sku": row_sku,
                    "batch_number": row_batch,
                    "product_name_csv": csv_row.get("product_name"),
                    "quantity_csv": csv_row.get("quantity"),
                    "quantity_db": batch.get("current_quantity"),
                    "expiry_date_csv": csv_row.get("expiry_date"),
                    "expiry_date_db": batch.get("expiry_date"),
                    "batch_id": batch.get("batch_id"),
                    "conflict_type": "existing_batch",
                    "can_update": True,
                    "suggested_action": "update_batch_quantities",
                    "message": f"Batch '{row_batch}' already exists. Quantity will be updated."
                })

            conflicts.extend(row_conflicts)

        # Count unique duplicate rows (not individual conflicts)
        total_duplicate_rows = len(duplicate_rows)
        conflict_percentage = (total_duplicate_rows / total_rows * 100) if total_rows > 0 else 0

        # Determine recommended action with user-friendly messages
        if total_duplicate_rows == 0:
            action = "proceed"
            message = "No duplicates detected. All data is new and can be safely uploaded."
        elif conflict_percentage < 20:
            action = "proceed_with_caution"
            message = (
                f"Found {total_duplicate_rows} duplicate row{'s' if total_duplicate_rows > 1 else ''} "
                f"({conflict_percentage:.1f}% of your file). "
                "These existing records will be updated with new data."
            )
        elif conflict_percentage < 80:
            action = "review_recommended"
            message = (
                f"Found {total_duplicate_rows} duplicate rows ({conflict_percentage:.1f}% of your file). "
                "We recommend reviewing the conflicts below before proceeding. "
                "Existing records will be updated."
            )
        else:
            action = "likely_duplicate_upload"
            message = (
                f"⚠️ WARNING: {conflict_percentage:.1f}% of this file already exists in your database. "
                "This appears to be a duplicate upload. "
                "Are you sure you want to update these existing records?"
            )

        # Generate update preview
        update_preview = self._generate_update_preview(conflicts[:10]) if conflicts else None

        return {
            "has_duplicates": total_duplicate_rows > 0,
            "duplicate_analysis": {
                "within_csv": within_csv_duplicates,
                "in_database": {
                    "products": len(existing_products),
                    "batches": len(existing_batches),
                    "duplicate_rows": total_duplicate_rows
                },
                "duplicate_rows": total_duplicate_rows,
                "conflict_percentage": round(conflict_percentage, 2)
            },
            "recommendations": {
                "action": action,
                "message": message,
                "can_update": total_duplicate_rows > 0,
                "can_skip_duplicates": True,
                "severity": self._determine_severity(conflict_percentage)
            },
            "details": {
                "total_rows": total_rows,
                "unique_skus": len(unique_skus),
                "existing_products": len(existing_products),
                "existing_batches": len(existing_batches),
                "conflict_details": conflicts[:10],  # First 10 for preview
                "total_conflict_details": len(conflicts)
            },
            "update_preview": update_preview
        }

    async def _check_existing_products(
        self, skus: list[str], store_id: str
    ) -> list[dict[str, Any]]:
        """
        Query database for existing products with given SKUs

        Args:
            skus: List of SKUs to check
            store_id: Store ID for scoped query

        Returns:
            List of existing product records
        """
        if not skus:
            return []

        try:
            # Query products table for matching SKUs (inventory schema)
            client = self.supabase.get_admin_client()
            response = (
                client.schema("inventory")
                .table("products")
                .select("product_id, sku, name, base_cost_price, base_selling_price, category_id, brand")
                .eq("store_id", store_id)  # Scope to store
                .in_("sku", skus)
                .execute()
            )

            logger.info(
                "Checked existing products",
                store_id=store_id,
                skus_checked=len(skus),
                products_found=len(response.data) if response.data else 0
            )

            return response.data if response.data else []

        except Exception as e:
            logger.error(
                "Error checking existing products",
                error=str(e),
                store_id=store_id,
                sku_count=len(skus)
            )
            return []

    async def _check_existing_batches(
        self, batch_numbers: list[str], store_id: str
    ) -> list[dict[str, Any]]:
        """
        Query database for existing batches with given batch numbers

        Args:
            batch_numbers: List of batch numbers to check
            store_id: Store ID for scoped query

        Returns:
            List of existing batch records
        """
        if not batch_numbers:
            return []

        try:
            # Query batches table for matching batch numbers (inventory schema)
            client = self.supabase.get_admin_client()
            response = (
                client.schema("inventory")
                .table("batches")
                .select("batch_id, batch_number, current_quantity, expiry_date, product_id")
                .eq("store_id", store_id)  # Scope to store
                .in_("batch_number", batch_numbers)
                .execute()
            )

            logger.info(
                "Checked existing batches",
                store_id=store_id,
                batch_numbers_checked=len(batch_numbers),
                batches_found=len(response.data) if response.data else 0
            )

            return response.data if response.data else []

        except Exception as e:
            logger.error(
                "Error checking existing batches",
                error=str(e),
                store_id=store_id,
                batch_count=len(batch_numbers)
            )
            return []

    def _generate_update_preview(self, conflicts: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Generate a preview of what will be updated

        Args:
            conflicts: List of conflict details

        Returns:
            Structured update preview for UI display
        """
        product_updates = []
        batch_updates = []

        for conflict in conflicts:
            if conflict["conflict_type"] == "existing_product":
                product_updates.append({
                    "sku": conflict["sku"],
                    "product_name": conflict["product_name_csv"],
                    "changes": {
                        "cost_price": {
                            "old": conflict.get("cost_price_db"),
                            "new": conflict.get("cost_price_csv")
                        },
                        "selling_price": {
                            "old": conflict.get("selling_price_db"),
                            "new": conflict.get("selling_price_csv")
                        }
                    }
                })
            elif conflict["conflict_type"] == "existing_batch":
                batch_updates.append({
                    "batch_number": conflict["batch_number"],
                    "sku": conflict["sku"],
                    "changes": {
                        "quantity": {
                            "old": conflict.get("quantity_db"),
                            "new": conflict.get("quantity_csv")
                        },
                        "expiry_date": {
                            "old": conflict.get("expiry_date_db"),
                            "new": conflict.get("expiry_date_csv")
                        }
                    }
                })

        return {
            "products": product_updates,
            "batches": batch_updates,
            "total_updates": len(product_updates) + len(batch_updates)
        }

    def _determine_severity(self, conflict_percentage: float) -> str:
        """Determine severity level based on conflict percentage"""
        if conflict_percentage == 0:
            return "none"
        elif conflict_percentage < 20:
            return "low"
        elif conflict_percentage < 80:
            return "medium"
        else:
            return "high"
