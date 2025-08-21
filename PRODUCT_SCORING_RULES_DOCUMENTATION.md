# LIFO AI Product Scoring Rules Documentation

## Overview

The LIFO AI system uses a comprehensive scoring algorithm to determine the urgency of inventory actions. The scoring system evaluates three main factors: **Expiry Score**, **Velocity Score**, and **Margin Score**, which are combined into a **Composite Score** to generate actionable recommendations.

## Core Scoring Components

### 1. Expiry Score Algorithm

**Purpose**: Determines urgency based on product expiration date relative to shelf life.

**Formula**: Variable logic based on days to expiry and product category

**Implementation**: `lifo_api/app/core/scoring.py:110-149`

#### Critical Thresholds (Universal)

- **Expired (≤0 days)**: Score = `1.0` (Maximum urgency)
- **1 day to expiry**: Score = `0.95` (Critical)
- **2 days to expiry**: Score = `0.9` (Critical)
- **3 days to expiry**: Score = `0.8` (High urgency)
- **7 days to expiry**: Score = `0.6` (Medium urgency)

#### Ratio-Based Scoring (For longer shelf life)

```
ratio = days_to_expiry / shelf_life_days

if ratio ≤ 0.1:     score = 0.7  # Less than 10% shelf life left
elif ratio ≤ 0.2:   score = 0.5  # Less than 20% shelf life left
elif ratio ≤ 0.3:   score = 0.3  # Less than 30% shelf life left
```

#### Special Category Rules

- **Very perishable (≤3 days shelf life)**:
  - If `days_to_expiry ≤ shelf_life_days * 0.5`: Score = `0.6`
- **Long shelf life (≥365 days)**:
  - If `days_to_expiry ≤ 30`: Score = `0.4`
- **Default low urgency**: Score = `0.1`

### 2. Velocity Score Algorithm

**Purpose**: Evaluates if current stock will sell before expiry based on sales velocity.

**Formula**:

```
days_to_sell = current_quantity / avg_daily_sales
safety_buffer = max(0.7, 1 - (days_to_expiry / 30))
```

**Implementation**: `lifo_api/app/core/scoring.py:275-316`

#### Velocity Score Calculation

```
if days_to_sell ≤ days_to_expiry * safety_buffer:
    score = 0.1    # Low risk - selling fast enough

elif days_to_sell ≤ days_to_expiry * 0.9:
    score = 0.3    # Moderate risk

elif days_to_sell ≤ days_to_expiry:
    score = 0.6    # High risk - cutting it close

else:
    excess_ratio = (days_to_sell - days_to_expiry) / days_to_expiry
    score = min(1.0, 0.8 + excess_ratio * 0.2)  # Very high risk
```

#### Default Daily Sales by Category

```python
category_velocities = {
    "fresh_produce": 4.0,      # units/day
    "dairy": 2.5,
    "bakery_fresh": 3.0,
    "fresh_meat_fish": 1.5,
    "frozen": 1.0,
    "canned_jarred": 0.5,
    "dry_goods": 0.8,
    "beverages": 2.0,
    "deli_prepared": 2.5,
    "spices_condiments": 0.3
}
```

#### Expired Products Disposal (EU Compliant)

For expired products (days_to_expiry ≤ 0), velocity score returns maximum urgency (1.0) regardless of category, ensuring immediate disposal action.

### 3. Margin Score Algorithm

**Purpose**: Assesses discount flexibility based on profit margins.

**Formula**:

```
margin_percent = ((selling_price - cost_price) / selling_price) * 100
```

**Implementation**: `lifo_api/app/core/scoring.py:317-359`

#### Fresh Products Margin Thresholds

With urgency multiplier applied based on days to expiry:

```
if margin_percent ≥ 50%:     score = 0.05 * urgency_multiplier
elif margin_percent ≥ 40%:   score = 0.1 * urgency_multiplier   # Can afford deep discounts
elif margin_percent ≥ 25%:   score = 0.3 * urgency_multiplier   # Moderate discounts
elif margin_percent ≥ 15%:   score = 0.5 * urgency_multiplier   # Limited discounts
elif margin_percent ≥ 10%:   score = 0.7 * urgency_multiplier   # Minimal discounts
else:                        score = 0.9 * urgency_multiplier   # Avoid discounts
```

