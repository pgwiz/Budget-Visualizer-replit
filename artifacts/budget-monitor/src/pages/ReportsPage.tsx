import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGetAuditLog, useListSectors } from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatCompact } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import {
  History, ArrowLeftRight, ShoppingCart,
  Filter, ChevronDown, TrendingUp,
} from 'lucide-react';
import { ExportMenu } from '@/components/ui/ExportMenu';
import type { ExportColumn } from '@/lib/export';
import { motion } from 'framer-motion';

/* ── Fetch helpers ──────────────────────────────────────────── */
function useBreakdownReport(params: { sectorId?: number; cycleId?: number }) {
  const qs = new URLSearchParams();
  if (params.sectorId) qs.set('sectorId', String(params.sectorId));
  if (params.cycleId)  qs.set('cycleId',  String(params.cycleId));
  return useQuery({
    queryKey: ['reports/sector-breakdown', params],
    queryFn: async () => {
      const r = await fetch(`/api/reports/sector-breakdown?${qs}`);
      if (!r.ok) throw new Error('Failed to load sector breakdown');
      return r.json() as Promise<any[]>;
    },
    staleTime: 30000,
  });
}

function useAllocationsReport(params: { sectorId?: number; cycleId?: number; status?: string }) {
  const qs = new URLSearchParams();
  if (params.sectorId) qs.set('sectorId', String(params.sectorId));
  if (params.cycleId)  qs.set('cycleId',  String(params.cycleId));
  if (params.status)   qs.set('status',   params.status);
  return useQuery({
    queryKey: ['reports/allocations', params],
    queryFn: async () => {
      const r = await fetch(`/api/reports/allocations?${qs}`);
      if (!r.ok) throw new Error('Failed to load allocations report');
      return r.json() as Promise<any[]>;
    },
    staleTime: 30000,
  });
}

function useProcurementReport(params: { sectorId?: number; cycleId?: number; status?: string }) {
  const qs = new URLSearchParams();
  if (params.sectorId) qs.set('sectorId', String(params.sectorId));
  if (params.cycleId)  qs.set('cycleId',  String(params.cycleId));
  if (params.status)   qs.set('status',   params.status);
  return useQuery({
    queryKey: ['reports/procurement', params],
    queryFn: async () => {
      const r = await fetch(`/api/reports/procurement?${qs}`);
      if (!r.ok) throw new Error('Failed to load procurement report');
      return r.json() as Promise<any[]>;
    },
    staleTime: 30000,
  });
}

