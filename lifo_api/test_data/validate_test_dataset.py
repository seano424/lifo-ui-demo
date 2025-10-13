#!/usr/bin/env python3
"""
Validate and demonstrate the OCR test dataset
Shows the comprehensive test data structure and examples
"""

import json
import sys
from pathlib import Path


def load_and_validate_dataset():
    """Load and validate the OCR test dataset"""
    dataset_path = Path(__file__).parent / "ocr_test_dataset.json"

    try:
        with open(dataset_path, "r", encoding="utf-8") as f:
            dataset = json.load(f)

        print("🎉 OCR Test Dataset Successfully Loaded!")
        print("=" * 60)

        # Display dataset info
        info = dataset["test_dataset_info"]
        print(f"📊 Dataset: {info['name']}")
        print(f"📅 Version: {info['version']}")
        print(f"📝 Description: {info['description']}")
        print(f"🧪 Total Test Cases: {info['total_test_cases']}")
        print(f"🌍 Languages: {', '.join(info['languages'])}")
        print(f"🏢 Regions: {', '.join(info.get('regions', ['EU', 'US']))}")
        print(f"📦 Categories: {', '.join(info['categories'])}")

        # Show test case examples
        print("\n📋 Test Case Examples:")
        print("-" * 40)

        for i, test_case in enumerate(dataset["test_cases"][:5], 1):
            print(f"\n{i}. {test_case['id']}")
            print(f"   📝 {test_case['description']}")
            print(f"   🌍 Language: {test_case['language']}")
            print(f"   🏢 Region: {test_case['region']}")
            print(f"   📦 Category: {test_case['category']}")

            # Show sample text blocks
            print("   📄 Sample Text:")
            for block in test_case["text_blocks"][:3]:
                print(f"      • {block}")
            if len(test_case["text_blocks"]) > 3:
                print(f"      ... and {len(test_case['text_blocks']) - 3} more blocks")

            # Show expected results summary
            expected = test_case["expected_results"]
            print("   🎯 Expected:")
            if "dates" in expected:
                print(f"      📅 Dates: {len(expected['dates'])}")
            if "barcodes" in expected:
                print(f"      🔢 Barcodes: {len(expected['barcodes'])}")
            if "product_names" in expected:
                print(f"      🏷️ Products: {len(expected['product_names'])}")

        # Show benchmark criteria
        print("\n🎯 Benchmark Criteria:")
        print("-" * 40)

        benchmarks = dataset["benchmark_criteria"]
        for service, criteria in benchmarks.items():
            print(f"\n{service.replace('_', ' ').title()}:")
            print(f"   Accuracy Target: {criteria.get('accuracy_target', 'N/A')}")
            print(
                f"   Performance Target: {criteria.get('performance_target_ms', 'N/A')}ms"
            )
            for feature, enabled in criteria.items():
                if feature not in [
                    "accuracy_target",
                    "performance_target_ms",
                ] and isinstance(enabled, bool):
                    status = "✅" if enabled else "❌"
                    print(f"   {feature.replace('_', ' ').title()}: {status}")

        # Validate data structure
        print("\n✅ Dataset Validation:")
        print("-" * 40)

        validation_results = []

        # Check required fields
        required_fields = ["test_dataset_info", "test_cases", "benchmark_criteria"]
        for field in required_fields:
            if field in dataset:
                validation_results.append(f"✅ Required field '{field}' present")
            else:
                validation_results.append(f"❌ Missing required field '{field}'")

        # Check test cases structure
        for i, test_case in enumerate(dataset["test_cases"]):
            required_test_fields = [
                "id",
                "description",
                "region",
                "language",
                "category",
                "text_blocks",
                "expected_results",
            ]
            missing_fields = [
                field for field in required_test_fields if field not in test_case
            ]

            if missing_fields:
                validation_results.append(
                    f"❌ Test case {i + 1} missing: {', '.join(missing_fields)}"
                )
            else:
                validation_results.append(
                    f"✅ Test case {i + 1} ({test_case['id']}) structure valid"
                )

        for result in validation_results:
            print(f"   {result}")

        # Statistics
        print("\n📈 Dataset Statistics:")
        print("-" * 40)

        test_cases = dataset["test_cases"]

        # Language distribution
        language_counts = {}
        for test_case in test_cases:
            lang = test_case["language"]
            language_counts[lang] = language_counts.get(lang, 0) + 1

        print("Language Distribution:")
        for lang, count in sorted(language_counts.items()):
            print(f"   {lang}: {count} tests")

        # Region distribution
        region_counts = {}
        for test_case in test_cases:
            region = test_case["region"]
            region_counts[region] = region_counts.get(region, 0) + 1

        print("\nRegion Distribution:")
        for region, count in sorted(region_counts.items()):
            print(f"   {region}: {count} tests")

        # Category distribution
        category_counts = {}
        for test_case in test_cases:
            category = test_case["category"]
            category_counts[category] = category_counts.get(category, 0) + 1

        print("\nCategory Distribution:")
        for category, count in sorted(category_counts.items()):
            print(f"   {category}: {count} tests")

        print("\n🎉 Dataset validation complete!")
        print("This comprehensive dataset provides real-world test scenarios for:")
        print("   • Multi-language date extraction (EU regulation compliant)")
        print("   • Barcode detection with checksum validation")
        print("   • Product name extraction with brand detection")
        print("   • Edge cases and challenging OCR scenarios")

        return True

    except FileNotFoundError:
        print(f"❌ Dataset file not found: {dataset_path}")
        return False
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in dataset: {e}")
        return False
    except Exception as e:
        print(f"❌ Error loading dataset: {e}")
        return False


def load_edge_cases():
    """Load and display edge case dataset"""
    edge_path = Path(__file__).parent / "edge_case_dataset.json"

    try:
        with open(edge_path, "r", encoding="utf-8") as f:
            edge_dataset = json.load(f)

        print("\n🔥 Edge Case Dataset:")
        print("-" * 40)

        info = edge_dataset["edge_case_info"]
        print(f"📊 Dataset: {info['name']}")
        print(f"📝 Description: {info['description']}")
        print(f"📦 Categories: {', '.join(info['categories'])}")

        print("\n🧪 Edge Case Examples:")
        for i, case in enumerate(edge_dataset["edge_cases"][:3], 1):
            print(f"\n{i}. {case['id']}")
            print(f"   📝 {case['description']}")
            print(f"   📦 Category: {case['category']}")
            print(f"   🎯 Expected: {case['expected_behavior']}")

        print("\n⚡ Stress Test Scenarios:")
        for scenario in edge_dataset["stress_test_scenarios"]:
            print(f"   • {scenario['name']}: {scenario['description']}")

        return True

    except Exception as e:
        print(f"❌ Error loading edge cases: {e}")
        return False


if __name__ == "__main__":
    print("🚀 OCR Test Dataset Validation")
    print("=" * 60)

    success = load_and_validate_dataset()
    if success:
        load_edge_cases()

        print("\n✨ Ready for OCR Testing!")
        print("Use this dataset to validate:")
        print("   • Enhanced date extraction service")
        print("   • Advanced barcode detection service")
        print("   • Intelligent product name extraction service")
        print("   • Comprehensive vision orchestrator")

        sys.exit(0)
    else:
        sys.exit(1)
