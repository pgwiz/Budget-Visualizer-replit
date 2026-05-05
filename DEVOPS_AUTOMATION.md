# DevOps Deployment Automation Guide

## Overview

This guide covers the automated deployment workflow for the Budget Visualizer project with support for both **Vercel** (serverless) and **Render** (Docker-based) platforms.

---

## 🚀 Deployment Automation Options

### Option 1: GitHub Actions CI/CD (Recommended)

**Automatic deployment** on every push to:
- `devin/1777922112-hierarchical-budget-system` (primary dev branch)
- `deployment/vercel-render` (staging branch)
- `main` (production branch)

**Features:**
- ✅ Automatic builds on push
- ✅ Type checking and linting
- ✅ Vercel deployment with fallback to Render
- ✅ Health checks post-deployment
- ✅ Deployment reports and notifications
- ✅ No manual intervention required

**Setup:**
1. Go to repository Settings → Secrets and variables → Actions
2. Add these **Repository Secrets**:
   ```
   VERCEL_TOKEN          # From https://vercel.com/account/tokens
   VERCEL_ORG_ID         # From vercel CLI: vercel whoami
   VERCEL_PROJECT_ID     # From project settings
   RENDER_DEPLOY_HOOK    # From Render dashboard deployment hooks
   RENDER_SERVICE_URL    # Your Render service URL
   DATABASE_URL          # Postgres connection string
   POSTGRES_URL          # Postgres connection string
   PRISMA_DATABASE_URL   # Postgres connection string
   ```

3. Workflow runs automatically on push!

---

### Option 2: Manual Bash Script Deployment

**Non-interactive bash script** for manual deployment control.

**File:** `deploy.sh`

**Features:**
- ✅ Git authentication without prompts
- ✅ Automatic branch pull with force reset
- ✅ Full build process
- ✅ Vercel deployment with fallback to Render
- ✅ Health checks
- ✅ Comprehensive logging to file

**Usage:**

```bash
# Deploy to primary target (auto-detect or specify)
./deploy.sh

# Deploy specifically to Vercel
DEPLOYMENT_TARGET=vercel ./deploy.sh

# Deploy specifically to Render
DEPLOYMENT_TARGET=render ./deploy.sh

# With GitHub PAT for authentication
GIT_KEY=ghp_xxxxxxxxxxxx ./deploy.sh

# With custom log directory
REPO_DIR=/path/to/repo ./deploy.sh
```

**Environment Variables:**
```bash
REPO_DIR              # Repository directory (default: current)
TARGET_BRANCH         # Git branch to deploy (default: devin/...)
DEPLOYMENT_TARGET     # vercel|render|auto (default: auto)
GIT_KEY              # GitHub PAT for authentication
RENDER_DEPLOY_HOOK   # Render webhook for deployment
```

**Log Output:**
```
deployment-20260505-075241.log  # Timestamped logs
```

---

### Option 3: Docker-Based Deployment

**Direct Docker container deployment** to Render.

**File:** `Dockerfile`

**Build and Deploy:**

```bash
# Build Docker image
docker build -t budget-visualizer:latest .

# Run locally for testing
docker run -e DATABASE_URL="..." \
           -e POSTGRES_URL="..." \
           -p 3000:3000 \
           budget-visualizer:latest

# Push to container registry (Render, Docker Hub, etc.)
docker push budget-visualizer:latest

# Deploy to Render via CLI
render deploy --prod
```

---

## 🔧 Configuration Files

### `.github/workflows/deploy.yml`

**GitHub Actions workflow** that:
1. Checks out code
2. Sets up Node.js & pnpm
3. Installs dependencies
4. Runs type checks
5. Builds both artifacts
6. Deploys to Vercel (primary)
7. Falls back to Render if Vercel fails
8. Performs health checks
9. Generates deployment report

**Triggers:**
- Push to `devin/1777922112-hierarchical-budget-system`, `deployment/vercel-render`, or `main`
- Manual workflow dispatch with deployment target selection

### `deploy.sh`

**Bash script** for standalone deployment with:
- Git operations (fetch, checkout, reset)
- Dependency installation
- Build process
- Vercel deployment
- Render fallback
- Health checks
- Comprehensive logging

### `Dockerfile`

**Multi-stage Docker build** that:
1. Installs Node.js & pnpm
2. Builds api-server and budget-monitor
3. Creates optimized runtime image
4. Exposes port 3000

### `render.yaml`

**Render deployment configuration** defining:
- API service (Node.js server)
- Static site (React UI)
- Environment variables
- Build commands
- Start commands

### `vercel.json`

**Vercel deployment configuration** defining:
- Build output directory
- Environment variables
- API routes
- Static routes

---

## 🔐 Security & Authentication

### GitHub Personal Access Token (PAT)

Required for non-interactive deployments in CI/CD or scripts:

```bash
# Create PAT at: https://github.com/settings/tokens
# Scope required: repo (full control of private repositories)

# Usage in script
export GIT_KEY=ghp_xxxxxxxxxxxx
./deploy.sh

# Or via secrets in GitHub Actions
${{ secrets.GITHUB_TOKEN }}
```

