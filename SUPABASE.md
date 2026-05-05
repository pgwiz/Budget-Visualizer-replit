# Supabase Database Support

This application now supports both **Prisma-hosted PostgreSQL** and **Supabase PostgreSQL** databases.

## Configuration

### Environment Variables

Set these to control which database to use:

#### Prisma (Default)
```bash
export DB_TYPE="prisma"
export DATABASE_URL="postgresql://user:password@host:5432/postgres?sslmode=require"
export POSTGRES_URL="postgresql://user:password@host:5432/postgres?sslmode=require"
export PRISMA_DATABASE_URL="postgresql://user:password@host:5432/postgres?sslmode=require"
```

#### Supabase
```bash
export DB_TYPE="supabase"
export SUPABASEDB_STRING="postgresql://postgres:password@db.sgbbiosqzhuabnkndhoy.supabase.co:5432/postgres"
```

### Seeding Supabase

Run the seed script with Supabase connection:

```bash
# Seed Supabase database
export DB_TYPE="supabase"
export SUPABASEDB_STRING="postgresql://postgres:YOUR_PASSWORD@db.sgbbiosqzhuabnkndhoy.supabase.co:5432/postgres"

npx tsx scripts/src/seed-kenya-massive.ts
```

This will create:
- 2,359+ sectors across 8 ministries
- 3,000+ users (demo accounts)
- 1 budget cycle with 1T KES budget
- 2,300+ allocations
- 20 products
- Support for procurement workflows

### Deployment Configuration

#### Render
Add these environment variables in the Render dashboard:

- `DB_TYPE`: Set to `"prisma"` or `"supabase"` (default: `prisma`)
- `DATABASE_URL` or `SUPABASEDB_STRING`: Your database connection string
- `POSTGRES_URL`: For Prisma connections
- `PRISMA_DATABASE_URL`: For Prisma connections
- `SESSION_SECRET`: Your session secret key
- `PORT`: 3000

#### Vercel
Add these secrets in Vercel:

- `DB_TYPE`: Set to `"prisma"` or `"supabase"`
- `DATABASE_url` or `SUPABASEDB_STRING`: Your database connection string
- `POSTGRES_URL`: For Prisma connections
- `PRISMA_DATABASE_URL`: For Prisma connections
- `SESSION_SECRET`: Your session secret key

### API Endpoints

#### Database Configuration Status
```bash
GET /api/supabase/config
```

Returns:
```json
{
  "dbType": "supabase",
  "isSupabase": true,
  "connections": {
    "prisma": {
      "configured": false,
      "host": null
    },
    "supabase": {
      "configured": true,
      "host": "db.sgbbiosqzhuabnkndhoy.supabase.co",
      "port": "5432"
    }
  },
  "active": "supabase"
}
```

#### Database Health Check
```bash
GET /api/supabase/health
```

Returns:
```json
{
  "status": "ok",
  "database": {
    "type": "supabase",
    "isSupabase": true,
    "host": "db.sgbbiosqzhuabnkndhoy.supabase.co",
    "configured": true
  }
}
```

## Migration Path

### From Prisma to Supabase

1. Set up Supabase database with the same schema (migrations are auto-applied)
2. Seed Supabase with:
   ```bash
   DB_TYPE=supabase SUPABASEDB_STRING=<your_string> npx tsx scripts/src/seed-kenya-massive.ts
   ```
3. Update environment variables to point to Supabase
4. Test with: `GET /api/supabase/config`
5. Deploy with `DB_TYPE=supabase`

### From Supabase to Prisma

1. Export data from Supabase (using pg_dump or Supabase CLI)
2. Import to Prisma database
3. Update environment variables to point to Prisma
4. Update `DB_TYPE=prisma` (or remove it, as it's the default)
5. Test with: `GET /api/supabase/config`
6. Deploy

## Troubleshooting

### Connection Refused
- Verify the connection string is correct
- Check if the database allows connections from your IP
- For Supabase: Ensure you're using the correct region URL

### SSL Certificate Error
Both database types use `ssl: { rejectUnauthorized: false }` for compatibility with cloud-hosted databases.

### Seed Script Hangs
- Check network connectivity to the database
- Verify credentials are correct
- Check database logs for errors

## Notes

- SSL is always enabled for both database types
- Connection pooling is managed via `pg.Pool`
- Drizzle ORM handles SQL generation for both databases
- Schema is identical for both database types
