/**
 * Users route integration tests.
 * Uses real database. Read-only tests are safe; create/update tests add data.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { loginAs, anonAgent } from './helpers/login.js';

async function adminAgent() {
  return (await loginAs(app, 'admin@budget.go.ke', 'password')).agent;
}

async function ceoAgent() {
  return (await loginAs(app, 'ceo@budget.go.ke', 'password')).agent;
}

async function viewerAgent() {
  return (await loginAs(app, 'viewer@budget.go.ke', 'password')).agent;
}

// ---------------------------------------------------------------------------
// GET /api/users
// ---------------------------------------------------------------------------
describe('GET /api/users', () => {
  it('returns 401 without authentication', async () => {
    const res = await anonAgent(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns 403 for viewer role', async () => {
    const agent = await viewerAgent();
    const res = await agent.get('/api/users');
    expect(res.status).toBe(403);
  });

  it('returns 403 for ministry_head role', async () => {
    const agent = (await loginAs(app, 'agri@budget.go.ke', 'password')).agent;
    const res = await agent.get('/api/users');
    expect(res.status).toBe(403);
  });

  it('returns user list for super_admin', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/users');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    // No passwords in response
    res.body.forEach((u: any) => {
      expect(u.passwordHash).toBeUndefined();
    });
  });

  it('returns user list for ceo role', async () => {
    const agent = await ceoAgent();
    const res = await agent.get('/api/users');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returned users include sector info', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/users');

    expect(res.status).toBe(200);
    // At least one user should have a sector (the ministry heads)
    const usersWithSector = res.body.filter((u: any) => u.sector !== null);
    expect(usersWithSector.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GET /api/users/:id
// ---------------------------------------------------------------------------
describe('GET /api/users/:id', () => {
  it('returns 401 without auth', async () => {
    const res = await anonAgent(app).get('/api/users/1');
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent user', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/users/999999');
    expect(res.status).toBe(404);
  });

  it('returns user details for an existing id', async () => {
    const agent = await adminAgent();
    const res = await agent.get('/api/users/1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, email: 'admin@budget.go.ke' });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('any authenticated user can view a user profile', async () => {
    const agent = await viewerAgent();
    const res = await agent.get('/api/users/1');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// POST /api/users
// ---------------------------------------------------------------------------
describe('POST /api/users', () => {
  it('returns 401 without auth', async () => {
    const res = await anonAgent(app).post('/api/users').send({
      name: 'X', email: 'x@x.com', password: 'password', role: 'viewer',
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 for ceo role', async () => {
    const agent = await ceoAgent();
    const res = await agent.post('/api/users').send({
      name: 'X', email: 'x@x.com', password: 'password', role: 'viewer',
    });
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields are missing', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/users').send({ name: 'Incomplete' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when email already exists', async () => {
    const agent = await adminAgent();
    const res = await agent.post('/api/users').send({
      name: 'Dupe Admin', email: 'admin@budget.go.ke',
      password: 'password', role: 'viewer',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  it('creates a new user when called by super_admin', async () => {
    const agent = await adminAgent();
    const uniqueEmail = `testuser_${Date.now()}@budget.go.ke`;

    const res = await agent.post('/api/users').send({
      name: 'Test User', email: uniqueEmail,
      password: 'password', role: 'viewer',
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Test User', email: uniqueEmail, role: 'viewer' });
    expect(res.body.id).toBeDefined();
    expect(res.body.passwordHash).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// PUT /api/users/:id
// ---------------------------------------------------------------------------
describe('PUT /api/users/:id', () => {
  it('returns 403 for viewer role', async () => {
    const agent = await viewerAgent();
    const res = await agent.put('/api/users/1').send({ name: 'Hacked' });
    expect(res.status).toBe(403);
  });

  it('returns 403 for ceo role', async () => {
    const agent = await ceoAgent();
    const res = await agent.put('/api/users/1').send({ name: 'CEO Update' });
    expect(res.status).toBe(403);
  });

  it('super_admin can update a user name', async () => {
    // First create a temporary user to update
    const agent = await adminAgent();
    const uniqueEmail = `update_test_${Date.now()}@budget.go.ke`;

    const createRes = await agent.post('/api/users').send({
      name: 'Before Update', email: uniqueEmail, password: 'password', role: 'viewer',
    });
    expect(createRes.status).toBe(201);
    const userId = createRes.body.id;

    const updateRes = await agent.put(`/api/users/${userId}`).send({ name: 'After Update' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.name).toBe('After Update');
  });
});
