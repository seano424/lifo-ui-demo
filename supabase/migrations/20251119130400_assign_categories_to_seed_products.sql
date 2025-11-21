-- Migration: Assign categories to seed products
--
-- Context: Seed products were created without category assignments,
-- causing them to show as "Uncategorized" in the UI.

-- Assign categories to seed products based on product type
UPDATE inventory.products
SET category_id = (SELECT category_id FROM inventory.categories WHERE category_code = 'dairy_eggs' LIMIT 1)
WHERE name IN ('Organic Almond Milk', 'Greek Yogurt')
  AND category_id IS NULL;

UPDATE inventory.products
SET category_id = (SELECT category_id FROM inventory.categories WHERE category_code = 'bakery_fresh' LIMIT 1)
WHERE name IN ('Whole Wheat Bread')
  AND category_id IS NULL;

UPDATE inventory.products
SET category_id = (SELECT category_id FROM inventory.categories WHERE category_code = 'fresh_produce' LIMIT 1)
WHERE name IN ('Orange Juice')
  AND category_id IS NULL;

UPDATE inventory.products
SET category_id = (SELECT category_id FROM inventory.categories WHERE category_code = 'fresh_meat_fish' LIMIT 1)
WHERE name IN ('Chicken Breast')
  AND category_id IS NULL;

-- Log the update
DO $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Assigned categories to % seed products', v_updated_count;
END $$;
