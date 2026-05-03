-- ============================================================
--  TVET AUTHORITY BUDGET MONITOR — FULL SEED
--  Password = "password"  hash = sha256("password"+"budget_monitor_salt")
-- ============================================================

BEGIN;

-- 1. CLEAR (FK order)
TRUNCATE TABLE purchase_order_items, purchase_orders, revocations, allocations, sectors, budget_cycles, users RESTART IDENTITY CASCADE;

-- 2. USERS (sector_id patched later)
INSERT INTO users (name, email, password_hash, role, sector_id, is_active, created_at, updated_at) VALUES
  ('System Administrator',       'admin@tvetauthority.go.ke',   '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'super_admin',     NULL, true, NOW(), NOW()),
  ('Dr. James Kiprotich Mutai',  'dg@tvetauthority.go.ke',      '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ceo',             NULL, true, NOW(), NOW()),
  ('Dr. Grace Wanjiku Njoroge',  'principal@tonp.ac.ke',        '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('Mr. Samuel Omondi Otieno',   'principal@kibt.ac.ke',        '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('Mrs. Beatrice Cherop Sang',  'principal@rvist.ac.ke',       '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'ministry_head',   NULL, true, NOW(), NOW()),
  ('Eng. Peter Kamau Njeru',     'hod.engineering@tonp.ac.ke',  '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('Ms. Faith Akinyi Odhiambo',  'hod.business@tonp.ac.ke',    '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('Mr. Brian Kipchoge Rono',    'hod.ict@tonp.ac.ke',          '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('Dr. Lydia Muthoni Kariuki',  'hod.sciences@tonp.ac.ke',    '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('Ms. Alice Chepkemoi Koech',  'hod.engineering@kibt.ac.ke', '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('Mr. Dennis Otieno Ochieng',  'hod.commerce@rvist.ac.ke',   '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'department_head', NULL, true, NOW(), NOW()),
  ('Mr. Joseph Mwangi Gicheru',  'auditor@tvetauthority.go.ke', '9cb22b1717ab7084fd1731cc998f5451080807c85de33c24fe84ecf1ddcb791d', 'viewer',          NULL, true, NOW(), NOW());

-- 3. SECTORS
-- Depth 0
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at)
VALUES ('TVET Authority Budget Pool','TVET-ROOT',NULL,0,1,true,0,NOW(),NOW());

-- Depth 1
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('The Ollessos National Polytechnic',            'TONP', (SELECT id FROM sectors WHERE code='TVET-ROOT'),1,(SELECT id FROM users WHERE email='principal@tonp.ac.ke'), true,1,NOW(),NOW()),
('Kenya Institute of Business Training',         'KIBT', (SELECT id FROM sectors WHERE code='TVET-ROOT'),1,(SELECT id FROM users WHERE email='principal@kibt.ac.ke'), true,2,NOW(),NOW()),
('Rift Valley Institute of Science & Technology','RVIST',(SELECT id FROM sectors WHERE code='TVET-ROOT'),1,(SELECT id FROM users WHERE email='principal@rvist.ac.ke'),true,3,NOW(),NOW());

-- Depth 2 — TONP schools
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('School of Engineering & Technology', 'TONP-ENG',(SELECT id FROM sectors WHERE code='TONP'),2,(SELECT id FROM users WHERE email='hod.engineering@tonp.ac.ke'),true,1,NOW(),NOW()),
('School of Business & Management',    'TONP-BUS',(SELECT id FROM sectors WHERE code='TONP'),2,(SELECT id FROM users WHERE email='hod.business@tonp.ac.ke'),  true,2,NOW(),NOW()),
('School of ICT & Computing',          'TONP-ICT',(SELECT id FROM sectors WHERE code='TONP'),2,(SELECT id FROM users WHERE email='hod.ict@tonp.ac.ke'),        true,3,NOW(),NOW()),
('School of Applied Sciences & Health','TONP-SCI',(SELECT id FROM sectors WHERE code='TONP'),2,(SELECT id FROM users WHERE email='hod.sciences@tonp.ac.ke'),  true,4,NOW(),NOW());

-- Depth 2 — KIBT schools
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('School of Business Studies',          'KIBT-BUS',(SELECT id FROM sectors WHERE code='KIBT'),2,(SELECT id FROM users WHERE email='principal@kibt.ac.ke'),true,1,NOW(),NOW()),
('School of Secretarial & Office Mgmt', 'KIBT-SEC',(SELECT id FROM sectors WHERE code='KIBT'),2,NULL,                                                    true,2,NOW(),NOW());

-- Depth 2 — RVIST schools
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('School of Engineering',          'RVIST-ENG',(SELECT id FROM sectors WHERE code='RVIST'),2,(SELECT id FROM users WHERE email='hod.engineering@kibt.ac.ke'),true,1,NOW(),NOW()),
('School of Commerce & Business',  'RVIST-COM',(SELECT id FROM sectors WHERE code='RVIST'),2,(SELECT id FROM users WHERE email='hod.commerce@rvist.ac.ke'), true,2,NOW(),NOW());

-- Depth 3 — TONP-ENG depts
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('Electrical & Electronics Dept','TONP-ENG-EE',(SELECT id FROM sectors WHERE code='TONP-ENG'),3,NULL,true,1,NOW(),NOW()),
('Mechanical Engineering Dept',  'TONP-ENG-ME',(SELECT id FROM sectors WHERE code='TONP-ENG'),3,NULL,true,2,NOW(),NOW()),
('Civil & Building Engineering', 'TONP-ENG-CE',(SELECT id FROM sectors WHERE code='TONP-ENG'),3,NULL,true,3,NOW(),NOW());

-- Depth 3 — TONP-BUS depts
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('Accounting & Finance Dept',    'TONP-BUS-ACC',(SELECT id FROM sectors WHERE code='TONP-BUS'),3,NULL,true,1,NOW(),NOW()),
('Entrepreneurship & Marketing', 'TONP-BUS-ENT',(SELECT id FROM sectors WHERE code='TONP-BUS'),3,NULL,true,2,NOW(),NOW());

-- Depth 3 — TONP-ICT depts
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('Computer Science & IT Dept','TONP-ICT-CS', (SELECT id FROM sectors WHERE code='TONP-ICT'),3,NULL,true,1,NOW(),NOW()),
('Telecommunication Dept',    'TONP-ICT-TEL',(SELECT id FROM sectors WHERE code='TONP-ICT'),3,NULL,true,2,NOW(),NOW());

-- Depth 3 — TONP-SCI depts
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('Food Technology & Nutrition','TONP-SCI-FT', (SELECT id FROM sectors WHERE code='TONP-SCI'),3,NULL,true,1,NOW(),NOW()),
('Environmental Studies Dept', 'TONP-SCI-ENV',(SELECT id FROM sectors WHERE code='TONP-SCI'),3,NULL,true,2,NOW(),NOW());

-- Depth 3 — KIBT-BUS depts
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('Business Management Dept','KIBT-BUS-MGT',(SELECT id FROM sectors WHERE code='KIBT-BUS'),3,NULL,true,1,NOW(),NOW()),
('Sales & Marketing Dept',  'KIBT-BUS-MKT',(SELECT id FROM sectors WHERE code='KIBT-BUS'),3,NULL,true,2,NOW(),NOW());

-- Depth 3 — RVIST-ENG depts
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,created_at,updated_at) VALUES
('Electrical Engineering Dept','RVIST-ENG-EE',(SELECT id FROM sectors WHERE code='RVIST-ENG'),3,NULL,true,1,NOW(),NOW()),
('Automotive Engineering Dept','RVIST-ENG-AE',(SELECT id FROM sectors WHERE code='RVIST-ENG'),3,NULL,true,2,NOW(),NOW());

-- 4. PATCH user sector_id
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='TONP')      WHERE email='principal@tonp.ac.ke';
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='KIBT')      WHERE email='principal@kibt.ac.ke';
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='RVIST')     WHERE email='principal@rvist.ac.ke';
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='TONP-ENG')  WHERE email='hod.engineering@tonp.ac.ke';
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='TONP-BUS')  WHERE email='hod.business@tonp.ac.ke';
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='TONP-ICT')  WHERE email='hod.ict@tonp.ac.ke';
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='TONP-SCI')  WHERE email='hod.sciences@tonp.ac.ke';
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='KIBT-BUS')  WHERE email='hod.engineering@kibt.ac.ke';
UPDATE users SET sector_id=(SELECT id FROM sectors WHERE code='RVIST-COM') WHERE email='hod.commerce@rvist.ac.ke';

