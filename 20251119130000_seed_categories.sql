-- Migration: Seed categories table from original Supabase export
-- Source: Supabase Snippet Inventory Batches.csv
-- Includes hierarchical categories with parent relationships

INSERT INTO inventory.categories (
    category_id,
    category_code,
    display_name_en,
    display_name_fr,
    parent_category_id,
    sort_order,
    is_active,
    typical_shelf_life_days
) VALUES
    -- Top Level Categories
('d1b76c91-41e2-44e8-b1ba-1c276e7cef01','fresh_produce','Fresh Produce','Produits frais',NULL,1,true,7),
('bbb7a28f-94ec-4cb8-bfb5-76e213a11e0c','fresh_meat_fish','Meat & Fish','Viande et poisson',NULL,2,true,5),
('bf185248-5730-4086-86cf-9fb4163e1419','dairy_eggs','Dairy & Eggs','Produits laitiers et œufs',NULL,3,true,14),
('1e562406-fd2a-4320-83ef-ce8921b52716','bakery_fresh','Fresh Bakery','Boulangerie fraîche',NULL,4,true,3),
('5dd08f41-bd3a-48ec-b854-22b540fffe8f','deli_prepared','Deli & Prepared Foods','Charcuterie et plats préparés',NULL,5,true,5),
('fd479381-ae97-46cc-8dca-e50a304a933d','frozen_foods','Frozen Foods','Produits surgelés',NULL,6,true,180),
('fdcc8816-403a-4789-aecd-7b2853d0f796','chilled_packaged','Chilled Packaged','Produits réfrigérés emballés',NULL,7,true,21),
('56c9438f-0a19-4940-b4b7-b66e9aef4a78','pantry_staples','Pantry Staples','Produits de base',NULL,8,true,365),
('481a2686-9c34-4493-96a0-b2afe12b9c15','canned_jarred','Canned & Jarred','Conserves et bocaux',NULL,9,true,730),
('fd75a632-10ab-4eab-982f-447f51786e7a','dry_goods','Dry Goods','Produits secs',NULL,10,true,180),
('f649ea23-646b-4395-9706-143e764763f6','beverages','Beverages','Boissons',NULL,11,true,365),
('bba65152-2bb0-4d97-bd06-1849382fa0ab','spices_condiments','Spices & Condiments','Épices et condiments',NULL,12,true,730),
('d811a435-86e6-448e-a7f1-bf38c39a4457','snacks_confectionery','Snacks & Confectionery','Collations et confiserie',NULL,13,true,180),
('f920798e-ecf3-4a2e-964a-31a2278e0a31','health_beauty','Health & Beauty','Santé et beauté',NULL,14,true,1095),
('9f9d9905-f871-4b4f-8fcb-090a063ea657','household_other','Household & Other','Articles ménagers et autres',NULL,15,true,1095),
('737586d0-fe13-423e-929b-79e395f5c97a','fruits','Fruits','Fruits','d1b76c91-41e2-44e8-b1ba-1c276e7cef01',1,true,7),
('10a1a147-aa82-4190-82f8-9390bd06bb44','vegetables','Vegetables','Légumes','d1b76c91-41e2-44e8-b1ba-1c276e7cef01',2,true,7),
('cbf955cd-e1b3-417b-af27-6bceea00c121','herbs_aromatics','Fresh Herbs & Aromatics','Herbes fraîches et aromatiques','d1b76c91-41e2-44e8-b1ba-1c276e7cef01',3,true,5),
('91c84a36-fa56-4089-9397-cd4ef4c923e1','fresh_meat','Fresh Meat','Viande fraîche','bbb7a28f-94ec-4cb8-bfb5-76e213a11e0c',1,true,3),
('93c42419-4b29-499a-821f-ffff331b3558','fresh_poultry','Fresh Poultry','Volaille fraîche','bbb7a28f-94ec-4cb8-bfb5-76e213a11e0c',2,true,2),
('a66eac90-ea0b-49ad-ab62-962b3097ac9f','fresh_fish_seafood','Fresh Fish & Seafood','Poisson et fruits de mer frais','bbb7a28f-94ec-4cb8-bfb5-76e213a11e0c',3,true,2),
('7c4d5809-bded-4255-94b6-b800188e31e5','processed_meat','Processed Meat','Charcuterie','bbb7a28f-94ec-4cb8-bfb5-76e213a11e0c',4,true,14),
('21d120a9-bdc5-4c22-b01f-6895b6e2f42c','milk','Milk','Lait','bf185248-5730-4086-86cf-9fb4163e1419',1,true,7),
('e85080ed-496b-47c4-b25b-9ad3c738c291','cheese','Cheese','Fromage','bf185248-5730-4086-86cf-9fb4163e1419',2,true,21),
('8211ea69-3217-4584-aa2f-e6e208ee0ce4','yogurt','Yogurt','Yaourt','bf185248-5730-4086-86cf-9fb4163e1419',3,true,14),
('28fc0d42-a0a0-41e9-b24d-9a4e0b434200','butter_spreads','Butter & Spreads','Beurre et tartinades','bf185248-5730-4086-86cf-9fb4163e1419',4,true,21),
('f64817dd-4bc0-445f-b3a0-9c61d0bab3e9','eggs','Eggs','Œufs','bf185248-5730-4086-86cf-9fb4163e1419',5,true,21)
    
ON CONFLICT (category_id) DO UPDATE SET
    category_code = EXCLUDED.category_code,
    display_name_en = EXCLUDED.display_name_en,
    parent_category_id = EXCLUDED.parent_category_id,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active,
    typical_shelf_life_days = EXCLUDED.typical_shelf_life_days,
    updated_at = NOW();
