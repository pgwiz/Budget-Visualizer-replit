# Budget Monitor — Implementation Plan

> **Stack:** Laravel 11 · SQLite · Blade · Tailwind CSS · Alpine.js  
> **Design System:** Glassmorphic · Blue / Orange / Black / White  
> **Theme Engine:** CSS custom properties (swap themes in one file)  
> **Audience:** Government / Corporate hierarchical budget allocation

---

## 0. Design System Contract

Before a single controller is written, the design system must be codified. All UI components derive from a single theme token file — swapping themes means changing one CSS file, nothing else.

### 0.1 Token Architecture

```
resources/
  css/
    themes/
      default.css      ← Blue/Orange/Black/White (primary)
      dark-slate.css   ← Deep navy variant
      high-contrast.css
    tokens.css         ← References var(--token-*) only; no hex values
    app.css            ← Imports tokens.css + Tailwind layers
```

### 0.2 Core Design Tokens

| Token | Default Theme Value | Role |
|---|---|---|
| `--bg-base` | `#0a0a0f` | Page background |
| `--bg-glass` | `rgba(255,255,255,0.04)` | Card/panel glass fill |
| `--bg-glass-hover` | `rgba(255,255,255,0.08)` | Hover state |
| `--border-glass` | `rgba(255,255,255,0.10)` | Glass border |
| `--accent-primary` | `#2563eb` | Blue — primary CTA, links |
| `--accent-secondary` | `#f97316` | Orange — alerts, allocate action |
| `--accent-danger` | `#ef4444` | Red — revoke action |
| `--accent-success` | `#22c55e` | Green — confirmed state |
| `--text-primary` | `#f8fafc` | Body text |
| `--text-muted` | `rgba(248,250,252,0.45)` | Labels, hints |
| `--shadow-glass` | `0 8px 32px rgba(0,0,0,0.5)` | Card depth |
| `--blur-glass` | `blur(16px)` | Backdrop filter |
| `--radius-card` | `1rem` | Card border radius |
| `--radius-btn` | `0.5rem` | Button border radius |

### 0.3 Glass Component Recipe (Blade Component Rule)

Every card/panel uses this pattern:
```
background: var(--bg-glass)
backdrop-filter: var(--blur-glass)
border: 1px solid var(--border-glass)
border-radius: var(--radius-card)
box-shadow: var(--shadow-glass)
```

No hardcoded hex values anywhere in Blade templates. Period.

---

## 1. Project Scaffolding

### Phase 1A — Laravel Project Init

- Create fresh Laravel 11 project
- Configure `.env` for SQLite: `DB_CONNECTION=sqlite`, `DB_DATABASE=database/budget_monitor.sqlite`
- Create the SQLite file: `touch database/budget_monitor.sqlite`
- Install and configure:
  - `laravel/breeze` (Blade + Alpine stack) for auth scaffolding
  - `spatie/laravel-permission` for role/permission management
- Run `php artisan breeze:install blade` to get auth views
- Vite configured with Tailwind CSS + `@tailwindcss/forms` plugin

### Phase 1B — Tailwind Configuration

In `tailwind.config.js`:
- Extend colors to reference CSS custom properties (e.g., `'glass': 'rgba(var(--bg-glass-rgb), <alpha-value>)'`)
- Set `darkMode: 'class'` even though dark is default — allows theme toggling via JS class swap
- Configure `content` to scan all Blade, JS, Alpine directives

### Phase 1C — Directory Structure

```
app/
  Http/
    Controllers/
      Auth/
      Dashboard/
        DashboardController.php
      Budget/
        AllocationController.php
        RevocationController.php
        TrackingController.php
      Admin/
        SectorController.php
        UserController.php
        ReportController.php
    Middleware/
      HierarchyAccess.php       ← Prevents cross-branch viewing
  Models/
    User.php
    Sector.php
    BudgetCycle.php
    Allocation.php
    AllocationRevocation.php
    AuditLog.php
  Services/
    BudgetCalculationService.php
    HierarchyService.php
    NotificationService.php
  Policies/
    AllocationPolicy.php
    SectorPolicy.php

resources/
  views/
    layouts/
      app.blade.php             ← Main shell with sidebar + topbar
      auth.blade.php            ← Login/register shell
    components/
      glass-card.blade.php
      stat-tile.blade.php
      progress-ring.blade.php
      allocation-row.blade.php
      tree-node.blade.php
      theme-switcher.blade.php
      notification-bell.blade.php
    dashboard/
      index.blade.php
    budget/
      allocate.blade.php
      track.blade.php
      revoke-modal.blade.php
    admin/
      sectors.blade.php
      users.blade.php
      reports.blade.php
    auth/
      login.blade.php
      (breeze scaffolded)
  css/
    themes/
    tokens.css
    app.css
  js/
    app.js
    allocation.js               ← Alpine store for real-time balance math
    tree.js                     ← Tree diagram renderer

database/
  migrations/
  seeders/
  budget_monitor.sqlite
```

