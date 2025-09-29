"""
Main orchestration script for dataset download and analysis.
"""
import asyncio
import argparse
from pathlib import Path
from typing import Dict, Any, Optional
import sys

from .config import DatasetConfig, default_config
from .downloaders import OpenFoodFactsDownloader, FoodiMLDownloader
from .analyzers import DatasetAnalyzer, OCRValidator
from .utils import setup_logger, ProgressTracker


async def download_openfoodfacts(config: DatasetConfig) -> Dict[str, Any]:
    """Download Open Food Facts dataset."""
    logger = setup_logger("openfoodfacts", config.log_level)

    logger.info("Starting Open Food Facts download...")

    async with OpenFoodFactsDownloader(config) as downloader:
        results = await downloader.run_complete_download()

    logger.info(f"Open Food Facts download completed: {results}")
    return results


async def download_foodiml(config: DatasetConfig, sample_size: int = 1000) -> Dict[str, Any]:
    """Download FooDI-ML dataset sample."""
    logger = setup_logger("foodiml", config.log_level)

    logger.info(f"Starting FooDI-ML download (sample size: {sample_size})...")

    try:
        with FoodiMLDownloader(config) as downloader:
            with ProgressTracker() as progress:
                results = await downloader.run_complete_download(sample_size)

        logger.info(f"FooDI-ML download completed: {results}")
        return results

    except Exception as e:
        logger.error(f"FooDI-ML download failed: {e}")
        return {"error": str(e)}