### Environment Variables

**Production Secrets** (set in platform dashboard):
- `DATABASE_URL` - Postgres connection
- `POSTGRES_URL` - Postgres connection
- `PRISMA_DATABASE_URL` - Prisma ORM connection
- `NODE_ENV=production`

**Vercel-Specific:**
- `VERCEL_TOKEN` - Deploy token
- `VERCEL_ORG_ID` - Organization ID
- `VERCEL_PROJECT_ID` - Project ID

**Render-Specific:**
- `RENDER_DEPLOY_HOOK` - Webhook URL
- `RENDER_SERVICE_URL` - Service URL

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] Branch created and pushed: `devin/1777922112-hierarchical-budget-system`
- [ ] Code changes tested locally
- [ ] Build succeeds: `pnpm build`
- [ ] Type checks pass: `pnpm typecheck`
- [ ] Database is seeded with test data
- [ ] Environment variables configured

### GitHub Actions Setup

- [ ] Repository secrets added (all 9 secrets)
- [ ] Workflow file committed to `.github/workflows/deploy.yml`
- [ ] Workflow appears in "Actions" tab
- [ ] Test workflow trigger (manual or push)

### Vercel Setup

- [ ] Project created at vercel.com
- [ ] GitHub integration connected
- [ ] Environment variables added
- [ ] Deployment verified

### Render Setup

- [ ] Service created at render.com
- [ ] GitHub integration connected  
- [ ] Deploy hook created
- [ ] Environment variables added
- [ ] Deployment verified

---

## 🚢 Deployment Workflow

### Automatic (GitHub Actions)

```
Code Push → GitHub Actions Trigger → Build → Deploy to Vercel
                                      ↓ (if Vercel fails)
                                   Deploy to Render
                                      ↓
                                  Health Checks
                                      ↓
                               Deployment Report
```

### Manual (Bash Script)

```bash
$ ./deploy.sh
[INFO] Setting up Git authentication...
[INFO] Pulling latest changes from branch: devin/...
[SUCCESS] Checked out: devin/... (commit: abc1234)
[INFO] Building project...
[SUCCESS] Build completed successfully
[INFO] Attempting Vercel deployment...
[SUCCESS] Vercel deployment succeeded
[INFO] Performing health checks...
[SUCCESS] API health check passed
[SUCCESS] Deployment completed successfully
```

---

## 🐛 Troubleshooting

### Build Fails: "Cannot find module @rollup/rollup-win32-x64-msvc"

```bash
pnpm add -w @rollup/rollup-win32-x64-msvc
pnpm run build
```

### Build Fails: "PORT environment variable is required"

The vite.config is already fixed to provide defaults (5173 for PORT, "/" for BASE_PATH).

### Deployment Fails: GitHub Token Issues

Ensure `GITHUB_TOKEN` is available:
```bash
# GitHub Actions provides this automatically
# For local testing, use:
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

### Deployment Fails: Database Connection

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Verify credentials in platform dashboard
# Check firewall allows your deployment region
```

### Health Check Fails

Deployment may still be initializing. Health checks are non-blocking (`continue-on-error: true`).

```bash
# Manual health check
curl https://your-deployment-url.com/api/health
```

---

## 📊 Deployment Report

Generated after each GitHub Actions deployment:

```markdown
# Deployment Report

**Branch:** devin/1777922112-hierarchical-budget-system
**Commit:** abc123def456
**Timestamp:** 2026-05-05 07:52:13 UTC

## Build Status
- Type Checks: ✓
- API Server Build: ✓
- Budget Monitor Build: ✓

## Deployment Status
- Vercel: success
- Render: skipped

## Deployment URLs
- Vercel: https://budget-visualizer.vercel.app
- Render: N/A

## Logs
[View workflow logs](https://github.com/pgwiz/Budget-Visualizer-replit/actions/runs/123456)
```

---

## 🔄 Continuous Deployment Flow

### Development → Staging → Production

```
1. Work on feature branch
   git checkout -b feature/xyz

2. Push to GitHub
   git push origin feature/xyz

3. Create PR to devin/1777922112-hierarchical-budget-system
   - Automated tests run
   - Staged deployment to Render

4. Merge to devin branch
   - GitHub Actions deploys to Vercel
   - Health checks pass
   - Report generated

5. PR to main for production release
   - Full testing in Vercel
   - Production deployment
```

---

## 📞 Support

For deployment issues:
1. Check `.github/workflows/deploy.yml` logs
2. Review `deployment-*.log` file from manual script
3. Check platform dashboards (Vercel.com / Render.com)
4. Verify environment variables and secrets
5. Test local build: `pnpm build`

---

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Deploy manually | `./deploy.sh` |
| Deploy to Vercel only | `DEPLOYMENT_TARGET=vercel ./deploy.sh` |
| Deploy to Render only | `DEPLOYMENT_TARGET=render ./deploy.sh` |
| Build locally | `pnpm build` |
| Type check | `pnpm typecheck` |
| View logs | `cat deployment-*.log` |
| Test Docker | `docker build -t budget-viz . && docker run -p 3000:3000 budget-viz` |

