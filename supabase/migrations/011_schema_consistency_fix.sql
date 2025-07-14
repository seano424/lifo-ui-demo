-- Migration: 011_schema_consistency_fix.sql
-- Ensures schema consistency without breaking migration history
-- This migration is idempotent and safe to run multiple times

BEGIN;

-- Add any missing columns to user_mgmt.users if they don't exist
DO $$
BEGIN
    -- Add username column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'user_mgmt' 
        AND table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE user_mgmt.users ADD COLUMN username VARCHAR(255) UNIQUE;
        
        -- Populate username from email for existing users
        UPDATE user_mgmt.users 
        SET username = SPLIT_PART(email, '@', 1)
        WHERE username IS NULL;
        
        -- Make username NOT NULL after populating
        ALTER TABLE user_mgmt.users ALTER COLUMN username SET NOT NULL;
    END IF;

    -- Add password_hash column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'user_mgmt' 
        AND table_name = 'users' 
        AND column_name = 'password_hash'
    ) THEN
        ALTER TABLE user_mgmt.users ADD COLUMN password_hash VARCHAR(255);
        
        -- Set default hash for existing users
        UPDATE user_mgmt.users 
        SET password_hash = '$2b$12$default.hash.requires.password.reset'
        WHERE password_hash IS NULL;
        
        -- Make password_hash NOT NULL after populating
        ALTER TABLE user_mgmt.users ALTER COLUMN password_hash SET NOT NULL;
    END IF;

    -- Add avatar_url column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'user_mgmt' 
        AND table_name = 'users' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_mgmt.users ADD COLUMN avatar_url VARCHAR(255);
    END IF;

    -- Add last_login column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'user_mgmt' 
        AND table_name = 'users' 
        AND column_name = 'last_login'
    ) THEN
        ALTER TABLE user_mgmt.users ADD COLUMN last_login TIMESTAMP;
    END IF;
END $$;

-- Ensure proper constraints exist
DO $$
BEGIN
    -- Add unique constraint on username if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = 'user_mgmt' 
        AND table_name = 'users' 
        AND constraint_name = 'users_username_key'
    ) THEN
        ALTER TABLE user_mgmt.users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- Log the consistency fix
INSERT INTO analytics.actions (store_id, user_id, action_type, description, metadata)
VALUES (
    NULL,
    NULL,
    'system_migration',
    'Schema consistency fix applied',
    jsonb_build_object(
        'migration', '011_schema_consistency_fix',
        'timestamp', now(),
        'description', 'Ensures user_mgmt.users table has all required columns'
    )
);

COMMIT;