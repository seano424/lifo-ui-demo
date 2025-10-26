-- Migration: 005_update_employee_permissions.sql
BEGIN;

-- Update employee permissions in business.store_users
-- Add new permission fields for PIN-based access
ALTER TABLE business.store_users 
ADD COLUMN can_use_pin_auth BOOLEAN DEFAULT FALSE,    -- Can authenticate with PIN
ADD COLUMN pin_access_level VARCHAR(20) DEFAULT 'basic', -- basic, elevated, admin
ADD COLUMN pin_permissions JSONB DEFAULT '{}';        -- Granular PIN permissions

-- Update existing employee records
UPDATE business.store_users 
SET can_use_pin_auth = TRUE,
    pin_access_level = 'basic',
    pin_permissions = jsonb_build_object(
        'can_view_inventory', true,
        'can_update_quantities', true,
        'can_create_batches', false,
        'can_apply_discounts', false,
        'can_access_analytics', false
    )
WHERE role_in_store = 'employee';

-- Update staff permissions (higher than employee)
UPDATE business.store_users 
SET can_use_pin_auth = TRUE,
    pin_access_level = 'elevated',
    pin_permissions = jsonb_build_object(
        'can_view_inventory', true,
        'can_update_quantities', true,
        'can_create_batches', true,
        'can_apply_discounts', true,
        'can_access_analytics', false
    )
WHERE role_in_store = 'staff';

-- Manager and owner permissions
UPDATE business.store_users 
SET can_use_pin_auth = TRUE,
    pin_access_level = 'admin',
    pin_permissions = jsonb_build_object(
        'can_view_inventory', true,
        'can_update_quantities', true,
        'can_create_batches', true,
        'can_apply_discounts', true,
        'can_access_analytics', true,
        'can_manage_employees', true
    )
WHERE role_in_store IN ('manager', 'owner');

-- Add constraint for pin_access_level
ALTER TABLE business.store_users 
ADD CONSTRAINT chk_pin_access_level 
CHECK (pin_access_level IN ('basic', 'elevated', 'admin'));

COMMIT;