#!/usr/bin/env python3
"""
European Small Stores Analysis - France, Netherlands, Germany
Tailored thresholds for small European grocery stores and markets
"""

def calculate_european_donation_value(cost_price, country="france"):
    """Calculate donation tax benefits for European countries"""
    tax_rates = {
        "france": 0.25,      # 25% corporate tax rate, donation deduction
        "netherlands": 0.25,  # 25% corporate tax rate
        "germany": 0.30,     # ~30% combined tax rate, strong donation incentives
    }
    
    # European donation deductions are typically 100% of cost basis
    # but tax benefit is lower than US due to lower corporate rates
    deduction_rate = tax_rates.get(country.lower(), 0.25)
    return cost_price * deduction_rate

def calculate_european_disposal_costs(cost_price, country="france"):
    """European waste disposal costs are higher due to regulations"""
    disposal_rates = {
        "france": 0.20,      # High organic waste disposal fees
        "netherlands": 0.25, # Strict waste separation requirements
        "germany": 0.30,     # Highest waste management costs in Europe
    }
    
    disposal_cost = disposal_rates.get(country.lower(), 0.25)
    return -(cost_price + (cost_price * disposal_cost))

def european_small_store_scenarios():
    """Analyze scenarios typical for European small stores"""
    
    print("🇪🇺 EUROPEAN SMALL STORES - DONATION-FIRST ANALYSIS")
    print("=" * 60)
    print("Target: France, Netherlands, Germany - Small independent stores")
    
    scenarios = [
        # European small store typical inventory
        # Format: name, cost, selling_price, days_to_expiry, quantity, daily_sales, country
        
        # FRANCE - Local Épicerie
        ("French Fresh Baguettes", 0.60, 1.20, 1, 30, 25, "france"),
        ("Local Cheese (Camembert)", 4.50, 8.50, 5, 12, 2, "france"),
        ("Organic Vegetables", 1.80, 3.50, 3, 20, 8, "france"),
        ("French Wine (Local)", 6.00, 15.00, 365, 18, 0.5, "france"),
        
        # NETHERLANDS - Neighborhood Winkel  
        ("Dutch Cheese (Gouda)", 5.00, 9.00, 7, 10, 1.5, "netherlands"),
        ("Fresh Stroopwafels", 1.20, 3.50, 2, 24, 12, "netherlands"),
        ("Local Produce", 1.50, 3.00, 2, 25, 10, "netherlands"),
        ("Specialty Dutch Items", 8.00, 18.00, 14, 8, 1, "netherlands"),
        
        # GERMANY - Local Laden
        ("German Artisan Bread", 1.50, 3.20, 1, 20, 15, "germany"),
        ("Regional Sausages", 6.00, 12.00, 4, 15, 3, "germany"),  
        ("Organic Dairy", 2.20, 3.80, 4, 30, 12, "germany"),
        ("Local Specialty Beer", 1.80, 4.50, 90, 24, 2, "germany"),
    ]
    
    print(f"\n📊 SCENARIO ANALYSIS:")
    print("-" * 60)
    
    country_results = {"france": [], "netherlands": [], "germany": []}
    
    for name, cost, price, days, qty, sales, country in scenarios:
        margin_percent = ((price - cost) / price) * 100
        
        # European-specific calculations
        donation_value = calculate_european_donation_value(cost, country)
        disposal_cost = calculate_european_disposal_costs(cost, country)
        
        # Sales velocity analysis
        sellout_days = qty / max(sales, 0.1)
        velocity_match = sellout_days <= days * 0.9
        
        # European small store decision logic
        if days <= 1:
            # Urgent - same day decision needed
            if sales >= qty * 0.8:  # Can sell most today
                decision = "MAINTAIN" 
                value = (price - cost) * qty * 0.8
                reason = "High likelihood of same-day sellout"
            elif margin_percent >= 50:
                decision = "DISCOUNT_30"
                value = (price * 0.7 - cost) * qty * 0.9
                reason = "Quick discount to move inventory"  
            else:
                decision = "DONATE"
                value = donation_value * qty
                reason = "Low margin - tax benefit + avoid disposal"
                
        elif days <= 3:
            # Short term - 2-3 days
            if velocity_match:
                decision = "MAINTAIN"
                value = (price - cost) * qty * 0.8
                reason = "Good velocity match - likely natural sellout"
            elif margin_percent >= 60:
                decision = "DISCOUNT_20" 
                value = (price * 0.8 - cost) * qty * 0.85
                reason = "High margin allows profitable discount"
            elif margin_percent <= 25:
                decision = "DONATE"
                value = donation_value * qty  
                reason = "Low margin - donation tax benefit optimal"
            else:
                decision = "DISCOUNT_15"
                value = (price * 0.85 - cost) * qty * 0.9
                reason = "Medium margin - light discount"
                
        elif days <= 7:
            # Medium term
            if velocity_match:
                decision = "MAINTAIN"
                value = (price - cost) * qty * 0.85
                reason = "Normal sales timeline"
            elif qty > 50 and sales < 3:
                decision = "DONATE"  
                value = donation_value * qty
                reason = "High quantity, slow sales - bulk donation efficient"
            else:
                decision = "MAINTAIN"
                value = (price - cost) * qty * 0.75
                reason = "Monitor for now"
                
        else:
            # Long term - maintain unless special case
            if qty > 100 and sellout_days > days:
                decision = "DONATE"
                value = donation_value * qty
                reason = "Overstocked - will expire before sellout"
            else:
                decision = "MAINTAIN"  
                value = (price - cost) * qty * 0.9
                reason = "Normal long-term inventory"
        
        total_value = value
        
        # Store results
        country_results[country].append({
            'name': name,
            'decision': decision,
            'value': total_value,
            'margin': margin_percent,
            'reason': reason
        })
        
        # Display result
        flag = {"france": "🇫🇷", "netherlands": "🇳🇱", "germany": "🇩🇪"}[country]
        action_emoji = {
            "MAINTAIN": "📊", "DONATE": "💝", "DISCOUNT_15": "💰", 
            "DISCOUNT_20": "💰", "DISCOUNT_30": "💰"
        }
        
        print(f"{flag} {name[:25]:25} | {decision:12} | €{total_value:6.0f} | {margin_percent:4.1f}% | {days}d")
        print(f"   📝 {reason}")
        
    # Country-specific insights
    print(f"\n🎯 COUNTRY-SPECIFIC INSIGHTS:")
    print("-" * 40)
    
    for country, results in country_results.items():
        flag = {"france": "🇫🇷", "netherlands": "🇳🇱", "germany": "🇩🇪"}[country]
        
        donations = [r for r in results if r['decision'] == 'DONATE']
        discounts = [r for r in results if 'DISCOUNT' in r['decision']]
        maintains = [r for r in results if r['decision'] == 'MAINTAIN']
        
        total_value = sum(r['value'] for r in results)
        donation_value = sum(r['value'] for r in donations)
        
        print(f"\n{flag} {country.upper()}:")
        print(f"   💝 Donations: {len(donations)}/4 ({len(donations)/4*100:.0f}%)")
        print(f"   💰 Discounts: {len(discounts)}/4 ({len(discounts)/4*100:.0f}%)")  
        print(f"   📊 Maintain: {len(maintains)}/4 ({len(maintains)/4*100:.0f}%)")
        print(f"   💎 Total Value: €{total_value:.0f}")
        if donations:
            print(f"   🎁 Donation Value: €{donation_value:.0f} ({donation_value/total_value*100:.0f}%)")

