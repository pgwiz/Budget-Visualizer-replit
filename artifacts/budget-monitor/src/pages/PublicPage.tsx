import { useState, useEffect, useRef } from 'react';
import { motion, useInView, animate, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Area, AreaChart,
} from 'recharts';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWallet, faChartPie, faShieldAlt, faGlobe, faChevronDown, faChevronUp, faChevronRight,
  faArrowRight, faBuilding, faCheck, faCalendarAlt, faSortAmountDown,
  faSortAmountUp, faSearch,
} from '@fortawesome/free-solid-svg-icons';


/* ── Helpers ─────────────────────────────────────────────────── */
function fmtKes(n: number): string {
  if (n >= 1e9) return `KSh ${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `KSh ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `KSh ${(n / 1e3).toFixed(0)}K`;
  return `KSh ${n.toLocaleString()}`;
}
function fmtPct(n: number): string { return `${n.toFixed(1)}%`; }

/* ── Count-up animation ──────────────────────────────────────── */
function CountUp({ to, prefix = '', suffix = '', decimals = 0 }: {
  to: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const ref    = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView || !ref.current) return;
    const ctrl = animate(0, to, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: v => { if (ref.current) ref.current.textContent = prefix + v.toFixed(decimals) + suffix; },
    });
    return () => ctrl.stop();
  }, [inView, to, prefix, suffix, decimals]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

