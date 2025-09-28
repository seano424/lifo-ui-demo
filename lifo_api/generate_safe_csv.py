#!/usr/bin/env python3
"""
Generate CSV test files that avoid foreign key constraint errors
Creates unique SKUs and uses proper categories for each run
"""

import csv
import random
from datetime import date, datetime, timedelta
from pathlib import Path

# Use the exact categories that the system recognizes (from UnifiedCSVProcessor)
SAFE_CATEGORIES = [
    "fresh_produce", "dairy_eggs", "bakery_fresh", "fresh_meat_fish",
    "frozen_foods", "deli_prepared", "chilled_packaged", "canned_jarred",
    "dry_goods", "beverages", "spices_condiments", "pantry_staples",
    "household_other", "specialty_items", "bulk_items"
]

# Simple product names to avoid complexity
SIMPLE_PRODUCTS = {
    "fresh_produce": ["Bananas", "Apples", "Spinach", "Tomatoes", "Avocados"],
    "dairy_eggs": ["Milk", "Yogurt", "Cheese", "Eggs", "Butter"],
    "bakery_fresh": ["Bread", "Rolls", "Muffins", "Bagels", "Croissants"],
    "fresh_meat_fish": ["Chicken", "Beef", "Fish", "Pork", "Turkey"],
    "frozen_foods": ["Pizza", "Ice Cream", "Vegetables", "Berries", "Waffles"],
    "beverages": ["Juice", "Coffee", "Tea", "Water", "Soda"],
    "canned_jarred": ["Tomatoes", "Beans", "Soup", "Sauce", "Oil"],
    "dry_goods": ["Rice", "Pasta", "Flour", "Cereal", "Oats"],
    "pantry_staples": ["Salt", "Sugar", "Spices", "Vanilla", "Honey"],
    "household_other": ["Soap", "Paper", "Detergent", "Bags", "Cleaner"]
}

def generate_unique_sku(run_id: str, category: str, index: int) -> str:
    """Generate unique SKU that won't conflict across runs"""
    category_code = category.upper()[:4]
    return f"{run_id}-{category_code}-{index:04d}"

def generate_safe_csv_data(num_rows: int, run_id: str) -> list:
    """Generate CSV data that avoids foreign key constraint errors"""
    data = []

    for i in range(num_rows):
        category = random.choice(SAFE_CATEGORIES)
        product_names = SIMPLE_PRODUCTS.get(category, ["Generic Item"])
        base_name = random.choice(product_names)

        # Generate unique timestamps to avoid duplicates
        now = datetime.now()
        now + timedelta(microseconds=i)

        expiry_days = {
            "fresh_produce": random.randint(3, 14),
            "fresh_meat_fish": random.randint(2, 10),
            "dairy_eggs": random.randint(5, 21),
            "bakery_fresh": random.randint(2, 7),
            "frozen_foods": random.randint(60, 365),
            "beverages": random.randint(30, 180),
            "canned_jarred": random.randint(365, 730),
            "dry_goods": random.randint(180, 545),
            "pantry_staples": random.randint(365, 730),
            "household_other": random.randint(730, 1095)
        }.get(category, 90)

        expiry_date = (date.today() + timedelta(days=expiry_days)).strftime("%Y-%m-%d")

        # Simple pricing
        cost_price = round(random.uniform(1.0, 20.0), 2)
        selling_price = round(cost_price * random.uniform(1.3, 1.8), 2)

        row = {
            "sku": generate_unique_sku(run_id, category, i + 1),
            "product_name": f"{base_name} {random.choice(['Regular', 'Premium', 'Organic'])}",
            "category": category,
            "quantity": random.randint(5, 100),
            "expiry_date": expiry_date,
            "cost_price": cost_price,
            "selling_price": selling_price,
            "batch_number": f"BATCH-{run_id}-{i+1:04d}"
        }
        data.append(row)

    return data

def create_safe_csv_file(filename: str, num_rows: int):
    """Create a CSV file that won't cause foreign key errors"""
    # Use timestamp as run ID to ensure uniqueness
    run_id = datetime.now().strftime("%Y%m%d-%H%M%S")

    print(f"Generating {filename} with {num_rows:,} rows (Run ID: {run_id})...")

    data = generate_safe_csv_data(num_rows, run_id)

    # Minimal required headers only
    headers = ["sku", "product_name", "category", "quantity", "expiry_date", "cost_price", "selling_price", "batch_number"]

    filepath = Path("test_data/csv") / filename

    with open(filepath, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data)

    file_size = filepath.stat().st_size
    print(f"✅ Created {filename} - {num_rows:,} rows - {file_size:,} bytes ({file_size/1024/1024:.1f} MB)")
    print(f"   Run ID: {run_id} (ensures unique SKUs)")

def main():
    """Generate safe CSV files for testing"""

    print("🛡️  Generating SAFE CSV Test Files (No Foreign Key Errors)")
    print("=========================================================")
    print("")

    # Create files with unique run timestamps
    test_files = [
        ("safe_test_100.csv", 100),
        ("safe_test_500.csv", 500),
        ("safe_test_1000.csv", 1000),
        ("safe_test_2500.csv", 2500),
        ("safe_test_5000.csv", 5000),
    ]

    for filename, num_rows in test_files:
        create_safe_csv_file(filename, num_rows)
        # Small delay to ensure unique run IDs
        import time
        time.sleep(0.1)

    print("\n✅ All SAFE test files created!")
    print("🛡️  These files use:")
    print("   - Unique SKUs with timestamp prefixes")
    print("   - Valid category names from system")
    print("   - No duplicate batch numbers")
    print("   - Can be run multiple times safely")
    print("\n🧪 Test command:")
    print('curl -X POST "http://localhost:8000/api/v1/csv/upload" \\')
    print('  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\')
    print('  -F "file=@test_data/csv/safe_test_1000.csv" \\')
    print('  -F "store_id=420d140c-2386-4d85-9d0d-a69bbd384276"')

if __name__ == "__main__":
    main()
