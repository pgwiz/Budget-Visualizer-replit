-- ============================================================
--  KENYA NATIONAL BUDGET MONITOR — SEED 03: BUDGET CYCLE & ALLOCATIONS
--  FY 2025/2026 — Total Budget: KES 1,000,000,000,000 (1 Trillion)
-- ============================================================

BEGIN;

-- ─── Budget Cycle ─────────────────────────────────────────────────────
INSERT INTO budget_cycles (name, total_budget, start_date, end_date, is_active, created_by, created_at, updated_at)
VALUES (
  'FY 2025/2026',
  '1000000000000',
  '2025-07-01',
  '2026-06-30',
  true,
  (SELECT id FROM users WHERE email='admin@budget.go.ke'),
  NOW(), NOW()
);

-- ─── LEVEL 1 ALLOCATIONS: National → Ministries ─────────────────────
-- Total: ~1T allocated across 8 ministries

INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
-- Education: KES 250B (25%)
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='KE-NATIONAL'),
 (SELECT id FROM sectors WHERE code='MOE'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 '250000000000', 'Education sector allocation FY 2025/2026', 'active', NOW(), NOW(), NOW()),

-- Health: KES 180B (18%)
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='KE-NATIONAL'),
 (SELECT id FROM sectors WHERE code='MOH'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 '180000000000', 'Health sector allocation FY 2025/2026', 'active', NOW(), NOW(), NOW()),

-- Defence: KES 120B (12%)
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='KE-NATIONAL'),
 (SELECT id FROM sectors WHERE code='MOD'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 '120000000000', 'Defence sector allocation FY 2025/2026', 'active', NOW(), NOW(), NOW()),

-- Infrastructure: KES 150B (15%)
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='KE-NATIONAL'),
 (SELECT id FROM sectors WHERE code='MOI'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 '150000000000', 'Infrastructure allocation FY 2025/2026', 'active', NOW(), NOW(), NOW()),

-- Agriculture: KES 80B (8%)
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='KE-NATIONAL'),
 (SELECT id FROM sectors WHERE code='MOA'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 '80000000000', 'Agriculture allocation FY 2025/2026', 'active', NOW(), NOW(), NOW()),

-- Interior & Security: KES 100B (10%)
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='KE-NATIONAL'),
 (SELECT id FROM sectors WHERE code='MOIS'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 '100000000000', 'Interior & Security allocation FY 2025/2026', 'active', NOW(), NOW(), NOW()),

-- ICT: KES 50B (5%)
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='KE-NATIONAL'),
 (SELECT id FROM sectors WHERE code='MOICT'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 '50000000000', 'ICT & Innovation allocation FY 2025/2026', 'active', NOW(), NOW(), NOW()),

-- Energy: KES 70B (7%)
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='KE-NATIONAL'),
 (SELECT id FROM sectors WHERE code='MOEN'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 '70000000000', 'Energy sector allocation FY 2025/2026', 'active', NOW(), NOW(), NOW());

-- ─── LEVEL 2 ALLOCATIONS: Ministry → State Departments ──────────────

-- Education → State Departments (250B total)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE'),
 (SELECT id FROM sectors WHERE code='MOE-BASIC'),
 (SELECT id FROM users WHERE email='cs.education@budget.go.ke'),
 '120000000000', 'Basic Education allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE'),
 (SELECT id FROM sectors WHERE code='MOE-TVET'),
 (SELECT id FROM users WHERE email='cs.education@budget.go.ke'),
 '50000000000', 'TVET Authority allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE'),
 (SELECT id FROM sectors WHERE code='MOE-HIGHER'),
 (SELECT id FROM users WHERE email='cs.education@budget.go.ke'),
 '80000000000', 'Higher Education allocation', 'active', NOW(), NOW(), NOW());

-- Health → State Departments (180B total)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOH'),
 (SELECT id FROM sectors WHERE code='MOH-PREV'),
 (SELECT id FROM users WHERE email='cs.health@budget.go.ke'),
 '80000000000', 'Preventive Health allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOH'),
 (SELECT id FROM sectors WHERE code='MOH-CUR'),
 (SELECT id FROM users WHERE email='cs.health@budget.go.ke'),
 '100000000000', 'Curative Health allocation', 'active', NOW(), NOW(), NOW());

-- Infrastructure → State Departments (150B total)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOI'),
 (SELECT id FROM sectors WHERE code='MOI-ROADS'),
 (SELECT id FROM users WHERE email='cs.infra@budget.go.ke'),
 '100000000000', 'Roads infrastructure allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOI'),
 (SELECT id FROM sectors WHERE code='MOI-HOUSING'),
 (SELECT id FROM users WHERE email='cs.infra@budget.go.ke'),
 '50000000000', 'Housing & Urban allocation', 'active', NOW(), NOW(), NOW());

-- Agriculture → Sub-departments (80B total)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOA'),
 (SELECT id FROM sectors WHERE code='MOA-CROPS'),
 (SELECT id FROM users WHERE email='cs.agri@budget.go.ke'),
 '35000000000', 'Crop Development allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOA'),
 (SELECT id FROM sectors WHERE code='MOA-LIVE'),
 (SELECT id FROM users WHERE email='cs.agri@budget.go.ke'),
 '25000000000', 'Livestock Development allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOA'),
 (SELECT id FROM sectors WHERE code='MOA-FISH'),
 (SELECT id FROM users WHERE email='cs.agri@budget.go.ke'),
 '20000000000', 'Fisheries & Blue Economy allocation', 'active', NOW(), NOW(), NOW());

