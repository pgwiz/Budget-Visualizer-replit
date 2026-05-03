import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  useListPurchaseOrders, useCreatePurchaseOrder, useListProducts,
  useAddOrderItem, useRemoveOrderItem, useSubmitPurchaseOrder, useReviewPurchaseOrder,
  useGetActiveCycle, useListSectors,
} from '@workspace/api-client-react';
import { queryClient, formatCurrency, formatCompact } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  ShoppingCart, Plus, Search, Trash2, Send, CheckCircle, XCircle,
  Clock, FileText, ChevronDown, ChevronRight, Package, AlertTriangle,
  X, Filter, Shield, Edit2, Save, Users, ArrowUpRight,
  CheckSquare, Settings, Layers, Building2, LayoutList, SlidersHorizontal,
  Tag, DollarSign, Network,
} from 'lucide-react';
import type { PurchaseOrderWithDetails, Product } from '@workspace/api-client-react';

/* ── Types ────────────────────────────────────────────────────── */
interface ApprovalLimit {
  id: number;
  sectorId: number;
  maxApprovableAmount: number;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  sector: { id: number; name: string; code: string; depth: number; parentId: number | null } | null;
  responsibleUser: { id: number; name: string; role: string; email: string } | null;
}

interface Filters {
  search: string;
  status: string;
  sectorId: number | null;
  categories: string[];
  amtMin: string;
  amtMax: string;
}

const EMPTY_FILTERS: Filters = { search: '', status: 'all', sectorId: null, categories: [], amtMin: '', amtMax: '' };

/* ── Constants ───────────────────────────────────────────────── */
const STATUS_CFG = {
  draft:     { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: FileText },
  submitted: { label: 'Submitted', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
  approved:  { label: 'Approved',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle },
  rejected:  { label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle },
} as const;

const CATEGORY_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  'Building Materials':    { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)' },
  'Cleaning & Sanitation': { color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)' },
  'Furniture':             { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.25)' },
  'ICT Equipment':         { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
  'Office Supplies':       { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  'Transport & Fuel':      { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
};
const ALL_CATEGORIES = Object.keys(CATEGORY_COLORS);

const DEPTH_LABELS = ['National', 'Ministry', 'Authority', 'Institution', 'School', 'Dept'];

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d as string).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Filter logic ────────────────────────────────────────────── */
function applyFilters(
  orders: PurchaseOrderWithDetails[],
  filters: Filters,
  sectors: any[],
): PurchaseOrderWithDetails[] {
  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));

  // For sector filter: include the chosen sector AND all its descendants
  function isInSectorTree(sectorId: number): boolean {
    if (!filters.sectorId) return true;
    let cur: number | null = sectorId;
    while (cur !== null) {
      if (cur === filters.sectorId) return true;
      cur = sectorMap.get(cur)?.parentId ?? null;
    }
    return false;
  }

  return orders.filter(o => {
    if (filters.status !== 'all' && o.status !== filters.status) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        o.sector?.name?.toLowerCase().includes(q) ||
        String(o.id).includes(q) ||
        (o.notes ?? '').toLowerCase().includes(q) ||
        o.items.some(i => i.product?.name?.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filters.sectorId && !isInSectorTree(o.sectorId)) return false;
    if (filters.categories.length > 0) {
      const hasCat = o.items.some(i => i.product && filters.categories.includes(i.product.category));
      if (!hasCat) return false;
    }
    if (filters.amtMin && o.totalAmount < parseFloat(filters.amtMin)) return false;
    if (filters.amtMax && o.totalAmount > parseFloat(filters.amtMax)) return false;
    return true;
  });
}

function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.status !== 'all') n++;
  if (f.sectorId) n++;
  if (f.categories.length > 0) n++;
  if (f.amtMin) n++;
  if (f.amtMax) n++;
  if (f.search) n++;
  return n;
}

