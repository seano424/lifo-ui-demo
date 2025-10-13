"""
Open Food Facts API downloader with concurrent processing and error handling.
"""

import asyncio
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Set
import aiohttp
import aiofiles
from dataclasses import dataclass, asdict

from ..config import DatasetConfig
from ..utils import (
    ProgressTracker,
    validate_product_data,
    validate_image_quality,
    get_logger,
)


@dataclass
class ProductData:
    """Structured product data from Open Food Facts."""

    code: str
    product_name: str
    brands: str
    categories: str
    countries: str
    expiration_date: Optional[str]
    image_url: Optional[str]
    image_front_url: Optional[str]
    image_ingredients_url: Optional[str]
    image_nutrition_url: Optional[str]
    ingredients_text: Optional[str]
    nutriments: Optional[Dict]
    packaging: Optional[str]
    manufacturing_places: Optional[str]
    origins: Optional[str]
    labels: Optional[str]
    created_datetime: Optional[str]
    last_modified_datetime: Optional[str]


class OpenFoodFactsDownloader:
    """
    Asynchronous downloader for Open Food Facts product data and images.
    """

    def __init__(self, config: DatasetConfig):
        self.config = config
        self.off_config = config.openfoodfacts
        self.logger = get_logger(__name__)
        self.session: Optional[aiohttp.ClientSession] = None
        self.downloaded_codes: Set[str] = set()
        self.semaphore = asyncio.Semaphore(self.off_config.concurrent_downloads)

    async def __aenter__(self):
        """Async context manager entry."""
        self.session = aiohttp.ClientSession(
            headers={"User-Agent": self.off_config.user_agent},
            timeout=aiohttp.ClientTimeout(total=30),
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        if self.session:
            await self.session.close()

    async def download_products(
        self, progress_tracker: Optional[ProgressTracker] = None
    ) -> List[ProductData]:
        """
        Download product data from Open Food Facts API.

        Args:
            progress_tracker: Optional progress tracker

        Returns:
            List of ProductData objects
        """
        if not self.session:
            raise RuntimeError("Downloader must be used as async context manager")

        all_products = []

        # Create task if progress tracker provided
        if progress_tracker:
            task_name = progress_tracker.add_task(
                "api_requests",
                "Downloading product metadata",
                total=len(self.off_config.countries),
            )

        for country in self.off_config.countries:
            try:
                products = await self._download_country_products(country)
                all_products.extend(products)

                if progress_tracker:
                    progress_tracker.update(task_name, completed=True)

                self.logger.info(f"Downloaded {len(products)} products from {country}")

                # Rate limiting
                await asyncio.sleep(self.off_config.request_delay)

            except Exception as e:
                self.logger.error(f"Error downloading products from {country}: {e}")
                if progress_tracker:
                    progress_tracker.update(task_name, failed=True)

        # Remove duplicates based on product code
        unique_products = {}
        for product in all_products:
            if product.code not in unique_products:
                unique_products[product.code] = product

        final_products = list(unique_products.values())
        self.logger.info(f"Total unique products: {len(final_products)}")

        return final_products

    async def _download_country_products(self, country: str) -> List[ProductData]:
        """Download products for a specific country."""
        products = []
        page = 1
        products_downloaded = 0

        while products_downloaded < self.off_config.max_total_products // len(
            self.off_config.countries
        ):
            params = {
                "countries": country,
                "page_size": self.off_config.max_products_per_request,
                "page": page,
                "fields": ",".join(
                    [
                        "code",
                        "product_name",
                        "brands",
                        "categories",
                        "countries",
                        "expiration_date",
                        "image_url",
                        "image_front_url",
                        "image_ingredients_url",
                        "image_nutrition_url",
                        "ingredients_text",
                        "nutriments",
                        "packaging",
                        "manufacturing_places",
                        "origins",
                        "labels",
                        "created_datetime",
                        "last_modified_datetime",
                    ]
                ),
            }

            try:
                async with self.session.get(
                    self.off_config.base_url, params=params
                ) as response:
                    if response.status != 200:
                        self.logger.warning(f"API request failed: {response.status}")
                        break

                    data = await response.json()
                    page_products = data.get("products", [])

                    if not page_products:
                        break

                    # Convert to ProductData objects
                    for product_raw in page_products:
                        try:
                            product = self._create_product_data(product_raw)
                            if product and self._is_valid_product(product):
                                products.append(product)
                                products_downloaded += 1

                        except Exception as e:
                            self.logger.debug(f"Error processing product: {e}")

                    page += 1

            except Exception as e:
                self.logger.error(f"Error fetching page {page} for {country}: {e}")
                break

        return products

    def _create_product_data(self, raw_data: Dict[str, Any]) -> Optional[ProductData]:
        """Create ProductData from raw API response."""
        try:
            return ProductData(
                code=str(raw_data.get("code", "")),
                product_name=raw_data.get("product_name", ""),
                brands=raw_data.get("brands", ""),
                categories=raw_data.get("categories", ""),
                countries=raw_data.get("countries", ""),
                expiration_date=raw_data.get("expiration_date"),
                image_url=raw_data.get("image_url"),
                image_front_url=raw_data.get("image_front_url"),
                image_ingredients_url=raw_data.get("image_ingredients_url"),
                image_nutrition_url=raw_data.get("image_nutrition_url"),
                ingredients_text=raw_data.get("ingredients_text"),
                nutriments=raw_data.get("nutriments"),
                packaging=raw_data.get("packaging"),
                manufacturing_places=raw_data.get("manufacturing_places"),
                origins=raw_data.get("origins"),
                labels=raw_data.get("labels"),
                created_datetime=raw_data.get("created_datetime"),
                last_modified_datetime=raw_data.get("last_modified_datetime"),
            )
        except Exception as e:
            self.logger.debug(f"Error creating ProductData: {e}")
            return None

    def _is_valid_product(self, product: ProductData) -> bool:
        """Check if product meets quality requirements."""
        is_valid, issues = validate_product_data(
            asdict(product), ["code", "product_name"]
        )

        if not is_valid:
            self.logger.debug(f"Invalid product {product.code}: {issues}")
            return False

        # Check for at least one image URL
        image_urls = [
            product.image_url,
            product.image_front_url,
            product.image_ingredients_url,
        ]
        if not any(url for url in image_urls):
            return False

        return True

    async def download_images(
        self,
        products: List[ProductData],
        progress_tracker: Optional[ProgressTracker] = None,
    ) -> Dict[str, List[str]]:
        """
        Download images for products concurrently.

        Args:
            products: List of ProductData objects
            progress_tracker: Optional progress tracker

        Returns:
            Dictionary mapping product codes to downloaded image paths
        """
        if not self.session:
            raise RuntimeError("Downloader must be used as async context manager")

        # Count total images to download
        total_images = sum(
            len(
                [
                    url
                    for url in [p.image_url, p.image_front_url, p.image_ingredients_url]
                    if url
                ]
            )
            for p in products
        )

        # Create task if progress tracker provided
        task_name = None
        if progress_tracker:
            task_name = progress_tracker.add_task(
                "image_downloads", "Downloading product images", total=total_images
            )

        # Create download tasks
        download_tasks = []
        for product in products:
            image_urls = [
                (product.image_url, "main"),
                (product.image_front_url, "front"),
                (product.image_ingredients_url, "ingredients"),
            ]

            for url, img_type in image_urls:
                if url:
                    task = self._download_single_image(
                        product.code, url, img_type, progress_tracker, task_name
                    )
                    download_tasks.append(task)

        # Execute downloads concurrently
        results = await asyncio.gather(*download_tasks, return_exceptions=True)

        # Organize results by product code
        product_images = {}
        for result in results:
            if isinstance(result, tuple) and len(result) == 2:
                product_code, image_path = result
                if product_code not in product_images:
                    product_images[product_code] = []
                product_images[product_code].append(image_path)

        return product_images

    async def _download_single_image(
        self,
        product_code: str,
        url: str,
        image_type: str,
        progress_tracker: Optional[ProgressTracker],
        task_name: Optional[str],
    ) -> Optional[tuple]:
        """Download a single image with error handling."""
        async with self.semaphore:
            try:
                # Create filename
                filename = f"{product_code}_{image_type}.jpg"
                image_path = self.config.openfoodfacts_dir / "images" / filename
                image_path.parent.mkdir(parents=True, exist_ok=True)

                # Skip if already downloaded
                if image_path.exists():
                    if progress_tracker and task_name:
                        progress_tracker.update(task_name, skipped=True)
                    return (product_code, str(image_path))

                # Download image
                async with self.session.get(url) as response:
                    if response.status == 200:
                        content = await response.read()

                        async with aiofiles.open(image_path, "wb") as f:
                            await f.write(content)

                        # Validate downloaded image
                        is_valid, issues = validate_image_quality(
                            image_path,
                            self.config.min_image_width,
                            self.config.min_image_height,
                            self.config.max_image_size_mb,
                        )

                        if is_valid:
                            if progress_tracker and task_name:
                                progress_tracker.update(task_name, completed=True)
                            return (product_code, str(image_path))
                        else:
                            # Remove invalid image
                            image_path.unlink(missing_ok=True)
                            self.logger.debug(
                                f"Removed invalid image {filename}: {issues}"
                            )

                if progress_tracker and task_name:
                    progress_tracker.update(task_name, failed=True)

            except Exception as e:
                self.logger.debug(f"Error downloading image {url}: {e}")
                if progress_tracker and task_name:
                    progress_tracker.update(task_name, failed=True)

        return None

    async def save_metadata(
        self, products: List[ProductData], filename: str = "products.json"
    ) -> Path:
        """Save product metadata to JSON file."""
        output_path = self.config.openfoodfacts_dir / filename

        products_dict = [asdict(product) for product in products]

        async with aiofiles.open(output_path, "w", encoding="utf-8") as f:
            await f.write(json.dumps(products_dict, indent=2, ensure_ascii=False))

        self.logger.info(f"Saved {len(products)} products to {output_path}")
        return output_path

    async def run_complete_download(self) -> Dict[str, Any]:
        """
        Run complete download process: products + images.

        Returns:
            Summary of download results
        """
        with ProgressTracker() as progress:
            # Download product metadata
            products = await self.download_products(progress)

            if not products:
                self.logger.warning("No products downloaded")
                return {"products": 0, "images": 0}

            # Save metadata
            metadata_path = await self.save_metadata(products)

            # Download images
            product_images = await self.download_images(products, progress)

            progress.print_summary()

            return {
                "products_downloaded": len(products),
                "products_with_images": len(product_images),
                "total_images": sum(len(imgs) for imgs in product_images.values()),
                "metadata_file": str(metadata_path),
                "image_directory": str(self.config.openfoodfacts_dir / "images"),
            }
