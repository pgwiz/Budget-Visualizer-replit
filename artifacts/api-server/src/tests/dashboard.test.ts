/**
 * Dashboard route integration tests — all read-only.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { loginAs, anonAgent } from './helpers/login.js';

async function adminAgent() {
  return (await loginAs(app, 'admin@budget.go.ke', 'password')).agent;
}

async function ministryAgent() {
  return (await loginAs(app, 'agri@budget.go.ke', 'password')).agent;
}

// ---------------------------------------------------------------------------
// GET /api/dashboard/summary
// ---------------------------------------------------------------------------
describe('GET /api/dashboard/summary', () => {
  it('returns 401 for unauthenticated requests', async () => {
    const res = await anonAgent(app).get('/api/dashboard/summary');
    expect(res.status).toBe(401);
  });

  it('returns summary with expected fields for super_admin', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/dashboard/summary');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: 'super_admin' });
    expect(typeof res.body.totalBudget).toBe('number');
    expect(typeof res.body.totalAllocated).toBe('number');
    expect(typeof res.body.totalRevoked).toBe('number');
    expect(typeof res.body.availableBalance).toBe('number');
    expect(typeof res.body.utilizationPct).toBe('number');
    expect(typeof res.body.sectorCount).toBe('number');
    expect(Array.isArray(res.body.topSectors)).toBe(true);
  });

  it('myAllocated is null for super_admin (no specific sector)', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/dashboard/summary');

    expect(res.status).toBe(200);
    expect(res.body.myAllocated).toBeNull();
    expect(res.body.myAvailable).toBeNull();
  });

  it('returns sector-specific stats for ministry_head', async () => {
    const agent = await ministryAgent();
    const res = await agent.get('/api/dashboard/summary');

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ministry_head');
  });

  it('utilization is between 0 and 100', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/dashboard/summary');

    expect(res.body.utilizationPct).toBeGreaterThanOrEqual(0);
    expect(res.body.utilizationPct).toBeLessThanOrEqual(100);
  });

  it('topSectors have expected shape', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/dashboard/summary');

    expect(res.body.topSectors.length).toBeGreaterThan(0);
    const sector = res.body.topSectors[0];
    expect(sector).toHaveProperty('id');
    expect(sector).toHaveProperty('name');
    expect(sector).toHaveProperty('totalAllocated');
    expect(sector).toHaveProperty('availableBalance');
  });
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/utilization-chart
// ---------------------------------------------------------------------------
describe('GET /api/dashboard/utilization-chart', () => {
  it('returns 401 without auth', async () => {
    const res = await anonAgent(app).get('/api/dashboard/utilization-chart');
    expect(res.status).toBe(401);
  });

  it('returns array of sector utilization objects', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/dashboard/utilization-chart');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('each item has sectorName, allocated, and available', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/dashboard/utilization-chart');

    const item = res.body[0];
    expect(item).toHaveProperty('sectorName');
    expect(item).toHaveProperty('allocated');
    expect(item).toHaveProperty('available');
    expect(typeof item.allocated).toBe('number');
    expect(typeof item.available).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// GET /api/dashboard/allocation-timeline
// ---------------------------------------------------------------------------
describe('GET /api/dashboard/allocation-timeline', () => {
  it('returns 401 without auth', async () => {
    const res = await anonAgent(app).get('/api/dashboard/allocation-timeline');
    expect(res.status).toBe(401);
  });

  it('returns an array of timeline entries', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/dashboard/allocation-timeline');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('timeline entries have cumulative totals', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/dashboard/allocation-timeline');

    if (res.body.length > 0) {
      const entry = res.body[0];
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('cumulativeAllocated');
    }
  });
});
