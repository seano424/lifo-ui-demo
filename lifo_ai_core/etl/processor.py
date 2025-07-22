import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

# InventoryOperations imported from lifo_api when needed


class CSVProcessor:
    def __init__(self, inventory_ops: Optional[Any] = None):
        self.logger = logging.getLogger(__name__)
        self.inventory_ops = inventory_ops
        self.required_columns = [
            "SKU",
            "Product_Name",
            "Quantity",
            "Expiry_Date",
            "Cost_Price",
            "Selling_Price",
        ]
        self.optional_columns = [
            "Category",
            "Brand",
            "Batch_Number",
            "Location",
            "Manufacture_Date",
            "Unit_Type",
            "Supplier",
            "Barcode",
            "Supplier_Code",
        ]
        self.category_mapping = {
            "produce": "fresh_produce",
            "fruit": "fresh_produce",
            "vegetable": "fresh_produce",
            "vegetables": "fresh_produce",
            "meat": "fresh_meat_fish",
            "fish": "fresh_meat_fish",
            "seafood": "fresh_meat_fish",
            "poultry": "fresh_meat_fish",
            "bread": "bakery_fresh",
            "bakery": "bakery_fresh",
            "pastry": "bakery_fresh",
            "cake": "bakery_fresh",
            "milk": "dairy",
            "cheese": "dairy",
            "yogurt": "dairy",
            "yoghurt": "dairy",
            "eggs": "dairy",
            "butter": "dairy",
            "prepared": "deli_prepared",
            "deli": "deli_prepared",
            "salad": "deli_prepared",
            "ready_meal": "deli_prepared",
            "frozen": "frozen",
            "ice_cream": "frozen",
            "chilled": "chilled_packaged",
            "packaged": "chilled_packaged",
            "pantry": "pantry_staples",
            "rice": "pantry_staples",
            "pasta": "pantry_staples",
            "flour": "pantry_staples",
            "oil": "pantry_staples",
            "canned": "canned_jarred",
            "jarred": "canned_jarred",
            "preserves": "canned_jarred",
            "sauce": "canned_jarred",
            "dry": "dry_goods",
            "cereal": "dry_goods",
            "snacks": "dry_goods",
            "nuts": "dry_goods",
            "drink": "beverages",
            "juice": "beverages",
            "soda": "beverages",
            "alcohol": "beverages",
            "wine": "beverages",
            "beer": "beverages",
            "spice": "spices_condiments",
            "spices": "spices_condiments",
            "seasoning": "spices_condiments",
            "condiment": "spices_condiments",
            "condiments": "spices_condiments",
        }

    def validate_csv_structure(self, csv_content: str) -> Dict:
        """Validate CSV has required columns and basic data quality"""
        try:
            # Try different encodings
            encodings = ["utf-8", "latin-1", "cp1252"]
            df = None

            for encoding in encodings:
                try:
                    df = pd.read_csv(io.StringIO(csv_content), encoding=encoding)
                    break
                except UnicodeDecodeError:
                    continue

            if df is None:
                return {
                    "valid": False,
                    "errors": [
                        "Could not decode CSV file. Please ensure it uses UTF-8 encoding."
                    ],
                    "row_count": 0,
                    "columns": [],
                }

            errors = []
            warnings = []

            # Check if file is empty
            if len(df) == 0:
                errors.append("CSV file is empty")
                return {
                    "valid": False,
                    "errors": errors,
                    "row_count": 0,
                    "columns": list(df.columns),
                }

            # Normalize column names (remove spaces, convert to standard format)
            df.columns = df.columns.str.strip().str.replace(" ", "_")

            # Check required columns
            missing_columns = []
            for col in self.required_columns:
                if col not in df.columns:
                    # Try to find similar column names
                    similar_cols = [
                        c
                        for c in df.columns
                        if col.lower() in c.lower() or c.lower() in col.lower()
                    ]
                    if similar_cols:
                        warnings.append(
                            f"Column '{col}' not found, but found similar: {similar_cols}. Please rename to '{col}'"
                        )
                    else:
                        missing_columns.append(col)

            if missing_columns:
                errors.append(f"Missing required columns: {missing_columns}")

            # Check data types and ranges
            if "Quantity" in df.columns:
                # Convert to numeric, marking errors
                df["Quantity"] = pd.to_numeric(df["Quantity"], errors="coerce")

                invalid_quantities = df["Quantity"].isna().sum()
                if invalid_quantities > 0:
                    errors.append(
                        f"{invalid_quantities} rows have invalid quantity values"
                    )

                negative_quantities = (df["Quantity"] < 0).sum()
                if negative_quantities > 0:
                    errors.append(
                        f"{negative_quantities} rows have negative quantities"
                    )

            # Check date format
            if "Expiry_Date" in df.columns:
                try:
                    # Try parsing dates
                    parsed_dates = pd.to_datetime(df["Expiry_Date"], errors="coerce")
                    invalid_dates = parsed_dates.isna().sum()

                    if invalid_dates > 0:
                        errors.append(
                            f"{invalid_dates} rows have invalid expiry dates. Use format YYYY-MM-DD"
                        )

                    # Check for past dates
                    past_dates = (parsed_dates < pd.Timestamp.now()).sum()
                    if past_dates > 0:
                        warnings.append(
                            f"{past_dates} items have expiry dates in the past"
                        )

                    # Check for unreasonably far future dates
                    far_future = (
                        parsed_dates > pd.Timestamp.now() + pd.Timedelta(days=3650)
                    ).sum()
                    if far_future > 0:
                        warnings.append(
                            f"{far_future} items expire more than 10 years from now"
                        )

                except Exception as e:
                    errors.append(f"Error parsing expiry dates: {e!s}")

            # Check price columns
            price_columns = ["Cost_Price", "Selling_Price"]
            for col in price_columns:
                if col in df.columns:
                    # Convert to numeric
                    df[col] = pd.to_numeric(df[col], errors="coerce")

                    invalid_prices = df[col].isna().sum()
                    if invalid_prices > 0:
                        errors.append(
                            f"{invalid_prices} rows have invalid {col} values"
                        )

                    zero_negative_prices = (df[col] <= 0).sum()
                    if zero_negative_prices > 0:
                        errors.append(
                            f"{zero_negative_prices} rows have zero or negative {col}"
                        )

            # Check selling price vs cost price
            if "Cost_Price" in df.columns and "Selling_Price" in df.columns:
                df_clean = df.dropna(subset=["Cost_Price", "Selling_Price"])
                if len(df_clean) > 0:
                    negative_margin = (
                        df_clean["Selling_Price"] < df_clean["Cost_Price"]
                    ).sum()
                    if negative_margin > 0:
                        warnings.append(
                            f"{negative_margin} rows have selling price lower than cost price"
                        )

            # Check for duplicate SKUs
            if "SKU" in df.columns:
                duplicate_skus = df["SKU"].duplicated().sum()
                if duplicate_skus > 0:
                    warnings.append(f"{duplicate_skus} duplicate SKUs found")

            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "warnings": warnings,
                "row_count": len(df),
                "columns": list(df.columns),
                "preview": df.head(3).to_dict("records") if len(df) > 0 else [],
            }

        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Failed to parse CSV: {e!s}"],
                "warnings": [],
                "row_count": 0,
                "columns": [],
            }

    def normalize_category(self, category: str) -> str:
        """Normalize category names to standard values"""
        if not category or pd.isna(category):
            return "dry_goods"

        # Clean and normalize
        clean_category = (
            str(category).lower().strip().replace(" ", "_").replace("-", "_")
        )

        # Direct match
        if clean_category in self.category_mapping:
            return self.category_mapping[clean_category]

        # Partial match
        for key, value in self.category_mapping.items():
            if key in clean_category or clean_category in key:
                return value

        # Return original if no mapping found
        return clean_category if clean_category else "dry_goods"

    def clean_and_normalize_data(
        self, csv_content: str
    ) -> Tuple[List[Dict], List[str]]:
        """Clean and normalize CSV data"""
        try:
            df = pd.read_csv(io.StringIO(csv_content))
        except Exception as e:
            return [], [f"Failed to read CSV: {e!s}"]

        errors = []
        original_count = len(df)

        # Normalize column names
        df.columns = df.columns.str.strip().str.replace(" ", "_")

        # Clean text columns
        if "SKU" in df.columns:
            df["SKU"] = df["SKU"].astype(str).str.strip().str.upper()
            # Remove rows with empty SKUs
            df = df[df["SKU"].notna() & (df["SKU"] != "") & (df["SKU"] != "NAN")]

        if "Product_Name" in df.columns:
            df["Product_Name"] = df["Product_Name"].astype(str).str.strip()
            # Remove rows with empty product names
            df = df[
                df["Product_Name"].notna()
                & (df["Product_Name"] != "")
                & (df["Product_Name"] != "nan")
            ]

        # Set defaults for optional columns
        if "Category" not in df.columns:
            df["Category"] = "dry_goods"
        else:
            df["Category"] = df["Category"].fillna("dry_goods")
        df["Category"] = df["Category"].apply(self.normalize_category)

        if "Brand" not in df.columns:
            df["Brand"] = ""
        else:
            df["Brand"] = df["Brand"].fillna("").astype(str)

        if "Location" not in df.columns:
            df["Location"] = "MAIN"
        else:
            df["Location"] = df["Location"].fillna("MAIN").astype(str)

        if "Unit_Type" not in df.columns:
            df["Unit_Type"] = "pcs"
        else:
            df["Unit_Type"] = df["Unit_Type"].fillna("pcs").astype(str)

        if "Supplier" not in df.columns:
            df["Supplier"] = ""
        else:
            df["Supplier"] = df["Supplier"].fillna("").astype(str)

        # Convert and validate dates
        try:
            df["Expiry_Date"] = pd.to_datetime(df["Expiry_Date"], errors="coerce")
            # Remove rows with invalid expiry dates
            invalid_expiry = df["Expiry_Date"].isna()
            if invalid_expiry.any():
                errors.append(
                    f"Removed {invalid_expiry.sum()} rows with invalid expiry dates"
                )
            df = df[~invalid_expiry]

            df["Expiry_Date"] = df["Expiry_Date"].dt.strftime("%Y-%m-%d")
        except Exception as e:
            errors.append(f"Error processing expiry dates: {e!s}")
            return [], errors

        # Set manufacture date if not provided
        if "Manufacture_Date" not in df.columns or df["Manufacture_Date"].isna().all():
            # Estimate manufacture date based on typical shelf life
            shelf_life_map = {
                "fresh_produce": 7,
                "fresh_meat_fish": 5,
                "bakery_fresh": 3,
                "dairy": 14,
                "deli_prepared": 5,
                "frozen": 180,
                "chilled_packaged": 21,
                "pantry_staples": 365,
                "canned_jarred": 730,
                "dry_goods": 180,
                "beverages": 365,
                "spices_condiments": 730,
            }

            def estimate_manufacture_date(row):
                shelf_life = shelf_life_map.get(row["Category"], 30)
                expiry = pd.to_datetime(row["Expiry_Date"])
                return (expiry - pd.Timedelta(days=shelf_life)).strftime("%Y-%m-%d")

            df["Manufacture_Date"] = df.apply(estimate_manufacture_date, axis=1)
        else:
            try:
                df["Manufacture_Date"] = pd.to_datetime(
                    df["Manufacture_Date"], errors="coerce"
                )
                invalid_manufacture = df["Manufacture_Date"].isna()
                if invalid_manufacture.any():
                    # Use today's date for invalid manufacture dates
                    df.loc[invalid_manufacture, "Manufacture_Date"] = pd.Timestamp.now()

                df["Manufacture_Date"] = df["Manufacture_Date"].dt.strftime("%Y-%m-%d")
            except Exception:
                df["Manufacture_Date"] = pd.Timestamp.now().strftime("%Y-%m-%d")

        # Generate batch numbers if not provided
        if "Batch_Number" not in df.columns or df["Batch_Number"].isna().all():
            df["Batch_Number"] = (
                df["SKU"]
                + "-"
                + df["Expiry_Date"].str.replace("-", "")
                + "-"
                + pd.Series(range(len(df))).astype(str).str.zfill(3)
            )
        else:
            df["Batch_Number"] = df["Batch_Number"].astype(str).str.strip()
            # Fill empty batch numbers
            empty_batch = (
                df["Batch_Number"].isna()
                | (df["Batch_Number"] == "")
                | (df["Batch_Number"] == "nan")
            )
            df.loc[empty_batch, "Batch_Number"] = (
                df.loc[empty_batch, "SKU"]
                + "-"
                + df.loc[empty_batch, "Expiry_Date"].str.replace("-", "")
                + "-AUTO"
            )

        # Calculate days to expiry
        df["Days_To_Expiry"] = (
            pd.to_datetime(df["Expiry_Date"]) - pd.Timestamp.now()
        ).dt.days

        # Convert numeric columns
        numeric_columns = ["Quantity", "Cost_Price", "Selling_Price"]
        for col in numeric_columns:
            if col in df.columns:
                # Clean currency symbols and commas
                if df[col].dtype == "object":
                    df[col] = df[col].astype(str).str.replace("[$€£,]", "", regex=True)

                df[col] = pd.to_numeric(df[col], errors="coerce")

                # Remove rows with invalid numeric values
                invalid_numeric = df[col].isna()
                if invalid_numeric.any():
                    errors.append(
                        f"Removed {invalid_numeric.sum()} rows with invalid {col}"
                    )
                df = df[~invalid_numeric]

        # Remove invalid rows
        if "Quantity" in df.columns:
            invalid_qty = df["Quantity"] <= 0
            if invalid_qty.any():
                errors.append(
                    f"Removed {invalid_qty.sum()} rows with zero or negative quantity"
                )
            df = df[~invalid_qty]

        if "Cost_Price" in df.columns:
            invalid_cost = df["Cost_Price"] <= 0
            if invalid_cost.any():
                errors.append(
                    f"Removed {invalid_cost.sum()} rows with zero or negative cost price"
                )
            df = df[~invalid_cost]

        if "Selling_Price" in df.columns:
            invalid_selling = df["Selling_Price"] <= 0
            if invalid_selling.any():
                errors.append(
                    f"Removed {invalid_selling.sum()} rows with zero or negative selling price"
                )
            df = df[~invalid_selling]

        # Filter out items expired more than 30 days ago (probably data entry errors)
        very_expired = df["Days_To_Expiry"] < -30
        if very_expired.any():
            errors.append(
                f"Removed {very_expired.sum()} items expired more than 30 days ago"
            )
        df = df[~very_expired]

        # Validate business logic - selling price should be >= cost price
        if "Cost_Price" in df.columns and "Selling_Price" in df.columns:
            negative_margin = df["Selling_Price"] < df["Cost_Price"]
            if negative_margin.any():
                errors.append(
                    f"Warning: {negative_margin.sum()} items have selling price lower than cost price"
                )

        final_count = len(df)
        if final_count != original_count:
            errors.append(
                f"Processed {final_count} out of {original_count} rows ({original_count - final_count} removed)"
            )

        return df.to_dict("records"), errors

    async def process_with_global_products(
        self, data: List[Dict], store_id: str, user_id: str
    ) -> Tuple[List[Dict], List[str]]:
        """Process CSV data using global products workflow"""
        if not self.inventory_ops:
            return data, [
                "Global products workflow not available - inventory operations not provided"
            ]

        enhanced_data = []
        errors = []

        for item in data:
            try:
                # Find or create global product
                global_product = None

                # Try to find by barcode first
                if item.get("Barcode"):
                    global_product = (
                        await self.inventory_ops.findGlobalProductByBarcode(
                            item["Barcode"]
                        )
                    )

                # If not found by barcode, search by name
                if not global_product and item.get("Product_Name"):
                    search_results = await self.inventory_ops.searchGlobalProducts(
                        item["Product_Name"], store_id, 1
                    )
                    if search_results:
                        global_product = search_results[0]

                # Create new global product if not found
                if not global_product:
                    global_product = await self.inventory_ops.createGlobalProduct(
                        {
                            "name": item["Product_Name"],
                            "brand": item.get("Brand", "Unknown"),
                            "barcode": item.get("Barcode"),
                            "primary_category": item.get("Category", "dry_goods"),
                            "typical_shelf_life_days": self.calculate_shelf_life_days(
                                item.get("Category", "dry_goods")
                            ),
                            "unit_type": item.get("Unit_Type", "pcs"),
                            "created_by": user_id,
                        }
                    )

                # Add product to store catalog if not already there
                try:
                    await self.inventory_ops.addProductToStore(
                        store_id,
                        global_product["product_id"],
                        {
                            "default_cost_price": float(item.get("Cost_Price", 0)),
                            "default_selling_price": float(
                                item.get("Selling_Price", 0)
                            ),
                            "store_specific_sku": item["SKU"],
                            "supplier_code": item.get("Supplier_Code"),
                        },
                        user_id,
                    )
                except Exception as e:
                    # Product might already be in store catalog
                    if "duplicate" not in str(e).lower():
                        errors.append(
                            f"Warning: Could not add product {item['SKU']} to store: {e}"
                        )

                # Create batch with global product reference
                await self.inventory_ops.createBatchWithGlobalProduct(
                    {
                        "global_product_id": global_product["product_id"],
                        "store_id": store_id,
                        "batch_number": item.get(
                            "Batch_Number",
                            f"{item['SKU']}-{datetime.now().strftime('%Y%m%d')}",
                        ),
                        "expiry_date": item["Expiry_Date"],
                        "manufacture_date": item.get("Manufacture_Date"),
                        "initial_quantity": float(item["Quantity"]),
                        "current_quantity": float(item["Quantity"]),
                        "cost_price": float(item.get("Cost_Price", 0))
                        if item.get("Cost_Price")
                        else None,
                        "selling_price": float(item.get("Selling_Price", 0))
                        if item.get("Selling_Price")
                        else None,
                        "location_code": item.get("Location", "MAIN"),
                        "batch_source": "csv_import",
                        "barcode_scanned": item.get("Barcode"),
                        "created_by": user_id,
                    }
                )

                # Add global product info to item for response
                item["global_product_id"] = global_product["product_id"]
                item["verification_status"] = "verified"
                enhanced_data.append(item)

            except Exception as e:
                error_msg = f"Failed to process {item.get('SKU', 'unknown SKU')}: {e!s}"
                errors.append(error_msg)
                enhanced_data.append(item)  # Keep original item

        return enhanced_data, errors

    def calculate_shelf_life_days(self, category: str) -> int:
        """Calculate typical shelf life for a category"""
        shelf_life_map = {
            "fresh_produce": 7,
            "fresh_meat_fish": 3,
            "bakery_fresh": 2,
            "dairy": 14,
            "deli_prepared": 3,
            "frozen": 365,
            "chilled_packaged": 21,
            "pantry_staples": 730,
            "canned_jarred": 1095,
            "dry_goods": 365,
            "beverages": 180,
            "spices_condiments": 1095,
        }
        return shelf_life_map.get(category.lower(), 30)

    def generate_sample_csv(self, num_rows: int = 10) -> str:
        """Generate a sample CSV for user reference"""

        sample_categories = [
            "fresh_produce",
            "dairy",
            "bakery_fresh",
            "meat_fish",
            "dry_goods",
        ]
        sample_data = []

        for i in range(num_rows):
            category = sample_categories[i % len(sample_categories)]

            base_data = {
                "fresh_produce": {
                    "name": [
                        "Organic Bananas",
                        "Fresh Apples",
                        "Cherry Tomatoes",
                        "Lettuce",
                        "Carrots",
                    ][i % 5],
                    "brand": "Fresh Farm",
                    "cost": 0.80 + (i * 0.1),
                    "selling": 1.80 + (i * 0.15),
                    "days_offset": 3 + (i % 5),
                    "unit": "kg",
                },
                "dairy": {
                    "name": [
                        "Organic Milk 1L",
                        "Greek Yogurt",
                        "Cheddar Cheese",
                        "Fresh Eggs",
                        "Butter",
                    ][i % 5],
                    "brand": "Dairy Best",
                    "cost": 1.20 + (i * 0.2),
                    "selling": 2.50 + (i * 0.3),
                    "days_offset": 7 + (i % 7),
                    "unit": "pcs",
                },
                "bakery_fresh": {
                    "name": [
                        "Sourdough Bread",
                        "Croissants",
                        "Muffins",
                        "Bagels",
                        "Danish",
                    ][i % 5],
                    "brand": "Artisan Bakery",
                    "cost": 1.50 + (i * 0.25),
                    "selling": 3.00 + (i * 0.4),
                    "days_offset": 2 + (i % 3),
                    "unit": "pcs",
                },
            }

            if category not in base_data:
                category = "dry_goods"
                data = {
                    "name": f"Product {i + 1}",
                    "brand": "Generic Brand",
                    "cost": 2.00 + (i * 0.3),
                    "selling": 4.00 + (i * 0.5),
                    "days_offset": 30 + (i % 60),
                    "unit": "pcs",
                }
            else:
                data = base_data[category]

            sample_data.append(
                {
                    "SKU": f"{category.upper()[:4]}-{str(i + 1).zfill(3)}",
                    "Product_Name": data["name"],
                    "Category": category,
                    "Brand": data["brand"],
                    "Quantity": 5 + (i % 20),
                    "Expiry_Date": (
                        datetime.now() + timedelta(days=data["days_offset"])
                    ).strftime("%Y-%m-%d"),
                    "Manufacture_Date": (datetime.now() - timedelta(days=2)).strftime(
                        "%Y-%m-%d"
                    ),
                    "Cost_Price": round(data["cost"], 2),
                    "Selling_Price": round(data["selling"], 2),
                    "Location": f"SHELF-{chr(65 + (i % 5))}{i % 3 + 1}",
                    "Unit_Type": data["unit"],
                    "Supplier": f"Supplier {chr(65 + (i % 3))}",
                }
            )

        # Convert to CSV string
        output = io.StringIO()
        if sample_data:
            writer = csv.DictWriter(output, fieldnames=sample_data[0].keys())
            writer.writeheader()
            writer.writerows(sample_data)

        return output.getvalue()

    def validate_business_rules(self, data: List[Dict]) -> List[str]:
        """Validate business rules and return warnings/suggestions"""
        warnings = []

        if not data:
            return warnings

        # Check for high-risk categories with short expiry
        high_risk_short_expiry = [
            item
            for item in data
            if item.get("Category")
            in ["fresh_produce", "fresh_meat_fish", "bakery_fresh"]
            and item.get("Days_To_Expiry", 0) <= 1
        ]

        if high_risk_short_expiry:
            warnings.append(
                f"{len(high_risk_short_expiry)} high-risk items expire within 1 day - consider immediate action"
            )

        # Check for low margins
        low_margin_items = []
        for item in data:
            try:
                cost = float(item.get("Cost_Price", 0))
                selling = float(item.get("Selling_Price", 0))
                if cost > 0 and selling > 0:
                    margin = ((selling - cost) / selling) * 100
                    if margin < 10:
                        low_margin_items.append(item)
            except (ValueError, TypeError):
                continue

        if low_margin_items:
            warnings.append(
                f"{len(low_margin_items)} items have margins below 10% - limited discount flexibility"
            )

        # Check for duplicate SKUs with different expiry dates
        sku_groups = {}
        for item in data:
            sku = item.get("SKU")
            if sku:
                if sku not in sku_groups:
                    sku_groups[sku] = []
                sku_groups[sku].append(item.get("Expiry_Date"))

        multi_batch_skus = {
            sku: dates for sku, dates in sku_groups.items() if len(set(dates)) > 1
        }
        if multi_batch_skus:
            warnings.append(
                f"{len(multi_batch_skus)} SKUs have multiple batches with different expiry dates"
            )

        return warnings


