"""
Test script to verify dataset tools installation and basic functionality.
"""
import sys
from pathlib import Path

def test_imports():
    """Test that all required modules can be imported."""
    print("Testing imports...")

    try:
        # Test core modules
        from .config import DatasetConfig, default_config
        from .downloaders import OpenFoodFactsDownloader, FoodiMLDownloader
        from .analyzers import DatasetAnalyzer, OCRValidator
        from .utils import ProgressTracker, setup_logger
        print("✓ Core modules imported successfully")

        # Test external dependencies
        import boto3
        import aiohttp
        import aiofiles
        import cv2
        import numpy as np
        from PIL import Image
        from sklearn.cluster import KMeans
        from rich.console import Console
        print("✓ External dependencies imported successfully")

        return True

    except ImportError as e:
        print(f"✗ Import error: {e}")
        return False


def test_config():
    """Test configuration system."""
    print("\nTesting configuration...")

    try:
        from .config import DatasetConfig

        # Test default config
        config = DatasetConfig()
        assert config.data_dir.exists()
        assert config.output_dir.exists()
        assert config.cache_dir.exists()
        print("✓ Configuration directories created")

        # Test custom config
        config.openfoodfacts.max_total_products = 100
        assert config.openfoodfacts.max_total_products == 100
        print("✓ Configuration customization works")

        return True

    except Exception as e:
        print(f"✗ Configuration error: {e}")
        return False


def test_utilities():
    """Test utility functions."""
    print("\nTesting utilities...")

    try:
        from .utils import setup_logger, ProgressTracker

        # Test logger setup
        logger = setup_logger("test", "INFO")
        logger.info("Test log message")
        print("✓ Logger setup works")

        # Test progress tracker
        with ProgressTracker() as progress:
            task = progress.add_task("test_task", "Testing", total=10)
            progress.update(task, advance=5)
        print("✓ Progress tracker works")

        return True

    except Exception as e:
        print(f"✗ Utilities error: {e}")
        return False


def test_directory_structure():
    """Test that directory structure is correct."""
    print("\nTesting directory structure...")

    try:
        base_dir = Path(__file__).parent

        required_dirs = [
            "downloaders",
            "analyzers",
            "utils",
            "data",
            "output",
            "cache"
        ]

        for dir_name in required_dirs:
            dir_path = base_dir / dir_name
            if not dir_path.exists():
                print(f"✗ Missing directory: {dir_path}")
                return False

        print("✓ Directory structure is correct")
        return True

    except Exception as e:
        print(f"✗ Directory structure error: {e}")
        return False


def main():
    """Run all tests."""
    print("LIFO Dataset Tools - Installation Test")
    print("=" * 40)

    tests = [
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("Utilities", test_utilities),
        ("Directory Structure", test_directory_structure),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n[{test_name}]")
        if test_func():
            passed += 1

    print("\n" + "=" * 40)
    print(f"Test Results: {passed}/{total} passed")

    if passed == total:
        print("✓ All tests passed! Dataset tools are ready to use.")
        print("\nNext steps:")
        print("1. Set AWS credentials for FooDI-ML: aws configure")
        print("2. Run example: python -m lifo_api.dataset_tools.main --help")
        print("3. Start with: python -m lifo_api.dataset_tools.main --download-off")
        return True
    else:
        print("✗ Some tests failed. Please check the errors above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)