#### Urgency Multipliers

```
if days_to_expiry ≤ 1:       urgency_multiplier = 0.5
elif days_to_expiry ≤ 3:     urgency_multiplier = 0.7
elif days_to_expiry ≤ 7:     urgency_multiplier = 0.9
else:                        urgency_multiplier = 1.0
```

#### Expired Products Margin

For expired products (days_to_expiry ≤ 0), margin score returns maximum urgency (1.0) regardless of original margin or category, prioritizing disposal over any recovery considerations.

## Composite Score Calculation

**Purpose**: Combines all individual scores into a single actionable metric.

**Formula**:

```
composite_score = (expiry_score * w_expiry) + (velocity_score * w_velocity) + (margin_score * w_margin)
```

**Implementation**: `lifo_api/app/core/scoring.py:360-391`

### Default Weights

```python
default_weights = {
    "expiry": 0.5,     # 50% weight
    "velocity": 0.3,   # 30% weight
    "margin": 0.2      # 20% weight
}
```

### Category-Specific Weights

**Source**: `lifo_api/app/core/config.py`

```python
category_weights = {
    "fresh_produce": {"expiry": 0.6, "velocity": 0.25, "margin": 0.15},
    "dairy": {"expiry": 0.45, "velocity": 0.35, "margin": 0.2},
    "bakery_fresh": {"expiry": 0.55, "velocity": 0.25, "margin": 0.2},
    "meat_fish": {"expiry": 0.65, "velocity": 0.2, "margin": 0.15},
    "frozen": {"expiry": 0.2, "velocity": 0.5, "margin": 0.3}
}
```

### Non-Linear Scaling

```python
if composite_score ≥ 0.8:
    # Amplification for high scores (steeper curve above 0.8)
    amplification = 0.8 + (composite_score - 0.8) * 2.5
    composite_score = min(1.0, amplification)

elif composite_score ≤ 0.2:
    # Dampen very low scores
    composite_score = composite_score * 0.9
```

## Recommendation Generation

**Purpose**: Convert composite scores into actionable business recommendations.

**Implementation**: `lifo_api/app/core/scoring.py:393-471`

### Fresh Products Recommendations

#### Critical Urgency (Score ≥ 0.8)

```
Action: "discount_aggressive"
Discount: min(50%, max(20%, composite_score * 60%))
Max Discount: margin_percent * 0.8  # Don't go below cost
Urgency: "critical"
Priority: 2
Time to Act: "< 4 hours"
```

#### High Urgency (Score ≥ 0.6)

```
Action: "discount_moderate"
Discount: min(30%, max(10%, composite_score * 40%))
Max Discount: margin_percent * 0.6
Urgency: "high"
Priority: 3
Time to Act: "< 24 hours"
```

#### Medium Urgency (Score ≥ 0.4)

```
Action: "alert"
Discount: 0%
Urgency: "medium"
Priority: 4
Time to Act: "< 48 hours"
```

#### Low Urgency (Score ≥ 0.2)

```
Action: "monitor"
Discount: 0%
Urgency: "low"
Priority: 5
Time to Act: "< 1 week"
```

#### No Action (Score < 0.2)

```
Action: "maintain"
Discount: 0%
Urgency: "none"
Priority: 6
Time to Act: "none"
```

### Donation Recommendations

**Purpose**: Identify products suitable for donation to food banks and charitable organizations before expiry.

**Implementation**: `lifo_api/app/core/donation_engine.py`

#### Donation Decision Process

```python
# Evaluation trigger points:
- Days to expiry ≤ critical_days_threshold (1 day): Immediate evaluation
- Days to expiry ≤ high_priority_days_threshold (3 days): Consider based on AI score
- Margin below discount_margin_threshold (20%): Prefer donation over discounting

# Decision flow:
if days_to_expiry ≤ 0:
    Action: DISPOSE  # Never donate expired products
elif days_to_expiry ≤ 1:
    if margin > 20%: Try DISCOUNT
    elif suitable_category: DONATE
    else: Try DISCOUNT
elif days_to_expiry ≤ 3:
    if ai_score ≥ 0.8:
        if margin > 20%: DISCOUNT
        elif suitable_category: DONATE
        else: DISCOUNT
```