/* ── KPI Band ────────────────────────────────────────────────── */
function KPIBand({ data }: { data: any }) {
  const kpis = [
    { label: 'Total Budget',     value: data.totalBudget,     fmt: fmtKes,  icon: faWallet,    color: '#3b82f6' },
    { label: 'Allocated',        value: data.totalAllocated,  fmt: fmtKes,  icon: faChartPie,  color: '#10b981' },
    { label: 'Utilised',         value: data.totalUtilised,   fmt: fmtKes,  icon: faCheck,     color: '#8b5cf6' },
    { label: 'Remaining',        value: data.remainingBalance, fmt: fmtKes, icon: faShieldAlt, color: '#f59e0b' },
    { label: 'Allocation Rate',  value: data.allocationPercent, fmt: (v: number) => fmtPct(v), icon: faChartPie, color: '#06b6d4' },
    { label: 'Utilisation Rate', value: data.utilisationPercent, fmt: (v: number) => fmtPct(v), icon: faGlobe,    color: '#f97316' },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((k, i) => (
        <motion.div
          key={k.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.5 }}
          className="rounded-2xl p-5 text-center border border-white/10"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
        >
          <FontAwesomeIcon icon={k.icon} className="text-[22px] mb-2" style={{ color: k.color }} />
          <p className="text-2xl font-black text-white">
            <CountUp to={k.value} decimals={k.fmt === fmtKes ? 0 : 1} />
          </p>
          <p className="text-xs text-white/50 mt-1 font-medium">{k.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Top Sectors Cards ───────────────────────────────────────── */
function TopSectorsRow({ sectors }: { sectors: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {sectors.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.07 }}
          className="rounded-2xl p-4 border border-white/10 space-y-2"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faBuilding} className="text-[12px] text-blue-400" />
            </div>
            <p className="text-xs font-bold text-white leading-tight">{s.name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-black text-white">{fmtKes(s.allocated)}</p>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, s.utilisationPercent)}%` }}
                transition={{ delay: 0.3 + i * 0.07, duration: 0.8 }}
                className="h-full rounded-full"
                style={{ background: s.utilisationPercent > 80 ? '#ef4444' : s.utilisationPercent > 50 ? '#f59e0b' : '#10b981' }}
              />
            </div>
            <p className="text-[10px] text-white/40">{fmtPct(s.utilisationPercent)} utilised</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── All Sectors Table ───────────────────────────────────────── */
function SectorsTable({ sectors }: { sectors: any[] }) {
  const [search, setSearch]     = useState('');
  const [sortKey, setSortKey]   = useState<'allocated' | 'utilised' | 'utilisationPercent'>('allocated');
  const [sortAsc, setSortAsc]   = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const depth0 = sectors.filter(s => s.depth === 0);
  const filtered = sectors.filter(s =>
    search ? s.name.toLowerCase().includes(search.toLowerCase()) : true
  );
  const sorted = [...filtered].sort((a, b) =>
    sortAsc ? a[sortKey] - b[sortKey] : b[sortKey] - a[sortKey]
  );

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }
  function toggleExpand(id: number) {
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) => sortKey === k
    ? <FontAwesomeIcon icon={sortAsc ? faSortAmountUp : faSortAmountDown} className="text-[10px] text-blue-400" />
    : <FontAwesomeIcon icon={faSortAmountDown} className="text-[10px] text-white/20" />;

  return (
    <div className="space-y-3">
      <div className="relative">
        <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-[13px]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sectors…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-white/30"
        />
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40 border-b border-white/10"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <span>Sector</span>
          <button className="flex items-center gap-1 hover:text-white/60 transition-colors" onClick={() => toggleSort('allocated')}>
            Allocated <SortIcon k="allocated" />
          </button>
          <button className="flex items-center gap-1 hover:text-white/60 transition-colors" onClick={() => toggleSort('utilised')}>
            Utilised <SortIcon k="utilised" />
          </button>
          <button className="flex items-center gap-1 hover:text-white/60 transition-colors" onClick={() => toggleSort('utilisationPercent')}>
            Rate <SortIcon k="utilisationPercent" />
          </button>
        </div>
        {/* Table rows */}
        <div className="divide-y divide-white/5">
          {sorted.slice(0, expanded.size > 0 ? sorted.length : 20).map(s => {
            const children = sectors.filter(c => c.parentId === s.id);
            const hasChildren = children.length > 0;
            const isExpanded = expanded.has(s.id);
            const pct = s.utilisationPercent;
            return (
              <div key={s.id}>
                <button
                  onClick={() => hasChildren && toggleExpand(s.id)}
                  className={`grid grid-cols-4 w-full px-4 py-3 text-left hover:bg-white/5 transition-colors ${s.depth === 0 ? 'bg-white/[0.02]' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: `${s.depth * 16}px` }}>
                    {hasChildren && (
                      <FontAwesomeIcon
                        icon={isExpanded ? faChevronDown : faChevronRight}
                        className="text-[10px] text-white/30 shrink-0"
                      />
                    )}
                    <span className={`text-sm truncate ${s.depth === 0 ? 'font-bold text-white' : 'font-medium text-white/70'}`}>
                      {s.name}
                    </span>
                  </div>
                  <span className="text-sm text-white/80 font-semibold">{fmtKes(s.allocated)}</span>
                  <span className="text-sm text-white/60">{fmtKes(s.utilised)}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${pct > 80 ? 'text-red-400' : pct > 50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {fmtPct(pct)}
                    </span>
                  </div>
                </button>
                <AnimatePresence>
                  {isExpanded && children.map(child => (
                    <motion.div
                      key={child.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-4 px-4 py-2.5 bg-white/[0.015] border-t border-white/5"
                    >
                      <span className="text-xs text-white/50 truncate" style={{ paddingLeft: `${child.depth * 16}px` }}>
                        {child.name}
                      </span>
                      <span className="text-xs text-white/50">{fmtKes(child.allocated)}</span>
                      <span className="text-xs text-white/40">{fmtKes(child.utilised)}</span>
                      <span className={`text-xs font-semibold ${child.utilisationPercent > 80 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {fmtPct(child.utilisationPercent)}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


/* ── Procurement Feed ────────────────────────────────────────── */
function ProcurementFeed({ items }: { items: any[] }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-center gap-4 px-4 py-3 rounded-xl border border-white/10"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <FontAwesomeIcon icon={faCheck} className="text-[13px] text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{item.department}</p>
            <p className="text-xs text-white/40">{item.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-emerald-400">{fmtKes(item.amount)}</p>
            <p className="text-[10px] text-white/30">
              {item.approvedAt ? new Date(item.approvedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' }) : '—'}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function PublicPage() {
  const [, navigate] = useLocation();
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch('/api/public/summary')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError('Failed to load data.'); setLoading(false); });
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* ── Nav ──────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10 backdrop-blur-sm sticky top-0 z-50"
        style={{ background: 'rgba(15,23,42,0.8)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <FontAwesomeIcon icon={faShieldAlt} className="text-[14px] text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-black text-white">Budget Monitor</p>
            <p className="text-[10px] text-white/40">Public Transparency Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40 hidden sm:block">
            {data?.financialYear ? `FY ${data.financialYear}` : ''}
          </span>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-500/40 text-sm font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors"
          >
            <FontAwesomeIcon icon={faArrowRight} className="text-[12px]" />
            Login
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-16">
        {loading ? (
          <div className="py-32 text-center text-white/40">Loading budget data…</div>
        ) : error ? (
          <div className="py-32 text-center text-red-400">{error}</div>
        ) : (
          <>
            {/* ── Hero ─────────────────────────────────────── */}
            <section className="text-center space-y-6">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/30 text-xs font-bold text-blue-400 mb-4"
                  style={{ background: 'rgba(59,130,246,0.08)' }}>
                  <FontAwesomeIcon icon={faGlobe} className="text-[11px]" />
                  LIVE DATA — FY {data.financialYear}
                </span>
                <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
                  Kenya National Budget<br />
                  <span className="text-blue-400">Transparency Portal</span>
                </h1>
                <p className="text-base text-white/50 max-w-xl mx-auto mt-4">
                  Real-time public visibility into government budget allocations, utilisation, and procurement.
                  No PII. No login required.
                </p>
              </motion.div>
            </section>

            {/* ── KPI Band ─────────────────────────────────── */}
            <section>
              <KPIBand data={data} />
            </section>

            {/* ── Top Sectors ──────────────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white">Top 5 Sectors by Allocation</h2>
              </div>
              <TopSectorsRow sectors={data.topSectors ?? []} />
            </section>

            {/* ── Utilisation Bar Chart ─────────────────────── */}
            {data.topSectors?.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-black text-white">Allocation vs Utilisation</h2>
                <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.topSectors} barGap={4} barCategoryGap="30%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => fmtKes(v)} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                        formatter={(v: number, name) => [fmtKes(v), name === 'allocated' ? 'Allocated' : 'Utilised']}
                      />
                      <Bar dataKey="allocated" fill="rgba(59,130,246,0.7)" radius={[6,6,0,0]} name="allocated" />
                      <Bar dataKey="utilised"  fill="rgba(16,185,129,0.7)"  radius={[6,6,0,0]} name="utilised" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* ── All Sectors Table ─────────────────────────── */}
            <section className="space-y-4">
              <h2 className="text-xl font-black text-white">All Sectors</h2>
              <SectorsTable sectors={data.allSectors ?? []} />
            </section>

            {/* ── Procurement Feed ─────────────────────────── */}
            {data.recentProcurement?.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-black text-white">Recent Approved Procurement</h2>
                <ProcurementFeed items={data.recentProcurement.slice(0, 10)} />
              </section>
            )}

            {/* ── Monthly Utilisation Chart ──────────────────── */}
            {data.monthlyUtilisation?.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-xl font-black text-white">Monthly Utilisation Rate</h2>
                <div className="rounded-2xl border border-white/10 p-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={data.monthlyUtilisation}>
                      <defs>
                        <linearGradient id="utilGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis unit="%" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontSize: 12 }}
                        formatter={(v: number) => [`${v.toFixed(1)}%`, 'Utilisation Rate']}
                      />
                      <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} fill="url(#utilGradient)" dot={{ fill: '#3b82f6', r: 4 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}

            {/* ── Footer ───────────────────────────────────── */}
            <footer className="text-center py-12 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <FontAwesomeIcon icon={faShieldAlt} className="text-blue-400 text-[14px]" />
                <span className="text-sm font-bold text-white">Kenya Budget Monitor</span>
              </div>
              <p className="text-xs text-white/30">
                Data refreshed every 5 minutes · No personal information is displayed · 
                {data?.lastUpdated && ` Last updated ${new Date(data.lastUpdated).toLocaleTimeString('en-KE', { timeStyle: 'short' })}`}
              </p>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors"
              >
                Authorized users — Login here <FontAwesomeIcon icon={faArrowRight} className="text-[11px]" />
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