---

## 2. Database Design

### Phase 2A — Migration Order

Migrations must be created and run in dependency order:

1. `create_budget_cycles_table`
2. `create_sectors_table`
3. `create_allocations_table`
4. `create_allocation_revocations_table`
5. `create_audit_logs_table`
6. Add Spatie permission tables via `php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"`

### Phase 2B — Schema Specification

#### `budget_cycles`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string | e.g. "FY 2024/2025" |
| total_budget | decimal(18,2) | Master budget figure |
| start_date | date | |
| end_date | date | |
| is_active | boolean | Only one active cycle at a time |
| created_by | FK → users | President/CEO |
| timestamps | | |

#### `sectors`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string | "Ministry of Agriculture" |
| code | string | Unique short code |
| parent_id | nullable FK → sectors | Self-referential tree |
| depth | integer | Computed depth in hierarchy |
| responsible_user_id | nullable FK → users | Officer in charge |
| is_active | boolean | |
| sort_order | integer | Display ordering |
| timestamps | | |

> The `parent_id` self-reference enables the tree diagram for Track. `depth` is a denormalized cache — computed on insert/update via model observer.

#### `allocations`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| budget_cycle_id | FK → budget_cycles | |
| from_sector_id | nullable FK → sectors | NULL = top-level (from CEO) |
| to_sector_id | FK → sectors | Receiving sector |
| allocated_by | FK → users | |
| amount | decimal(18,2) | |
| comment | text nullable | Message to receiver |
| status | enum | `pending`, `active`, `revoked`, `exhausted` |
| allocated_at | timestamp | |
| timestamps | | |

> One sector can receive multiple allocations across a cycle. The `BudgetCalculationService` sums them.

#### `allocation_revocations`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| allocation_id | FK → allocations | |
| revoked_by | FK → users | |
| reason | text | Mandatory |
| revoked_at | timestamp | |
| timestamps | | |

#### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| user_id | FK → users | Actor |
| action | string | `allocated`, `revoked`, `login`, `sector_created`, etc. |
| subject_type | string | Morph type |
| subject_id | bigint | Morph ID |
| meta | JSON | Contextual diff data |
| ip_address | string | |
| timestamps | | |

### Phase 2C — Eloquent Relationships Summary

- `User` hasMany `Allocations` (as allocator), hasOne `Sector` (responsible_for)
- `Sector` belongsTo `Sector` (parent), hasMany `Sectors` (children), hasMany `Allocations`
- `BudgetCycle` hasMany `Allocations`
- `Allocation` hasOne `AllocationRevocation`, belongsTo `Sector` (to), `Sector` (from), `User`, `BudgetCycle`
- All models use `AuditLog` via polymorphic morph

---

## 3. Role & Permission Matrix

### Roles (via Spatie)

| Role | Description |
|---|---|
| `super_admin` | Full system access — creates cycles, manages roles |
| `ceo` | Allocates from master budget to top-level sectors |
| `ministry_head` | Allocates within own sector to sub-sectors |
| `department_head` | Allocates within own department |
| `viewer` | Read-only audit/reporting access |

### Permission Map

| Permission | super_admin | ceo | ministry_head | department_head | viewer |
|---|---|---|---|---|---|
| `manage_budget_cycles` | ✓ | | | | |
| `allocate_funds` | ✓ | ✓ | ✓ | ✓ | |
| `revoke_allocation` | ✓ | ✓ | ✓ | ✓ | |
| `view_own_sector` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `view_child_sectors` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `view_all_sectors` | ✓ | ✓ | | | |
| `manage_sectors` | ✓ | | | | |
| `manage_users` | ✓ | | | | |
| `export_reports` | ✓ | ✓ | ✓ | | |

> `HierarchyAccess` middleware enforces that an officer can only view/act on sectors within their own subtree. No lateral access.

---

## 4. Core Services

### Phase 4A — `BudgetCalculationService`

This is the financial brain. Every balance computation routes through here — never inline in controllers.

