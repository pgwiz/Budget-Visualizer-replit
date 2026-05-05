# Neon Database Integration Fix

## Problem
The API was configured to use Prisma database (`DB_TYPE: prisma`) but the massive seed data was successfully loaded to Neon PostgreSQL. This mismatch caused login errors:
- 500 errors on `/api/auth/login`  
- Query failures on sectors table
- Auth flow not connecting to the seeded data

## Root Cause
`render.yaml` had:
```yaml
DB_TYPE: prisma           # Wrong - tries to use Prisma/DATABASE_URL
SUPABASEDB_STRING: false  # Available but not used
```

The API code (lib/db/src/index.ts) only uses `SUPABASEDB_STRING` when `DB_TYPE=supabase`.

## Solution
Changed `render.yaml` line 13:
```yaml
DB_TYPE: supabase  # Now uses SUPABASEDB_STRING (Neon connection)
```

## What Happens Next
1. **Render Auto-Redeploy**: Changed config triggers auto-rebuild and redeployment
2. **Database Connection**: API will now connect to Neon using `SUPABASEDB_STRING` environment variable
3. **Auth Flow**: Login will query against the seeded 2,294 sectors, 2,922 users, and 2,293 allocations
4. **Dashboard**: All budget data and hierarchy will be available

## Verification
After Render finishes deploying (~5-10 minutes):
- ✅ Try logging in with any seeded user (e.g., `admin@budget.go.ke` / password: `password`)
- ✅ Verify sectors load in the dashboard
- ✅ Check `/api/health` returns connected status
- ✅ Confirm no 500 errors in Render logs

## Important Notes
- **SUPABASEDB_STRING must be set in Render environment** to:  
  `postgresql://neondb_owner:npg_Uk4ANP7gZMEt@ep-royal-feather-am258sxq.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require`
- If SUPABASEDB_STRING is missing, API will error at startup with clear message
- The seeded data (2,294 sectors, 2,922 users) is already in Neon — no re-seeding needed
