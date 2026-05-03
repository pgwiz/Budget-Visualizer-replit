import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  LayoutDashboard, Network, ArrowLeftRight, FileText, Workflow,
  Users, Shield, ChevronRight, BarChart3, GitBranch, TrendingUp,
  CircleDollarSign, Eye, MousePointerClick, Layers, BookOpen,
  RefreshCw, CheckCircle2, Info,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGetDashboardSummary, useGetActiveCycle } from '@workspace/api-client-react';
import { formatCompact } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

/* ─── Role label helper ─────────────────────────────────────── */
function roleLabel(role?: string) {
  const map: Record<string, string> = {
    super_admin: 'System Administrator',
    ceo: 'Chief Executive Officer',
    ministry_head: 'Ministry Head',
    department_head: 'Department Head',
    viewer: 'Read-only Viewer',
  };
  return map[role ?? ''] ?? role ?? 'User';
}
function roleBadgeColor(role?: string) {
  if (role === 'super_admin') return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
  if (role === 'ceo') return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
  if (role === 'ministry_head') return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
  if (role === 'department_head') return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
  return 'text-white/50 bg-white/5 border-white/10';
}

/* ─── Quick-access cards ────────────────────────────────────── */
const QUICK_LINKS = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',    desc: 'KPIs, charts & live utilization overview', color: '#3b82f6' },
  { href: '/sectors',   icon: Network,         label: 'Sectors',      desc: 'Org chart, hierarchy map & sector tree',   color: '#6366f1' },
  { href: '/allocations',icon: ArrowLeftRight, label: 'Allocations',  desc: 'Allocate, revoke & track budget flows',    color: '#10b981' },
  { href: '/reports',   icon: FileText,        label: 'Reports',      desc: 'Export summaries & sector breakdowns',     color: '#f59e0b' },
  { href: '/hierarchy-designer', icon: Workflow, label: 'Designer',   desc: 'Build & reshape the budget hierarchy',     color: '#8b5cf6' },
  { href: '/users',     icon: Users,           label: 'Users',        desc: 'Manage accounts & assign sector roles',    color: '#ef4444' },
];