Responsibilities:
- `getTotalAllocated(sector, cycle)` — Sum of all active allocations received by a sector
- `getTotalRevoked(sector, cycle)` — Sum of all revoked allocation amounts
- `getNetAllocated(sector, cycle)` — Allocated minus revoked
- `getAvailableBalance(sector, cycle)` — What the officer can still distribute down
- `getRemainingFromParent(sector, cycle)` — How much the parent has left to give
- `getUtilizationPercentage(sector, cycle)` — For progress rings on dashboard
- `validateAllocationAmount(amount, fromSector, cycle)` — Guards: amount > 0, amount ≤ available balance, cycle is active
- `getSectorTreeWithBalances(rootSector, cycle)` — Recursive tree structure with balance at each node (used by Track)

### Phase 4B — `HierarchyService`

- `getAncestors(sector)` — Breadcrumb chain
- `getDescendants(sector)` — All children recursively (eager loaded, bounded depth)
- `getSectorsVisibleTo(user)` — Returns sector collection the user may view
- `getSectorsAllocatableTo(user)` — Direct children of user's responsible sector
- `buildTreeArray(sectors)` — Converts flat collection to nested array for Alpine tree renderer

### Phase 4C — `NotificationService`

- On allocation: store a notification record and flash a toast on next page load for the receiving officer
- On revocation: notify the affected officer with reason
- Notifications stored in Laravel's built-in `notifications` table (polymorphic)
- Bell icon in topbar shows unread count via Alpine.js reactive store

---

## 5. Controller & Route Architecture

### Phase 5A — Route Groups

```
/                               → Redirect to /dashboard
/login, /logout                 → Auth (Breeze)

/dashboard                      → DashboardController@index
  Role-aware: CEO sees master summary, officers see own sector

/budget
  /allocate                     → AllocationController@index (GET)
  /allocate                     → AllocationController@store (POST)
  /revoke/{allocation}          → RevocationController@store (POST)
  /track/{sector}               → TrackingController@show (GET)
  /track/{sector}/json          → TrackingController@treeJson (GET) [API for Alpine]

/admin                          → Gate: super_admin only
  /sectors                      → SectorController (resource)
  /users                        → UserController (resource)
  /cycles                       → BudgetCycleController (resource)
  /reports                      → ReportController@index, @export
```

### Phase 5B — Controller Responsibilities

**`AllocationController`**
- `index()`: Load user's responsible sector, get its children (allocatable sectors), get available balance, pass to view
- `store()`: Validate (FormRequest), call `BudgetCalculationService::validateAllocationAmount`, create `Allocation`, fire `NotificationService`, log to audit, redirect with toast

**`RevocationController`**
- `store()`: Auth check (can only revoke own allocations or if higher-level), create `AllocationRevocation`, update `Allocation.status = revoked`, notify, audit log

**`TrackingController`**
- `show()`: Load sector + all descendants, pass to tree view
- `treeJson()`: Return `HierarchyService::getSectorTreeWithBalances()` as JSON for Alpine.js tree renderer — this is the data source for the interactive tree diagram

**`DashboardController`**
- `index()`: Role-aware. CEO: total budget, total allocated, % utilized, top-level sectors summary. Officer: own allocation, sub-allocations summary, recent activity feed

---

## 6. UI — Page-by-Page Specification

### Phase 6A — Layout Shell (`layouts/app.blade.php`)

```
┌─────────────────────────────────────────────────────────┐
│  SIDEBAR (glass, fixed left, 240px)                      │
│  ├─ Logo + "Budget Monitor"                              │
│  ├─ Navigation links (icon + label)                      │
│  │   Dashboard / Allocate / Track / Admin / Reports       │
│  └─ User avatar + role badge at bottom                   │
├─────────────────────────────────────────────────────────┤
│  TOPBAR (glass, sticky, full width minus sidebar)        │
│  ├─ Page title (dynamic)                                 │
│  ├─ Active budget cycle badge (orange pill)              │
│  ├─ 🔔 Notification bell (unread count badge)           │
│  ├─ 🎨 Theme switcher (dropdown)                        │
│  └─ User menu                                            │
├─────────────────────────────────────────────────────────┤
│  MAIN CONTENT AREA (scrollable)                          │
│  @yield('content')                                       │
└─────────────────────────────────────────────────────────┘
```

### Phase 6B — Dashboard (`dashboard/index.blade.php`)

**CEO View:**
- Row of 4 stat tiles: Total Budget · Total Allocated · Total Revoked · Available Balance
- Each tile: large number, label, orange progress bar showing utilization %, glass card
- Below: table of top-level sectors with their allocated amounts, utilization rings, quick Track button

