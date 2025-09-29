# LIFO Dataset Tools

Comprehensive suite for downloading and analyzing food packaging datasets for OCR validation and machine learning model training.

## Overview

This toolkit provides:

1. **Open Food Facts Downloader**: Downloads EU food products with images and metadata
2. **FooDI-ML Downloader**: Downloads sample images from AWS S3 bucket
3. **Dataset Analyzer**: Analyzes images for OCR suitability and quality metrics
4. **OCR Validator**: Creates test suites for OCR system validation

## Features

- **Asynchronous Processing**: Fast concurrent downloads and analysis
- **Progress Tracking**: Real-time progress bars and statistics
- **Quality Validation**: Automatic image quality assessment
- **Error Handling**: Comprehensive error handling and logging
- **Configurable**: Flexible configuration system
- **Modular Design**: Reusable components for different use cases

## Installation

### Prerequisites

```bash
# Install required packages (if not already installed)
pip install boto3 scikit-learn aiofiles aiohttp rich opencv-python pillow
```

### AWS Configuration (for FooDI-ML)

```bash
# Set AWS credentials for S3 access
export AWS_ACCESS_KEY_ID="your_access_key"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_DEFAULT_REGION="eu-west-1"
```

## Quick Start

### Run Complete Pipeline

```bash
# Download both datasets, analyze, and create OCR tests
python -m lifo_api.dataset_tools.main --run-all

# With custom sample size
python -m lifo_api.dataset_tools.main --run-all --foodiml-sample-size 2000
```

### Individual Operations

```bash
# Download Open Food Facts only
python -m lifo_api.dataset_tools.main --download-off

# Download FooDI-ML sample only
python -m lifo_api.dataset_tools.main --download-foodiml --foodiml-sample-size 500

# Analyze existing datasets
python -m lifo_api.dataset_tools.main --analyze

# Analyze specific directory
python -m lifo_api.dataset_tools.main --analyze --analyze-path /path/to/images

# Create OCR validation tests
python -m lifo_api.dataset_tools.main --create-ocr-tests
```

## Configuration

### Environment Variables

```bash
# Optional configuration
export MAX_PRODUCTS=10000        # Max products from Open Food Facts
export MAX_FILES=5000           # Max files from FooDI-ML
export LOG_LEVEL=INFO           # Logging level
```

### Configuration File

The system uses `config.py` for detailed configuration:

```python
from dataset_tools.config import DatasetConfig

# Create custom configuration
config = DatasetConfig()
config.openfoodfacts.max_total_products = 10000
config.foodiml.max_files = 5000
config.log_level = "DEBUG"
```

## Programmatic Usage

### Download Open Food Facts

```python
import asyncio
from dataset_tools.config import default_config
from dataset_tools.downloaders import OpenFoodFactsDownloader

async def download_off():
    async with OpenFoodFactsDownloader(default_config) as downloader:
        results = await downloader.run_complete_download()
        print(f"Downloaded {results['products_downloaded']} products")

asyncio.run(download_off())
```

### Download FooDI-ML Sample

```python
import asyncio
from dataset_tools.config import default_config
from dataset_tools.downloaders import FoodiMLDownloader

async def download_foodiml():
    with FoodiMLDownloader(default_config) as downloader:
        results = await downloader.run_complete_download(sample_size=1000)
        print(f"Downloaded {results['download_stats']['downloaded']} images")

asyncio.run(download_foodiml())
```

### Analyze Dataset

```python
import asyncio
from pathlib import Path
from dataset_tools.config import default_config
from dataset_tools.analyzers import DatasetAnalyzer

async def analyze():
    with DatasetAnalyzer(default_config) as analyzer:
        analysis = await analyzer.analyze_dataset(
            Path("path/to/images"),
            progress_tracker=None
        )
        print(f"Analyzed {analysis['statistics']['total_images']} images")

asyncio.run(analyze())
```

### Create OCR Validation Suite

```python
import asyncio
from pathlib import Path
from dataset_tools.config import default_config
from dataset_tools.analyzers import OCRValidator

async def create_ocr_tests():
    validator = OCRValidator(default_config)
    suite = await validator.create_validation_suite(
        Path("path/to/images"),
        max_test_cases=200
    )
    print(f"Created {suite.total_test_cases} OCR test cases")

asyncio.run(create_ocr_tests())
```