-- 5. BUDGET CYCLE
INSERT INTO budget_cycles (name,total_budget,start_date,end_date,is_active,created_by,created_at,updated_at)
VALUES ('TVET FY 2024/2025','1850000000.00','2024-07-01','2025-06-30',true,
        (SELECT id FROM users WHERE email='admin@tvetauthority.go.ke'),NOW(),NOW());

-- 6. ALLOCATIONS
-- Root → TONP
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TVET-ROOT'),(SELECT id FROM sectors WHERE code='TONP'),(SELECT id FROM users WHERE email='admin@tvetauthority.go.ke'),680000000,'Annual allocation — The Ollessos National Polytechnic','active',NOW()-interval'45 days',NOW(),NOW());

-- Root → KIBT
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TVET-ROOT'),(SELECT id FROM sectors WHERE code='KIBT'),(SELECT id FROM users WHERE email='admin@tvetauthority.go.ke'),450000000,'Annual allocation — Kenya Institute of Business Training','active',NOW()-interval'45 days',NOW(),NOW());

-- Root → RVIST
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TVET-ROOT'),(SELECT id FROM sectors WHERE code='RVIST'),(SELECT id FROM users WHERE email='admin@tvetauthority.go.ke'),520000000,'Annual allocation — Rift Valley Institute of Science & Technology','active',NOW()-interval'45 days',NOW(),NOW());

