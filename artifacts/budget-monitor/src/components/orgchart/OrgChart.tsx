import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { SectorTreeNode } from '@workspace/api-client-react';
import { UtilizationRing } from '@/components/hierarchy/UtilizationRing';
import { OrgChartPopup } from './OrgChartPopup';
import { formatCurrency } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/* ─────────────────────────────────────────────────────────── */
/*  Layout constants & types                                   */
/* ─────────────────────────────────────────────────────────── */
const NODE_W = 216;
const NODE_H = 158;
const GAP_H = 28;   // horizontal gap between siblings
const GAP_V = 88;   // vertical gap between levels
const RING_SIZE = 52;

interface LayoutNode {
  node: SectorTreeNode;
  x: number;   // left
  y: number;   // top
  cx: number;  // center-x
  cy: number;  // center-y
  children: LayoutNode[];
  depth: number;
}

function countLeaves(n: SectorTreeNode): number {
  if (!n.children || n.children.length === 0) return 1;
  return n.children.reduce((s, c) => s + countLeaves(c), 0);
}

function layoutTree(n: SectorTreeNode, xStart: number, depth: number): LayoutNode {
  const leaves = countLeaves(n);
  const slotW = leaves * (NODE_W + GAP_H);
  const x = xStart + slotW / 2 - NODE_W / 2;
  const y = depth * (NODE_H + GAP_V);
  let childX = xStart;
  const children: LayoutNode[] = (n.children ?? []).map((c) => {
    const ln = layoutTree(c, childX, depth + 1);
    childX += countLeaves(c) * (NODE_W + GAP_H);
    return ln;
  });
  return { node: n, x, y, cx: x + NODE_W / 2, cy: y + NODE_H / 2, children, depth };
}

function computeAll(roots: SectorTreeNode[]): { nodes: LayoutNode[]; w: number; h: number } {
  let xStart = 0;
  const nodes: LayoutNode[] = roots.map((r) => {
    const ln = layoutTree(r, xStart, 0);
    xStart += countLeaves(r) * (NODE_W + GAP_H);
    return ln;
  });
  const w = xStart;
  function maxDepth(n: SectorTreeNode, d: number): number {
    if (!n.children || n.children.length === 0) return d;
    return Math.max(...n.children.map((c) => maxDepth(c, d + 1)));
  }
  const maxD = roots.length > 0 ? Math.max(...roots.map((r) => maxDepth(r, 0))) : 0;
  const h = (maxD + 1) * (NODE_H + GAP_V) + 20;
  return { nodes, w, h };
}

function flattenLayout(nodes: LayoutNode[]): LayoutNode[] {
  const result: LayoutNode[] = [];
  function traverse(n: LayoutNode) {
    result.push(n);
    n.children.forEach(traverse);
  }
  nodes.forEach(traverse);
  return result;
}

/* ─────────────────────────────────────────────────────────── */
/*  Connector SVG paths                                        */
/* ─────────────────────────────────────────────────────────── */
function Connectors({ nodes }: { nodes: LayoutNode[] }) {
  const paths: React.ReactNode[] = [];
  function draw(n: LayoutNode) {
    const parentBottom = n.y + NODE_H;
    n.children.forEach((child) => {
      const childTop = child.y;
      const midY = (parentBottom + childTop) / 2;
      const d = `M ${n.cx} ${parentBottom} C ${n.cx} ${midY}, ${child.cx} ${midY}, ${child.cx} ${childTop}`;
      paths.push(
        <path
          key={`${n.node.id}-${child.node.id}`}
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1.5}
          strokeDasharray="4 4"
        />,
      );
      draw(child);
    });
  }
  nodes.forEach(draw);
  return <>{paths}</>;
}

