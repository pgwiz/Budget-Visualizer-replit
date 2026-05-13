-- ============================================================
--  KENYA NATIONAL BUDGET MONITOR — SEED 04: PRODUCTS
-- ============================================================

BEGIN;

-- ── Products (common government procurement items) ───────────────────────────
INSERT INTO products (name, category, unit, description, unit_price, is_active, created_at, updated_at) VALUES
('Desktop Computer',           'ICT Equipment',        'unit',  'Standard desktop workstation',        '85000.00',    true, NOW(), NOW()),
('Laptop Computer',            'ICT Equipment',        'unit',  'Standard laptop for field officers',  '120000.00',   true, NOW(), NOW()),
('Office Printer',             'ICT Equipment',        'unit',  'Multi-function network printer',      '65000.00',    true, NOW(), NOW()),
('Textbooks (Primary)',        'Educational Materials','pack',  'Pack of 50 primary school textbooks', '25000.00',    true, NOW(), NOW()),
('Textbooks (Secondary)',      'Educational Materials','pack',  'Pack of 50 secondary textbooks',      '35000.00',    true, NOW(), NOW()),
('Laboratory Equipment Set',   'Educational Materials','set',   'Basic science lab kit',               '450000.00',   true, NOW(), NOW()),
('Office Desk',                'Furniture',            'unit',  'Standard office desk',                '18000.00',    true, NOW(), NOW()),
('Office Chair',               'Furniture',            'unit',  'Ergonomic office chair',              '12000.00',    true, NOW(), NOW()),
('Filing Cabinet',             'Furniture',            'unit',  '4-drawer filing cabinet',             '15000.00',    true, NOW(), NOW()),
('Medical Supplies Kit',       'Healthcare',           'kit',   'Basic medical supplies package',      '200000.00',   true, NOW(), NOW()),
('Ambulance Vehicle',          'Healthcare',           'unit',  'Fully equipped ambulance',            '8500000.00',  true, NOW(), NOW()),
('Hospital Bed',               'Healthcare',           'unit',  'Standard hospital bed with mattress', '45000.00',    true, NOW(), NOW()),
('Road Construction (per km)', 'Infrastructure',       'km',    'Standard tarmac road per km',         '50000000.00', true, NOW(), NOW()),
('Security Uniform Set',       'Uniforms',             'set',   'Complete police/prison uniform',      '8500.00',     true, NOW(), NOW()),
('Vehicle (SUV)',               'Vehicles',             'unit',  'Standard government SUV',             '6500000.00',  true, NOW(), NOW()),
('Fuel Allocation (monthly)',   'Operations',           'month', 'Monthly fuel budget per vehicle',     '35000.00',    true, NOW(), NOW()),
('Stationery Pack',            'Office Supplies',      'pack',  'Monthly stationery supplies',         '5000.00',     true, NOW(), NOW()),
('Server Equipment',           'ICT Equipment',        'unit',  'Rack server with storage',            '1200000.00',  true, NOW(), NOW()),
('Solar Panel Set',            'Energy',               'set',   '5kW solar installation kit',          '850000.00',   true, NOW(), NOW()),
('Agricultural Equipment',     'Agriculture',          'set',   'Tractor and implements set',          '4500000.00',  true, NOW(), NOW());

COMMIT;
