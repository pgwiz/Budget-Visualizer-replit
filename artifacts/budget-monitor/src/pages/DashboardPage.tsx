import { 
  useGetDashboardSummary, 
  useGetUtilizationChart, 
  useGetBalanceBreakdown, 
  useGetAllocationTimeline, 
  useGetRecentActivity,
  useGetActiveCycle 
} from '@workspace/api-client-react';
import { StatCard } from '@/components/ui/StatCard';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatCurrency } from '@/lib/api';
import { 
  Wallet, 
  PieChart, 
  TrendingUp, 
  BarChart3,
  Activity,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const { data: cycle } = useGetActiveCycle();
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: utilizationData } = useGetUtilizationChart();
  const { data: balanceData } = useGetBalanceBreakdown();
  const { data: timelineData } = useGetAllocationTimeline();
  const { data: recentActivity } = useGetRecentActivity();

  if (summaryLoading) {
    return <LoadingSpinner size={48} className="min-h-[60vh]" />;
  }

  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

  const balancePieData = balanceData ? [
    { name: 'Allocated', value: balanceData.totalAllocated },
    { name: 'Available', value: balanceData.availableBalance },
    { name: 'Revoked', value: balanceData.totalRevoked },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">System Overview</h2>
          <p className="text-white/40 mt-1">Real-time budget utilization tracking</p>
        </div>
        {cycle && (
          <GlassCard className="p-3 px-4 flex items-center gap-3">
            <Calendar size={18} className="text-blue-400" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Active Cycle</p>
              <p className="text-sm font-medium text-white">{cycle.name}</p>
            </div>
          </GlassCard>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Wallet} 
          label="Total Budget" 
          value={formatCurrency(summary?.totalBudget || 0)} 
          color="primary"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Total Allocated" 
          value={formatCurrency(summary?.totalAllocated || 0)} 
          color="success"
        />
        <StatCard 
          icon={PieChart} 
          label="Available Balance" 
          value={formatCurrency(summary?.availableBalance || 0)} 
          color="warning"
        />
        <StatCard 
          icon={BarChart3} 
          label="Utilization" 
          value={`${Math.round(summary?.utilizationPct || 0)}%`} 
          color="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard header={<h3 className="font-semibold text-white">Sector Utilization</h3>} className="lg:col-span-2 min-h-[400px]">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={utilizationData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="sectorName" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v: string) => v.replace('Ministry of ', '')} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000000}M`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Bar dataKey="allocated" name="Allocated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="available" name="Available" fill="rgba(59,130,246,0.2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard header={<h3 className="font-semibold text-white">Balance Breakdown</h3>} className="min-h-[400px]">
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={balancePieData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {balancePieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
            </RePieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {balancePieData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="text-white font-medium">{formatCurrency(item.value)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard header={<h3 className="font-semibold text-white">Allocation Trend (30 Days)</h3>} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData || []}>
              <defs>
                <linearGradient id="colorAlloc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value / 1000000}M`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(10, 15, 30, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="cumulativeAllocated" name="Cumulative Allocated" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAlloc)" />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard header={<h3 className="font-semibold text-white">Recent Activity</h3>} className="max-h-[400px] overflow-hidden">
          <div className="space-y-4 overflow-y-auto pr-2 max-h-[320px]">
            {recentActivity?.map((activity, i) => (
              <div key={i} className="flex gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Activity size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-white/40">{new Date(activity.createdAt).toLocaleDateString()}</p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">System</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