/* ─────────────────────────────────────────────────────────── */
/*  Individual node card                                       */
/* ─────────────────────────────────────────────────────────── */
function nodeBorderColor(pct: number) {
  if (pct >= 90) return 'rgba(239,68,68,0.5)';
  if (pct >= 70) return 'rgba(245,158,11,0.45)';
  if (pct >= 40) return 'rgba(59,130,246,0.4)';
  return 'rgba(16,185,129,0.35)';
}
function nodeGlow(pct: number) {
  if (pct >= 90) return 'rgba(239,68,68,0.2)';
  if (pct >= 70) return 'rgba(245,158,11,0.16)';
  if (pct >= 40) return 'rgba(59,130,246,0.15)';
  return 'rgba(16,185,129,0.12)';
}
function nodeBarColor(pct: number) {
  if (pct >= 90) return 'linear-gradient(90deg,#ef4444,#f87171)';
  if (pct >= 70) return 'linear-gradient(90deg,#f59e0b,#fcd34d)';
  return 'linear-gradient(90deg,#3b82f6,#60a5fa)';
}

interface OrgNodeProps {
  ln: LayoutNode;
  selected: boolean;
  onClick: (n: SectorTreeNode) => void;
  animDelay: number;
}

function OrgNode({ ln, selected, onClick, animDelay }: OrgNodeProps) {
  const { node, x, y } = ln;
  const pct = node.utilizationPct;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.75, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.4, delay: animDelay, type: 'spring', stiffness: 260, damping: 22 }}
      onClick={() => onClick(node)}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: NODE_W,
        height: NODE_H,
        borderRadius: 20,
        border: `1.5px solid ${selected ? 'rgba(96,165,250,0.9)' : nodeBorderColor(pct)}`,
        background: 'linear-gradient(135deg, rgba(15,24,50,0.95) 0%, rgba(20,32,65,0.95) 100%)',
        boxShadow: selected
          ? '0 0 0 3px rgba(59,130,246,0.35), 0 12px 40px rgba(59,130,246,0.3)'
          : `0 8px 32px ${nodeGlow(pct)}, 0 0 0 0.5px rgba(255,255,255,0.04) inset`,
        cursor: 'pointer',
        userSelect: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        padding: '14px',
        gap: '8px',
        transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.15s',
      }}
      whileHover={{ scale: 1.03, y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Depth badge */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
        {ln.depth === 0 && (
          <span className="text-[8px] uppercase tracking-widest font-bold text-blue-400/70 bg-blue-500/10 px-1.5 py-0.5 rounded-md">
            L1
          </span>
        )}
      </div>

      {/* Top row: ring + name */}
      <div className="flex items-start gap-3">
        <UtilizationRing
          value={pct}
          size={RING_SIZE}
          strokeWidth={4}
          className="shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-white leading-tight line-clamp-2 mb-1">{node.name}</p>
          <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0">
            {node.code}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="bg-white/5 rounded-xl p-2">
          <p className="text-[8px] uppercase tracking-wider text-white/30 font-bold">Received</p>
          <p className="text-[10px] font-bold text-blue-400 mt-0.5 truncate">{formatCurrency(node.netAllocated)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-2">
          <p className="text-[8px] uppercase tracking-wider text-white/30 font-bold">Available</p>
          <p className="text-[10px] font-bold text-emerald-400 mt-0.5 truncate">{formatCurrency(node.availableBalance)}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[8px] text-white/30">Utilization</span>
          <span className={cn('text-[9px] font-bold', pct >= 90 ? 'text-rose-400' : pct >= 70 ? 'text-amber-400' : 'text-blue-400')}>
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 1.2, delay: animDelay + 0.2 }}
            style={{ background: nodeBarColor(pct) }}
          />
        </div>
      </div>

      {/* Children count */}
      {(node.children?.length ?? 0) > 0 && (
        <div className="absolute bottom-2.5 right-3">
          <span className="text-[8px] text-white/25">
            ↓ {node.children.length} dept{node.children.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Selected pulse ring */}
      {selected && (
        <motion.div
          className="absolute inset-0 rounded-[19px] pointer-events-none"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ boxShadow: '0 0 20px rgba(59,130,246,0.5)' }}
        />
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Root / CEO node                                            */
/* ─────────────────────────────────────────────────────────── */
function RootBanner({
  cycleName,
  totalBudget,
  totalAllocated,
  canvasW,
}: {
  cycleName: string;
  totalBudget: number;
  totalAllocated: number;
  canvasW: number;
}) {
  const pct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
  const bannerW = Math.min(340, canvasW);
  const left = canvasW / 2 - bannerW / 2;
  const TOP = -100;

  return (
    <>
      {/* Connector from root to first level */}
      <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} width={canvasW} height={120} overflow="visible">
        {/* vertical line down from banner */}
        <line x1={canvasW / 2} y1={TOP + 80} x2={canvasW / 2} y2={-10} stroke="rgba(59,130,246,0.3)" strokeWidth={2} strokeDasharray="4 4" />
        {/* horizontal bar connecting L1 nodes */}
        <line x1={NODE_W / 2 + GAP_H / 2} y1={-10} x2={canvasW - NODE_W / 2 - GAP_H / 2} y2={-10} stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} strokeDasharray="4 4" />
      </svg>

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute',
          left,
          top: TOP,
          width: bannerW,
          borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(30,60,120,0.9) 0%, rgba(20,40,90,0.95) 100%)',
          border: '1.5px solid rgba(96,165,250,0.5)',
          boxShadow: '0 0 40px rgba(59,130,246,0.25), 0 8px 32px rgba(0,0,0,0.4)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div className="text-3xl">🏛️</div>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-blue-400/60 font-bold">Active Cycle</p>
          <p className="text-sm font-bold text-white mt-0.5 truncate">{cycleName || 'Government Budget'}</p>
          <p className="text-[10px] text-blue-300/70 mt-0.5">Total: {formatCurrency(totalBudget)}</p>
        </div>
        <UtilizationRing value={pct} size={56} strokeWidth={4} />
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main OrgChart component                                    */
/* ─────────────────────────────────────────────────────────── */
interface OrgChartProps {
  nodes: SectorTreeNode[];
  totalBudget?: number;
  cycleName?: string;
}

export function OrgChart({ nodes, totalBudget = 0, cycleName }: OrgChartProps) {
  const [, navigate] = useLocation();
  const [selectedNode, setSelectedNode] = useState<SectorTreeNode | null>(null);

  const { nodes: layoutNodes, w, h } = computeAll(nodes);
  const flat = flattenLayout(layoutNodes);
  const totalAllocated = nodes.reduce((s, n) => s + n.netAllocated, 0);

  const canvasW = Math.max(w, 800);
  const BANNER_EXTRA = 120; // extra top space for root banner

  const handleSelect = useCallback((n: SectorTreeNode) => {
    setSelectedNode((prev) => (prev?.id === n.id ? null : n));
  }, []);

  const handleDesign = useCallback((n: SectorTreeNode) => {
    navigate(`/hierarchy-designer?edit=${n.id}`);
  }, [navigate]);

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <p className="text-xs text-white/30 italic">Click any node to see detailed breakdown</p>
        <div className="flex items-center gap-5 flex-wrap">
          {[
            { label: 'Low (<40%)', color: '#10b981' },
            { label: 'Normal (40-70%)', color: '#3b82f6' },
            { label: 'High (70-90%)', color: '#f59e0b' },
            { label: 'Critical (>90%)', color: '#ef4444' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] text-white/40">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable canvas */}
      <div className="overflow-x-auto overflow-y-visible pb-4">
        <div
          style={{
            position: 'relative',
            width: canvasW,
            height: h + BANNER_EXTRA,
            marginTop: BANNER_EXTRA,
          }}
        >
          {/* Root banner */}
          <RootBanner
            cycleName={cycleName ?? 'Government Budget'}
            totalBudget={totalBudget}
            totalAllocated={totalAllocated}
            canvasW={canvasW}
          />

          {/* SVG connector lines */}
          <svg
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
            width={canvasW}
            height={h}
          >
            <Connectors nodes={layoutNodes} />
          </svg>

          {/* Node cards */}
          {flat.map((ln, i) => (
            <OrgNode
              key={ln.node.id}
              ln={ln}
              selected={selectedNode?.id === ln.node.id}
              onClick={handleSelect}
              animDelay={i * 0.04}
            />
          ))}

          {nodes.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-white/20 gap-3">
              <div className="text-5xl opacity-30">🌿</div>
              <p className="text-sm">No sectors to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Popup */}
      <OrgChartPopup node={selectedNode} onClose={() => setSelectedNode(null)} onDesign={handleDesign} />
    </div>
  );
}
