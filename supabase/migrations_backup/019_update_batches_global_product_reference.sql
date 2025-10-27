-- Migration: 019_enhance_batches_for_barcode_workflow.sql
-- Add barcode scanning support to inventory.batches
-- This migration adds columns to support barcode scanning workflows

BEGIN;

-- =============================================
-- ENHANCE INVENTORY.BATCHES FOR BARCODE SUPPORT
-- =============================================

-- Add barcode workflow columns
ALTER TABLE inventory.batches
ADD COLUMN batch_source VARCHAR(50) DEFAULT 'manual',  -- manual, barcode, csv_import, api
ADD COLUMN scanned_barcode VARCHAR(50),                -- Barcode that was scanned to create this batch
ADD COLUMN scan_confidence DECIMAL(3,2),               -- Confidence score for barcode recognition (0.00-1.00)
ADD COLUMN verification_status VARCHAR(20) DEFAULT 'verified'; -- verified, pending, flagged

-- =============================================
-- ADD CONSTRAINTS AND CHECKS
-- =============================================

-- Ensure valid batch sources
ALTER TABLE inventory.batches
ADD CONSTRAINT batches_source_check 
CHECK (batch_source IN ('manual', 'barcode', 'csv_import', 'api'));

-- Ensure valid verification status
ALTER TABLE inventory.batches
ADD CONSTRAINT batches_verification_check
CHECK (verification_status IN ('verified', 'pending', 'flagged', 'rejected'));

-- Ensure confidence score is in valid range
ALTER TABLE inventory.batches
ADD CONSTRAINT batches_confidence_range_check
CHECK (scan_confidence IS NULL OR (scan_confidence >= 0.0 AND scan_confidence <= 1.0));

-- =============================================
-- INDEXES FOR BARCODE WORKFLOWS
-- =============================================

-- Barcode lookup for existing batches
CREATE INDEX idx_batches_scanned_barcode ON inventory.batches(scanned_barcode) 
WHERE scanned_barcode IS NOT NULL;

-- Source tracking
CREATE INDEX idx_batches_source ON inventory.batches(batch_source);

-- Verification workflow
CREATE INDEX idx_batches_verification ON inventory.batches(verification_status) 
WHERE verification_status != 'verified';

-- Store + barcode for quick lookups
CREATE INDEX idx_batches_store_barcode ON inventory.batches(store_id, scanned_barcode) 
WHERE scanned_barcode IS NOT NULL;

-- =============================================
-- USEFUL VIEWS FOR BARCODE WORKFLOWS
-- =============================================

-- View for barcode scanning dashboard
CREATE OR REPLACE VIEW inventory.barcode_scan_summary AS
SELECT 
    b.store_id,
    b.batch_source,
    b.verification_status,
    COUNT(*) as batch_count,
    AVG(b.scan_confidence) as avg_confidence,
    COUNT(DISTINCT b.scanned_barcode) as unique_barcodes,
    MIN(b.created_at) as first_scan,
    MAX(b.created_at) as last_scan
FROM inventory.batches b
WHERE b.scanned_barcode IS NOT NULL
GROUP BY b.store_id, b.batch_source, b.verification_status;

-- View for products that need barcode assignment
CREATE OR REPLACE VIEW inventory.products_needing_barcodes AS
SELECT 
    p.product_id,
    p.name,
    p.brand,
    p.category,
    COUNT(sp.store_id) as store_count,
    COUNT(b.batch_id) as batch_count,
    MAX(b.created_at) as latest_batch
FROM inventory.products p
LEFT JOIN inventory.store_products sp ON p.product_id = sp.product_id
LEFT JOIN inventory.batches b ON p.product_id = b.product_id
WHERE p.barcode IS NULL
GROUP BY p.product_id, p.name, p.brand, p.category
ORDER BY batch_count DESC, latest_batch DESC;

COMMIT;

-- =============================================
-- VERIFICATION QUERIES (run manually after migration)
-- =============================================

-- Check barcode columns added correctly
-- SELECT COUNT(*) FROM inventory.batches WHERE batch_source = 'manual';

-- Check view creation
-- SELECT * FROM inventory.products_needing_barcodes LIMIT 5;