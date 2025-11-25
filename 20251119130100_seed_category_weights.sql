-- Migration: Seed category_weights table with AI scoring weights
-- 
-- This seeds the scoring.category_weights table with default weights for AI scoring algorithm
-- Weights must sum to 1.000 (enforced by check constraint)

INSERT INTO scoring.category_weights (
    category,
    spoilage_risk_weight,
    value_impact_weight,
    turnover_speed_weight,
    description,
    is_active
) VALUES
('fresh_produce',0.600,0.200,0.200,'Fresh fruits, vegetables, herbs - highest spoilage risk',true),
('fresh_meat_fish',0.650,0.250,0.100,'Raw meat, poultry, seafood - critical spoilage and safety',true),
('bakery_fresh',0.550,0.300,0.150,'Fresh bread, pastries, cakes - daily turnover',true),
('dairy',0.450,0.300,0.250,'Milk, yogurt, cheese, eggs - moderate spoilage risk',true),
('deli_prepared',0.500,0.300,0.200,'Prepared salads, sandwiches, ready meals',true),
('frozen',0.200,0.250,0.550,'Frozen foods - low spoilage but space/energy costs',true),
('chilled_packaged',0.350,0.350,0.300,'Packaged meats, processed dairy, refrigerated items',true),
('pantry_staples',0.100,0.300,0.600,'Rice, pasta, flour, oil - focus on turnover',true),
('canned_jarred',0.050,0.250,0.700,'Canned goods, preserves, condiments',true),
('dry_goods',0.080,0.320,0.600,'Cereals, snacks, nuts, dried fruits',true),
('beverages',0.120,0.380,0.500,'Juices, soft drinks, alcohol - moderate value/turnover',true),
('spices_condiments',0.150,0.400,0.450,'Spices, sauces, seasonings - slow turnover but profitable',true)
    
ON CONFLICT (category) DO UPDATE SET
    spoilage_risk_weight = EXCLUDED.spoilage_risk_weight,
    value_impact_weight = EXCLUDED.value_impact_weight,
    turnover_speed_weight = EXCLUDED.turnover_speed_weight,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- Add comment
COMMENT ON TABLE scoring.category_weights IS 'Category-specific weights for AI scoring algorithm. Weights must sum to 1.000. Higher spoilage_risk_weight = prioritize urgency for perishable items.';
