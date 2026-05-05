-- ============================================================
--  KENYA NATIONAL BUDGET MONITOR — SEED 02: SECTORS (HIERARCHY)
--  National → Ministries → State Departments → Agencies/Institutions
-- ============================================================

BEGIN;

-- ─── DEPTH 0: National Pool ──────────────────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at)
VALUES ('Republic of Kenya National Budget','KE-NATIONAL',NULL,0,
  (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),true,0,2,NOW(),NOW());

-- ─── DEPTH 1: Ministries ─────────────────────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('Ministry of Education',           'MOE',
  (SELECT id FROM sectors WHERE code='KE-NATIONAL'),1,
  (SELECT id FROM users WHERE email='cs.education@budget.go.ke'),true,1,2,NOW(),NOW()),
('Ministry of Health',              'MOH',
  (SELECT id FROM sectors WHERE code='KE-NATIONAL'),1,
  (SELECT id FROM users WHERE email='cs.health@budget.go.ke'),true,2,2,NOW(),NOW()),
('Ministry of Defence',             'MOD',
  (SELECT id FROM sectors WHERE code='KE-NATIONAL'),1,
  (SELECT id FROM users WHERE email='cs.defence@budget.go.ke'),true,3,1,NOW(),NOW()),
('Ministry of Infrastructure',      'MOI',
  (SELECT id FROM sectors WHERE code='KE-NATIONAL'),1,
  (SELECT id FROM users WHERE email='cs.infra@budget.go.ke'),true,4,2,NOW(),NOW()),
('Ministry of Agriculture',         'MOA',
  (SELECT id FROM sectors WHERE code='KE-NATIONAL'),1,
  (SELECT id FROM users WHERE email='cs.agri@budget.go.ke'),true,5,1,NOW(),NOW()),
('Ministry of Interior & Security', 'MOIS',
  (SELECT id FROM sectors WHERE code='KE-NATIONAL'),1,
  (SELECT id FROM users WHERE email='cs.interior@budget.go.ke'),true,6,1,NOW(),NOW()),
('Ministry of ICT & Innovation',    'MOICT',
  (SELECT id FROM sectors WHERE code='KE-NATIONAL'),1,
  (SELECT id FROM users WHERE email='cs.ict@budget.go.ke'),true,7,1,NOW(),NOW()),
('Ministry of Energy',              'MOEN',
  (SELECT id FROM sectors WHERE code='KE-NATIONAL'),1,
  (SELECT id FROM users WHERE email='cs.energy@budget.go.ke'),true,8,1,NOW(),NOW());

-- ─── DEPTH 2: State Departments (Education) ─────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('Basic Education',                 'MOE-BASIC',
  (SELECT id FROM sectors WHERE code='MOE'),2,
  (SELECT id FROM users WHERE email='ps.basic@education.go.ke'),true,1,1,NOW(),NOW()),
('TVET Authority',                  'MOE-TVET',
  (SELECT id FROM sectors WHERE code='MOE'),2,
  (SELECT id FROM users WHERE email='ps.tvet@education.go.ke'),true,2,2,NOW(),NOW()),
('Higher Education',                'MOE-HIGHER',
  (SELECT id FROM sectors WHERE code='MOE'),2,
  (SELECT id FROM users WHERE email='ps.higher@education.go.ke'),true,3,1,NOW(),NOW());

-- ─── DEPTH 2: State Departments (Health) ─────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('Preventive & Promotive Health',   'MOH-PREV',
  (SELECT id FROM sectors WHERE code='MOH'),2,
  (SELECT id FROM users WHERE email='ps.preventive@health.go.ke'),true,1,1,NOW(),NOW()),
('Curative & Rehabilitative Health','MOH-CUR',
  (SELECT id FROM sectors WHERE code='MOH'),2,
  (SELECT id FROM users WHERE email='ps.curative@health.go.ke'),true,2,1,NOW(),NOW());

-- ─── DEPTH 2: State Departments (Infrastructure) ────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('State Dept of Roads',             'MOI-ROADS',
  (SELECT id FROM sectors WHERE code='MOI'),2,
  (SELECT id FROM users WHERE email='ps.roads@infra.go.ke'),true,1,1,NOW(),NOW()),
('State Dept of Housing & Urban',   'MOI-HOUSING',
  (SELECT id FROM sectors WHERE code='MOI'),2,
  (SELECT id FROM users WHERE email='ps.housing@infra.go.ke'),true,2,1,NOW(),NOW());

-- ─── DEPTH 2: Agriculture sub-departments ───────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('Crop Development',                'MOA-CROPS',
  (SELECT id FROM sectors WHERE code='MOA'),2,NULL,true,1,1,NOW(),NOW()),
('Livestock Development',           'MOA-LIVE',
  (SELECT id FROM sectors WHERE code='MOA'),2,NULL,true,2,1,NOW(),NOW()),
('Fisheries & Blue Economy',        'MOA-FISH',
  (SELECT id FROM sectors WHERE code='MOA'),2,NULL,true,3,1,NOW(),NOW());

-- ─── DEPTH 2: Interior sub-departments ──────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('National Police Service',         'MOIS-NPS',
  (SELECT id FROM sectors WHERE code='MOIS'),2,NULL,true,1,1,NOW(),NOW()),
('Immigration & Registration',      'MOIS-IMM',
  (SELECT id FROM sectors WHERE code='MOIS'),2,NULL,true,2,1,NOW(),NOW()),
