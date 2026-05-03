/**
 * Health check route — GET /api/healthz
 * No auth required, no DB queries.
 */
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/healthz', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/healthz');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
  });

  it('does not require authentication', async () => {
    const res = await request(app).get('/api/healthz');
    // Should not redirect to login or return 401
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});