def european_regulatory_considerations():
    """EU-specific regulatory and cultural factors"""
    
    print(f"\n🏛️ EUROPEAN REGULATORY & CULTURAL FACTORS")
    print("=" * 50)
    
    regulations = {
        "🇫🇷 FRANCE": [
            "• Loi Garot (2016) - Prohibits food waste, encourages donation",
            "• Tax deduction: 60% of product value for donations",
            "• Strong cultural preference for local, artisanal products", 
            "• Strict food safety laws - liability protection for donors",
            "• Small stores: Avg 100-500 SKUs, family-owned"
        ],
        
        "🇳🇱 NETHERLANDS": [
            "• Circular Economy focus - waste reduction priority",  
            "• Tax benefit: 25% corporate rate on donation deductions",
            "• 'Verspilling' (waste) culturally stigmatized",
            "• Strong charity network (Voedselbanken)",
            "• Small stores: Neighborhood focus, personal relationships"
        ],
        
        "🇩🇪 GERMANY": [
            "• Strongest waste regulations in EU - high disposal costs",
            "• Tax incentive: 30% effective rate on donations", 
            "• 'Tafel' food bank network very organized",
            "• Liability protection for food donors (2019 law)",
            "• Small stores: 'Tante-Emma-Laden' tradition, community-focused"
        ]
    }
    
    for country, factors in regulations.items():
        print(f"\n{country}:")
        for factor in factors:
            print(f"   {factor}")

def recommended_european_thresholds():
    """Recommended thresholds for European small stores"""
    
    print(f"\n🎯 RECOMMENDED EUROPEAN THRESHOLDS")
    print("=" * 45)
    
    print(f"Based on analysis of typical European small store scenarios:")
    
    thresholds = {
        "URGENT (≤1 day)": {
            "High Margin (≥50%)": "Light discount (20-30%) if slow sales",
            "Medium Margin (25-50%)": "Donate if sales <50% of inventory", 
            "Low Margin (≤25%)": "Always donate - tax benefit + avoid disposal costs"
        },
        
        "SHORT-TERM (2-3 days)": {
            "High Margin (≥60%)": "Discount 15-20% to accelerate sales",
            "Medium Margin (25-60%)": "Donate if velocity poor, light discount otherwise",
            "Low Margin (≤25%)": "Donate immediately - disposal costs too high"
        },
        
        "MEDIUM-TERM (4-7 days)": {
            "Any Margin": "Maintain unless quantity >50 units with sales <3/day",
            "High Quantity + Slow Sales": "Bulk donation to local food banks",
            "Seasonal Items": "Proactive donation/discount planning"
        },
        
        "LONG-TERM (8+ days)": {
            "Overstocked (sellout days > expiry days)": "Donate excess inventory",
            "Normal Stock": "Maintain normal sales approach",
            "Specialty Items": "Monitor for seasonal discount opportunities"
        }
    }
    
    for timeframe, actions in thresholds.items():
        print(f"\n📅 {timeframe}:")
        for condition, action in actions.items():
            print(f"   • {condition}: {action}")
    
    print(f"\n💡 KEY SUCCESS FACTORS FOR EUROPEAN PILOT:")
    success_factors = [
        "Lower tax rates but 100% deduction makes donation viable for margins ≤30%",
        "High disposal costs (20-30%) make donation attractive vs. waste",
        "Cultural acceptance of donation higher than discount in small communities", 
        "Bulk donations (>20 units) very efficient for small store operations",
        "Same-day decisions critical - European consumers shop daily",
        "Local charity partnerships essential for successful implementation"
    ]
    
    for factor in success_factors:
        print(f"   ✅ {factor}")

if __name__ == "__main__":
    european_small_store_scenarios()
    european_regulatory_considerations() 
    recommended_european_thresholds()