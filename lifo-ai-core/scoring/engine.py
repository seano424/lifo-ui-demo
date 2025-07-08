from datetime import datetime, timedelta
from typing import Dict, Optional, List, Any
import logging
import asyncio
import asyncpg
import os

class InventoryScorer:
    def __init__(self, weights: Optional[Dict] = None):
        self.weights = weights or {
            'expiry': 0.5,
            'velocity': 0.3,
            'margin': 0.2
        }
        self.logger = logging.getLogger(__name__)
    
    def calculate_expiry_score(self, days_to_expiry: int, shelf_life_days: int) -> float:
        """
        Calculate urgency based on expiry date
        Returns: 0.0 (no urgency) to 1.0 (critical)
        """
        if days_to_expiry <= 0:
            return 1.0  # Expired
        
        if days_to_expiry <= 1:
            return 0.95  # Critical - expires tomorrow
        
        if days_to_expiry <= 3:
            return 0.8   # High urgency
        
        if days_to_expiry <= 7:
            return 0.6   # Medium urgency
        
        # For longer shelf life items, use ratio
        if shelf_life_days > 0:
            ratio = days_to_expiry / shelf_life_days
            if ratio <= 0.1:  # Less than 10% of shelf life left
                return 0.7
            elif ratio <= 0.2:  # Less than 20% of shelf life left
                return 0.4
        
        return 0.1  # Low urgency
    
    def calculate_velocity_score(self, current_quantity: float, 
                               avg_daily_sales: float, 
                               days_to_expiry: int) -> float:
        """
        Calculate score based on sales velocity vs time to expiry
        Returns: 0.0 (selling fast enough) to 1.0 (too slow)
        """
        if avg_daily_sales <= 0:
            return 1.0  # No sales = maximum urgency
        
        # Calculate days needed to sell current quantity
        days_to_sellout = current_quantity / avg_daily_sales
        
        if days_to_sellout <= days_to_expiry * 0.5:
            return 0.1  # Selling fast - low urgency
        elif days_to_sellout <= days_to_expiry * 0.8:
            return 0.4  # Moderate pace
        elif days_to_sellout <= days_to_expiry:
            return 0.7  # Cutting it close
        else:
            return 1.0  # Won't sell in time - high urgency
    
    def calculate_margin_score(self, selling_price: float, 
                             cost_price: float, 
                             min_margin_percent: float = 10) -> float:
        """
        Calculate score based on margin flexibility for discounting
        Returns: 0.0 (high margin, flexible) to 1.0 (low margin, needs action)
        """
        if selling_price <= 0 or cost_price <= 0:
            return 0.5  # Default if invalid prices
        
        current_margin_percent = ((selling_price - cost_price) / selling_price) * 100
        
        if current_margin_percent < min_margin_percent:
            return 1.0  # Already low margin - urgent
        elif current_margin_percent < 20:
            return 0.7  # Limited discount flexibility
        elif current_margin_percent < 40:
            return 0.4  # Some flexibility
        else:
            return 0.1  # High margin - can afford deep discounts
    
    def calculate_composite_score(self, expiry_score: float, 
                                velocity_score: float, 
                                margin_score: float) -> float:
        """Calculate weighted composite score"""
        return (
            expiry_score * self.weights['expiry'] +
            velocity_score * self.weights['velocity'] +
            margin_score * self.weights['margin']
        )
    
    def generate_recommendation(self, composite_score: float, 
                              days_to_expiry: int,
                              current_margin_percent: float) -> Dict:
        """Generate action recommendation based on score"""
        
        if days_to_expiry <= 0:
            return {
                'action': 'remove',
                'urgency': 'critical',
                'reason': 'Product expired',
                'discount_percent': 0
            }
        
        if composite_score >= 0.8:
            discount = min(50, max(20, int(composite_score * 60)))
            return {
                'action': 'discount_aggressive',
                'discount_percent': discount,
                'urgency': 'high',
                'reason': f'High urgency score: {composite_score:.2f}'
            }
        
        elif composite_score >= 0.6:
            discount = min(30, max(15, int(composite_score * 40)))
            return {
                'action': 'discount_moderate',
                'discount_percent': discount,
                'urgency': 'medium',
                'reason': f'Moderate urgency score: {composite_score:.2f}'
            }
        
        elif composite_score >= 0.4:
            return {
                'action': 'alert',
                'urgency': 'low',
                'reason': 'Monitor closely - score increasing',
                'discount_percent': 0
            }
        
        else:
            return {
                'action': 'maintain',
                'urgency': 'none',
                'reason': 'No action needed',
                'discount_percent': 0
            }