-- TONP → ENG
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP'),(SELECT id FROM sectors WHERE code='TONP-ENG'),(SELECT id FROM users WHERE email='principal@tonp.ac.ke'),250000000,'School of Engineering & Technology — recurrent + capital','active',NOW()-interval'40 days',NOW(),NOW());

-- TONP → BUS
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP'),(SELECT id FROM sectors WHERE code='TONP-BUS'),(SELECT id FROM users WHERE email='principal@tonp.ac.ke'),180000000,'School of Business & Management — recurrent budget','active',NOW()-interval'40 days',NOW(),NOW());

-- TONP → ICT
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP'),(SELECT id FROM sectors WHERE code='TONP-ICT'),(SELECT id FROM users WHERE email='principal@tonp.ac.ke'),150000000,'School of ICT & Computing — recurrent + infrastructure','active',NOW()-interval'40 days',NOW(),NOW());

-- TONP → SCI
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP'),(SELECT id FROM sectors WHERE code='TONP-SCI'),(SELECT id FROM users WHERE email='principal@tonp.ac.ke'),100000000,'School of Applied Sciences — recurrent budget','active',NOW()-interval'40 days',NOW(),NOW());

-- KIBT → BUS
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='KIBT'),(SELECT id FROM sectors WHERE code='KIBT-BUS'),(SELECT id FROM users WHERE email='principal@kibt.ac.ke'),250000000,'School of Business Studies — annual allocation','active',NOW()-interval'38 days',NOW(),NOW());

-- KIBT → SEC
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='KIBT'),(SELECT id FROM sectors WHERE code='KIBT-SEC'),(SELECT id FROM users WHERE email='principal@kibt.ac.ke'),200000000,'Secretarial & Office Admin — annual allocation','active',NOW()-interval'38 days',NOW(),NOW());

-- RVIST → ENG
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='RVIST'),(SELECT id FROM sectors WHERE code='RVIST-ENG'),(SELECT id FROM users WHERE email='principal@rvist.ac.ke'),280000000,'Engineering School — annual allocation','active',NOW()-interval'36 days',NOW(),NOW());

-- RVIST → COM
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='RVIST'),(SELECT id FROM sectors WHERE code='RVIST-COM'),(SELECT id FROM users WHERE email='principal@rvist.ac.ke'),240000000,'Commerce & Business — annual allocation','active',NOW()-interval'36 days',NOW(),NOW());

-- TONP-ENG → EE
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-ENG'),(SELECT id FROM sectors WHERE code='TONP-ENG-EE'),(SELECT id FROM users WHERE email='hod.engineering@tonp.ac.ke'),90000000,'Electrical & Electronics — lab equipment + staff costs','active',NOW()-interval'30 days',NOW(),NOW());

-- TONP-ENG → ME
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-ENG'),(SELECT id FROM sectors WHERE code='TONP-ENG-ME'),(SELECT id FROM users WHERE email='hod.engineering@tonp.ac.ke'),85000000,'Mechanical Engineering — workshop + consumables','active',NOW()-interval'30 days',NOW(),NOW());

-- TONP-ENG → CE
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-ENG'),(SELECT id FROM sectors WHERE code='TONP-ENG-CE'),(SELECT id FROM users WHERE email='hod.engineering@tonp.ac.ke'),75000000,'Civil & Building — materials + field activities','active',NOW()-interval'30 days',NOW(),NOW());

-- TONP-BUS → ACC
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-BUS'),(SELECT id FROM sectors WHERE code='TONP-BUS-ACC'),(SELECT id FROM users WHERE email='hod.business@tonp.ac.ke'),90000000,'Accounting & Finance — software licenses + staff training','active',NOW()-interval'28 days',NOW(),NOW());

