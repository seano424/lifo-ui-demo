#!/usr/bin/env python3
"""
Debugging and Analysis for Donation-First System Issues
Investigating why the system is not behaving as expected in real-world scenarios
"""

import sys
from pathlib import Path
from datetime import datetime, date, timedelta
from unittest.mock import AsyncMock

# Add the lifo_api directory to Python path
sys.path.append(str(Path(__file__).parent / "lifo_api"))

try:
    from lifo_api.app.core.scoring import InventoryScorer, ScoringWeights
    from lifo_api.app.core.donation_engine import SimplifiedDonationEngine, ActionType
    print("✅ Successfully imported modules for debugging")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)


def debug_donation_scoring():
    """Debug the donation scoring algorithm"""
    
    print("🔍 DEBUGGING DONATION SCORING ALGORITHM")
    print("=" * 50)
    
    mock_db = AsyncMock()
    scorer = InventoryScorer(mock_db)
    
    # Test cases that should score high for donation
    test_cases = [
        {
            "name": "Fresh Produce - Donation First",
            "category": "fresh_produce",
            "margin_percent": 41.6,  # From failed apples test
            "days_to_expiry": 3,
            "strategy": "donation_first"
        },
        {
            "name": "Fresh Produce - Balanced", 
            "category": "fresh_produce",
            "margin_percent": 51.8,  # From bananas
            "days_to_expiry": 2,
            "strategy": "balanced"
        },
        {
            "name": "Bakery Fresh - Critical",
            "category": "bakery_fresh",
            "margin_percent": 59.9,  # From bread
            "days_to_expiry": 1,
            "strategy": "donation_first"
        },
        {
            "name": "High Margin Meat",
            "category": "fresh_meat_fish", 
            "margin_percent": 36.8,  # From ribeye
            "days_to_expiry": 2,
            "strategy": "balanced"
        }
    ]
    
    for test in test_cases:
        print(f"\n🧮 {test['name']}")
        
        score = scorer.calculate_donation_score(
            category=test["category"],
            margin_percent=test["margin_percent"],
            days_to_expiry=test["days_to_expiry"],
            store_donation_strategy=test["strategy"],
            donation_multiplier=1.0
        )
        
        print(f"   Category: {test['category']}")
        print(f"   Margin: {test['margin_percent']:.1f}%")
        print(f"   Days to expiry: {test['days_to_expiry']}")
        print(f"   Strategy: {test['strategy']}")
        print(f"   📊 Donation Score: {score:.3f}")
        
        # Break down the scoring components
        print(f"   🔧 Score Analysis:")
        
        # Expected high scores for donation-suitable categories with good timing
        if test["category"] in ["fresh_produce", "bakery_fresh"] and test["days_to_expiry"] <= 3:
            if score < 0.6:
                print(f"   ❌ ISSUE: Expected high score for {test['category']} with {test['days_to_expiry']} days")
            else:
                print(f"   ✅ Good donation score for perishable category")
        
        # Check strategy impact
        if test["strategy"] == "donation_first" and score < 0.5:
            print(f"   ❌ ISSUE: donation_first strategy should boost scores")


def debug_donation_engine():
    """Debug the donation engine decision logic"""
    
    print(f"\n🏭 DEBUGGING DONATION ENGINE LOGIC")  
    print("=" * 50)
    
    engine = SimplifiedDonationEngine()
    
    # Test problem cases from simulation
    problem_cases = [
        {
            "name": "High Margin Meat (Should Discount)",
            "batch_data": {
                "batch_id": "STEAK_DEBUG",
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
            "expected": "Should discount or maintain, got maintain"
        },
        {
            "name": "Premium Item (Should Discount First)",
            "batch_data": {
                "batch_id": "TRUFFLE_DEBUG",
                "category": "specialty_items",
                "expiry_date": date.today() + timedelta(days=30),
                "cost_price": 15.00,
                "selling_price": 39.99,
                "current_quantity": 6.0
            },
            "ai_score": 0.14,
            "store_config": {
                "strategy": "discount_first",
                "donation_first_threshold": 0.8,
                "min_margin_for_discount": 15.0
            },
            "expected": "Should discount, got maintain"
        },
        {
            "name": "Low Margin Dairy (Should Donate)",
            "batch_data": {
                "batch_id": "EGGS_DEBUG",
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
                "min_margin_for_discount": 3.0
            },
            "expected": "High AI score with low margin should favor donation"
        }
    ]
    
    for test in problem_cases:
        print(f"\n🔧 {test['name']}")
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=test["batch_data"],
            ai_score=test["ai_score"],
            store_donation_config=test["store_config"]
        )
        
        # Calculate metrics for analysis
        cost = test["batch_data"]["cost_price"]
        price = test["batch_data"]["selling_price"]
        margin_percent = ((price - cost) / price) * 100
        days_to_expiry = (test["batch_data"]["expiry_date"] - date.today()).days
        
        print(f"   📊 Input Analysis:")
        print(f"      Category: {test['batch_data']['category']}")
        print(f"      Margin: {margin_percent:.1f}%")
        print(f"      Days to expiry: {days_to_expiry}")
        print(f"      AI Score: {test['ai_score']}")
        print(f"      Strategy: {test['store_config']['strategy']}")
        print(f"      Min margin threshold: {test['store_config']['min_margin_for_discount']}")
        
        print(f"   🎯 Recommendation:")
        print(f"      Action: {recommendation.recommended_action.value}")
        print(f"      Priority: {recommendation.priority.value}")
        print(f"      Reasoning: {recommendation.notes[:100]}...")
        
        print(f"   🤔 Analysis: {test['expected']}")


