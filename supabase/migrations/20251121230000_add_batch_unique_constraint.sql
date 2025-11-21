-- Migration: Add unique constraint to prevent duplicate batches
-- Prevents duplicate batch records when same batch_number is uploaded multiple times
-- Ensures that a batch_number is unique per product per store

-- First, remove any existing duplicates (keep the earliest one)
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

-- Add unique constraint to prevent future duplicates
ALTER TABLE inventory.batches
ADD CONSTRAINT batches_batch_number_product_store_unique
UNIQUE (batch_number, product_id, store_id);

-- Create index for better query performance on this combination
CREATE INDEX IF NOT EXISTS idx_batches_unique_lookup
ON inventory.batches(batch_number, product_id, store_id);

COMMENT ON CONSTRAINT batches_batch_number_product_store_unique ON inventory.batches IS
'Ensures batch numbers are unique per product per store. Prevents duplicate batches when CSV uploads contain the same batch_number multiple times.';
