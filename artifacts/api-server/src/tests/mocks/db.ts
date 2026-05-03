import { vi } from 'vitest';
import { hashPassword } from '../../lib/auth.js';

// --------------------------------------------------------------------------
// Seed data — mirrors what the real seed script inserts
// --------------------------------------------------------------------------

export const ADMIN_PASSWORD = 'password';

export const mockUsers = [
  {
    id: 1,
    name: 'System Admin',
    email: 'admin@budget.go.ke',
    role: 'super_admin',
    sectorId: null,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    name: 'CEO',
    email: 'ceo@budget.go.ke',
    role: 'ceo',
    sectorId: null,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    name: 'Agriculture Ministry Head',
    email: 'agri@budget.go.ke',
    role: 'ministry_head',
    sectorId: 2,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 4,
    name: 'Inactive User',
    email: 'inactive@budget.go.ke',
    role: 'viewer',
    sectorId: null,
    passwordHash: hashPassword(ADMIN_PASSWORD),
    isActive: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockSectors = [
  {
    id: 1,
    name: 'National Budget Pool',
    code: 'ROOT',
    parentId: null,
    depth: 0,
    responsibleUserId: 2,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 2,
    name: 'Agriculture',
    code: 'AGRI',
    parentId: 1,
    depth: 1,
    responsibleUserId: 3,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 3,
    name: 'Health',
    code: 'HEALTH',
    parentId: 1,
    depth: 1,
    responsibleUserId: null,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockCycles = [
  {
    id: 1,
    name: 'FY 2024/2025',
    totalBudget: '500000000',
    startDate: '2024-07-01',
    endDate: '2025-06-30',
    isActive: true,
    createdBy: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

export const mockAllocations = [
  {
    id: 1,
    budgetCycleId: 1,
    fromSectorId: null,
    toSectorId: 2,
    allocatedBy: 1,
    amount: '50000000',
    comment: 'Initial allocation',
    status: 'active',
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-01'),
  },
  {
    id: 2,
    budgetCycleId: 1,
    fromSectorId: null,
    toSectorId: 3,
    allocatedBy: 1,
    amount: '30000000',
    comment: 'Initial allocation',
    status: 'active',
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-07-01'),
  },
];

export const mockAuditLogs = [
  {
    id: 1,
    userId: 1,
    action: 'allocated',
    subjectType: 'allocation',
    subjectId: 1,
    meta: { amount: 50000000 },
    ipAddress: '127.0.0.1',
    createdAt: new Date('2024-07-01'),
  },
];

// --------------------------------------------------------------------------
// Query builder mock — fluent chainable that resolves to data arrays
// --------------------------------------------------------------------------

function makeQuery(rows: any[]) {
  const q: any = {
    _rows: rows,
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue(rows),
    then(resolve: any, reject: any) {
      return Promise.resolve(rows).then(resolve, reject);
    },
  };
  return q;
}

// --------------------------------------------------------------------------
// Stateful mock db that tests can manipulate via helpers
// --------------------------------------------------------------------------

let _users = [...mockUsers];
let _sectors = [...mockSectors];
let _cycles = [...mockCycles];
let _allocations = [...mockAllocations];
let _auditLogs = [...mockAuditLogs];
let _revocations: any[] = [];
let _nextId = 100;

export function resetDb() {
  _users = [...mockUsers];
  _sectors = [...mockSectors];
  _cycles = [...mockCycles];
  _allocations = [...mockAllocations];
  _auditLogs = [...mockAuditLogs];
  _revocations = [];
  _nextId = 100;
}

export function dbState() {
  return { users: _users, sectors: _sectors, cycles: _cycles, allocations: _allocations, auditLogs: _auditLogs, revocations: _revocations };
}

// --------------------------------------------------------------------------
// createDbMock — returns the full @workspace/db mock module
// --------------------------------------------------------------------------

export function createDbMock() {
  const db = {
    select: vi.fn((_cols?: any) => ({
      from: vi.fn((table: symbol) => ({
        where: vi.fn(() => ({
          where: vi.fn().mockReturnThis(),
          limit: vi.fn((n: number) => ({
            then: (resolve: any) => {
              const rows = resolveTable(table);
              return Promise.resolve(rows.slice(0, n)).then(resolve);
            },
          })),
          orderBy: vi.fn().mockReturnThis(),
          offset: vi.fn().mockReturnThis(),
          then: (resolve: any) => Promise.resolve(resolveTable(table)).then(resolve),
        })),
        limit: vi.fn((n: number) => ({
          then: (resolve: any) => {
            const rows = resolveTable(table);
            return Promise.resolve(rows.slice(0, n)).then(resolve);
          },
        })),
        orderBy: vi.fn(() => ({
          then: (resolve: any) => Promise.resolve(resolveTable(table)).then(resolve),
          limit: vi.fn((n: number) => ({
            then: (resolve: any) => Promise.resolve(resolveTable(table).slice(0, n)).then(resolve),
          })),
          offset: vi.fn().mockReturnThis(),
        })),
        then: (resolve: any) => Promise.resolve(resolveTable(table)).then(resolve),
      })),
    })),

    insert: vi.fn((table: symbol) => ({
      values: vi.fn((vals: any) => ({
        returning: vi.fn(() => {
          const row = { ...vals, id: ++_nextId, createdAt: new Date(), updatedAt: new Date() };
          insertIntoTable(table, row);
          return Promise.resolve([row]);
        }),
      })),
    })),

    update: vi.fn((table: symbol) => ({
      set: vi.fn((vals: any) => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => {
            const rows = resolveTable(table);
            const updated = rows.map((r: any) => ({ ...r, ...vals }));
            return Promise.resolve(updated.slice(0, 1));
          }),
        })),
      })),
    })),

    delete: vi.fn((table: symbol) => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
  };

  function resolveTable(table: symbol): any[] {
    const name = String(table);
    if (name.includes('users')) return _users;
    if (name.includes('sectors')) return _sectors;
    if (name.includes('cycles') || name.includes('budget_cycles')) return _cycles;
    if (name.includes('allocations')) return _allocations;
    if (name.includes('audit')) return _auditLogs;
    if (name.includes('revocations')) return _revocations;
    return [];
  }

  function insertIntoTable(table: symbol, row: any) {
    const name = String(table);
    if (name.includes('users')) _users.push(row);
    else if (name.includes('sectors')) _sectors.push(row);
    else if (name.includes('cycles') || name.includes('budget_cycles')) _cycles.push(row);
    else if (name.includes('allocations')) _allocations.push(row);
    else if (name.includes('audit')) _auditLogs.push(row);
    else if (name.includes('revocations')) _revocations.push(row);
  }

  const makeSymbol = (n: string) => {
    const s: any = Symbol(n);
    return s;
  };

  return {
    db,
    pool: { end: vi.fn() },
    usersTable: makeSymbol('users'),
    sectorsTable: makeSymbol('sectors'),
    budgetCyclesTable: makeSymbol('budget_cycles'),
    allocationsTable: makeSymbol('allocations'),
    auditLogsTable: makeSymbol('audit_logs'),
    revocationsTable: makeSymbol('revocations'),
    eq: vi.fn(() => ({})),
    and: vi.fn(() => ({})),
    or: vi.fn(() => ({})),
    inArray: vi.fn(() => ({})),
    isNull: vi.fn(() => ({})),
    gte: vi.fn(() => ({})),
    lte: vi.fn(() => ({})),
    desc: vi.fn(() => ({})),
    sql: Object.assign(vi.fn(() => ({})), { raw: vi.fn(() => ({})) }),
    ne: vi.fn(() => ({})),
  };
}