('Kenya Prisons Service',           'MOIS-KPS',
  (SELECT id FROM sectors WHERE code='MOIS'),2,NULL,true,3,1,NOW(),NOW());

-- ─── DEPTH 2: ICT sub-departments ──────────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('ICT & Digital Economy',           'MOICT-DIGITAL',
  (SELECT id FROM sectors WHERE code='MOICT'),2,NULL,true,1,1,NOW(),NOW()),
('Broadcasting & Telecommunications','MOICT-TELCO',
  (SELECT id FROM sectors WHERE code='MOICT'),2,NULL,true,2,1,NOW(),NOW());

-- ─── DEPTH 2: Energy sub-departments ───────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('Renewable Energy',                'MOEN-RENEW',
  (SELECT id FROM sectors WHERE code='MOEN'),2,NULL,true,1,1,NOW(),NOW()),
('Petroleum & Mining',              'MOEN-PETRO',
  (SELECT id FROM sectors WHERE code='MOEN'),2,NULL,true,2,1,NOW(),NOW());

-- ─── DEPTH 3: TVET Institutions ─────────────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('The Ollessos National Polytechnic','TVET-TONP',
  (SELECT id FROM sectors WHERE code='MOE-TVET'),3,
  (SELECT id FROM users WHERE email='principal@tonp.ac.ke'),true,1,1,NOW(),NOW()),
('Kenya Institute of Business Training','TVET-KIBT',
  (SELECT id FROM sectors WHERE code='MOE-TVET'),3,
  (SELECT id FROM users WHERE email='principal@kibt.ac.ke'),true,2,1,NOW(),NOW()),
('Rift Valley Institute of Science & Technology','TVET-RVIST',
  (SELECT id FROM sectors WHERE code='MOE-TVET'),3,
  (SELECT id FROM users WHERE email='principal@rvist.ac.ke'),true,3,1,NOW(),NOW());

-- ─── DEPTH 3: Universities under Higher Education ───────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('University of Nairobi',           'HE-UON',
  (SELECT id FROM sectors WHERE code='MOE-HIGHER'),3,NULL,true,1,1,NOW(),NOW()),
('Kenyatta University',             'HE-KU',
  (SELECT id FROM sectors WHERE code='MOE-HIGHER'),3,NULL,true,2,1,NOW(),NOW()),
('Moi University',                  'HE-MU',
  (SELECT id FROM sectors WHERE code='MOE-HIGHER'),3,NULL,true,3,1,NOW(),NOW());

-- ─── DEPTH 3: Health facilities ─────────────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('Kenyatta National Hospital',      'MOH-KNH',
  (SELECT id FROM sectors WHERE code='MOH-CUR'),3,NULL,true,1,1,NOW(),NOW()),
('Moi Teaching & Referral Hospital','MOH-MTRH',
  (SELECT id FROM sectors WHERE code='MOH-CUR'),3,NULL,true,2,1,NOW(),NOW());

-- ─── DEPTH 3: Defence branches ──────────────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('Kenya Army',                      'MOD-ARMY',
  (SELECT id FROM sectors WHERE code='MOD'),2,NULL,true,1,1,NOW(),NOW()),
('Kenya Air Force',                 'MOD-KAF',
  (SELECT id FROM sectors WHERE code='MOD'),2,NULL,true,2,1,NOW(),NOW()),
('Kenya Navy',                      'MOD-NAVY',
  (SELECT id FROM sectors WHERE code='MOD'),2,NULL,true,3,1,NOW(),NOW());

-- ─── DEPTH 4: TONP Schools ─────────────────────────────────────────
INSERT INTO sectors (name,code,parent_id,depth,responsible_user_id,is_active,sort_order,max_depth_visible,created_at,updated_at) VALUES
('School of Engineering',           'TONP-ENG',
  (SELECT id FROM sectors WHERE code='TVET-TONP'),4,NULL,true,1,1,NOW(),NOW()),
('School of Business',              'TONP-BUS',
  (SELECT id FROM sectors WHERE code='TVET-TONP'),4,NULL,true,2,1,NOW(),NOW()),
('School of ICT',                   'TONP-ICT',
  (SELECT id FROM sectors WHERE code='TVET-TONP'),4,NULL,true,3,1,NOW(),NOW()),
('School of Applied Sciences',      'TONP-SCI',
  (SELECT id FROM sectors WHERE code='TVET-TONP'),4,NULL,true,4,1,NOW(),NOW());

-- Patch user sector_ids after sectors exist
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='KE-NATIONAL') WHERE email='cs.treasury@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOE') WHERE email='cs.education@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOH') WHERE email='cs.health@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOD') WHERE email='cs.defence@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOI') WHERE email='cs.infra@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOA') WHERE email='cs.agri@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOIS') WHERE email='cs.interior@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOICT') WHERE email='cs.ict@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOEN') WHERE email='cs.energy@budget.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOE-BASIC') WHERE email='ps.basic@education.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOE-TVET') WHERE email='ps.tvet@education.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOE-HIGHER') WHERE email='ps.higher@education.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOH-PREV') WHERE email='ps.preventive@health.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOH-CUR') WHERE email='ps.curative@health.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOI-ROADS') WHERE email='ps.roads@infra.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='MOI-HOUSING') WHERE email='ps.housing@infra.go.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='TVET-TONP') WHERE email='principal@tonp.ac.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='TVET-KIBT') WHERE email='principal@kibt.ac.ke';
UPDATE users SET sector_id = (SELECT id FROM sectors WHERE code='TVET-RVIST') WHERE email='principal@rvist.ac.ke';

COMMIT;
