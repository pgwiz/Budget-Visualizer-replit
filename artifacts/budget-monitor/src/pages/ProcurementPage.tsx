import { useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  ShoppingCart, Plus, Search, Trash2, Send, CheckCircle, XCircle,
  Clock, FileText, ChevronDown, ChevronRight, Package, AlertTriangle,
  Building2, X, Filter, Shield, Edit2, Save, TrendingUp, Users,
  ArrowUpRight, CheckSquare, Settings, Layers,
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

/* ── Helpers ─────────────────────────────────────────────────── */
const STATUS_CFG = {
  draft:     { label: 'Draft',     color: '#64748b', bg: 'rgba(100,116,139,0.12)', icon: FileText },
  submitted: { label: 'Submitted', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  icon: Clock },
  approved:  { label: 'Approved',  color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle },
  rejected:  { label: 'Rejected',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle },
} as const;

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'System Administrator', ceo: 'Director General',
  ministry_head: 'Principal', department_head: 'HOD', viewer: 'Viewer',
};

const DEPTH_LABELS = ['National', 'Ministry', 'Authority', 'Institution', 'School', 'Dept'];

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d as string).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Custom hooks for approval limits ────────────────────────── */
function useApprovalLimits() {
  return useQuery<ApprovalLimit[]>({
    queryKey: ['approval-limits'],
    queryFn: async () => {
      const r = await fetch('/api/approval-limits');
      if (!r.ok) throw new Error('Failed to load');
      return r.json();
    },
    staleTime: 30000,
  });
}