## Output Structure

```
data/
├── openfoodfacts/
│   ├── images/                 # Downloaded product images
│   ├── products.json          # Product metadata
│   └── ...
├── foodiml/
│   ├── images/                 # Downloaded sample images
│   ├── s3_objects.json        # S3 object metadata
│   ├── bucket_analysis.json   # Bucket analysis report
│   └── ...
└── output/
    ├── analysis/               # Analysis reports
    │   ├── dataset_analysis_*.json
    │   └── ...
    ├── validation_subset/      # High-quality validation images
    │   ├── val_0001_*.jpg
    │   ├── validation_metadata.json
    │   └── ...
    ├── ocr_validation_suite.json
    └── dataset_pipeline.log
```

## Analysis Reports

### Dataset Analysis Report

```json
{
  "dataset_path": "/path/to/images",
  "statistics": {
    "total_images": 1500,
    "valid_images": 1200,
    "avg_quality_score": 0.72,
    "ocr_suitability_distribution": {
      "excellent": 300,
      "good": 600,
      "fair": 300,
      "poor": 300
    }
  },
  "recommendations": {
    "quality_improvements": [...],
    "ocr_optimization": [...],
    "dataset_curation": [...]
  }
}
```

### OCR Validation Suite

```json
{
  "suite_name": "LIFO_OCR_Validation_20241201_120000",
  "total_test_cases": 200,
  "language_distribution": {
    "french": 50,
    "german": 40,
    "english": 35,
    "italian": 35,
    "spanish": 30,
    "unknown": 10
  },
  "difficulty_distribution": {
    "easy": 60,
    "medium": 90,
    "hard": 50
  },
  "validation_criteria": {
    "min_text_detection_accuracy": 0.8,
    "min_date_extraction_accuracy": 0.9
  }
}
```

## Performance Optimization

### Concurrent Downloads

- Open Food Facts: 10 concurrent connections (configurable)
- FooDI-ML: 5 concurrent S3 downloads (configurable)
- Analysis: 4 parallel image processing threads

### Memory Management

- Streaming downloads for large files
- Bounded memory usage during analysis
- Automatic cleanup of invalid images

### Error Resilience

- Automatic retry for failed downloads
- Graceful degradation on errors
- Comprehensive logging for debugging

## Quality Filters

### Image Quality Criteria

- **Minimum dimensions**: 300x300 pixels
- **Maximum file size**: 10MB
- **Supported formats**: JPG, PNG, WebP
- **Quality score**: Based on sharpness, contrast, brightness
- **OCR suitability**: Text region detection and analysis

### Data Validation

- Product metadata completeness
- Valid barcode formats
- Date format validation
- URL format validation

## Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   ```bash
   # Set AWS credentials
   aws configure
   # Or use environment variables
   export AWS_ACCESS_KEY_ID="..."
   export AWS_SECRET_ACCESS_KEY="..."
   ```

2. **Memory Issues with Large Datasets**
   ```bash
   # Reduce concurrent downloads
   python -m dataset_tools.main --run-all --foodiml-sample-size 500
   ```

3. **Network Timeouts**
   ```python
   # Increase timeout in config
   config.openfoodfacts.request_delay = 0.5  # Slow down requests
   ```

### Debug Mode

```bash
# Enable debug logging
python -m lifo_api.dataset_tools.main --run-all --log-level DEBUG
```

## API Reference

### Configuration Classes

- `DatasetConfig`: Main configuration class
- `OpenFoodFactsConfig`: Open Food Facts API settings
- `FoodiMLConfig`: FooDI-ML/S3 settings

### Downloader Classes

- `OpenFoodFactsDownloader`: Async API downloader
- `FoodiMLDownloader`: S3 bucket downloader

### Analyzer Classes

- `DatasetAnalyzer`: Image quality and OCR suitability analyzer
- `OCRValidator`: OCR test suite generator

### Utility Functions

- `ProgressTracker`: Progress tracking with Rich UI
- `validate_image_quality()`: Image validation
- `extract_language_info()`: Text language detection

## Contributing

1. Follow existing code patterns
2. Add type hints to all functions
3. Include comprehensive error handling
4. Add tests for new functionality
5. Update documentation

## License

Part of the LIFO.AI project. See project LICENSE for details.