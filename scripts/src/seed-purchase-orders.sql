-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: Purchase Orders + Items
-- Run with: psql $DATABASE_URL -f scripts/src/seed-purchase-orders.sql
-- Requires: products (20 rows), users, budget_cycles, sectors all seeded first.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- ── Insert purchase orders ────────────────────────────────────────────────────
INSERT INTO purchase_orders
  (sector_id, budget_cycle_id, created_by, status, notes, total_amount,
   submitted_at, reviewed_at, reviewed_by, rejection_reason, created_at, updated_at)
VALUES
  -- Draft orders (not yet submitted)
  (4,  1, 7,  'draft',     'Q3 ICT equipment refresh for administration office', 0,
   NULL, NULL, NULL, NULL, NOW()-INTERVAL '8 days',  NOW()-INTERVAL '8 days'),
  (5,  1, 9,  'draft',     'Teaching materials and classroom supplies purchase', 0,
   NULL, NULL, NULL, NULL, NOW()-INTERVAL '6 days',  NOW()-INTERVAL '6 days'),
  (6,  1, 10, 'draft',     'Office furniture replacement — worn out chairs and desks', 0,
   NULL, NULL, NULL, NULL, NOW()-INTERVAL '4 days',  NOW()-INTERVAL '4 days'),
  (13, 1, 19, 'draft',     'Annual stationery and toner cartridge procurement', 0,
   NULL, NULL, NULL, NULL, NOW()-INTERVAL '2 days',  NOW()-INTERVAL '2 days'),

  -- Submitted orders (awaiting approval)
  (7,  1, 11, 'submitted', 'Laboratory equipment for new semester intake', 0,
   NOW()-INTERVAL '5 days', NULL, NULL, NULL, NOW()-INTERVAL '7 days',  NOW()-INTERVAL '5 days'),
  (8,  1, 12, 'submitted', 'Security system upgrade — CCTV and access control', 0,
   NOW()-INTERVAL '4 days', NULL, NULL, NULL, NOW()-INTERVAL '6 days',  NOW()-INTERVAL '4 days'),
  (9,  1, 14, 'submitted', 'Vehicle maintenance parts and diagnostic tools', 0,
   NOW()-INTERVAL '3 days', NULL, NULL, NULL, NOW()-INTERVAL '5 days',  NOW()-INTERVAL '3 days'),
  (10, 1, 15, 'submitted', 'Medical supplies restocking — Q3 2025', 0,
   NOW()-INTERVAL '2 days', NULL, NULL, NULL, NOW()-INTERVAL '4 days',  NOW()-INTERVAL '2 days'),
  (11, 1, 16, 'submitted', 'Workshop equipment and welding consumables', 0,
   NOW()-INTERVAL '1 day',  NULL, NULL, NULL, NOW()-INTERVAL '3 days',  NOW()-INTERVAL '1 day'),
  (12, 1, 18, 'submitted', 'Network infrastructure upgrade — server room', 0,
   NOW()-INTERVAL '12 hours', NULL, NULL, NULL, NOW()-INTERVAL '2 days', NOW()-INTERVAL '12 hours'),

  -- Approved orders
  (4,  1, 7,  'approved',  'Server rack and networking equipment for data centre', 0,
   NOW()-INTERVAL '20 days', NOW()-INTERVAL '18 days', 1, NULL,
   NOW()-INTERVAL '22 days', NOW()-INTERVAL '18 days'),
  (5,  1, 9,  'approved',  'Science lab equipment for Form 3 & 4 students', 0,
   NOW()-INTERVAL '18 days', NOW()-INTERVAL '16 days', 1, NULL,
   NOW()-INTERVAL '20 days', NOW()-INTERVAL '16 days'),
  (6,  1, 10, 'approved',  'Solar panel installation — main block roof', 0,
   NOW()-INTERVAL '15 days', NOW()-INTERVAL '13 days', 1, NULL,
   NOW()-INTERVAL '17 days', NOW()-INTERVAL '13 days'),
  (8,  1, 12, 'approved',  'School bus acquisition for student transport', 0,
   NOW()-INTERVAL '30 days', NOW()-INTERVAL '27 days', 1, NULL,
   NOW()-INTERVAL '32 days', NOW()-INTERVAL '27 days'),
  (9,  1, 14, 'approved',  'Ambulance and medical equipment for health unit', 0,
   NOW()-INTERVAL '25 days', NOW()-INTERVAL '22 days', 1, NULL,
   NOW()-INTERVAL '28 days', NOW()-INTERVAL '22 days'),
  (11, 1, 16, 'approved',  'Computer lab upgrade — 20 new workstations', 0,
   NOW()-INTERVAL '12 days', NOW()-INTERVAL '10 days', 1, NULL,
   NOW()-INTERVAL '14 days', NOW()-INTERVAL '10 days'),

  -- Rejected orders
  (7,  1, 11, 'rejected',  'Tractor and water pump for school farm', 0,
   NOW()-INTERVAL '14 days', NOW()-INTERVAL '12 days', 1,
   'Total amount exceeds departmental approval limit. Resubmit with reduced quantities or seek ministry-level approval.',
   NOW()-INTERVAL '16 days', NOW()-INTERVAL '12 days'),
  (10, 1, 15, 'rejected',  'Ambulance fleet renewal — 3 units', 0,
   NOW()-INTERVAL '10 days', NOW()-INTERVAL '8 days',  1,
   'Budget cycle allocation for vehicles already exhausted. Defer to next fiscal year.',
   NOW()-INTERVAL '12 days', NOW()-INTERVAL '8 days'),
  (12, 1, 18, 'rejected',  'Emergency generator purchase', 0,
   NOW()-INTERVAL '7 days',  NOW()-INTERVAL '5 days',  1,
   'Item not on approved procurement list. Please obtain prior approval from the ministry supply officer.',
   NOW()-INTERVAL '9 days',  NOW()-INTERVAL '5 days'),
  (13, 1, 19, 'rejected',  'Photography and video equipment for PR office', 0,
   NOW()-INTERVAL '5 days',  NOW()-INTERVAL '3 days',  1,
   'Expenditure category not approved for this department. Refer to the ICT procurement policy.',
   NOW()-INTERVAL '7 days',  NOW()-INTERVAL '3 days');

