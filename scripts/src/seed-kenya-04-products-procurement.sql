-- ============================================================
--  KENYA NATIONAL BUDGET MONITOR — SEED 04: PRODUCTS & SAMPLE PROCUREMENT
-- ============================================================

BEGIN;

-- ─── Products (common procurement items) ────────────────────────────
INSERT INTO products (name, category, description, unit_price, is_active, created_at, updated_at) VALUES
('Desktop Computer',           'ICT Equipment',        'Standard desktop workstation',        '85000.00',   true, NOW(), NOW()),
('Laptop Computer',            'ICT Equipment',        'Standard laptop for field officers',  '120000.00',  true, NOW(), NOW()),
('Office Printer',             'ICT Equipment',        'Multi-function network printer',      '65000.00',   true, NOW(), NOW()),
('Textbooks (Primary)',        'Educational Materials','Pack of 50 primary school textbooks', '25000.00',   true, NOW(), NOW()),
('Textbooks (Secondary)',      'Educational Materials','Pack of 50 secondary textbooks',      '35000.00',   true, NOW(), NOW()),
('Laboratory Equipment Set',   'Educational Materials','Basic science lab kit',                '450000.00',  true, NOW(), NOW()),
('Office Desk',                'Furniture',            'Standard office desk',                '18000.00',   true, NOW(), NOW()),
('Office Chair',               'Furniture',            'Ergonomic office chair',              '12000.00',   true, NOW(), NOW()),
('Filing Cabinet',             'Furniture',            '4-drawer filing cabinet',             '15000.00',   true, NOW(), NOW()),
('Medical Supplies Kit',       'Healthcare',           'Basic medical supplies package',      '200000.00',  true, NOW(), NOW()),
('Ambulance Vehicle',          'Healthcare',           'Fully equipped ambulance',            '8500000.00', true, NOW(), NOW()),
('Hospital Bed',               'Healthcare',           'Standard hospital bed with mattress', '45000.00',   true, NOW(), NOW()),
('Road Construction (per km)', 'Infrastructure',       'Standard tarmac road per km',         '50000000.00',true, NOW(), NOW()),
('Security Uniform Set',       'Uniforms',             'Complete police/prison uniform',      '8500.00',    true, NOW(), NOW()),
('Vehicle (SUV)',              'Vehicles',             'Standard government SUV',             '6500000.00', true, NOW(), NOW()),
('Fuel Allocation (monthly)',  'Operations',           'Monthly fuel per vehicle',            '35000.00',   true, NOW(), NOW()),
('Stationery Pack',            'Office Supplies',      'Monthly stationery supplies',         '5000.00',    true, NOW(), NOW()),
('Server Equipment',           'ICT Equipment',        'Rack server with storage',            '1200000.00', true, NOW(), NOW()),
('Solar Panel Set',            'Energy',               '5kW solar installation kit',          '850000.00',  true, NOW(), NOW()),
('Agricultural Equipment',     'Agriculture',          'Tractor & implements set',            '4500000.00', true, NOW(), NOW());

-- ─── Sample Purchase Orders ──────────────────────────────────────────
-- A few approved POs to show utilization

INSERT INTO purchase_orders (sector_id, budget_cycle_id, total_amount, status, requested_by, approved_by, description, created_at, updated_at) VALUES
-- TONP-ENG: laptops for engineering lab
((SELECT id FROM sectors WHERE code='TONP-ENG'),
 (SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 '6000000', 'approved',
 (SELECT id FROM users WHERE email='principal@tonp.ac.ke'),
 (SELECT id FROM users WHERE email='ps.tvet@education.go.ke'),
 'Engineering lab laptops (50 units)', NOW(), NOW()),

-- KNH: medical supplies
((SELECT id FROM sectors WHERE code='MOH-KNH'),
 (SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 '10000000', 'approved',
 (SELECT id FROM users WHERE email='ps.curative@health.go.ke'),
 (SELECT id FROM users WHERE email='cs.health@budget.go.ke'),
 'Monthly medical supplies replenishment', NOW(), NOW()),

-- MOI-ROADS: road construction
((SELECT id FROM sectors WHERE code='MOI-ROADS'),
 (SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 '500000000', 'approved',
 (SELECT id FROM users WHERE email='ps.roads@infra.go.ke'),
 (SELECT id FROM users WHERE email='cs.infra@budget.go.ke'),
 'Nairobi-Thika Highway expansion (10km)', NOW(), NOW()),

-- MOIS-NPS: uniforms
((SELECT id FROM sectors WHERE code='MOIS-NPS'),
 (SELECT id FROM budget_cycles WHERE name='FY 2025/2026'),
 '85000000', 'approved',
 (SELECT id FROM users WHERE email='cs.interior@budget.go.ke'),
 (SELECT id FROM users WHERE email='cs.treasury@budget.go.ke'),
 'Annual police uniform procurement (10,000 sets)', NOW(), NOW());

COMMIT;