/* ── Status badge ───────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'success' | 'danger' | 'warning' }> = {
  active:    { label: 'Active',    variant: 'success' },
  revoked:   { label: 'Revoked',   variant: 'danger' },
  exhausted: { label: 'Exhausted', variant: 'warning' },
  pending:   { label: 'Pending',   variant: 'default' },
  approved:  { label: 'Approved',  variant: 'success' },
  rejected:  { label: 'Rejected',  variant: 'danger' },
  submitted: { label: 'Submitted', variant: 'warning' },
  draft:     { label: 'Draft',     variant: 'default' },
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_MAP[status] ?? { label: status, variant: 'default' as const };
  return <Badge variant={m.variant} className="text-[10px] uppercase tracking-wide">{m.label}</Badge>;
}

/* ── Sector picker ──────────────────────────────────────────── */
function SectorPicker({
  sectors, value, onChange,
}: { sectors: any[]; value: number | undefined; onChange: (v: number | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const selected = sectors.find(s => s.id === value);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-9 px-3 rounded-xl text-xs font-medium border border-white/12 bg-white/5 hover:bg-white/10 transition-all text-white/70 min-w-[160px]"
      >
        <Filter size={12} className="text-white/40 shrink-0" />
        <span className="flex-1 text-left truncate">{selected ? selected.name : 'All Sectors'}</span>
        <ChevronDown size={12} className={`text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border border-white/10 bg-[#0d1527] shadow-2xl z-50 overflow-hidden"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="max-h-72 overflow-y-auto py-1 scrollbar-thin">
            <button
              onClick={() => { onChange(undefined); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/6 transition-colors ${!value ? 'text-blue-400 font-semibold' : 'text-white/70'}`}
            >
              All Sectors
            </button>
            {sectors.map(s => (
              <button
                key={s.id}
                onClick={() => { onChange(s.id); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-white/6 transition-colors flex items-center gap-2 ${s.id === value ? 'text-blue-400 font-semibold' : 'text-white/70'}`}
                style={{ paddingLeft: `${16 + (s.depth ?? 0) * 14}px` }}
              >
                {s.depth > 0 && <span className="text-white/20 text-xs">{'└'}</span>}
                <span className="truncate">{s.name}</span>
                {s.code && <span className="text-white/25 text-[10px] font-mono ml-auto">{s.code}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Utilization bar ────────────────────────────────────────── */
function UtilBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100);
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${clamped}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{Math.round(pct)}%</span>
    </div>
  );
}

/* ── Column definitions ─────────────────────────────────────── */
const AUDIT_COLS: ExportColumn[] = [
  { key: 'date',     label: 'Date & Time' },
  { key: 'user',     label: 'User' },
  { key: 'action',   label: 'Action' },
  { key: 'subject',  label: 'Subject' },
  { key: 'details',  label: 'Details' },
];

const BREAKDOWN_COLS: ExportColumn[] = [
  { key: 'sector',      label: 'Sector' },
  { key: 'parent',      label: 'Parent Sector' },
  { key: 'responsible', label: 'Responsible Officer' },
  { key: 'depth',       label: 'Level', align: 'right' },
  { key: 'budget',      label: 'Total Budget (KSh)',    align: 'right', numeric: true },
  { key: 'allocated',   label: 'Net Allocated (KSh)',   align: 'right', numeric: true },
  { key: 'available',   label: 'Available (KSh)',       align: 'right', numeric: true },
  { key: 'utilization', label: 'Utilization (%)',       align: 'right' },
  { key: 'transfers',   label: '# Allocations',         align: 'right' },
];

const ALLOC_COLS: ExportColumn[] = [
  { key: 'date',        label: 'Date' },
  { key: 'cycle',       label: 'Budget Cycle' },
  { key: 'fromSector',  label: 'From' },
  { key: 'toSector',    label: 'To Sector' },
  { key: 'amount',      label: 'Amount (KSh)', align: 'right', numeric: true },
  { key: 'status',      label: 'Status' },
  { key: 'allocatedBy', label: 'Allocated By' },
  { key: 'comment',     label: 'Comment' },
];

const PROCUREMENT_COLS: ExportColumn[] = [
  { key: 'date',       label: 'Date' },
  { key: 'poNumber',   label: 'PO #', align: 'right' },
  { key: 'sector',     label: 'Sector' },
  { key: 'createdBy',  label: 'Created By' },
  { key: 'status',     label: 'Status' },
  { key: 'items',      label: '# Items', align: 'right' },
  { key: 'total',      label: 'Total (KSh)', align: 'right', numeric: true },
  { key: 'reviewedBy', label: 'Reviewed By' },
  { key: 'notes',      label: 'Notes' },
];

const INSTITUTION = 'The Ollessos National Polytechnic — Budget Monitor';

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
export default function ReportsPage() {
  const [tab, setTab]             = useState<'breakdown' | 'audit' | 'allocations' | 'procurement'>('breakdown');
  const [sectorFilter, setSector] = useState<number | undefined>();
  const [statusFilter, setStatus] = useState<string>('');

  const { data: sectors = [] } = useListSectors();
  const { data: breakdown, isLoading: bLoading } = useBreakdownReport({ sectorId: sectorFilter });
  const { data: auditRaw, isLoading: aLoading } = useGetAuditLog({ limit: 200 });
  const { data: allocRaw, isLoading: allocLoading } = useAllocationsReport({
    sectorId: sectorFilter, status: statusFilter || undefined,
  });
  const { data: poRaw, isLoading: poLoading } = useProcurementReport({
    sectorId: sectorFilter, status: statusFilter || undefined,
  });

  /* ── Shaped data for tables & export ── */
  const auditData = useMemo(() => (auditRaw?.items ?? []).map((l: any) => ({
    date:    new Date(l.createdAt).toLocaleString(),
    user:    l.userName,
    action:  l.action,
    subject: l.subjectType + (l.subjectId ? ` #${l.subjectId}` : ''),
    details: l.detailsText ?? (l.meta ? JSON.stringify(l.meta) : '—'),
    _raw:    l,
  })), [auditRaw]);

  const breakdownData = useMemo(() => (breakdown ?? []).map((b: any) => ({
    sector:      b.sectorName,
    parent:      b.parentName ?? '—',
    responsible: b.responsibleUser ?? '—',
    depth:       String(b.depth),
    budget:      b.netAllocated + b.availableBalance,
    allocated:   b.netAllocated,
    available:   b.availableBalance,
    utilization: `${Math.round(b.utilizationPct)}%`,
    transfers:   String(b.allocationCount),
    _raw:        b,
  })), [breakdown]);

  const allocData = useMemo(() => (allocRaw ?? []).map((a: any) => ({
    date:        new Date(a.date).toLocaleDateString(),
    cycle:       a.cycle,
    fromSector:  a.fromSector,
    toSector:    a.toSector,
    amount:      a.amount,
    status:      a.status,
    allocatedBy: a.allocatedBy,
    comment:     a.comment,
    _raw:        a,
  })), [allocRaw]);

  const poData = useMemo(() => (poRaw ?? []).map((p: any) => ({
    date:       new Date(p.date).toLocaleDateString(),
    poNumber:   `PO-${String(p.id).padStart(4, '0')}`,
    sector:     p.sector,
    createdBy:  p.createdBy,
    status:     p.status,
    items:      String(p.itemCount),
    total:      p.totalAmount,
    reviewedBy: p.reviewedBy ?? '—',
    notes:      p.notes ?? '—',
    _raw:       p,
  })), [poRaw]);

  /* ── Summary metrics for breakdown export ── */
  const breakdownSummary = useMemo(() => {
    const total   = (breakdown ?? []).reduce((s: number, b: any) => s + b.netAllocated + b.availableBalance, 0);
    const alloc   = (breakdown ?? []).reduce((s: number, b: any) => s + b.netAllocated, 0);
    const avail   = (breakdown ?? []).reduce((s: number, b: any) => s + b.availableBalance, 0);
    const avgUtil = (breakdown ?? []).length ? (breakdown ?? []).reduce((s: number, b: any) => s + b.utilizationPct, 0) / (breakdown ?? []).length : 0;
    return [
      { label: 'Total Budget', value: formatCurrency(total) },
      { label: 'Net Allocated', value: formatCurrency(alloc) },
      { label: 'Available Balance', value: formatCurrency(avail) },
      { label: 'Average Utilization', value: `${Math.round(avgUtil)}%` },
      { label: 'Sectors Covered', value: String((breakdown ?? []).length) },
      { label: 'Report Date', value: new Date().toLocaleDateString() },
    ];
  }, [breakdown]);

  const allocSummary = useMemo(() => {
    const total  = (allocRaw ?? []).reduce((s: number, a: any) => s + a.amount, 0);
    const active = (allocRaw ?? []).filter((a: any) => a.status === 'active').length;
    return [
      { label: 'Total Transfers', value: String((allocRaw ?? []).length) },
      { label: 'Total Amount Moved', value: formatCurrency(total) },
      { label: 'Active Allocations', value: String(active) },
    ];
  }, [allocRaw]);

  const poSummary = useMemo(() => {
    const total    = (poRaw ?? []).reduce((s: number, p: any) => s + p.totalAmount, 0);
    const approved = (poRaw ?? []).filter((p: any) => p.status === 'approved').length;
    const pending  = (poRaw ?? []).filter((p: any) => p.status === 'submitted').length;
    return [
      { label: 'Total Purchase Orders', value: String((poRaw ?? []).length) },
      { label: 'Total Value', value: formatCurrency(total) },
      { label: 'Approved', value: String(approved) },
      { label: 'Pending Review', value: String(pending) },
    ];
  }, [poRaw]);

  /* ── Chart data for breakdown ── */
  const breakdownChartData = useMemo(() =>
    (breakdown ?? [])
      .filter((b: any) => b.depth === 1)
      .slice(0, 12)
      .map((b: any) => ({ label: b.sectorName, value: b.netAllocated + b.availableBalance }))
  , [breakdown]);

  /* ── Stat cards (top bar) ── */
  const isLoading = tab === 'breakdown' ? bLoading
    : tab === 'audit' ? aLoading
    : tab === 'allocations' ? allocLoading
    : poLoading;

  const statCards = useMemo(() => {
    if (tab === 'breakdown') return breakdownSummary.slice(0, 4);
    if (tab === 'allocations') return allocSummary;
    if (tab === 'procurement') return poSummary;
    return [];
  }, [tab, breakdownSummary, allocSummary, poSummary]);

  /* ── Export config per tab ── */
  function getExportConfig() {
    switch (tab) {
      case 'breakdown': return {
        data: breakdownData, columns: BREAKDOWN_COLS,
        filename: 'sector-breakdown', title: 'Sector Budget Breakdown',
        summaryItems: breakdownSummary,
        chartData: breakdownChartData,
        chartTitle: 'Budget by Top-Level Sector',
        sheetName: 'Breakdown',
      };
      case 'audit': return {
        data: auditData, columns: AUDIT_COLS,
        filename: 'audit-log', title: 'Activity Audit Log',
        sheetName: 'Audit Log',
      };
      case 'allocations': return {
        data: allocData, columns: ALLOC_COLS,
        filename: 'allocation-history', title: 'Allocation History',
        summaryItems: allocSummary,
        chartData: (allocRaw ?? [])
          .reduce((acc: any[], a: any) => {
            const ex = acc.find((x: any) => x.label === a.toSector);
            if (ex) ex.value += a.amount; else acc.push({ label: a.toSector, value: a.amount });
            return acc;
          }, [])
          .sort((a: any, b: any) => b.value - a.value)
          .slice(0, 12),
        chartTitle: 'Allocations by Sector',
        sheetName: 'Allocations',
      };
      case 'procurement': return {
        data: poData, columns: PROCUREMENT_COLS,
        filename: 'procurement-report', title: 'Procurement Report',
        summaryItems: poSummary,
        sheetName: 'Procurement',
      };
    }
  }

  const exportCfg = getExportConfig();

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-white">Reports</h2>
          <p className="text-white/40 mt-1 text-sm">Financial reports, audit trail, and procurement analytics</p>
        </div>
        <ExportMenu
          data={exportCfg.data}
          columns={exportCfg.columns}
          filename={exportCfg.filename}
          title={exportCfg.title}
          institution={INSTITUTION}
          summaryItems={(exportCfg as any).summaryItems}
          chartData={(exportCfg as any).chartData}
          chartTitle={(exportCfg as any).chartTitle}
          sheetName={(exportCfg as any).sheetName}
          disabled={isLoading || exportCfg.data.length === 0}
        />
      </div>

      {/* ── Filters bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <SectorPicker sectors={sectors as any[]} value={sectorFilter} onChange={setSector} />
        {(tab === 'allocations' || tab === 'procurement') && (
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="h-9 px-3 rounded-xl text-xs font-medium border border-white/12 bg-white/5 text-white/70 focus:outline-none focus:ring-1 focus:ring-blue-500/40"
          >
            <option value="">All Statuses</option>
            {tab === 'allocations'
              ? ['active', 'revoked', 'exhausted', 'pending'].map(s => <option key={s} value={s}>{s}</option>)
              : ['draft', 'submitted', 'approved', 'rejected'].map(s => <option key={s} value={s}>{s}</option>)
            }
          </select>
        )}
        {(sectorFilter || statusFilter) && (
          <button
            onClick={() => { setSector(undefined); setStatus(''); }}
            className="h-9 px-3 rounded-xl text-xs text-white/40 hover:text-white border border-white/8 hover:bg-white/5 transition-all"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Stat cards ── */}
      {statCards.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className="p-4">
                <p className="text-[10px] text-white/35 uppercase tracking-widest font-bold mb-1">{s.label}</p>
                <p className="text-lg font-bold text-white leading-none">{s.value}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <Tabs value={tab} onValueChange={v => setTab(v as any)} className="w-full">
        <TabsList className="glass border-white/10 p-1 mb-5 flex gap-1 flex-wrap h-auto">
          {[
            { value: 'breakdown',   label: 'Sector Breakdown', icon: TrendingUp,    count: breakdown?.length },
            { value: 'audit',       label: 'Audit Log',        icon: History,       count: auditRaw?.items?.length },
            { value: 'allocations', label: 'Allocations',      icon: ArrowLeftRight, count: allocRaw?.length },
            { value: 'procurement', label: 'Procurement',      icon: ShoppingCart,  count: poRaw?.length },
          ].map(t => (
            <TabsTrigger
              key={t.value} value={t.value}
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2 text-xs"
            >
              <t.icon size={14} />
              {t.label}
              {t.count != null && (
                <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/40">{t.count}</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Sector Breakdown ─────────────────────────────── */}
        <TabsContent value="breakdown">
          <GlassCard className="p-0 overflow-hidden">
            {bLoading ? <LoadingSpinner size={40} className="py-20" /> : !breakdown?.length ? (
              <EmptyState icon={<TrendingUp size={36} />} text="No sector data available" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="hover:bg-transparent border-white/8">
                      <TableHead className="text-white/40">Sector</TableHead>
                      <TableHead className="text-white/40">Parent</TableHead>
                      <TableHead className="text-white/40">Officer</TableHead>
                      <TableHead className="text-white/40 text-right">Budget</TableHead>
                      <TableHead className="text-white/40 text-right">Allocated</TableHead>
                      <TableHead className="text-white/40 text-right">Available</TableHead>
                      <TableHead className="text-white/40">Utilization</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(breakdown ?? []).map((b: any) => (
                      <TableRow key={b.sectorId} className="hover:bg-white/4 border-white/5 transition-colors">
                        <TableCell>
                          <span className="font-semibold text-white" style={{ paddingLeft: `${b.depth * 12}px` }}>
                            {b.depth > 0 && <span className="text-white/20 mr-1 text-xs">└</span>}
                            {b.sectorName}
                          </span>
                          {b.sectorCode && <span className="ml-2 text-[10px] font-mono text-white/25">{b.sectorCode}</span>}
                        </TableCell>
                        <TableCell className="text-white/45 text-sm">{b.parentName ?? '—'}</TableCell>
                        <TableCell className="text-white/55 text-sm">{b.responsibleUser ?? '—'}</TableCell>
                        <TableCell className="text-right text-white/70 text-sm">
                          {formatCompact(b.netAllocated + b.availableBalance)}
                        </TableCell>
                        <TableCell className="text-right text-white/70 text-sm">{formatCompact(b.netAllocated)}</TableCell>
                        <TableCell className="text-right text-sm">
                          <span className={b.availableBalance < 0 ? 'text-rose-400 font-semibold' : 'text-emerald-400'}>
                            {formatCompact(b.availableBalance)}
                          </span>
                        </TableCell>
                        <TableCell><UtilBar pct={b.utilizationPct} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── Audit Log ──────────────────────────────────── */}
        <TabsContent value="audit">
          <GlassCard className="p-0 overflow-hidden">
            {aLoading ? <LoadingSpinner size={40} className="py-20" /> : !auditRaw?.items?.length ? (
              <EmptyState icon={<History size={36} />} text="No audit log entries yet" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="hover:bg-transparent border-white/8">
                      <TableHead className="text-white/40 whitespace-nowrap">Date & Time</TableHead>
                      <TableHead className="text-white/40">User</TableHead>
                      <TableHead className="text-white/40">Action</TableHead>
                      <TableHead className="text-white/40">Subject</TableHead>
                      <TableHead className="text-white/40">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(auditRaw?.items ?? []).map((log: any) => (
                      <TableRow key={log.id} className="hover:bg-white/4 border-white/5 transition-colors">
                        <TableCell className="text-white/35 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-white font-medium text-sm">{log.userName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.action?.includes('CREATE') || log.action?.includes('APPROVE') ? 'success' :
                              log.action?.includes('REVOKE') || log.action?.includes('REJECT')  ? 'danger'  :
                              'default'
                            }
                            className="text-[10px] whitespace-nowrap"
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/45 text-xs">
                          {log.subjectType}{log.subjectId ? ` #${log.subjectId}` : ''}
                        </TableCell>
                        <TableCell className="text-white/55 text-sm max-w-sm">
                          <span className="block truncate" title={log.detailsText ?? ''}>
                            {log.detailsText ?? '—'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── Allocation History ──────────────────────────── */}
        <TabsContent value="allocations">
          <GlassCard className="p-0 overflow-hidden">
            {allocLoading ? <LoadingSpinner size={40} className="py-20" /> : !allocRaw?.length ? (
              <EmptyState icon={<ArrowLeftRight size={36} />} text="No allocations found" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="hover:bg-transparent border-white/8">
                      <TableHead className="text-white/40">Date</TableHead>
                      <TableHead className="text-white/40">Cycle</TableHead>
                      <TableHead className="text-white/40">From</TableHead>
                      <TableHead className="text-white/40">To Sector</TableHead>
                      <TableHead className="text-white/40 text-right">Amount</TableHead>
                      <TableHead className="text-white/40">Status</TableHead>
                      <TableHead className="text-white/40">Allocated By</TableHead>
                      <TableHead className="text-white/40">Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allocRaw ?? []).map((a: any) => (
                      <TableRow key={a.id} className="hover:bg-white/4 border-white/5 transition-colors">
                        <TableCell className="text-white/40 text-xs whitespace-nowrap">
                          {new Date(a.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-white/55 text-sm">{a.cycle}</TableCell>
                        <TableCell className="text-white/45 text-sm">{a.fromSector}</TableCell>
                        <TableCell className="text-white font-medium text-sm">{a.toSector}</TableCell>
                        <TableCell className="text-right">
                          <span className="text-emerald-400 font-semibold text-sm">
                            {formatCompact(a.amount)}
                          </span>
                        </TableCell>
                        <TableCell><StatusBadge status={a.status} /></TableCell>
                        <TableCell className="text-white/55 text-sm">{a.allocatedBy}</TableCell>
                        <TableCell className="text-white/50 text-sm max-w-[200px]">
                          <span className="block truncate" title={a.comment}>{a.comment || '—'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── Procurement Report ──────────────────────────── */}
        <TabsContent value="procurement">
          <GlassCard className="p-0 overflow-hidden">
            {poLoading ? <LoadingSpinner size={40} className="py-20" /> : !poRaw?.length ? (
              <EmptyState icon={<ShoppingCart size={36} />} text="No purchase orders found" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-white/5">
                    <TableRow className="hover:bg-transparent border-white/8">
                      <TableHead className="text-white/40">Date</TableHead>
                      <TableHead className="text-white/40">PO #</TableHead>
                      <TableHead className="text-white/40">Sector</TableHead>
                      <TableHead className="text-white/40">Created By</TableHead>
                      <TableHead className="text-white/40">Status</TableHead>
                      <TableHead className="text-white/40 text-right">Items</TableHead>
                      <TableHead className="text-white/40 text-right">Total</TableHead>
                      <TableHead className="text-white/40">Reviewed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(poRaw ?? []).map((p: any) => (
                      <TableRow key={p.id} className="hover:bg-white/4 border-white/5 transition-colors">
                        <TableCell className="text-white/40 text-xs whitespace-nowrap">
                          {new Date(p.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-white/60 text-xs font-mono">
                          PO-{String(p.id).padStart(4, '0')}
                        </TableCell>
                        <TableCell className="text-white font-medium text-sm">{p.sector}</TableCell>
                        <TableCell className="text-white/55 text-sm">{p.createdBy}</TableCell>
                        <TableCell><StatusBadge status={p.status} /></TableCell>
                        <TableCell className="text-right text-white/55 text-sm">{p.itemCount}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold text-sm ${p.status === 'rejected' ? 'text-rose-400' : p.status === 'approved' ? 'text-emerald-400' : 'text-white/70'}`}>
                            {formatCompact(p.totalAmount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-white/45 text-sm">{p.reviewedBy ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center py-20 text-white/20 gap-3">
      <div className="opacity-30">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
