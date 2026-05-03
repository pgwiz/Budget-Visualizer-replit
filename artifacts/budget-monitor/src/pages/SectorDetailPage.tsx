import { useState } from 'react';
import {
  useGetSector,
  useGetSectorSubtree,
  useListAllocations,
} from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AnimatedStatCard } from '@/components/ui/AnimatedStatCard';
import { UtilizationRing } from '@/components/hierarchy/UtilizationRing';
import { NodeDetailPanel } from '@/components/hierarchy/NodeDetailPanel';
import { BudgetHierarchyTree } from '@/components/hierarchy/BudgetHierarchyTree';
import { formatCurrency, formatCompact } from '@/lib/api';
import {
  Wallet, TrendingUp, ChevronLeft, ArrowDownRight, ArrowUpRight,
  BarChart3, GitBranch, Network, LayoutList,
} from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectorTree } from '@/components/sectors/SectorTree';

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgba(10,15,30,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    fontSize: 12,
  },
  itemStyle: { color: '#fff' },
};

function utilizationColor(pct: number) {
  if (pct >= 90) return 'text-rose-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-blue-400';
}

export default function SectorDetailPage({ id }: { id: string }) {
  const sectorId = parseInt(id);
  const { data: sector, isLoading: sectorLoading } = useGetSector(sectorId);
  const { data: subtreeRoot, isLoading: subtreeLoading } = useGetSectorSubtree(sectorId);
  const { data: allAllocations } = useListAllocations({ sectorId });

  // API returns a single root SectorTreeNode; its children are the sub-sectors
  const subtreeChildren: import('@workspace/api-client-react').SectorTreeNode[] =
    subtreeRoot?.children ?? [];

  const isLoading = sectorLoading || subtreeLoading;

  if (isLoading) {
    return <LoadingSpinner size={48} className="min-h-[60vh]" />;
  }

  if (!sector) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white">Sector not found</h2>
        <Link href="/sectors">
          <a className="text-blue-400 hover:underline mt-4 inline-block">Back to sectors</a>
        </Link>
      </div>
    );
  }

  const pct = sector.utilizationPct ?? 0;
  const allocated = sector.netAllocated ?? 0;
  const available = sector.availableBalance ?? 0;
  const total = allocated + available;

  /* ── Recent allocations in/out ── */
  const recentAllocs = (allAllocations ?? []).slice(0, 8);

  /* ── Children bar data ── */
  const childrenBarData = subtreeChildren.slice(0, 8).map((c) => ({
    name: c.code ?? c.name?.slice(0, 8),
    fullName: c.name,
    allocated: c.netAllocated,
    available: c.availableBalance,
    pct: c.utilizationPct,
  }));

  /* ── Timeline from allocations ── */
  const timelineMap: Record<string, number> = {};
  (allAllocations ?? []).forEach((a: any) => {
    if (a.status === 'active') {
      const d = new Date(a.allocatedAt ?? a.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      timelineMap[d] = (timelineMap[d] ?? 0) + (a.amount ?? 0);
    }
  });
  let running = 0;
  const timelineData = Object.entries(timelineMap)
    .slice(-14)
    .map(([date, amount]) => {
      running += amount;
      return { date, amount, cumulative: running };
    });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <Link href="/sectors">
            <a className="p-2 rounded-xl glass border-white/10 text-white/40 hover:text-white hover:border-white/30 transition-all mt-1">
              <ChevronLeft size={20} />
            </a>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-bold text-white">{sector.name}</h2>
              <Badge variant="outline" className="px-3 py-1 text-sm font-bold uppercase tracking-wider">
                {sector.code}
              </Badge>
              {sector.isActive ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Active</Badge>
              ) : (
                <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30 text-xs">Inactive</Badge>
              )}
            </div>
            <p className="text-white/40 mt-1">Sector performance and resource distribution</p>
          </div>
        </div>

        {/* Utilization ring hero */}
        <div className="glass p-4 rounded-2xl flex items-center gap-5">
          <UtilizationRing value={pct} size={80} strokeWidth={6} />
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Utilization</p>
            <p className={`text-2xl font-bold mt-0.5 ${utilizationColor(pct)}`}>{Math.round(pct)}%</p>
            {sector.responsibleUser && (
              <p className="text-xs text-white/40 mt-1">
                Head: <span className="text-white/70">{sector.responsibleUser.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AnimatedStatCard index={0} icon={Wallet}     label="Total Received"  color="primary"
          rawValue={allocated}  formatFn={formatCompact} sub={formatCurrency(allocated)} />
        <AnimatedStatCard index={1} icon={TrendingUp} label="Distributed Out" color="success"
          rawValue={sector.totalAllocated ?? 0} formatFn={formatCompact} sub={formatCurrency(sector.totalAllocated ?? 0)} />
        <AnimatedStatCard index={2} icon={Wallet}     label="Available"
          color={available < 0 ? 'danger' : 'warning'}
          rawValue={available} formatFn={formatCompact} sub={formatCurrency(available)} />
        <AnimatedStatCard index={3} icon={BarChart3}  label="Utilization"
          color={pct > 90 ? 'danger' : pct > 70 ? 'warning' : 'primary'}
          rawValue={pct} formatFn={(v) => `${Math.round(v)}%`} />
      </div>

      {/* ── Budget split + timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut */}
        <GlassCard header={<h3 className="font-bold text-white">Budget Split</h3>}>
          {total > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Allocated', value: allocated, color: '#3b82f6' },
                      { name: 'Available', value: available, color: '#10b981' },
                    ]}
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <Cell fill="#3b82f6" opacity={0.9} />
                    <Cell fill="#10b981" opacity={0.9} />
                  </Pie>
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 mt-2">
                {[
                  { label: 'Allocated', value: allocated, color: '#3b82f6' },
                  { label: 'Available', value: available, color: '#10b981' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-white/60">{item.label}</span>
                      </div>
                      <span className="text-xs font-bold text-white">
                        {total > 0 ? Math.round((item.value / total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <p className="text-[10px] text-white/30 mt-0.5">{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-white/20 italic text-sm">No budget data</div>
          )}
        </GlassCard>

        {/* Allocation timeline */}
        <GlassCard header={<h3 className="font-bold text-white">Allocation Timeline</h3>} className="lg:col-span-2">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={timelineData}>
                <defs>
                  <linearGradient id="gradSector" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="cumulative" name="Cumulative" stroke="#3b82f6" fill="url(#gradSector)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-white/20 italic text-sm">No allocation history</div>
          )}
        </GlassCard>
      </div>

      {/* ── Sub-sectors ── */}
      {childrenBarData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar comparison */}
          <GlassCard header={<h3 className="font-bold text-white">Sub-Sector Comparison</h3>}>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={childrenBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} tickLine={false} axisLine={false} width={36} />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(v: number) => formatCurrency(v)}
                  labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ''}
                />
                <Bar dataKey="allocated" name="Allocated" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="available" name="Available" fill="rgba(16,185,129,0.4)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Sub-sector utilization list */}
          <GlassCard header={<h3 className="font-bold text-white">Sub-Sector Utilization</h3>}>
            <div className="space-y-3">
              {childrenBarData.map((c, i) => {
                const barColor = c.pct >= 90 ? '#ef4444' : c.pct >= 70 ? '#f59e0b' : '#3b82f6';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-24 text-xs text-white/60 truncate shrink-0">{c.name}</div>
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, c.pct)}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.05 }}
                        style={{ backgroundColor: barColor }}
                      />
                    </div>
                    <span className="text-xs font-bold w-10 text-right shrink-0" style={{ color: barColor }}>
                      {Math.round(c.pct)}%
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Hierarchy / Sub-sectors tree ── */}
      {subtreeChildren.length > 0 && (
        <GlassCard header={<h3 className="font-bold text-white">Sub-Sector Hierarchy</h3>} className="p-6">
          <Tabs defaultValue="hierarchy">
            <TabsList className="glass border-white/10 p-1 mb-6 w-fit">
              <TabsTrigger value="hierarchy" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2 text-xs">
                <GitBranch size={13} /> Hierarchy Map
              </TabsTrigger>
              <TabsTrigger value="tree" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2 text-xs">
                <Network size={13} /> Tree View
              </TabsTrigger>
            </TabsList>
            <TabsContent value="hierarchy">
              <BudgetHierarchyTree nodes={subtreeChildren} totalBudget={allocated + available} cycleName={sector.name} />
            </TabsContent>
            <TabsContent value="tree">
              <SectorTree nodes={subtreeChildren} />
            </TabsContent>
          </Tabs>
        </GlassCard>
      )}

      {/* ── Recent allocations ── */}
      {recentAllocs.length > 0 && (
        <GlassCard header={<h3 className="font-bold text-white">Recent Allocations</h3>}>
          <div className="space-y-2">
            {recentAllocs.map((a: any, i: number) => {
              const isIn = a.toSector?.id === sectorId;
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/8 transition-all"
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isIn ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
                    {isIn
                      ? <ArrowDownRight size={15} className="text-emerald-400" />
                      : <ArrowUpRight size={15} className="text-blue-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white">
                      {isIn ? `From ${a.fromSector?.name ?? 'Central'}` : `To ${a.toSector?.name ?? '—'}`}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {new Date(a.allocatedAt ?? a.createdAt).toLocaleDateString()} · by {a.allocatedByUser?.name ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${isIn ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {isIn ? '+' : '-'}{formatCurrency(a.amount)}
                    </p>
                    <Badge
                      variant="outline"
                      className={`text-[9px] mt-0.5 ${a.status === 'active' ? 'text-emerald-400 border-emerald-500/30' : a.status === 'revoked' ? 'text-rose-400 border-rose-500/30' : 'text-white/40 border-white/10'}`}
                    >
                      {a.status}
                    </Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
