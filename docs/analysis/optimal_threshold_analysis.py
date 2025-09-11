#!/usr/bin/env python3
"""
Optimal Threshold Analysis for Donation vs Discount Decisions
Based on real business math and value optimization
"""

def calculate_donation_value(cost_price, tax_deduction_rate=0.6):
    """Calculate value recovered from donation (tax benefits)"""
    return cost_price * tax_deduction_rate

def calculate_discount_value(selling_price, discount_percent, cost_price):
    """Calculate net value from discounting"""
    discounted_price = selling_price * (1 - discount_percent/100)
    if discounted_price <= cost_price:
        return -cost_price * 0.1  # Loss scenario
    return discounted_price - cost_price  # Profit after costs

def calculate_disposal_cost(cost_price):
    """Calculate cost of disposal"""
    return -cost_price * 0.15  # Loss of inventory + disposal fees

def find_optimal_action(cost_price, selling_price, days_to_expiry, current_quantity, daily_sales):
    """Find financially optimal action"""
    
    margin_percent = ((selling_price - cost_price) / selling_price) * 100
    
    # Calculate different scenario values
    donation_value = calculate_donation_value(cost_price)
    
    # Different discount scenarios
    discount_10_value = calculate_discount_value(selling_price, 10, cost_price)
    discount_20_value = calculate_discount_value(selling_price, 20, cost_price)  
    discount_30_value = calculate_discount_value(selling_price, 30, cost_price)
    discount_50_value = calculate_discount_value(selling_price, 50, cost_price)
    
    disposal_value = calculate_disposal_cost(cost_price)
    
    # Probability of selling at different discount levels (estimate)
    sell_probability = {
        0: min(0.8, (daily_sales * days_to_expiry) / current_quantity),  # Normal price
        10: min(0.9, (daily_sales * days_to_expiry * 1.5) / current_quantity),
        20: min(0.95, (daily_sales * days_to_expiry * 2.0) / current_quantity), 
        30: min(0.98, (daily_sales * days_to_expiry * 3.0) / current_quantity),
        50: 0.99  # Deep discount almost guarantees sale
    }
    
    # Expected values (probability weighted)
    expected_values = {
        'maintain': sell_probability[0] * (selling_price - cost_price) + (1 - sell_probability[0]) * disposal_value,
        'discount_10': sell_probability[10] * discount_10_value + (1 - sell_probability[10]) * disposal_value,
        'discount_20': sell_probability[20] * discount_20_value + (1 - sell_probability[20]) * disposal_value,
        'discount_30': sell_probability[30] * discount_30_value + (1 - sell_probability[30]) * disposal_value,
        'discount_50': sell_probability[50] * discount_50_value + (1 - sell_probability[50]) * disposal_value,
        'donate': donation_value  # Guaranteed value
    }
    
    # Find optimal action
    optimal_action = max(expected_values.items(), key=lambda x: x[1])
    
    return {
        'optimal_action': optimal_action[0],
        'expected_value': optimal_action[1],
        'all_values': expected_values,
        'probabilities': sell_probability,
        'margin_percent': margin_percent,
        'donation_value': donation_value,
        'break_even_discount': max(0, 100 * (1 - cost_price/selling_price))
    }

def analyze_business_scenarios():
    """Analyze various business scenarios to find optimal thresholds"""
    
    print("💰 OPTIMAL THRESHOLD ANALYSIS FOR INVENTORY DECISIONS")
    print("=" * 65)
    
    scenarios = [
        # Format: name, cost, selling_price, days_to_expiry, quantity, daily_sales
        ("High Margin Fresh Produce", 2.00, 4.99, 3, 20, 8),
        ("Low Margin Dairy", 2.90, 3.19, 4, 36, 15), 
        ("Medium Margin Meat", 12.00, 18.99, 2, 8, 3),
        ("Premium Specialty Item", 15.00, 39.99, 30, 6, 0.3),
        ("Bulk Slow Mover", 25.00, 45.99, 180, 200, 0.5),
        ("Seasonal High Quantity", 2.00, 7.99, 10, 150, 2),
        ("Luxury Wine", 12.00, 24.99, 365, 12, 0.8),
        ("Fast Moving Bakery", 1.20, 2.99, 1, 15, 12)
    ]
    
    results = []
    
    for name, cost, price, days, qty, sales in scenarios:
        analysis = find_optimal_action(cost, price, days, qty, sales)
        results.append((name, analysis))
        
        print(f"\n📊 {name}")
        print(f"   💵 Cost: ${cost:.2f} | Price: ${price:.2f} | Margin: {analysis['margin_percent']:.1f}%")
        print(f"   ⏰ Days: {days} | Qty: {qty} | Daily Sales: {sales}")
        print(f"   🎯 OPTIMAL: {analysis['optimal_action'].upper()} (Value: ${analysis['expected_value']:.2f})")
        print(f"   💝 Donation Value: ${analysis['donation_value']:.2f}")
        print(f"   📈 Break-even Discount: {analysis['break_even_discount']:.0f}%")
        
        # Show top 3 options
        sorted_options = sorted(analysis['all_values'].items(), key=lambda x: x[1], reverse=True)
        print(f"   🏆 Top Options:")
        for i, (action, value) in enumerate(sorted_options[:3]):
            print(f"      {i+1}. {action}: ${value:.2f}")
    
    # Generate threshold recommendations
    print(f"\n🎯 THRESHOLD RECOMMENDATIONS")
    print("=" * 40)
    
    # Analyze when donation beats discounting
    donation_wins = []
    discount_wins = []
    
    for name, analysis in results:
        optimal = analysis['optimal_action']
        margin = analysis['margin_percent']
        donation_val = analysis['donation_value']
        
        if optimal == 'donate':
            donation_wins.append((name, margin, donation_val))
        elif 'discount' in optimal:
            discount_wins.append((name, margin, analysis['expected_value']))
    
    print(f"\n💝 DONATION OPTIMAL SCENARIOS ({len(donation_wins)}):")
    for name, margin, value in donation_wins:
        print(f"   • {name}: {margin:.1f}% margin, ${value:.2f} value")
    
    print(f"\n💰 DISCOUNT OPTIMAL SCENARIOS ({len(discount_wins)}):")  
    for name, margin, value in discount_wins:
        print(f"   • {name}: {margin:.1f}% margin, ${value:.2f} value")
    
    # Calculate smart thresholds
    if donation_wins:
        avg_donation_margin = sum(margin for _, margin, _ in donation_wins) / len(donation_wins)
        print(f"\n📈 SMART THRESHOLD INSIGHTS:")
        print(f"   • Donation typically optimal for margins ≤ {avg_donation_margin:.0f}%")
        print(f"   • Tax benefit (60%) makes donation valuable for low-margin items")
        print(f"   • High quantities favor donation (logistics efficiency)")
        print(f"   • Short expiry + low sales velocity = donate")
    
    if discount_wins:
        avg_discount_margin = sum(margin for _, margin, _ in discount_wins) / len(discount_wins)
        print(f"   • Discount typically optimal for margins ≥ {avg_discount_margin:.0f}%") 
        print(f"   • High margins can absorb discount and still profit")
        print(f"   • Fast movers with medium expiry = discount")
        print(f"   • Premium items with slow sales = strategic discount")

if __name__ == "__main__":
    analyze_business_scenarios()