#!/usr/bin/env python3
"""
Real-World Scenario Testing for Donation-First Enhancement
Simulates various store types, business situations, and product scenarios
to validate the donation-first system behaves correctly in practice.
"""

import sys
import asyncio
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import Dict, List, Any
import json

# Add the lifo_api directory to Python path
sys.path.append(str(Path(__file__).parent / "lifo_api"))

try:
    from lifo_api.app.core.scoring import InventoryScorer
    from lifo_api.app.core.donation_engine import SimplifiedDonationEngine, DonationPriority, ActionType
    print("✅ Successfully imported donation-first modules")
except ImportError as e:
    print(f"❌ Import failed: {e}")
    sys.exit(1)


class RealWorldScenarioTester:
    """Test donation-first system with realistic business scenarios"""
    
    def __init__(self):
        from unittest.mock import AsyncMock
        mock_db = AsyncMock()
        self.scorer = InventoryScorer(mock_db)  # Mock DB for testing
        self.donation_engine = SimplifiedDonationEngine()
        self.test_results = []
    
    def create_grocery_store_scenarios(self) -> List[Dict[str, Any]]:
        """Create realistic grocery store scenarios"""
        return [
            # SCENARIO 1: Small Community Grocery - Donation First Strategy
            {
                "store_name": "Green Valley Community Market",
                "store_type": "Small Community Grocery",
                "strategy": "donation_first",
                "config": {
                    "strategy": "donation_first",
                    "donation_first_threshold": 0.4,
                    "force_donation_categories": ["fresh_produce", "bakery_fresh"],
                    "min_margin_for_discount": 8.0,
                    "donation_weight_multiplier": 1.5,
                    "social_impact_weight": 0.25
                },
                "inventory": [
                    {
                        "batch_id": "APPLE_001",
                        "sku": "APPLE_GALA_5LB",
                        "product_name": "Gala Apples 5lb bag",
                        "category": "fresh_produce",
                        "cost_price": 3.50,
                        "selling_price": 5.99,
                        "current_quantity": 12.0,
                        "expiry_date": date.today() + timedelta(days=3),
                        "daily_sales_avg": 2.5
                    },
                    {
                        "batch_id": "BREAD_001", 
                        "sku": "BREAD_WHOLE_WHEAT",
                        "product_name": "Fresh Whole Wheat Bread",
                        "category": "bakery_fresh",
                        "cost_price": 1.20,
                        "selling_price": 2.99,
                        "current_quantity": 15.0,
                        "expiry_date": date.today() + timedelta(days=1),
                        "daily_sales_avg": 8.0
                    },
                    {
                        "batch_id": "MILK_001",
                        "sku": "MILK_2PCT_1GAL", 
                        "product_name": "2% Milk 1 Gallon",
                        "category": "dairy",
                        "cost_price": 2.80,
                        "selling_price": 3.99,
                        "current_quantity": 8.0,
                        "expiry_date": date.today() + timedelta(days=4),
                        "daily_sales_avg": 12.0
                    }
                ],
                "expected_behavior": "Should strongly favor donation for produce and bakery items"
            },
            
            # SCENARIO 2: Large Chain Supermarket - Balanced Strategy  
            {
                "store_name": "MegaMart Superstore #47",
                "store_type": "Large Chain Supermarket",
                "strategy": "balanced",
                "config": {
                    "strategy": "balanced",
                    "donation_first_threshold": 0.6,
                    "force_donation_categories": [],
                    "min_margin_for_discount": 5.0,
                    "donation_weight_multiplier": 1.0,
                    "social_impact_weight": 0.15
                },
                "inventory": [
                    {
                        "batch_id": "STEAK_001",
                        "sku": "BEEF_RIBEYE_LB",
                        "product_name": "Ribeye Steak per lb",
                        "category": "fresh_meat_fish",
                        "cost_price": 12.00,
                        "selling_price": 18.99,
                        "current_quantity": 25.0,
                        "expiry_date": date.today() + timedelta(days=2),
                        "daily_sales_avg": 8.0
                    },
                    {
                        "batch_id": "YOGURT_001",
                        "sku": "YOGURT_GREEK_32OZ",
                        "product_name": "Greek Yogurt 32oz",
                        "category": "dairy",
                        "cost_price": 3.20,
                        "selling_price": 5.49,
                        "current_quantity": 30.0,
                        "expiry_date": date.today() + timedelta(days=5),
                        "daily_sales_avg": 15.0
                    },
                    {
                        "batch_id": "CEREAL_001",
                        "sku": "CEREAL_GRANOLA_18OZ",
                        "product_name": "Organic Granola Cereal",
                        "category": "dry_goods",
                        "cost_price": 2.75,
                        "selling_price": 6.99,
                        "current_quantity": 40.0,
                        "expiry_date": date.today() + timedelta(days=45),
                        "daily_sales_avg": 3.0
                    }
                ],
                "expected_behavior": "Should balance donation and discount based on margins and urgency"
            },
            
            # SCENARIO 3: Premium Organic Market - Discount First Strategy
            {
                "store_name": "Artisan Foods & Fine Groceries", 
                "store_type": "Premium Organic Market",
                "strategy": "discount_first",
                "config": {
                    "strategy": "discount_first",
                    "donation_first_threshold": 0.8,
                    "force_donation_categories": [],
                    "min_margin_for_discount": 15.0,
                    "donation_weight_multiplier": 0.8,
                    "social_impact_weight": 0.1
                },
                "inventory": [
                    {
                        "batch_id": "TRUFFLE_001",
                        "sku": "TRUFFLE_OIL_250ML",
                        "product_name": "Organic Truffle Oil 250ml", 
                        "category": "specialty_items",
                        "cost_price": 15.00,
                        "selling_price": 39.99,
                        "current_quantity": 6.0,
                        "expiry_date": date.today() + timedelta(days=30),
                        "daily_sales_avg": 0.3
                    },
                    {
                        "batch_id": "CHEESE_001",
                        "sku": "CHEESE_AGED_GOUDA_LB",
                        "product_name": "Aged Gouda Cheese per lb",
                        "category": "deli_prepared",
                        "cost_price": 8.50,
                        "selling_price": 16.99,
                        "current_quantity": 4.0,
                        "expiry_date": date.today() + timedelta(days=7),
                        "daily_sales_avg": 1.2
                    },
                    {
                        "batch_id": "WINE_001",
                        "sku": "WINE_ORGANIC_PINOT",
                        "product_name": "Organic Pinot Noir 2021",
                        "category": "alcohol",
                        "cost_price": 12.00,
                        "selling_price": 24.99,
                        "current_quantity": 12.0,
                        "expiry_date": date.today() + timedelta(days=365),
                        "daily_sales_avg": 0.8
                    }
                ],
                "expected_behavior": "Should prefer discounting high-margin items to recover revenue"
            },
            
            # SCENARIO 4: Urban Corner Store - Mixed Challenges
            {
                "store_name": "City Corner Convenience",
                "store_type": "Urban Corner Store", 
                "strategy": "balanced",
                "config": {
                    "strategy": "balanced",
                    "donation_first_threshold": 0.5,
                    "force_donation_categories": ["fresh_produce"],
                    "min_margin_for_discount": 10.0,
                    "donation_weight_multiplier": 1.2,
                    "social_impact_weight": 0.2
                },
                "inventory": [
                    {
                        "batch_id": "BANANA_001",
                        "sku": "BANANA_BUNCH",
                        "product_name": "Banana Bunch (6-8 bananas)",
                        "category": "fresh_produce",
                        "cost_price": 1.20,
                        "selling_price": 2.49,
                        "current_quantity": 20.0,
                        "expiry_date": date.today() + timedelta(days=2),
                        "daily_sales_avg": 15.0
                    },
                    {
                        "batch_id": "SANDWICH_001",
                        "sku": "SANDWICH_DELI_TURKEY",
                        "product_name": "Turkey Deli Sandwich",
                        "category": "deli_prepared",
                        "cost_price": 3.50,
                        "selling_price": 6.99,
                        "current_quantity": 8.0,
                        "expiry_date": date.today() + timedelta(days=1),
                        "daily_sales_avg": 12.0
                    },
                    {
                        "batch_id": "SODA_001",
                        "sku": "SODA_COLA_2L",
                        "product_name": "Cola 2-Liter Bottle",
                        "category": "beverages",
                        "cost_price": 1.10,
                        "selling_price": 2.99,
                        "current_quantity": 24.0,
                        "expiry_date": date.today() + timedelta(days=60),
                        "daily_sales_avg": 8.0
                    }
                ],
                "expected_behavior": "Should force donation for produce, balance others based on margins"
            }
        ]
    
    def create_stress_test_scenarios(self) -> List[Dict[str, Any]]:
        """Create challenging edge case scenarios"""
        return [
            # SCENARIO 5: Crisis Scenario - Multiple Expired Items
            {
                "store_name": "Emergency Food Rescue Test",
                "store_type": "Crisis Simulation",
                "strategy": "donation_first",
                "config": {
                    "strategy": "donation_first",
                    "donation_first_threshold": 0.3,
                    "force_donation_categories": ["fresh_produce", "bakery_fresh", "dairy"],
                    "min_margin_for_discount": 5.0,
                    "donation_weight_multiplier": 2.0,
                    "social_impact_weight": 0.3
                },
                "inventory": [
                    {
                        "batch_id": "EXPIRED_001",
                        "sku": "LETTUCE_ICEBERG",
                        "product_name": "Iceberg Lettuce Head", 
                        "category": "fresh_produce",
                        "cost_price": 1.00,
                        "selling_price": 2.99,
                        "current_quantity": 15.0,
                        "expiry_date": date.today() - timedelta(days=1),  # EXPIRED
                        "daily_sales_avg": 5.0
                    },
                    {
                        "batch_id": "CRITICAL_001",
                        "sku": "FISH_SALMON_FILLET",
                        "product_name": "Atlantic Salmon Fillet",
                        "category": "fresh_meat_fish",
                        "cost_price": 8.00,
                        "selling_price": 14.99,
                        "current_quantity": 6.0,
                        "expiry_date": date.today(),  # EXPIRES TODAY
                        "daily_sales_avg": 2.0
                    },
                    {
                        "batch_id": "URGENT_001",
                        "sku": "BERRIES_STRAWBERRY",
                        "product_name": "Fresh Strawberries 1lb",
                        "category": "fresh_produce", 
                        "cost_price": 2.50,
                        "selling_price": 4.99,
                        "current_quantity": 18.0,
                        "expiry_date": date.today() + timedelta(days=1),
                        "daily_sales_avg": 6.0
                    }
                ],
                "expected_behavior": "Expired items should be disposed, critical timing should trigger immediate action"
            },
            
            # SCENARIO 6: High Volume Slow-Moving Inventory
            {
                "store_name": "Bulk Foods Warehouse Test",
                "store_type": "High Volume Challenge",
                "strategy": "balanced",
                "config": {
                    "strategy": "balanced", 
                    "donation_first_threshold": 0.6,
                    "force_donation_categories": [],
                    "min_margin_for_discount": 8.0,
                    "donation_weight_multiplier": 1.0,
                    "social_impact_weight": 0.15
                },
                "inventory": [
                    {
                        "batch_id": "BULK_001",
                        "sku": "RICE_BROWN_50LB",
                        "product_name": "Brown Rice 50lb Bulk Bag",
                        "category": "dry_goods",
                        "cost_price": 25.00,
                        "selling_price": 45.99,
                        "current_quantity": 200.0,  # VERY HIGH QUANTITY
                        "expiry_date": date.today() + timedelta(days=180),
                        "daily_sales_avg": 0.5  # VERY SLOW MOVING
                    },
                    {
                        "batch_id": "SEASONAL_001",
                        "sku": "PUMPKIN_CARVING",
                        "product_name": "Carving Pumpkin Large",
                        "category": "fresh_produce",
                        "cost_price": 2.00,
                        "selling_price": 7.99,
                        "current_quantity": 150.0,
                        "expiry_date": date.today() + timedelta(days=10),  # Post-Halloween scenario
                        "daily_sales_avg": 2.0
                    }
                ],
                "expected_behavior": "Should recommend bulk promotions or donations for high quantities"
            },
            
            # SCENARIO 7: Low Margin Products Test
            {
                "store_name": "Razor-Thin Margins Store",
                "store_type": "Low Margin Challenge",
                "strategy": "balanced",
                "config": {
                    "strategy": "balanced",
                    "donation_first_threshold": 0.6,
                    "force_donation_categories": [],
                    "min_margin_for_discount": 3.0,  # Very low margin threshold
                    "donation_weight_multiplier": 1.0,
                    "social_impact_weight": 0.15
                },
                "inventory": [
                    {
                        "batch_id": "LOWMARGIN_001",
                        "sku": "EGGS_DOZEN_AA",
                        "product_name": "Grade AA Large Eggs Dozen",
                        "category": "dairy",
                        "cost_price": 2.90,
                        "selling_price": 3.19,  # Only 9% margin
                        "current_quantity": 36.0,
                        "expiry_date": date.today() + timedelta(days=3),
                        "daily_sales_avg": 18.0
                    },
                    {
                        "batch_id": "LOWMARGIN_002", 
                        "sku": "MILK_1GAL_WHOLE",
                        "product_name": "Whole Milk 1 Gallon",
                        "category": "dairy",
                        "cost_price": 3.75,
                        "selling_price": 3.99,  # Only 6% margin
                        "current_quantity": 24.0,
                        "expiry_date": date.today() + timedelta(days=2),
                        "daily_sales_avg": 20.0
                    }
                ],
                "expected_behavior": "Low margin items should favor donation over unprofitable discounting"
            }
        ]
    
    async def test_scenario(self, scenario: Dict[str, Any]) -> Dict[str, Any]:
        """Test a single real-world scenario"""
        
        print(f"\n🏪 Testing: {scenario['store_name']}")
        print(f"   📍 Type: {scenario['store_type']}")
        print(f"   🎯 Strategy: {scenario['strategy']}")
        print(f"   📦 Items: {len(scenario['inventory'])}")
        
        scenario_results = {
            "store_name": scenario["store_name"],
            "store_type": scenario["store_type"],
            "strategy": scenario["strategy"],
            "item_results": [],
            "summary": {
                "total_items": len(scenario["inventory"]),
                "donation_recommended": 0,
                "discount_recommended": 0,
                "dispose_recommended": 0,
                "maintain_recommended": 0,
                "total_value": 0.0,
                "donation_value": 0.0,
                "discount_value": 0.0
            },
            "meets_expectations": True,
            "issues": []
        }
        
        for item in scenario["inventory"]:
            # Calculate days to expiry
            days_to_expiry = (item["expiry_date"] - date.today()).days
            
            # Calculate AI score using donation scoring
            margin_percent = ((item["selling_price"] - item["cost_price"]) / item["selling_price"]) * 100
            
            donation_score = self.scorer.calculate_donation_score(
                category=item["category"],
                margin_percent=margin_percent,
                days_to_expiry=days_to_expiry,
                store_donation_strategy=scenario["config"]["strategy"],
                donation_multiplier=scenario["config"]["donation_weight_multiplier"]
            )
            
            # Create batch data for donation engine
            batch_data = {
                "batch_id": item["batch_id"],
                "category": item["category"],
                "expiry_date": item["expiry_date"],
                "cost_price": item["cost_price"],
                "selling_price": item["selling_price"],
                "current_quantity": item["current_quantity"]
            }
            
            # Get recommendation from donation engine
            recommendation = self.donation_engine.evaluate_action_recommendation(
                batch_data=batch_data,
                ai_score=donation_score,
                store_donation_config=scenario["config"]
            )
            
            # Calculate financial metrics
            item_value = item["current_quantity"] * item["selling_price"]
            scenario_results["summary"]["total_value"] += item_value
            
            # Track recommendations
            action = recommendation.recommended_action.value
            if action == "donate":
                scenario_results["summary"]["donation_recommended"] += 1
                scenario_results["summary"]["donation_value"] += item_value
            elif action == "discount":
                scenario_results["summary"]["discount_recommended"] += 1 
                scenario_results["summary"]["discount_value"] += item_value
            elif action == "dispose":
                scenario_results["summary"]["dispose_recommended"] += 1
            else:
                scenario_results["summary"]["maintain_recommended"] += 1
            
            # Store item result
            item_result = {
                "batch_id": item["batch_id"],
                "product_name": item["product_name"],
                "category": item["category"],
                "days_to_expiry": days_to_expiry,
                "margin_percent": margin_percent,
                "donation_score": donation_score,
                "recommended_action": action,
                "priority": recommendation.priority.value,
                "reasoning": recommendation.notes,
                "item_value": item_value,
                "quantity": item["current_quantity"]
            }
            
            scenario_results["item_results"].append(item_result)
            
            # Print item details
            urgency_emoji = {"critical": "🚨", "high": "⚠️", "medium": "📋", "low": "📝"}
            action_emoji = {"donate": "💝", "discount": "💰", "dispose": "🗑️", "maintain": "📊"}
            
            print(f"     {action_emoji.get(action, '❓')} {item['product_name'][:30]:30} | "
                  f"{action:8} | {urgency_emoji.get(recommendation.priority.value, '❓')}{recommendation.priority.value:8} | "
                  f"${item_value:6.0f} | {days_to_expiry:2d}d")
        
        # Validate expectations
        self._validate_scenario_expectations(scenario, scenario_results)
        
        return scenario_results
    
    def _validate_scenario_expectations(self, scenario: Dict[str, Any], results: Dict[str, Any]) -> None:
        """Validate that scenario results meet expected behavior"""
        
        strategy = scenario["strategy"]
        summary = results["summary"]
        issues = results["issues"]
        
        # Strategy-specific validations
        if strategy == "donation_first":
            # Should have high donation rate
            donation_rate = summary["donation_recommended"] / summary["total_items"]
            if donation_rate < 0.6:  # Less than 60% donation rate
                issues.append(f"Low donation rate for donation_first strategy: {donation_rate:.1%}")
                results["meets_expectations"] = False
                
        elif strategy == "discount_first":
            # Should have higher discount rate 
            discount_rate = summary["discount_recommended"] / summary["total_items"]
            if discount_rate < 0.4 and summary["total_items"] > 2:  # Less than 40% discount rate
                issues.append(f"Low discount rate for discount_first strategy: {discount_rate:.1%}")
                results["meets_expectations"] = False
                
        elif strategy == "balanced":
            # Should have reasonable mix
            donation_rate = summary["donation_recommended"] / summary["total_items"]
            discount_rate = summary["discount_recommended"] / summary["total_items"]
            if donation_rate == 0 and discount_rate == 0 and summary["total_items"] > 1:
                issues.append("Balanced strategy showing no donation or discount activity")
                results["meets_expectations"] = False
        
        # Check for expired items being disposed
        for item_result in results["item_results"]:
            if item_result["days_to_expiry"] < 0 and item_result["recommended_action"] != "dispose":
                issues.append(f"Expired item {item_result['batch_id']} not marked for disposal")
                results["meets_expectations"] = False
        
        # Check force donation categories
        force_categories = scenario["config"].get("force_donation_categories", [])
        for item_result in results["item_results"]:
            if (item_result["category"] in force_categories and 
                item_result["recommended_action"] not in ["donate", "dispose"] and
                item_result["days_to_expiry"] >= 0):
                issues.append(f"Force donation category {item_result['category']} not donated: {item_result['batch_id']}")
                results["meets_expectations"] = False
    
    async def run_comprehensive_simulation(self) -> Dict[str, Any]:
        """Run comprehensive real-world scenario simulation"""
        
        print("🌍 REAL-WORLD DONATION-FIRST SCENARIO SIMULATION")
        print("=" * 60)
        
        # Get all scenarios
        grocery_scenarios = self.create_grocery_store_scenarios()
        stress_scenarios = self.create_stress_test_scenarios()
        all_scenarios = grocery_scenarios + stress_scenarios
        
        simulation_results = {
            "total_scenarios": len(all_scenarios),
            "scenarios_passed": 0,
            "scenarios_failed": 0,
            "scenario_results": [],
            "overall_metrics": {
                "total_items": 0,
                "total_value": 0.0,
                "donation_items": 0,
                "donation_value": 0.0,
                "discount_items": 0,
                "discount_value": 0.0,
                "dispose_items": 0,
                "maintain_items": 0
            },
            "insights": []
        }
        
        print(f"\n🎯 Testing {len(all_scenarios)} realistic scenarios...")
        
        for i, scenario in enumerate(all_scenarios, 1):
            print(f"\n{'='*60}")
            print(f"📊 SCENARIO {i}/{len(all_scenarios)}")
            
            scenario_result = await self.test_scenario(scenario)
            simulation_results["scenario_results"].append(scenario_result)
            
            # Update overall metrics
            summary = scenario_result["summary"]
            metrics = simulation_results["overall_metrics"]
            
            metrics["total_items"] += summary["total_items"]
            metrics["total_value"] += summary["total_value"]
            metrics["donation_items"] += summary["donation_recommended"]
            metrics["donation_value"] += summary["donation_value"]
            metrics["discount_items"] += summary["discount_recommended"] 
            metrics["discount_value"] += summary["discount_value"]
            metrics["dispose_items"] += summary["dispose_recommended"]
            metrics["maintain_items"] += summary["maintain_recommended"]
            
            # Track pass/fail
            if scenario_result["meets_expectations"]:
                simulation_results["scenarios_passed"] += 1
                print(f"   ✅ SCENARIO PASSED: {scenario['store_name']}")
            else:
                simulation_results["scenarios_failed"] += 1
                print(f"   ❌ SCENARIO FAILED: {scenario['store_name']}")
                for issue in scenario_result["issues"]:
                    print(f"      🔸 {issue}")
        
        # Generate insights
        self._generate_simulation_insights(simulation_results)
        
        # Print final results
        self._print_simulation_summary(simulation_results)
        
        return simulation_results
    
    def _generate_simulation_insights(self, results: Dict[str, Any]) -> None:
        """Generate insights from simulation results"""
        
        metrics = results["overall_metrics"]
        insights = results["insights"]
        
        # Calculate rates
        if metrics["total_items"] > 0:
            donation_rate = metrics["donation_items"] / metrics["total_items"]
            discount_rate = metrics["discount_items"] / metrics["total_items"]
            dispose_rate = metrics["dispose_items"] / metrics["total_items"]
            
            insights.append(f"Overall donation rate: {donation_rate:.1%}")
            insights.append(f"Overall discount rate: {discount_rate:.1%}")
            insights.append(f"Overall disposal rate: {dispose_rate:.1%}")
            
            if donation_rate > 0.4:
                insights.append("✅ Strong donation-first behavior observed")
            elif donation_rate > 0.2:
                insights.append("⚖️ Balanced donation and discount approach") 
            else:
                insights.append("⚠️ Low donation rate - system may favor discounting")
        
        # Value analysis
        if metrics["total_value"] > 0:
            donation_value_rate = metrics["donation_value"] / metrics["total_value"]
            discount_value_rate = metrics["discount_value"] / metrics["total_value"]
            
            insights.append(f"Value directed to donation: {donation_value_rate:.1%} (${metrics['donation_value']:.0f})")
            insights.append(f"Value directed to discount: {discount_value_rate:.1%} (${metrics['discount_value']:.0f})")
        
        # Strategy effectiveness
        strategy_performance = {}
        for scenario_result in results["scenario_results"]:
            strategy = scenario_result["strategy"]
            if strategy not in strategy_performance:
                strategy_performance[strategy] = {"passed": 0, "total": 0}
            strategy_performance[strategy]["total"] += 1
            if scenario_result["meets_expectations"]:
                strategy_performance[strategy]["passed"] += 1
        
        for strategy, perf in strategy_performance.items():
            success_rate = perf["passed"] / perf["total"]
            insights.append(f"Strategy '{strategy}' success rate: {success_rate:.1%} ({perf['passed']}/{perf['total']})")
    
    def _print_simulation_summary(self, results: Dict[str, Any]) -> None:
        """Print comprehensive simulation summary"""
        
        print(f"\n{'='*60}")
        print(f"🎯 SIMULATION SUMMARY")
        print(f"{'='*60}")
        
        # Scenario results
        total = results["total_scenarios"]
        passed = results["scenarios_passed"]
        failed = results["scenarios_failed"]
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"📊 Scenario Results:")
        print(f"   ✅ Passed: {passed}/{total} ({success_rate:.1f}%)")
        print(f"   ❌ Failed: {failed}/{total}")
        
        # Overall metrics
        metrics = results["overall_metrics"]
        print(f"\n📈 Overall Metrics:")
        print(f"   📦 Total Items Analyzed: {metrics['total_items']}")
        print(f"   💰 Total Inventory Value: ${metrics['total_value']:.0f}")
        print(f"   💝 Items for Donation: {metrics['donation_items']} (${metrics['donation_value']:.0f})")
        print(f"   💰 Items for Discount: {metrics['discount_items']} (${metrics['discount_value']:.0f})")
        print(f"   🗑️ Items for Disposal: {metrics['dispose_items']}")
        print(f"   📊 Items to Maintain: {metrics['maintain_items']}")
        
        # Insights
        print(f"\n💡 Key Insights:")
        for insight in results["insights"]:
            print(f"   • {insight}")
        
        # Overall assessment
        print(f"\n🏆 OVERALL ASSESSMENT:")
        if success_rate >= 90:
            print(f"   🎉 EXCELLENT! Donation-first system working exceptionally well")
            print(f"   💪 Ready for production deployment")
        elif success_rate >= 75:
            print(f"   ✅ GOOD! System working well with minor issues")
            print(f"   🔧 Consider addressing failed scenarios before deployment")
        elif success_rate >= 50:
            print(f"   ⚠️ NEEDS IMPROVEMENT! Significant issues found")
            print(f"   🛠️ Major refinements needed before deployment")
        else:
            print(f"   ❌ MAJOR ISSUES! System not behaving as expected")
            print(f"   🚨 Requires comprehensive review and fixes")