/* ─── Role-specific guide steps ─────────────────────────────── */
const GUIDE: Record<string, { icon: React.ElementType; title: string; body: string }[]> = {
  super_admin: [
    { icon: RefreshCw,         title: 'Set up a Budget Cycle',      body: 'Go to Cycles and create the fiscal year cycle with the total national budget.' },
    { icon: Layers,            title: 'Design the Hierarchy',       body: 'Use the Hierarchy Designer to create ministries, departments, and sub-sectors.' },
    { icon: CircleDollarSign,  title: 'Allocate from the Pool',     body: 'In Allocations, distribute budget from the National Pool to each ministry.' },
    { icon: Users,             title: 'Invite Users',               body: 'Add ministry heads and department heads, assigning each to their sector.' },
    { icon: BarChart3,         title: 'Monitor Live',               body: 'Watch utilization rings, bar charts and the balance breakdown on the Dashboard.' },
    { icon: FileText,          title: 'Export Reports',             body: 'Pull ministry-level or system-wide reports from the Reports page anytime.' },
  ],
  ceo: [
    { icon: BarChart3,         title: 'Check the Dashboard',        body: 'See top-level KPIs: total budget, utilization %, active allocations.' },
    { icon: Network,           title: 'Explore the Org Chart',      body: 'Go to Sectors → Org Chart. Drag nodes to compare ministry sizes.' },
    { icon: CircleDollarSign,  title: 'Review Allocations',         body: 'Open Allocations to see all inflow and outflow across ministries.' },
    { icon: TrendingUp,        title: 'Track the Timeline',         body: 'The Allocation Trend chart on the dashboard shows cumulative spend over 30 days.' },
    { icon: FileText,          title: 'Download Reports',           body: 'Export a full breakdown per sector from the Reports page.' },
  ],
  ministry_head: [
    { icon: Eye,               title: 'View Your Sector',           body: 'Your sector page shows received budget, available balance, and sub-sector breakdown.' },
    { icon: GitBranch,         title: 'Distribute to Departments',  body: 'Use Allocations to push budget down to your departments.' },
    { icon: MousePointerClick, title: 'Click Sub-sector Nodes',     body: 'On the Sectors page, click any child node to see its detailed breakdown.' },
    { icon: BarChart3,         title: 'Watch Utilization',          body: 'The utilization ring turns amber above 70% and red above 90% — act early.' },
  ],
  department_head: [
    { icon: Eye,               title: 'Your Sector Summary',        body: 'Navigate to Sectors and select your department to see received and available balance.' },
    { icon: CircleDollarSign,  title: 'Request Allocations',        body: 'Contact your ministry head to have funds allocated to your department.' },
    { icon: BarChart3,         title: 'Track Utilization',          body: 'Monitor how much of your allocation is being distributed further down.' },
  ],
  viewer: [
    { icon: Eye,               title: 'Browse the Dashboard',       body: 'The dashboard gives you a read-only view of the full budget picture.' },
    { icon: Network,           title: 'Explore Sectors',            body: 'Go to Sectors to browse the ministry hierarchy and individual sector stats.' },
    { icon: FileText,          title: 'Read Reports',               body: 'Reports lets you view breakdowns; contact an admin to request exports.' },
  ],
};

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">{label}</p>
        <p className="text-sm font-bold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, isSuperAdmin, isCeo } = useAuth();
  const { data: summary } = useGetDashboardSummary();
  const { data: cycle } = useGetActiveCycle();

  const steps = GUIDE[user?.role ?? ''] ?? GUIDE['viewer'];

  const visibleLinks = QUICK_LINKS.filter(l => {
    if (l.href === '/hierarchy-designer') return isSuperAdmin || isCeo;
    if (l.href === '/users') return isSuperAdmin || isCeo;
    return true;
  });

  return (
    <div className="space-y-10 pb-12">

      {/* ── Hero welcome ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, rgba(30,58,138,0.7) 0%, rgba(67,56,202,0.5) 50%, rgba(15,23,42,0.8) 100%)',
          border: '1px solid rgba(99,102,241,0.3)',
          boxShadow: '0 0 60px rgba(59,130,246,0.1)',
        }}
      >
        {/* Background grid */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="relative p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 0 30px rgba(99,102,241,0.5)' }}>
            <Shield size={26} className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Welcome back, {user?.name?.split(' ')[0] ?? 'User'}
              </h1>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-lg border ${roleBadgeColor(user?.role)}`}>
                {roleLabel(user?.role)}
              </span>
            </div>
            <p className="text-white/40 text-sm">
              {cycle ? `Active cycle: ${cycle.name}` : 'No active budget cycle'} · Budget Monitor v1.0
            </p>
          </div>

          {/* Live mini stats */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <StatPill label="Total Budget"   value={summary ? formatCompact(summary.totalBudget) : '—'}     color="#3b82f6" />
            <StatPill label="Utilization"    value={summary ? `${Math.round(summary.utilizationPct ?? 0)}%` : '—'} color="#f59e0b" />
            <StatPill label="Sectors"        value={summary ? String(summary.sectorCount) : '—'}           color="#10b981" />
            <StatPill label="Allocations"    value={summary ? String(summary.activeAllocations) : '—'}      color="#8b5cf6" />
          </div>
        </div>
      </motion.div>

      {/* ── Quick access grid ── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <MousePointerClick size={16} className="text-blue-400" />
          <h2 className="text-base font-bold text-white">Quick Access</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {visibleLinks.map((link, i) => (
            <motion.button
              key={link.href}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              onClick={() => navigate(link.href)}
              whileHover={{ y: -3, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="text-left rounded-2xl p-5 border border-white/10 bg-white/5 hover:bg-white/8 transition-all group cursor-pointer"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                style={{ background: `${link.color}20`, border: `1px solid ${link.color}30` }}>
                <link.icon size={18} style={{ color: link.color }} />
              </div>
              <p className="font-bold text-white text-sm mb-0.5">{link.label}</p>
              <p className="text-white/35 text-xs leading-snug">{link.desc}</p>
              <ChevronRight size={13} className="text-white/20 mt-2 group-hover:text-white/50 transition-colors" />
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── Getting started guide ── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <BookOpen size={16} className="text-blue-400" />
          <h2 className="text-base font-bold text-white">Getting Started</h2>
          <span className="text-[10px] text-white/30 uppercase tracking-wider">— guide for {roleLabel(user?.role)}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.4 }}
              className="flex items-start gap-4 rounded-2xl p-5 border border-white/8 bg-white/[0.03]"
            >
              {/* Step number */}
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                  <step.icon size={15} className="text-blue-400" />
                </div>
                <span className="text-[9px] font-bold text-blue-400/40 uppercase tracking-wider">0{i + 1}</span>
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white mb-0.5">{step.title}</p>
                <p className="text-xs text-white/40 leading-relaxed">{step.body}</p>
              </div>
              <CheckCircle2 size={14} className="text-white/10 shrink-0 mt-0.5" />
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Tips banner ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-start gap-4 rounded-2xl p-5 border border-amber-500/20 bg-amber-500/5"
      >
        <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-white/50 leading-relaxed space-y-1">
          <p className="text-amber-400 font-semibold text-sm">Tip — Org Chart is now interactive</p>
          <p>Go to <strong className="text-white/70">Sectors → Org Chart</strong> and <strong className="text-white/70">drag any node</strong> to rearrange the chart. Click a node to open its full budget breakdown. Use the <strong className="text-white/70">Reset Layout</strong> button to snap everything back to the computed tree position.</p>
        </div>
      </motion.div>
    </div>
  );
}
