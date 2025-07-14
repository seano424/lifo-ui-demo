-- Data Validation Script: validate_user_migration.sql
-- Run this script to validate the user migration from user_mgmt.users to auth.users
-- This should be run BEFORE applying the migration to understand current state

-- =============================================
-- PRE-MIGRATION VALIDATION
-- =============================================

\echo '=========================================='
\echo 'USER MIGRATION VALIDATION REPORT'
\echo '=========================================='

-- 1. Count users in each table
\echo ''
\echo '1. USER COUNT COMPARISON:'
SELECT 
    'auth.users' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_user,
    MAX(created_at) as newest_user
FROM auth.users
UNION ALL
SELECT 
    'user_mgmt.users' as table_name,
    COUNT(*) as count,
    MIN(created_at) as oldest_user,
    MAX(created_at) as newest_user
FROM user_mgmt.users
ORDER BY table_name;

-- 2. Check user overlap between tables
\echo ''
\echo '2. USER OVERLAP ANALYSIS:'
SELECT 
    'auth_users_with_user_mgmt_match' as status,
    COUNT(*) as count
FROM auth.users au
WHERE au.id IN (SELECT user_id FROM user_mgmt.users)
UNION ALL
SELECT 
    'user_mgmt_without_auth_match' as status,
    COUNT(*) as count
FROM user_mgmt.users umu
WHERE umu.user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
SELECT 
    'auth_users_without_user_mgmt' as status,
    COUNT(*) as count
FROM auth.users au
WHERE au.id NOT IN (SELECT user_id FROM user_mgmt.users);

-- 3. Check store_users referential integrity
\echo ''
\echo '3. STORE_USERS REFERENTIAL INTEGRITY:'
SELECT 
    'store_users_total' as status,
    COUNT(*) as count
FROM business.store_users
UNION ALL
SELECT 
    'store_users_valid_auth_ref' as status,
    COUNT(*) as count
FROM business.store_users su
WHERE su.user_id IN (SELECT id FROM auth.users)
UNION ALL
SELECT 
    'store_users_invalid_auth_ref' as status,
    COUNT(*) as count
FROM business.store_users su
WHERE su.user_id NOT IN (SELECT id FROM auth.users);

-- 4. Check foreign key constraints status
\echo ''
\echo '4. CURRENT FOREIGN KEY CONSTRAINTS:'
SELECT 
    tc.table_schema,
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND (
    (ccu.table_name = 'users' AND ccu.table_schema = 'auth') OR
    (ccu.table_name = 'users' AND ccu.table_schema = 'user_mgmt')
)
ORDER BY tc.table_schema, tc.table_name, tc.constraint_name;

-- 5. Check for email duplicates
\echo ''
\echo '5. EMAIL DUPLICATE ANALYSIS:'
WITH auth_emails AS (
    SELECT email, 'auth.users' as source FROM auth.users WHERE email IS NOT NULL
),
user_mgmt_emails AS (
    SELECT email, 'user_mgmt.users' as source FROM user_mgmt.users WHERE email IS NOT NULL
),
all_emails AS (
    SELECT email, source FROM auth_emails
    UNION ALL
    SELECT email, source FROM user_mgmt_emails
)
SELECT 
    email,
    COUNT(*) as occurrence_count,
    string_agg(source, ', ') as found_in_tables
FROM all_emails
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC, email;

-- 6. Check user metadata that would be migrated
\echo ''
\echo '6. USER METADATA TO BE MIGRATED:'
SELECT 
    COUNT(*) as total_user_mgmt_users,
    COUNT(CASE WHEN username IS NOT NULL THEN 1 END) as has_username,
    COUNT(CASE WHEN full_name IS NOT NULL THEN 1 END) as has_full_name,
    COUNT(CASE WHEN phone IS NOT NULL THEN 1 END) as has_phone,
    COUNT(CASE WHEN pin_hash IS NOT NULL THEN 1 END) as has_pin_hash,
    COUNT(CASE WHEN requires_pin IS TRUE THEN 1 END) as requires_pin
FROM user_mgmt.users;

-- 7. Check current auth.users metadata
\echo ''
\echo '7. CURRENT AUTH.USERS METADATA:'
SELECT 
    COUNT(*) as total_auth_users,
    COUNT(CASE WHEN raw_user_meta_data IS NOT NULL THEN 1 END) as has_metadata,
    COUNT(CASE WHEN (raw_user_meta_data->>'migrated_from_user_mgmt')::boolean IS TRUE THEN 1 END) as already_migrated
FROM auth.users;

-- 8. Detailed mismatch analysis
\echo ''
\echo '8. DETAILED USER MISMATCH ANALYSIS:'
-- Users in user_mgmt but not in auth
SELECT 
    'ORPHANED_USER_MGMT' as issue_type,
    umu.user_id,
    umu.email,
    umu.username,
    umu.created_at
FROM user_mgmt.users umu
WHERE umu.user_id NOT IN (SELECT id FROM auth.users)
UNION ALL
-- Users in auth but not in user_mgmt  
SELECT 
    'ORPHANED_AUTH' as issue_type,
    au.id as user_id,
    au.email,
    (au.raw_user_meta_data->>'username') as username,
    au.created_at
FROM auth.users au
WHERE au.id NOT IN (SELECT user_id FROM user_mgmt.users)
ORDER BY issue_type, created_at;

\echo ''
\echo '=========================================='
\echo 'VALIDATION COMPLETE'
\echo 'Review the above results before migration'
\echo '=========================================='