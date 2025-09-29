"""
Example usage of the dataset tools for various scenarios.
"""
import asyncio
from pathlib import Path

from .config import DatasetConfig
from .downloaders import OpenFoodFactsDownloader, FoodiMLDownloader
from .analyzers import DatasetAnalyzer, OCRValidator
from .utils import ProgressTracker, setup_logger


async def example_download_openfoodfacts():
    """Example: Download Open Food Facts dataset with custom configuration."""
    print("=== Open Food Facts Download Example ===")

    # Create custom configuration
    config = DatasetConfig()
    config.openfoodfacts.max_total_products = 1000  # Smaller sample for demo
    config.openfoodfacts.countries = ["france", "germany"]  # Only 2 countries
    config.log_level = "INFO"

    # Set up logging
    logger = setup_logger("example_off", config.log_level)

    # Download dataset
    async with OpenFoodFactsDownloader(config) as downloader:
        # Download products and images
        with ProgressTracker() as progress:
            products = await downloader.download_products(progress)
            print(f"Downloaded {len(products)} products")

            if products:
                # Download images for subset
                sample_products = products[:50]  # First 50 products
                images = await downloader.download_images(sample_products, progress)
                print(f"Downloaded images for {len(images)} products")

    print("Open Food Facts download completed!\n")


async def example_download_foodiml():
    """Example: Download FooDI-ML dataset sample with analysis."""
    print("=== FooDI-ML Download Example ===")

    config = DatasetConfig()

    try:
        with FoodiMLDownloader(config) as downloader:
            # First, analyze the bucket
            print("Analyzing S3 bucket contents...")
            analysis = await downloader.analyze_bucket_contents(max_objects=1000)

            print(f"Found {analysis['total_objects']} image files")
            print(f"Total size: {analysis['total_size_gb']:.2f} GB")
            print(f"File extensions: {analysis['file_extensions']}")

            # Download a small sample
            print("\nDownloading sample dataset...")
            with ProgressTracker() as progress:
                results = await downloader.download_sample_dataset(
                    sample_size=50,  # Small sample for demo
                    progress_tracker=progress
                )

            print(f"Downloaded {results['downloaded']} images")
            print(f"Failed: {results['failed']} images")

    except Exception as e:
        print(f"FooDI-ML download failed: {e}")
        print("Make sure AWS credentials are configured!")

    print("FooDI-ML download completed!\n")


async def example_analyze_dataset():
    """Example: Analyze dataset for OCR suitability."""
    print("=== Dataset Analysis Example ===")

    config = DatasetConfig()

    # Check if we have any images to analyze
    image_dirs = [
        config.openfoodfacts_dir / "images",
        config.foodiml_dir / "images"
    ]

    for images_dir in image_dirs:
        if images_dir.exists() and any(images_dir.iterdir()):
            print(f"Analyzing dataset: {images_dir}")

            with DatasetAnalyzer(config) as analyzer:
                with ProgressTracker() as progress:
                    # Analyze dataset
                    analysis = await analyzer.analyze_dataset(images_dir, progress)

                    # Print summary
                    stats = analysis["statistics"]
                    print(f"  Total images: {stats['total_images']}")
                    print(f"  Valid images: {stats['valid_images']}")
                    print(f"  Average quality: {stats['avg_quality_score']:.2f}")
                    print(f"  OCR suitability: {stats['ocr_suitability_distribution']}")

                    # Create validation subset
                    if stats['total_images'] > 10:
                        from .analyzers.dataset_analyzer import ImageAnalysis
                        image_analyses = [
                            ImageAnalysis(**item) for item in analysis["image_analyses"]
                        ]

                        validation_info = await analyzer.create_validation_subset(
                            image_analyses,
                            subset_size=min(20, len(image_analyses) // 5),
                            quality_threshold=0.5
                        )

                        print(f"  Created validation subset: {validation_info['files_count']} images")

            print()
        else:
            print(f"No images found in {images_dir}")

    print("Dataset analysis completed!\n")


async def example_create_ocr_tests():
    """Example: Create OCR validation test suite."""
    print("=== OCR Validation Suite Example ===")

    config = DatasetConfig()

    # Find datasets to create tests from
    image_dirs = [
        config.openfoodfacts_dir / "images",
        config.foodiml_dir / "images"
    ]

    for images_dir in image_dirs:
        if images_dir.exists() and any(images_dir.iterdir()):
            print(f"Creating OCR tests for: {images_dir}")

            validator = OCRValidator(config)

            with ProgressTracker() as progress:
                # Create validation suite
                suite = await validator.create_validation_suite(
                    images_dir,
                    max_test_cases=20,  # Small number for demo
                    progress_tracker=progress
                )

                print(f"  Created {suite.total_test_cases} test cases")
                print(f"  Languages: {suite.language_distribution}")
                print(f"  Difficulty: {suite.difficulty_distribution}")

                # Run sample validation
                test_results = await validator.run_validation_tests(suite)
                print(f"  Test accuracy: {test_results['overall_accuracy']:.2%}")

            print()
        else:
            print(f"No images found in {images_dir}")

    print("OCR validation suite creation completed!\n")


async def example_custom_quality_analysis():
    """Example: Custom image quality analysis."""
    print("=== Custom Quality Analysis Example ===")

    config = DatasetConfig()

    # Find some images to analyze
    image_dirs = [
        config.openfoodfacts_dir / "images",
        config.foodiml_dir / "images"
    ]

    for images_dir in image_dirs:
        if images_dir.exists():
            image_files = list(images_dir.glob("*.jpg"))[:5]  # First 5 images

            if image_files:
                print(f"Analyzing image quality in: {images_dir}")

                from .utils import get_image_metadata, calculate_image_quality_score

                for image_path in image_files:
                    # Get metadata
                    metadata = get_image_metadata(image_path)

                    # Calculate quality score
                    quality = calculate_image_quality_score(image_path)

                    print(f"  {image_path.name}:")
                    print(f"    Size: {metadata['width']}x{metadata['height']}")
                    print(f"    Format: {metadata['format']}")
                    print(f"    Quality score: {quality:.2f}")

                print()

    print("Custom quality analysis completed!\n")


async def main():
    """Run all examples."""
    print("LIFO Dataset Tools - Example Usage")
    print("=" * 50)

    # Note: Some examples require downloaded data from previous steps
    examples = [
        ("Download Open Food Facts", example_download_openfoodfacts),
        ("Download FooDI-ML", example_download_foodiml),
        ("Analyze Datasets", example_analyze_dataset),
        ("Create OCR Tests", example_create_ocr_tests),
        ("Custom Quality Analysis", example_custom_quality_analysis),
    ]

    for name, example_func in examples:
        print(f"\n{name}:")
        print("-" * len(name))
        try:
            await example_func()
        except Exception as e:
            print(f"Example failed: {e}\n")

    print("All examples completed!")


if __name__ == "__main__":
    asyncio.run(main())