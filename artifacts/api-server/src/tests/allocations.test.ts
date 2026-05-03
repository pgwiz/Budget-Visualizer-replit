/**
 * Allocations route integration tests.
 * GET /api/allocations, POST /api/allocations, GET /api/allocations/:id, POST /revoke
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { loginAs, anonAgent } from './helpers/login.js';

async function adminAgent() {
  return (await loginAs(app, 'admin@budget.go.ke', 'password')).agent;
}

async function viewerAgent() {
  return (await loginAs(app, 'viewer@budget.go.ke', 'password')).agent;
}

// ---------------------------------------------------------------------------
// GET /api/allocations
// ---------------------------------------------------------------------------
describe('GET /api/allocations', () => {
  it('returns 401 without auth', async () => {
    const res = await anonAgent(app).get('/api/allocations');
    expect(res.status).toBe(401);
  });

  it('returns allocation list for authenticated users', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/allocations');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('viewer role can read allocations', async () => {
    const agent = await viewerAgent();
    const res = await agent.get('/api/allocations');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('each allocation has expected shape', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/allocations');

    expect(res.status).toBe(200);
    const alloc = res.body[0];
    expect(alloc).toHaveProperty('id');
    expect(alloc).toHaveProperty('amount');
    expect(alloc).toHaveProperty('status');
    expect(alloc).toHaveProperty('toSector');
    expect(alloc).toHaveProperty('allocatedByUser');
  });

  it('filters by cycleId when provided', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/allocations?cycleId=1');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters by status when provided', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/allocations?status=active');

    expect(res.status).toBe(200);
    res.body.forEach((a: any) => {
      expect(a.status).toBe('active');
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/allocations/:id
// ---------------------------------------------------------------------------
describe('GET /api/allocations/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await anonAgent(app).get('/api/allocations/1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for non-existent allocation', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/allocations/999999');
    expect(res.status).toBe(404);
  });

  it('returns allocation detail for the first seeded allocation', async () => {
    const agent = await adminAgent();

    // Get the list first to find a real ID
    const listRes = await agent.get('/api/allocations');
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBeGreaterThan(0);

    const firstId = listRes.body[0].id;
    const res = await agent.get(`/api/allocations/${firstId}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', firstId);
    expect(typeof res.body.amount).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// POST /api/allocations — validation (no real DB write for bad inputs)
// ---------------------------------------------------------------------------
describe('POST /api/allocations (validation)', () => {
  it('returns 401 without auth', async () => {
    const res = await anonAgent(app).post('/api/allocations').send({
      budgetCycleId: 1, toSectorId: 2, amount: 1000,
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when budgetCycleId is missing', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/allocations').send({
      toSectorId: 2, amount: 1000,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing/i);
  });

  it('returns 400 when toSectorId is missing', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/allocations').send({
      budgetCycleId: 1, amount: 1000,
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for zero amount (treated as missing)', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/allocations').send({
      budgetCycleId: 1, toSectorId: 2, amount: 0,
    });
    // amount=0 is falsy → "Missing required fields"; amount<0 → "Amount must be positive"
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });

  it('returns 400 for negative amount', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/allocations').send({
      budgetCycleId: 1, toSectorId: 2, amount: -5000,
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an inactive budget cycle id', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/allocations').send({
      budgetCycleId: 999999, toSectorId: 2, amount: 1000,
    });
    // Either 400 (cycle not found/not active) or cycle doesn't exist → 400
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/allocations/:id/revoke — validation
// ---------------------------------------------------------------------------
describe('POST /api/allocations/:id/revoke (validation)', () => {
  it('returns 401 without auth', async () => {
    const res = await anonAgent(app)
      .post('/api/allocations/1/revoke')
      .send({ reason: 'Test reason here' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when reason is too short', async () => {
    const agent = await adminAgent();
    const res = await agent
      .post('/api/allocations/1/revoke')
      .send({ reason: 'no' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when allocation does not exist', async () => {
    const agent = await adminAgent();
    const res = await agent
      .post('/api/allocations/999999/revoke')
      .send({ reason: 'This allocation is no longer needed' });
    expect(res.status).toBe(404);
  });
});
