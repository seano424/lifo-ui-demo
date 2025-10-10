"""
Comprehensive dataset analysis for food packaging images.
"""

import json
import asyncio
from pathlib import Path
from typing import Dict, List, Any, Tuple, Optional
from dataclasses import dataclass, asdict
import cv2
import numpy as np
from concurrent.futures import ThreadPoolExecutor
from collections import Counter

from ..config import DatasetConfig
from ..utils import (
    ProgressTracker,
    get_image_metadata,
    calculate_image_quality_score,
    get_logger,
)


@dataclass
class ImageAnalysis:
    """Results of image analysis for OCR suitability."""

    file_path: str
    filename: str
    width: int
    height: int
    size_bytes: int
    format: str
    quality_score: float
    has_text_regions: bool
    estimated_text_count: int
    dominant_colors: List[Tuple[int, int, int]]
    brightness_score: float
    contrast_score: float
    sharpness_score: float
    ocr_suitability: str  # "excellent", "good", "fair", "poor"


@dataclass
class DatasetStatistics:
    """Overall dataset statistics."""

    total_images: int
    valid_images: int
    invalid_images: int
    avg_quality_score: float
    language_distribution: Dict[str, int]
    format_distribution: Dict[str, int]
    size_distribution: Dict[str, int]
    ocr_suitability_distribution: Dict[str, int]
    avg_dimensions: Tuple[int, int]
    total_size_mb: float


