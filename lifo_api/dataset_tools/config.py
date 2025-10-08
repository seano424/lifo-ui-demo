"""
Configuration settings for dataset download and analysis tools.
"""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional
import os


@dataclass
class OpenFoodFactsConfig:
    """Configuration for Open Food Facts API."""
    base_url: str = "https://world.openfoodfacts.org/api/v2/search"
    user_agent: str = "LIFO-AI-Dataset-Tool/1.0"
    max_products_per_request: int = 100
    max_total_products: int = 5000
    countries: List[str] = field(default_factory=lambda: ["france", "germany", "italy", "spain"])
    categories: List[str] = field(default_factory=lambda: [
        "food", "beverages", "dairy", "meat", "fish", "fruits-and-vegetables"
    ])
    required_fields: List[str] = field(default_factory=lambda: [
        "product_name", "brands", "categories", "expiration_date",
        "code", "image_url", "image_front_url", "image_ingredients_url"
    ])
    image_formats: List[str] = field(default_factory=lambda: [".jpg", ".jpeg", ".png"])
    concurrent_downloads: int = 10
    request_delay: float = 0.1  # Delay between requests in seconds


@dataclass
class FoodiMLConfig:
    """Configuration for FooDI-ML dataset from AWS S3."""
    bucket_name: str = "glovo-products-dataset-d1c9720d"
    region: str = "eu-west-1"
    max_files: int = 5000
    file_extensions: List[str] = field(default_factory=lambda: [".jpg", ".jpeg", ".png"])
    concurrent_downloads: int = 5
    chunk_size: int = 8192
    # Filter patterns for European products (if metadata available)
    european_keywords: List[str] = field(default_factory=lambda: [
        "europe", "eu", "france", "germany", "italy", "spain", "uk", "netherlands"
    ])


@dataclass
class DatasetConfig:
    """Main configuration for dataset tools."""
    # Base directories
    data_dir: Path = field(default_factory=lambda: Path("/home/slim/lifo-app/lifo_api/dataset_tools/data"))
    output_dir: Path = field(default_factory=lambda: Path("/home/slim/lifo-app/lifo_api/dataset_tools/output"))
    cache_dir: Path = field(default_factory=lambda: Path("/home/slim/lifo-app/lifo_api/dataset_tools/cache"))

    # Dataset subdirectories
    openfoodfacts_dir: Path = field(init=False)
    foodiml_dir: Path = field(init=False)
    analysis_dir: Path = field(init=False)

    # Configuration objects
    openfoodfacts: OpenFoodFactsConfig = field(default_factory=OpenFoodFactsConfig)
    foodiml: FoodiMLConfig = field(default_factory=FoodiMLConfig)

    # Analysis settings
    ocr_analysis: bool = True
    text_detection_confidence: float = 0.5
    min_text_length: int = 3
    supported_languages: List[str] = field(default_factory=lambda: ["en", "fr", "de", "it", "es"])

    # Quality filters
    min_image_width: int = 300
    min_image_height: int = 300
    max_image_size_mb: int = 10

    # Logging
    log_level: str = "INFO"
    log_file: Optional[str] = None

    def __post_init__(self):
        """Set up derived paths after initialization."""
        self.openfoodfacts_dir = self.data_dir / "openfoodfacts"
        self.foodiml_dir = self.data_dir / "foodiml"
        self.analysis_dir = self.output_dir / "analysis"

        # Create directories
        for dir_path in [
            self.data_dir, self.output_dir, self.cache_dir,
            self.openfoodfacts_dir, self.foodiml_dir, self.analysis_dir
        ]:
            dir_path.mkdir(parents=True, exist_ok=True)

    @classmethod
    def from_env(cls) -> "DatasetConfig":
        """Create configuration from environment variables."""
        config = cls()

        # Override with environment variables if present
        if aws_region := os.getenv("AWS_DEFAULT_REGION"):
            config.foodiml.region = aws_region

        if max_products := os.getenv("MAX_PRODUCTS"):
            config.openfoodfacts.max_total_products = int(max_products)

        if max_files := os.getenv("MAX_FILES"):
            config.foodiml.max_files = int(max_files)

        if log_level := os.getenv("LOG_LEVEL"):
            config.log_level = log_level

        return config


# Default configuration instance
default_config = DatasetConfig.from_env()