/* ── Custom hooks for approval limits ────────────────────────── */
function useApprovalLimits() {
  return useQuery<ApprovalLimit[]>({
    queryKey: ['approval-limits'],
    queryFn: async () => {
      const r = await fetch('/api/approval-limits');
      if (!r.ok) throw new Error('Failed');
      return r.json();
    },
    staleTime: 30000,
  });
}
function useSetApprovalLimit() {
  return useMutation({
    mutationFn: async (data: { sectorId: number; maxApprovableAmount: number; notes?: string }) => {
      const r = await fetch('/api/approval-limits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await r.json();
      if (!r.ok) throw new Error(json.message ?? 'Error');
      return json;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-limits'] }),
  });
}
function useDeleteApprovalLimit() {
  return useMutation({
    mutationFn: async (id: number) => {
      await fetch(`/api/approval-limits/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-limits'] }),
  });
}

/* ── Approval routing ────────────────────────────────────────── */
function getRequiredApprover(poSectorId: number, poAmount: number, sectors: any[], limits: ApprovalLimit[]) {
  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));
  const limitMap  = new Map(limits.map(l => [l.sectorId, l]));
  const poSector  = sectorMap.get(poSectorId);
  if (!poSector?.parentId) return null;
  let currentId: number | null = poSector.parentId;
  while (currentId) {
    const sec = sectorMap.get(currentId);
    if (!sec) break;
    const lim = limitMap.get(sec.id);
    if (lim && lim.maxApprovableAmount >= poAmount) return { sector: sec, limit: lim.maxApprovableAmount };
    currentId = sec.parentId ?? null;
  }
  return null;
}

function canUserApproveOrder(user: any, order: PurchaseOrderWithDetails, sectors: any[], limits: ApprovalLimit[]): boolean {
  if (!user || order.status !== 'submitted') return false;
  if (['super_admin', 'ceo'].includes(user.role)) return true;
  if (!user.sectorId || order.sectorId === user.sectorId) return false;
  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));
  let cur: number | null = sectorMap.get(order.sectorId)?.parentId ?? null;
  let isDesc = false;
  while (cur) { if (cur === user.sectorId) { isDesc = true; break; } cur = sectorMap.get(cur)?.parentId ?? null; }
  if (!isDesc) return false;
  const lim = limits.find(l => l.sectorId === user.sectorId);
  return !!(lim && lim.maxApprovableAmount >= order.totalAmount);
}

/* ── Filter Panel ────────────────────────────────────────────── */
function FilterPanel({ filters, onChange, sectors, orders }: {
  filters: Filters;
  onChange: (f: Filters) => void;
  sectors: any[];
  orders: PurchaseOrderWithDetails[];
}) {
  // Build sector tree for the picker: group by institution (depth=3)
  const institutions = sectors.filter((s: any) => s.depth === 3);
  const schools      = sectors.filter((s: any) => s.depth === 4);
  const depts        = sectors.filter((s: any) => s.depth === 5);

  // Count orders per sector (including descendants)
  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));
  function ordersInTree(sectorId: number): number {
    const descendants: number[] = [];
    const q = [sectorId];
    while (q.length) {
      const cur = q.shift()!;
      descendants.push(cur);
      sectors.filter((s: any) => s.parentId === cur).forEach((s: any) => q.push(s.id));
    }
    return orders.filter(o => descendants.includes(o.sectorId)).length;
  }

  // Category counts (from order items)
  const catCounts: Record<string, number> = {};
  ALL_CATEGORIES.forEach(c => {
    catCounts[c] = orders.filter(o => o.items.some(i => i.product?.category === c)).length;
  });

  function toggleCat(cat: string) {
    const cats = filters.categories.includes(cat)
      ? filters.categories.filter(c => c !== cat)
      : [...filters.categories, cat];
    onChange({ ...filters, categories: cats });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      exit={{ opacity: 0, y: -8, height: 0 }}
      className="overflow-hidden"
    >
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4 space-y-5 mt-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* ── Sector / Department ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
              <Network size={10} /> Department
            </p>
            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              <button
                onClick={() => onChange({ ...filters, sectorId: null })}
                className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${!filters.sectorId ? 'bg-blue-500/20 text-blue-400 font-bold' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                <span>All Departments</span>
                <span className="text-[10px] text-white/20">{orders.length}</span>
              </button>
              {institutions.map(inst => {
                const instSchools = schools.filter((s: any) => s.parentId === inst.id);
                const count = ordersInTree(inst.id);
                if (count === 0 && filters.sectorId !== inst.id) return null;
                return (
                  <div key={inst.id}>
                    <button
                      onClick={() => onChange({ ...filters, sectorId: inst.id === filters.sectorId ? null : inst.id })}
                      className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filters.sectorId === inst.id ? 'bg-blue-500/20 text-blue-400' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Building2 size={10} className="text-white/20" />
                        {inst.name}
                      </span>
                      <span className="text-[10px] text-white/20">{count}</span>
                    </button>
                    {instSchools.map(sch => {
                      const schCount = ordersInTree(sch.id);
                      const schDepts = depts.filter((d: any) => d.parentId === sch.id);
                      if (schCount === 0 && filters.sectorId !== sch.id) return null;
                      return (
                        <div key={sch.id}>
                          <button
                            onClick={() => onChange({ ...filters, sectorId: sch.id === filters.sectorId ? null : sch.id })}
                            className={`w-full text-left flex items-center justify-between pl-5 pr-2.5 py-1 rounded-lg text-[11px] transition-colors ${filters.sectorId === sch.id ? 'bg-blue-500/15 text-blue-400' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}
                          >
                            <span className="flex items-center gap-1.5">
                              <ChevronRight size={9} className="text-white/15" />
                              {sch.name}
                            </span>
                            <span className="text-[10px] text-white/20">{schCount}</span>
                          </button>
                          {schDepts.map(dept => {
                            const deptCount = ordersInTree(dept.id);
                            if (deptCount === 0 && filters.sectorId !== dept.id) return null;
                            return (
                              <button key={dept.id}
                                onClick={() => onChange({ ...filters, sectorId: dept.id === filters.sectorId ? null : dept.id })}
                                className={`w-full text-left flex items-center justify-between pl-9 pr-2.5 py-1 rounded-lg text-[11px] transition-colors ${filters.sectorId === dept.id ? 'bg-blue-500/15 text-blue-400' : 'text-white/30 hover:text-white/60 hover:bg-white/5'}`}
                              >
                                <span>· {dept.name}</span>
                                <span className="text-[10px] text-white/20">{deptCount}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Product Category ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
              <Tag size={10} /> Item Category
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => onChange({ ...filters, categories: [] })}
                className={`flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs transition-colors ${filters.categories.length === 0 ? 'bg-blue-500/20 text-blue-400 font-bold border border-blue-500/30' : 'text-white/40 hover:text-white border border-transparent hover:bg-white/5'}`}
              >
                <span>All Categories</span>
                <span className="text-[10px] text-white/30">{orders.length} orders</span>
              </button>
              {ALL_CATEGORIES.map(cat => {
                const cfg = CATEGORY_COLORS[cat];
                const active = filters.categories.includes(cat);
                return (
                  <button key={cat} onClick={() => toggleCat(cat)}
                    className="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs transition-all border"
                    style={{
                      color: active ? cfg.color : 'rgba(255,255,255,0.4)',
                      background: active ? cfg.bg : 'transparent',
                      borderColor: active ? cfg.border : 'transparent',
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                      {cat}
                    </span>
                    <span className="text-[10px]" style={{ color: active ? cfg.color : 'rgba(255,255,255,0.2)' }}>
                      {catCounts[cat]} orders
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Amount Range ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 flex items-center gap-1.5">
              <DollarSign size={10} /> Order Amount
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-white/30 text-[10px]">Min (KSh)</Label>
                  <Input value={filters.amtMin} onChange={e => onChange({ ...filters, amtMin: e.target.value })}
                    placeholder="0" type="number" min="0"
                    className="h-8 glass border-white/10 text-white text-xs placeholder:text-white/15" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white/30 text-[10px]">Max (KSh)</Label>
                  <Input value={filters.amtMax} onChange={e => onChange({ ...filters, amtMax: e.target.value })}
                    placeholder="∞" type="number" min="0"
                    className="h-8 glass border-white/10 text-white text-xs placeholder:text-white/15" />
                </div>
              </div>
              {/* Preset ranges */}
              <div className="space-y-1">
                <p className="text-[10px] text-white/20">Quick ranges</p>
                {[
                  { label: '< 100K',   min: '',         max: '100000' },
                  { label: '100K–500K', min: '100000',  max: '500000' },
                  { label: '500K–2M',   min: '500000',  max: '2000000' },
                  { label: '> 2M',      min: '2000000', max: '' },
                ].map(r => {
                  const active = filters.amtMin === r.min && filters.amtMax === r.max;
                  return (
                    <button key={r.label}
                      onClick={() => onChange({ ...filters, amtMin: active ? '' : r.min, amtMax: active ? '' : r.max })}
                      className={`w-full text-left px-2.5 py-1 rounded-lg text-[11px] transition-colors ${active ? 'bg-indigo-500/20 text-indigo-400 font-bold border border-indigo-500/30' : 'text-white/30 hover:text-white hover:bg-white/5 border border-transparent'}`}
                    >
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Add Item Panel ──────────────────────────────────────────── */
function AddItemPanel({ orderId, products, onAdded }: { orderId: number; products: Product[]; onAdded: () => void }) {
  const [search, setSearch]    = useState('');
  const [selectedId, setSelId] = useState<number | null>(null);
  const [qty, setQty]          = useState('1');
  const [err, setErr]          = useState('');

  const addMutation = useAddOrderItem({
    mutation: {
      onSuccess: () => { onAdded(); setSelId(null); setQty('1'); setSearch(''); setErr(''); },
      onError: (e: any) => setErr(e?.response?.data?.message ?? e?.message ?? 'Failed to add item'),
    }
  });

  const categories = [...new Set(products.map(p => p.category))].sort();
  const filtered   = search ? products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  ) : products;

  // Group by category
  const grouped = categories.reduce((acc, cat) => {
    acc[cat] = filtered.filter(p => p.category === cat);
    return acc;
  }, {} as Record<string, Product[]>);

  const selected  = products.find(p => p.id === selectedId);
  const lineTotal = selected && parseFloat(qty) > 0 ? selected.unitPrice * parseFloat(qty) : 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <Input value={search} onChange={e => { setSearch(e.target.value); setSelId(null); }}
          placeholder="Search products by name or category..."
          className="pl-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
      </div>
      <div className="max-h-56 overflow-y-auto space-y-3 pr-1">
        {categories.map(cat => {
          const catProducts = grouped[cat];
          if (!catProducts?.length) return null;
          const catCfg = CATEGORY_COLORS[cat] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)' };
          return (
            <div key={cat}>
              <p className="text-[9px] font-bold uppercase tracking-widest px-1 mb-1 flex items-center gap-1.5"
                style={{ color: catCfg.color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: catCfg.color }} />
                {cat}
              </p>
              <div className="space-y-0.5">
                {catProducts.map(p => (
                  <button key={p.id} onClick={() => setSelId(p.id === selectedId ? null : p.id)}
                    className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-sm transition-colors ${selectedId === p.id ? 'bg-blue-500/20 border border-blue-500/40' : 'bg-white/5 hover:bg-white/8 border border-transparent'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-white/30 text-[10px]">per {p.unit}</p>
                    </div>
                    <span className="text-emerald-400 text-xs font-bold shrink-0">KSh {p.unitPrice.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-center text-white/20 text-sm py-6">No products found</p>}
      </div>
      {selected && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{selected.name}</p>
            <span className="text-xs text-white/40">× {qty} {selected.unit} = <strong className="text-emerald-400">KSh {lineTotal.toLocaleString()}</strong></span>
          </div>
          <div className="flex gap-3">
            <Input type="number" min="0.01" step="0.01" value={qty} onChange={e => setQty(e.target.value)}
              placeholder="Qty" className="glass border-white/10 text-white text-sm w-28" />
            <button onClick={() => addMutation.mutate({ orderId, data: { productId: selected.id, quantity: parseFloat(qty) } })}
              disabled={!parseFloat(qty) || addMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors">
              {addMutation.isPending ? <LoadingSpinner size={14} className="p-0 text-white" /> : <Plus size={14} />}
              Add to Order
            </button>
          </div>
          {err && <p className="text-xs text-rose-400">{err}</p>}
        </motion.div>
      )}
    </div>
  );
}

/* ── Approver Badge ──────────────────────────────────────────── */
function ApproverBadge({ order, sectors, limits }: { order: PurchaseOrderWithDetails; sectors: any[]; limits: ApprovalLimit[] }) {
  if (order.status !== 'submitted') return null;
  const req = getRequiredApprover(order.sectorId, order.totalAmount, sectors, limits);
  if (!req) return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border"
      style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }}>
      <Shield size={9} /> Awaiting DG / Admin
    </span>
  );
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border"
      style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}>
      <ArrowUpRight size={9} /> Awaiting {req.sector.name}
    </span>
  );
}

/* ── Approval Route Info ─────────────────────────────────────── */
function ApprovalRouteInfo({ order, sectors, limits }: { order: PurchaseOrderWithDetails; sectors: any[]; limits: ApprovalLimit[] }) {
  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));
  const limitMap  = new Map(limits.map(l => [l.sectorId, l]));
  const chain: { sectorId: number; name: string; limit: number | null; canApprove: boolean }[] = [];
  let curId: number | null = sectorMap.get(order.sectorId)?.parentId ?? null;
  while (curId) {
    const sec = sectorMap.get(curId);
    if (!sec) break;
    const lim = limitMap.get(sec.id);
    chain.push({ sectorId: sec.id, name: sec.name, limit: lim ? lim.maxApprovableAmount : null, canApprove: !!(lim && lim.maxApprovableAmount >= order.totalAmount) });
    curId = sec.parentId ?? null;
  }
  const approver = chain.find(c => c.canApprove);
  return (
    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <ArrowUpRight size={12} className="text-amber-400" />
        <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Approval Route</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {chain.map((c, i) => (
          <div key={c.sectorId} className="flex items-center gap-2">
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${c.canApprove && c.sectorId === approver?.sectorId ? 'text-amber-400 border-amber-500/40 bg-amber-500/15' : 'text-white/30 border-white/10 bg-white/5'}`}>
              {c.name}{c.limit !== null ? ` (up to ${formatCompact(c.limit)})` : ' (no limit)'}{c.canApprove && c.sectorId === approver?.sectorId && ' ✓'}
            </div>
            {i < chain.length - 1 && <ChevronRight size={11} className="text-white/20 shrink-0" />}
          </div>
        ))}
        {chain.length === 0 && <p className="text-xs text-white/30">CEO / System Administrator must approve</p>}
      </div>
    </div>
  );
}

/* ── Order Card ──────────────────────────────────────────────── */
function OrderCard({ order, products, canReview, sectors, limits }: {
  order: PurchaseOrderWithDetails; products: Product[]; canReview: boolean; sectors: any[]; limits: ApprovalLimit[];
}) {
  const [expanded, setExpanded]  = useState(order.status === 'draft');
  const [addingItem, setAddItem] = useState(false);
  const [rejectReason, setRR]    = useState('');
  const [showReject, setShowRej] = useState(false);
  const [reviewErr, setRevErr]   = useState('');

  const cfg = STATUS_CFG[order.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;

  const removeMutation = useRemoveOrderItem({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }) } });
  const submitMutation = useSubmitPurchaseOrder({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }), onError: (e: any) => setRevErr(e?.response?.data?.message ?? e?.message ?? 'Failed') } });
  const reviewMutation = useReviewPurchaseOrder({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); setShowRej(false); setRevErr(''); }, onError: (e: any) => setRevErr(e?.response?.data?.message ?? e?.message ?? 'Failed') } });

  // Category summary chips on collapsed card
  const usedCategories = [...new Set(order.items.map(i => i.product?.category).filter(Boolean) as string[])];

  return (
    <motion.div layout className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
          <cfg.icon size={15} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">PO-{String(order.id).padStart(4, '0')}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border" style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
              {cfg.label}
            </span>
            <ApproverBadge order={order} sectors={sectors} limits={limits} />
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-white/40 truncate">{order.sector?.name ?? `Sector #${order.sectorId}`} · {fmtDate(order.createdAt)}</p>
            {usedCategories.map(cat => {
              const c = CATEGORY_COLORS[cat];
              return c ? (
                <span key={cat} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: c.color, background: c.bg }}>
                  {cat}
                </span>
              ) : null;
            })}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">{formatCompact(order.totalAmount)}</p>
          <p className="text-[10px] text-white/30">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</p>
        </div>
        {expanded ? <ChevronDown size={15} className="text-white/30 shrink-0" /> : <ChevronRight size={15} className="text-white/30 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-white/8">
              {order.status === 'submitted' && <ApprovalRouteInfo order={order} sectors={sectors} limits={limits} />}

              {order.items.length > 0 ? (
                <div className="mt-4 space-y-1.5">
                  {order.items.map((item, i) => {
                    const catCfg = item.product?.category ? CATEGORY_COLORS[item.product.category] : null;
                    return (
                      <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 group">
                        {catCfg && <div className="w-1 self-stretch rounded-full shrink-0" style={{ background: catCfg.color }} />}
                        <Package size={13} className="text-white/25 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate">{item.product?.name ?? `Product #${item.productId}`}</p>
                          <p className="text-[10px] text-white/30">
                            {item.quantity} {item.product?.unit} × KSh {item.unitPriceSnapshot.toLocaleString()}
                            {item.product?.category && <span className="ml-1.5" style={{ color: catCfg?.color ?? 'rgba(255,255,255,0.3)' }}>· {item.product.category}</span>}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-emerald-400 shrink-0">KSh {item.lineTotal.toLocaleString()}</span>
                        {order.status === 'draft' && (
                          <button onClick={() => removeMutation.mutate({ orderId: order.id, itemId: item.id })}
                            className="p-1 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-white/10 bg-white/5 mt-2">
                    <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Order Total</span>
                    <span className="text-base font-extrabold text-white">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-white/20 gap-2"><Package size={28} className="opacity-30" /><p className="text-xs">No items yet</p></div>
              )}

              {order.status === 'draft' && (
                addingItem ? (
                  <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Add Item</p>
                      <button onClick={() => setAddItem(false)}><X size={14} className="text-white/30 hover:text-white" /></button>
                    </div>
                    <AddItemPanel orderId={order.id} products={products} onAdded={() => { queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); setAddItem(false); }} />
                  </div>
                ) : (
                  <button onClick={() => setAddItem(true)} className="flex items-center gap-2 text-sm text-blue-400/70 hover:text-blue-400 transition-colors px-3 py-2 rounded-xl border border-blue-500/20 hover:border-blue-500/40 w-full">
                    <Plus size={14} /> Add product to order
                  </button>
                )
              )}

              {order.notes && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-white/5">
                  <FileText size={13} className="text-white/30 shrink-0 mt-0.5" />
                  <p className="text-xs text-white/40">{order.notes}</p>
                </div>
              )}
              {order.rejectionReason && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-400">{order.rejectionReason}</p>
                </div>
              )}
              {reviewErr && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle size={13} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400">{reviewErr}</p>
                </div>
              )}

              <div className="flex items-center gap-3 flex-wrap pt-1">
                {order.status === 'draft' && order.items.length > 0 && (
                  <button onClick={() => submitMutation.mutate({ orderId: order.id })} disabled={submitMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-colors">
                    {submitMutation.isPending ? <LoadingSpinner size={14} className="p-0 text-white" /> : <Send size={14} />}
                    Submit for Approval
                  </button>
                )}
                {order.status === 'submitted' && canReview && !showReject && (
                  <>
                    <button onClick={() => reviewMutation.mutate({ orderId: order.id, data: { action: 'approve' } })} disabled={reviewMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors">
                      {reviewMutation.isPending ? <LoadingSpinner size={14} className="p-0 text-white" /> : <CheckCircle size={14} />}
                      Approve
                    </button>
                    <button onClick={() => setShowRej(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-colors">
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
              </div>

              <AnimatePresence>
                {showReject && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <Label className="text-white/50 text-xs uppercase tracking-wider">Reason for Rejection</Label>
                    <Input value={rejectReason} onChange={e => setRR(e.target.value)} placeholder="Explain why this order is rejected…" className="glass border-rose-500/30 text-white" />
                    <div className="flex gap-3">
                      <button onClick={() => reviewMutation.mutate({ orderId: order.id, data: { action: 'reject', rejectionReason: rejectReason } })}
                        disabled={!rejectReason.trim() || reviewMutation.isPending}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 transition-colors">
                        Confirm Rejection
                      </button>
                      <button onClick={() => setShowRej(false)} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Orders List (supports grouped view) ─────────────────────── */
function OrdersList({ orders, products, canReview, sectors, limits, groupBy }: {
  orders: PurchaseOrderWithDetails[];
  products: Product[];
  canReview: (o: PurchaseOrderWithDetails) => boolean;
  sectors: any[];
  limits: ApprovalLimit[];
  groupBy: 'none' | 'department' | 'category';
}) {
  if (orders.length === 0) return (
    <div className="flex flex-col items-center py-16 text-white/20 gap-2">
      <ShoppingCart size={32} className="opacity-20" />
      <p className="text-sm">No orders match the current filters</p>
    </div>
  );

  if (groupBy === 'none') {
    return (
      <div className="space-y-3">
        {orders.map(o => <OrderCard key={o.id} order={o} products={products} canReview={canReview(o)} sectors={sectors} limits={limits} />)}
      </div>
    );
  }

  if (groupBy === 'department') {
    const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));
    // Group by institution (depth 3 ancestor or PO sector itself)
    function getInstitution(sectorId: number): { id: number; name: string } {
      let cur: any = sectorMap.get(sectorId);
      while (cur && cur.depth > 3) cur = sectorMap.get(cur.parentId);
      return cur ? { id: cur.id, name: cur.name } : { id: sectorId, name: `Sector #${sectorId}` };
    }
    const groups: Record<string, { inst: { id: number; name: string }; items: PurchaseOrderWithDetails[] }> = {};
    orders.forEach(o => {
      const inst = getInstitution(o.sectorId);
      if (!groups[inst.id]) groups[inst.id] = { inst, items: [] };
      groups[inst.id].items.push(o);
    });
    return (
      <div className="space-y-6">
        {Object.values(groups).map(({ inst, items }) => (
          <div key={inst.id}>
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/8">
              <Building2 size={14} className="text-blue-400/60" />
              <span className="text-sm font-bold text-white/70">{inst.name}</span>
              <span className="text-xs text-white/25 ml-auto">{items.length} order{items.length !== 1 ? 's' : ''} · {formatCompact(items.reduce((s, o) => s + o.totalAmount, 0))}</span>
            </div>
            <div className="space-y-2">
              {items.map(o => <OrderCard key={o.id} order={o} products={products} canReview={canReview(o)} sectors={sectors} limits={limits} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // groupBy === 'category'
  const catGroups: Record<string, PurchaseOrderWithDetails[]> = {};
  orders.forEach(o => {
    const cats = [...new Set(o.items.map(i => i.product?.category).filter(Boolean) as string[])];
    if (cats.length === 0) {
      catGroups['Uncategorised'] = [...(catGroups['Uncategorised'] ?? []), o];
    } else {
      cats.forEach(cat => { catGroups[cat] = [...(catGroups[cat] ?? []), o]; });
    }
  });
  return (
    <div className="space-y-6">
      {Object.entries(catGroups).map(([cat, items]) => {
        const cfg = CATEGORY_COLORS[cat];
        return (
          <div key={cat}>
            <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/8">
              {cfg && <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cfg.color }} />}
              <span className="text-sm font-bold" style={{ color: cfg?.color ?? 'rgba(255,255,255,0.6)' }}>{cat}</span>
              <span className="text-xs text-white/25 ml-auto">{items.length} order{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2">
              {items.map(o => <OrderCard key={o.id} order={o} products={products} canReview={canReview(o)} sectors={sectors} limits={limits} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── New Order Modal ─────────────────────────────────────────── */
function NewOrderModal({ onClose, cycleId, sectors }: { onClose: () => void; cycleId: number; sectors: any[] }) {
  const { user } = useAuth();
  const [sectorId, setSectorId] = useState(user?.sectorId ?? (sectors[0]?.id ?? 0));
  const [notes, setNotes]       = useState('');
  const createMutation = useCreatePurchaseOrder({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); onClose(); } } });
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1527] p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">New Purchase Order</h3>
          <button onClick={onClose}><X size={18} className="text-white/30 hover:text-white transition-colors" /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-white/50 text-xs uppercase tracking-wider">Sector / Department</Label>
            <select value={sectorId} onChange={e => setSectorId(parseInt(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500/50">
              {sectors.map(s => <option key={s.id} value={s.id} className="bg-[#0d1527]">{'  '.repeat(s.depth ?? 0)}{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/50 text-xs uppercase tracking-wider">Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Purpose of this purchase order…" className="glass border-white/10 text-white placeholder:text-white/20" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={() => createMutation.mutate({ data: { sectorId, budgetCycleId: cycleId, notes: notes || undefined } })}
            disabled={!sectorId || createMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors">
            {createMutation.isPending ? <LoadingSpinner size={14} className="p-0 text-white" /> : <Plus size={14} />}
            Create Order
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Approval Limits Panel ───────────────────────────────────── */
function ApprovalLimitsPanel({ limits, sectors, isAdmin }: { limits: ApprovalLimit[]; sectors: any[]; isAdmin: boolean }) {
  const [editingId, setEditId]  = useState<number | null>(null);
  const [editAmt, setEditAmt]   = useState('');
  const [editNotes, setEditNot] = useState('');
  const [addSector, setAddSec]  = useState<number | null>(null);
  const [addAmt, setAddAmt]     = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [filterDepth, setFiltD] = useState<number | null>(null);

  const setMutation    = useSetApprovalLimit();
  const deleteMutation = useDeleteApprovalLimit();

  const unsetSectors   = sectors.filter(s => !limits.find(l => l.sectorId === s.id));
  const depthOptions   = [...new Set(limits.map(l => l.sector?.depth ?? 0))].sort();
  const displayed      = filterDepth !== null ? limits.filter(l => l.sector?.depth === filterDepth) : limits;
  const sorted         = [...displayed].sort((a, b) => (a.sector?.depth ?? 0) - (b.sector?.depth ?? 0) || a.sectorId - b.sectorId);

  return (
    <div className="space-y-5">
      {isAdmin && (
        <GlassCard className="p-4 space-y-3">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2"><Plus size={12} /> Set / Update Approval Limit</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-white/40 text-[10px] uppercase tracking-wider">Sector</Label>
              <select value={addSector ?? ''} onChange={e => setAddSec(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500/50">
                <option value="" className="bg-[#0d1527]">Select sector…</option>
                {unsetSectors.map(s => <option key={s.id} value={s.id} className="bg-[#0d1527]">{'  '.repeat(s.depth ?? 0)}{s.name}</option>)}
                {limits.map(l => <option key={l.sectorId} value={l.sectorId} className="bg-[#0d1527]">[Update] {'  '.repeat(l.sector?.depth ?? 0)}{l.sector?.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-white/40 text-[10px] uppercase tracking-wider">Max Approvable (KSh)</Label>
              <Input value={addAmt} onChange={e => setAddAmt(e.target.value)} placeholder="e.g. 5000000" className="h-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/40 text-[10px] uppercase tracking-wider">Notes</Label>
              <Input value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="Optional" className="h-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
            </div>
          </div>
          <button onClick={() => { if (!addSector || !addAmt) return; setMutation.mutate({ sectorId: addSector, maxApprovableAmount: parseFloat(addAmt), notes: addNotes || undefined }, { onSuccess: () => { setAddSec(null); setAddAmt(''); setAddNotes(''); } }); }}
            disabled={!addSector || !addAmt || setMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors">
            {setMutation.isPending ? <LoadingSpinner size={13} className="p-0 text-white" /> : <Save size={13} />}
            Save Limit
          </button>
        </GlassCard>
      )}

      {/* Depth filter */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setFiltD(null)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filterDepth === null ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white border border-transparent'}`}>
          All Levels
        </button>
        {depthOptions.map(d => (
          <button key={d} onClick={() => setFiltD(d)} className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filterDepth === d ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white border border-transparent'}`}>
            {DEPTH_LABELS[d] ?? `Level ${d}`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map(limit => {
          const isEditing = editingId === limit.id;
          return (
            <motion.div key={limit.id} layout className="rounded-xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center gap-4 px-4 py-3">
                <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: `hsl(${200 + (limit.sector?.depth ?? 0) * 25}, 70%, 60%)` }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{limit.sector?.name ?? `Sector #${limit.sectorId}`}</p>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/8 text-white/40">{DEPTH_LABELS[limit.sector?.depth ?? 0] ?? `Level ${limit.sector?.depth}`}</span>
                    {limit.responsibleUser && <span className="text-[9px] font-bold text-white/30 flex items-center gap-1"><Users size={9} />{limit.responsibleUser.name}</span>}
                  </div>
                  {!isEditing && <p className="text-xs text-white/30 mt-0.5">{limit.notes ?? '—'}</p>}
                  {isEditing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center gap-2">
                      <Input value={editAmt} onChange={e => setEditAmt(e.target.value)} placeholder="Amount (KSh)" className="h-7 glass border-white/10 text-white text-xs w-36" />
                      <Input value={editNotes} onChange={e => setEditNot(e.target.value)} placeholder="Notes" className="h-7 glass border-white/10 text-white text-xs flex-1" />
                    </motion.div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {!isEditing && <p className="text-sm font-bold text-emerald-400">{formatCompact(limit.maxApprovableAmount)}</p>}
                  <p className="text-[10px] text-white/30">per order</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => setMutation.mutate({ sectorId: limit.sectorId, maxApprovableAmount: parseFloat(editAmt), notes: editNotes || undefined }, { onSuccess: () => setEditId(null) })}
                          disabled={!editAmt || setMutation.isPending}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40"><Save size={12} /></button>
                        <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white transition-colors"><X size={12} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(limit.id); setEditAmt(String(limit.maxApprovableAmount)); setEditNot(limit.notes ?? ''); }}
                          className="p-1.5 rounded-lg hover:bg-white/8 text-white/20 hover:text-white transition-colors"><Edit2 size={12} /></button>
                        <button onClick={() => deleteMutation.mutate(limit.id)} disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center py-12 text-white/20 gap-2"><Shield size={28} className="opacity-30" /><p className="text-xs">No limits configured for this level</p></div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function ProcurementPage() {
  const { user, isSuperAdmin, isCeo, isMinistryHead, isDepartmentHead } = useAuth();
  const canCreate = user?.role !== 'viewer';
  const isAdmin   = isSuperAdmin || isCeo;
  const canReview = isSuperAdmin || isCeo || isMinistryHead || isDepartmentHead;

  const [tab, setTab]         = useState<'orders' | 'queue' | 'limits'>('orders');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showFilter, setSF]   = useState(false);
  const [groupBy, setGroupBy] = useState<'none' | 'department' | 'category'>('none');
  const [showNew, setShowNew] = useState(false);

  const { data: cycle }                  = useGetActiveCycle();
  const { data: orders = [], isLoading } = useListPurchaseOrders({}, { query: { queryKey: ['purchase-orders'], staleTime: 15000 } });
  const { data: products = [] }          = useListProducts({}, { query: { queryKey: ['products'], staleTime: 60000 } });
  const { data: sectors  = [] }          = useListSectors({ query: { queryKey: ['sectors'], staleTime: 60000 } });
  const { data: limits   = [] }          = useApprovalLimits();

  const canUserApprove = useCallback((o: PurchaseOrderWithDetails) => canUserApproveOrder(user, o, sectors, limits), [user, sectors, limits]);

  const myQueueAll   = useMemo(() => orders.filter(o => canUserApproveOrder(user, o, sectors, limits)), [orders, user, sectors, limits]);
  const myQueueCount = myQueueAll.length;

  // Reversed (newest first) for display
  const ordersReversed = useMemo(() => [...orders].reverse(), [orders]);

  // Apply filters to all orders and queue separately
  const filteredOrders = useMemo(() => applyFilters(ordersReversed, filters, sectors), [ordersReversed, filters, sectors]);
  const filteredQueue  = useMemo(() => applyFilters(myQueueAll, filters, sectors), [myQueueAll, filters, sectors]);

  const counts = useMemo(() => {
    const c = { all: orders.length, draft: 0, submitted: 0, approved: 0, rejected: 0 };
    orders.forEach(o => { (c as any)[o.status] = ((c as any)[o.status] ?? 0) + 1; });
    return c;
  }, [orders]);

  const totalApproved = useMemo(() => orders.filter(o => o.status === 'approved').reduce((s, o) => s + o.totalAmount, 0), [orders]);
  const fCount        = activeFilterCount(filters);

  const TAB_ITEMS = [
    { id: 'orders' as const, label: 'All Orders',      icon: ShoppingCart, count: counts.all },
    ...(canReview ? [{ id: 'queue' as const, label: 'My Queue', icon: CheckSquare, count: myQueueCount, alert: myQueueCount > 0 }] : []),
    ...(isAdmin   ? [{ id: 'limits' as const, label: 'Approval Limits', icon: Settings, count: limits.length }] : []),
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart size={22} className="text-emerald-400" /> Procurement
          </h1>
          <p className="text-white/30 text-sm mt-1">Purchase orders & approval workflow · {cycle?.name ?? 'No active cycle'}</p>
        </div>
        {canCreate && cycle && (
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors">
            <Plus size={15} /> New Purchase Order
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders',        value: counts.all,               color: '#64748b' },
          { label: 'Pending Review',       value: counts.submitted,          color: '#f59e0b' },
          { label: 'Approved',             value: counts.approved,           color: '#10b981' },
          { label: 'Total Approved Spend', value: formatCompact(totalApproved), color: '#6366f1' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/30">{label}</p>
            <p className="text-lg font-extrabold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 w-fit">
        {TAB_ITEMS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t.id ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'}`}>
            <t.icon size={14} />
            {t.label}
            {(t as any).alert && t.count > 0
              ? <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center">{t.count}</span>
              : <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${tab === t.id ? 'bg-white/20' : 'bg-white/8 text-white/30'}`}>{t.count}</span>
            }
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">

        {/* ── Orders & Queue tabs share filters ── */}
        {(tab === 'orders' || tab === 'queue') && (
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

            {/* Filter toolbar */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                  <Input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    placeholder="Search orders, sectors, products…"
                    className="pl-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
                  {filters.search && (
                    <button onClick={() => setFilters(f => ({ ...f, search: '' }))} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Status pills */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 flex-wrap">
                  {(['all', 'draft', 'submitted', 'approved', 'rejected'] as const).map(s => {
                    const cfg = s === 'all' ? null : STATUS_CFG[s];
                    return (
                      <button key={s} onClick={() => setFilters(f => ({ ...f, status: s }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${filters.status === s ? 'text-white bg-white/15' : 'text-white/30 hover:text-white'}`}
                        style={filters.status === s && cfg ? { color: cfg.color } : undefined}>
                        {s === 'all' ? `All (${counts.all})` : `${cfg!.label} (${counts[s]})`}
                      </button>
                    );
                  })}
                </div>

                {/* Filter toggle */}
                <button onClick={() => setSF(v => !v)}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold border transition-colors ${showFilter ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : 'text-white/50 border-white/10 hover:text-white hover:border-white/20'}`}>
                  <SlidersHorizontal size={14} />
                  Filters
                  {fCount > 0 && (
                    <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                      {fCount}
                    </span>
                  )}
                </button>

                {/* Group by */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                  {([
                    { id: 'none'       as const, icon: LayoutList,  title: 'List' },
                    { id: 'department' as const, icon: Building2,   title: 'By Dept' },
                    { id: 'category'   as const, icon: Tag,         title: 'By Category' },
                  ]).map(g => (
                    <button key={g.id} onClick={() => setGroupBy(g.id)} title={g.title}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${groupBy === g.id ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white'}`}>
                      <g.icon size={13} />
                      <span className="hidden sm:inline">{g.title}</span>
                    </button>
                  ))}
                </div>

                {/* Clear all */}
                {fCount > 0 && (
                  <button onClick={() => setFilters(EMPTY_FILTERS)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-400/70 hover:text-rose-400 border border-rose-500/20 hover:border-rose-500/40 transition-colors">
                    <X size={12} /> Clear all
                  </button>
                )}
              </div>

              {/* Collapsible filter panel */}
              <AnimatePresence>
                {showFilter && (
                  <FilterPanel
                    filters={filters}
                    onChange={setFilters}
                    sectors={sectors}
                    orders={ordersReversed}
                  />
                )}
              </AnimatePresence>

              {/* Active filter pills */}
              {(filters.sectorId || filters.categories.length > 0 || filters.amtMin || filters.amtMax) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {filters.sectorId && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/25">
                      <Network size={10} />
                      {sectors.find((s: any) => s.id === filters.sectorId)?.name ?? `Sector #${filters.sectorId}`}
                      <button onClick={() => setFilters(f => ({ ...f, sectorId: null }))}><X size={10} /></button>
                    </span>
                  )}
                  {filters.categories.map(cat => {
                    const cfg = CATEGORY_COLORS[cat];
                    return (
                      <span key={cat} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border"
                        style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                        {cat}
                        <button onClick={() => setFilters(f => ({ ...f, categories: f.categories.filter(c => c !== cat) }))}><X size={10} /></button>
                      </span>
                    );
                  })}
                  {(filters.amtMin || filters.amtMax) && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                      <DollarSign size={10} />
                      {filters.amtMin ? `≥ ${formatCompact(parseFloat(filters.amtMin))}` : ''}{filters.amtMin && filters.amtMax ? ' – ' : ''}{filters.amtMax ? `≤ ${formatCompact(parseFloat(filters.amtMax))}` : ''}
                      <button onClick={() => setFilters(f => ({ ...f, amtMin: '', amtMax: '' }))}><X size={10} /></button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Result count */}
            {fCount > 0 && (
              <p className="text-xs text-white/30">
                Showing {tab === 'orders' ? filteredOrders.length : filteredQueue.length} of {tab === 'orders' ? ordersReversed.length : myQueueAll.length} orders
              </p>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner size={32} /></div>
            ) : tab === 'orders' ? (
              <OrdersList orders={filteredOrders} products={products} canReview={canUserApprove} sectors={sectors} limits={limits} groupBy={groupBy} />
            ) : (
              /* My Queue */
              filteredQueue.length === 0 ? (
                <div className="flex flex-col items-center py-20 text-white/20 gap-3">
                  <CheckSquare size={36} className="opacity-20" />
                  <p className="text-sm font-semibold">{fCount > 0 ? 'No results match filters' : 'Your queue is clear'}</p>
                  <p className="text-xs text-white/15">{fCount > 0 ? 'Try adjusting your filters' : 'No purchase orders are awaiting your approval right now'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <p className="text-xs text-amber-400 font-bold">
                      {filteredQueue.length} order{filteredQueue.length !== 1 ? 's' : ''} awaiting your approval
                      {fCount > 0 ? ` (filtered from ${myQueueAll.length})` : ''}
                    </p>
                  </div>
                  <OrdersList orders={filteredQueue} products={products} canReview={() => true} sectors={sectors} limits={limits} groupBy={groupBy} />
                </div>
              )
            )}
          </motion.div>
        )}

        {tab === 'limits' && isAdmin && (
          <motion.div key="limits" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ApprovalLimitsPanel limits={limits} sectors={sectors} isAdmin={isAdmin} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNew && cycle && (
          <NewOrderModal onClose={() => setShowNew(false)} cycleId={cycle.id} sectors={sectors} />
        )}
      </AnimatePresence>
    </div>
  );
}
