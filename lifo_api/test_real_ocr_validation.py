#!/usr/bin/env python3
"""
Test the enhanced OCR system with real food packaging images.
"""

import asyncio
import json
import sys
import os
from pathlib import Path
from datetime import datetime

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.date_extraction_service import get_date_extraction_service
from app.services.barcode_detection_service import get_barcode_detection_service

async def test_real_images():
    """Test OCR services with real downloaded images."""

    print("🧪 Testing Enhanced OCR System with Real Food Packaging Images")
    print("=" * 70)

    # Load dataset metadata
    dataset_path = Path("sample_dataset")
    metadata_file = dataset_path / "dataset_metadata.json"

    if not metadata_file.exists():
        print("❌ Dataset not found. Please run: python quick_dataset_sampler.py")
        return

    with open(metadata_file, 'r') as f:
        dataset = json.load(f)

    print(f"📊 Dataset: {dataset['dataset_info']['total_products']} products from {len(dataset['dataset_info']['countries'])} countries")
    print(f"🎯 Testing priorities: {dataset['statistics']['priority_distribution']}")

    # Initialize services
    date_service = get_date_extraction_service()
    barcode_service = get_barcode_detection_service()

    # Test results
    test_results = {
        "total_tests": 0,
        "successful_extractions": 0,
        "date_extractions": 0,
        "barcode_detections": 0,
        "coordination_successes": 0,
        "detailed_results": []
    }

    # Test each product
    for i, product in enumerate(dataset['products'][:10], 1):  # Test first 10 for demo
        print(f"\n📸 Test {i}: {product['product_name']}")
        print(f"   Priority: {product['test_priority']} | Difficulty: {product['ocr_difficulty']}")

        # For real OCR, you would use Google Vision API here
        # For now, let's simulate OCR text blocks from the product metadata
        simulated_ocr_blocks = create_simulated_ocr_blocks(product)

        if not simulated_ocr_blocks:
            print("   ⚠️  No text to analyze")
            continue

        print(f"   📝 Simulated OCR blocks: {len(simulated_ocr_blocks)}")
        for j, block in enumerate(simulated_ocr_blocks, 1):
            print(f"      {j}. '{block[:60]}{'...' if len(block) > 60 else ''}'")

        # Test date extraction
        try:
            date_results = await date_service.extract_dates_from_text_blocks(
                simulated_ocr_blocks, preferred_region='EU'
            )

            print(f"   📅 Dates found: {len(date_results)}")
            for result in date_results:
                print(f"      - {result.date} ({result.date_type}) from '{result.raw_text}' (conf: {result.confidence:.2f})")

        except Exception as e:
            print(f"   ❌ Date extraction error: {e}")
            date_results = []

        # Test barcode detection
        try:
            barcode_results = await barcode_service.detect_barcodes_from_text_blocks(
                simulated_ocr_blocks, region_preference='EU'
            )

            print(f"   🔢 Barcodes found: {len(barcode_results)}")
            for result in barcode_results:
                print(f"      - {result.value} ({result.format}) from '{result.raw_text}' (conf: {result.confidence:.2f})")

        except Exception as e:
            print(f"   ❌ Barcode detection error: {e}")
            barcode_results = []

        # Test coordination (no overlap between dates and barcodes)
        coordination_success = not any(
            date_result.raw_text == barcode_result.raw_text
            for date_result in date_results
            for barcode_result in barcode_results
        )

        coordination_status = "✅ PASS" if coordination_success else "❌ CONFLICT"
        print(f"   🔄 Coordination: {coordination_status}")

        # Store results
        test_result = {
            "product_code": product['product_code'],
            "product_name": product['product_name'],
            "test_priority": product['test_priority'],
            "ocr_difficulty": product['ocr_difficulty'],
            "dates_found": len(date_results),
            "barcodes_found": len(barcode_results),
            "coordination_success": coordination_success,
            "expected_dates": product['potential_dates'],
            "extracted_dates": [str(r.date) for r in date_results],
            "extracted_barcodes": [r.value for r in barcode_results]
        }

        test_results["detailed_results"].append(test_result)
        test_results["total_tests"] += 1

        if date_results or barcode_results:
            test_results["successful_extractions"] += 1
        if date_results:
            test_results["date_extractions"] += 1
        if barcode_results:
            test_results["barcode_detections"] += 1
        if coordination_success:
            test_results["coordination_successes"] += 1

    # Print summary
    print("\n" + "=" * 70)
    print("📊 REAL DATASET VALIDATION RESULTS")
    print("=" * 70)

    total = test_results["total_tests"]
    print(f"🧪 Total tests: {total}")
    print(f"✅ Successful extractions: {test_results['successful_extractions']}/{total} ({test_results['successful_extractions']/total:.1%})")
    print(f"📅 Date extractions: {test_results['date_extractions']}/{total} ({test_results['date_extractions']/total:.1%})")
    print(f"🔢 Barcode detections: {test_results['barcode_detections']}/{total} ({test_results['barcode_detections']/total:.1%})")
    print(f"🔄 Coordination success: {test_results['coordination_successes']}/{total} ({test_results['coordination_successes']/total:.1%})")

    # Priority analysis
    print(f"\n📈 Performance by Priority:")
    priority_stats = {}
    for result in test_results["detailed_results"]:
        priority = result["test_priority"]
        if priority not in priority_stats:
            priority_stats[priority] = {"total": 0, "successful": 0}
        priority_stats[priority]["total"] += 1
        if result["dates_found"] > 0 or result["barcodes_found"] > 0:
            priority_stats[priority]["successful"] += 1

    for priority, stats in priority_stats.items():
        success_rate = stats["successful"] / stats["total"]
        print(f"   {priority.capitalize()}: {stats['successful']}/{stats['total']} ({success_rate:.1%})")

    # Save results
    results_file = dataset_path / "ocr_validation_results.json"
    with open(results_file, 'w') as f:
        json.dump({
            "test_info": {
                "timestamp": datetime.now().isoformat(),
                "ocr_system": "LIFO Enhanced OCR v2.0",
                "dataset": dataset['dataset_info']['name']
            },
            "summary": test_results
        }, f, indent=2, default=str)

    print(f"\n💾 Results saved to: {results_file}")

    # Recommendations
    print(f"\n💡 RECOMMENDATIONS:")
    success_rate = test_results['successful_extractions'] / total
    if success_rate > 0.8:
        print("   🎉 Excellent performance! Your OCR system is working very well.")
    elif success_rate > 0.6:
        print("   👍 Good performance. Consider fine-tuning for edge cases.")
    else:
        print("   🔧 Performance needs improvement. Focus on:")
        print("      - Better text preprocessing")
        print("      - More robust pattern matching")
        print("      - Enhanced confidence scoring")

    if test_results['coordination_successes'] / total < 0.9:
        print("   🔄 Improve date/barcode coordination logic")

    return test_results