-- ── Insert items for each order ───────────────────────────────────────────────
-- Helper: get the ID range we just inserted
-- We use a CTE to grab them by created_at ordering since id is serial

WITH new_orders AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
  FROM purchase_orders
  WHERE budget_cycle_id = 1
    AND created_at > NOW() - INTERVAL '40 days'
    AND id NOT IN (SELECT DISTINCT order_id FROM purchase_order_items)
),
-- Map rn → product bundles (2-3 items per order)
items(rn, product_id, quantity) AS (
  VALUES
  -- Order 1 (draft, ICT): desktops + chairs + desks
  (1::int,  1,  5::numeric),   -- 5 × Desktop Computer
  (1,       4,  10),           -- 10 × Office Chair
  (1,       3,  5),            -- 5 × Office Desk
  -- Order 2 (draft, teaching): textbooks + whiteboard + projector
  (2,       8,  50),           -- 50 × Textbooks
  (2,       5,  3),            -- 3 × Whiteboard
  (2,       6,  2),            -- 2 × Projector
  -- Order 3 (draft, furniture): desks + chairs
  (3,       3,  8),            -- 8 × Office Desk
  (3,       4,  20),           -- 20 × Office Chair
  -- Order 4 (draft, stationery): textbooks + printer
  (4,       8,  100),          -- 100 × Textbooks
  (4,       7,  2),            -- 2 × Printer
  -- Order 5 (submitted, lab): lab kit + projector
  (5,       9,  3),            -- 3 × Lab Equipment Kit
  (5,       6,  2),            -- 2 × Projector
  -- Order 6 (submitted, security): cameras
  (6,       13, 5),            -- 5 × Security Camera System
  -- Order 7 (submitted, vehicle): diagnostic tool
  (7,       17, 2),            -- 2 × Automotive Diagnostic Tool
  (7,       16, 1),            -- 1 × Welding Machine
  -- Order 8 (submitted, medical): medical supplies
  (8,       10, 10),           -- 10 × Medical Supplies Kit
  -- Order 9 (submitted, workshop): welding + tools
  (9,       16, 3),            -- 3 × Welding Machine
  (9,       17, 1),            -- 1 × Diagnostic Tool
  -- Order 10 (submitted, network): server + switch
  (10,      14, 2),            -- 2 × Server Rack
  (10,      15, 4),            -- 4 × Network Switch
  -- Order 11 (approved, server): server + switch + laptop
  (11,      14, 3),            -- 3 × Server Rack
  (11,      15, 6),            -- 6 × Network Switch
  (11,      2,  5),            -- 5 × Laptop
  -- Order 12 (approved, lab): lab kits + projector
  (12,      9,  5),            -- 5 × Lab Equipment Kit
  (12,      6,  4),            -- 4 × Projector
  -- Order 13 (approved, solar): solar panels
  (13,      18, 10),           -- 10 × Solar Panel Kit
  (13,      19, 5),            -- 5 × Water Pump
  -- Order 14 (approved, bus): school bus
  (14,      12, 2),            -- 2 × School Bus
  -- Order 15 (approved, ambulance): ambulance + medical
  (15,      11, 1),            -- 1 × Ambulance
  (15,      10, 20),           -- 20 × Medical Supplies Kit
  -- Order 16 (approved, computer lab): desktops + chairs
  (16,      1,  20),           -- 20 × Desktop Computer
  (16,      4,  20),           -- 20 × Office Chair
  -- Order 17 (rejected, tractor): tractor + water pump
  (17,      20, 2),            -- 2 × Tractor
  (17,      19, 3),            -- 3 × Water Pump
  -- Order 18 (rejected, ambulance): 3 ambulances
  (18,      11, 3),            -- 3 × Ambulance
  -- Order 19 (rejected, generator): server rack (stand-in)
  (19,      14, 5),            -- 5 × Server Rack
  (19,      18, 8),            -- 8 × Solar Panel Kit
  -- Order 20 (rejected, photography): laptops + projectors
  (20,      2,  4),            -- 4 × Laptop
  (20,      6,  3)             -- 3 × Projector
)
INSERT INTO purchase_order_items (order_id, product_id, quantity, unit_price_snapshot, line_total, created_at)
SELECT
  o.id,
  p.id,
  i.quantity,
  p.unit_price,
  (i.quantity * p.unit_price::numeric),
  NOW()
FROM items i
JOIN new_orders o ON o.rn = i.rn
JOIN products  p ON p.id  = i.product_id;

-- ── Recompute totals for every order we touched ───────────────────────────────
UPDATE purchase_orders po
SET total_amount = (
  SELECT COALESCE(SUM(line_total), 0)
  FROM purchase_order_items
  WHERE order_id = po.id
),
updated_at = NOW()
WHERE id IN (
  SELECT DISTINCT order_id FROM purchase_order_items
);

COMMIT;

-- Quick sanity check
SELECT status, COUNT(*) AS orders, SUM(total_amount)::bigint AS total_kes
FROM purchase_orders
GROUP BY status
ORDER BY status;