# Utility function for command-line usage
def process_csv_file(file_path: str, validate_only: bool = False) -> Dict:
    """Process a CSV file from command line"""
    processor = CSVProcessor()

    try:
        with open(file_path, encoding="utf-8") as file:
            content = file.read()

        # Validate structure
        validation = processor.validate_csv_structure(content)

        if not validation["valid"]:
            return {
                "success": False,
                "validation": validation,
                "data": [],
                "errors": validation["errors"],
            }

        if validate_only:
            return {"success": True, "validation": validation, "data": [], "errors": []}

        # Clean and normalize
        data, errors = processor.clean_and_normalize_data(content)

        # Business rule validation
        warnings = processor.validate_business_rules(data)

        return {
            "success": True,
            "validation": validation,
            "data": data,
            "errors": errors,
            "warnings": warnings,
            "processed_count": len(data),
        }

    except FileNotFoundError:
        return {
            "success": False,
            "validation": {"valid": False, "errors": ["File not found"]},
            "data": [],
            "errors": ["File not found"],
        }
    except Exception as e:
        return {
            "success": False,
            "validation": {"valid": False, "errors": [str(e)]},
            "data": [],
            "errors": [str(e)],
        }


# Main execution for standalone processing
if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) < 2:
        print("Usage: python processor.py <csv_file_path> [--validate-only] [--json]")
        sys.exit(1)

    file_path = sys.argv[1]
    validate_only = "--validate-only" in sys.argv
    json_output = "--json" in sys.argv

    result = process_csv_file(file_path, validate_only)

    if json_output:
        # Output as JSON for programmatic consumption
        print(json.dumps(result, indent=2))
    else:
        # Human-readable output
        if result["success"]:
            print("✅ Processing successful")
            print(
                f"📊 Validation: {result['validation']['row_count']} rows, {len(result['validation']['columns'])} columns"
            )

            if not validate_only:
                print(f"🔄 Processed: {result['processed_count']} items")

                if result["errors"]:
                    print(f"⚠️ Processing notes: {len(result['errors'])}")
                    for error in result["errors"]:
                        print(f"   {error}")

                if result.get("warnings"):
                    print(f"💡 Business rule warnings: {len(result['warnings'])}")
                    for warning in result["warnings"]:
                        print(f"   {warning}")

            if result["validation"].get("warnings"):
                print(f"⚠️ Validation warnings: {len(result['validation']['warnings'])}")
                for warning in result["validation"]["warnings"]:
                    print(f"   {warning}")

        else:
            print("❌ Processing failed")
            for error in result["errors"]:
                print(f"   {error}")
            sys.exit(1)