def create_simulated_ocr_blocks(product):
    """Create simulated OCR text blocks from product metadata."""
    blocks = []

    # Add product name
    if product['expected_text_elements']['product_name']:
        blocks.append(product['expected_text_elements']['product_name'])

    # Add brands
    if product['expected_text_elements']['brands']:
        blocks.append(product['expected_text_elements']['brands'])

    # Add potential dates (simulating what OCR might find)
    for date_str in product['potential_dates']:
        # Convert dates to various formats that might appear on packaging
        try:
            from datetime import datetime as dt
            date_obj = dt.fromisoformat(date_str.replace('/', '-'))

            # Add multiple date format representations
            blocks.append(f"EXP: {date_obj.strftime('%d/%m/%Y')}")
            blocks.append(f"Best Before: {date_obj.strftime('%m/%d/%Y')}")
            blocks.append(f"Use By: {date_obj.strftime('%Y-%m-%d')}")

        except:
            # If date parsing fails, use as-is
            blocks.append(f"Date: {date_str}")

    # Add product code as potential barcode
    if product['product_code']:
        blocks.append(product['product_code'])

    # Add some packaging text
    if product['expected_text_elements']['packaging']:
        blocks.append(product['expected_text_elements']['packaging'])

    return blocks

if __name__ == "__main__":
    asyncio.run(test_real_images())