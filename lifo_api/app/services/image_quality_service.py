"""
Image Quality Assessment Service for OCR Optimization
Provides comprehensive image quality analysis to improve OCR accuracy
"""

import logging
import numpy as np
from dataclasses import dataclass
from enum import Enum
import asyncio
from concurrent.futures import ThreadPoolExecutor
import io
from PIL import Image

# Import OpenCV with fallback handling
from app.core.opencv_fallback import (
    safe_cv2_import,
    safe_laplacian_variance,
    safe_rgb_to_grayscale,
    pil_to_cv2_fallback,
)

logger = logging.getLogger(__name__)


class QualityLevel(Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"
    UNUSABLE = "unusable"


class IssueType(Enum):
    BLUR = "blur"
    LOW_RESOLUTION = "low_resolution"
    POOR_CONTRAST = "poor_contrast"
    OVEREXPOSURE = "overexposure"
    UNDEREXPOSURE = "underexposure"
    NOISE = "noise"
    ROTATION = "rotation"
    PERSPECTIVE_DISTORTION = "perspective_distortion"


@dataclass
class QualityIssue:
    issue_type: IssueType
    severity: float  # 0.0 (minor) to 1.0 (severe)
    description: str
    suggestion: str


@dataclass
class ImageQualityMetrics:
    blur_score: float  # Higher = sharper (Laplacian variance)
    resolution_score: float  # Based on pixel density and text detectability
    contrast_score: float  # RMS contrast measure
    brightness_score: float  # Average brightness (0-255)
    noise_score: float  # Signal-to-noise ratio estimate
    rotation_angle: float  # Detected rotation in degrees
    perspective_score: float  # Perspective distortion measure
    text_area_ratio: float  # Ratio of image containing detectable text


@dataclass
class ImageQualityAssessment:
    overall_quality: QualityLevel
    confidence: float  # 0.0 to 1.0
    metrics: ImageQualityMetrics
    issues: list[QualityIssue]
    recommendations: list[str]
    ocr_readiness_score: float  # 0.0 to 1.0, specific to OCR tasks


class ImageQualityService:
    """Service for comprehensive image quality assessment optimized for OCR tasks"""

    def __init__(self):
        self.executor = ThreadPoolExecutor(
            max_workers=2, thread_name_prefix="quality_assessment"
        )

        # Quality thresholds for OCR optimization
        self.thresholds = {
            "blur_minimum": 100.0,  # Laplacian variance threshold
            "blur_good": 500.0,
            "blur_excellent": 1000.0,
            "resolution_minimum": 300,  # Minimum DPI equivalent
            "resolution_good": 600,
            "contrast_minimum": 30.0,  # RMS contrast
            "contrast_good": 60.0,
            "brightness_optimal_min": 80,  # Optimal brightness range
            "brightness_optimal_max": 180,
            "noise_acceptable": 20.0,  # dB SNR
            "rotation_tolerance": 2.0,  # degrees
            "text_area_minimum": 0.1,  # 10% of image should contain text
        }

    async def assess_image_quality(
        self, image_data: bytes, focus_areas: list[dict] | None = None
    ) -> ImageQualityAssessment:
        """
        Comprehensive image quality assessment for OCR optimization

        Args:
            image_data: Raw image bytes
            focus_areas: Optional list of bounding boxes to focus analysis on

        Returns:
            Complete quality assessment with OCR-specific recommendations
        """
        try:
            # Run quality analysis in thread pool for CPU-intensive operations
            loop = asyncio.get_event_loop()
            assessment = await loop.run_in_executor(
                self.executor, self._analyze_image_quality, image_data, focus_areas
            )

            logger.info(
                f"Image quality assessment completed: {assessment.overall_quality.value} "
                f"(OCR readiness: {assessment.ocr_readiness_score:.2f})"
            )

            return assessment

        except Exception as e:
            logger.error(f"Image quality assessment failed: {str(e)}")
            # Return minimal assessment on failure
            return ImageQualityAssessment(
                overall_quality=QualityLevel.POOR,
                confidence=0.0,
                metrics=self._get_default_metrics(),
                issues=[
                    QualityIssue(
                        issue_type=IssueType.NOISE,
                        severity=1.0,
                        description="Assessment failed",
                        suggestion="Retake image with better conditions",
                    )
                ],
                recommendations=[
                    "Retake image",
                    "Ensure good lighting",
                    "Hold device steady",
                ],
                ocr_readiness_score=0.0,
            )

    def _analyze_image_quality(
        self, image_data: bytes, focus_areas: list[dict] | None = None
    ) -> ImageQualityAssessment:
        """Internal method for comprehensive quality analysis"""

        # Load image for analysis
        image_pil = Image.open(io.BytesIO(image_data))

        # Try OpenCV, fallback to PIL if needed
        cv2 = safe_cv2_import()
        if cv2 is not None:
            try:
                image_cv = cv2.imdecode(
                    np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR
                )
                gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
            except Exception as e:
                logger.warning(
                    f"OpenCV image processing failed: {e}, using PIL fallback"
                )
                image_cv = pil_to_cv2_fallback(image_pil)
                gray = safe_rgb_to_grayscale(image_cv)
        else:
            logger.info("OpenCV not available, using PIL-based processing")
            image_cv = pil_to_cv2_fallback(image_pil)
            gray = safe_rgb_to_grayscale(image_cv)

        # Calculate comprehensive metrics
        metrics = self._calculate_quality_metrics(
            image_pil, image_cv, gray, focus_areas
        )

        # Identify quality issues
        issues = self._identify_quality_issues(metrics)

        # Generate OCR-specific recommendations
        recommendations = self._generate_recommendations(metrics, issues)

        # Calculate overall quality and OCR readiness
        overall_quality, confidence = self._calculate_overall_quality(metrics, issues)
        ocr_readiness_score = self._calculate_ocr_readiness(metrics, issues)

        return ImageQualityAssessment(
            overall_quality=overall_quality,
            confidence=confidence,
            metrics=metrics,
            issues=issues,
            recommendations=recommendations,
            ocr_readiness_score=ocr_readiness_score,
        )

    def _calculate_quality_metrics(
        self,
        image_pil: Image.Image,
        image_cv: np.ndarray,
        gray: np.ndarray,
        focus_areas: list[dict] | None = None,
    ) -> ImageQualityMetrics:
        """Calculate comprehensive quality metrics"""

        # Blur detection using Laplacian variance (with fallback)
        blur_score = safe_laplacian_variance(gray)

        # Resolution assessment
        height, width = gray.shape
        pixel_count = height * width
        resolution_score = min(pixel_count / 1000000 * 300, 1200)  # Approximate DPI

        # Contrast measurement using RMS contrast
        contrast_score = gray.std()

        # Brightness analysis
        brightness_score = gray.mean()

        # Noise estimation using high-frequency content
        noise_score = self._estimate_noise(gray)

        # Rotation detection
        rotation_angle = self._detect_rotation(gray)

        # Perspective distortion assessment
        perspective_score = self._assess_perspective_distortion(gray)

        # Text area estimation
        text_area_ratio = self._estimate_text_area(gray, focus_areas)

        return ImageQualityMetrics(
            blur_score=blur_score,
            resolution_score=resolution_score,
            contrast_score=contrast_score,
            brightness_score=brightness_score,
            noise_score=noise_score,
            rotation_angle=rotation_angle,
            perspective_score=perspective_score,
            text_area_ratio=text_area_ratio,
        )

    def _estimate_noise(self, gray: np.ndarray) -> float:
        """Estimate image noise using high-frequency analysis"""
        # Apply high-pass filter to isolate noise
        kernel = np.array([[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]], dtype=np.float64)

        cv2 = safe_cv2_import()
        if cv2 is not None:
            try:
                high_freq = cv2.filter2D(gray, -1, kernel)
            except Exception as e:
                logger.warning(f"OpenCV filter failed: {e}, using fallback")
                # Fallback using scipy or manual convolution
                try:
                    from scipy import ndimage

                    high_freq = ndimage.convolve(gray.astype(np.float64), kernel)
                except ImportError:
                    # Manual convolution fallback
                    high_freq = self._manual_convolution(
                        gray.astype(np.float64), kernel
                    )
        else:
            # Use fallback convolution
            try:
                from scipy import ndimage

                high_freq = ndimage.convolve(gray.astype(np.float64), kernel)
            except ImportError:
                high_freq = self._manual_convolution(gray.astype(np.float64), kernel)

        # Calculate signal-to-noise ratio approximation
        signal_power = np.mean(gray.astype(float) ** 2)
        noise_power = np.mean(high_freq.astype(float) ** 2)

        if noise_power > 0:
            snr_db = 10 * np.log10(signal_power / noise_power)
            return max(0, min(50, snr_db))  # Clamp to reasonable range
        return 50.0  # Perfect case

    def _manual_convolution(self, image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
        """Manual convolution implementation as fallback"""
        kernel_h, kernel_w = kernel.shape
        pad_h, pad_w = kernel_h // 2, kernel_w // 2

        # Pad image
        padded = np.pad(image, ((pad_h, pad_h), (pad_w, pad_w)), mode="edge")

        # Initialize output
        output = np.zeros_like(image)

        # Apply convolution
        for i in range(image.shape[0]):
            for j in range(image.shape[1]):
                region = padded[i : i + kernel_h, j : j + kernel_w]
                output[i, j] = np.sum(region * kernel)

        return output

    def _detect_rotation(self, gray: np.ndarray) -> float:
        """Detect image rotation using Hough line transform"""
        try:
            cv2 = safe_cv2_import()
            if cv2 is not None:
                # Edge detection
                edges = cv2.Canny(gray, 50, 150, apertureSize=3)
                # Hough line detection
                lines = cv2.HoughLines(edges, 1, np.pi / 180, threshold=100)
            else:
                logger.info(
                    "OpenCV not available for rotation detection, using gradient-based fallback"
                )
                return self._detect_rotation_fallback(gray)

            if lines is not None and len(lines) > 5:
                angles = []
                for rho, theta in lines[:20]:  # Use top 20 lines
                    angle_deg = np.degrees(theta) - 90
                    # Normalize to [-45, 45] range
                    if angle_deg > 45:
                        angle_deg -= 90
                    elif angle_deg < -45:
                        angle_deg += 90
                    angles.append(angle_deg)

                # Use median angle to reduce outlier impact
                return float(np.median(angles))

            return 0.0

        except Exception:
            return 0.0

    def _detect_rotation_fallback(self, gray: np.ndarray) -> float:
        """Fallback rotation detection using gradients"""
        try:
            # Calculate horizontal and vertical gradients
            grad_x = np.gradient(gray.astype(np.float64), axis=1)
            grad_y = np.gradient(gray.astype(np.float64), axis=0)

            # Calculate gradient angles
            angles = np.arctan2(grad_y, grad_x) * 180 / np.pi

            # Find dominant angle (simplified approach)
            # In a properly aligned image, most gradients should be horizontal/vertical
            angle_hist, bins = np.histogram(angles, bins=180, range=(-90, 90))

            # Find the most common angle
            dominant_angle_idx = np.argmax(angle_hist)
            dominant_angle = bins[dominant_angle_idx]

            # Normalize to [-45, 45] range
            if dominant_angle > 45:
                dominant_angle -= 90
            elif dominant_angle < -45:
                dominant_angle += 90

            return float(dominant_angle)

        except Exception:
            return 0.0

    def _assess_perspective_distortion(self, gray: np.ndarray) -> float:
        """Assess perspective distortion by analyzing rectangular structures"""
        try:
            cv2 = safe_cv2_import()
            if cv2 is not None:
                # Find contours
                edges = cv2.Canny(gray, 50, 150)
                contours, _ = cv2.findContours(
                    edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
                )
            else:
                logger.info(
                    "OpenCV not available for perspective analysis, using simplified fallback"
                )
                return self._assess_perspective_fallback(gray)

            if not contours:
                return 1.0  # Perfect score if no contours found

            distortion_scores = []
            for contour in contours[:10]:  # Analyze top 10 contours
                area = cv2.contourArea(contour)
                if area > 1000:  # Only consider significant contours
                    # Approximate contour to polygon
                    epsilon = 0.02 * cv2.arcLength(contour, True)
                    approx = cv2.approxPolyDP(contour, epsilon, True)

                    if len(approx) == 4:  # Quadrilateral
                        # Calculate aspect ratio consistency
                        rect = cv2.boundingRect(approx)
                        # aspect_ratio = rect[2] / rect[3] if rect[3] > 0 else 1.0

                        # Score based on how "rectangular" the quad is
                        hull_area = cv2.contourArea(approx)
                        rect_area = rect[2] * rect[3]
                        rectangularity = hull_area / rect_area if rect_area > 0 else 0.0

                        distortion_scores.append(rectangularity)

            if distortion_scores:
                return float(np.mean(distortion_scores))

            return 1.0  # Default to perfect if no rectangles found

        except Exception:
            return 1.0

    def _assess_perspective_fallback(self, gray: np.ndarray) -> float:
        """Simplified perspective assessment using variance analysis"""
        try:
            # Analyze variance in horizontal and vertical strips
            h, w = gray.shape

            # Calculate variance in horizontal strips (should be consistent if not distorted)
            strip_height = h // 10
            h_variances = []
            for i in range(0, h - strip_height, strip_height):
                strip = gray[i : i + strip_height, :]
                h_variances.append(np.var(strip))

            # Calculate variance in vertical strips
            strip_width = w // 10
            v_variances = []
            for i in range(0, w - strip_width, strip_width):
                strip = gray[:, i : i + strip_width]
                v_variances.append(np.var(strip))

            # Perspective distortion causes uneven variance distribution
            if len(h_variances) > 1 and len(v_variances) > 1:
                h_consistency = 1.0 - (
                    np.std(h_variances) / (np.mean(h_variances) + 1e-6)
                )
                v_consistency = 1.0 - (
                    np.std(v_variances) / (np.mean(v_variances) + 1e-6)
                )
                return float(max(0.0, min(1.0, (h_consistency + v_consistency) / 2)))

            return 1.0

        except Exception:
            return 1.0

    def _estimate_text_area(
        self, gray: np.ndarray, focus_areas: list[dict] | None = None
    ) -> float:
        """Estimate the ratio of image containing text"""
        try:
            cv2 = safe_cv2_import()
            if cv2 is not None:
                # Use MSER (Maximally Stable Extremal Regions) for text detection
                mser = cv2.MSER_create()
                regions, _ = mser.detectRegions(gray)
            else:
                logger.info(
                    "OpenCV not available for text area estimation, using edge-based fallback"
                )
                return self._estimate_text_area_fallback(gray, focus_areas)

            if not regions:
                return 0.0

            # Create mask for text regions
            height, width = gray.shape
            text_mask = np.zeros((height, width), dtype=np.uint8)

            if cv2 is not None:
                for region in regions:
                    # Filter regions by size and aspect ratio (typical for text)
                    if len(region) > 10:
                        hull = cv2.convexHull(region.reshape(-1, 1, 2))
                        cv2.fillPoly(text_mask, [hull], 255)

            # Calculate text area ratio
            text_pixels = np.sum(text_mask > 0)
            total_pixels = height * width

            return text_pixels / total_pixels if total_pixels > 0 else 0.0

        except Exception:
            return 0.1  # Conservative estimate

    def _estimate_text_area_fallback(
        self, gray: np.ndarray, focus_areas: list[dict] | None = None
    ) -> float:
        """Fallback text area estimation using edge density analysis"""
        try:
            # Calculate edge density as proxy for text content
            # Text areas typically have high edge density

            # Simple edge detection using gradients
            grad_x = np.abs(np.gradient(gray.astype(np.float64), axis=1))
            grad_y = np.abs(np.gradient(gray.astype(np.float64), axis=0))

            # Combine gradients
            edge_magnitude = np.sqrt(grad_x**2 + grad_y**2)

            # Threshold to identify edge regions
            edge_threshold = np.percentile(edge_magnitude, 80)  # Top 20% of edges
            edge_mask = edge_magnitude > edge_threshold

            # Calculate ratio of high-edge pixels
            edge_ratio = np.sum(edge_mask) / edge_mask.size

            # Text typically has moderate to high edge density
            # Scale the ratio to be more conservative
            text_area_estimate = min(edge_ratio * 1.5, 0.8)  # Cap at 80%

            return float(max(0.0, text_area_estimate))

        except Exception:
            return 0.1  # Conservative fallback

    def _identify_quality_issues(
        self, metrics: ImageQualityMetrics
    ) -> list[QualityIssue]:
        """Identify specific quality issues based on metrics"""
        issues = []

        # Blur assessment
        if metrics.blur_score < self.thresholds["blur_minimum"]:
            severity = 1.0 - (metrics.blur_score / self.thresholds["blur_minimum"])
            issues.append(
                QualityIssue(
                    issue_type=IssueType.BLUR,
                    severity=min(1.0, severity),
                    description=f"Image appears blurry (blur score: {metrics.blur_score:.1f})",
                    suggestion="Hold device steady and ensure proper focus",
                )
            )

        # Resolution assessment
        if metrics.resolution_score < self.thresholds["resolution_minimum"]:
            severity = 1.0 - (
                metrics.resolution_score / self.thresholds["resolution_minimum"]
            )
            issues.append(
                QualityIssue(
                    issue_type=IssueType.LOW_RESOLUTION,
                    severity=min(1.0, severity),
                    description="Low resolution may affect text clarity",
                    suggestion="Move closer to the text or use higher camera resolution",
                )
            )

        # Contrast assessment
        if metrics.contrast_score < self.thresholds["contrast_minimum"]:
            severity = 1.0 - (
                metrics.contrast_score / self.thresholds["contrast_minimum"]
            )
            issues.append(
                QualityIssue(
                    issue_type=IssueType.POOR_CONTRAST,
                    severity=min(1.0, severity),
                    description="Low contrast may affect text detection",
                    suggestion="Improve lighting or adjust camera settings",
                )
            )

        # Brightness assessment
        if metrics.brightness_score > 200:
            severity = (metrics.brightness_score - 200) / 55
            issues.append(
                QualityIssue(
                    issue_type=IssueType.OVEREXPOSURE,
                    severity=min(1.0, severity),
                    description="Image appears overexposed",
                    suggestion="Reduce exposure or avoid direct lighting",
                )
            )
        elif metrics.brightness_score < 50:
            severity = (50 - metrics.brightness_score) / 50
            issues.append(
                QualityIssue(
                    issue_type=IssueType.UNDEREXPOSURE,
                    severity=min(1.0, severity),
                    description="Image appears underexposed",
                    suggestion="Increase lighting or exposure",
                )
            )

        # Noise assessment
        if metrics.noise_score < self.thresholds["noise_acceptable"]:
            severity = 1.0 - (metrics.noise_score / self.thresholds["noise_acceptable"])
            issues.append(
                QualityIssue(
                    issue_type=IssueType.NOISE,
                    severity=min(1.0, severity),
                    description="High noise levels detected",
                    suggestion="Improve lighting to reduce ISO noise",
                )
            )

        # Rotation assessment
        if abs(metrics.rotation_angle) > self.thresholds["rotation_tolerance"]:
            severity = min(1.0, abs(metrics.rotation_angle) / 15.0)
            issues.append(
                QualityIssue(
                    issue_type=IssueType.ROTATION,
                    severity=severity,
                    description=f"Image rotation detected ({metrics.rotation_angle:.1f}°)",
                    suggestion="Hold device parallel to text for best results",
                )
            )

        # Text area assessment
        if metrics.text_area_ratio < self.thresholds["text_area_minimum"]:
            severity = 1.0 - (
                metrics.text_area_ratio / self.thresholds["text_area_minimum"]
            )
            issues.append(
                QualityIssue(
                    issue_type=IssueType.PERSPECTIVE_DISTORTION,
                    severity=min(1.0, severity),
                    description="Limited text area detected",
                    suggestion="Frame the text more directly and minimize angle",
                )
            )

        return issues

    def _generate_recommendations(
        self, metrics: ImageQualityMetrics, issues: list[QualityIssue]
    ) -> list[str]:
        """Generate actionable recommendations for image improvement"""
        recommendations = []

        # General recommendations based on issues
        if any(issue.issue_type == IssueType.BLUR for issue in issues):
            recommendations.append("Hold device steady and ensure autofocus completes")

        if any(
            issue.issue_type in [IssueType.OVEREXPOSURE, IssueType.UNDEREXPOSURE]
            for issue in issues
        ):
            recommendations.append("Adjust lighting conditions or camera exposure")

        if any(issue.issue_type == IssueType.ROTATION for issue in issues):
            recommendations.append("Align device parallel to text surface")

        if any(issue.issue_type == IssueType.LOW_RESOLUTION for issue in issues):
            recommendations.append("Move closer to text or increase camera resolution")

        if any(issue.issue_type == IssueType.POOR_CONTRAST for issue in issues):
            recommendations.append("Improve lighting or avoid shadows on text")

        # OCR-specific recommendations
        if metrics.text_area_ratio < 0.3:
            recommendations.append("Focus more of the image on the text area")

        if metrics.blur_score < 200:
            recommendations.append("Tap to focus on the text before capturing")

        # If no specific issues, provide general optimization tips
        if not recommendations:
            recommendations.extend(
                [
                    "Image quality is good for OCR processing",
                    "For best results, ensure even lighting and sharp focus",
                ]
            )

        return recommendations

    def _calculate_overall_quality(
        self, metrics: ImageQualityMetrics, issues: list[QualityIssue]
    ) -> tuple[QualityLevel, float]:
        """Calculate overall quality level and confidence"""

        # Calculate quality score based on multiple factors
        quality_score = 0.0
        confidence = 1.0

        # Blur contribution (30% weight)
        if metrics.blur_score >= self.thresholds["blur_excellent"]:
            quality_score += 0.3
        elif metrics.blur_score >= self.thresholds["blur_good"]:
            quality_score += 0.2
        elif metrics.blur_score >= self.thresholds["blur_minimum"]:
            quality_score += 0.1

        # Resolution contribution (20% weight)
        if metrics.resolution_score >= self.thresholds["resolution_good"]:
            quality_score += 0.2
        elif metrics.resolution_score >= self.thresholds["resolution_minimum"]:
            quality_score += 0.1

        # Contrast contribution (20% weight)
        if metrics.contrast_score >= self.thresholds["contrast_good"]:
            quality_score += 0.2
        elif metrics.contrast_score >= self.thresholds["contrast_minimum"]:
            quality_score += 0.1

        # Brightness contribution (15% weight)
        if (
            self.thresholds["brightness_optimal_min"]
            <= metrics.brightness_score
            <= self.thresholds["brightness_optimal_max"]
        ):
            quality_score += 0.15
        elif 40 <= metrics.brightness_score <= 220:
            quality_score += 0.1

        # Text area contribution (15% weight)
        if metrics.text_area_ratio >= 0.3:
            quality_score += 0.15
        elif metrics.text_area_ratio >= self.thresholds["text_area_minimum"]:
            quality_score += 0.1

        # Apply issue penalties
        severe_issues = sum(1 for issue in issues if issue.severity > 0.7)
        moderate_issues = sum(1 for issue in issues if 0.3 < issue.severity <= 0.7)

        quality_score -= severe_issues * 0.2
        quality_score -= moderate_issues * 0.1
        quality_score = max(0.0, quality_score)

        # Determine quality level
        if quality_score >= 0.8:
            quality_level = QualityLevel.EXCELLENT
        elif quality_score >= 0.6:
            quality_level = QualityLevel.GOOD
        elif quality_score >= 0.4:
            quality_level = QualityLevel.FAIR
        elif quality_score >= 0.2:
            quality_level = QualityLevel.POOR
        else:
            quality_level = QualityLevel.UNUSABLE

        # Calculate confidence based on metric consistency
        confidence = max(0.5, 1.0 - len(issues) * 0.1)

        return quality_level, confidence

    def _calculate_ocr_readiness(
        self, metrics: ImageQualityMetrics, issues: list[QualityIssue]
    ) -> float:
        """Calculate OCR-specific readiness score"""

        # OCR readiness is heavily weighted toward text clarity factors
        readiness_score = 1.0

        # Critical factors for OCR
        if metrics.blur_score < self.thresholds["blur_minimum"]:
            readiness_score *= 0.3  # Blur severely impacts OCR
        elif metrics.blur_score < self.thresholds["blur_good"]:
            readiness_score *= 0.7

        if metrics.contrast_score < self.thresholds["contrast_minimum"]:
            readiness_score *= 0.5  # Poor contrast severely impacts OCR
        elif metrics.contrast_score < self.thresholds["contrast_good"]:
            readiness_score *= 0.8

        # Resolution impact
        if metrics.resolution_score < self.thresholds["resolution_minimum"]:
            readiness_score *= 0.6

        # Text area impact
        if metrics.text_area_ratio < self.thresholds["text_area_minimum"]:
            readiness_score *= 0.4
        elif metrics.text_area_ratio < 0.2:
            readiness_score *= 0.7

        # Rotation impact (OCR can handle some rotation)
        if abs(metrics.rotation_angle) > 10:
            readiness_score *= 0.6
        elif abs(metrics.rotation_angle) > 5:
            readiness_score *= 0.8

        # Brightness extremes impact
        if metrics.brightness_score < 40 or metrics.brightness_score > 220:
            readiness_score *= 0.7

        return max(0.0, min(1.0, readiness_score))

    def _get_default_metrics(self) -> ImageQualityMetrics:
        """Return default metrics for error cases"""
        return ImageQualityMetrics(
            blur_score=0.0,
            resolution_score=0.0,
            contrast_score=0.0,
            brightness_score=0.0,
            noise_score=0.0,
            rotation_angle=0.0,
            perspective_score=0.0,
            text_area_ratio=0.0,
        )


# Global service instance
_image_quality_service: ImageQualityService | None = None


def get_image_quality_service() -> ImageQualityService:
    """Get global image quality service instance"""
    global _image_quality_service
    if _image_quality_service is None:
        _image_quality_service = ImageQualityService()
    return _image_quality_service
