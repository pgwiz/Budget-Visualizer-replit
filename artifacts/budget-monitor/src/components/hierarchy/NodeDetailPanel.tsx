import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, TrendingUp, Wallet, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { SectorTreeNode } from '@workspace/api-client-react';
import { UtilizationRing } from './UtilizationRing';
import { formatCurrency } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NodeDetailPanelProps {
  node: SectorTreeNode | null;
  onClose: () => void;
}

function utilizationColor(pct: number) {
  if (pct >= 90) return 'text-rose-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-blue-400';
}

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'rgba(10,15,30,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    fontSize: 12,
  },
  itemStyle: { color: '#fff' },
};

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="panel"
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed top-0 right-0 h-full w-[420px] z-50 flex flex-col overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(20,30,55,0.98) 100%)',
              borderLeft: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-white/10 shrink-0">
              <div className="flex items-start gap-4">
                <UtilizationRing value={node.utilizationPct} size={72} strokeWidth={5} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-white leading-tight">{node.name}</h3>
                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider shrink-0">
                      {node.code}
                    </Badge>
                  </div>
                  <p className={cn('text-sm font-semibold mt-1', utilizationColor(node.utilizationPct))}>
                    {Math.round(node.utilizationPct)}% utilization
                  </p>
                  {node.children && node.children.length > 0 && (
                    <p className="text-xs text-white/40 mt-0.5">{node.children.length} sub-sector{node.children.length > 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              {/* Stat pills */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Allocated', value: node.netAllocated, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Available', value: node.availableBalance, icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="glass p-4 rounded-xl">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', bg)}>
                      <Icon size={16} className={color} />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold">{label}</p>
                    <p className={cn('text-sm font-bold mt-0.5', color)}>{formatCurrency(value)}</p>
                  </div>
                ))}
              </div>

              {/* Budget split donut */}
              <Section title="Budget Split">
                {(() => {
                  const allocated = Math.max(0, node.netAllocated);
                  const available = Math.max(0, node.availableBalance);
                  const total = allocated + available;
                  if (total === 0) return <EmptyChart text="No budget data yet" />;

                  const data = [
                    { name: 'Allocated', value: allocated, color: '#3b82f6' },
                    { name: 'Available', value: available, color: '#10b981' },
                  ];

                  return (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width={120} height={120}>
                        <PieChart>
                          <Pie
                            data={data}
                            innerRadius={36}
                            outerRadius={52}
                            paddingAngle={3}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                          >
                            {data.map((d) => (
                              <Cell key={d.name} fill={d.color} opacity={0.9} />
                            ))}
                          </Pie>
                          <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3 flex-1">
                        {data.map((d) => (
                          <div key={d.name}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                <span className="text-xs text-white/60">{d.name}</span>
                              </div>
                              <span className="text-xs font-bold text-white">
                                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
                              </span>
                            </div>
                            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${total > 0 ? (d.value / total) * 100 : 0}%`,
                                  backgroundColor: d.color,
                                }}
                              />
                            </div>
                            <p className="text-[10px] text-white/30 mt-0.5">{formatCurrency(d.value)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </Section>

              {/* Children comparison */}
              {node.children && node.children.length > 0 && (
                <Section title="Sub-Sector Comparison">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={node.children.slice(0, 6).map((c: SectorTreeNode) => ({
                        name: c.code,
                        fullName: c.name,
                        allocated: c.netAllocated,
                        available: c.availableBalance,
                      }))}
                      layout="vertical"
                      margin={{ left: 0, right: 8, top: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis
                        type="number"
                        stroke="rgba(255,255,255,0.3)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="rgba(255,255,255,0.4)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={32}
                      />
                      <Tooltip
                        {...TOOLTIP_STYLE}
                        formatter={(v: number) => formatCurrency(v)}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ''}
                      />
                      <Bar dataKey="allocated" name="Allocated" fill="#3b82f6" radius={[0, 3, 3, 0]} />
                      <Bar dataKey="available" name="Available" fill="rgba(16,185,129,0.4)" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Child node pills */}
                  <div className="mt-4 space-y-2">
                    {node.children.map((child: SectorTreeNode) => (
                      <ChildPill key={child.id} child={child} />
                    ))}
                  </div>
                </Section>
              )}
            </div>

            {/* Footer CTA */}
            <div className="p-4 border-t border-white/10 shrink-0">
              <Link href={`/sectors/${node.id}`}>
                <a className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-semibold text-sm transition-all duration-200 hover:border-blue-400/50">
                  <ExternalLink size={15} />
                  View Full Details
                </a>
              </Link>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">{title}</h4>
      {children}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-20 flex items-center justify-center text-white/30 text-sm italic">{text}</div>
  );
}

function ChildPill({ child }: { child: SectorTreeNode }) {
  const pct = child.utilizationPct;
  const color = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6';

  return (
    <Link href={`/sectors/${child.id}`}>
      <a className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/80 truncate">{child.name}</span>
            <span className="text-[10px] font-bold ml-2 shrink-0" style={{ color }}>{Math.round(pct)}%</span>
          </div>
          <div className="h-1 w-full bg-white/10 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: color }} />
          </div>
        </div>
        <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
      </a>
    </Link>
  );
}