**Officer View:**
- 3 stat tiles: My Allocated · Distributed to Sub-sectors · Remaining Balance
- Allocation table (their sub-sectors)
- Recent activity feed (timeline, last 10 audit events for their tree)

### Phase 6C — Allocation Page (`budget/allocate.blade.php`)

This is the core workflow page. Layout:

```
Page header: "Allocate Funds" + cycle name badge

Available Balance Card (prominent, top — orange accent border)
  "KES 48,500,000.00 available to distribute"

Allocation Table (glass card):
┌──────────────────┬──────────────┬──────────────┬────────────────┬───────────┬──────────┬────────┐
│ Sector           │ Amount (KES) │ Comment      │ Current Balance│ Status    │ Action   │ Track  │
├──────────────────┼──────────────┼──────────────┼────────────────┼───────────┼──────────┼────────┤
│ Min. Agriculture │ [number input]│ [text input] │ KES 0.00       │ ● Pending │ [Allocate│[Track] │
│ Min. Health      │ [number input]│ [text input] │ KES 12,000,000 │ ● Active  │ [Revoke] │[Track] │
└──────────────────┴──────────────┴──────────────┴────────────────┴───────────┴──────────┴────────┘
```

Real-time balance: Alpine.js `x-model` on every amount input, `x-text` on the available balance — updates as user types without a server round-trip. When the sum of pending inputs would exceed available balance, the balance counter turns red and Allocate buttons disable.

Each row also has an "+ Add Entry" link below it to allocate multiple tranches to the same sector.

Allocate button: Blue, outlined style. On click: submits that row's form via `fetch()` (no full page reload), row updates in place with new status.

Revoke button: Only appears on active allocations. Orange/red outline. Opens a slide-over modal with mandatory revoke reason field.

### Phase 6D — Track Page (`budget/track.blade.php`)

Split layout:
- Left panel: Sector selector / breadcrumb
- Right panel: Interactive tree diagram

**Tree Diagram:**
- Built with Alpine.js + pure CSS (no external chart lib dependency)
- Each node is a glass card: sector name, allocated amount, utilized %, small horizontal bar
- Nodes are collapsible (click to expand/collapse children)
- Color coding: ≥80% utilized → orange warning, ≥95% → red alert, <80% → blue normal
- Data fetched from `TrackingController@treeJson` on page load, then rendered client-side
- "Export Tree" button → triggers browser print of a clean version

### Phase 6E — Admin Pages

**Sectors (`admin/sectors.blade.php`):**
- Left: tree list of all sectors (hierarchical indentation)
- Right: Create/Edit form for selected sector (parent selector dropdown, officer assignment)
- Drag-reorder for `sort_order` (Alpine.js + CSS, no external DnD lib)

**Users (`admin/users.blade.php`):**
- Filterable table: name, email, role badge, assigned sector
- Role change: inline select, saves via AJAX

**Budget Cycles (`admin/cycles.blade.php`):**
- List of cycles with active/inactive toggle
- Create form: name, total budget, date range
- Only one cycle can be active — toggling activates and deactivates others atomically

**Reports (`admin/reports.blade.php`):**
- Filter by: cycle, sector (and children), date range, action type
- Table output with pagination
- Export to CSV button

---

## 7. Theme Switcher Implementation

### How It Works

1. On `<body>`: `x-data="themeStore()"` Alpine component
2. `themeStore()` reads from `localStorage.getItem('bm_theme')` on init
3. Applies theme by setting `data-theme` attribute on `<html>` element
4. CSS: `[data-theme="default"] { --accent-primary: #2563eb; ... }` per theme file
5. Switcher dropdown in topbar: lists available themes with color preview dots

### Themes Provided

| ID | Name | Primary | Secondary |
|---|---|---|---|
| `default` | Blue Midnight | `#2563eb` | `#f97316` |
| `slate` | Slate Dusk | `#6366f1` | `#f59e0b` |
| `emerald` | Forest Glass | `#059669` | `#f97316` |
| `rose` | Rose Noir | `#e11d48` | `#f97316` |

> Adding a new theme = one new CSS block in `tokens.css`. No PHP changes, no Blade changes, no JS changes.

---

## 8. Alpine.js Stores

### `allocationStore` (`resources/js/allocation.js`)

```
state:
  totalAvailable: Number      ← from PHP @json in Blade
  rows: Array of { sectorId, amount, comment }
  
computed:
  totalPending: sum of rows[*].amount
  remainingBalance: totalAvailable - totalPending
  isOverBudget: remainingBalance < 0

methods:
  addRow(sectorId)
  removeRow(index)
  updateAmount(index, value)
  submitRow(index)            ← fetch POST, update row status on success
  openRevokeModal(allocationId)
```