-- TONP-BUS → ENT
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-BUS'),(SELECT id FROM sectors WHERE code='TONP-BUS-ENT'),(SELECT id FROM users WHERE email='hod.business@tonp.ac.ke'),90000000,'Entrepreneurship & Marketing — incubation hub + events','active',NOW()-interval'28 days',NOW(),NOW());

-- TONP-ICT → CS
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-ICT'),(SELECT id FROM sectors WHERE code='TONP-ICT-CS'),(SELECT id FROM users WHERE email='hod.ict@tonp.ac.ke'),80000000,'Computer Science & IT — server hardware + software licenses','active',NOW()-interval'25 days',NOW(),NOW());

-- TONP-ICT → TEL
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-ICT'),(SELECT id FROM sectors WHERE code='TONP-ICT-TEL'),(SELECT id FROM users WHERE email='hod.ict@tonp.ac.ke'),70000000,'Telecommunication — networking equipment + lab setup','active',NOW()-interval'25 days',NOW(),NOW());

-- TONP-SCI → FT
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-SCI'),(SELECT id FROM sectors WHERE code='TONP-SCI-FT'),(SELECT id FROM users WHERE email='hod.sciences@tonp.ac.ke'),55000000,'Food Technology — food processing lab + equipment','active',NOW()-interval'22 days',NOW(),NOW());

-- TONP-SCI → ENV
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='TONP-SCI'),(SELECT id FROM sectors WHERE code='TONP-SCI-ENV'),(SELECT id FROM users WHERE email='hod.sciences@tonp.ac.ke'),45000000,'Environmental Studies — field equipment + consumables','active',NOW()-interval'22 days',NOW(),NOW());

-- KIBT-BUS → MGT
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='KIBT-BUS'),(SELECT id FROM sectors WHERE code='KIBT-BUS-MGT'),(SELECT id FROM users WHERE email='principal@kibt.ac.ke'),130000000,'Business Management — staff costs + learning resources','active',NOW()-interval'20 days',NOW(),NOW());

-- KIBT-BUS → MKT
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='KIBT-BUS'),(SELECT id FROM sectors WHERE code='KIBT-BUS-MKT'),(SELECT id FROM users WHERE email='principal@kibt.ac.ke'),120000000,'Sales & Marketing — campaign materials + student attachments','active',NOW()-interval'20 days',NOW(),NOW());

-- RVIST-ENG → EE
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='RVIST-ENG'),(SELECT id FROM sectors WHERE code='RVIST-ENG-EE'),(SELECT id FROM users WHERE email='principal@rvist.ac.ke'),150000000,'Electrical Engineering — high-voltage lab + tools','active',NOW()-interval'18 days',NOW(),NOW());

-- RVIST-ENG → AE
INSERT INTO allocations (budget_cycle_id,from_sector_id,to_sector_id,allocated_by,amount,comment,status,allocated_at,created_at,updated_at)
VALUES((SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM sectors WHERE code='RVIST-ENG'),(SELECT id FROM sectors WHERE code='RVIST-ENG-AE'),(SELECT id FROM users WHERE email='principal@rvist.ac.ke'),130000000,'Automotive Engineering — vehicle workshop + simulators','active',NOW()-interval'18 days',NOW(),NOW());

-- 7. PURCHASE ORDERS

-- PO 1: DRAFT — ICT lab equipment (TONP-ICT)
INSERT INTO purchase_orders (sector_id,budget_cycle_id,created_by,status,notes,total_amount,created_at,updated_at)
VALUES((SELECT id FROM sectors WHERE code='TONP-ICT'),(SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM users WHERE email='hod.ict@tonp.ac.ke'),'draft','Q1 ICT lab — desktop computers and networking gear',0,NOW()-interval'10 days',NOW());

INSERT INTO purchase_order_items (order_id,product_id,quantity,unit_price_snapshot,line_total,created_at)
SELECT (SELECT MAX(id) FROM purchase_orders),p.id,20,p.unit_price,(20*p.unit_price::numeric),NOW()
FROM products p WHERE p.category='ICT Equipment' LIMIT 1;

INSERT INTO purchase_order_items (order_id,product_id,quantity,unit_price_snapshot,line_total,created_at)
SELECT (SELECT MAX(id) FROM purchase_orders),p.id,5,p.unit_price,(5*p.unit_price::numeric),NOW()
FROM products p WHERE p.category='ICT Equipment' LIMIT 1 OFFSET 1;

UPDATE purchase_orders SET total_amount=(SELECT COALESCE(SUM(line_total),0) FROM purchase_order_items WHERE order_id=(SELECT MAX(id) FROM purchase_orders)) WHERE id=(SELECT MAX(id) FROM purchase_orders);

