#!/usr/bin/env python3
"""
Comprehensive OCR Validation with Real-World Test Dataset
Tests enhanced OCR services against researched food packaging data
"""

import asyncio
import json
import time
from typing import Dict, List, Any
from pathlib import Path


from app.services.date_extraction_service import get_date_extraction_service
from app.services.barcode_detection_service import get_barcode_detection_service
from app.services.product_name_extraction_service import (
    get_product_name_extraction_service,
)


class OCRValidationResults:
    """Results container for OCR validation"""

    def __init__(self):
        self.test_results = []
        self.summary = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "accuracy_by_service": {},
            "performance_metrics": {},
            "language_performance": {},
            "region_performance": {},
        }


class ComprehensiveOCRValidator:
    """Validates enhanced OCR services against real-world test dataset"""

    def __init__(self):
        self.results = OCRValidationResults()
        self.test_dataset = None
        self.load_test_dataset()

    def load_test_dataset(self):
        """Load the comprehensive test dataset"""
        dataset_path = Path(__file__).parent / "ocr_test_dataset.json"
        with open(dataset_path, "r", encoding="utf-8") as f:
            self.test_dataset = json.load(f)

        print(
            f"✅ Loaded test dataset: {self.test_dataset['test_dataset_info']['name']}"
        )
        print(
            f"📊 Total test cases: {self.test_dataset['test_dataset_info']['total_test_cases']}"
        )
        print(
            f"🌍 Languages: {', '.join(self.test_dataset['test_dataset_info']['languages'])}"
        )
        print(
            f"🏢 Categories: {', '.join(self.test_dataset['test_dataset_info']['categories'])}"
        )

    async def run_comprehensive_validation(self):
        """Run complete validation across all test cases"""
        print("\n🚀 Starting Comprehensive OCR Validation")
        print("=" * 60)

        # Get services
        date_service = get_date_extraction_service()
        barcode_service = get_barcode_detection_service()
        product_service = get_product_name_extraction_service()

        for test_case in self.test_dataset["test_cases"]:
            print(f"\n📋 Test Case: {test_case['id']}")
            print(f"   Description: {test_case['description']}")
            print(
                f"   Region: {test_case['region']}, Language: {test_case['language']}"
            )

            # Run individual service tests
            test_result = {
                "test_id": test_case["id"],
                "description": test_case["description"],
                "region": test_case["region"],
                "language": test_case["language"],
                "category": test_case["category"],
                "results": {},
                "performance": {},
                "passed": True,
            }

            # Test date extraction
            date_result = await self._test_date_extraction(
                date_service,
                test_case["text_blocks"],
                test_case["expected_results"].get("dates", []),
                test_case["region"],
            )
            test_result["results"]["dates"] = date_result
            test_result["performance"]["date_extraction_ms"] = date_result[
                "performance_ms"
            ]

            # Test barcode detection
            barcode_result = await self._test_barcode_detection(
                barcode_service,
                test_case["text_blocks"],
                test_case["expected_results"].get("barcodes", []),
                test_case["region"],
            )
            test_result["results"]["barcodes"] = barcode_result
            test_result["performance"]["barcode_detection_ms"] = barcode_result[
                "performance_ms"
            ]

            # Test product name extraction
            product_result = await self._test_product_extraction(
                product_service,
                test_case["text_blocks"],
                test_case["expected_results"].get("product_names", []),
            )
            test_result["results"]["product_names"] = product_result
            test_result["performance"]["product_extraction_ms"] = product_result[
                "performance_ms"
            ]

            # Determine overall test result
            test_result["passed"] = (
                date_result["passed"]
                and barcode_result["passed"]
                and product_result["passed"]
            )

            self.results.test_results.append(test_result)

            status = "✅ PASS" if test_result["passed"] else "❌ FAIL"
            print(f"   Result: {status}")

        # Generate comprehensive summary
        self._generate_comprehensive_summary()

    async def _test_date_extraction(
        self, service, text_blocks: List[str], expected_dates: List[Dict], region: str
    ) -> Dict[str, Any]:
        """Test date extraction service"""
        start_time = time.time()

        try:
            results = await service.extract_dates_from_text_blocks(
                text_blocks, preferred_region=region
            )
            performance_ms = (time.time() - start_time) * 1000

            # Compare results with expectations
            extracted_dates = []
            for result in results:
                extracted_dates.append(
                    {
                        "type": result.date_type,
                        "date": result.date.strftime("%Y-%m-%d")
                        if result.date
                        else result.raw_text,
                        "format": result.format_detected,
                        "raw_text": result.raw_text,
                        "confidence": result.confidence,
                    }
                )

            # Check if we found expected dates
            expected_count = len(expected_dates)
            found_count = len(extracted_dates)

            accuracy = (
                min(found_count / max(expected_count, 1), 1.0)
                if expected_count > 0
                else 1.0
            )
            passed = (
                accuracy >= 0.8 and performance_ms < 200
            )  # Relaxed targets for real-world data

            return {
                "extracted": extracted_dates,
                "expected_count": expected_count,
                "found_count": found_count,
                "accuracy": accuracy,
                "performance_ms": performance_ms,
                "passed": passed,
            }

        except Exception as e:
            return {
                "extracted": [],
                "expected_count": len(expected_dates),
                "found_count": 0,
                "accuracy": 0.0,
                "performance_ms": (time.time() - start_time) * 1000,
                "passed": False,
                "error": str(e),
            }

    async def _test_barcode_detection(
        self,
        service,
        text_blocks: List[str],
        expected_barcodes: List[Dict],
        region: str,
    ) -> Dict[str, Any]:
        """Test barcode detection service"""
        start_time = time.time()

        try:
            results = await service.detect_barcodes_from_text_blocks(
                text_blocks, region_preference=region
            )
            performance_ms = (time.time() - start_time) * 1000

            # Compare results with expectations
            detected_barcodes = []
            for result in results:
                detected_barcodes.append(
                    {
                        "value": result.value,
                        "format": result.format,
                        "checksum_valid": result.checksum_valid,
                        "confidence": result.confidence,
                    }
                )

            expected_count = len(expected_barcodes)
            found_count = len(detected_barcodes)

            accuracy = (
                min(found_count / max(expected_count, 1), 1.0)
                if expected_count > 0
                else 1.0
            )
            passed = accuracy >= 0.9 and performance_ms < 200

            return {
                "detected": detected_barcodes,
                "expected_count": expected_count,
                "found_count": found_count,
                "accuracy": accuracy,
                "performance_ms": performance_ms,
                "passed": passed,
            }

        except Exception as e:
            return {
                "detected": [],
                "expected_count": len(expected_barcodes),
                "found_count": 0,
                "accuracy": 0.0,
                "performance_ms": (time.time() - start_time) * 1000,
                "passed": False,
                "error": str(e),
            }

    async def _test_product_extraction(
        self, service, text_blocks: List[str], expected_products: List[Dict]
    ) -> Dict[str, Any]:
        """Test product name extraction service"""
        start_time = time.time()

        try:
            results = await service.extract_product_names_from_text_blocks(text_blocks)
            performance_ms = (time.time() - start_time) * 1000

            # Compare results with expectations
            extracted_products = []
            for result in results:
                extracted_products.append(
                    {
                        "name": result.product_name,
                        "classification": result.name_type,
                        "brand_detected": result.brand_name,
                        "confidence": result.confidence,
                    }
                )

            expected_count = len(expected_products)
            found_count = len(extracted_products)

            accuracy = (
                min(found_count / max(expected_count, 1), 1.0)
                if expected_count > 0
                else 1.0
            )
            passed = (
                accuracy >= 0.7 and performance_ms < 250
            )  # More lenient for product extraction

            return {
                "extracted": extracted_products,
                "expected_count": expected_count,
                "found_count": found_count,
                "accuracy": accuracy,
                "performance_ms": performance_ms,
                "passed": passed,
            }

        except Exception as e:
            return {
                "extracted": [],
                "expected_count": len(expected_products),
                "found_count": 0,
                "accuracy": 0.0,
                "performance_ms": (time.time() - start_time) * 1000,
                "passed": False,
                "error": str(e),
            }

    def _generate_comprehensive_summary(self):
        """Generate detailed validation summary"""
        total_tests = len(self.results.test_results)
        passed_tests = sum(1 for test in self.results.test_results if test["passed"])

        self.results.summary["total_tests"] = total_tests
        self.results.summary["passed_tests"] = passed_tests
        self.results.summary["failed_tests"] = total_tests - passed_tests

        # Calculate service-specific accuracy
        services = ["dates", "barcodes", "product_names"]
        for service in services:
            accuracies = [
                test["results"][service]["accuracy"]
                for test in self.results.test_results
                if service in test["results"]
            ]
            avg_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0.0
            self.results.summary["accuracy_by_service"][service] = avg_accuracy

        # Calculate performance metrics
        for service in services:
            performance_key = (
                f"{service.rstrip('s')}_extraction_ms"
                if service != "product_names"
                else "product_extraction_ms"
            )
            if service == "barcodes":
                performance_key = "barcode_detection_ms"

            times = [
                test["performance"][performance_key]
                for test in self.results.test_results
                if performance_key in test["performance"]
            ]
            avg_time = sum(times) / len(times) if times else 0.0
            self.results.summary["performance_metrics"][service] = avg_time

        # Language and region analysis
        language_stats = {}
        region_stats = {}

        for test in self.results.test_results:
            lang = test["language"]
            region = test["region"]

            if lang not in language_stats:
                language_stats[lang] = {"total": 0, "passed": 0}
            if region not in region_stats:
                region_stats[region] = {"total": 0, "passed": 0}

            language_stats[lang]["total"] += 1
            region_stats[region]["total"] += 1

            if test["passed"]:
                language_stats[lang]["passed"] += 1
                region_stats[region]["passed"] += 1

        # Calculate success rates
        for lang, stats in language_stats.items():
            self.results.summary["language_performance"][lang] = (
                stats["passed"] / stats["total"]
            )

        for region, stats in region_stats.items():
            self.results.summary["region_performance"][region] = (
                stats["passed"] / stats["total"]
            )

        self._print_comprehensive_summary()

    def _print_comprehensive_summary(self):
        """Print detailed validation results"""
        print("\n" + "=" * 80)
        print("COMPREHENSIVE OCR VALIDATION RESULTS")
        print("=" * 80)

        summary = self.results.summary

        # Overall results
        overall_success_rate = summary["passed_tests"] / summary["total_tests"]
        print("\n📊 Overall Results:")
        print(f"   Total Tests: {summary['total_tests']}")
        print(f"   Passed: {summary['passed_tests']} ({overall_success_rate:.1%})")
        print(f"   Failed: {summary['failed_tests']}")

        # Service accuracy
        print("\n🎯 Service Accuracy:")
        for service, accuracy in summary["accuracy_by_service"].items():
            status = "✅" if accuracy >= 0.8 else "⚠️" if accuracy >= 0.6 else "❌"
            print(f"   {service:15}: {accuracy:.1%} {status}")

        # Performance metrics
        print("\n⚡ Performance Metrics:")
        for service, avg_time in summary["performance_metrics"].items():
            target = {"dates": 100, "barcodes": 150, "product_names": 200}.get(
                service, 200
            )
            status = (
                "✅" if avg_time < target else "⚠️" if avg_time < target * 1.5 else "❌"
            )
            print(f"   {service:15}: {avg_time:6.1f}ms (target: <{target}ms) {status}")

        # Language performance
        print("\n🌍 Language Performance:")
        for language, success_rate in summary["language_performance"].items():
            status = (
                "✅" if success_rate >= 0.8 else "⚠️" if success_rate >= 0.6 else "❌"
            )
            print(f"   {language:15}: {success_rate:.1%} {status}")

        # Region performance
        print("\n🏢 Region Performance:")
        for region, success_rate in summary["region_performance"].items():
            status = (
                "✅" if success_rate >= 0.8 else "⚠️" if success_rate >= 0.6 else "❌"
            )
            print(f"   {region:15}: {success_rate:.1%} {status}")

        # Failed tests details
        failed_tests = [
            test for test in self.results.test_results if not test["passed"]
        ]
        if failed_tests:
            print("\n❌ Failed Test Details:")
            for test in failed_tests:
                print(f"   {test['test_id']}: {test['description']}")

                # Show specific failures
                for service in ["dates", "barcodes", "product_names"]:
                    result = test["results"].get(service, {})
                    if not result.get("passed", True):
                        accuracy = result.get("accuracy", 0)
                        performance = result.get("performance_ms", 0)
                        print(
                            f"     {service}: {accuracy:.1%} accuracy, {performance:.1f}ms"
                        )

        # Insights and recommendations
        print("\n💡 Insights and Recommendations:")
        insights = []

        if overall_success_rate >= 0.9:
            insights.append("✅ Excellent overall performance across all test cases")
        elif overall_success_rate >= 0.8:
            insights.append("✅ Good overall performance with room for improvement")
        else:
            insights.append("❌ Performance needs improvement for production readiness")

        # Service-specific insights
        if summary["accuracy_by_service"].get("dates", 0) < 0.8:
            insights.append("📅 Date extraction accuracy needs improvement")
        if summary["accuracy_by_service"].get("barcodes", 0) < 0.9:
            insights.append("🔢 Barcode detection accuracy could be enhanced")
        if summary["accuracy_by_service"].get("product_names", 0) < 0.7:
            insights.append("🏷️ Product name extraction requires optimization")

        # Performance insights
        slow_services = [
            service
            for service, time in summary["performance_metrics"].items()
            if time
            > {"dates": 150, "barcodes": 200, "product_names": 300}.get(service, 200)
        ]
        if slow_services:
            insights.append(
                f"⚡ Performance optimization needed for: {', '.join(slow_services)}"
            )

        for insight in insights:
            print(f"   {insight}")

        print("\n🎉 Validation Complete!")

    async def export_detailed_results(
        self, filename: str = "ocr_validation_results.json"
    ):
        """Export detailed results to JSON file"""
        output_path = Path(__file__).parent / filename

        export_data = {
            "validation_summary": self.results.summary,
            "detailed_results": self.results.test_results,
            "dataset_info": self.test_dataset["test_dataset_info"],
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, indent=2, ensure_ascii=False)

        print(f"📁 Detailed results exported to: {output_path}")


async def main():
    """Run comprehensive OCR validation"""
    validator = ComprehensiveOCRValidator()
    await validator.run_comprehensive_validation()
    await validator.export_detailed_results()


if __name__ == "__main__":
    asyncio.run(main())
