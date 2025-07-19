"""
Data generator utility for LIFO.AI Demo System
"""

import random
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any


def generate_sample_data(num_products: int = 50) -> List[Dict[str, Any]]:
    """
    Generate sample inventory data for testing
    
    Args:
        num_products: Number of products to generate
        
    Returns:
        List of product dictionaries
    """
    
    categories = [
        'fresh_produce', 'dairy', 'bakery_fresh', 'fresh_meat_fish',
        'frozen', 'beverages', 'pantry_staples', 'canned_jarred'
    ]
    
    product_templates = {
        'fresh_produce': ['Bananas', 'Apples', 'Strawberries', 'Lettuce', 'Carrots'],
        'dairy': ['Milk', 'Yogurt', 'Cheese', 'Butter', 'Cream'],
        'bakery_fresh': ['Bread', 'Croissants', 'Muffins', 'Bagels', 'Pastries'],
        'fresh_meat_fish': ['Chicken', 'Salmon', 'Beef', 'Pork', 'Shrimp'],
        'frozen': ['Ice Cream', 'Frozen Peas', 'Pizza', 'Berries', 'Vegetables'],
        'beverages': ['Orange Juice', 'Soda', 'Water', 'Coffee', 'Tea'],
        'pantry_staples': ['Rice', 'Pasta', 'Flour', 'Sugar', 'Oil'],
        'canned_jarred': ['Tomatoes', 'Beans', 'Soup', 'Sauce', 'Preserves']
    }
    
    products = []
    
    for i in range(num_products):
        category = random.choice(categories)
        product_name = random.choice(product_templates[category])
        
        # Generate realistic expiry dates based on category
        expiry_days = {
            'fresh_produce': random.randint(1, 10),
            'dairy': random.randint(3, 21),
            'bakery_fresh': random.randint(1, 5),
            'fresh_meat_fish': random.randint(1, 7),
            'frozen': random.randint(90, 365),
            'beverages': random.randint(30, 180),
            'pantry_staples': random.randint(365, 730),
            'canned_jarred': random.randint(365, 1095)
        }
        
        expiry_date = datetime.now() + timedelta(days=expiry_days[category])
        
        products.append({
            'sku': f'{category.upper()[:4]}-{i+1:03d}',
            'product_name': f'{product_name} {i+1}',
            'category': category,
            'brand': f'Brand {chr(65 + i % 26)}',
            'quantity': random.randint(1, 100),
            'expiry_date': expiry_date.strftime('%Y-%m-%d'),
            'cost_price': round(random.uniform(0.5, 50.0), 2),
            'selling_price': round(random.uniform(1.0, 100.0), 2),
            'location_code': f'SHELF-{chr(65 + i % 10)}{random.randint(1, 9)}',
            'unit_type': random.choice(['pcs', 'kg', 'bottles', 'bags', 'boxes']),
            'supplier': f'Supplier {chr(65 + i % 15)}'
        })
    
    return products


def save_sample_data_to_csv(products: List[Dict[str, Any]], filename: str) -> None:
    """
    Save sample data to CSV file
    
    Args:
        products: List of product dictionaries
        filename: Output filename
    """
    df = pd.DataFrame(products)
    df.to_csv(filename, index=False)
    print(f"Generated {len(products)} sample products and saved to {filename}")


if __name__ == "__main__":
    # Generate sample data
    sample_products = generate_sample_data(100)
    save_sample_data_to_csv(sample_products, "../data/generated_sample.csv")