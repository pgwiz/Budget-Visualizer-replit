# Performance Debugging Guide

## What We Added

### 1. **Backend Performance Tracking** (`artifacts/api-server/src/lib/performance.ts`)

New `PerformanceTracker` class that logs:
- Total request time
- Number of database queries per endpoint
- Individual query duration (name, count, total time, average time)
- Request ID for tracing

**What you'll see in server logs:**
```
[PERF] /dashboard/summary completed in 6234ms (28 queries)
  - getActiveCycle: 1 query, 45ms
  - getUserSectorInfo: 1 query, 32ms
  - getRootSectorIds: 1 query, 28ms
  - getTotalAllocated_global: 1 query, 312ms
  - getTotalRevoked_global: 1 query, 289ms
  - getSectorCounts: 2 queries, 445ms
  - getChildSectors: 1 query, 52ms
  - processTopSectors: 10 queries, 3847ms (these run in parallel)
  - getPersonalSectorStats: 10 queries, 1184ms (these run in parallel)
```

### 2. **Frontend Performance Monitoring** (`artifacts/budget-monitor/src/hooks/usePerformanceMonitoring.ts`)

- Logs page load metrics (total load time, connect time, DOM render time)
- Tracks individual API request durations
- Logs all queries to browser console

**What you'll see in browser console:**
```
[PERF] Page Metrics: {
  pageLoadTime: "2341ms",
  connectTime: "156ms",
  renderTime: "892ms",
  timestamp: "2025-05-05T15:08:23Z"
}

[PERF] Fetching: {
  queryKey: ["dashboard", "summary"],
  timestamp: "2025-05-05T15:08:24Z"
}

[PERF] Fetched: {
  queryKey: ["dashboard", "summary"],
  duration: "6234.23ms",
  timestamp: "2025-05-05T15:08:30Z"
}
```

### 3. **Enhanced Dashboard Endpoint** (`artifacts/api-server/src/routes/dashboard.ts`)

Each database operation is now wrapped with performance tracking:
- Cache hit/miss indicator (X-Cache header)
- Individual query timing
- Comprehensive error tracking with timing

## How to Use

### On the Backend (Render Logs)

1. Check Render deployment logs at: https://dashboard.render.com
2. Look for `[PERF]` markers - these show exact operation timings
3. Identify slow queries:
   - `processTopSectors` > 500ms = slow sector calculations
   - `getSectorCounts` > 300ms = slow count queries
   - Any single query > 1000ms = database latency issue

### In the Browser (Developer Tools)

1. Open browser DevTools (F12)
2. Go to Console tab
3. Filter by `[PERF]` to see all performance logs
4. Compare:
   - Time to first interactive UI (~100ms ideal)
   - Time to data load (should show in logs)
   - Check if it's frontend rendering or backend delay

### Checking Cache Performance

1. First request: Should show `X-Cache: MISS` header, full 6-8 seconds
2. Second request: Should show `X-Cache: HIT`, <50ms response time
3. If always MISS: Cache TTL might be too short or disabled

## Performance Debugging Checklist

- [ ] Is the slow response in **backend queries** or **frontend rendering**?
  - Check: `[PERF] /dashboard/summary completed in 6234ms`
  - If > 5s = backend issue
  - If < 1s but page still slow = frontend rendering issue

- [ ] Which query is slowest?
  - Check individual query times in logs
  - If `processTopSectors: 3847ms` = many parallel queries slow
  - If `getTotalAllocated_global: 312ms` = single query slow

- [ ] Is database the bottleneck?
  - Render dashboard → metrics
  - Check Supabase connection pool status
  - Look for "cold starts" or high latency in Supabase logs

- [ ] Is cache working?
  - Second request should be cached
  - Look for `X-Cache: HIT` header
  - If still slow = cache issue

## Database Query Optimization

If you see queries taking > 1000ms each:

1. Check if **indexes are missing** on frequently queried columns:
   ```sql
   CREATE INDEX idx_allocations_cycle_status ON allocationsTable(budgetCycleId, status);
   CREATE INDEX idx_sectors_parent ON sectorsTable(parentId);
   CREATE INDEX idx_sectors_depth ON sectorsTable(depth);
   ```

2. Check if **connection pool is exhausted**:
   - Look at Supabase dashboard → Database → Connections
   - If near max: increase pool size

3. **Enable query logging** in Supabase:
   - Supabase dashboard → Logs → Postgres
   - Filter by duration to find slow queries

## Next Steps

1. **Deploy these changes** to production
2. **Login and check logs** - you'll see detailed performance breakdown
3. **Share the logs** with me showing:
   - Exact query timings
   - Which operation is slowest
   - Render deployment logs (last 30 minutes)
   - Browser console logs
4. **Optimize based on data**:
   - If backend is slow: Fix queries or database
   - If frontend is slow: Fix React rendering

## Environment Variables

Set `LOG_LEVEL=debug` in Render to get even more detailed logs:
- Render dashboard → Environment
- Add: `LOG_LEVEL=debug`
- Redeploy

This will show:
- Each database query executed
- Query parameters
- Cache behavior details
