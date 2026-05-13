import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Wallet, Percent } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronDown, faProjectDiagram, faUndo, faGripVertical, faExpand, faCompress, faTimes, faExternalLinkAlt, faChartLine, faWallet, faSearchPlus, faChevronUp, faChevronLeft, faLayerGroup, faList, faCog, faPercentage, faHome, faDownload, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
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

function PopupContent({ node, onClose, onDesign }: { node: SectorTreeNode; onClose: () => void; onDesign?: (node: SectorTreeNode) => void }) {
  const u = utilizationLabel(node.utilizationPct);

  // Pie: net received vs available (clamp negatives to 0 for display)
  const netRec = Math.max(0, node.netAllocated);
  const avail = Math.max(0, node.availableBalance);
  const pieData = (netRec + avail) > 0
    ? [
        { name: 'Allocated', value: netRec, color: '#3b82f6' },
        { name: 'Available', value: avail, color: '#10b981' },
      ]
    : [{ name: 'No data', value: 1, color: 'rgba(255,255,255,0.06)' }];

  // Bar: child sectors comparison
  const children = Array.isArray(node.children) ? node.children : [];
  const barData = children.slice(0, 8).map((c: SectorTreeNode) => ({
    name: c.name.replace('Ministry of ', '').replace('Department of ', '').slice(0, 14),
    pct: Math.round(c.utilizationPct),
    allocated: Math.max(0, c.netAllocated),
  }));

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="bd"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />

      {/* Card */}
      <motion.div
        key="popup"
        initial={{ opacity: 0, scale: 0.90, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
          pointerEvents: 'none',
        }}
      >
        <div
          className="pointer-events-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl flex flex-col"
          style={{
            background: 'linear-gradient(135deg, rgba(10,18,40,0.99) 0%, rgba(15,25,55,0.99) 100%)',
            border: '1px solid rgba(255,255,255,0.13)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.04) inset',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 pb-4 shrink-0">
            <div className="flex items-center gap-5">
              <UtilizationRing value={node.utilizationPct} size={88} strokeWidth={6} />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-gray-900">{node.name}</h2>
                  <Badge variant="outline" className="font-bold text-xs uppercase tracking-widest">
                    {node.code}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn('text-xs font-bold px-2.5 py-1 rounded-full border', u.cls)}>
                    {u.label} · {Math.round(node.utilizationPct)}% used
                  </span>
                  {children.length > 0 && (
                    <span className="text-xs text-gray-400">
                      {children.length} sub-sector{children.length !== 1 ? 's' : ''}
                    </span>
                  )}
                  {node.responsibleUser && (
                    <span className="text-xs text-gray-400">
                      Head: <span className="text-gray-600">{node.responsibleUser.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
            >
              <FontAwesomeIcon icon={faTimes} className={`text-[${18}px] `} />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 px-6 py-4 border-t border-b border-gray-200">
            {[
              { label: 'Net Received', val: node.netAllocated, icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10', isPercent: false },
              { label: 'Available', val: node.availableBalance, icon: Wallet, color: node.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400', bg: node.availableBalance < 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10', isPercent: false },
              { label: 'Utilization', val: node.utilizationPct, icon: Percent, color: node.utilizationPct >= 90 ? 'text-rose-400' : node.utilizationPct >= 70 ? 'text-amber-400' : 'text-blue-400', bg: node.utilizationPct >= 90 ? 'bg-rose-500/10' : 'bg-blue-500/10', isPercent: true },
            ].map(({ label, val, icon: Icon, color, bg, isPercent }) => (
              <div key={label} className="glass p-4 rounded-2xl">
                <div className={cn('p-2 rounded-lg w-fit mb-2', bg)}>
                  <Icon size={14} className={color} />
                </div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{label}</p>
                <p className={cn('text-sm font-bold mt-1', color)}>
                  {isPercent ? `${Math.round(val)}%` : formatCurrency(val)}
                </p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4 p-6">
            {/* Donut */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Budget Split</p>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={TT.contentStyle}
                    itemStyle={TT.itemStyle}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-3 justify-center mt-1">
                {pieData.filter(d => d.name !== 'No data').map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] text-gray-500">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Child bars */}
            {barData.length > 0 ? (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Sub-sector Utilization</p>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} hide />
                    <YAxis type="category" dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={9} tickLine={false} axisLine={false} width={75} />
                    <Tooltip
                      contentStyle={TT.contentStyle}
                      itemStyle={TT.itemStyle}
                      formatter={(v: number) => [`${v}%`, 'Utilization']}
                    />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={14}>
                      {barData.map((d: { name: string; pct: number; allocated: number }, i: number) => (
                        <Cell key={i} fill={d.pct >= 90 ? '#ef4444' : d.pct >= 70 ? '#f59e0b' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center text-gray-400 text-xs">
                No sub-sectors
              </div>
            )}
          </div>

          {/* Children mini-list */}
          {children.length > 0 && (
            <div className="px-6 pb-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-3">Sub-sectors</p>
              <div className="space-y-2">
                {children.slice(0, 6).map((c: SectorTreeNode) => (
                  <div key={c.id} className="glass rounded-xl p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{c.name}</p>
                      <div className="mt-1.5 h-1 w-full bg-gray-50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, c.utilizationPct)}%`,
                            background: c.utilizationPct >= 90 ? '#ef4444' : c.utilizationPct >= 70 ? '#f59e0b' : '#3b82f6',
                          }}
                        />
                      </div>
                    </div>
                    <span className={cn(
                      'text-xs font-bold shrink-0',
                      c.utilizationPct >= 90 ? 'text-rose-400' : c.utilizationPct >= 70 ? 'text-amber-400' : 'text-blue-400',
                    )}>
                      {Math.round(c.utilizationPct)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center gap-3 px-6 pb-6 pt-2 border-t border-gray-200 mt-2 shrink-0">
            <Link href={`/sectors/${node.id}`}>
              <a className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 text-sm font-semibold transition-all">
                <FontAwesomeIcon icon={faExternalLinkAlt} className={`text-[${14}px] `} />
                Full Detail
              </a>
            </Link>
            {onDesign && (
              <button
                onClick={() => onDesign(node)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-900 text-sm font-semibold transition-all"
              >
                <FontAwesomeIcon icon={faCog} className={`text-[${14}px] `} />
                Edit in Designer
              </button>
            )}
            <button
              onClick={onClose}
              className="ml-auto px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-50 border border-gray-200 text-gray-500 text-sm transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

export function OrgChartPopup({ node, onClose, onDesign }: OrgChartPopupProps) {
  const mountRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    mountRef.current = document.body;
  }, []);

  const content = (
    <AnimatePresence>
      {node && <PopupContent node={node} onClose={onClose} onDesign={onDesign} />}
    </AnimatePresence>
  );

  // Render into document.body to escape any Framer Motion transform stacking contexts
  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
