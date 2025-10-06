"""
FooDI-ML dataset downloader from AWS S3 with efficient handling of large datasets.
"""
import asyncio
import json
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
import aiofiles
from dataclasses import dataclass
import logging
from concurrent.futures import ThreadPoolExecutor
import threading

from ..config import FoodiMLConfig, DatasetConfig
from ..utils import ProgressTracker, validate_image_quality, get_logger


@dataclass
class S3ObjectInfo:
    """Information about an S3 object."""
    key: str
    size: int
    last_modified: str
    etag: str

    @property
    def filename(self) -> str:
        """Extract filename from S3 key."""
        return Path(self.key).name

    @property
    def is_image(self) -> bool:
        """Check if object is an image based on extension."""
        return Path(self.key).suffix.lower() in ['.jpg', '.jpeg', '.png', '.webp']


class FoodiMLDownloader:
    """
    Downloader for FooDI-ML dataset from AWS S3 bucket.
    Uses threading for S3 operations and asyncio for file I/O.
    """

    def __init__(self, config: DatasetConfig):
        self.config = config
        self.foodiml_config = config.foodiml
        self.logger = get_logger(__name__)
        self.s3_client: Optional[boto3.client] = None
        self.executor = ThreadPoolExecutor(max_workers=self.foodiml_config.concurrent_downloads)
        self._lock = threading.Lock()

    def __enter__(self):
        """Context manager entry."""
        try:
            # Initialize S3 client
            self.s3_client = boto3.client(
                's3',
                region_name=self.foodiml_config.region
            )
            # Test connection
            self.s3_client.head_bucket(Bucket=self.foodiml_config.bucket_name)
            self.logger.info(f"Connected to S3 bucket: {self.foodiml_config.bucket_name}")

        except NoCredentialsError:
            self.logger.error("AWS credentials not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY")
            raise
        except ClientError as e:
            self.logger.error(f"Error accessing S3 bucket: {e}")
            raise

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if self.executor:
            self.executor.shutdown(wait=True)

    def list_objects(self, prefix: str = "", max_objects: Optional[int] = None) -> List[S3ObjectInfo]:
        """
        List objects in S3 bucket with optional filtering.

        Args:
            prefix: S3 key prefix to filter by
            max_objects: Maximum number of objects to return

        Returns:
            List of S3ObjectInfo objects
        """
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")

        objects = []
        paginator = self.s3_client.get_paginator('list_objects_v2')

        try:
            page_iterator = paginator.paginate(
                Bucket=self.foodiml_config.bucket_name,
                Prefix=prefix
            )

            for page in page_iterator:
                if 'Contents' in page:
                    for obj in page['Contents']:
                        s3_info = S3ObjectInfo(
                            key=obj['Key'],
                            size=obj['Size'],
                            last_modified=obj['LastModified'].isoformat(),
                            etag=obj['ETag'].strip('"')
                        )

                        # Filter for images only
                        if s3_info.is_image:
                            objects.append(s3_info)

                        # Stop if we've reached the limit
                        if max_objects and len(objects) >= max_objects:
                            return objects[:max_objects]

        except ClientError as e:
            self.logger.error(f"Error listing S3 objects: {e}")
            raise

        self.logger.info(f"Found {len(objects)} image files in S3 bucket")
        return objects

    async def download_sample_dataset(
        self,
        sample_size: int = 1000,
        prefix: str = "",
        progress_tracker: Optional[ProgressTracker] = None
    ) -> Dict[str, Any]:
        """
        Download a sample subset of the dataset.

        Args:
            sample_size: Number of files to download
            prefix: S3 prefix to filter files
            progress_tracker: Optional progress tracker

        Returns:
            Dictionary with download statistics
        """
        # List available objects
        self.logger.info("Listing available files...")
        all_objects = self.list_objects(prefix=prefix, max_objects=sample_size * 2)

        if not all_objects:
            self.logger.warning("No suitable files found in S3 bucket")
            return {"downloaded": 0, "failed": 0, "total_size": 0}

        # Filter and select objects
        selected_objects = self._select_diverse_sample(all_objects, sample_size)

        self.logger.info(f"Selected {len(selected_objects)} files for download")

        # Create progress task
        task_name = None
        if progress_tracker:
            task_name = progress_tracker.add_task(
                "s3_downloads",
                "Downloading FooDI-ML images",
                total=len(selected_objects)
            )

        # Download files concurrently
        download_tasks = []
        for obj_info in selected_objects:
            task = self._download_single_object(obj_info, progress_tracker, task_name)
            download_tasks.append(task)

        # Execute downloads
        results = await asyncio.gather(*download_tasks, return_exceptions=True)

        # Compile statistics
        downloaded = 0
        failed = 0
        total_size = 0

        for result in results:
            if isinstance(result, dict):
                if result["success"]:
                    downloaded += 1
                    total_size += result["size"]
                else:
                    failed += 1
            elif isinstance(result, Exception):
                self.logger.debug(f"Download task failed: {result}")
                failed += 1

        return {
            "downloaded": downloaded,
            "failed": failed,
            "total_size": total_size,
            "download_directory": str(self.config.foodiml_dir / "images")
        }

    def _select_diverse_sample(self, objects: List[S3ObjectInfo], sample_size: int) -> List[S3ObjectInfo]:
        """
        Select a diverse sample of objects for download.
        Tries to get variety in file sizes and names.
        """
        if len(objects) <= sample_size:
            return objects

        # Sort by size to get variety
        objects_by_size = sorted(objects, key=lambda x: x.size)

        # Select objects with even distribution across size range
        selected = []
        step = len(objects_by_size) // sample_size

        for i in range(0, len(objects_by_size), max(1, step)):
            if len(selected) >= sample_size:
                break
            selected.append(objects_by_size[i])

        # Fill remaining slots randomly
        remaining = [obj for obj in objects if obj not in selected]
        import random
        random.shuffle(remaining)

        while len(selected) < sample_size and remaining:
            selected.append(remaining.pop())

        return selected

    async def _download_single_object(
        self,
        obj_info: S3ObjectInfo,
        progress_tracker: Optional[ProgressTracker],
        task_name: Optional[str]
    ) -> Dict[str, Any]:
        """Download a single object from S3."""
        # Create local path
        local_path = self.config.foodiml_dir / "images" / obj_info.filename
        local_path.parent.mkdir(parents=True, exist_ok=True)

        # Skip if file already exists and has same size
        if local_path.exists() and local_path.stat().st_size == obj_info.size:
            if progress_tracker and task_name:
                progress_tracker.update(task_name, skipped=True)
            return {"success": True, "size": obj_info.size, "path": str(local_path)}

        try:
            # Download file using thread executor
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                self.executor,
                self._download_file_sync,
                obj_info.key,
                local_path
            )

            # Validate downloaded image
            is_valid, issues = validate_image_quality(
                local_path,
                self.config.min_image_width,
                self.config.min_image_height,
                self.config.max_image_size_mb
            )

            if not is_valid:
                # Remove invalid file
                local_path.unlink(missing_ok=True)
                self.logger.debug(f"Removed invalid image {obj_info.filename}: {issues}")

                if progress_tracker and task_name:
                    progress_tracker.update(task_name, failed=True)
                return {"success": False, "size": 0, "path": None}

            if progress_tracker and task_name:
                progress_tracker.update(task_name, completed=True)

            return {"success": True, "size": obj_info.size, "path": str(local_path)}

        except Exception as e:
            self.logger.debug(f"Error downloading {obj_info.key}: {e}")
            # Clean up partial file
            if local_path.exists():
                local_path.unlink(missing_ok=True)

            if progress_tracker and task_name:
                progress_tracker.update(task_name, failed=True)

            return {"success": False, "size": 0, "path": None}

    def _download_file_sync(self, s3_key: str, local_path: Path) -> None:
        """Synchronous file download using boto3."""
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")

        # Use download_file for efficient streaming
        self.s3_client.download_file(
            self.foodiml_config.bucket_name,
            s3_key,
            str(local_path)
        )

    async def save_metadata(self, objects: List[S3ObjectInfo], filename: str = "s3_objects.json") -> Path:
        """Save S3 object metadata to JSON file."""
        output_path = self.config.foodiml_dir / filename

        metadata = {
            "bucket": self.foodiml_config.bucket_name,
            "total_objects": len(objects),
            "total_size_bytes": sum(obj.size for obj in objects),
            "objects": [
                {
                    "key": obj.key,
                    "size": obj.size,
                    "last_modified": obj.last_modified,
                    "etag": obj.etag,
                    "filename": obj.filename
                }
                for obj in objects
            ]
        }

        async with aiofiles.open(output_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(metadata, indent=2))

        self.logger.info(f"Saved metadata for {len(objects)} objects to {output_path}")
        return output_path

    async def analyze_bucket_contents(self, max_objects: int = 10000) -> Dict[str, Any]:
        """
        Analyze bucket contents to understand dataset structure.

        Args:
            max_objects: Maximum objects to analyze

        Returns:
            Analysis report
        """
        self.logger.info("Analyzing bucket contents...")
        objects = self.list_objects(max_objects=max_objects)

        if not objects:
            return {"error": "No objects found"}

        # Analyze file extensions
        extensions = {}
        total_size = 0
        size_distribution = {"small": 0, "medium": 0, "large": 0}

        for obj in objects:
            ext = Path(obj.key).suffix.lower()
            extensions[ext] = extensions.get(ext, 0) + 1
            total_size += obj.size

            # Size categories (in MB)
            size_mb = obj.size / (1024 * 1024)
            if size_mb < 0.5:
                size_distribution["small"] += 1
            elif size_mb < 2.0:
                size_distribution["medium"] += 1
            else:
                size_distribution["large"] += 1

        # Analyze directory structure
        directories = set()
        for obj in objects:
            if "/" in obj.key:
                directories.add(str(Path(obj.key).parent))

        analysis = {
            "total_objects": len(objects),
            "total_size_gb": total_size / (1024 ** 3),
            "file_extensions": extensions,
            "size_distribution": size_distribution,
            "directory_structure": sorted(list(directories)[:20]),  # Top 20 directories
            "sample_files": [obj.key for obj in objects[:10]],
            "avg_file_size_mb": (total_size / len(objects)) / (1024 * 1024) if objects else 0
        }

        # Save analysis
        analysis_path = self.config.foodiml_dir / "bucket_analysis.json"
        async with aiofiles.open(analysis_path, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(analysis, indent=2))

        self.logger.info(f"Bucket analysis saved to {analysis_path}")
        return analysis

    async def run_complete_download(self, sample_size: int = 1000) -> Dict[str, Any]:
        """
        Run complete download process with analysis.

        Args:
            sample_size: Number of files to download

        Returns:
            Summary of download results
        """
        with ProgressTracker() as progress:
            # Analyze bucket first
            analysis = await self.analyze_bucket_contents()

            # Download sample dataset
            download_stats = await self.download_sample_dataset(
                sample_size=sample_size,
                progress_tracker=progress
            )

            progress.print_summary()

            return {
                "bucket_analysis": analysis,
                "download_stats": download_stats
            }