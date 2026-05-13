import {
  useGetDashboardSummary,
  useGetUtilizationChart,
  useGetBalanceBreakdown,
  useGetAllocationTimeline,
  useGetRecentActivity,
  useGetActiveCycle,
} from '@workspace/api-client-react';
import { AnimatedStatCard } from '@/components/ui/AnimatedStatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency, formatCompact } from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWallet, faChartLine, faCalendarAlt, faChartBar, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, AreaChart, Area, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { Activity } from 'lucide-react';

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: '12px',
    fontSize: 12,
    color: '#111827',
  },
  itemStyle: { color: '#111827' },
  cursor: { fill: 'rgba(0,0,0,0.03)' },
};

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4'];

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h3 className="font-bold text-gray-900 text-base">{title}</h3>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5 uppercase tracking-wider">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { data: cycle } = useGetActiveCycle();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: utilizationData } = useGetUtilizationChart();
  const { data: balanceData } = useGetBalanceBreakdown();
  const { data: timelineData } = useGetAllocationTimeline();
  const { data: recentActivity } = useGetRecentActivity();

  if (summaryLoading) {
    return <LoadingSpinner size={48} className="min-h-[60vh]" />;
  }

  /* ── derived data ── */
  const utilizationPct = summary?.utilizationPct ?? 0;

  // Pie: build slices that always match the legend exactly.
  // When available < 0 (over-allocated), show an explicit "Over-allocated" red wedge
  // instead of silently clamping to 0 and showing 100% for one slice.
  const balancePieData = balanceData
    ? (() => {
        const budget    = balanceData.totalBudget;
        const allocated = balanceData.totalAllocated;
        const revoked   = Math.max(0, balanceData.totalRevoked);
        const available = balanceData.availableBalance;          // may be negative

        if (budget <= 0) return [{ name: 'No Budget', value: 1, color: 'rgba(0,0,0,0.06)', rawValue: 0 }];

        if (available < 0) {
          // Over-allocated: fill the whole ring with Allocated (blue) + excess (red)
          return [
            { name: 'Allocated',     value: budget,               color: '#3b82f6', rawValue: allocated },
            { name: 'Over-allocated',value: Math.abs(available),  color: '#ef4444', rawValue: available },
            ...(revoked > 0 ? [{ name: 'Revoked', value: revoked, color: '#f59e0b', rawValue: revoked }] : []),
          ];
        }

        return [
          { name: 'Allocated', value: Math.max(0, allocated), color: '#3b82f6', rawValue: allocated },
          { name: 'Available', value: Math.max(0, available), color: '#10b981', rawValue: available },
          ...(revoked > 0 ? [{ name: 'Revoked', value: revoked, color: '#f59e0b', rawValue: revoked }] : []),
        ].filter((d) => d.value > 0);
      })()
    : [];

  // Bar chart: clamp available to 0 so negative bars don't hide/shrink the chart
  const utilizationDataSafe = Array.isArray(utilizationData) ? utilizationData : [];

  // Bar chart: clamp available to 0 so negative bars don't hide/shrink the chart
  const utilBarData = utilizationDataSafe.map((d) => ({
    ...d,
    available: Math.max(0, d.available),
  }));

  const radarData = utilizationDataSafe.slice(0, 7).map((d) => ({
    sector: d.sectorName.replace('Ministry of ', '').replace('Department of ', ''),
    utilization: Math.round(d.utilizationPct),
  }));

  /* ── activity type → badge color ── */
  const activityBadge = (action: string) => {
    if (action === 'revoke') return 'text-red-500 bg-red-50 border-red-200';
    if (action === 'allocate') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-500 bg-gray-50 border-gray-200';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">System Overview</h2>
          <p className="text-gray-500 mt-1">Real-time budget utilization tracking</p>
        </div>
        {cycle && (
          <GlassCard className="p-3 px-5 flex items-center gap-3 bg-white border-gray-200">
            <FontAwesomeIcon icon={faCalendarAlt} className="text-blue-500 text-lg" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Active Cycle</p>
              <p className="text-sm font-semibold text-gray-900">{cycle.name}</p>
            </div>
            <div className="ml-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </GlassCard>
        )}
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <AnimatedStatCard
          index={0} icon={faWallet} label="Total Budget" color="primary"
          rawValue={summary?.totalBudget ?? 0}
          formatFn={formatCompact}
          sub={formatCurrency(summary?.totalBudget ?? 0)}
        />
        <AnimatedStatCard
          index={1} icon={faChartLine} label="Total Allocated" color="success"
          rawValue={summary?.totalAllocated ?? 0}
          formatFn={formatCompact}
          sub={formatCurrency(summary?.totalAllocated ?? 0)}
        />
        <AnimatedStatCard
          index={2} icon={faWallet} label="Available Balance"
          color={(summary?.availableBalance ?? 0) < 0 ? 'danger' : 'warning'}
          rawValue={summary?.availableBalance ?? 0}
          formatFn={formatCompact}
          sub={formatCurrency(summary?.availableBalance ?? 0)}
        />
        <AnimatedStatCard
          index={3} icon={faChartBar} label="Utilization"
          color={utilizationPct > 90 ? 'danger' : utilizationPct > 70 ? 'warning' : 'primary'}
          rawValue={utilizationPct}
          formatFn={(v) => `${Math.round(v)}%`}
          sub={`${summary?.activeAllocations ?? 0} active allocation${(summary?.activeAllocations ?? 0) !== 1 ? 's' : ''}`}
        />
      </div>

      {/* ── Row 1: Bar chart + Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard header={<SectionHeader title="Sector Utilization" sub="click a bar to explore" />} className="lg:col-span-2 min-h-[420px]">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={utilBarData}
              onClick={(d) => {
                const item = d?.activePayload?.[0]?.payload;
                if (item?.sectorId) navigate(`/sectors/${item.sectorId}`);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis
                dataKey="sectorName"
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: string) => v.replace('Ministry of ', '').replace('Department of ', '').slice(0, 12)}
              />
              <YAxis
                stroke="#9ca3af"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => {
                  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
                  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
                  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
                  return `${v}`;
                }}
              />
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: number, name: string) => [formatCurrency(v), name]}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280', paddingTop: 12 }} />
              <Bar dataKey="allocated" name="Allocated" radius={[5, 5, 0, 0]} cursor="pointer" maxBarSize={40}>
                {utilBarData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.utilizationPct >= 90 ? '#ef4444' : entry.utilizationPct >= 70 ? '#f59e0b' : '#3b82f6'}
                  />
                ))}
              </Bar>
              <Bar dataKey="available" name="Available" fill="rgba(16,185,129,0.3)" radius={[5, 5, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard header={<SectionHeader title="Balance Breakdown" />} className="min-h-[420px] flex flex-col">
          <ResponsiveContainer width="100%" height={200}>
            <RePieChart>
              <Pie
                data={balancePieData}
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {balancePieData.map((d, i) => (
                  <Cell key={i} fill={d.color} opacity={0.9} />
                ))}
              </Pie>
              <Tooltip
                {...TOOLTIP_STYLE}
                formatter={(v: number) => formatCurrency(v)}
              />
            </RePieChart>
          </ResponsiveContainer>

          <div className="flex flex-col items-center -mt-4 mb-4">
            {utilizationPct > 100 ? (
              <>
                <span className="text-xl font-bold text-rose-500">OVER</span>
                <span className="text-[10px] uppercase tracking-widest text-rose-400/60">allocated</span>
              </>
            ) : (
              <>
                <span className="text-xl font-bold text-gray-900">{Math.round(utilizationPct)}%</span>
                <span className="text-[10px] uppercase tracking-widest text-gray-400">utilized</span>
              </>
            )}
          </div>

          <div className="space-y-3 mt-2">
            {balancePieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-gray-600">{item.name}</span>
                </div>
                <span className={`text-xs font-bold ${(item.rawValue ?? item.value) < 0 ? 'text-rose-500' : 'text-gray-900'}`}>
                  {formatCurrency(item.rawValue ?? item.value)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Row 2: Timeline + Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard header={<SectionHeader title="Allocation Trend" sub="30-day cumulative" />} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={Array.isArray(timelineData) ? timelineData : []}>
              <defs>
                <linearGradient id="gradAlloc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gradRevoke" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}    />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => { if (v >= 1e9) return `${(v/1e9).toFixed(1)}B`; if (v >= 1e6) return `${(v/1e6).toFixed(0)}M`; if (v >= 1e3) return `${(v/1e3).toFixed(0)}K`; return `${v}`; }} />
              <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#6b7280', paddingTop: 8 }} />
              <Area type="monotone" dataKey="cumulativeAllocated" name="Cumulative Allocated" stroke="#3b82f6" fill="url(#gradAlloc)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="totalRevoked" name="Revoked" stroke="#ef4444" fill="url(#gradRevoke)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard header={<SectionHeader title="Sector Radar" sub="utilization by sector" />}>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={270}>
              <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="rgba(0,0,0,0.1)" />
                <PolarAngleAxis dataKey="sector" tick={{ fill: '#6b7280', fontSize: 10 }} />
                <Radar name="Utilization %" dataKey="utilization" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => `${v}%`} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[270px] flex items-center justify-center text-gray-400 text-sm italic">
              No data yet
            </div>
          )}
        </GlassCard>
      </div>

      {/* ── Row 3: Top Sectors + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard header={<SectionHeader title="Top Sectors" sub="by allocation" />}>
          <div className="space-y-3">
            {(Array.isArray(summary?.topSectors) ? summary.topSectors : []).slice(0, 6).map((sector, i) => {
              const pct = sector.utilizationPct ?? 0;
              const barColor = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6';
              return (
                <motion.a
                  key={sector.id}
                  href={`/sectors/${sector.id}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-100 shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-gray-900 truncate">{sector.name}</span>
                      <span className="text-xs font-bold ml-2 shrink-0" style={{ color: barColor }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        transition={{ duration: 1, delay: 0.3 + i * 0.06, ease: 'easeOut' }}
                        style={{ backgroundColor: barColor }}
                      />
                    </div>
                    <p className="text-[10px] text-white/30 mt-1">
                      {formatCurrency(sector.totalAllocated ?? 0)} allocated · {formatCurrency(sector.availableBalance ?? 0)} available
                    </p>
                  </div>
                  <FontAwesomeIcon icon={faArrowRight} className="text-[14px] text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
                </motion.a>
              );
            })}
          </div>
        </GlassCard>

        {/* Recent Activity */}
        <GlassCard header={<SectionHeader title="Recent Activity" />}>
          <div className="space-y-3 overflow-y-auto max-h-[340px] pr-1">
            {(Array.isArray(recentActivity) ? recentActivity : []).map((activity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-colors"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activity.action === 'revoke' ? 'bg-rose-500/10' : 'bg-blue-500/10'}`}>
                  <Activity size={15} className={activity.action === 'revoke' ? 'text-rose-400' : 'text-blue-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-medium leading-snug truncate">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-white/30">{new Date(activity.createdAt).toLocaleDateString()}</span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1.5 py-0 border ${activityBadge(activity.action)}`}
                    >
                      {activity.action}
                    </Badge>
                    {(activity.amount ?? 0) > 0 && (
                      <span className="text-[10px] text-white/40">{formatCurrency(activity.amount ?? 0)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <div className="py-10 text-center text-white/20 text-sm italic">No recent activity</div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
