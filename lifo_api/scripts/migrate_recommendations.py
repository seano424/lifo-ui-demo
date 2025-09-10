#!/usr/bin/env python3
"""
Database Migration Script: Standardize Recommendations
Migrates legacy recommendation formats to FastAPI standard format
"""

import asyncio
import logging
import os
import sys

from sqlalchemy.ext.asyncio import create_async_engine

# Add parent directory to Python path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.core.config import Settings
from app.utils.recommendation_migration import RecommendationMigrator

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class RecommendationMigration:
    """Handles database migration of recommendation formats"""

    def __init__(self, database_url: str):
        self.engine = create_async_engine(database_url, echo=False)
        self.migrator = RecommendationMigrator()

    async def analyze_current_data(self) -> dict:
        """Analyze current recommendation data in database"""
        async with self.engine.begin() as conn:
            # Get all unique recommendations with counts
            result = await conn.execute(
                """
                SELECT recommendation, COUNT(*) as count 
                FROM scoring.product_scores 
                WHERE recommendation IS NOT NULL 
                GROUP BY recommendation 
                ORDER BY count DESC
                """
            )

            recommendations = dict(result.fetchall())

            # Get total count
            total_result = await conn.execute(
                "SELECT COUNT(*) FROM scoring.product_scores WHERE recommendation IS NOT NULL"
            )
            total_count = total_result.scalar()

            logger.info("Current recommendation distribution:")
            for rec, count in recommendations.items():
                percentage = (count / total_count) * 100 if total_count > 0 else 0
                logger.info(f"  {rec}: {count} ({percentage:.1f}%)")

            return {
                'recommendations': recommendations,
                'total_count': total_count
            }

    async def preview_migration(self) -> list[tuple[str, str]]:
        """Preview what the migration will change"""
        async with self.engine.begin() as conn:
            # Get unique recommendations that will change
            result = await conn.execute(
                """
                SELECT DISTINCT recommendation 
                FROM scoring.product_scores 
                WHERE recommendation IS NOT NULL 
                ORDER BY recommendation
                """
            )

            migrations = []
            for (recommendation,) in result.fetchall():
                migrated = self.migrator.migrate_recommendation(recommendation)
                if recommendation != migrated:
                    migrations.append((recommendation, migrated))

            logger.info("Migration preview:")
            for old, new in migrations:
                logger.info(f"  '{old}' -> '{new}'")

            return migrations

    async def perform_migration(self, dry_run: bool = True) -> dict:
        """Perform the actual migration"""
        logger.info(f"Starting migration (dry_run={dry_run})")

        migration_stats = {
            'processed': 0,
            'updated': 0,
            'errors': 0,
            'unchanged': 0
        }

        async with self.engine.begin() as conn:
            # Get all records that need potential migration
            result = await conn.execute(
                """
                SELECT score_id, recommendation 
                FROM scoring.product_scores 
                WHERE recommendation IS NOT NULL
                ORDER BY calculated_at DESC
                """
            )

            batch_updates = []

            for score_id, recommendation in result.fetchall():
                migration_stats['processed'] += 1

                try:
                    migrated_recommendation = self.migrator.migrate_recommendation(recommendation)

                    if recommendation != migrated_recommendation:
                        batch_updates.append({
                            'score_id': score_id,
                            'old_recommendation': recommendation,
                            'new_recommendation': migrated_recommendation
                        })
                        migration_stats['updated'] += 1
                    else:
                        migration_stats['unchanged'] += 1

                except Exception as e:
                    logger.error(f"Error migrating score_id {score_id}: {e}")
                    migration_stats['errors'] += 1

            logger.info(f"Prepared {len(batch_updates)} updates")

            if not dry_run and batch_updates:
                # Perform batch update
                for batch in batch_updates:
                    await conn.execute(
                        """
                        UPDATE scoring.product_scores 
                        SET recommendation = $1, 
                            calculated_at = COALESCE(calculated_at, NOW())
                        WHERE score_id = $2
                        """,
                        batch['new_recommendation'],
                        batch['score_id']
                    )

                logger.info("Migration completed successfully!")
            elif dry_run:
                logger.info("DRY RUN - No changes made to database")

        return migration_stats

    async def verify_migration(self) -> bool:
        """Verify migration was successful"""
        async with self.engine.begin() as conn:
            # Check for any remaining legacy recommendations
            result = await conn.execute(
                """
                SELECT recommendation, COUNT(*) as count
                FROM scoring.product_scores 
                WHERE recommendation IN (
                    'immediate_action', 'high_priority', 'medium_priority', 
                    'discount_heavily', 'normal'
                )
                GROUP BY recommendation
                """
            )

            legacy_recommendations = dict(result.fetchall())

            if legacy_recommendations:
                logger.warning("Legacy recommendations still found:")
                for rec, count in legacy_recommendations.items():
                    logger.warning(f"  {rec}: {count} records")
                return False
            else:
                logger.info("✅ No legacy recommendations found - migration successful!")
                return True

    async def close(self):
        """Close database connections"""
        await self.engine.dispose()


async def main():
    """Main migration function"""
    import argparse

    parser = argparse.ArgumentParser(description='Migrate recommendation formats')
    parser.add_argument('--dry-run', action='store_true',
                       help='Preview changes without making them')
    parser.add_argument('--skip-analysis', action='store_true',
                       help='Skip initial data analysis')
    args = parser.parse_args()

    # Get database URL
    settings = Settings()
    database_url = settings.database_url
    if not database_url:
        logger.error("database_url not found in settings")
        sys.exit(1)

    migration = RecommendationMigration(database_url)

    try:
        # Step 1: Analyze current data
        if not args.skip_analysis:
            logger.info("=== ANALYZING CURRENT DATA ===")
            current_data = await migration.analyze_current_data()

            # Step 2: Preview migration
            logger.info("\n=== MIGRATION PREVIEW ===")
            await migration.preview_migration()

        # Step 3: Perform migration
        logger.info(f"\n=== PERFORMING MIGRATION (dry_run={args.dry_run}) ===")
        stats = await migration.perform_migration(dry_run=args.dry_run)

        # Print results
        logger.info("\nMigration Results:")
        logger.info(f"  Processed: {stats['processed']} records")
        logger.info(f"  Updated: {stats['updated']} records")
        logger.info(f"  Unchanged: {stats['unchanged']} records")
        logger.info(f"  Errors: {stats['errors']} records")

        # Step 4: Verify if not dry run
        if not args.dry_run:
            logger.info("\n=== VERIFYING MIGRATION ===")
            success = await migration.verify_migration()
            if not success:
                sys.exit(1)

            logger.info("\n✅ Migration completed successfully!")
        else:
            logger.info("\n🔍 Dry run completed - use --no-dry-run to apply changes")

    finally:
        await migration.close()


if __name__ == "__main__":
    asyncio.run(main())
