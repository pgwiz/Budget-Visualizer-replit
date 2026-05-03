import request from 'supertest';
import type { Express } from 'express';

export interface LoginResult {
  agent: ReturnType<typeof request.agent>;
  cookie: string;
  user: Record<string, any>;
}

/**
 * Performs a login against the Express app via HTTP and returns a supertest
 * agent that carries the session cookie automatically on subsequent requests.
 */
export async function loginAs(
  app: Express,
  email: string,
  password: string,
): Promise<LoginResult> {
  const agent = request.agent(app);

  const res = await agent
    .post('/api/auth/login')
    .send({ email, password })
    .set('Content-Type', 'application/json');

  if (res.status !== 200) {
    throw new Error(
      `loginAs(${email}) failed with status ${res.status}: ${JSON.stringify(res.body)}`,
    );
  }

  const rawCookie = (res.headers['set-cookie'] as string[] | string | undefined) ?? [];
  const cookie = Array.isArray(rawCookie) ? rawCookie[0] : rawCookie;

  return { agent, cookie, user: res.body.user };
}

/**
 * Returns an unauthenticated supertest agent.
 */
export function anonAgent(app: Express) {
  return request.agent(app);
}
