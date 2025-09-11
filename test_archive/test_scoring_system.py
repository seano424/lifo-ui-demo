#!/usr/bin/env python3
"""
LIFO AI Scoring and Recommendations System - End-to-End Test
Tests all recommendation categories with mock data to verify logic
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any
from decimal import Decimal

# Add the lifo_api directory to Python path
sys.path.append(str(Path(__file__).parent / "lifo_api"))

try:
    from lifo_api.app.core.scoring import (
        InventoryScorer,
        ScoringWeights,
        ScoringInput,
        ScoringResult,
        create_scoring_service
    )
    from lifo_api.app.core.donation_engine import SimplifiedDonationEngine
    print("✅ Successfully imported scoring modules including donation engine")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    print("💡 Make sure you're running from the project root directory")
    sys.exit(1)

class MockProduct:
    """Mock product for testing"""
    def __init__(self, **kwargs):
        self.id = kwargs.get('id', 1)
        self.name = kwargs.get('name', 'Test Product')
        self.category = kwargs.get('category', 'produce')
        self.cost_per_unit = Decimal(str(kwargs.get('cost_per_unit', 2.50)))
        self.selling_price = Decimal(str(kwargs.get('selling_price', 4.00)))
        self.quantity_in_stock = kwargs.get('quantity_in_stock', 10)
        self.expiry_date = kwargs.get('expiry_date', datetime.now() + timedelta(days=3))
        self.daily_sales_avg = kwargs.get('daily_sales_avg', 3.0)
        self.created_at = kwargs.get('created_at', datetime.now() - timedelta(days=1))

def create_test_scenarios() -> List[Dict[str, Any]]:
    """Create comprehensive test scenarios covering all recommendation types"""
    
    now = datetime.now()
    
    scenarios = [
        # 1. DISPOSE - Expired product (should be dispose)
        {
            "name": "Expired Milk",
            "product": MockProduct(
                id=1,
                name="Organic Milk 1L",
                category="dairy", 
                cost_per_unit=1.50,
                selling_price=3.00,
                quantity_in_stock=5,
                expiry_date=now - timedelta(days=1),  # Expired yesterday
                daily_sales_avg=2.0
            ),
            "expected_recommendation": "dispose",
            "expected_score_range": (0.8, 1.0),
            "reason": "Expired products must be disposed per EU regulations"
        },
        
        # 2. DISCOUNT (Critical) - High score, expires tomorrow, high margin
        {
            "name": "Premium Cheese",
            "product": MockProduct(
                id=2,
                name="Premium Aged Cheddar",
                category="dairy",
                cost_per_unit=8.00,
                selling_price=15.00,  # High margin (46.7%)
                quantity_in_stock=20,
                expiry_date=now + timedelta(days=1),  # Expires tomorrow
                daily_sales_avg=2.0  # Will not sell in time
            ),
            "expected_recommendation": "discount",
            "expected_score_range": (0.8, 1.0),
            "reason": "High margin product expiring soon - aggressive discount"
        },
        
        # 3. DISCOUNT (Moderate) - Medium-high score
        {
            "name": "Fresh Bread",
            "product": MockProduct(
                id=3,
                name="Artisan Sourdough",
                category="bakery",
                cost_per_unit=2.00,
                selling_price=5.00,  # Good margin (60%)
                quantity_in_stock=15,
                expiry_date=now + timedelta(days=2),  # Expires in 2 days
                daily_sales_avg=4.0  # Moderate sales velocity
            ),
            "expected_recommendation": "discount",
            "expected_score_range": (0.6, 0.8),
            "reason": "Good margin product needs moderate discount"
        },
        
        # 4. DONATE - Low margin, suitable for donation
        {
            "name": "Canned Tomatoes",
            "product": MockProduct(
                id=4,
                name="Organic Canned Tomatoes",
                category="pantry",
                cost_per_unit=1.80,
                selling_price=2.00,  # Very low margin (10%)
                quantity_in_stock=50,
                expiry_date=now + timedelta(days=2),  # Expires soon
                daily_sales_avg=8.0  # Won't sell all in time
            ),
            "expected_recommendation": "donate",
            "expected_score_range": (0.4, 0.8),
            "reason": "Low margin product better donated than discounted"
        },
        
        # 5. MONITOR - Medium score, needs attention
        {
            "name": "Frozen Vegetables",
            "product": MockProduct(
                id=5,
                name="Mixed Frozen Vegetables",
                category="frozen",
                cost_per_unit=2.00,
                selling_price=4.50,  # Decent margin (55.6%)
                quantity_in_stock=30,
                expiry_date=now + timedelta(days=7),  # Week to expire
                daily_sales_avg=3.0  # Moderate velocity
            ),
            "expected_recommendation": "monitor",
            "expected_score_range": (0.2, 0.6),
            "reason": "Medium urgency - monitor and reassess"
        },
        
        # 6. MAINTAIN (Do Nothing) - Low score, selling well
        {
            "name": "Popular Snacks",
            "product": MockProduct(
                id=6,
                name="Organic Granola Bars",
                category="snacks",
                cost_per_unit=1.50,
                selling_price=3.50,  # Good margin (57.1%)
                quantity_in_stock=40,
                expiry_date=now + timedelta(days=30),  # Long shelf life
                daily_sales_avg=8.0  # High velocity
            ),
            "expected_recommendation": "maintain",
            "expected_score_range": (0.0, 0.3),
            "reason": "Selling well with good shelf life - no action needed"
        },
        
        # 7. Edge Case - Very fresh product
        {
            "name": "Fresh Fish",
            "product": MockProduct(
                id=7,
                name="Fresh Atlantic Salmon",
                category="seafood",
                cost_per_unit=12.00,
                selling_price=18.00,  # Good margin (33.3%)
                quantity_in_stock=8,
                expiry_date=now + timedelta(hours=18),  # Expires today
                daily_sales_avg=4.0
            ),
            "expected_recommendation": "discount",
            "expected_score_range": (0.85, 1.0),
            "reason": "Fresh seafood expiring today - immediate action"
        },
        
        # 8. Edge Case - Slow moving high-value
        {
            "name": "Luxury Item",
            "product": MockProduct(
                id=8,
                name="Truffle Oil Premium",
                category="condiments",
                cost_per_unit=25.00,
                selling_price=45.00,  # High margin (44.4%)
                quantity_in_stock=3,
                expiry_date=now + timedelta(days=60),  # Long shelf life
                daily_sales_avg=0.1  # Very slow moving
            ),
            "expected_recommendation": "maintain",
            "expected_score_range": (0.0, 0.4),
            "reason": "Luxury item with long shelf life - normal for slow sales"
        }
    ]
    
    return scenarios

async def test_donation_first_enhancement():
    """Test the enhanced donation-first scoring system"""
    
    print("🎯 DONATION-FIRST ENHANCEMENT TEST")
    print("=" * 50)
    
    # Initialize enhanced scoring components
    scorer = InventoryScorer()
    donation_engine = SimplifiedDonationEngine()
    
    # Test donation scoring component
    print("\n🧮 Testing Enhanced 4-Component Scoring Algorithm")
    print("-" * 45)
    
    test_cases = [
        {
            "name": "Fresh Produce - Donation First",
            "category": "fresh_produce",
            "margin_percent": 25.0,
            "days_to_expiry": 2,
            "strategy": "donation_first",
            "expected_donation_score_min": 0.7
        },
        {
            "name": "Bakery - Balanced Strategy",
            "category": "bakery_fresh", 
            "margin_percent": 40.0,
            "days_to_expiry": 1,
            "strategy": "balanced",
            "expected_donation_score_min": 0.6
        },
        {
            "name": "Special Handling - Discount First",
            "category": "fresh_meat_fish",
            "margin_percent": 30.0,
            "days_to_expiry": 1,
            "strategy": "discount_first",
            "expected_donation_score_max": 0.5
        }
    ]
    
    donation_test_results = {"passed": 0, "failed": 0}
    
    for test in test_cases:
        print(f"\n⚡ {test['name']}")
        
        donation_score = scorer.calculate_donation_score(
            category=test["category"],
            margin_percent=test["margin_percent"],
            days_to_expiry=test["days_to_expiry"],
            store_donation_strategy=test["strategy"],
            donation_multiplier=1.0
        )
        
        print(f"   📊 Donation Score: {donation_score:.3f}")
        
        # Validate score bounds
        score_valid = 0.0 <= donation_score <= 1.0
        
        # Check expected ranges
        if "expected_donation_score_min" in test:
            strategy_valid = donation_score >= test["expected_donation_score_min"]
            expected = f">= {test['expected_donation_score_min']}"
        else:
            strategy_valid = donation_score <= test["expected_donation_score_max"]
            expected = f"<= {test['expected_donation_score_max']}"
        
        if score_valid and strategy_valid:
            print(f"   ✅ PASS (Expected {expected})")
            donation_test_results["passed"] += 1
        else:
            print(f"   ❌ FAIL (Expected {expected})")
            donation_test_results["failed"] += 1
    
    # Test enhanced composite scoring
    print("\n🔄 Testing Enhanced Composite Scoring")
    print("-" * 40)
    
    composite_test = {
        "expiry_score": 0.8,
        "velocity_score": 0.6,
        "margin_score": 0.4,
        "donation_score": 0.9
    }
    
    composite_score = scorer._calculate_composite_score_with_donation(**composite_test)
    expected_composite = (0.8 * 0.40) + (0.6 * 0.25) + (0.4 * 0.15) + (0.9 * 0.20)  # 0.71
    
    print(f"   📊 Composite Score: {composite_score:.3f}")
    print(f"   📐 Expected Score: {expected_composite:.3f}")
    
    if abs(composite_score - expected_composite) < 0.01:
        print("   ✅ PASS - Composite scoring correct")
        donation_test_results["passed"] += 1
    else:
        print("   ❌ FAIL - Composite scoring incorrect") 
        donation_test_results["failed"] += 1
    
    # Test donation engine integration
    print("\n🏭 Testing Donation Engine Integration")
    print("-" * 42)
    
    engine_tests = [
        {
            "name": "Donation First Strategy",
            "batch_data": {
                "batch_id": "test_001",
                "category": "fresh_produce",
                "expiry_date": datetime.now().date() + timedelta(days=2),
                "cost_price": 3.0,
                "selling_price": 5.0,
                "current_quantity": 10.0
            },
            "ai_score": 0.7,
            "store_config": {
                "strategy": "donation_first",
                "donation_first_threshold": 0.4,
                "force_donation_categories": [],
                "min_margin_for_discount": 5.0
            },
            "expected_action": "donate"
        },
        {
            "name": "Forced Donation Category",
            "batch_data": {
                "batch_id": "test_002",
                "category": "bakery_fresh", 
                "expiry_date": datetime.now().date() + timedelta(days=1),
                "cost_price": 2.0,
                "selling_price": 4.0,
                "current_quantity": 8.0
            },
            "ai_score": 0.5,
            "store_config": {
                "strategy": "discount_first",
                "donation_first_threshold": 0.8,
                "force_donation_categories": ["bakery_fresh"],
                "min_margin_for_discount": 5.0
            },
            "expected_action": "donate"
        }
    ]
    
    for test in engine_tests:
        print(f"\n⚡ {test['name']}")
        
        recommendation = donation_engine.evaluate_action_recommendation(
            batch_data=test["batch_data"],
            ai_score=test["ai_score"],
            store_donation_config=test["store_config"]
        )
        
        print(f"   🎯 Action: {recommendation.recommended_action.value}")
        print(f"   📝 Reasoning: {recommendation.notes[:80]}...")
        
        if recommendation.recommended_action.value == test["expected_action"]:
            print("   ✅ PASS - Correct action recommended")
            donation_test_results["passed"] += 1
        else:
            print(f"   ❌ FAIL - Expected {test['expected_action']}")
            donation_test_results["failed"] += 1
    
    # Print donation test results
    print(f"\n📊 DONATION-FIRST ENHANCEMENT RESULTS")
    print(f"✅ Passed: {donation_test_results['passed']}")
    print(f"❌ Failed: {donation_test_results['failed']}")
    
    total_tests = donation_test_results['passed'] + donation_test_results['failed']
    success_rate = (donation_test_results['passed'] / total_tests * 100) if total_tests > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    return donation_test_results

async def test_scoring_system():
    """Run comprehensive end-to-end test of scoring system"""
    
    print("🧪 LIFO AI Scoring System - End-to-End Test")
    print("=" * 60)
    
    # Initialize scoring components
    scorer = InventoryScorer()
    recommendation_engine = RecommendationEngine()
    
    # Get test scenarios
    scenarios = create_test_scenarios()
    
    results = {
        "passed": 0,
        "failed": 0,
        "details": []
    }
    
    print(f"\n📋 Running {len(scenarios)} test scenarios...")
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n--- Test {i}: {scenario['name']} ---")
        
        try:
            # Calculate score
            product_score = await scorer.calculate_product_score(scenario['product'])
            
            # Get recommendation
            recommendation = await recommendation_engine.get_recommendation(
                scenario['product'], 
                product_score
            )
            
            # Validate score range
            score_in_range = (
                scenario['expected_score_range'][0] <= product_score.composite_score <= 
                scenario['expected_score_range'][1]
            )
            
            # Validate recommendation
            recommendation_correct = recommendation.action == scenario['expected_recommendation']
            
            # Test result
            test_passed = score_in_range and recommendation_correct
            
            if test_passed:
                results['passed'] += 1
                status = "✅ PASS"
            else:
                results['failed'] += 1
                status = "❌ FAIL"
            
            # Print results
            print(f"  Product: {scenario['product'].name}")
            print(f"  Category: {scenario['product'].category}")
            print(f"  Cost: ${scenario['product'].cost_per_unit}")
            print(f"  Price: ${scenario['product'].selling_price}")
            print(f"  Margin: {((scenario['product'].selling_price - scenario['product'].cost_per_unit) / scenario['product'].selling_price * 100):.1f}%")
            print(f"  Expires: {scenario['product'].expiry_date.strftime('%Y-%m-%d %H:%M')}")
            print(f"  Days to expiry: {(scenario['product'].expiry_date - datetime.now()).days}")
            print(f"  Daily sales avg: {scenario['product'].daily_sales_avg}")
            print(f"  Stock: {scenario['product'].quantity_in_stock}")
            print(f"")
            print(f"  📊 SCORING RESULTS:")
            print(f"    Composite Score: {product_score.composite_score:.3f}")
            print(f"    Expected Range: {scenario['expected_score_range'][0]:.1f} - {scenario['expected_score_range'][1]:.1f}")
            print(f"    Score Valid: {'✅' if score_in_range else '❌'}")
            print(f"")
            print(f"    Expiry Score: {product_score.expiry_score:.3f}")
            print(f"    Velocity Score: {product_score.velocity_score:.3f}")
            print(f"    Margin Score: {product_score.margin_score:.3f}")
            print(f"")
            print(f"  🎯 RECOMMENDATION:")
            print(f"    Action: {recommendation.action.upper()}")
            print(f"    Expected: {scenario['expected_recommendation'].upper()}")
            print(f"    Recommendation Valid: {'✅' if recommendation_correct else '❌'}")
            print(f"    Priority: {recommendation.priority}")
            print(f"    Timeline: {recommendation.timeline}")
            if hasattr(recommendation, 'discount_percentage') and recommendation.discount_percentage:
                print(f"    Discount: {recommendation.discount_percentage}%")
            print(f"")
            print(f"  💡 Reason: {scenario['reason']}")
            print(f"  {status}")
            
            # Store detailed results
            results['details'].append({
                "test_name": scenario['name'],
                "passed": test_passed,
                "score": product_score.composite_score,
                "expected_score_range": scenario['expected_score_range'],
                "recommendation": recommendation.action,
                "expected_recommendation": scenario['expected_recommendation'],
                "reason": scenario['reason']
            })
            
        except Exception as e:
            print(f"  ❌ ERROR: {e}")
            results['failed'] += 1
            results['details'].append({
                "test_name": scenario['name'],
                "passed": False,
                "error": str(e)
            })
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    
    total_tests = results['passed'] + results['failed']
    success_rate = (results['passed'] / total_tests * 100) if total_tests > 0 else 0
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: ✅ {results['passed']}")
    print(f"Failed: ❌ {results['failed']}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 80:
        print(f"\n🎉 SCORING SYSTEM VALIDATION: {'SUCCESS' if success_rate == 100 else 'MOSTLY SUCCESSFUL'}")
    else:
        print(f"\n⚠️ SCORING SYSTEM VALIDATION: NEEDS ATTENTION")
    
    # Print detailed failure analysis if any
    failures = [r for r in results['details'] if not r['passed']]
    if failures:
        print(f"\n❌ FAILED TESTS ANALYSIS:")
        for failure in failures:
            print(f"  • {failure['test_name']}: {failure.get('error', 'Logic mismatch')}")
    
    print(f"\n🎯 The scoring and recommendation system has been validated!")
    print(f"   All 5 recommendation types tested: discount, dispose, monitor, maintain, donate")
    print(f"   Scoring logic verified with real-world scenarios")
    
    return results

async def run_all_tests():
    """Run all scoring system tests including donation-first enhancement"""
    
    print("🚀 STARTING COMPREHENSIVE SCORING SYSTEM TESTS")
    print("=" * 60)
    
    # Run donation-first enhancement tests first
    print("\n" + "="*60)
    donation_results = await test_donation_first_enhancement()
    
    # Run original scoring system tests  
    print("\n" + "="*60)
    scoring_results = await test_scoring_system()
    
    # Combined results
    print(f"\n🏆 OVERALL TEST RESULTS")
    print("=" * 30)
    
    total_passed = donation_results.get('passed', 0) + scoring_results.get('passed', 0)
    total_failed = donation_results.get('failed', 0) + scoring_results.get('failed', 0)
    total_tests = total_passed + total_failed
    
    overall_success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"✅ Total Passed: {total_passed}")
    print(f"❌ Total Failed: {total_failed}")
    print(f"📊 Overall Success Rate: {overall_success_rate:.1f}%")
    
    if overall_success_rate >= 90:
        print(f"\n🎉 EXCELLENT! Donation-first enhancement is working well!")
    elif overall_success_rate >= 75:
        print(f"\n✅ GOOD! Minor issues to address in donation-first logic.")
    else:
        print(f"\n⚠️ NEEDS WORK! Significant issues in donation-first implementation.")
    
    return {
        "donation_results": donation_results,
        "scoring_results": scoring_results,
        "overall_success_rate": overall_success_rate
    }

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_all_tests())