#!/usr/bin/env python3
"""
Test the two critical fixes for European pilot:
1. Bulk quantity awareness 
2. European threshold adjustments
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


def test_bulk_quantity_fix():
    """Test that bulk quantity awareness works correctly"""
    
    print("🏭 TESTING BULK QUANTITY AWARENESS")
    print("=" * 45)
    
    engine = SimplifiedDonationEngine()
    
    bulk_scenarios = [
        {
            "name": "Bulk Rice - Classic Problem Case",
            "batch_data": {
                "batch_id": "BULK_RICE_001",
                "category": "dry_goods",
                "expiry_date": date.today() + timedelta(days=150),  # 5 months
                "cost_price": 25.00,
                "selling_price": 45.99,
                "current_quantity": 400.0  # BULK QUANTITY
            },
            "daily_sales_estimate": 1.67,  # 50/month = ~1.67/day
            "sellout_days": 240,  # 400 / 1.67 = 240 days needed
            "expected": "donate",  # 240 days needed > 150 days available
            "reason": "Should detect bulk mismatch and recommend donation"
        },
        {
            "name": "Seasonal Bulk Pumpkins",
            "batch_data": {
                "batch_id": "PUMPKIN_BULK",
                "category": "fresh_produce",
                "expiry_date": date.today() + timedelta(days=10),
                "cost_price": 2.00,
                "selling_price": 7.99,  # 75% margin
                "current_quantity": 150.0
            },
            "daily_sales_estimate": 2.0,
            "sellout_days": 75,  # Way more than 10 days available
            "expected": "donate",  # Should trigger bulk logic  
            "reason": "High quantity seasonal item with poor velocity"
        },
        {
            "name": "High Margin Bulk - Should Discount",
            "batch_data": {
                "batch_id": "PREMIUM_BULK", 
                "category": "specialty_items",
                "expiry_date": date.today() + timedelta(days=30),
                "cost_price": 10.00,
                "selling_price": 25.00,  # 60% margin
                "current_quantity": 50.0
            },
            "daily_sales_estimate": 0.8,
            "sellout_days": 62.5,  # More than 30 days available
            "expected": "discount",  # High margin should trigger discount for bulk
            "reason": "High margin bulk should discount to accelerate sales"
        },
        {
            "name": "Normal Quantity - Should NOT Trigger Bulk Logic",
            "batch_data": {
                "batch_id": "NORMAL_ITEM",
                "category": "fresh_produce", 
                "expiry_date": date.today() + timedelta(days=3),
                "cost_price": 2.00,
                "selling_price": 4.00,
                "current_quantity": 15.0  # Below bulk threshold (20)
            },
            "daily_sales_estimate": 8.0,
            "sellout_days": 1.9,  # Would sell out in time
            "expected": "normal_logic",  # Should use normal decision logic
            "reason": "Small quantity should use regular logic"
        }
    ]
    
    results = {"passed": 0, "failed": 0}
    
    for test in bulk_scenarios:
        print(f"\n🧪 {test['name']}")
        
        # Mock store config
        store_config = {
            "strategy": "balanced",
            "donation_first_threshold": 0.6,
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=test["batch_data"],
            ai_score=0.5,  # Moderate AI score
            store_donation_config=store_config
        )
        
        action = recommendation.recommended_action.value
        expected = test["expected"]
        
        # Calculate metrics for display
        cost = test["batch_data"]["cost_price"]
        price = test["batch_data"]["selling_price"] 
        quantity = test["batch_data"]["current_quantity"]
        days = (test["batch_data"]["expiry_date"] - date.today()).days
        margin = ((price - cost) / price) * 100
        
        print(f"   📊 Qty: {quantity}, Days: {days}, Margin: {margin:.1f}%")
        print(f"   📈 Estimated sellout: {test['sellout_days']} days")
        print(f"   🎯 Got: {action} | Expected: {expected}")
        print(f"   📝 Reasoning: {recommendation.notes[:80]}...")
        
        # Check if bulk logic triggered correctly
        if "Bulk quantity" in recommendation.notes:
            print(f"   ✅ Bulk logic DETECTED")
            if expected != "normal_logic" and action == expected:
                results["passed"] += 1
                print(f"   ✅ PASS - Correct bulk action")
            elif expected == "normal_logic":
                results["failed"] += 1
                print(f"   ❌ FAIL - Bulk logic shouldn't trigger for small quantities")
            else:
                results["failed"] += 1
                print(f"   ❌ FAIL - Wrong bulk action")
        else:
            print(f"   📝 Normal logic used")
            if expected == "normal_logic":
                results["passed"] += 1
                print(f"   ✅ PASS - Normal logic correctly applied")
            else:
                results["failed"] += 1
                print(f"   ❌ FAIL - Bulk logic should have triggered")
    
    print(f"\n📊 BULK LOGIC TEST RESULTS:")
    print(f"   ✅ Passed: {results['passed']}")
    print(f"   ❌ Failed: {results['failed']}")
    
    return results


def test_european_thresholds():
    """Test European threshold adjustments"""
    
    print(f"\n🇪🇺 TESTING EUROPEAN THRESHOLD ADJUSTMENTS")
    print("=" * 50)
    
    engine = SimplifiedDonationEngine()
    
    threshold_scenarios = [
        {
            "name": "Low Margin European (25%) - Should Donate",
            "batch_data": {
                "batch_id": "EU_LOW_MARGIN",
                "category": "dairy",
                "expiry_date": date.today() + timedelta(days=2),
                "cost_price": 2.25,
                "selling_price": 3.00,  # 25% margin
                "current_quantity": 10.0
            },
            "expected": "donate",
            "reason": "Below European disposal threshold (35%)"
        },
        {
            "name": "Medium Margin European (35%) - Threshold Edge",
            "batch_data": {
                "batch_id": "EU_MEDIUM_MARGIN", 
                "category": "fresh_produce",
                "expiry_date": date.today() + timedelta(days=2),
                "cost_price": 2.60,
                "selling_price": 4.00,  # 35% margin (exactly at threshold)
                "current_quantity": 10.0
            },
            "expected": "donate",
            "reason": "At European disposal threshold (35%)"
        },
        {
            "name": "High Margin European (45%) - Should Discount",
            "batch_data": {
                "batch_id": "EU_HIGH_MARGIN",
                "category": "bakery_fresh", 
                "expiry_date": date.today() + timedelta(days=2),
                "cost_price": 1.65,
                "selling_price": 3.00,  # 45% margin
                "current_quantity": 10.0
            },
            "expected": "discount",
            "reason": "Above European discount threshold (40%)"
        },
        {
            "name": "US-Style Low Margin (15%) - Would Discount in US",
            "batch_data": {
                "batch_id": "US_STYLE_LOW",
                "category": "dairy",
                "expiry_date": date.today() + timedelta(days=2), 
                "cost_price": 2.55,
                "selling_price": 3.00,  # 15% margin
                "current_quantity": 10.0
            },
            "expected": "donate", 
            "reason": "European system should donate (disposal costs), US would discount"
        }
    ]
    
    results = {"passed": 0, "failed": 0}
    
    for test in threshold_scenarios:
        print(f"\n🧪 {test['name']}")
        
        store_config = {
            "strategy": "balanced",
            "donation_first_threshold": 0.6,
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=test["batch_data"],
            ai_score=0.6,  # Moderate-high AI score
            store_donation_config=store_config
        )
        
        action = recommendation.recommended_action.value
        expected = test["expected"]
        
        # Calculate margin
        cost = test["batch_data"]["cost_price"]
        price = test["batch_data"]["selling_price"]
        margin = ((price - cost) / price) * 100
        days = (test["batch_data"]["expiry_date"] - date.today()).days
        
        print(f"   📊 Margin: {margin:.1f}%, Days: {days}")
        print(f"   🎯 Got: {action} | Expected: {expected}")
        print(f"   📝 Reasoning: {recommendation.notes[:80]}...")
        
        # Check for European-specific reasoning
        if "European" in recommendation.notes:
            print(f"   🇪🇺 European logic DETECTED")
        
        if action == expected:
            results["passed"] += 1
            print(f"   ✅ PASS")
        else:
            results["failed"] += 1
            print(f"   ❌ FAIL")
    
    print(f"\n📊 EUROPEAN THRESHOLD TEST RESULTS:")
    print(f"   ✅ Passed: {results['passed']}")
    print(f"   ❌ Failed: {results['failed']}")
    
    return results


def main():
    """Run both critical tests"""
    
    print("🔧 EUROPEAN PILOT - CRITICAL FIXES TEST")
    print("=" * 50)
    
    bulk_results = test_bulk_quantity_fix()
    threshold_results = test_european_thresholds()
    
    total_passed = bulk_results["passed"] + threshold_results["passed"]
    total_failed = bulk_results["failed"] + threshold_results["failed"]
    total_tests = total_passed + total_failed
    
    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\n🏆 OVERALL RESULTS:")
    print(f"   ✅ Total Passed: {total_passed}/{total_tests}")
    print(f"   ❌ Total Failed: {total_failed}/{total_tests}")
    print(f"   📈 Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 90:
        print(f"   🎉 EXCELLENT! Ready for European pilot")
    elif success_rate >= 75:
        print(f"   ✅ GOOD! Minor tweaks needed")
    else:
        print(f"   ⚠️ NEEDS WORK! Major fixes required")
    
    print(f"\n💡 PILOT READINESS:")
    if bulk_results["passed"] >= 3:
        print(f"   ✅ Bulk quantity logic working")
    else:
        print(f"   ❌ Bulk quantity logic needs fixes")
        
    if threshold_results["passed"] >= 3:
        print(f"   ✅ European thresholds working")
    else:
        print(f"   ❌ European thresholds need adjustment")


if __name__ == "__main__":
    main()