class DatasetAnalyzer:
    """
    Comprehensive analyzer for food packaging image datasets.
    """

    def __init__(self, config: DatasetConfig):
        self.config = config
        self.logger = get_logger(__name__)
        self.executor = ThreadPoolExecutor(max_workers=4)

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if self.executor:
            self.executor.shutdown(wait=True)

    async def analyze_dataset(
        self, dataset_path: Path, progress_tracker: Optional[ProgressTracker] = None
    ) -> Dict[str, Any]:
        """
        Analyze complete dataset for OCR suitability and quality metrics.

        Args:
            dataset_path: Path to dataset directory
            progress_tracker: Optional progress tracker

        Returns:
            Comprehensive analysis report
        """
        # Find all image files
        image_files = self._find_image_files(dataset_path)

        if not image_files:
            self.logger.warning(f"No image files found in {dataset_path}")
            return {"error": "No image files found"}

        self.logger.info(f"Analyzing {len(image_files)} images...")

        # Create progress task
        task_name = None
        if progress_tracker:
            task_name = progress_tracker.add_task(
                "image_analysis",
                "Analyzing images for OCR suitability",
                total=len(image_files),
            )

        # Analyze images concurrently
        analysis_tasks = []
        for image_path in image_files:
            task = self._analyze_single_image(image_path, progress_tracker, task_name)
            analysis_tasks.append(task)

        # Execute analysis
        results = await asyncio.gather(*analysis_tasks, return_exceptions=True)

        # Filter successful results
        image_analyses = []
        for result in results:
            if isinstance(result, ImageAnalysis):
                image_analyses.append(result)
            elif isinstance(result, Exception):
                self.logger.debug(f"Image analysis failed: {result}")

        # Generate statistics
        statistics = self._calculate_statistics(image_analyses)

        # Create comprehensive report
        report = {
            "dataset_path": str(dataset_path),
            "analysis_timestamp": asyncio.get_event_loop().time(),
            "statistics": asdict(statistics),
            "image_analyses": [asdict(analysis) for analysis in image_analyses],
            "recommendations": self._generate_recommendations(
                statistics, image_analyses
            ),
        }

        # Save report
        report_path = (
            self.config.analysis_dir / f"dataset_analysis_{dataset_path.name}.json"
        )
        await self._save_report(report, report_path)

        return report

    def _find_image_files(self, dataset_path: Path) -> List[Path]:
        """Find all image files in dataset directory."""
        image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tiff"}
        image_files = []

        for ext in image_extensions:
            image_files.extend(dataset_path.rglob(f"*{ext}"))
            image_files.extend(dataset_path.rglob(f"*{ext.upper()}"))

        return sorted(image_files)

    async def _analyze_single_image(
        self,
        image_path: Path,
        progress_tracker: Optional[ProgressTracker],
        task_name: Optional[str],
    ) -> Optional[ImageAnalysis]:
        """Analyze a single image for OCR suitability."""
        try:
            # Run CPU-intensive analysis in thread executor
            loop = asyncio.get_event_loop()
            analysis = await loop.run_in_executor(
                self.executor, self._analyze_image_sync, image_path
            )

            if progress_tracker and task_name:
                progress_tracker.update(task_name, completed=True)

            return analysis

        except Exception as e:
            self.logger.debug(f"Error analyzing image {image_path}: {e}")
            if progress_tracker and task_name:
                progress_tracker.update(task_name, failed=True)
            return None

    def _analyze_image_sync(self, image_path: Path) -> ImageAnalysis:
        """Synchronous image analysis (runs in thread executor)."""
        # Get basic metadata
        metadata = get_image_metadata(image_path)

        # Calculate quality score
        quality_score = calculate_image_quality_score(image_path)

        # Load image for advanced analysis
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Cannot load image: {image_path}")

        # Convert to RGB for PIL
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Analyze dominant colors
        dominant_colors = self._extract_dominant_colors(image_rgb)

        # Calculate brightness and contrast
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        brightness_score = np.mean(gray) / 255.0
        contrast_score = np.std(gray) / 128.0

        # Calculate sharpness (Laplacian variance)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        sharpness_score = min(laplacian_var / 1000.0, 1.0)

        # Detect potential text regions
        text_regions, estimated_text_count = self._detect_text_regions_basic(gray)

        # Determine OCR suitability
        ocr_suitability = self._assess_ocr_suitability(
            quality_score,
            brightness_score,
            contrast_score,
            sharpness_score,
            estimated_text_count,
        )

        return ImageAnalysis(
            file_path=str(image_path),
            filename=image_path.name,
            width=metadata["width"],
            height=metadata["height"],
            size_bytes=metadata["size_bytes"],
            format=metadata["format"] or "unknown",
            quality_score=quality_score,
            has_text_regions=len(text_regions) > 0,
            estimated_text_count=estimated_text_count,
            dominant_colors=dominant_colors,
            brightness_score=brightness_score,
            contrast_score=contrast_score,
            sharpness_score=sharpness_score,
            ocr_suitability=ocr_suitability,
        )

    def _extract_dominant_colors(
        self, image: np.ndarray, num_colors: int = 5
    ) -> List[Tuple[int, int, int]]:
        """Extract dominant colors from image using K-means clustering."""
        try:
            # Reshape image to list of pixels
            pixels = image.reshape(-1, 3)

            # Use KMeans to find dominant colors
            from sklearn.cluster import KMeans

            kmeans = KMeans(n_clusters=num_colors, random_state=42, n_init=10)
            kmeans.fit(pixels)

            # Get dominant colors
            colors = kmeans.cluster_centers_.astype(int)
            return [tuple(color) for color in colors]

        except Exception:
            # Fallback: simple color analysis
            return [(128, 128, 128)]  # Gray fallback

    def _detect_text_regions_basic(
        self, gray_image: np.ndarray
    ) -> Tuple[List[Tuple], int]:
        """Basic text region detection using edge detection and morphology."""
        try:
            # Edge detection
            edges = cv2.Canny(gray_image, 50, 150)

            # Morphological operations to connect text components
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            dilated = cv2.dilate(edges, kernel, iterations=1)

            # Find contours
            contours, _ = cv2.findContours(
                dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            # Filter contours that might be text
            text_regions = []
            for contour in contours:
                x, y, w, h = cv2.boundingRect(contour)

                # Filter by size and aspect ratio (typical for text)
                if (
                    w > 10
                    and h > 8
                    and w < gray_image.shape[1] * 0.8
                    and h < gray_image.shape[0] * 0.3
                    and 0.1 < h / w < 3.0
                ):
                    text_regions.append((x, y, w, h))

            # Estimate text count based on regions
            estimated_text_count = min(
                len(text_regions), 50
            )  # Cap at reasonable number

            return text_regions, estimated_text_count

        except Exception:
            return [], 0

    def _assess_ocr_suitability(
        self,
        quality_score: float,
        brightness_score: float,
        contrast_score: float,
        sharpness_score: float,
        text_count: int,
    ) -> str:
        """Assess overall OCR suitability based on various metrics."""
        # Normalize brightness score (ideal around 0.4-0.7)
        brightness_penalty = abs(brightness_score - 0.55) * 2
        normalized_brightness = max(0, 1 - brightness_penalty)

        # Combined score
        ocr_score = (
            quality_score * 0.3
            + normalized_brightness * 0.2
            + contrast_score * 0.2
            + sharpness_score * 0.2
            + min(text_count / 10.0, 1.0) * 0.1
        )

        if ocr_score >= 0.8:
            return "excellent"
        elif ocr_score >= 0.6:
            return "good"
        elif ocr_score >= 0.4:
            return "fair"
        else:
            return "poor"

    def _calculate_statistics(self, analyses: List[ImageAnalysis]) -> DatasetStatistics:
        """Calculate comprehensive dataset statistics."""
        if not analyses:
            return DatasetStatistics(
                total_images=0,
                valid_images=0,
                invalid_images=0,
                avg_quality_score=0.0,
                language_distribution={},
                format_distribution={},
                size_distribution={},
                ocr_suitability_distribution={},
                avg_dimensions=(0, 0),
                total_size_mb=0.0,
            )

        # Basic counts
        total_images = len(analyses)
        valid_images = len([a for a in analyses if a.quality_score > 0.3])
        invalid_images = total_images - valid_images

        # Quality metrics
        avg_quality_score = sum(a.quality_score for a in analyses) / total_images

        # Format distribution
        format_counter = Counter(a.format for a in analyses)
        format_distribution = dict(format_counter)

        # Size distribution (in MB)
        size_categories = {"small": 0, "medium": 0, "large": 0}
        for analysis in analyses:
            size_mb = analysis.size_bytes / (1024 * 1024)
            if size_mb < 0.5:
                size_categories["small"] += 1
            elif size_mb < 2.0:
                size_categories["medium"] += 1
            else:
                size_categories["large"] += 1

        # OCR suitability distribution
        ocr_counter = Counter(a.ocr_suitability for a in analyses)
        ocr_suitability_distribution = dict(ocr_counter)

        # Average dimensions
        avg_width = sum(a.width for a in analyses) / total_images
        avg_height = sum(a.height for a in analyses) / total_images

        # Total size
        total_size_mb = sum(a.size_bytes for a in analyses) / (1024 * 1024)

        # Language analysis (placeholder - would need actual text extraction)
        language_distribution = {"unknown": total_images}

        return DatasetStatistics(
            total_images=total_images,
            valid_images=valid_images,
            invalid_images=invalid_images,
            avg_quality_score=avg_quality_score,
            language_distribution=language_distribution,
            format_distribution=format_distribution,
            size_distribution=size_categories,
            ocr_suitability_distribution=ocr_suitability_distribution,
            avg_dimensions=(int(avg_width), int(avg_height)),
            total_size_mb=total_size_mb,
        )

    def _generate_recommendations(
        self, statistics: DatasetStatistics, analyses: List[ImageAnalysis]
    ) -> Dict[str, List[str]]:
        """Generate recommendations based on dataset analysis."""
        recommendations = {
            "quality_improvements": [],
            "ocr_optimization": [],
            "dataset_curation": [],
            "technical_notes": [],
        }

        # Quality recommendations
        if statistics.avg_quality_score < 0.5:
            recommendations["quality_improvements"].append(
                "Overall image quality is low. Consider filtering out images with quality scores below 0.3"
            )

        poor_quality_count = statistics.ocr_suitability_distribution.get("poor", 0)
        if poor_quality_count > statistics.total_images * 0.3:
            recommendations["quality_improvements"].append(
                f"{poor_quality_count} images ({poor_quality_count / statistics.total_images * 100:.1f}%) "
                "have poor OCR suitability. Consider removing them from training data."
            )

        # OCR optimization
        excellent_count = statistics.ocr_suitability_distribution.get("excellent", 0)
        if excellent_count < statistics.total_images * 0.2:
            recommendations["ocr_optimization"].append(
                "Low number of excellent OCR candidates. Consider preprocessing images to enhance contrast and sharpness."
            )

        # Dataset curation
        if statistics.invalid_images > 0:
            recommendations["dataset_curation"].append(
                f"Remove {statistics.invalid_images} invalid images from the dataset."
            )

        # Technical notes
        avg_w, avg_h = statistics.avg_dimensions
        if avg_w < 400 or avg_h < 400:
            recommendations["technical_notes"].append(
                f"Average image dimensions ({avg_w}x{avg_h}) are quite small. "
                "Consider upscaling or focusing on higher resolution images for better OCR results."
            )

        return recommendations

    async def _save_report(self, report: Dict[str, Any], output_path: Path) -> None:
        """Save analysis report to JSON file."""
        output_path.parent.mkdir(parents=True, exist_ok=True)

        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, ensure_ascii=False)

        self.logger.info(f"Dataset analysis report saved to {output_path}")

    async def create_validation_subset(
        self,
        analyses: List[ImageAnalysis],
        subset_size: int = 100,
        quality_threshold: float = 0.6,
    ) -> Dict[str, Any]:
        """
        Create a validation subset with high-quality images for OCR testing.

        Args:
            analyses: List of image analyses
            subset_size: Number of images in validation subset
            quality_threshold: Minimum quality score for inclusion

        Returns:
            Information about created validation subset
        """
        # Filter high-quality images
        high_quality = [
            a
            for a in analyses
            if a.quality_score >= quality_threshold
            and a.ocr_suitability in ["excellent", "good"]
        ]

        if len(high_quality) < subset_size:
            self.logger.warning(
                f"Only {len(high_quality)} high-quality images found, "
                f"requested {subset_size} for validation subset"
            )
            subset_size = len(high_quality)

        # Sort by quality and select diverse subset
        high_quality.sort(key=lambda x: x.quality_score, reverse=True)

        # Take every nth image to ensure diversity
        step = max(1, len(high_quality) // subset_size)
        validation_subset = high_quality[::step][:subset_size]

        # Create validation directory and copy files
        validation_dir = self.config.output_dir / "validation_subset"
        validation_dir.mkdir(parents=True, exist_ok=True)

        copied_files = []
        for i, analysis in enumerate(validation_subset):
            source_path = Path(analysis.file_path)
            dest_path = validation_dir / f"val_{i:04d}_{source_path.name}"

            # Copy file (using sync I/O for simplicity)
            import shutil

            shutil.copy2(source_path, dest_path)
            copied_files.append(str(dest_path))

        # Save subset metadata
        subset_metadata = {
            "total_selected": len(validation_subset),
            "selection_criteria": {
                "min_quality_score": quality_threshold,
                "ocr_suitability": ["excellent", "good"],
            },
            "avg_quality_score": sum(a.quality_score for a in validation_subset)
            / len(validation_subset),
            "files": [
                {
                    "filename": Path(a.file_path).name,
                    "validation_filename": Path(copied_files[i]).name,
                    "quality_score": a.quality_score,
                    "ocr_suitability": a.ocr_suitability,
                    "estimated_text_count": a.estimated_text_count,
                }
                for i, a in enumerate(validation_subset)
            ],
        }

        metadata_path = validation_dir / "validation_metadata.json"
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(subset_metadata, f, indent=2)

        self.logger.info(
            f"Created validation subset with {len(validation_subset)} images in {validation_dir}"
        )

        return {
            "validation_directory": str(validation_dir),
            "files_count": len(validation_subset),
            "avg_quality": subset_metadata["avg_quality_score"],
            "metadata_file": str(metadata_path),
        }
