import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useListPurchaseOrders, useCreatePurchaseOrder, useListProducts,
  useAddOrderItem, useRemoveOrderItem, useSubmitPurchaseOrder, useReviewPurchaseOrder,
  useGetActiveCycle,
} from '@workspace/api-client-react';
import { queryClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  ShoppingCart, Plus, Search, Trash2, Send, CheckCircle, XCircle,
  Clock, FileText, ChevronDown, ChevronRight, Package, AlertTriangle,
  Building2, X, Filter,
} from 'lucide-react';
import type { PurchaseOrderWithDetails, Product } from '@workspace/api-client-react';
import { formatCurrency, formatCompact } from '@/lib/api';
import { useListSectors } from '@workspace/api-client-react';

/* ── Helpers ─────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  draft:     { label: 'Draft',     color: '#64748b', icon: FileText,     bg: 'rgba(100,116,139,0.12)' },
  submitted: { label: 'Submitted', color: '#f59e0b', icon: Clock,        bg: 'rgba(245,158,11,0.12)' },
  approved:  { label: 'Approved',  color: '#10b981', icon: CheckCircle,  bg: 'rgba(16,185,129,0.12)' },
  rejected:  { label: 'Rejected',  color: '#ef4444', icon: XCircle,      bg: 'rgba(239,68,68,0.12)' },
} as const;

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  return new Date(d as string).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ── Add Item Panel ──────────────────────────────────────────── */
function AddItemPanel({ orderId, products, onAdded }: { orderId: number; products: Product[]; onAdded: () => void }) {
  const [search, setSearch]     = useState('');
  const [selectedId, setSelId]  = useState<number | null>(null);
  const [qty, setQty]           = useState('1');

  const addMutation = useAddOrderItem({
    mutation: { onSuccess: () => { onAdded(); setSelId(null); setQty('1'); setSearch(''); } }
  });

  const categories = [...new Set(products.map(p => p.category))].sort();
  const filtered   = search
    ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
    : products;

  const selected = products.find(p => p.id === selectedId);
  const lineTotal = selected && parseFloat(qty) > 0 ? selected.unitPrice * parseFloat(qty) : 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
        <Input
          value={search}
          onChange={e => { setSearch(e.target.value); setSelId(null); }}
          placeholder="Search products..."
          className="pl-9 glass border-white/10 text-white text-sm placeholder:text-white/20"
        />
      </div>

      <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => setSelId(p.id === selectedId ? null : p.id)}
            className={`w-full text-left flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
              selectedId === p.id ? 'bg-blue-500/20 border border-blue-500/40' : 'bg-white/5 hover:bg-white/8 border border-transparent'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{p.name}</p>
              <p className="text-white/30 text-[10px]">{p.category} · per {p.unit}</p>
            </div>
            <span className="text-emerald-400 text-xs font-bold shrink-0">
              KSh {p.unitPrice.toLocaleString()}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-white/20 text-sm py-6">No products found</p>
        )}
      </div>

      {selected && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">{selected.name}</p>
            <span className="text-xs text-white/40">× {qty} {selected.unit} = <strong className="text-emerald-400">KSh {lineTotal.toLocaleString()}</strong></span>
          </div>
          <div className="flex gap-3">
            <Input
              type="number" min="0.01" step="0.01"
              value={qty} onChange={e => setQty(e.target.value)}
              placeholder="Qty"
              className="glass border-white/10 text-white text-sm w-28"
            />
            <button
              onClick={() => addMutation.mutate({ orderId, data: { productId: selected.id, quantity: parseFloat(qty) } })}
              disabled={!parseFloat(qty) || addMutation.isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors"
            >
              {addMutation.isPending ? <LoadingSpinner size={14} className="p-0 text-white" /> : <Plus size={14} />}
              Add to Order
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ── Order Detail Card ───────────────────────────────────────── */
function OrderCard({ order, products, canReview }: { order: PurchaseOrderWithDetails; products: Product[]; canReview: boolean }) {
  const [expanded, setExpanded]   = useState(order.status === 'draft');
  const [addingItem, setAddItem]  = useState(false);
  const [rejectReason, setRR]     = useState('');
  const [showReject, setShowRej]  = useState(false);

  const cfg = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.draft;

  const removeMutation   = useRemoveOrderItem({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }) } });
  const submitMutation   = useSubmitPurchaseOrder({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }) } });
  const reviewMutation   = useReviewPurchaseOrder({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['purchase-orders'] }); setShowRej(false); } } });

  return (
    <motion.div layout className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/5 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
          <cfg.icon size={15} style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">PO-{String(order.id).padStart(4, '0')}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border" style={{ color: cfg.color, background: cfg.bg, borderColor: `${cfg.color}30` }}>
              {cfg.label}
            </span>
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

      {/* Expanded body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 space-y-4 border-t border-white/8">
              {/* Items table */}
              {order.items.length > 0 ? (
                <div className="mt-4 space-y-1.5">
                  {order.items.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 group"
                    >
                      <Package size={13} className="text-white/25 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{item.product?.name ?? `Product #${item.productId}`}</p>
                        <p className="text-[10px] text-white/30">
                          {item.quantity} {item.product?.unit} × KSh {item.unitPriceSnapshot.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-emerald-400 shrink-0">
                        KSh {item.lineTotal.toLocaleString()}
                      </span>
                      {order.status === 'draft' && (
                        <button
                          onClick={() => removeMutation.mutate({ orderId: order.id, itemId: item.id })}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-white/20 hover:text-rose-400 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </motion.div>
                  ))}

                  {/* Total row */}
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

              {/* Add item panel (draft only) */}
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
                    <button
                      onClick={() => setAddItem(true)}
                      className="flex items-center gap-2 text-sm text-blue-400/70 hover:text-blue-400 transition-colors px-3 py-2 rounded-xl border border-blue-500/20 hover:border-blue-500/40 w-full"
                    >
                      <Plus size={14} /> Add product to order
                    </button>
                  )}
                </>
              )}

              {/* Notes */}
              {order.notes && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-white/5">
                  <FileText size={13} className="text-white/30 shrink-0 mt-0.5" />
                  <p className="text-xs text-white/40">{order.notes}</p>
                </div>
              )}

              {/* Rejection reason */}
              {order.rejectionReason && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                  <AlertTriangle size={13} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-400">{order.rejectionReason}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                {order.status === 'draft' && order.items.length > 0 && (
                  <button
                    onClick={() => submitMutation.mutate({ orderId: order.id })}
                    disabled={submitMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-40 transition-colors"
                  >
                    {submitMutation.isPending ? <LoadingSpinner size={14} className="p-0 text-white" /> : <Send size={14} />}
                    Submit for Approval
                  </button>
                )}
                {order.status === 'submitted' && canReview && !showReject && (
                  <>
                    <button
                      onClick={() => reviewMutation.mutate({ orderId: order.id, data: { action: 'approve' } })}
                      disabled={reviewMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 transition-colors"
                    >
                      {reviewMutation.isPending ? <LoadingSpinner size={14} className="p-0 text-white" /> : <CheckCircle size={14} />}
                      Approve
                    </button>
                    <button
                      onClick={() => setShowRej(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-colors"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
              </div>

              {/* Reject form */}
              <AnimatePresence>
                {showReject && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <Label className="text-white/50 text-xs uppercase tracking-wider">Reason for Rejection</Label>
                    <Input value={rejectReason} onChange={e => setRR(e.target.value)} placeholder="Explain why this order is rejected..." className="glass border-rose-500/30 text-white" />
                    <div className="flex gap-3">
                      <button
                        onClick={() => reviewMutation.mutate({ orderId: order.id, data: { action: 'reject', rejectionReason: rejectReason } })}
                        disabled={!rejectReason.trim() || reviewMutation.isPending}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 transition-colors"
                      >
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
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95 }}
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d1527] p-6 space-y-5 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">New Purchase Order</h3>
          <button onClick={onClose}><X size={18} className="text-white/30 hover:text-white transition-colors" /></button>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-white/50 text-xs uppercase tracking-wider">Sector / Department</Label>
            <select
              value={sectorId}
              onChange={e => setSectorId(parseInt(e.target.value))}
              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500/50"
            >
              {sectors.map(s => <option key={s.id} value={s.id} className="bg-[#0d1527]">{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/50 text-xs uppercase tracking-wider">Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Purpose of this purchase order..." className="glass border-white/10 text-white placeholder:text-white/20" />
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={() => createMutation.mutate({ data: { sectorId, budgetCycleId: cycleId, notes: notes || undefined } })}
            disabled={!sectorId || createMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors"
          >
            {createMutation.isPending ? <LoadingSpinner size={14} className="p-0 text-white" /> : <Plus size={14} />}
            Create Order
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white transition-colors">Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main Page ───────────────────────────────────────────────── */
export default function ProcurementPage() {
  const { user, isSuperAdmin, isCeo, isMinistryHead } = useAuth();
  const canReview = isSuperAdmin || isCeo || isMinistryHead;
  const canCreate = user?.role !== 'viewer';

  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState<string>('all');
  const [showNew, setShowNew]   = useState(false);

  const { data: cycle }    = useGetActiveCycle();
  const { data: orders = [], isLoading } = useListPurchaseOrders(
    {},
    { query: { queryKey: ['purchase-orders'], staleTime: 15000 } }
  );
  const { data: products = [] } = useListProducts({}, { query: { queryKey: ['products'], staleTime: 60000 } });
  const { data: sectors  = [] } = useListSectors({ query: { queryKey: ['sectors'], staleTime: 60000 } });

  const filtered = useMemo(() => {
    let list = [...orders].reverse(); // newest first
    if (statusFilter !== 'all') list = list.filter(o => o.status === statusFilter);
    if (search) list = list.filter(o =>
      o.sector?.name?.toLowerCase().includes(search.toLowerCase()) ||
      String(o.id).includes(search)
    );
    return list;
  }, [orders, statusFilter, search]);

  const counts = useMemo(() => {
    const c = { all: orders.length, draft: 0, submitted: 0, approved: 0, rejected: 0 };
    orders.forEach(o => { c[o.status as keyof typeof c] = (c[o.status as keyof typeof c] ?? 0) + 1; });
    return c;
  }, [orders]);

  const totalApproved = useMemo(() => orders.filter(o => o.status === 'approved').reduce((s, o) => s + o.totalAmount, 0), [orders]);

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
            Purchase orders & expenditure tracking · {cycle?.name ?? 'No active cycle'}
          </p>
        </div>
        {canCreate && cycle && (
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
          >
            <Plus size={15} /> New Purchase Order
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Orders', value: counts.all, color: '#64748b' },
          { label: 'Pending Review', value: counts.submitted, color: '#f59e0b' },
          { label: 'Approved', value: counts.approved, color: '#10b981' },
          { label: 'Total Approved Spend', value: formatCompact(totalApproved), color: '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-white/30">{label}</p>
            <p className="text-lg font-extrabold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders or sectors..." className="pl-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/10">
          {(['all', 'draft', 'submitted', 'approved', 'rejected'] as const).map(s => {
            const cfg = s === 'all' ? null : STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === s ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
              >
                {s === 'all' ? `All (${counts.all})` : `${cfg!.label} (${counts[s]})`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders list */}
      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size={36} /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-white/20 gap-3">
          <ShoppingCart size={40} className="opacity-30" />
          <p className="text-sm">{search || statusFilter !== 'all' ? 'No orders match your filter' : 'No purchase orders yet'}</p>
          {canCreate && cycle && !search && statusFilter === 'all' && (
            <button onClick={() => setShowNew(true)} className="mt-2 text-blue-400 text-sm hover:text-blue-300 transition-colors">
              Create your first purchase order →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map(order => (
              <OrderCard key={order.id} order={order} products={products} canReview={canReview} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* New order modal */}
      <AnimatePresence>
        {showNew && cycle && (
          <NewOrderModal
            onClose={() => setShowNew(false)}
            cycleId={cycle.id}
            sectors={sectors}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