async def main():
    """Run the comprehensive real-world scenario simulation"""
    
    tester = RealWorldScenarioTester()
    results = await tester.run_comprehensive_simulation()
    
    # Additional detailed analysis
    print(f"\n{'='*60}")
    print(f"🔍 DETAILED ANALYSIS")
    print(f"{'='*60}")
    
    # Analyze by store type
    store_types = {}
    for scenario_result in results["scenario_results"]:
        store_type = scenario_result["store_type"]
        if store_type not in store_types:
            store_types[store_type] = []
        store_types[store_type].append(scenario_result)
    
    print(f"\n📈 Performance by Store Type:")
    for store_type, scenarios in store_types.items():
        passed = sum(1 for s in scenarios if s["meets_expectations"])
        total = len(scenarios)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        total_donation_rate = sum(s["summary"]["donation_recommended"] / s["summary"]["total_items"] 
                                 for s in scenarios) / len(scenarios) if scenarios else 0
        
        print(f"   🏪 {store_type:25} | Success: {success_rate:5.1f}% | Donation Rate: {total_donation_rate:.1%}")
    
    # Show most challenging items
    print(f"\n🎯 Most Challenging Items (Failed Expectations):")
    failed_items = []
    for scenario_result in results["scenario_results"]:
        if not scenario_result["meets_expectations"]:
            for item in scenario_result["item_results"]:
                failed_items.append({
                    "store": scenario_result["store_name"],
                    "item": item["product_name"],
                    "category": item["category"],
                    "action": item["recommended_action"],
                    "days_to_expiry": item["days_to_expiry"],
                    "margin": item["margin_percent"]
                })
    
    for item in failed_items[:10]:  # Show top 10
        print(f"   🔸 {item['store']:20} | {item['item']:25} | {item['action']:8} | "
              f"{item['days_to_expiry']:2d}d | {item['margin']:4.1f}%")
    
    return results


if __name__ == "__main__":
    asyncio.run(main())