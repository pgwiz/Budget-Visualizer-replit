-- superbase-policy-fix.sql
-- Supabase policy/permission baseline for Budget Visualizer.
-- Safe to run multiple times.

BEGIN;

-- Basic schema/table privileges for Supabase API roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;

-- If RLS was enabled and blocking reads/writes, disable it for app tables.
DO $$
DECLARE
  table_name text;
  app_tables text[] := ARRAY[
    'users',
    'sectors',
    'budget_cycles',
    'allocations',
    'revocations',
    'audit_logs',
    'products',
    'purchase_orders',
    'purchase_order_items',
    'sector_controls',
    'approval_limits'
  ];
BEGIN
  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY', table_name);
    END IF;
  END LOOP;
END $$;

COMMIT;

