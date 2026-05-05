-- ============================================================
--  KENYA NATIONAL BUDGET MONITOR — SEED 01: USERS
--  Password = "password"  hash = sha256("password"+"budget_monitor_salt")
-- ============================================================

BEGIN;

TRUNCATE TABLE purchase_order_items, purchase_orders, revocations, allocations,
  audit_logs, approval_limits, sector_controls, products, sectors, budget_cycles, users
  RESTART IDENTITY CASCADE;

-- password hash for "password"
-- sha256("password" + "budget_monitor_salt") = 9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d

INSERT INTO users (name, email, password_hash, role, sector_id, is_active, created_at, updated_at) VALUES
  -- Super Admin
  ('System Administrator',         'admin@budget.go.ke',          '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'super_admin',     NULL, true, NOW(), NOW()),

  -- National CEO (President / CS Treasury)
  ('Hon. Njuguna Ndung''u',        'cs.treasury@budget.go.ke',    '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ceo',             NULL, true, NOW(), NOW()),

  -- Ministry Heads (Cabinet Secretaries)
  ('CS Education',                 'cs.education@budget.go.ke',   '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('CS Health',                    'cs.health@budget.go.ke',      '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('CS Defence',                   'cs.defence@budget.go.ke',     '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('CS Infrastructure',            'cs.infra@budget.go.ke',       '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('CS Agriculture',               'cs.agri@budget.go.ke',        '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('CS Interior',                  'cs.interior@budget.go.ke',    '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('CS ICT',                       'cs.ict@budget.go.ke',         '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('CS Energy',                    'cs.energy@budget.go.ke',      '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),

  -- Department Heads (State Departments under Education)
  ('PS Basic Education',           'ps.basic@education.go.ke',    '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('PS TVET',                      'ps.tvet@education.go.ke',     '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('PS Higher Education',          'ps.higher@education.go.ke',   '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),

  -- Department Heads (State Departments under Health)
  ('PS Preventive Health',         'ps.preventive@health.go.ke',  '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('PS Curative Health',           'ps.curative@health.go.ke',    '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),

  -- Department Heads (Infrastructure)
  ('PS Roads',                     'ps.roads@infra.go.ke',        '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('PS Housing',                   'ps.housing@infra.go.ke',      '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),

  -- TVET institutions
  ('Principal TONP',               'principal@tonp.ac.ke',        '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('Principal KIBT',               'principal@kibt.ac.ke',        '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('Principal RVIST',              'principal@rvist.ac.ke',       '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),

  -- Viewers / Auditors
  ('National Auditor',             'auditor@budget.go.ke',        '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'viewer',          NULL, true, NOW(), NOW());

COMMIT;
