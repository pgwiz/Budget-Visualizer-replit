# Quick-Login Loading Issue - Debugging Guide

## Problem
"Unable to load quick-login users right now" on the login page when clicking the Quick Login tab.

## Root Causes

### 1. **Database Not Seeded (Most Likely)**
The `/api/auth/demo-users` endpoint queries the database for users and sectors. If the database has no data, it returns empty.

**Check this first:**
```bash
# From the repo root
node supabaseseeder.js
```

This will populate Supabase with demo data:
- 3021 users
- 2373 sectors
- 2372 allocations

### 2. **Database Connection Issue**
The backend can't connect to Supabase.

**Check the health endpoint:**
1. Open your browser
2. Visit: `https://budget-visualizer-replit.onrender.com/api/healthz`
3. Look for response like:
   ```json
   {
     "status": "ok",
     "database": {
       "connected": true,
       "usersCount": 3021,
       "sectorsCount": 2373
     }
   }
   ```

**If it says `"connected": false`:**
- Render environment variable `DATABASE_URL` or `SUPABASEDB_STRING` is missing/wrong
- Check Render dashboard → Environment

### 3. **API Endpoint Failing**
The endpoint might have an error.

**Check the network tab:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Switch to Quick Login tab
4. Look for `api/auth/demo-users` request
5. Check response:
   - Status 200 = response received
   - Status 500 = server error (check message)
   - No request = endpoint not called

**If 500 error:**
```json
{
  "error": "Failed to load demo users",
  "message": "specific error message here"
}
```
Share this message for debugging.

## How to Debug

### Step 1: Check Health
```
GET https://budget-visualizer-replit.onrender.com/api/healthz
```

### Step 2: Check Demo Users Endpoint
```
GET https://budget-visualizer-replit.onrender.com/api/auth/demo-users
```

### Step 3: Check Browser Console (F12 → Console)
Look for `[Auth] Failed to load demo users:` message showing the error

### Step 4: Check Render Logs
1. Render dashboard → Logs
2. Filter for `demo-users` or `[DEBUG]`
3. Should show: `[DEBUG] demo-users loaded from database: {"usersCount": 3021, "sectorsCount": 2373}`

## Quick Fix Checklist

- [ ] Is database seeded? Run: `node supabaseseeder.js`
- [ ] Is Render health check returning connected: true?
- [ ] Does /api/auth/demo-users return users and sectors?
- [ ] Are there console errors in browser (F12 → Console)?
- [ ] Check Render logs for database connection errors

## What Should Happen

1. **Click Quick Login tab** → Shows loading spinner
2. **Page calls /api/auth/demo-users** → Gets users and sectors
3. **Builds tree hierarchy** → Displays sectors with users
4. **Click a user** → Login succeeds

## If Still Broken

**Tell me:**
1. Health check response (`/api/healthz`)
2. Demo users response (`/api/auth/demo-users`)
3. Browser console errors (F12 → Console)
4. Render logs (last 50 lines)
5. Step where it fails

This will pinpoint the exact issue!
