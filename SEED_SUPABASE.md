# Seeding Supabase

Since the local environment doesn't have direct access to Supabase, you can seed the database using one of these methods:

## Method 1: Seed from Render (Recommended)

Connect to your Render deployment with SSH and run:

```bash
# SSH into Render instance (from Render dashboard)
DB_TYPE=supabase SUPABASEDB_STRING=postgresql://postgres:CIDGCvJYri1z6Q4p@db.sgbbiosqzhuabnkndhoy.supabase.co:5432/postgres npm run seed
```

## Method 2: Supabase SQL Editor

1. Go to Supabase Dashboard → SQL Editor
2. Run the seed scripts directly:
   - `scripts/src/seed-kenya-01-users.sql`
   - `scripts/src/seed-kenya-02-sectors.sql`
   - `scripts/src/seed-kenya-03-cycle-allocations.sql`
   - `scripts/src/seed-kenya-04-products-procurement.sql`

## Method 3: Using psql with Supabase Session Pooler

If using Session Pooler (recommended for external connections):

```bash
export DB_TYPE=supabase
export SUPABASEDB_STRING="postgresql://postgres:CIDGCvJYri1z6Q4p@db.sgbbiosqzhuabnkndhoy.supabase.co:6543/postgres"

npx tsx scripts/src/seed-kenya-massive.ts
```

Note: Use port **6543** for Session Pooler (IPv4 compatible)

## Method 4: Setup Vercel Cron (Automated)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/seed",
      "schedule": "0 0 * * 0"
    }
  ]
}
```

## Seed Data Summary

After seeding, you'll have:

- **2,373+ sectors** across 8 Kenyan ministries
- **3,021 users** (test/demo accounts)
- **1 budget cycle** with 1 Trillion KES total budget
- **2,372 allocations** across sectors
- **20 products** for procurement

All demo users have password: `password`

## Verify Seeding

Check Supabase dashboard:

1. Go to SQL Editor
2. Run: `SELECT COUNT(*) FROM "sectors";`
3. Should return: 2,373

Or use API:

```bash
curl https://your-deployment.onrender.com/api/supabase/health
```

Should show:
```json
{
  "status": "ok",
  "database": {
    "type": "supabase",
    "isSupabase": true,
    "configured": true
  }
}
```