async def analyze_dataset(
    config: DatasetConfig,
    dataset_path: Path,
    create_validation: bool = True
) -> Dict[str, Any]:
    """Analyze dataset for OCR suitability."""
    logger = setup_logger("analyzer", config.log_level)

    logger.info(f"Starting dataset analysis for {dataset_path}")

    with DatasetAnalyzer(config) as analyzer:
        with ProgressTracker() as progress:
            # Analyze dataset
            analysis = await analyzer.analyze_dataset(dataset_path, progress)

            # Create validation subset if requested
            validation_info = None
            if create_validation and "image_analyses" in analysis:
                from .analyzers.dataset_analyzer import ImageAnalysis

                # Convert dict analyses back to ImageAnalysis objects
                image_analyses = [
                    ImageAnalysis(**item) for item in analysis["image_analyses"]
                ]

                validation_info = await analyzer.create_validation_subset(
                    image_analyses,
                    subset_size=min(100, len(image_analyses) // 10),
                    quality_threshold=0.6
                )

    analysis["validation_subset"] = validation_info
    logger.info(f"Dataset analysis completed. Report saved to analysis directory.")
    return analysis


async def create_ocr_validation_suite(
    config: DatasetConfig,
    dataset_path: Path,
    max_test_cases: int = 200
) -> Dict[str, Any]:
    """Create OCR validation test suite."""
    logger = setup_logger("ocr_validator", config.log_level)

    logger.info(f"Creating OCR validation suite from {dataset_path}")

    validator = OCRValidator(config)

    with ProgressTracker() as progress:
        suite = await validator.create_validation_suite(
            dataset_path,
            max_test_cases=max_test_cases,
            progress_tracker=progress
        )

    # Run sample validation tests
    test_results = await validator.run_validation_tests(suite)

    logger.info(f"OCR validation suite created with {suite.total_test_cases} test cases")

    return {
        "suite": suite.suite_name,
        "test_cases": suite.total_test_cases,
        "test_results": test_results
    }


async def run_complete_pipeline(
    config: DatasetConfig,
    download_openfoodfacts: bool = True,
    download_foodiml: bool = True,
    foodiml_sample_size: int = 1000,
    analyze_datasets: bool = True,
    create_ocr_tests: bool = True
) -> Dict[str, Any]:
    """Run the complete dataset download and analysis pipeline."""
    logger = setup_logger("main", config.log_level)
    results = {}

    logger.info("Starting complete dataset pipeline...")

    # Download datasets
    if download_openfoodfacts:
        try:
            results["openfoodfacts"] = await download_openfoodfacts(config)
        except Exception as e:
            logger.error(f"Open Food Facts download failed: {e}")
            results["openfoodfacts"] = {"error": str(e)}

    if download_foodiml:
        results["foodiml"] = await download_foodiml(config, foodiml_sample_size)

    # Analyze datasets
    if analyze_datasets:
        analysis_results = {}

        # Analyze Open Food Facts dataset
        if download_openfoodfacts and config.openfoodfacts_dir.exists():
            images_dir = config.openfoodfacts_dir / "images"
            if images_dir.exists():
                try:
                    analysis_results["openfoodfacts"] = await analyze_dataset(
                        config, images_dir, create_validation=True
                    )
                except Exception as e:
                    logger.error(f"Open Food Facts analysis failed: {e}")
                    analysis_results["openfoodfacts"] = {"error": str(e)}

        # Analyze FooDI-ML dataset
        if download_foodiml and config.foodiml_dir.exists():
            images_dir = config.foodiml_dir / "images"
            if images_dir.exists():
                try:
                    analysis_results["foodiml"] = await analyze_dataset(
                        config, images_dir, create_validation=True
                    )
                except Exception as e:
                    logger.error(f"FooDI-ML analysis failed: {e}")
                    analysis_results["foodiml"] = {"error": str(e)}

        results["analysis"] = analysis_results

    # Create OCR validation suites
    if create_ocr_tests:
        ocr_results = {}

        # Create OCR tests for both datasets
        for dataset_name in ["openfoodfacts", "foodiml"]:
            dataset_dir = getattr(config, f"{dataset_name}_dir")
            images_dir = dataset_dir / "images"

            if images_dir.exists():
                try:
                    ocr_results[dataset_name] = await create_ocr_validation_suite(
                        config, images_dir, max_test_cases=100
                    )
                except Exception as e:
                    logger.error(f"OCR validation for {dataset_name} failed: {e}")
                    ocr_results[dataset_name] = {"error": str(e)}

        results["ocr_validation"] = ocr_results

    logger.info("Complete dataset pipeline finished!")

    # Print summary
    _print_pipeline_summary(results)

    return results


def _print_pipeline_summary(results: Dict[str, Any]) -> None:
    """Print a summary of pipeline results."""
    print("\n" + "="*80)
    print("DATASET PIPELINE SUMMARY")
    print("="*80)

    # Download summary
    if "openfoodfacts" in results:
        off_results = results["openfoodfacts"]
        if "error" not in off_results:
            print(f"✓ Open Food Facts: {off_results.get('products_downloaded', 0)} products, "
                  f"{off_results.get('total_images', 0)} images")
        else:
            print(f"✗ Open Food Facts: Failed - {off_results['error']}")

    if "foodiml" in results:
        foodiml_results = results["foodiml"]
        if "error" not in foodiml_results:
            download_stats = foodiml_results.get("download_stats", {})
            print(f"✓ FooDI-ML: {download_stats.get('downloaded', 0)} images downloaded")
        else:
            print(f"✗ FooDI-ML: Failed - {foodiml_results['error']}")

    # Analysis summary
    if "analysis" in results:
        for dataset, analysis in results["analysis"].items():
            if "error" not in analysis:
                stats = analysis.get("statistics", {})
                print(f"✓ {dataset.title()} Analysis: {stats.get('total_images', 0)} images analyzed, "
                      f"avg quality: {stats.get('avg_quality_score', 0):.2f}")
            else:
                print(f"✗ {dataset.title()} Analysis: Failed - {analysis['error']}")

    # OCR validation summary
    if "ocr_validation" in results:
        for dataset, ocr_result in results["ocr_validation"].items():
            if "error" not in ocr_result:
                print(f"✓ {dataset.title()} OCR: {ocr_result.get('test_cases', 0)} test cases created")
            else:
                print(f"✗ {dataset.title()} OCR: Failed - {ocr_result['error']}")

    print("="*80)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Food packaging dataset downloader and analyzer")

    # Main actions
    parser.add_argument("--download-off", action="store_true",
                       help="Download Open Food Facts dataset")
    parser.add_argument("--download-foodiml", action="store_true",
                       help="Download FooDI-ML dataset sample")
    parser.add_argument("--analyze", action="store_true",
                       help="Analyze downloaded datasets")
    parser.add_argument("--create-ocr-tests", action="store_true",
                       help="Create OCR validation test suites")
    parser.add_argument("--run-all", action="store_true",
                       help="Run complete pipeline (download + analyze + OCR tests)")

    # Configuration options
    parser.add_argument("--foodiml-sample-size", type=int, default=1000,
                       help="Sample size for FooDI-ML dataset (default: 1000)")
    parser.add_argument("--max-products", type=int, default=5000,
                       help="Maximum products to download from Open Food Facts (default: 5000)")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"],
                       help="Logging level (default: INFO)")

    # Analysis options
    parser.add_argument("--analyze-path", type=str,
                       help="Specific path to analyze (instead of downloaded datasets)")
    parser.add_argument("--no-validation-subset", action="store_true",
                       help="Skip creating validation subset during analysis")

    args = parser.parse_args()

    # If no specific action is requested, show help
    if not any([args.download_off, args.download_foodiml, args.analyze,
               args.create_ocr_tests, args.run_all]):
        parser.print_help()
        return

    # Create configuration
    config = DatasetConfig.from_env()
    config.log_level = args.log_level

    if args.max_products:
        config.openfoodfacts.max_total_products = args.max_products

    # Set up main logger
    logger = setup_logger("main", config.log_level,
                         log_file=config.output_dir / "dataset_pipeline.log")

    try:
        if args.run_all:
            # Run complete pipeline
            results = asyncio.run(run_complete_pipeline(
                config,
                download_openfoodfacts=True,
                download_foodiml=True,
                foodiml_sample_size=args.foodiml_sample_size,
                analyze_datasets=True,
                create_ocr_tests=True
            ))
        else:
            # Run specific actions
            results = {}

            if args.download_off:
                results["openfoodfacts"] = asyncio.run(download_openfoodfacts(config))

            if args.download_foodiml:
                results["foodiml"] = asyncio.run(download_foodiml(config, args.foodiml_sample_size))

            if args.analyze:
                if args.analyze_path:
                    # Analyze specific path
                    path = Path(args.analyze_path)
                    if not path.exists():
                        logger.error(f"Analysis path does not exist: {path}")
                        return
                    results["analysis"] = asyncio.run(analyze_dataset(
                        config, path, create_validation=not args.no_validation_subset
                    ))
                else:
                    # Analyze downloaded datasets
                    analysis_results = {}
                    for dataset_name in ["openfoodfacts", "foodiml"]:
                        dataset_dir = getattr(config, f"{dataset_name}_dir")
                        images_dir = dataset_dir / "images"
                        if images_dir.exists():
                            analysis_results[dataset_name] = asyncio.run(analyze_dataset(
                                config, images_dir,
                                create_validation=not args.no_validation_subset
                            ))
                    results["analysis"] = analysis_results

            if args.create_ocr_tests:
                ocr_results = {}
                for dataset_name in ["openfoodfacts", "foodiml"]:
                    dataset_dir = getattr(config, f"{dataset_name}_dir")
                    images_dir = dataset_dir / "images"
                    if images_dir.exists():
                        ocr_results[dataset_name] = asyncio.run(create_ocr_validation_suite(
                            config, images_dir, max_test_cases=200
                        ))
                results["ocr_validation"] = ocr_results

            # Print summary for individual actions too
            _print_pipeline_summary(results)

        logger.info("Pipeline completed successfully!")

    except KeyboardInterrupt:
        logger.info("Pipeline interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()