class ScoringService:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.scorer = InventoryScorer()
        self.logger = logging.getLogger(__name__)
        self.conn = None
    
    async def connect(self):
        """Establish database connection"""
        try:
            self.conn = await asyncpg.connect(self.database_url)
            self.logger.info("Connected to database")
        except Exception as e:
            self.logger.error(f"Failed to connect to database: {e}")
            raise
    
    async def disconnect(self):
        """Close database connection"""
        if self.conn:
            await self.conn.close()
            self.logger.info("Disconnected from database")
    
    async def calculate_batch_scores(self, store_id: str) -> Dict:
        """Calculate scores for all active batches in a store"""
        
        if not self.conn:
            await self.connect()
        
        try:
            # Get active batches with product info
            query = """
                SELECT 
                    b.*,
                    p.category,
                    p.typical_shelf_life_days,
                    p.name as product_name,
                    p.sku
                FROM inventory.batches b
                JOIN inventory.products p ON b.product_id = p.product_id
                WHERE b.store_id = $1 AND b.status = 'active'
            """
            
            batches = await self.conn.fetch(query, store_id)
            
            processed = 0
            errors = []
            
            for batch in batches:
                try:
                    # Calculate days to expiry
                    expiry_date = batch['expiry_date']
                    days_to_expiry = (expiry_date - datetime.now().date()).days
                    
                    # Get category weights
                    category = batch['category']
                    weights_query = """
                        SELECT spoilage_risk_weight, turnover_speed_weight, value_impact_weight
                        FROM scoring.category_weights 
                        WHERE category = $1
                    """
                    
                    weights_result = await self.conn.fetchrow(weights_query, category)
                    
                    if weights_result:
                        custom_weights = {
                            'expiry': float(weights_result['spoilage_risk_weight']),
                            'velocity': float(weights_result['turnover_speed_weight']),
                            'margin': float(weights_result['value_impact_weight'])
                        }
                        self.scorer = InventoryScorer(custom_weights)
                    
                    # Calculate individual scores
                    expiry_score = self.scorer.calculate_expiry_score(
                        days_to_expiry, 
                        batch['typical_shelf_life_days']
                    )
                    
                    # Get velocity score (enhance later with actual sales data)
                    avg_daily_sales = await self.get_avg_daily_sales(batch['batch_id'])
                    velocity_score = self.scorer.calculate_velocity_score(
                        float(batch['current_quantity']),
                        avg_daily_sales,
                        days_to_expiry
                    )
                    
                    margin_score = self.scorer.calculate_margin_score(
                        float(batch['selling_price']),
                        float(batch['cost_price'])
                    )
                    
                    composite_score = self.scorer.calculate_composite_score(
                        expiry_score, velocity_score, margin_score
                    )
                    
                    # Generate recommendation
                    margin_percent = ((float(batch['selling_price']) - float(batch['cost_price'])) / float(batch['selling_price'])) * 100
                    recommendation = self.scorer.generate_recommendation(
                        composite_score, days_to_expiry, margin_percent
                    )
                    
                    # Store scores (upsert)
                    upsert_query = """
                        INSERT INTO scoring.product_scores 
                        (batch_id, store_id, expiry_score, velocity_score, margin_score, 
                         composite_score, recommendation, confidence_level, calculated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                        ON CONFLICT (batch_id) 
                        DO UPDATE SET
                            expiry_score = EXCLUDED.expiry_score,
                            velocity_score = EXCLUDED.velocity_score,
                            margin_score = EXCLUDED.margin_score,
                            composite_score = EXCLUDED.composite_score,
                            recommendation = EXCLUDED.recommendation,
                            confidence_level = EXCLUDED.confidence_level,
                            calculated_at = NOW()
                    """
                    
                    await self.conn.execute(
                        upsert_query,
                        batch['batch_id'],
                        store_id,
                        round(expiry_score, 2),
                        round(velocity_score, 2),
                        round(margin_score, 2),
                        round(composite_score, 2),
                        recommendation['action'],
                        0.8  # Base confidence for rule-based scoring
                    )
                    
                    processed += 1
                    
                except Exception as e:
                    error_msg = f"Batch {batch['batch_id']}: {str(e)}"
                    errors.append(error_msg)
                    self.logger.error(f"Error scoring batch {batch['batch_id']}: {e}")
            
            return {'processed': processed, 'errors': errors}
            
        except Exception as e:
            self.logger.error(f"Error in calculate_batch_scores: {e}")
            return {'processed': 0, 'errors': [str(e)]}
    
    async def get_avg_daily_sales(self, batch_id: str) -> float:
        """Get average daily sales for a batch"""
        try:
            # Look for sales data in the last 30 days
            query = """
                SELECT AVG(quantity_sold) as avg_daily_sales
                FROM timeseries.sales_events
                WHERE batch_id = $1 
                AND sale_timestamp >= NOW() - INTERVAL '30 days'
            """
            
            result = await self.conn.fetchrow(query, batch_id)
            
            if result and result['avg_daily_sales']:
                return float(result['avg_daily_sales'])
            
            # If no sales data, return default based on category patterns
            return 2.0  # Default assumption
            
        except Exception as e:
            self.logger.error(f"Error getting sales velocity for batch {batch_id}: {e}")
            return 1.0  # Conservative default
    
    async def get_high_urgency_batches(self, store_id: str, min_score: float = 0.6) -> List[Dict]:
        """Get batches with high urgency scores"""
        if not self.conn:
            await self.connect()
        
        query = """
            SELECT 
                b.batch_id,
                b.batch_number,
                p.sku,
                p.name as product_name,
                p.category,
                b.current_quantity,
                b.selling_price,
                b.expiry_date,
                s.composite_score,
                s.recommendation,
                s.calculated_at
            FROM inventory.batches b
            JOIN inventory.products p ON b.product_id = p.product_id
            JOIN scoring.product_scores s ON b.batch_id = s.batch_id
            WHERE b.store_id = $1 
            AND b.status = 'active'
            AND s.composite_score >= $2
            ORDER BY s.composite_score DESC, b.expiry_date ASC
        """
        
        try:
            results = await self.conn.fetch(query, store_id, min_score)
            
            batches = []
            for row in results:
                days_to_expiry = (row['expiry_date'] - datetime.now().date()).days
                
                batches.append({
                    'batch_id': str(row['batch_id']),
                    'batch_number': row['batch_number'],
                    'sku': row['sku'],
                    'product_name': row['product_name'],
                    'category': row['category'],
                    'quantity': float(row['current_quantity']),
                    'selling_price': float(row['selling_price']),
                    'days_to_expiry': days_to_expiry,
                    'composite_score': float(row['composite_score']),
                    'recommendation': row['recommendation'],
                    'urgency_level': self._get_urgency_level(days_to_expiry, float(row['composite_score'])),
                    'potential_loss': float(row['current_quantity']) * float(row['selling_price']),
                    'calculated_at': row['calculated_at'].isoformat()
                })
            
            return batches
            
        except Exception as e:
            self.logger.error(f"Error getting high urgency batches: {e}")
            return []
    
    def _get_urgency_level(self, days_to_expiry: int, composite_score: float) -> str:
        """Determine urgency level based on days to expiry and score"""
        if days_to_expiry <= 0 or composite_score >= 0.9:
            return 'critical'
        elif days_to_expiry <= 1 or composite_score >= 0.8:
            return 'high'
        elif days_to_expiry <= 3 or composite_score >= 0.6:
            return 'medium'
        else:
            return 'low'
    
    async def schedule_batch_scoring(self, store_id: str) -> bool:
        """Schedule regular batch scoring for a store"""
        try:
            result = await self.calculate_batch_scores(store_id)
            self.logger.info(f"Scheduled scoring for store {store_id}: {result['processed']} batches processed")
            return True
        except Exception as e:
            self.logger.error(f"Failed to schedule scoring for store {store_id}: {e}")
            return False

# Factory function for easy instantiation
def create_scoring_service(database_url: str = None) -> ScoringService:
    """Create a scoring service instance"""
    if not database_url:
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            raise ValueError("DATABASE_URL environment variable is required")
    
    return ScoringService(database_url)

# Main execution for standalone scoring
async def main():
    """Main function for standalone execution"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python engine.py <store_id>")
        sys.exit(1)
    
    store_id = sys.argv[1]
    
    try:
        service = create_scoring_service()
        await service.connect()
        
        print(f"Calculating scores for store: {store_id}")
        result = await service.calculate_batch_scores(store_id)
        
        print(f"✅ Processed: {result['processed']} batches")
        if result['errors']:
            print(f"❌ Errors: {len(result['errors'])}")
            for error in result['errors'][:5]:  # Show first 5 errors
                print(f"   {error}")
        
        # Show high urgency items
        urgent_batches = await service.get_high_urgency_batches(store_id)
        if urgent_batches:
            print(f"\n🚨 High urgency items ({len(urgent_batches)}):")
            for batch in urgent_batches[:10]:  # Show top 10
                print(f"   {batch['sku']}: {batch['product_name']} - Score: {batch['composite_score']:.2f} - {batch['days_to_expiry']} days")
        
        await service.disconnect()
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())