-- PO 2: SUBMITTED — Office supplies (TONP-BUS)
INSERT INTO purchase_orders (sector_id,budget_cycle_id,created_by,status,notes,total_amount,submitted_at,created_at,updated_at)
VALUES((SELECT id FROM sectors WHERE code='TONP-BUS'),(SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM users WHERE email='hod.business@tonp.ac.ke'),'submitted','Office stationery and printer consumables for Q1',0,NOW()-interval'5 days',NOW()-interval'8 days',NOW());

INSERT INTO purchase_order_items (order_id,product_id,quantity,unit_price_snapshot,line_total,created_at)
SELECT (SELECT MAX(id) FROM purchase_orders),p.id,100,p.unit_price,(100*p.unit_price::numeric),NOW()
FROM products p WHERE p.category='Office Supplies' LIMIT 1;

INSERT INTO purchase_order_items (order_id,product_id,quantity,unit_price_snapshot,line_total,created_at)
SELECT (SELECT MAX(id) FROM purchase_orders),p.id,20,p.unit_price,(20*p.unit_price::numeric),NOW()
FROM products p WHERE p.category='Office Supplies' LIMIT 1 OFFSET 1;

UPDATE purchase_orders SET total_amount=(SELECT COALESCE(SUM(line_total),0) FROM purchase_order_items WHERE order_id=(SELECT MAX(id) FROM purchase_orders)) WHERE id=(SELECT MAX(id) FROM purchase_orders);

-- PO 3: APPROVED — Building materials (RVIST-ENG)
INSERT INTO purchase_orders (sector_id,budget_cycle_id,created_by,status,notes,total_amount,submitted_at,reviewed_at,reviewed_by,created_at,updated_at)
VALUES((SELECT id FROM sectors WHERE code='RVIST-ENG'),(SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM users WHERE email='principal@rvist.ac.ke'),'approved','Workshop expansion — structural and finishing materials',0,NOW()-interval'15 days',NOW()-interval'12 days',(SELECT id FROM users WHERE email='dg@tvetauthority.go.ke'),NOW()-interval'18 days',NOW());

INSERT INTO purchase_order_items (order_id,product_id,quantity,unit_price_snapshot,line_total,created_at)
SELECT (SELECT MAX(id) FROM purchase_orders),p.id,200,p.unit_price,(200*p.unit_price::numeric),NOW()
FROM products p WHERE p.category='Building Materials' LIMIT 1;

INSERT INTO purchase_order_items (order_id,product_id,quantity,unit_price_snapshot,line_total,created_at)
SELECT (SELECT MAX(id) FROM purchase_orders),p.id,150,p.unit_price,(150*p.unit_price::numeric),NOW()
FROM products p WHERE p.category='Building Materials' LIMIT 1 OFFSET 1;

UPDATE purchase_orders SET total_amount=(SELECT COALESCE(SUM(line_total),0) FROM purchase_order_items WHERE order_id=(SELECT MAX(id) FROM purchase_orders)) WHERE id=(SELECT MAX(id) FROM purchase_orders);

-- PO 4: DRAFT — Furniture (TONP-ENG)
INSERT INTO purchase_orders (sector_id,budget_cycle_id,created_by,status,notes,total_amount,created_at,updated_at)
VALUES((SELECT id FROM sectors WHERE code='TONP-ENG'),(SELECT id FROM budget_cycles WHERE name='TVET FY 2024/2025'),(SELECT id FROM users WHERE email='hod.engineering@tonp.ac.ke'),'draft','Workshop benches and storage for Mechanical Engineering lab',0,NOW()-interval'3 days',NOW());

INSERT INTO purchase_order_items (order_id,product_id,quantity,unit_price_snapshot,line_total,created_at)
SELECT (SELECT MAX(id) FROM purchase_orders),p.id,30,p.unit_price,(30*p.unit_price::numeric),NOW()
FROM products p WHERE p.category='Furniture' LIMIT 1;

UPDATE purchase_orders SET total_amount=(SELECT COALESCE(SUM(line_total),0) FROM purchase_order_items WHERE order_id=(SELECT MAX(id) FROM purchase_orders)) WHERE id=(SELECT MAX(id) FROM purchase_orders);

COMMIT;

-- Verify counts
SELECT 'users' AS entity, COUNT(*) AS count FROM users
UNION ALL SELECT 'sectors', COUNT(*) FROM sectors
UNION ALL SELECT 'budget_cycles', COUNT(*) FROM budget_cycles
UNION ALL SELECT 'allocations', COUNT(*) FROM allocations
UNION ALL SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL SELECT 'po_items', COUNT(*) FROM purchase_order_items;
