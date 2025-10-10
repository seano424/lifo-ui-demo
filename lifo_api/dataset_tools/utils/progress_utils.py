"""
Progress tracking utilities for dataset operations.
"""

import time
from dataclasses import dataclass, field
from typing import Optional, Dict
from rich.progress import Progress, TaskID, BarColumn, TextColumn, TimeRemainingColumn
from rich.console import Console


@dataclass
class ProgressStats:
    """Statistics for progress tracking."""

    total: int = 0
    completed: int = 0
    failed: int = 0
    skipped: int = 0
    start_time: float = field(default_factory=time.time)

    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage."""
        if self.completed + self.failed == 0:
            return 0.0
        return (self.completed / (self.completed + self.failed)) * 100

    @property
    def elapsed_time(self) -> float:
        """Get elapsed time in seconds."""
        return time.time() - self.start_time

    @property
    def items_per_second(self) -> float:
        """Calculate processing rate."""
        elapsed = self.elapsed_time
        if elapsed == 0:
            return 0.0
        return (self.completed + self.failed + self.skipped) / elapsed


class ProgressTracker:
    """
    Enhanced progress tracker with statistics and multiple task support.
    """

    def __init__(self, console: Optional[Console] = None):
        self.console = console or Console()
        self.progress = Progress(
            TextColumn("[bold blue]{task.description}"),
            BarColumn(),
            TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
            TextColumn("({task.completed}/{task.total})"),
            TimeRemainingColumn(),
            console=self.console,
        )
        self.tasks: Dict[str, TaskID] = {}
        self.stats: Dict[str, ProgressStats] = {}
        self._active = False

    def __enter__(self):
        """Enter context manager."""
        self.progress.__enter__()
        self._active = True
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        self._active = False
        self.progress.__exit__(exc_type, exc_val, exc_tb)

    def add_task(self, name: str, description: str, total: int, **kwargs) -> str:
        """
        Add a new progress task.

        Args:
            name: Unique task identifier
            description: Task description
            total: Total number of items
            **kwargs: Additional arguments for Rich Progress

        Returns:
            Task name for reference
        """
        if not self._active:
            raise RuntimeError("ProgressTracker must be used as context manager")

        task_id = self.progress.add_task(description, total=total, **kwargs)
        self.tasks[name] = task_id
        self.stats[name] = ProgressStats(total=total)
        return name

    def update(
        self,
        task_name: str,
        advance: int = 1,
        completed: bool = True,
        failed: bool = False,
        skipped: bool = False,
        **kwargs,
    ) -> None:
        """
        Update progress for a task.

        Args:
            task_name: Name of the task to update
            advance: Number of items to advance
            completed: Whether the item was completed successfully
            failed: Whether the item failed
            skipped: Whether the item was skipped
            **kwargs: Additional arguments for Rich Progress update
        """
        if task_name not in self.tasks:
            raise ValueError(f"Task '{task_name}' not found")

        task_id = self.tasks[task_name]
        stats = self.stats[task_name]

        # Update statistics
        if completed and not failed and not skipped:
            stats.completed += advance
        elif failed:
            stats.failed += advance
        elif skipped:
            stats.skipped += advance

        # Update progress bar
        self.progress.update(task_id, advance=advance, **kwargs)

    def get_stats(self, task_name: str) -> ProgressStats:
        """Get statistics for a specific task."""
        if task_name not in self.stats:
            raise ValueError(f"Task '{task_name}' not found")
        return self.stats[task_name]

    def print_summary(self) -> None:
        """Print summary statistics for all tasks."""
        if not self.stats:
            return

        self.console.print("\n[bold]Download Summary:[/bold]")
        for task_name, stats in self.stats.items():
            self.console.print(f"[blue]{task_name}:[/blue]")
            self.console.print(f"  • Total: {stats.total}")
            self.console.print(f"  • Completed: {stats.completed}")
            self.console.print(f"  • Failed: {stats.failed}")
            self.console.print(f"  • Skipped: {stats.skipped}")
            self.console.print(f"  • Success Rate: {stats.success_rate:.1f}%")
            self.console.print(f"  • Rate: {stats.items_per_second:.1f} items/sec")
            self.console.print(f"  • Elapsed: {stats.elapsed_time:.1f}s")
            self.console.print()

    def is_task_complete(self, task_name: str) -> bool:
        """Check if a task is complete."""
        if task_name not in self.tasks:
            return False

        task_id = self.tasks[task_name]
        task = self.progress.tasks[task_id]
        return task.completed >= task.total
