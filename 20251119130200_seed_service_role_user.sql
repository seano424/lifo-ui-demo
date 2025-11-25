-- Migration: Add service role user for backend API authentication
-- 
-- This creates a special user with UUID 00000000-0000-0000-0000-000000000000
-- Used by the backend API when making authenticated calls with service_role key
-- 
-- IMPORTANT: This is for backend service authentication, not a real user account

INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'service_role',
    'system@lifo.ai',
    -- Empty password hash (this account cannot be used for password login)
    '',
    NOW(),
    -- App metadata indicating this is a service account
    '{"provider": "system", "providers": ["system"], "role": "service_role", "is_service_account": true}'::jsonb,
    -- User metadata
    '{"name": "Service Role", "is_service_account": true}'::jsonb,
    false,
    '',
    '',
    '',
    ''
);