-- Interior → Sub-departments (100B total)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOIS'),
 (SELECT id FROM sectors WHERE code='MOIS-NPS'),
 (SELECT id FROM users WHERE email='cs.interior@budget.go.ke'),
 '50000000000', 'National Police Service allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOIS'),
 (SELECT id FROM sectors WHERE code='MOIS-IMM'),
 (SELECT id FROM users WHERE email='cs.interior@budget.go.ke'),
 '20000000000', 'Immigration & Registration allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOIS'),
 (SELECT id FROM sectors WHERE code='MOIS-KPS'),
 (SELECT id FROM users WHERE email='cs.interior@budget.go.ke'),
 '30000000000', 'Kenya Prisons Service allocation', 'active', NOW(), NOW(), NOW());

-- Defence → Branches (120B total)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOD'),
 (SELECT id FROM sectors WHERE code='MOD-ARMY'),
 (SELECT id FROM users WHERE email='cs.defence@budget.go.ke'),
 '60000000000', 'Kenya Army allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOD'),
 (SELECT id FROM sectors WHERE code='MOD-KAF'),
 (SELECT id FROM users WHERE email='cs.defence@budget.go.ke'),
 '35000000000', 'Kenya Air Force allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOD'),
 (SELECT id FROM sectors WHERE code='MOD-NAVY'),
 (SELECT id FROM users WHERE email='cs.defence@budget.go.ke'),
 '25000000000', 'Kenya Navy allocation', 'active', NOW(), NOW(), NOW());

-- ─── LEVEL 3 ALLOCATIONS: State Dept → Institutions ─────────────────

-- TVET → Institutions (50B total)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE-TVET'),
 (SELECT id FROM sectors WHERE code='TVET-TONP'),
 (SELECT id FROM users WHERE email='ps.tvet@education.go.ke'),
 '18000000000', 'TONP operational allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE-TVET'),
 (SELECT id FROM sectors WHERE code='TVET-KIBT'),
 (SELECT id FROM users WHERE email='ps.tvet@education.go.ke'),
 '14000000000', 'KIBT operational allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE-TVET'),
 (SELECT id FROM sectors WHERE code='TVET-RVIST'),
 (SELECT id FROM users WHERE email='ps.tvet@education.go.ke'),
 '15000000000', 'RVIST operational allocation', 'active', NOW(), NOW(), NOW());

-- Higher Education → Universities (80B total, 60B allocated)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE-HIGHER'),
 (SELECT id FROM sectors WHERE code='HE-UON'),
 (SELECT id FROM users WHERE email='ps.higher@education.go.ke'),
 '25000000000', 'University of Nairobi allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE-HIGHER'),
 (SELECT id FROM sectors WHERE code='HE-KU'),
 (SELECT id FROM users WHERE email='ps.higher@education.go.ke'),
 '20000000000', 'Kenyatta University allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOE-HIGHER'),
 (SELECT id FROM sectors WHERE code='HE-MU'),
 (SELECT id FROM users WHERE email='ps.higher@education.go.ke'),
 '15000000000', 'Moi University allocation', 'active', NOW(), NOW(), NOW());

-- Curative Health → Hospitals (100B total, 40B allocated)
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOH-CUR'),
 (SELECT id FROM sectors WHERE code='MOH-KNH'),
 (SELECT id FROM users WHERE email='ps.curative@health.go.ke'),
 '25000000000', 'KNH operational allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='MOH-CUR'),
 (SELECT id FROM sectors WHERE code='MOH-MTRH'),
 (SELECT id FROM users WHERE email='ps.curative@health.go.ke'),
 '15000000000', 'MTRH operational allocation', 'active', NOW(), NOW(), NOW());

-- ─── LEVEL 4 ALLOCATIONS: TONP → Schools (18B total) ────────────────
INSERT INTO allocations (budget_cycle_id, from_sector_id, to_sector_id, allocated_by, amount, comment, status, allocated_at, created_at, updated_at) VALUES
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='TVET-TONP'),
 (SELECT id FROM sectors WHERE code='TONP-ENG'),
 (SELECT id FROM users WHERE email='principal@tonp.ac.ke'),
 '5500000000', 'Engineering School allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='TVET-TONP'),
 (SELECT id FROM sectors WHERE code='TONP-BUS'),
 (SELECT id FROM users WHERE email='principal@tonp.ac.ke'),
 '4000000000', 'Business School allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='TVET-TONP'),
 (SELECT id FROM sectors WHERE code='TONP-ICT'),
 (SELECT id FROM users WHERE email='principal@tonp.ac.ke'),
 '4500000000', 'ICT School allocation', 'active', NOW(), NOW(), NOW()),
((SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 (SELECT id FROM sectors WHERE code='TVET-TONP'),
 (SELECT id FROM sectors WHERE code='TONP-SCI'),
 (SELECT id FROM users WHERE email='principal@tonp.ac.ke'),
 '3000000000', 'Applied Sciences allocation', 'active', NOW(), NOW(), NOW());

COMMIT;