def test_scoring_weights():
    """Test if scoring weights are working correctly"""
    
    print(f"\n⚖️ TESTING SCORING WEIGHTS")
    print("=" * 50)
    
    weights = ScoringWeights()
    print(f"📊 Current Weights:")
    print(f"   Expiry: {weights.expiry:.2f} (40%)")
    print(f"   Velocity: {weights.velocity:.2f} (25%)")
    print(f"   Margin: {weights.margin:.2f} (15%)")
    print(f"   Donation: {weights.donation:.2f} (20%)")
    print(f"   Total: {weights.expiry + weights.velocity + weights.margin + weights.donation:.2f}")
    
    # Test composite scoring
    mock_db = AsyncMock()
    scorer = InventoryScorer(mock_db)
    
    test_scores = {
        "expiry_score": 0.9,   # High urgency
        "velocity_score": 0.3,  # Slow moving
        "margin_score": 0.7,    # Good margin
        "donation_score": 0.8   # High donation suitability
    }
    
    composite = scorer._calculate_composite_score_with_donation(**test_scores, weights=weights)
    expected = (0.9 * 0.40) + (0.3 * 0.25) + (0.7 * 0.15) + (0.8 * 0.20)
    
    print(f"\n🧮 Composite Score Test:")
    print(f"   Expiry (0.9): {0.9 * weights.expiry:.3f}")
    print(f"   Velocity (0.3): {0.3 * weights.velocity:.3f}")
    print(f"   Margin (0.7): {0.7 * weights.margin:.3f}")
    print(f"   Donation (0.8): {0.8 * weights.donation:.3f}")
    print(f"   Expected Total: {expected:.3f}")
    print(f"   Actual Total: {composite:.3f}")
    
    if abs(composite - expected) < 0.001:
        print(f"   ✅ Composite scoring working correctly")
    else:
        print(f"   ❌ Composite scoring calculation error")


def test_threshold_logic():
    """Test if donation thresholds are being applied correctly"""
    
    print(f"\n🎯 TESTING DONATION THRESHOLD LOGIC")
    print("=" * 50)
    
    engine = SimplifiedDonationEngine()
    
    # Test threshold scenarios
    threshold_tests = [
        {
            "name": "Just Above Donation First Threshold",
            "ai_score": 0.45,  # Above 0.4 threshold
            "strategy": "donation_first",
            "threshold": 0.4,
            "expected": "donate"
        },
        {
            "name": "Just Below Donation First Threshold", 
            "ai_score": 0.35,  # Below 0.4 threshold
            "strategy": "donation_first", 
            "threshold": 0.4,
            "expected": "discount or maintain"
        },
        {
            "name": "Just Above Balanced Threshold",
            "ai_score": 0.65,  # Above 0.6 threshold
            "strategy": "balanced",
            "threshold": 0.6,
            "expected": "donate"
        },
        {
            "name": "Just Below Balanced Threshold",
            "ai_score": 0.55,  # Below 0.6 threshold
            "strategy": "balanced",
            "threshold": 0.6, 
            "expected": "discount or maintain"
        }
    ]
    
    for test in threshold_tests:
        batch_data = {
            "batch_id": f"THRESHOLD_TEST_{test['name'][:10]}",
            "category": "fresh_produce",  # Donation suitable category
            "expiry_date": date.today() + timedelta(days=2),
            "cost_price": 3.00,
            "selling_price": 5.00,
            "current_quantity": 10.0
        }
        
        store_config = {
            "strategy": test["strategy"],
            "donation_first_threshold": test["threshold"],
            "force_donation_categories": [],
            "min_margin_for_discount": 5.0
        }
        
        recommendation = engine.evaluate_action_recommendation(
            batch_data=batch_data,
            ai_score=test["ai_score"],
            store_donation_config=store_config
        )
        
        print(f"\n🎯 {test['name']}")
        print(f"   AI Score: {test['ai_score']} (threshold: {test['threshold']})")
        print(f"   Strategy: {test['strategy']}")
        print(f"   Result: {recommendation.recommended_action.value}")
        print(f"   Expected: {test['expected']}")
        
        # Check if result matches expectation
        if "donate" in test["expected"] and recommendation.recommended_action.value != "donate":
            print(f"   ❌ Expected donation but got {recommendation.recommended_action.value}")
        elif "donate" not in test["expected"] and recommendation.recommended_action.value == "donate":
            print(f"   ❌ Unexpected donation for score below threshold")
        else:
            print(f"   ✅ Threshold logic working correctly")


def main():
    """Run all debugging tests"""
    
    print("🚨 DONATION-FIRST SYSTEM DEBUGGING ANALYSIS")
    print("=" * 60)
    
    debug_donation_scoring()
    debug_donation_engine()
    test_scoring_weights()
    test_threshold_logic()
    
    print(f"\n🏁 DEBUGGING SUMMARY")
    print("=" * 30)
    print("Key areas to investigate:")
    print("1. 🔍 Donation scoring calculation may be too conservative")
    print("2. 🎯 Threshold logic may not be triggering correctly")  
    print("3. ⚖️ Balance between donation vs maintain/discount decisions")
    print("4. 📈 AI score integration with donation engine thresholds")
    print("5. 🏪 Store strategy impact on final recommendations")


if __name__ == "__main__":
    main()