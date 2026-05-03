import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Settings2, TrendingUp, Wallet, Percent } from 'lucide-react';
import { Link } from 'wouter';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { SectorTreeNode } from '@workspace/api-client-react';
import { UtilizationRing } from '@/components/hierarchy/UtilizationRing';
import { formatCurrency } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OrgChartPopupProps {
  node: SectorTreeNode | null;
  onClose: () => void;
  onDesign?: (node: SectorTreeNode) => void;
}

const TT = {
  contentStyle: {
    backgroundColor: 'rgba(5,10,25,0.98)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    fontSize: 12,
  },
  itemStyle: { color: '#fff' },
};

function utilizationLabel(pct: number) {
  if (pct >= 90) return { label: 'Critical', cls: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
  if (pct >= 70) return { label: 'High', cls: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
  if (pct >= 40) return { label: 'Normal', cls: 'text-blue-400 bg-blue-500/15 border-blue-500/30' };
  return { label: 'Low', cls: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
}

export function OrgChartPopup({ node, onClose, onDesign }: OrgChartPopupProps) {
  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            key="bd"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            key="popup"
            initial={{ opacity: 0, scale: 0.88, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', damping: 24, stiffness: 280 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-4"
          >
            <div
              className="pointer-events-auto w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl flex flex-col"
              style={{
                background: 'linear-gradient(135deg, rgba(10,18,40,0.98) 0%, rgba(15,25,55,0.98) 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04) inset',
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 pb-4 shrink-0">
                <div className="flex items-center gap-5">
                  <UtilizationRing value={node.utilizationPct} size={88} strokeWidth={6} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-white">{node.name}</h2>
                      <Badge variant="outline" className="font-bold text-xs uppercase tracking-widest">
                        {node.code}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(() => {
                        const u = utilizationLabel(node.utilizationPct);
                        return (
                          <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', u.cls)}>
                            {u.label} · {Math.round(node.utilizationPct)}% used
                          </span>
                        );
                      })()}
                      {node.children?.length > 0 && (
                        <span className="text-xs text-white/30">
                          {node.children.length} sub-sector{node.children.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {node.responsibleUser && (
                        <span className="text-xs text-white/30">
                          Head: <span className="text-white/60">{node.responsibleUser.name}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/10 transition-colors shrink-0"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3 px-6 py-4 border-t border-b border-white/8">
                {[
                  { label: 'Net Received', val: node.netAllocated, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Available', val: node.availableBalance, icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                  { label: 'Utilization', val: node.utilizationPct, icon: Percent, color: node.utilizationPct >= 90 ? 'text-rose-400' : node.utilizationPct >= 70 ? 'text-amber-400' : 'text-blue-400', bg: node.utilizationPct >= 90 ? 'bg-rose-500/10' : 'bg-blue-500/10', isPercent: true },
                ].map(({ label, val, icon: Icon, color, bg, isPercent }: any) => (
                  <div key={label} className="glass p-4 rounded-2xl">
                    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-2', bg)}>
                      <Icon size={15} className={color} />
                    </div>
                    <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold">{label}</p>
                    <p className={cn('text-sm font-bold mt-0.5', color)}>
                      {isPercent ? `${Math.round(val)}%` : formatCurrency(val)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Charts section */}
              <div className="p-6 grid grid-cols-2 gap-6">
                {/* Donut */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Budget Split</p>
                  {(node.netAllocated + node.availableBalance) > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Allocated Out', value: Math.max(0, node.netAllocated) },
                              { name: 'Available', value: Math.max(0, node.availableBalance) },
                            ]}
                            innerRadius={45}
                            outerRadius={68}
                            paddingAngle={4}
                            dataKey="value"
                            startAngle={90}
                            endAngle={-270}
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#10b981" />
                          </Pie>
                          <Tooltip {...TT} formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2 mt-1">
                        {[
                          { name: 'Allocated', val: node.netAllocated, c: '#3b82f6' },
                          { name: 'Available', val: node.availableBalance, c: '#10b981' },
                        ].map((d) => {
                          const total = node.netAllocated + node.availableBalance;
                          const pct = total > 0 ? (d.val / total) * 100 : 0;
                          return (
                            <div key={d.name}>
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <span className="text-white/40">{d.name}</span>
                                <span style={{ color: d.c }} className="font-bold">{Math.round(pct)}%</span>
                              </div>
                              <div className="h-1 w-full bg-white/8 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.c }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="h-40 flex items-center justify-center text-white/20 italic text-sm">No budget yet</div>
                  )}
                </div>

                {/* Children comparison */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">
                    {node.children?.length > 0 ? 'Sub-Sector Breakdown' : 'Position in Hierarchy'}
                  </p>
                  {node.children?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart
                        data={node.children.slice(0, 5).map((c) => ({
                          name: c.code,
                          fullName: c.name,
                          allocated: c.netAllocated,
                          pct: Math.round(c.utilizationPct),
                        }))}
                        layout="vertical"
                        margin={{ left: 0, right: 4, top: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                        <XAxis type="number" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} />
                        <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} width={30} />
                        <Tooltip
                          {...TT}
                          formatter={(v: number) => formatCurrency(v)}
                          labelFormatter={(_, p) => p?.[0]?.payload?.fullName ?? ''}
                        />
                        <Bar dataKey="allocated" name="Allocated" radius={[0, 4, 4, 0]} maxBarSize={18}>
                          {node.children.slice(0, 5).map((c, i) => (
                            <Cell key={i} fill={
                              c.utilizationPct >= 90 ? '#ef4444' :
                              c.utilizationPct >= 70 ? '#f59e0b' : '#3b82f6'
                            } />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[180px] flex flex-col items-center justify-center gap-3 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                        <Wallet size={20} className="text-white/20" />
                      </div>
                      <p className="text-sm text-white/30">Leaf-level sector</p>
                      <p className="text-xs text-white/20">No sub-sectors defined</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Children mini list */}
              {node.children?.length > 0 && (
                <div className="px-6 pb-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold mb-3">Sub-Sectors</p>
                  <div className="grid grid-cols-2 gap-2">
                    {node.children.map((child) => {
                      const pct = child.utilizationPct;
                      const col = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6';
                      return (
                        <div key={child.id} className="flex items-center gap-2.5 p-2.5 rounded-xl glass">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{child.name}</p>
                            <div className="h-1 w-full bg-white/10 rounded-full mt-1 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, backgroundColor: col }} />
                            </div>
                          </div>
                          <span className="text-[10px] font-bold shrink-0" style={{ color: col }}>{Math.round(pct)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer actions */}
              <div className="flex gap-3 p-6 pt-4 border-t border-white/8 shrink-0">
                <Link href={`/sectors/${node.id}`}>
                  <a className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 font-semibold text-sm transition-all hover:border-blue-400/50">
                    <ExternalLink size={15} />
                    Full Details
                  </a>
                </Link>
                {onDesign && (
                  <button
                    onClick={() => onDesign(node)}
                    className="flex items-center gap-2 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white font-semibold text-sm transition-all"
                  >
                    <Settings2 size={15} />
                    Edit Structure
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
