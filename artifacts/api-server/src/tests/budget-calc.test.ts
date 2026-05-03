/**
 * Unit tests for lib/budget-calc helpers.
 * Uses vi.spyOn on the real db object to control query results without a real DB connection.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as dbModule from '@workspace/db';
import {
  getTotalAllocated,
  getTotalRevoked,
  getNetAllocated,
  getTotalAllocatedFrom,
  getAvailableBalance,
  getUtilizationPct,
} from '../lib/budget-calc.js';
import { hashPassword } from '../lib/auth.js';

// Build a chainable drizzle-like mock that resolves to `rows`
function mockQuery(rows: any[]) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve(rows.slice(0, 1))),
    orderBy: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    then: (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject),
  };
  return chain;
}

beforeEach(() => {
  vi.spyOn(dbModule.db, 'select').mockImplementation((_cols?: any) => mockQuery([]) as any);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getTotalAllocated
// ---------------------------------------------------------------------------
describe('getTotalAllocated', () => {
  it('returns the SUM when allocations exist', async () => {
    vi.spyOn(dbModule.db, 'select').mockReturnValueOnce(
      mockQuery([{ total: '75000000' }]) as any,
    );

    const result = await getTotalAllocated(2, 1);
    expect(result).toBe(75000000);
  });

  it('returns 0 when there are no allocations', async () => {
    vi.spyOn(dbModule.db, 'select').mockReturnValueOnce(
      mockQuery([{ total: '0' }]) as any,
    );

    const result = await getTotalAllocated(99, 1);
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getTotalRevoked
// ---------------------------------------------------------------------------
describe('getTotalRevoked', () => {
  it('returns the sum of revoked amounts', async () => {
    vi.spyOn(dbModule.db, 'select').mockReturnValueOnce(
      mockQuery([{ total: '5000000' }]) as any,
    );

    const result = await getTotalRevoked(2, 1);
    expect(result).toBe(5000000);
  });

  it('returns 0 when nothing is revoked', async () => {
    vi.spyOn(dbModule.db, 'select').mockReturnValueOnce(
      mockQuery([{ total: '0' }]) as any,
    );

    const result = await getTotalRevoked(2, 1);
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getNetAllocated
// ---------------------------------------------------------------------------
describe('getNetAllocated', () => {
  it('returns allocated minus revoked', async () => {
    // getTotalAllocated call
    vi.spyOn(dbModule.db, 'select')
      .mockReturnValueOnce(mockQuery([{ total: '50000000' }]) as any) // allocated
      .mockReturnValueOnce(mockQuery([{ total: '5000000' }]) as any); // revoked

    const result = await getNetAllocated(2, 1);
    expect(result).toBe(45000000);
  });

  it('returns 0 when both are zero', async () => {
    vi.spyOn(dbModule.db, 'select')
      .mockReturnValueOnce(mockQuery([{ total: '0' }]) as any)
      .mockReturnValueOnce(mockQuery([{ total: '0' }]) as any);

    const result = await getNetAllocated(99, 1);
    expect(result).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getTotalAllocatedFrom
// ---------------------------------------------------------------------------
describe('getTotalAllocatedFrom', () => {
  it('returns amount distributed from a specific sector', async () => {
    vi.spyOn(dbModule.db, 'select').mockReturnValueOnce(
      mockQuery([{ total: '20000000' }]) as any,
    );

    const result = await getTotalAllocatedFrom(2, 1);
    expect(result).toBe(20000000);
  });

  it('returns amount distributed from the root (null sector)', async () => {
    vi.spyOn(dbModule.db, 'select').mockReturnValueOnce(
      mockQuery([{ total: '300000000' }]) as any,
    );

    const result = await getTotalAllocatedFrom(null, 1);
    expect(result).toBe(300000000);
  });
});

// ---------------------------------------------------------------------------
// getAvailableBalance
// ---------------------------------------------------------------------------
describe('getAvailableBalance', () => {
  it('returns totalBudget minus allocatedFrom for root (null sector)', async () => {
    const fakeCycle = {
      id: 1, totalBudget: '500000000', isActive: true,
      name: 'FY Test', startDate: '2024-01-01', endDate: '2025-01-01', createdBy: 1,
      createdAt: new Date(), updatedAt: new Date(),
    };

    vi.spyOn(dbModule.db, 'select')
      .mockReturnValueOnce(mockQuery([fakeCycle]) as any)  // cycle lookup
      .mockReturnValueOnce(mockQuery([{ total: '80000000' }]) as any); // allocatedFrom

    const result = await getAvailableBalance(null, 1);
    expect(result).toBe(420000000); // 500M - 80M
  });

  it('returns 0 when cycle is not found', async () => {
    vi.spyOn(dbModule.db, 'select').mockReturnValueOnce(
      mockQuery([]) as any, // no cycle
    );

    const result = await getAvailableBalance(null, 999);
    expect(result).toBe(0);
  });

  it('returns netReceived minus distributed for a sector', async () => {
    vi.spyOn(dbModule.db, 'select')
      .mockReturnValueOnce(mockQuery([{ total: '50000000' }]) as any) // allocated (netAllocated)
      .mockReturnValueOnce(mockQuery([{ total: '0' }]) as any)        // revoked (netAllocated)
      .mockReturnValueOnce(mockQuery([{ total: '20000000' }]) as any); // distributed from

    const result = await getAvailableBalance(2, 1);
    expect(result).toBe(30000000); // 50M - 20M
  });
});

// ---------------------------------------------------------------------------
// getUtilizationPct
// ---------------------------------------------------------------------------
describe('getUtilizationPct', () => {
  it('returns % of budget used for root', async () => {
    const fakeCycle = { id: 1, totalBudget: '500000000', isActive: true };

    vi.spyOn(dbModule.db, 'select')
      .mockReturnValueOnce(mockQuery([fakeCycle]) as any)               // cycle
      .mockReturnValueOnce(mockQuery([{ total: '250000000' }]) as any); // allocatedFrom

    const result = await getUtilizationPct(null, 1);
    expect(result).toBeCloseTo(50);
  });

  it('caps utilization at 100%', async () => {
    const fakeCycle = { id: 1, totalBudget: '500000000', isActive: true };

    vi.spyOn(dbModule.db, 'select')
      .mockReturnValueOnce(mockQuery([fakeCycle]) as any)
      .mockReturnValueOnce(mockQuery([{ total: '999999999' }]) as any);

    const result = await getUtilizationPct(null, 1);
    expect(result).toBe(100);
  });

  it('returns 0 when sector has received nothing', async () => {
    vi.spyOn(dbModule.db, 'select')
      .mockReturnValueOnce(mockQuery([{ total: '0' }]) as any) // allocated
      .mockReturnValueOnce(mockQuery([{ total: '0' }]) as any); // revoked → net = 0

    const result = await getUtilizationPct(2, 1);
    expect(result).toBe(0);
  });

  it('returns correct % for partial distribution', async () => {
    vi.spyOn(dbModule.db, 'select')
      .mockReturnValueOnce(mockQuery([{ total: '50000000' }]) as any)  // allocated
      .mockReturnValueOnce(mockQuery([{ total: '0' }]) as any)          // revoked → net=50M
      .mockReturnValueOnce(mockQuery([{ total: '25000000' }]) as any);  // distributed

    const result = await getUtilizationPct(2, 1);
    expect(result).toBeCloseTo(50);
  });
});

// ---------------------------------------------------------------------------
// hashPassword pure unit tests (no DB)
// ---------------------------------------------------------------------------
describe('hashPassword', () => {
  it('produces a deterministic hex hash', () => {
    const h1 = hashPassword('mysecret');
    const h2 = hashPassword('mysecret');

    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]+$/);
  });

  it('different inputs produce different hashes', () => {
    expect(hashPassword('aaa')).not.toBe(hashPassword('bbb'));
  });

  it('verifyPassword returns true for correct password', async () => {
    const { verifyPassword } = await import('../lib/auth.js');
    const hash = hashPassword('mypassword');
    expect(verifyPassword('mypassword', hash)).toBe(true);
    expect(verifyPassword('wrong', hash)).toBe(false);
  });
});
