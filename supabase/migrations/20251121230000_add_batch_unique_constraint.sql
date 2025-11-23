-- Migration: Add unique constraint to prevent duplicate batches
-- Prevents duplicate batch records when same batch_number is uploaded multiple times
-- Ensures that a batch_number is unique per product per store

-- Step 1: Identify duplicates and merge their quantities into the earliest batch
WITH duplicates AS (
    SELECT
        batch_id,
        batch_number,
        product_id,
        store_id,
        current_quantity,
        ROW_NUMBER() OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as rn,
        FIRST_VALUE(batch_id) OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as kept_batch_id
    FROM inventory.batches
),
batches_to_delete AS (
    SELECT batch_id, kept_batch_id, current_quantity
    FROM duplicates
    WHERE rn > 1
)
-- Update the kept batch with sum of all duplicate quantities
UPDATE inventory.batches
SET current_quantity = current_quantity + (
    SELECT COALESCE(SUM(btd.current_quantity), 0)
    FROM batches_to_delete btd
    WHERE btd.kept_batch_id = inventory.batches.batch_id
)
WHERE batch_id IN (SELECT DISTINCT kept_batch_id FROM batches_to_delete);

-- Step 2: Update foreign key references to point to the kept batch
-- Update analytics.actions table
WITH duplicates AS (
    SELECT
        batch_id,
        FIRST_VALUE(batch_id) OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as kept_batch_id,
        ROW_NUMBER() OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as rn
    FROM inventory.batches
)
UPDATE analytics.actions
SET batch_id = d.kept_batch_id
FROM duplicates d
WHERE analytics.actions.batch_id = d.batch_id
AND d.rn > 1;

-- Update inventory.batch_actions table
WITH duplicates AS (
    SELECT
        batch_id,
        FIRST_VALUE(batch_id) OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as kept_batch_id,
        ROW_NUMBER() OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as rn
    FROM inventory.batches
)
UPDATE inventory.batch_actions
SET batch_id = d.kept_batch_id
FROM duplicates d
WHERE inventory.batch_actions.batch_id = d.batch_id
AND d.rn > 1;

-- Update sales.transactions table
WITH duplicates AS (
    SELECT
        batch_id,
        FIRST_VALUE(batch_id) OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as kept_batch_id,
        ROW_NUMBER() OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as rn
    FROM inventory.batches
)
UPDATE sales.transactions
SET batch_id = d.kept_batch_id
FROM duplicates d
WHERE sales.transactions.batch_id = d.batch_id
AND d.rn > 1;

-- Step 3: Now safely delete duplicate batches
WITH duplicates AS (
    SELECT
        batch_id,
        ROW_NUMBER() OVER (
            PARTITION BY batch_number, product_id, store_id
            ORDER BY created_at ASC
        ) as rn
    FROM inventory.batches
)
DELETE FROM inventory.batches
WHERE batch_id IN (
    SELECT batch_id
    FROM duplicates
    WHERE rn > 1
);

-- Step 4: Add unique constraint to prevent future duplicates
ALTER TABLE inventory.batches
ADD CONSTRAINT batches_batch_number_product_store_unique
UNIQUE (batch_number, product_id, store_id);

-- Create index for better query performance on this combination
CREATE INDEX IF NOT EXISTS idx_batches_unique_lookup
ON inventory.batches(batch_number, product_id, store_id);

COMMENT ON CONSTRAINT batches_batch_number_product_store_unique ON inventory.batches IS
'Ensures batch numbers are unique per product per store. Prevents duplicate batches when CSV uploads contain the same batch_number multiple times.';
