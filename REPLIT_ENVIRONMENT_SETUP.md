# Replit Environment Configuration for Neon Database

## Required Environment Variables

Set these in **Replit Secrets** (🔒 icon on left sidebar):

```
SUPABASEDB_STRING = postgresql://neondb_owner:npg_Uk4ANP7gZMEt@ep-royal-feather-am258sxq.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require
DB_TYPE = supabase
SESSION_SECRET = your-session-secret-here
```

## Steps to Configure on Replit

1. Click the **Secrets** (🔒) icon in the left sidebar
2. Add each environment variable:
   - **Key:** `SUPABASEDB_STRING`
     **Value:** `postgresql://neondb_owner:npg_Uk4ANP7gZMEt@ep-royal-feather-am258sxq.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require`
   
   - **Key:** `DB_TYPE`
     **Value:** `supabase`
   
   - **Key:** `SESSION_SECRET` 
     **Value:** (generate a random string or use existing one)

3. Click **Run** to restart the development server
4. The API will now connect to Neon and can access the 2,294 seeded sectors

## Verification

After restarting:
- Login should work with any seeded user (e.g., from `/api/auth/demo-users`)
- Dashboard should load sector hierarchy
- API routes should query against Neon (2,294 sectors, 2,922 users)

## Note

- Do **NOT** set `DATABASE_URL` if using `SUPABASEDB_STRING`
- The code automatically selects the right connection based on `DB_TYPE`
- All seeded data is already in Neon — no migration needed
