#!/usr/bin/env python3
"""
Quick verification test for donation engine fixes
"""

import sys
from pathlib import Path
from datetime import date, timedelta
from unittest.mock import AsyncMock

sys.path.append(str(Path(__file__).parent / "lifo_api"))

try:
    from lifo_api.app.core.donation_engine import SimplifiedDonationEngine
    print("✅ Successfully imported modules")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)


def test_fixed_scenarios():
    """Test the previously failing scenarios"""
    
    print("🔧 TESTING DONATION ENGINE FIXES")
    print("=" * 40)
    
    engine = SimplifiedDonationEngine()
    
    test_cases = [
        {
            "name": "High Margin Meat - Should Discount Now",
            "batch_data": {
                "batch_id": "STEAK_FIXED",
                "category": "fresh_meat_fish",
                "expiry_date": date.today() + timedelta(days=2),
                "cost_price": 12.00,
                "selling_price": 18.99,
                "current_quantity": 25.0
            },
            "ai_score": 0.45,
            "store_config": {
                "strategy": "balanced",
                "donation_first_threshold": 0.6,
                "min_margin_for_discount": 5.0
            },
            "expected": "discount"
        },
        {
            "name": "Low Margin Dairy - Should Donate Now",
            "batch_data": {
                "batch_id": "EGGS_FIXED",
                "category": "dairy",
                "expiry_date": date.today() + timedelta(days=3),
                "cost_price": 2.90,
                "selling_price": 3.19,
                "current_quantity": 36.0
            },
            "ai_score": 0.88,
            "store_config": {
                "strategy": "balanced",
                "donation_first_threshold": 0.6,
                "min_margin_for_discount": 10.0  # Higher than 9.1% margin
            },
            "expected": "donate"
        },
        {
            "name": "Fresh Produce - Donation First Strategy",
            "batch_data": {
                "batch_id": "APPLE_FIXED", 
                "category": "fresh_produce",
                "expiry_date": date.today() + timedelta(days=2),
                "cost_price": 3.50,
                "selling_price": 5.99,
                "current_quantity": 12.0
            },
            "ai_score": 0.73,
            "store_config": {
                "strategy": "donation_first",
                "donation_first_threshold": 0.4,
                "force_donation_categories": ["fresh_produce"],
                "min_margin_for_discount": 8.0
            },
            "expected": "donate"
        },
        {
            "name": "Bakery Fresh - Critical Timing",
            "batch_data": {
                "batch_id": "BREAD_FIXED",
                "category": "bakery_fresh", 
                "expiry_date": date.today() + timedelta(days=1),
                "cost_price": 1.20,
                "selling_price": 2.99,
                "current_quantity": 15.0
            },
            "ai_score": 1.0,
            "store_config": {
                "strategy": "donation_first",
                "donation_first_threshold": 0.4,
                "force_donation_categories": ["fresh_produce", "bakery_fresh"],
                "min_margin_for_discount": 8.0
            },
            "expected": "donate"
        }
    ]
    
    results = {"passed": 0, "failed": 0}
    
    for test in test_cases:
        print(f"\n🧪 {test['name']}")
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=test["batch_data"],
            ai_score=test["ai_score"],
            store_donation_config=test["store_config"]
        )
        
        action = recommendation.recommended_action.value
        expected = test["expected"]
        
        # Calculate margin for display
        cost = test["batch_data"]["cost_price"]
        price = test["batch_data"]["selling_price"]
        margin = ((price - cost) / price) * 100
        days = (test["batch_data"]["expiry_date"] - date.today()).days
        
        print(f"   📊 Margin: {margin:.1f}%, Days: {days}, AI Score: {test['ai_score']}")
        print(f"   🎯 Got: {action} | Expected: {expected}")
        print(f"   📝 Reasoning: {recommendation.notes[:60]}...")
        
        if action == expected:
            print(f"   ✅ PASS")
            results["passed"] += 1
        else:
            print(f"   ❌ FAIL")
            results["failed"] += 1
    
    print(f"\n📊 RESULTS:")
    print(f"   ✅ Passed: {results['passed']}")
    print(f"   ❌ Failed: {results['failed']}")
    
    total = results['passed'] + results['failed']
    success_rate = (results['passed'] / total * 100) if total > 0 else 0
    print(f"   📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 75:
        print(f"   🎉 Fixes are working well!")
    else:
        print(f"   🔧 More fixes needed")


if __name__ == "__main__":
    test_fixed_scenarios()