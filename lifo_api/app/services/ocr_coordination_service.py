"""
OCR Coordination Service for managing date/barcode detection conflicts

This service provides coordination between date extraction and barcode detection
to prevent misclassification and improve accuracy.
"""

import re
from typing import Dict, List, Optional, Tuple, Union
from dataclasses import dataclass

import structlog

from .date_extraction_service import get_date_extraction_service, DateExtractionResult
from .barcode_detection_service import get_barcode_detection_service, BarcodeDetectionResult

logger = structlog.get_logger()


@dataclass
class OCRClassificationResult:
    """Classification result for OCR text content"""
    content_type: str  # 'date', 'barcode', 'text', 'mixed', 'uncertain'
    confidence: float
    reasoning: str
    date_results: list[DateExtractionResult]
    barcode_results: list[BarcodeDetectionResult]
    raw_text: str


class OCRCoordinationService:
    """
    Coordination service for intelligent OCR content classification

    Features:
    - Resolves conflicts between date and barcode detection
    - Context-aware classification with confidence scoring
    - Priority-based decision making for ambiguous cases
    - Comprehensive logging for debugging OCR issues
    """

    def __init__(self):
        self.date_service = get_date_extraction_service()
        self.barcode_service = get_barcode_detection_service()

        # Classification thresholds
        self.thresholds = {
            'high_confidence': 0.8,
            'medium_confidence': 0.6,
            'low_confidence': 0.4
        }

        # Priority weights for decision making
        self.priority_weights = {
            'date_context': 1.2,  # Date contexts get priority
            'barcode_context': 1.0,
            'length_mismatch': 0.7,  # Penalize unlikely lengths
            'format_validation': 1.1,  # Reward valid formats
            'checksum_validation': 1.3  # Strong reward for valid checksums
        }

        logger.info("OCRCoordinationService initialized")

    async def classify_text_content(
        self,
        text_blocks: list[str],
        bounding_boxes: list[dict] | None = None,
        preferred_region: str = 'EU'
    ) -> list[OCRClassificationResult]:
        """
        Classify text content as dates, barcodes, or other text

        Args:
            text_blocks: List of OCR text blocks
            bounding_boxes: Optional bounding box information
            preferred_region: Regional preference for format priority

        Returns:
            List of classification results for each text block
        """
        results = []

        for i, text_block in enumerate(text_blocks):
            bounding_box = bounding_boxes[i] if bounding_boxes and i < len(bounding_boxes) else None

            classification = await self._classify_single_block(
                text_block, bounding_box, preferred_region
            )
            results.append(classification)

        logger.info(
            "OCR content classification completed",
            total_blocks=len(text_blocks),
            date_blocks=sum(1 for r in results if r.content_type == 'date'),
            barcode_blocks=sum(1 for r in results if r.content_type == 'barcode'),
            text_blocks=sum(1 for r in results if r.content_type == 'text')
        )

        return results

    async def _classify_single_block(
        self,
        text_block: str,
        bounding_box: dict | None,
        preferred_region: str
    ) -> OCRClassificationResult:
        """Classify a single text block"""

        # Extract potential dates and barcodes
        date_results = await self.date_service.extract_dates_from_text_blocks(
            [text_block], [bounding_box] if bounding_box else None, preferred_region
        )

        barcode_results = await self.barcode_service.detect_barcodes_from_text_blocks(
            [text_block], [bounding_box] if bounding_box else None, preferred_region
        )

        # Perform conflict resolution
        classification = self._resolve_classification_conflicts(
            text_block, date_results, barcode_results, preferred_region
        )

        return classification

    def _resolve_classification_conflicts(
        self,
        text_block: str,
        date_results: list[DateExtractionResult],
        barcode_results: list[BarcodeDetectionResult],
        preferred_region: str
    ) -> OCRClassificationResult:
        """Resolve conflicts between date and barcode detections"""

        # Calculate scores for each type
        date_score = self._calculate_date_score(text_block, date_results)
        barcode_score = self._calculate_barcode_score(text_block, barcode_results)

        # Determine classification based on scores and context
        if date_score > barcode_score and date_score > self.thresholds['low_confidence']:
            content_type = 'date'
            confidence = date_score
            reasoning = f"Date classification (score: {date_score:.2f} vs barcode: {barcode_score:.2f})"

        elif barcode_score > date_score and barcode_score > self.thresholds['low_confidence']:
            content_type = 'barcode'
            confidence = barcode_score
            reasoning = f"Barcode classification (score: {barcode_score:.2f} vs date: {date_score:.2f})"

        elif date_results and barcode_results:
            # Both detected - mixed content or uncertain
            if abs(date_score - barcode_score) < 0.2:
                content_type = 'uncertain'
                confidence = max(date_score, barcode_score) * 0.8  # Reduce confidence for ambiguity
                reasoning = f"Uncertain classification - scores too close (date: {date_score:.2f}, barcode: {barcode_score:.2f})"
            else:
                content_type = 'mixed'
                confidence = (date_score + barcode_score) / 2
                reasoning = f"Mixed content detected (date: {date_score:.2f}, barcode: {barcode_score:.2f})"

        else:
            # Neither date nor barcode detected
            content_type = 'text'
            confidence = 0.5  # Neutral confidence for plain text
            reasoning = "No dates or barcodes detected - classified as text"

        return OCRClassificationResult(
            content_type=content_type,
            confidence=confidence,
            reasoning=reasoning,
            date_results=date_results,
            barcode_results=barcode_results,
            raw_text=text_block
        )

    def _calculate_date_score(
        self,
        text_block: str,
        date_results: list[DateExtractionResult]
    ) -> float:
        """Calculate overall score for date classification"""
        if not date_results:
            return 0.0

        # Base score from best date result
        base_score = max(result.confidence for result in date_results)

        # Context modifiers
        text_lower = text_block.lower()
        context_boost = 0.0

        # Strong date indicators
        strong_date_keywords = [
            'exp', 'expiry', 'expires', 'best before', 'best by',
            'use by', 'sell by', 'mfg', 'manufactured'
        ]

        for keyword in strong_date_keywords:
            if keyword in text_lower:
                context_boost += 0.15
                break  # Only count once

        # Format consistency bonus
        if any(result.format_detected for result in date_results):
            context_boost += 0.1

        # Date type priority bonus
        priority_types = ['use_by', 'expiry', 'sell_by', 'best_before']
        if any(result.date_type in priority_types for result in date_results):
            context_boost += 0.1

        final_score = min((base_score + context_boost) * self.priority_weights['date_context'], 1.0)
        return final_score

    def _calculate_barcode_score(
        self,
        text_block: str,
        barcode_results: list[BarcodeDetectionResult]
    ) -> float:
        """Calculate overall score for barcode classification"""
        if not barcode_results:
            return 0.0

        # Base score from best barcode result
        base_score = max(result.confidence for result in barcode_results)

        # Context modifiers
        text_lower = text_block.lower()
        context_boost = 0.0

        # Strong barcode indicators
        barcode_keywords = ['barcode', 'ean', 'upc', 'gtin', 'code']
        for keyword in barcode_keywords:
            if keyword in text_lower:
                context_boost += 0.15
                break

        # Checksum validation bonus
        if any(result.checksum_valid for result in barcode_results):
            context_boost += 0.2

        # Format validation bonus
        if any(result.format in ['EAN-13', 'UPC-A'] for result in barcode_results):
            context_boost += 0.1

        # Penalize if date keywords are present
        date_keywords = ['exp', 'expiry', 'best', 'use', 'sell', 'mfg']
        if any(keyword in text_lower for keyword in date_keywords):
            context_boost -= 0.3

        final_score = min((base_score + context_boost) * self.priority_weights['barcode_context'], 1.0)
        return max(final_score, 0.0)  # Ensure non-negative

    def get_classification_summary(
        self,
        classifications: list[OCRClassificationResult]
    ) -> dict[str, any]:
        """Get summary statistics for classification results"""
        if not classifications:
            return {'error': 'No classifications provided'}

        total = len(classifications)
        type_counts = {}
        confidence_stats = {
            'high': 0,
            'medium': 0,
            'low': 0
        }

        for result in classifications:
            # Count content types
            content_type = result.content_type
            type_counts[content_type] = type_counts.get(content_type, 0) + 1

            # Count confidence levels
            if result.confidence >= self.thresholds['high_confidence']:
                confidence_stats['high'] += 1
            elif result.confidence >= self.thresholds['medium_confidence']:
                confidence_stats['medium'] += 1
            else:
                confidence_stats['low'] += 1

        return {
            'total_blocks': total,
            'content_types': type_counts,
            'confidence_distribution': confidence_stats,
            'avg_confidence': sum(r.confidence for r in classifications) / total if total > 0 else 0,
            'dates_found': sum(len(r.date_results) for r in classifications),
            'barcodes_found': sum(len(r.barcode_results) for r in classifications)
        }

    def debug_classification_conflicts(
        self,
        text_block: str,
        classification: OCRClassificationResult
    ) -> dict[str, any]:
        """Debug information for classification conflicts"""
        return {
            'text_block': text_block,
            'classification': classification.content_type,
            'confidence': classification.confidence,
            'reasoning': classification.reasoning,
            'date_candidates': len(classification.date_results),
            'barcode_candidates': len(classification.barcode_results),
            'date_details': [
                {
                    'date': result.date.strftime('%Y-%m-%d') if result.date else None,
                    'type': result.date_type,
                    'confidence': result.confidence,
                    'format': result.format_detected
                }
                for result in classification.date_results
            ],
            'barcode_details': [
                {
                    'value': result.value,
                    'format': result.format,
                    'confidence': result.confidence,
                    'checksum_valid': result.checksum_valid
                }
                for result in classification.barcode_results
            ]
        }


# Global service instance
_ocr_coordination_service: OCRCoordinationService | None = None

def get_ocr_coordination_service() -> OCRCoordinationService:
    """Get singleton instance of OCR coordination service"""
    global _ocr_coordination_service
    if _ocr_coordination_service is None:
        _ocr_coordination_service = OCRCoordinationService()
    return _ocr_coordination_service