function useSetApprovalLimit() {
  return useMutation({
    mutationFn: async (data: { sectorId: number; maxApprovableAmount: number; notes?: string }) => {
      const r = await fetch('/api/approval-limits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
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
      const r = await fetch(`/api/approval-limits/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Failed');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['approval-limits'] }),
  });
}

/* ── Approval routing helper ─────────────────────────────────── */
function getRequiredApprover(
  poSectorId: number,
  poAmount: number,
  sectors: any[],
  limits: ApprovalLimit[],
): { sector: any; limit: number } | null {
  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));
  const limitMap  = new Map(limits.map(l => [l.sectorId, l]));

  const poSector = sectorMap.get(poSectorId);
  if (!poSector?.parentId) return null;

  let currentId: number | null = poSector.parentId;
  while (currentId) {
    const sector = sectorMap.get(currentId);
    if (!sector) break;
    const lim = limitMap.get(sector.id);
    if (lim && lim.maxApprovableAmount >= poAmount) {
      return { sector, limit: lim.maxApprovableAmount };
    }
    currentId = sector.parentId ?? null;
  }
  return null;
}

function canUserApproveOrder(
  user: any,
  order: PurchaseOrderWithDetails,
  sectors: any[],
  limits: ApprovalLimit[],
): boolean {
  if (!user) return false;
  if (['super_admin', 'ceo'].includes(user.role)) return order.status === 'submitted';
  if (!user.sectorId) return false;
  if (order.status !== 'submitted') return false;
  if (order.sectorId === user.sectorId) return false;

  // Must be ancestor
  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));
  let cur: number | null = (sectorMap.get(order.sectorId) as any)?.parentId ?? null;
  let isDesc = false;
  while (cur) {
    if (cur === user.sectorId) { isDesc = true; break; }
    cur = (sectorMap.get(cur) as any)?.parentId ?? null;
  }
  if (!isDesc) return false;

  // Must have enough limit
  const lim = limits.find(l => l.sectorId === user.sectorId);
  if (!lim) return false;
  return lim.maxApprovableAmount >= order.totalAmount;
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

  const filtered = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    : products;

  const selected = products.find(p => p.id === selectedId);
  const lineTotal = selected && parseFloat(qty) > 0 ? selected.unitPrice * parseFloat(qty) : 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <Input value={search} onChange={e => { setSearch(e.target.value); setSelId(null); }}
          placeholder="Search products..." className="pl-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
      </div>
      <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
        {filtered.map(p => (
          <button key={p.id} onClick={() => setSelId(p.id === selectedId ? null : p.id)}
            className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              selectedId === p.id ? 'bg-blue-500/20 border border-blue-500/40' : 'bg-white/5 hover:bg-white/8 border border-transparent'}`}>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{p.name}</p>
              <p className="text-white/30 text-[10px]">{p.category} · per {p.unit}</p>
            </div>
            <span className="text-emerald-400 text-xs font-bold shrink-0">KSh {p.unitPrice.toLocaleString()}</span>
          </button>
        ))}
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
  const required = getRequiredApprover(order.sectorId, order.totalAmount, sectors, limits);

  if (!required) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
        style={{ color: '#fbbf24', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
        <Shield size={10} /> Awaiting DG / Admin
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold"
      style={{ color: '#60a5fa', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
      <ArrowUpRight size={10} />
      Awaiting {required.sector.name}
    </div>
  );
}

/* ── Order Card ──────────────────────────────────────────────── */
function OrderCard({
  order, products, canReview, sectors, limits,
}: { order: PurchaseOrderWithDetails; products: Product[]; canReview: boolean; sectors: any[]; limits: ApprovalLimit[] }) {
  const [expanded, setExpanded]  = useState(order.status === 'draft');
  const [addingItem, setAddItem] = useState(false);
  const [rejectReason, setRR]    = useState('');
  const [showReject, setShowRej] = useState(false);
  const [reviewErr, setRevErr]   = useState('');

  const cfg = STATUS_CFG[order.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.draft;

  const removeMutation = useRemoveOrderItem({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }) } });
  const submitMutation = useSubmitPurchaseOrder({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }),
      onError: (e: any) => setRevErr(e?.response?.data?.message ?? e?.message ?? 'Submission failed'),
    }
  });
  const reviewMutation = useReviewPurchaseOrder({
    mutation: {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); setShowRej(false); setRevErr(''); },
      onError: (e: any) => setRevErr(e?.response?.data?.message ?? e?.message ?? 'Review failed'),
    }
  });

  return (
    <motion.div layout className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
          <cfg.icon size={15} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">PO-{String(order.id).padStart(4, '0')}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border"
              style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
              {cfg.label}
            </span>
            <ApproverBadge order={order} sectors={sectors} limits={limits} />
          </div>
          <p className="text-xs text-white/40 mt-0.5 truncate">
            {order.sector?.name ?? `Sector #${order.sectorId}`} · {fmtDate(order.createdAt)} · {order.createdByUser?.name}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-white">{formatCompact(order.totalAmount)}</p>
          <p className="text-[10px] text-white/30">{order.items.length} items</p>
        </div>
        {expanded ? <ChevronDown size={15} className="text-white/30 shrink-0" /> : <ChevronRight size={15} className="text-white/30 shrink-0" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-5 space-y-4 border-t border-white/8">
              {/* Approval route info for submitted POs */}
              {order.status === 'submitted' && (
                <ApprovalRouteInfo order={order} sectors={sectors} limits={limits} />
              )}

              {/* Items */}
              {order.items.length > 0 ? (
                <div className="mt-4 space-y-1.5">
                  {order.items.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 group">
                      <Package size={13} className="text-white/25 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{item.product?.name ?? `Product #${item.productId}`}</p>
                        <p className="text-[10px] text-white/30">{item.quantity} {item.product?.unit} × KSh {item.unitPriceSnapshot.toLocaleString()}</p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 shrink-0">KSh {item.lineTotal.toLocaleString()}</span>
                      {order.status === 'draft' && (
                        <button onClick={() => removeMutation.mutate({ orderId: order.id, itemId: item.id })}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </motion.div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-white/10 bg-white/5 mt-2">
                    <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Order Total</span>
                    <span className="text-base font-extrabold text-white">{formatCurrency(order.totalAmount)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-8 text-white/20 gap-2">
                  <Package size={28} className="opacity-30" />
                  <p className="text-xs">No items yet — add products below</p>
                </div>
              )}

              {order.status === 'draft' && (
                <>
                  {addingItem ? (
                    <div className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Add Item</p>
                        <button onClick={() => setAddItem(false)}><X size={14} className="text-white/30 hover:text-white" /></button>
                      </div>
                      <AddItemPanel orderId={order.id} products={products} onAdded={() => { queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); setAddItem(false); }} />
                    </div>
                  ) : (
                    <button onClick={() => setAddItem(true)}
                      className="flex items-center gap-2 text-sm text-blue-400/70 hover:text-blue-400 transition-colors px-3 py-2 rounded-xl border border-blue-500/20 hover:border-blue-500/40 w-full">
                      <Plus size={14} /> Add product to order
                    </button>
                  )}
                </>
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
                    <button onClick={() => setShowRej(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-colors">
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
              </div>

              <AnimatePresence>
                {showReject && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <Label className="text-white/50 text-xs uppercase tracking-wider">Reason for Rejection</Label>
                    <Input value={rejectReason} onChange={e => setRR(e.target.value)} placeholder="Explain why this order is rejected..." className="glass border-rose-500/30 text-white" />
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

/* ── Approval Route Info ─────────────────────────────────────── */
function ApprovalRouteInfo({ order, sectors, limits }: { order: PurchaseOrderWithDetails; sectors: any[]; limits: ApprovalLimit[] }) {
  const chain: { sectorId: number; name: string; limit: number | null; canApprove: boolean }[] = [];
  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));
  const limitMap  = new Map(limits.map(l => [l.sectorId, l]));

  // Walk ancestor chain from PO's sector upward
  const poSector = sectorMap.get(order.sectorId);
  let curId: number | null = poSector?.parentId ?? null;
  while (curId) {
    const sec = sectorMap.get(curId);
    if (!sec) break;
    const lim = limitMap.get(sec.id);
    chain.push({
      sectorId: sec.id,
      name: sec.name,
      limit: lim ? lim.maxApprovableAmount : null,
      canApprove: !!(lim && lim.maxApprovableAmount >= order.totalAmount),
    });
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
            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
              c.canApprove && c.sectorId === approver?.sectorId
                ? 'text-amber-400 border-amber-500/40 bg-amber-500/15'
                : 'text-white/30 border-white/10 bg-white/5'
            }`}>
              {c.name}
              {c.limit !== null ? ` (up to ${formatCompact(c.limit)})` : ' (no limit set)'}
              {c.canApprove && c.sectorId === approver?.sectorId && ' ✓'}
            </div>
            {i < chain.length - 1 && <ChevronRight size={11} className="text-white/20 shrink-0" />}
          </div>
        ))}
        {chain.length === 0 && (
          <p className="text-xs text-white/30">CEO / System Administrator must approve</p>
        )}
      </div>
    </div>
  );
}

/* ── New Order Modal ─────────────────────────────────────────── */
function NewOrderModal({ onClose, cycleId, sectors }: { onClose: () => void; cycleId: number; sectors: any[] }) {
  const { user } = useAuth();
  const [sectorId, setSectorId] = useState(user?.sectorId ?? (sectors[0]?.id ?? 0));
  const [notes, setNotes]       = useState('');

  const createMutation = useCreatePurchaseOrder({
    mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); onClose(); } }
  });

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
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Purpose of this purchase order..."
              className="glass border-white/10 text-white placeholder:text-white/20" />
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

  const sectorMap = new Map(sectors.map((s: any) => [s.id, s]));

  // Sectors not yet in limits
  const unsetSectors = sectors.filter(s => !limits.find(l => l.sectorId === s.id));

  const displayed = filterDepth !== null ? limits.filter(l => l.sector?.depth === filterDepth) : limits;
  const sorted = [...displayed].sort((a, b) => (a.sector?.depth ?? 0) - (b.sector?.depth ?? 0) || a.sectorId - b.sectorId);

  const depthOptions = [...new Set(limits.map(l => l.sector?.depth ?? 0))].sort();

  return (
    <div className="space-y-5">
      {/* Add new limit */}
      {isAdmin && (
        <GlassCard className="p-4 space-y-3">
          <p className="text-xs font-bold text-white/50 uppercase tracking-wider flex items-center gap-2">
            <Plus size={12} /> Set New Approval Limit
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-white/40 text-[10px] uppercase tracking-wider">Sector</Label>
              <select value={addSector ?? ''} onChange={e => setAddSec(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full h-9 px-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500/50">
                <option value="" className="bg-[#0d1527]">Select sector…</option>
                {unsetSectors.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0d1527]">{'  '.repeat(s.depth ?? 0)}{s.name}</option>
                ))}
                {limits.map(l => (
                  <option key={l.sectorId} value={l.sectorId} className="bg-[#0d1527]">[Update] {'  '.repeat(l.sector?.depth ?? 0)}{l.sector?.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-white/40 text-[10px] uppercase tracking-wider">Max Approvable (KSh)</Label>
              <Input value={addAmt} onChange={e => setAddAmt(e.target.value)} placeholder="e.g. 5000000"
                className="h-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
            </div>
            <div className="space-y-1">
              <Label className="text-white/40 text-[10px] uppercase tracking-wider">Notes</Label>
              <Input value={addNotes} onChange={e => setAddNotes(e.target.value)} placeholder="Optional note"
                className="h-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
            </div>
          </div>
          <button
            onClick={() => { if (!addSector || !addAmt) return; setMutation.mutate({ sectorId: addSector, maxApprovableAmount: parseFloat(addAmt), notes: addNotes || undefined }, { onSuccess: () => { setAddSec(null); setAddAmt(''); setAddNotes(''); } }); }}
            disabled={!addSector || !addAmt || setMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors">
            {setMutation.isPending ? <LoadingSpinner size={13} className="p-0 text-white" /> : <Save size={13} />}
            Save Limit
          </button>
        </GlassCard>
      )}

      {/* Depth filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <button onClick={() => setFiltD(null)}
          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filterDepth === null ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white border border-transparent'}`}>
          All Levels
        </button>
        {depthOptions.map(d => (
          <button key={d} onClick={() => setFiltD(d)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${filterDepth === d ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white border border-transparent'}`}>
            {DEPTH_LABELS[d] ?? `Level ${d}`}
          </button>
        ))}
      </div>

      {/* Limits table */}
      <div className="space-y-2">
        {sorted.map(limit => {
          const isEditing = editingId === limit.id;
          const depthLabel = DEPTH_LABELS[limit.sector?.depth ?? 0] ?? `Level ${limit.sector?.depth}`;
          return (
            <motion.div key={limit.id} layout className="rounded-xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="flex items-center gap-4 px-4 py-3">
                {/* Depth indicator */}
                <div className="w-1.5 self-stretch rounded-full shrink-0" style={{ background: `hsl(${200 + (limit.sector?.depth ?? 0) * 25}, 70%, 60%)` }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{limit.sector?.name ?? `Sector #${limit.sectorId}`}</p>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/8 text-white/40">{depthLabel}</span>
                    {limit.responsibleUser && (
                      <span className="text-[9px] font-bold text-white/30 flex items-center gap-1">
                        <Users size={9} /> {limit.responsibleUser.name}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <p className="text-xs text-white/30 mt-0.5">{limit.notes ?? '—'}</p>
                  )}
                  {isEditing && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 flex items-center gap-2">
                      <Input value={editAmt} onChange={e => setEditAmt(e.target.value)} placeholder="Amount (KSh)"
                        className="h-7 glass border-white/10 text-white text-xs w-36" />
                      <Input value={editNotes} onChange={e => setEditNot(e.target.value)} placeholder="Notes"
                        className="h-7 glass border-white/10 text-white text-xs flex-1" />
                    </motion.div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {!isEditing && (
                    <p className="text-sm font-bold text-emerald-400">{formatCompact(limit.maxApprovableAmount)}</p>
                  )}
                  <p className="text-[10px] text-white/30">per order</p>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    {isEditing ? (
                      <>
                        <button onClick={() => {
                          setMutation.mutate({ sectorId: limit.sectorId, maxApprovableAmount: parseFloat(editAmt), notes: editNotes || undefined }, { onSuccess: () => setEditId(null) });
                        }} disabled={!editAmt || setMutation.isPending}
                          className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors disabled:opacity-40">
                          <Save size={12} />
                        </button>
                        <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white transition-colors">
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(limit.id); setEditAmt(String(limit.maxApprovableAmount)); setEditNot(limit.notes ?? ''); }}
                          className="p-1.5 rounded-lg hover:bg-white/8 text-white/20 hover:text-white transition-colors">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => deleteMutation.mutate(limit.id)} disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-colors">
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        {sorted.length === 0 && (
          <div className="flex flex-col items-center py-12 text-white/20 gap-2">
            <Shield size={28} className="opacity-30" />
            <p className="text-xs">No approval limits configured for this level</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── My Approval Queue ───────────────────────────────────────── */
function MyQueuePanel({ orders, products, sectors, limits }: {
  orders: PurchaseOrderWithDetails[]; products: Product[]; sectors: any[]; limits: ApprovalLimit[];
}) {
  const { user } = useAuth();
  const myQueue = useMemo(() =>
    orders.filter(o => canUserApproveOrder(user, o, sectors, limits)),
    [orders, user, sectors, limits]
  );

  if (myQueue.length === 0) {
    return (
      <div className="flex flex-col items-center py-20 text-white/20 gap-3">
        <CheckSquare size={36} className="opacity-20" />
        <p className="text-sm font-semibold">Your queue is clear</p>
        <p className="text-xs text-white/15">No purchase orders are awaiting your approval right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <p className="text-xs text-amber-400 font-bold">{myQueue.length} order{myQueue.length !== 1 ? 's' : ''} awaiting your approval</p>
      </div>
      {myQueue.map(order => (
        <OrderCard key={order.id} order={order} products={products} canReview sectors={sectors} limits={limits} />
      ))}
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function ProcurementPage() {
  const { user, isSuperAdmin, isCeo, isMinistryHead, isDepartmentHead } = useAuth();
  const canCreate = user?.role !== 'viewer';
  const isAdmin   = isSuperAdmin || isCeo;

  const [tab, setTab]         = useState<'orders' | 'queue' | 'limits'>('orders');
  const [search, setSearch]   = useState('');
  const [statusFilter, setSF] = useState<string>('all');
  const [showNew, setShowNew] = useState(false);

  const { data: cycle }                = useGetActiveCycle();
  const { data: orders = [], isLoading } = useListPurchaseOrders({}, { query: { queryKey: ['purchase-orders'], staleTime: 15000 } });
  const { data: products = [] }        = useListProducts({}, { query: { queryKey: ['products'], staleTime: 60000 } });
  const { data: sectors  = [] }        = useListSectors({ query: { queryKey: ['sectors'], staleTime: 60000 } });
  const { data: limits   = [] }        = useApprovalLimits();

  const canReview = isSuperAdmin || isCeo || isMinistryHead || isDepartmentHead;

  const myQueueCount = useMemo(() =>
    orders.filter(o => canUserApproveOrder(user, o, sectors, limits)).length,
    [orders, user, sectors, limits]
  );

  const filtered = useMemo(() => {
    let list = [...orders].reverse();
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (search) list = list.filter(o =>
      o.sector?.name?.toLowerCase().includes(search.toLowerCase()) || String(o.id).includes(search)
    );
    return list;
  }, [orders, statusFilter, search]);

  const counts = useMemo(() => {
    const c = { all: orders.length, draft: 0, submitted: 0, approved: 0, rejected: 0 };
    orders.forEach(o => { (c as any)[o.status] = ((c as any)[o.status] ?? 0) + 1; });
    return c;
  }, [orders]);

  const totalApproved = useMemo(() => orders.filter(o => o.status === 'approved').reduce((s, o) => s + o.totalAmount, 0), [orders]);

  const TAB_ITEMS = [
    { id: 'orders' as const, label: 'All Orders', icon: ShoppingCart, count: counts.all },
    ...(canReview ? [{ id: 'queue' as const, label: 'My Queue', icon: CheckSquare, count: myQueueCount, alert: myQueueCount > 0 }] : []),
    ...(isAdmin ? [{ id: 'limits' as const, label: 'Approval Limits', icon: Settings, count: limits.length }] : []),
  ];

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShoppingCart size={22} className="text-emerald-400" />
            Procurement
          </h1>
          <p className="text-white/30 text-sm mt-1">
            Purchase orders & approval workflow · {cycle?.name ?? 'No active cycle'}
          </p>
        </div>
        {canCreate && cycle && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors">
            <Plus size={15} /> New Purchase Order
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders',       value: counts.all,                   color: '#64748b' },
          { label: 'Pending Review',      value: counts.submitted,              color: '#f59e0b' },
          { label: 'Approved',            value: counts.approved,               color: '#10b981' },
          { label: 'Total Approved Spend',value: formatCompact(totalApproved),  color: '#6366f1' },
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
            className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'text-white/40 hover:text-white'}`}>
            <t.icon size={14} />
            {t.label}
            {(t as any).alert && t.count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                {t.count}
              </span>
            )}
            {!((t as any).alert) && t.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${tab === t.id ? 'bg-white/20' : 'bg-white/8 text-white/30'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'orders' && (
          <motion.div key="orders" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Filter bar */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders or sectors..."
                  className="pl-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                {(['all', 'draft', 'submitted', 'approved', 'rejected'] as const).map(s => {
                  const cfg = s === 'all' ? null : STATUS_CFG[s];
                  return (
                    <button key={s} onClick={() => setSF(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${statusFilter === s ? 'text-white bg-white/15' : 'text-white/30 hover:text-white'}`}
                      style={statusFilter === s && cfg ? { color: cfg.color } : undefined}>
                      {s === 'all' ? `All (${counts.all})` : `${cfg!.label} (${counts[s]})`}
                    </button>
                  );
                })}
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16"><LoadingSpinner size={32} /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-white/20 gap-2">
                <ShoppingCart size={32} className="opacity-20" />
                <p className="text-sm">No orders found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(order => (
                  <OrderCard key={order.id} order={order} products={products} canReview={canReview && canUserApproveOrder(user, order, sectors, limits)} sectors={sectors} limits={limits} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {tab === 'queue' && (
          <motion.div key="queue" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <MyQueuePanel orders={orders} products={products} sectors={sectors} limits={limits} />
          </motion.div>
        )}

        {tab === 'limits' && isAdmin && (
          <motion.div key="limits" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ApprovalLimitsPanel limits={limits} sectors={sectors} isAdmin={isAdmin} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* New order modal */}
      <AnimatePresence>
        {showNew && cycle && (
          <NewOrderModal onClose={() => setShowNew(false)} cycleId={cycle.id} sectors={sectors} />
        )}
      </AnimatePresence>
    </div>
  );
}
