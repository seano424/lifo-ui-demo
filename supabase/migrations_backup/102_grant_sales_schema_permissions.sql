-- Grant service_role permissions on sales schema
-- Fixes: "permission denied for schema sales" error
-- Date: October 13, 2025

-- Grant USAGE on the sales schema (required to access any objects in the schema)
GRANT USAGE ON SCHEMA sales TO service_role;

-- Grant SELECT on all existing tables in sales schema
GRANT SELECT ON ALL TABLES IN SCHEMA sales TO service_role;

-- Grant INSERT, UPDATE, DELETE if needed for future operations
-- (Currently only SELECT is needed for velocity data fetch)

-- Grant permissions on future tables (auto-grant for new tables)
ALTER DEFAULT PRIVILEGES IN SCHEMA sales
    GRANT SELECT ON TABLES TO service_role;

-- Verify the transactions table exists and grant explicit permissions
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'sales'
        AND table_name = 'transactions'
    ) THEN
        GRANT SELECT ON sales.transactions TO service_role;
        RAISE NOTICE 'Granted SELECT on sales.transactions to service_role';
    ELSE
        RAISE WARNING 'Table sales.transactions does not exist - skipping explicit grant';
    END IF;
END $$;
