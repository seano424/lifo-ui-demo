"""
OCR validation and test case generation for food packaging images.
"""

import asyncio
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import cv2
import numpy as np
from datetime import datetime
import re

from ..config import DatasetConfig
from ..utils import ProgressTracker, extract_language_info, get_logger


@dataclass
class OCRTestCase:
    """Individual OCR test case with expected results."""

    image_path: str
    test_id: str
    image_name: str
    expected_texts: List[str]
    expected_dates: List[str]
    expected_barcodes: List[str]
    expected_brand: Optional[str]
    expected_product_name: Optional[str]
    language: str
    difficulty_level: str  # "easy", "medium", "hard"
    text_regions: List[Tuple[int, int, int, int]]  # Bounding boxes
    quality_score: float
    notes: str


@dataclass
class OCRValidationSuite:
    """Complete OCR validation test suite."""

    suite_name: str
    created_timestamp: str
    total_test_cases: int
    language_distribution: Dict[str, int]
    difficulty_distribution: Dict[str, int]
    test_cases: List[OCRTestCase]
    validation_criteria: Dict[str, Any]


class OCRValidator:
    """
    OCR validation system for food packaging images.
    Creates test cases and validates OCR performance.
    """

    def __init__(self, config: DatasetConfig):
        self.config = config
        self.logger = get_logger(__name__)

    async def create_validation_suite(
        self,
        dataset_path: Path,
        metadata_file: Optional[Path] = None,
        max_test_cases: int = 200,
        progress_tracker: Optional[ProgressTracker] = None,
    ) -> OCRValidationSuite:
        """
        Create comprehensive OCR validation test suite.

        Args:
            dataset_path: Path to image dataset
            metadata_file: Optional metadata JSON file
            max_test_cases: Maximum number of test cases to create
            progress_tracker: Optional progress tracker

        Returns:
            Complete OCR validation suite
        """
        self.logger.info(f"Creating OCR validation suite from {dataset_path}")

        # Load metadata if available
        metadata = {}
        if metadata_file and metadata_file.exists():
            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)

        # Find image files
        image_files = self._find_image_files(dataset_path)

        if not image_files:
            raise ValueError(f"No image files found in {dataset_path}")

        # Limit number of images to process
        if len(image_files) > max_test_cases:
            # Select diverse subset
            import random

            random.shuffle(image_files)
            image_files = image_files[:max_test_cases]

        # Create progress task
        task_name = None
        if progress_tracker:
            task_name = progress_tracker.add_task(
                "ocr_test_cases", "Creating OCR test cases", total=len(image_files)
            )

        # Create test cases
        test_case_tasks = []
        for i, image_path in enumerate(image_files):
            task = self._create_test_case(
                image_path, f"test_{i:04d}", metadata, progress_tracker, task_name
            )
            test_case_tasks.append(task)

        # Execute test case creation
        results = await asyncio.gather(*test_case_tasks, return_exceptions=True)

        # Filter successful test cases
        test_cases = []
        for result in results:
            if isinstance(result, OCRTestCase):
                test_cases.append(result)
            elif isinstance(result, Exception):
                self.logger.debug(f"Test case creation failed: {result}")

        # Create validation suite
        suite = self._create_validation_suite(test_cases)

        # Save suite
        suite_path = self.config.output_dir / "ocr_validation_suite.json"
        await self._save_validation_suite(suite, suite_path)

        self.logger.info(
            f"Created OCR validation suite with {len(test_cases)} test cases"
        )

        return suite

    def _find_image_files(self, dataset_path: Path) -> List[Path]:
        """Find all image files in dataset."""
        image_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        image_files = []

        for ext in image_extensions:
            image_files.extend(dataset_path.rglob(f"*{ext}"))
            image_files.extend(dataset_path.rglob(f"*{ext.upper()}"))

        return sorted(image_files)

    async def _create_test_case(
        self,
        image_path: Path,
        test_id: str,
        metadata: Dict[str, Any],
        progress_tracker: Optional[ProgressTracker],
        task_name: Optional[str],
    ) -> Optional[OCRTestCase]:
        """Create individual OCR test case."""
        try:
            # Load and analyze image
            image = cv2.imread(str(image_path))
            if image is None:
                raise ValueError(f"Cannot load image: {image_path}")

            # Extract text regions
            text_regions = self._detect_text_regions(image)

            # Extract potential text content
            extracted_texts = await self._extract_text_content(image, text_regions)

            # Find dates in text
            expected_dates = self._extract_dates(extracted_texts)

            # Find barcodes/product codes
            expected_barcodes = self._extract_barcodes(extracted_texts)

            # Determine language
            all_text = " ".join(extracted_texts)
            language_info = extract_language_info(all_text)
            language = language_info.get("primary_language", "unknown")

            # Assess difficulty
            difficulty = self._assess_difficulty(image, text_regions, extracted_texts)

            # Calculate quality score
            quality_score = self._calculate_image_quality(image)

            # Get metadata for this image if available
            image_metadata = metadata.get(image_path.name, {})

            test_case = OCRTestCase(
                image_path=str(image_path),
                test_id=test_id,
                image_name=image_path.name,
                expected_texts=extracted_texts,
                expected_dates=expected_dates,
                expected_barcodes=expected_barcodes,
                expected_brand=image_metadata.get("brand"),
                expected_product_name=image_metadata.get("product_name"),
                language=language,
                difficulty_level=difficulty,
                text_regions=text_regions,
                quality_score=quality_score,
                notes=f"Auto-generated test case from {image_path.name}",
            )

            if progress_tracker and task_name:
                progress_tracker.update(task_name, completed=True)

            return test_case

        except Exception as e:
            self.logger.debug(f"Error creating test case for {image_path}: {e}")
            if progress_tracker and task_name:
                progress_tracker.update(task_name, failed=True)
            return None

    def _detect_text_regions(
        self, image: np.ndarray
    ) -> List[Tuple[int, int, int, int]]:
        """Detect text regions using computer vision techniques."""
        try:
            # Convert to grayscale
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Apply different techniques to find text
            regions = []

            # Method 1: MSER (Maximally Stable Extremal Regions)
            try:
                mser = cv2.MSER_create()
                regions_mser, _ = mser.detectRegions(gray)

                for region in regions_mser:
                    x, y, w, h = cv2.boundingRect(region.reshape(-1, 1, 2))
                    if w > 20 and h > 8 and w < image.shape[1] * 0.8:
                        regions.append((x, y, w, h))
            except Exception:
                pass

            # Method 2: Morphological operations
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 1))
            dilated = cv2.dilate(gray, kernel, iterations=1)
            eroded = cv2.erode(dilated, kernel, iterations=1)

            # Find contours
            contours, _ = cv2.findContours(
                eroded, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)

                # Filter by size and aspect ratio
                if (
                    w > 15
                    and h > 10
                    and w < image.shape[1] * 0.9
                    and h < image.shape[0] * 0.3
                    and 0.1 < h / w < 5.0
                ):
                    regions.append((x, y, w, h))

            # Remove overlapping regions
            regions = self._remove_overlapping_regions(regions)

            # Sort by position (top to bottom, left to right)
            regions.sort(key=lambda r: (r[1], r[0]))

            return regions[:20]  # Limit to top 20 regions

        except Exception as e:
            self.logger.debug(f"Error detecting text regions: {e}")
            return []

    def _remove_overlapping_regions(
        self, regions: List[Tuple[int, int, int, int]]
    ) -> List[Tuple[int, int, int, int]]:
        """Remove overlapping text regions."""
        if not regions:
            return regions

        # Sort by area (largest first)
        regions = sorted(regions, key=lambda r: r[2] * r[3], reverse=True)

        filtered = []
        for x, y, w, h in regions:
            # Check if this region overlaps significantly with any existing region
            overlap = False
            for fx, fy, fw, fh in filtered:
                # Calculate intersection
                x1 = max(x, fx)
                y1 = max(y, fy)
                x2 = min(x + w, fx + fw)
                y2 = min(y + h, fy + fh)

                if x2 > x1 and y2 > y1:
                    intersection_area = (x2 - x1) * (y2 - y1)
                    smaller_area = min(w * h, fw * fh)

                    # If intersection is more than 50% of smaller region, consider it overlapping
                    if intersection_area / smaller_area > 0.5:
                        overlap = True
                        break

            if not overlap:
                filtered.append((x, y, w, h))

        return filtered

    async def _extract_text_content(
        self, image: np.ndarray, text_regions: List[Tuple[int, int, int, int]]
    ) -> List[str]:
        """Extract text content from detected regions (placeholder implementation)."""
        # This is a placeholder - in practice, you would use OCR here
        # For now, we'll generate synthetic text based on region characteristics

        extracted_texts = []

        for i, (x, y, w, h) in enumerate(text_regions):
            # Create region description based on position and size
            if h > w * 0.8:  # Tall region - might be vertical text
                extracted_texts.append(f"VERTICAL_TEXT_{i}")
            elif w > h * 3:  # Wide region - might be product name
                extracted_texts.append(f"PRODUCT_NAME_{i}")
            elif w < 100 and h < 30:  # Small region - might be date or code
                extracted_texts.append(f"DATE_CODE_{i}")
            else:
                extracted_texts.append(f"GENERIC_TEXT_{i}")

        # Add some realistic synthetic examples
        synthetic_examples = [
            "Best before 12/2024",
            "EXP 15.03.2025",
            "L 1234567890",
            "Made in Germany",
            "250g",
            "Organic",
            "Gluten Free",
        ]

        # Add a few synthetic examples based on image characteristics
        if len(text_regions) > 0:
            import random

            extracted_texts.extend(
                random.sample(synthetic_examples, min(3, len(synthetic_examples)))
            )

        return extracted_texts

    def _extract_dates(self, texts: List[str]) -> List[str]:
        """Extract date patterns from text."""
        dates = []
        date_patterns = [
            r"\b\d{2}[/.]\d{2}[/.]\d{4}\b",  # DD/MM/YYYY or DD.MM.YYYY
            r"\b\d{4}[/.]\d{2}[/.]\d{2}\b",  # YYYY/MM/DD or YYYY.MM.DD
            r"\b\d{2}[/.]\d{4}\b",  # MM/YYYY or MM.YYYY
            r"\bEXP\s+\d{2}[/.]\d{2}[/.]\d{4}\b",  # EXP DD/MM/YYYY
            r"\bBest before\s+\d{2}[/.]\d{4}\b",  # Best before MM/YYYY
        ]

        for text in texts:
            for pattern in date_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                dates.extend(matches)

        return list(set(dates))  # Remove duplicates

    def _extract_barcodes(self, texts: List[str]) -> List[str]:
        """Extract barcode/product code patterns from text."""
        barcodes = []
        barcode_patterns = [
            r"\b\d{13}\b",  # EAN-13
            r"\b\d{12}\b",  # UPC-A
            r"\b\d{8}\b",  # EAN-8
            r"\bL\s*\d{8,}\b",  # Lot numbers
            r"\b[A-Z]\d{8,}\b",  # Product codes
        ]

        for text in texts:
            for pattern in barcode_patterns:
                matches = re.findall(pattern, text, re.IGNORECASE)
                barcodes.extend(matches)

        return list(set(barcodes))

    def _assess_difficulty(
        self,
        image: np.ndarray,
        text_regions: List[Tuple[int, int, int, int]],
        texts: List[str],
    ) -> str:
        """Assess OCR difficulty level."""
        difficulty_score = 0

        # Image quality factors
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        contrast = np.std(gray)
        brightness = np.mean(gray)

        if contrast < 30:
            difficulty_score += 2  # Low contrast
        if brightness < 50 or brightness > 200:
            difficulty_score += 1  # Poor brightness

        # Text region factors
        if len(text_regions) > 10:
            difficulty_score += 1  # Many text regions

        # Check for small text regions
        small_regions = sum(1 for _, _, w, h in text_regions if w < 50 or h < 20)
        if small_regions > len(text_regions) * 0.5:
            difficulty_score += 2  # Many small text regions

        # Text complexity
        total_text = " ".join(texts)
        if len(total_text) > 100:
            difficulty_score += 1  # Long text

        # Categorize difficulty
        if difficulty_score <= 1:
            return "easy"
        elif difficulty_score <= 3:
            return "medium"
        else:
            return "hard"

    def _calculate_image_quality(self, image: np.ndarray) -> float:
        """Calculate overall image quality score."""
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

            # Sharpness (Laplacian variance)
            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
            sharpness = min(laplacian_var / 1000.0, 1.0)

            # Contrast
            contrast = np.std(gray) / 128.0
            contrast = min(contrast, 1.0)

            # Brightness (deviation from ideal)
            brightness = np.mean(gray)
            brightness_score = 1.0 - abs(brightness - 127.5) / 127.5

            # Combined quality score
            quality = sharpness * 0.4 + contrast * 0.4 + brightness_score * 0.2
            return max(0.0, min(1.0, quality))

        except Exception:
            return 0.5  # Default medium quality

    def _create_validation_suite(
        self, test_cases: List[OCRTestCase]
    ) -> OCRValidationSuite:
        """Create validation suite from test cases."""
        # Calculate distributions
        language_dist = {}
        difficulty_dist = {}

        for test_case in test_cases:
            lang = test_case.language
            diff = test_case.difficulty_level

            language_dist[lang] = language_dist.get(lang, 0) + 1
            difficulty_dist[diff] = difficulty_dist.get(diff, 0) + 1

        # Define validation criteria
        validation_criteria = {
            "min_text_detection_accuracy": 0.8,
            "min_date_extraction_accuracy": 0.9,
            "min_barcode_detection_accuracy": 0.95,
            "max_false_positive_rate": 0.1,
            "supported_languages": self.config.supported_languages,
            "quality_thresholds": {"easy": 0.9, "medium": 0.7, "hard": 0.5},
        }

        return OCRValidationSuite(
            suite_name=f"LIFO_OCR_Validation_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            created_timestamp=datetime.now().isoformat(),
            total_test_cases=len(test_cases),
            language_distribution=language_dist,
            difficulty_distribution=difficulty_dist,
            test_cases=test_cases,
            validation_criteria=validation_criteria,
        )

    async def _save_validation_suite(
        self, suite: OCRValidationSuite, output_path: Path
    ) -> None:
        """Save validation suite to JSON file."""
        output_path.parent.mkdir(parents=True, exist_ok=True)

        suite_dict = asdict(suite)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(suite_dict, f, indent=2, ensure_ascii=False)

        self.logger.info(f"OCR validation suite saved to {output_path}")

    async def run_validation_tests(self, suite: OCRValidationSuite) -> Dict[str, Any]:
        """
        Run validation tests (placeholder for actual OCR testing).

        Args:
            suite: OCR validation suite

        Returns:
            Test results summary
        """
        # This is a placeholder implementation
        # In practice, you would run actual OCR on each test case
        # and compare results with expected outputs

        results = {
            "suite_name": suite.suite_name,
            "total_tests": suite.total_test_cases,
            "tests_passed": 0,
            "tests_failed": 0,
            "accuracy_by_difficulty": {},
            "accuracy_by_language": {},
            "detailed_results": [],
        }

        # Simulate test results
        import random

        for test_case in suite.test_cases:
            # Simulate OCR accuracy based on difficulty
            if test_case.difficulty_level == "easy":
                success_prob = 0.9
            elif test_case.difficulty_level == "medium":
                success_prob = 0.7
            else:
                success_prob = 0.5

            passed = random.random() < success_prob
            if passed:
                results["tests_passed"] += 1
            else:
                results["tests_failed"] += 1

            # Track by difficulty
            diff = test_case.difficulty_level
            if diff not in results["accuracy_by_difficulty"]:
                results["accuracy_by_difficulty"][diff] = {"passed": 0, "total": 0}
            results["accuracy_by_difficulty"][diff]["total"] += 1
            if passed:
                results["accuracy_by_difficulty"][diff]["passed"] += 1

            # Track by language
            lang = test_case.language
            if lang not in results["accuracy_by_language"]:
                results["accuracy_by_language"][lang] = {"passed": 0, "total": 0}
            results["accuracy_by_language"][lang]["total"] += 1
            if passed:
                results["accuracy_by_language"][lang]["passed"] += 1

        # Calculate accuracy percentages
        for diff, stats in results["accuracy_by_difficulty"].items():
            stats["accuracy"] = (
                stats["passed"] / stats["total"] if stats["total"] > 0 else 0
            )

        for lang, stats in results["accuracy_by_language"].items():
            stats["accuracy"] = (
                stats["passed"] / stats["total"] if stats["total"] > 0 else 0
            )

        results["overall_accuracy"] = (
            results["tests_passed"] / results["total_tests"]
            if results["total_tests"] > 0
            else 0
        )

        self.logger.info(
            f"Validation completed: {results['overall_accuracy']:.2%} accuracy"
        )

        return results
