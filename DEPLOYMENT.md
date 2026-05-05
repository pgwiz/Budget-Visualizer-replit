# Deployment Guide

This project is configured for deployment to **Vercel** (serverless) or **Render** (Docker-based).

## Database Setup

Your Prisma/Postgres database is already seeded with:
- ✅ 2,359 sectors across 8 ministries
- ✅ 3,009 users (HOD, supervisors, admins per sector)
- ✅ 2,358 allocations
- ✅ 1T KES budget across 8 ministries
- ✅ All users have password: `password`

**Important:** Rotate the DATABASE_URL credentials before deploying to production!

### Environment Variables Required

```env
DATABASE_URL=postgres://[user]:[pass]@[host]:5432/postgres?sslmode=require
POSTGRES_URL=postgres://[user]:[pass]@[host]:5432/postgres?sslmode=require
PRISMA_DATABASE_URL=postgres://[user]:[pass]@[host]:5432/postgres?sslmode=require
NODE_ENV=production
PORT=3000
BASE_PATH=/
```

---

## Option 1: Deploy to Render (Recommended for Linux/Docker)

### Via Render Dashboard

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Select branch: `deployment/vercel-render`
5. Set runtime: **Docker**
6. Add environment variables from above
7. Deploy!

### Via Render CLI

```bash
render deploy --prod
```

The `render.yaml` defines:
- **API Service**: Node.js Express server (port 3000)
- **Static Site**: React frontend (compiled Vite build)

---

## Option 2: Deploy to Vercel (Serverless)

### Via Vercel Dashboard

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Import this GitHub repo
3. Select branch: `deployment/vercel-render`
4. Set build command: `pnpm run build`
5. Add environment variables from above
6. Deploy!

### Via Vercel CLI

```bash
vercel --prod
```

The `vercel.json` routes:
- `/api/*` → API server
- `/*` → React static build

---

## Artifacts Being Deployed

### 1. **api-server** (`/artifacts/api-server`)
- Express.js backend
- Handles all REST API routes (users, budgets, allocations, etc.)
- Database: Postgres via Drizzle ORM

### 2. **budget-monitor** (`/artifacts/budget-monitor`)
- React + Vite frontend
- Responsive dashboard with org charts, budget visualization, hierarchies
- Static build deployed as public files

---

## Local Testing Before Deploy

```bash
# Install dependencies
pnpm install

# Build everything
pnpm build

# Run API server locally
cd artifacts/api-server
PORT=3000 node --enable-source-maps ./dist/index.mjs

# Or run with Vercel locally
vercel dev

# Or test Docker build
docker build -t budget-viz .
docker run -e DATABASE_URL="..." -p 3000:3000 budget-viz
```

---

## Deployment Checklist

- [ ] Database credentials rotated
- [ ] Environment variables set on platform
- [ ] Build succeeds locally: `pnpm build`
- [ ] API responds: `curl http://localhost:3000/api/health`
- [ ] Frontend loads in browser: `http://localhost:3000`
- [ ] Branch pushed: `deployment/vercel-render`
- [ ] Selected correct runtime (Docker for Render, Node for Vercel)
- [ ] Verified database connection on platform

---

## Files Modified/Created

- **Dockerfile** - Docker image for Render
- **vercel.json** - Vercel serverless config
- **render.yaml** - Render multi-service config
- **package.json** - Removed Windows-incompatible preinstall script
- **vite.config.ts** - Made PORT/BASE_PATH optional for builds
- **LoadingSpinner.tsx** - Added style prop support

---

## Troubleshooting

### Build fails with "Cannot find module @rollup/rollup-win32-x64-msvc"
- Already fixed! Run: `pnpm add -w @rollup/rollup-win32-x64-msvc`

### PORT environment variable error
- The vite.config now defaults to `5173` if PORT not set

### Database connection timeout
- Verify DATABASE_URL is correct on your platform
- Check firewall allows connections from deployment region
- Confirm Postgres instance is running and accessible

---

## Next Steps

1. **Create PR** from `deployment/vercel-render` to `main` for review
2. **Choose platform**: Render (recommended) or Vercel
3. **Rotate credentials** before production deployment
4. **Test deployment** in staging first
5. **Monitor logs** after deploy
