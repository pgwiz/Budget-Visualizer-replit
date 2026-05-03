import { vi } from 'vitest';

// --------------------------------------------------------------------------
// Seed fixtures
// --------------------------------------------------------------------------
import { hashPassword } from '../../lib/auth.js';

export const PASS = 'password';

export const USERS = {
  admin: {
    id: 1, name: 'System Admin', email: 'admin@budget.go.ke',
    role: 'super_admin', sectorId: null,
    passwordHash: hashPassword(PASS), isActive: true,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  },
  ceo: {
    id: 2, name: 'CEO User', email: 'ceo@budget.go.ke',
    role: 'ceo', sectorId: null,
    passwordHash: hashPassword(PASS), isActive: true,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  },
  ministryHead: {
    id: 3, name: 'Agri Ministry Head', email: 'agri@budget.go.ke',
    role: 'ministry_head', sectorId: 2,
    passwordHash: hashPassword(PASS), isActive: true,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  },
  viewer: {
    id: 5, name: 'Viewer', email: 'viewer@budget.go.ke',
    role: 'viewer', sectorId: null,
    passwordHash: hashPassword(PASS), isActive: true,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  },
  inactive: {
    id: 4, name: 'Inactive', email: 'inactive@budget.go.ke',
    role: 'viewer', sectorId: null,
    passwordHash: hashPassword(PASS), isActive: false,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  },
} as const;

export const SECTORS = {
  root: {
    id: 1, name: 'National Budget Pool', code: 'ROOT',
    parentId: null, depth: 0, responsibleUserId: 2,
    isActive: true, sortOrder: 0,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  },
  agri: {
    id: 2, name: 'Agriculture', code: 'AGRI',
    parentId: 1, depth: 1, responsibleUserId: 3,
    isActive: true, sortOrder: 1,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  },
} as const;

export const CYCLES = {
  active: {
    id: 1, name: 'FY 2024/2025', totalBudget: '500000000',
    startDate: '2024-07-01', endDate: '2025-06-30',
    isActive: true, createdBy: 1,
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'),
  },
} as const;

export const ALLOCATIONS = {
  root2agri: {
    id: 1, budgetCycleId: 1, fromSectorId: null, toSectorId: 2,
    allocatedBy: 1, amount: '50000000', comment: 'Initial allocation',
    status: 'active',
    createdAt: new Date('2024-07-01'), updatedAt: new Date('2024-07-01'),
  },
} as const;

// --------------------------------------------------------------------------
// Queue-based mock db — each enqueued array is consumed by the next query
// --------------------------------------------------------------------------

const queue: any[][] = [];
let insertCounter = 100;

export function enqueue(...rows: any[]) {
  queue.push(rows);
}

export function enqueueMany(...batches: any[][]) {
  batches.forEach(b => queue.push(b));
}

export function resetQueue() {
  queue.length = 0;
  insertCounter = 100;
}

function next(limit?: number): any[] {
  const rows = queue.shift() ?? [];
  return limit !== undefined ? rows.slice(0, limit) : rows;
}

// Build a drizzle-like chainable that always resolves via the queue
function chain(limitOverride?: number): any {
  const c: any = {
    from: vi.fn(() => c),
    where: vi.fn(() => c),
    limit: vi.fn((n: number) => ({
      then: (res: any) => Promise.resolve(next(n)).then(res),
    })),
    offset: vi.fn(() => c),
    orderBy: vi.fn(() => c),
    returning: vi.fn(() => Promise.resolve(next())),
    // thenable — for `await db.select().from().where()`
    then: (resolve: any, reject: any) =>
      Promise.resolve(next(limitOverride)).then(resolve, reject),
  };
  return c;
}

export const mockDb = {
  select: vi.fn(() => chain()),
  insert: vi.fn(() => ({
    values: vi.fn((vals: any) => ({
      returning: vi.fn(() => {
        const row = { ...vals, id: ++insertCounter, createdAt: new Date(), updatedAt: new Date() };
        return Promise.resolve([row]);
      }),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve(next())),
      })),
    })),
  })),
  delete: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  })),
};

// Re-configure mocks without losing references (useful after resetQueue)
export function resetMockDb() {
  resetQueue();
  mockDb.select.mockImplementation(() => chain());
  mockDb.insert.mockImplementation(() => ({
    values: vi.fn((vals: any) => ({
      returning: vi.fn(() => {
        const row = { ...vals, id: ++insertCounter, createdAt: new Date(), updatedAt: new Date() };
        return Promise.resolve([row]);
      }),
    })),
  }));
}