#### Value Recovery Estimation

```python
# For donations:
- Tax benefit = cost_basis * 0.6  # 60% of cost basis (German tax law)
cost_basis = original_value * (1 - margin_percent / 100)
```

#### Category-Based Recipient Selection

**Special Handling Categories** (restricted distribution):

- Products: meat_fish, dairy, deli_prepared, frozen
- Recipients: Food Banks only (certified)

**Fresh Produce**:

- Base Recipients: Food Banks, Charities, Community Groups
- Additional: Soup Kitchens, Animal Shelters, Schools

**Bakery Fresh**:

- Base Recipients: Food Banks, Charities, Community Groups
- Additional: Soup Kitchens, Elderly Care, Homeless Shelters

**Standard Categories**:

- Recipients: Food Banks, Charities, Community Groups

#### Non-Eligible Products

```
Conditions for Non-Eligibility:
- Expired products
- Quantity below min_quantity_for_donation
- Special handling products without certified food bank partnership

Action: "proceed_with_discount"
Reason: "does not meet donation criteria"
Follow: Standard discount recommendations
```

### Expired Products Recommendations (EU Compliant)

**Note**: Updated for EU compliance - all expired products must be disposed regardless of category or days past expiry.

#### All Expired Products (days_to_expiry ≤ 0)

```
Action: "dispose"
Discount: 0%
Urgency: "critical"
Priority: 1
Reason: "product expired"
```

**Rationale**: EU food safety regulations require disposal of all expired products to ensure legal compliance and food safety. This simplified approach eliminates the risk of selling expired products and ensures consistent handling across all product categories.

## Urgency Level Determination

**Formula**:

```python
def _get_urgency_level(days_to_expiry: int, composite_score: float) -> str:
    if days_to_expiry <= 0 or composite_score >= 0.9:
        return "critical"
    elif days_to_expiry <= 1 or composite_score >= 0.8:
        return "high"
    elif days_to_expiry <= 3 or composite_score >= 0.6:
        return "medium"
    elif days_to_expiry <= 7 or composite_score >= 0.4:
        return "low"
    else:
        return "none"
```

## Data Sources and Fallbacks

### Sales Velocity Data Priority

1. **Batch-specific sales** (last 30 days)
2. **Category sales for store** (last 30 days)
3. **Category sales for store** (last 90 days)
4. **Category default velocity** (fallback)

### Weight Configuration Priority

1. **Database category weights** (if configured)
2. **Config file category weights**
3. **Default weights** (fallback)

## Error Handling and Defaults

### Missing Data Defaults

- **Unknown daily sales**: 1.0 units/day
- **Unknown category**: Uses default weights
- **Invalid selling price**: Margin score = 1.0
- **Missing expiry date**: Uses current date

### Validation Rules

- All scores clamped to [0.0, 1.0] range
- Weights must sum to 1.0 (±0.01 tolerance)
- Discounts cannot exceed available margin
- Negative quantities treated as 0

## Configuration Files

### Primary Configuration

- **Scoring weights**: `lifo_api/app/core/config.py`
- **Main scoring logic**: `lifo_api/app/core/scoring.py`
- **Category mappings**: Database `category_weights` table

### Database Models

- **Product scores**: `product_scores` table
- **Category weights**: `category_weights` table
- **Sales events**: `sales_events` table
- **Batch data**: `batches` table

## Performance Considerations

### Optimization Features

- Read-only database operations for scoring
- Batch processing for store inventory
- Cached category weights
- Parallel scoring operations
- Memory-efficient result handling

### Monitoring

- Processing time tracking
- Error rate monitoring
- Recommendation accuracy tracking
- Performance metrics logging

---

_This documentation reflects the current implementation as of the scoring engine located in `lifo_api/app/core/scoring.py`. For the most up-to-date formulas and thresholds, refer to the source code._
