/**
 * Auth route integration tests.
 * Uses the real app + real database (seeded by scripts/seed.ts).
 * All users have password "password".
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { loginAs, anonAgent } from './helpers/login.js';

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  it('returns 200 + user object on valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@budget.go.ke', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({
      email: 'admin@budget.go.ke',
      role: 'super_admin',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns user with sector for a ministry_head', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'agri@budget.go.ke', password: 'password' });

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('ministry_head');
    expect(res.body.user.sector).not.toBeNull();
    expect(res.body.user.sector).toMatchObject({ code: 'AGRI' });
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@budget.go.ke', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('returns 401 for a non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@budget.go.ke', password: 'password' });

    expect(res.status).toBe(401);
  });

  it('returns 400 when email or password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@budget.go.ke' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});

    expect(res.status).toBe(400);
  });

  it('does not expose passwordHash in the response', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ceo@budget.go.ke', password: 'password' });

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
describe('POST /api/auth/logout', () => {
  it('returns 200 with a success message', async () => {
    const { agent } = await loginAs(app, 'admin@budget.go.ke', 'password');

    const res = await agent.post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('session is invalidated after logout', async () => {
    const { agent } = await loginAs(app, 'admin@budget.go.ke', 'password');
    await agent.post('/api/auth/logout');

    const meRes = await agent.get('/api/auth/me');
    expect(meRes.status).toBe(401);
  });

  it('logout without session still returns 200', async () => {
    const res = await anonAgent(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
describe('GET /api/auth/me', () => {
  it('returns 401 when not authenticated', async () => {
    const res = await anonAgent(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns the authenticated user', async () => {
    const { agent } = await loginAs(app, 'admin@budget.go.ke', 'password');

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'admin@budget.go.ke',
      role: 'super_admin',
    });
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('returns ministry_head with sector attached', async () => {
    const { agent } = await loginAs(app, 'agri@budget.go.ke', 'password');

    const res = await agent.get('/api/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.role).toBe('ministry_head');
    expect(res.body.sector).not.toBeNull();
  });

  it('different roles return correct role field', async () => {
    const roles: Array<[string, string]> = [
      ['ceo@budget.go.ke', 'ceo'],
      ['viewer@budget.go.ke', 'viewer'],
    ];

    for (const [email, expectedRole] of roles) {
      const { agent } = await loginAs(app, email, 'password');
      const res = await agent.get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.role).toBe(expectedRole);
    }
  });
});
