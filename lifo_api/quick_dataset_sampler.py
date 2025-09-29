#!/usr/bin/env python3
"""
Quick dataset sampler to get real food packaging images for OCR testing.
This is a simplified version that works immediately without complex dependencies.
"""

import asyncio
import aiohttp
import aiofiles
import json
import sys
import os
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class QuickDatasetSampler:
    """Simple dataset sampler for Open Food Facts."""

    def __init__(self, output_dir: str = "sample_dataset"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        self.images_dir = self.output_dir / "images"
        self.images_dir.mkdir(exist_ok=True)

        # Focus on EU countries with good food labeling data
        self.countries = ["france", "germany", "italy", "spain", "netherlands"]
        self.base_url = "https://world.openfoodfacts.org"

    async def download_sample_products(self, max_products: int = 50) -> List[Dict]:
        """Download sample products with good image data."""
        print(f"🔍 Searching for {max_products} EU food products with clear labeling...")

        products = []

        async with aiohttp.ClientSession() as session:
            for country in self.countries:
                if len(products) >= max_products:
                    break

                print(f"  Searching {country}...")
                country_products = await self._get_products_from_country(session, country, max_products // len(self.countries))
                products.extend(country_products)

        print(f"📦 Found {len(products)} products with images")
        return products[:max_products]

    async def _get_products_from_country(self, session: aiohttp.ClientSession, country: str, limit: int) -> List[Dict]:
        """Get products from a specific country."""
        try:
            # Search for products with images and specific criteria
            search_params = {
                "search_terms": "",
                "country": country,
                "json": "1",
                "page_size": limit,
                "fields": "code,product_name,image_url,image_front_url,brands,categories,ingredients_text,expiration_date,packaging"
            }

            url = f"{self.base_url}/cgi/search.pl"
            async with session.get(url, params=search_params) as response:
                if response.status == 200:
                    data = await response.json()
                    products = data.get("products", [])

                    # Filter for products with good image URLs
                    valid_products = []
                    for product in products:
                        if self._is_valid_product(product):
                            valid_products.append(product)

                    return valid_products
                else:
                    print(f"    ⚠️  Error fetching {country}: {response.status}")
                    return []

        except Exception as e:
            print(f"    ❌ Error with {country}: {e}")
            return []

    def _is_valid_product(self, product: Dict) -> bool:
        """Check if product has usable data for OCR testing."""
        # Must have a front image
        if not product.get("image_front_url") and not product.get("image_url"):
            return False

        # Must have some text content
        if not any([
            product.get("product_name"),
            product.get("brands"),
            product.get("ingredients_text")
        ]):
            return False

        return True

    async def download_images(self, products: List[Dict]) -> List[Dict]:
        """Download product images and create metadata."""
        print(f"📥 Downloading {len(products)} product images...")

        downloaded_products = []

        async with aiohttp.ClientSession() as session:
            for i, product in enumerate(products, 1):
                print(f"  📸 Downloading {i}/{len(products)}: {product.get('product_name', 'Unknown')[:50]}...")

                image_url = product.get("image_front_url") or product.get("image_url")
                if not image_url:
                    continue

                # Download image
                image_path = await self._download_image(session, image_url, product.get("code", f"product_{i}"))

                if image_path:
                    # Create enhanced metadata for OCR testing
                    enhanced_product = self._create_enhanced_metadata(product, image_path)
                    downloaded_products.append(enhanced_product)

        print(f"✅ Successfully downloaded {len(downloaded_products)} images")
        return downloaded_products

    async def _download_image(self, session: aiohttp.ClientSession, image_url: str, product_code: str) -> Optional[Path]:
        """Download a single image."""
        try:
            async with session.get(image_url) as response:
                if response.status == 200:
                    # Determine file extension
                    content_type = response.headers.get('content-type', '')
                    if 'jpeg' in content_type or 'jpg' in content_type:
                        ext = '.jpg'
                    elif 'png' in content_type:
                        ext = '.png'
                    else:
                        ext = '.jpg'  # Default

                    image_path = self.images_dir / f"{product_code}{ext}"

                    async with aiofiles.open(image_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            await f.write(chunk)

                    return image_path
                else:
                    return None

        except Exception as e:
            print(f"    ❌ Error downloading image: {e}")
            return None

    def _create_enhanced_metadata(self, product: Dict, image_path: Path) -> Dict:
        """Create enhanced metadata for OCR testing."""
        return {
            # Basic product info
            "product_code": product.get("code"),
            "product_name": product.get("product_name"),
            "brands": product.get("brands"),
            "categories": product.get("categories"),

            # Image info
            "image_path": str(image_path),
            "image_filename": image_path.name,

            # OCR test targets
            "expected_text_elements": {
                "product_name": product.get("product_name"),
                "brands": product.get("brands"),
                "ingredients": product.get("ingredients_text"),
                "packaging": product.get("packaging")
            },

            # Potential dates to extract
            "potential_dates": self._extract_potential_dates(product),

            # Test metadata
            "download_timestamp": datetime.now().isoformat(),
            "test_priority": self._calculate_test_priority(product),
            "ocr_difficulty": self._estimate_ocr_difficulty(product)
        }

    def _extract_potential_dates(self, product: Dict) -> List[str]:
        """Extract potential date information from product data."""
        dates = []

        if product.get("expiration_date"):
            dates.append(product["expiration_date"])

        # Look for dates in text fields
        text_fields = [
            product.get("ingredients_text", ""),
            product.get("packaging", ""),
            product.get("product_name", "")
        ]

        import re
        date_pattern = r'\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b|\b\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}\b'

        for text in text_fields:
            if text:
                found_dates = re.findall(date_pattern, text)
                dates.extend(found_dates)

        return dates

    def _calculate_test_priority(self, product: Dict) -> str:
        """Calculate testing priority based on data richness."""
        score = 0

        if product.get("product_name"):
            score += 1
        if product.get("brands"):
            score += 1
        if product.get("ingredients_text"):
            score += 2
        if product.get("expiration_date"):
            score += 3
        if product.get("packaging"):
            score += 1

        if score >= 6:
            return "high"
        elif score >= 3:
            return "medium"
        else:
            return "low"

    def _estimate_ocr_difficulty(self, product: Dict) -> str:
        """Estimate OCR difficulty based on text complexity."""
        # Simple heuristic based on text length and complexity
        text_content = " ".join([
            product.get("product_name", ""),
            product.get("brands", ""),
            product.get("ingredients_text", "")[:100]  # First 100 chars
        ])

        if len(text_content) > 200:
            return "hard"
        elif len(text_content) > 100:
            return "medium"
        else:
            return "easy"

    async def save_dataset(self, products: List[Dict]) -> None:
        """Save the complete dataset with metadata."""
        dataset_metadata = {
            "dataset_info": {
                "name": "LIFO_OCR_Sample_Dataset",
                "created": datetime.now().isoformat(),
                "total_products": len(products),
                "source": "Open Food Facts",
                "countries": self.countries
            },
            "statistics": self._calculate_dataset_stats(products),
            "products": products
        }

        metadata_path = self.output_dir / "dataset_metadata.json"
        async with aiofiles.open(metadata_path, 'w') as f:
            await f.write(json.dumps(dataset_metadata, indent=2, ensure_ascii=False))

        print(f"💾 Dataset saved to {self.output_dir}")
        print(f"📊 Statistics:")
        for key, value in dataset_metadata["statistics"].items():
            print(f"   {key}: {value}")

    def _calculate_dataset_stats(self, products: List[Dict]) -> Dict:
        """Calculate dataset statistics."""
        stats = {
            "total_images": len(products),
            "priority_distribution": {"high": 0, "medium": 0, "low": 0},
            "difficulty_distribution": {"easy": 0, "medium": 0, "hard": 0},
            "products_with_dates": 0,
            "products_with_brands": 0,
            "products_with_ingredients": 0
        }

        for product in products:
            # Priority distribution
            priority = product.get("test_priority", "low")
            stats["priority_distribution"][priority] += 1

            # Difficulty distribution
            difficulty = product.get("ocr_difficulty", "easy")
            stats["difficulty_distribution"][difficulty] += 1

            # Content analysis
            if product.get("potential_dates"):
                stats["products_with_dates"] += 1
            if product["expected_text_elements"].get("brands"):
                stats["products_with_brands"] += 1
            if product["expected_text_elements"].get("ingredients"):
                stats["products_with_ingredients"] += 1

        return stats

async def main():
    """Main function to run the dataset sampler."""
    if len(sys.argv) > 1:
        max_products = int(sys.argv[1])
    else:
        max_products = 25  # Default sample size

    print("🚀 LIFO Quick Dataset Sampler")
    print("=" * 50)

    sampler = QuickDatasetSampler()

    # Download products
    products = await sampler.download_sample_products(max_products)

    if not products:
        print("❌ No products found. Please check your internet connection.")
        return

    # Download images
    downloaded_products = await sampler.download_images(products)

    if not downloaded_products:
        print("❌ No images downloaded successfully.")
        return

    # Save dataset
    await sampler.save_dataset(downloaded_products)

    print("\n🎉 Dataset ready for OCR testing!")
    print(f"📁 Images: sample_dataset/images/")
    print(f"📋 Metadata: sample_dataset/dataset_metadata.json")
    print("\nNow you can test your OCR system with real food packaging images! 🍕📦")

if __name__ == "__main__":
    asyncio.run(main())