### `treeStore` (`resources/js/tree.js`)

```
state:
  nodes: nested array from API
  expandedIds: Set

methods:
  toggle(id)
  isExpanded(id)
  getUtilizationClass(pct)    ← returns CSS class for color coding
  fetchTree(sectorId)         ← GET /budget/track/{sector}/json
```

---

## 9. Seeder Strategy

### `DatabaseSeeder` calls in order:

1. `RolesAndPermissionsSeeder` — creates all roles and permissions via Spatie
2. `BudgetCycleSeeder` — creates one active cycle: "FY 2024/2025", KES 500,000,000
3. `SectorSeeder` — creates the full government sector tree:
   - Level 0: (root — represents the President/CEO's pool)
   - Level 1: Ministry of Agriculture, Ministry of Health, Ministry of Education, Ministry of Finance, Ministry of Infrastructure (5 sectors)
   - Level 2: 3 departments per ministry (15 departments)
   - Level 3: 2 sub-departments per department for Agriculture and Health (demo nesting)
4. `UserSeeder` — creates demo users, assigns roles and responsible sectors:
   - `admin@budget.go.ke` / `password` → `super_admin`
   - `ceo@budget.go.ke` / `password` → `ceo`
   - `agri@budget.go.ke` / `password` → `ministry_head` → Ministry of Agriculture
   - `health@budget.go.ke` / `password` → `ministry_head` → Ministry of Health
   - `edu@budget.go.ke` / `password` → `ministry_head` → Ministry of Education
   - 3 `department_head` users per ministry (15 total)
5. `DemoAllocationSeeder` — creates sample allocations to populate dashboards with realistic data

---

## 10. Testing Strategy

### Phase 10A — Feature Tests

Each test file maps to a core user story:

| Test File | Covers |
|---|---|
| `AllocationTest` | Store, validation (over-budget, zero amount, inactive cycle), duplicate guard |
| `RevocationTest` | Revoke own, revoke others (forbidden), revoke already-revoked |
| `HierarchyAccessTest` | Officer cannot view sibling's sector, can view own children |
| `BalanceCalculationTest` | Available balance math after multiple allocations and revocations |
| `TrackApiTest` | Tree JSON structure, depth correctness, balance accuracy per node |
| `RoleGateTest` | Each role's permitted and forbidden routes |
| `BudgetCycleTest` | Only one active cycle, cannot allocate to inactive cycle |

### Phase 10B — Unit Tests

- `BudgetCalculationServiceTest` — Pure math unit tests with no DB
- `HierarchyServiceTest` — Tree building correctness
- `ThemeTokenTest` — Validates all CSS token files have required variables (PHP parses CSS)

---

## 11. Implementation Phases Summary

| Phase | Scope | Estimated Complexity |
|---|---|---|
| **1** | Scaffolding, Tailwind, Vite, Breeze auth | Low |
| **2** | Migrations, Models, Relationships, Seeders | Medium |
| **3** | Roles/Permissions (Spatie), Middleware | Medium |
| **4** | Services: Budget calculation, Hierarchy, Notifications | High |
| **5** | Controllers, Routes, FormRequests, Policies | Medium |
| **6** | Layout Shell, Dashboard, Allocation Page | High |
| **7** | Track Page + Tree Diagram | High |
| **8** | Admin Pages (Sectors, Users, Cycles, Reports) | Medium |
| **9** | Theme Switcher, Alpine Stores, Notification Bell | Medium |
| **10** | Feature Tests + Unit Tests | Medium |
| **11** | Final polish: animations, mobile responsiveness, export | Low |

---

## 12. Key Technical Decisions & Rationale

| Decision | Rationale |
|---|---|
| SQLite for dev | Zero-config, file-based, perfect for agent testing and portability |
| No JavaScript framework | Alpine.js is sufficient — avoids build complexity while enabling reactivity |
| CSS custom properties for themes | Zero runtime overhead, no JS theming library needed, one line to swap |
| Self-referential `sectors` table | Enables unlimited hierarchy depth without schema changes |
| Spatie permissions | Battle-tested, integrates with Laravel Gate/Policy naturally |
| `BudgetCalculationService` singleton | All financial math in one place — easier to audit, test, and replace |
| FormRequest validation | Keeps controllers thin; validation logic is testable and reusable |
| AJAX row submission on allocation | Eliminates full-page reload; preserves balance state in Alpine store |
| Audit log on every write | Government/accountability context demands full action traceability |
