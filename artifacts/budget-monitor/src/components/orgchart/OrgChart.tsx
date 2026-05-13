import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SectorTreeNode } from '@workspace/api-client-react';
import { UtilizationRing } from '@/components/hierarchy/UtilizationRing';
import { OrgChartPopup } from './OrgChartPopup';
import { formatCurrency, formatCompact } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  RotateCcw, GripVertical, Maximize2, Minimize2,
  ChevronRight, ChevronLeft, Info, Layers, Network,
  Home, ChevronsRight,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Shared colour helpers                                                       */
/* ─────────────────────────────────────────────────────────────────────────── */
function nodeBorderColor(pct: number) {
  if (pct >= 90) return 'rgba(239,68,68,0.5)';
  if (pct >= 70) return 'rgba(245,158,11,0.45)';
  if (pct >= 40) return 'rgba(59,130,246,0.4)';
  return 'rgba(16,185,129,0.35)';
}
function nodeGlow(pct: number) {
  if (pct >= 90) return 'rgba(239,68,68,0.18)';
  if (pct >= 70) return 'rgba(245,158,11,0.14)';
  if (pct >= 40) return 'rgba(59,130,246,0.13)';
  return 'rgba(16,185,129,0.10)';
}
function nodeBarColor(pct: number) {
  if (pct >= 90) return 'linear-gradient(90deg,#ef4444,#f87171)';
  if (pct >= 70) return 'linear-gradient(90deg,#f59e0b,#fcd34d)';
  return 'linear-gradient(90deg,#3b82f6,#60a5fa)';
}
function pctTextColor(pct: number) {
  if (pct >= 90) return 'text-rose-400';
  if (pct >= 70) return 'text-amber-400';
  return 'text-blue-400';
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  FOCUS MODE                                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

/** Breadcrumb trail shown when drilled into a child */
function Breadcrumb({
  history,
  onHome,
  onJump,
}: {
  history: SectorTreeNode[];
  onHome:  () => void;
  onJump:  (idx: number) => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap mb-4 px-1">
      <button
        onClick={onHome}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
      >
        <Home size={11} />
        <span>Home</span>
      </button>
      {history.map((node, idx) => (
        <span key={node.id} className="flex items-center gap-1">
          <ChevronsRight size={10} className="text-white/20" />
          <button
            onClick={() => onJump(idx)}
            className={cn(
              'text-xs px-2 py-1 rounded-lg transition-colors',
              idx === history.length - 1
                ? 'text-white font-semibold bg-white/8 cursor-default'
                : 'text-white/40 hover:text-white hover:bg-white/5',
            )}
          >
            {node.name.length > 28 ? node.name.slice(0, 28) + '…' : node.name}
          </button>
        </span>
      ))}
    </div>
  );
}

/** The big "parent" card shown at the top when drilled in */
function FocusParentCard({
  node,
  onBack,
  onInfo,
}: {
  node:    SectorTreeNode;
  onBack:  () => void;
  onInfo:  (n: SectorTreeNode) => void;
}) {
  const pct = node.utilizationPct;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35 }}
      className="mb-6 rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(20,40,100,0.85) 0%, rgba(15,28,70,0.92) 100%)',
        border: `1.5px solid ${nodeBorderColor(pct)}`,
        boxShadow: `0 12px 48px ${nodeGlow(pct)}, 0 0 0 1px rgba(255,255,255,0.04) inset`,
      }}
    >
      {/* Subtle glow blob */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: nodeGlow(pct), filter: 'blur(32px)' }}
      />

      {/* Back button */}
      <button
        onClick={onBack}
        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white text-xs font-semibold transition-all"
      >
        <ChevronLeft size={13} />
        Back
      </button>

      <UtilizationRing value={pct} size={72} strokeWidth={5} className="shrink-0" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-bold text-white leading-tight">{node.name}</h3>
          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest shrink-0">
            {node.code}
          </Badge>
        </div>
        {node.responsibleUser && (
          <p className="text-xs text-white/30 mt-0.5">Head: {node.responsibleUser.name}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Received</p>
            <p className="text-sm font-bold text-blue-400">{formatCompact(node.netAllocated)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Available</p>
            <p className={cn('text-sm font-bold', node.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400')}>
              {formatCompact(node.availableBalance)}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Utilization</p>
            <p className={cn('text-sm font-bold', pctTextColor(pct))}>{Math.round(pct)}%</p>
          </div>
          {(node.children?.length ?? 0) > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Sub-sectors</p>
              <p className="text-sm font-bold text-white/60">{node.childCount}</p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() => onInfo(node)}
        className="shrink-0 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/30 hover:text-white transition-all"
        title="Details"
      >
        <Info size={15} />
      </button>
    </motion.div>
  );
}

/** Root-level header shown when not drilled in (at top level) */
function FocusRootHeader({
  nodes,
  cycleName,
  totalBudget,
}: {
  nodes: SectorTreeNode[];
  cycleName?: string;
  totalBudget: number;
}) {
  const totalAllocated = nodes.reduce((s, n) => s + n.netAllocated, 0);
  const pct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 rounded-2xl p-5 flex items-center gap-5 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(30,60,120,0.8) 0%, rgba(20,40,90,0.9) 100%)',
        border: '1.5px solid rgba(96,165,250,0.4)',
        boxShadow: '0 12px 48px rgba(59,130,246,0.18), 0 0 0 1px rgba(255,255,255,0.04) inset',
      }}
    >
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'rgba(59,130,246,0.15)', filter: 'blur(32px)' }} />
      <div className="text-3xl">🏛️</div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-blue-400/60 font-bold">Active Cycle</p>
        <h3 className="text-lg font-bold text-white mt-0.5">{cycleName || 'Government Budget'}</h3>
        <div className="flex items-center gap-4 mt-2">
          <div>
            <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider">Total Budget</p>
            <p className="text-sm font-bold text-blue-400">{formatCompact(totalBudget)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider">Allocated</p>
            <p className="text-sm font-bold text-white/70">{formatCompact(totalAllocated)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase text-white/30 font-bold tracking-wider">Top Sectors</p>
            <p className="text-sm font-bold text-white/70">{nodes.length}</p>
          </div>
        </div>
      </div>
      <UtilizationRing value={pct} size={72} strokeWidth={5} className="shrink-0" />
    </motion.div>
  );
}

/** A single child card in the grid */
function ChildCard({
  node,
  onDrillIn,
  onInfo,
  animDelay,
}: {
  node:       SectorTreeNode;
  onDrillIn:  (n: SectorTreeNode) => void;
  onInfo:     (n: SectorTreeNode) => void;
  animDelay:  number;
}) {
  const pct        = node.utilizationPct;
  const hasKids    = (node.childCount ?? node.children?.length ?? 0) > 0;
  const kidCount   = node.childCount ?? node.children?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.32, delay: animDelay, type: 'spring', stiffness: 280, damping: 24 }}
      className="group relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: 'linear-gradient(135deg, rgba(12,20,48,0.97) 0%, rgba(16,28,60,0.97) 100%)',
        border: `1.5px solid ${nodeBorderColor(pct)}`,
        boxShadow: `0 4px 24px ${nodeGlow(pct)}`,
        cursor: hasKids ? 'pointer' : 'default',
      }}
      onClick={() => hasKids && onDrillIn(node)}
      whileHover={hasKids ? { scale: 1.025, y: -2 } : {}}
      whileTap={hasKids ? { scale: 0.98 } : {}}
    >
      {/* Top: ring + name + code */}
      <div className="flex items-start gap-3 p-4 pb-2">
        <UtilizationRing value={pct} size={52} strokeWidth={3.5} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white leading-snug line-clamp-2 group-hover:text-blue-200 transition-colors">
            {node.name}
          </p>
          <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest px-1 py-0 mt-1">
            {node.code}
          </Badge>
        </div>
        {/* Info button */}
        <button
          className="shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all"
          onClick={(e) => { e.stopPropagation(); onInfo(node); }}
          title="View details"
        >
          <Info size={13} />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-1.5 px-4 pb-3">
        <div className="bg-white/5 rounded-xl p-2">
          <p className="text-[8px] uppercase tracking-wider text-white/30 font-bold">Received</p>
          <p className="text-[10px] font-bold text-blue-400 mt-0.5 truncate" title={formatCurrency(node.netAllocated)}>
            {formatCompact(node.netAllocated)}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl p-2">
          <p className="text-[8px] uppercase tracking-wider text-white/30 font-bold">Available</p>
          <p className={cn('text-[10px] font-bold mt-0.5 truncate', node.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400')}
             title={formatCurrency(node.availableBalance)}>
            {formatCompact(node.availableBalance)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex justify-between text-[8px] mb-1">
          <span className="text-white/30">Utilization</span>
          <span className={cn('font-bold', pctTextColor(pct))}>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 1.0, delay: animDelay + 0.15 }}
            style={{ background: nodeBarColor(pct) }}
          />
        </div>
      </div>

      {/* Footer: sub-sectors count + drill-in cue */}
      <div className="flex items-center justify-between px-4 py-2 mt-auto border-t border-white/5">
        {hasKids ? (
          <>
            <span className="text-[9px] text-white/30">
              {kidCount} sub-sector{kidCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-0.5 text-[9px] text-blue-400/60 group-hover:text-blue-400 transition-colors font-semibold">
              Explore <ChevronRight size={10} />
            </span>
          </>
        ) : (
          <span className="text-[9px] text-white/20 italic">Leaf sector</span>
        )}
      </div>

      {/* Right-edge glow strip on hover */}
      <div
        className="absolute right-0 top-0 bottom-0 w-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(180deg, transparent, ${nodeBorderColor(pct)}, transparent)` }}
      />
    </motion.div>
  );
}

/** Focus mode: drill-down one level at a time */
function FocusMode({
  rootNodes,
  cycleName,
  totalBudget,
  onOpenPopup,
}: {
  rootNodes:   SectorTreeNode[];
  cycleName?:  string;
  totalBudget: number;
  onOpenPopup: (n: SectorTreeNode) => void;
}) {
  // history = stack of nodes we drilled through (oldest → newest)
  const [history, setHistory] = useState<SectorTreeNode[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1);

  const currentParent = history.length > 0 ? history[history.length - 1] : null;
  const children      = currentParent ? (currentParent.children ?? []) : rootNodes;

  const drillIn = useCallback((node: SectorTreeNode) => {
    if ((node.childCount ?? node.children?.length ?? 0) === 0) {
      // No children → open popup instead
      onOpenPopup(node);
      return;
    }
    setDirection(1);
    setHistory(prev => [...prev, node]);
  }, [onOpenPopup]);

  const goBack = useCallback(() => {
    setDirection(-1);
    setHistory(prev => prev.slice(0, -1));
  }, []);

  const goHome = useCallback(() => {
    setDirection(-1);
    setHistory([]);
  }, []);

  const jumpTo = useCallback((idx: number) => {
    setDirection(-1);
    setHistory(prev => prev.slice(0, idx + 1));
  }, []);

  const slideVariants = {
    enter:  (d: number) => ({ opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit:   (d: number) => ({ opacity: 0, x: d * -30 }),
  };

  return (
    <div>
      {/* Breadcrumb */}
      {history.length > 0 && (
        <Breadcrumb history={history} onHome={goHome} onJump={jumpTo} />
      )}

      {/* Parent context card */}
      <AnimatePresence mode="wait">
        {currentParent ? (
          <FocusParentCard
            key={`parent-${currentParent.id}`}
            node={currentParent}
            onBack={goBack}
            onInfo={onOpenPopup}
          />
        ) : (
          <FocusRootHeader
            key="root-header"
            nodes={rootNodes}
            cycleName={cycleName}
            totalBudget={totalBudget}
          />
        )}
      </AnimatePresence>

      {/* Section label */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-white/8" />
        <span className="text-[9px] uppercase tracking-widest text-white/25 font-bold px-2">
          {currentParent
            ? `${children.length} immediate sub-sector${children.length !== 1 ? 's' : ''}`
            : `${children.length} top-level sector${children.length !== 1 ? 's' : ''}`}
        </span>
        <div className="h-px flex-1 bg-white/8" />
      </div>

      {/* Children grid — animated slide on navigate */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentParent?.id ?? 'root'}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
        >
          {children.length === 0 ? (
            <div className="col-span-full py-16 text-center text-white/20 text-sm">
              No sub-sectors to display
            </div>
          ) : (
            children.map((child, i) => (
              <ChildCard
                key={child.id}
                node={child}
                onDrillIn={drillIn}
                onInfo={onOpenPopup}
                animDelay={i * 0.03}
              />
            ))
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  FULL CANVAS MODE (existing layout engine, unchanged)                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
const NODE_W = 200;
const NODE_H = 148;
const GAP_H  = 20;
const GAP_V  = 72;
const RING_SIZE = 48;

interface LayoutNode {
  node: SectorTreeNode;
  x: number; y: number; cx: number; cy: number;
  children: LayoutNode[];
  depth: number;
}
type Positions = Record<number, { x: number; y: number }>;

function countLeaves(n: SectorTreeNode): number {
  if (!n.children || n.children.length === 0) return 1;
  return n.children.reduce((s: number, c: SectorTreeNode) => s + countLeaves(c), 0);
}
function layoutTree(n: SectorTreeNode, xStart: number, depth: number): LayoutNode {
  const leaves = countLeaves(n);
  const slotW  = leaves * (NODE_W + GAP_H);
  const x      = xStart + slotW / 2 - NODE_W / 2;
  const y      = depth * (NODE_H + GAP_V);
  let childX   = xStart;
  const children: LayoutNode[] = (n.children ?? []).map((c: SectorTreeNode) => {
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
    return Math.max(...n.children.map((c: SectorTreeNode) => maxDepth(c, d + 1)));
  }
  const maxD = roots.length > 0 ? Math.max(...roots.map((r) => maxDepth(r, 0))) : 0;
  const h = (maxD + 1) * (NODE_H + GAP_V) + 20;
  return { nodes, w, h };
}
function flattenLayout(nodes: LayoutNode[]): LayoutNode[] {
  const result: LayoutNode[] = [];
  function traverse(n: LayoutNode) { result.push(n); n.children.forEach(traverse); }
  nodes.forEach(traverse);
  return result;
}

function Connectors({ nodes, getPos }: {
  nodes:  LayoutNode[];
  getPos: (ln: LayoutNode) => { x: number; y: number; cx: number; cy: number };
}) {
  const paths: React.ReactNode[] = [];
  function draw(n: LayoutNode) {
    const np = getPos(n);
    const parentBottom = np.y + NODE_H;
    n.children.forEach((child) => {
      const cp  = getPos(child);
      const midY = (parentBottom + cp.y) / 2;
      const d   = `M ${np.cx} ${parentBottom} C ${np.cx} ${midY}, ${cp.cx} ${midY}, ${cp.cx} ${cp.y}`;
      paths.push(
        <path key={`${n.node.id}-${child.node.id}`} d={d} fill="none"
          stroke="rgba(255,255,255,0.12)" strokeWidth={1.5} strokeDasharray="4 4" />,
      );
      draw(child);
    });
  }
  nodes.forEach(draw);
  return <>{paths}</>;
}

function FullOrgNode({
  ln, effectiveX, effectiveY, selected, onClick, onDragEnd, animDelay,
}: {
  ln: LayoutNode; effectiveX: number; effectiveY: number;
  selected: boolean; onClick: (n: SectorTreeNode) => void;
  onDragEnd: (id: number, newX: number, newY: number) => void;
  animDelay: number;
}) {
  const { node } = ln;
  const pct = node.utilizationPct;
  const didDragRef = useRef(false);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <motion.div
      drag dragMomentum={false} dragElastic={0}
      animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.75, y: -20 }}
      style={{
        position: 'absolute', left: effectiveX, top: effectiveY,
        width: NODE_W, height: NODE_H, borderRadius: 16,
        border: `1.5px solid ${selected ? 'rgba(96,165,250,0.9)' : nodeBorderColor(pct)}`,
        background: 'linear-gradient(135deg, rgba(15,24,50,0.95) 0%, rgba(20,32,65,0.95) 100%)',
        boxShadow: selected
          ? '0 0 0 3px rgba(59,130,246,0.35), 0 12px 40px rgba(59,130,246,0.3)'
          : `0 8px 32px ${nodeGlow(pct)}, 0 0 0 0.5px rgba(255,255,255,0.04) inset`,
        cursor: 'grab', userSelect: 'none', overflow: 'hidden',
        display: 'flex', flexDirection: 'column', padding: '12px', gap: '6px',
      }}
      transition={{ opacity: { duration: 0.4, delay: animDelay }, scale: { duration: 0.4, delay: animDelay, type: 'spring', stiffness: 260, damping: 22 } }}
      whileHover={{ scale: 1.03 }}
      onDragStart={() => { didDragRef.current = false; }}
      onDrag={() => { didDragRef.current = true; }}
      onDragEnd={(_, info) => { onDragEnd(node.id, effectiveX + info.offset.x, effectiveY + info.offset.y); }}
      onClick={() => { if (!didDragRef.current) onClick(node); }}
    >
      <div className="absolute top-2 left-2 text-white/15"><GripVertical size={10} /></div>
      {ln.depth === 0 && (
        <div className="absolute top-2 right-2">
          <span className="text-[7px] uppercase tracking-widest font-bold text-blue-400/70 bg-blue-500/10 px-1.5 py-0.5 rounded-md">L1</span>
        </div>
      )}
      <div className="flex items-start gap-2.5">
        <UtilizationRing value={pct} size={RING_SIZE} strokeWidth={3.5} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-white leading-tight line-clamp-2 mb-0.5">{node.name}</p>
          <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-widest px-1 py-0">{node.code}</Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="bg-white/5 rounded-lg p-1.5">
          <p className="text-[7px] uppercase tracking-wider text-white/30 font-bold">Received</p>
          <p className="text-[9px] font-bold text-blue-400 mt-0.5 truncate" title={formatCurrency(node.netAllocated)}>{formatCompact(node.netAllocated)}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-1.5">
          <p className="text-[7px] uppercase tracking-wider text-white/30 font-bold">Available</p>
          <p className={`text-[9px] font-bold mt-0.5 truncate ${node.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`} title={formatCurrency(node.availableBalance)}>
            {formatCompact(node.availableBalance)}
          </p>
        </div>
      </div>
      <div className="space-y-0.5">
        <div className="flex justify-between items-center">
          <span className="text-[7px] text-white/30">Utilization</span>
          <span className={cn('text-[8px] font-bold', pctTextColor(pct))}>{Math.round(pct)}%</span>
        </div>
        <div className="h-1 w-full bg-white/8 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 1.2, delay: animDelay + 0.2 }}
            style={{ background: nodeBarColor(pct) }} />
        </div>
      </div>
      {hasChildren && (
        <div className="absolute bottom-1.5 right-2 text-[8px] text-white/25">
          {node.children?.length ?? 0} sub
        </div>
      )}
      {selected && (
        <motion.div className="absolute inset-0 rounded-[15px] pointer-events-none"
          animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}
          style={{ boxShadow: '0 0 20px rgba(59,130,246,0.5)' }} />
      )}
    </motion.div>
  );
}

function FullCanvasMode({
  nodes, totalBudget, cycleName, onOpenPopup,
}: {
  nodes: SectorTreeNode[]; totalBudget: number; cycleName?: string;
  onOpenPopup: (n: SectorTreeNode) => void;
}) {
  const [positions, setPositions] = useState<Positions>({});
  const [selectedNode, setSelectedNode] = useState<SectorTreeNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { nodes: layoutNodes, w, h } = computeAll(nodes);
  const flat = flattenLayout(layoutNodes);
  const totalAllocated = nodes.reduce((s, n) => s + n.netAllocated, 0);
  const canvasW = Math.max(w, 800);
  const BANNER_EXTRA = 100;

  const getEffPos = useCallback((ln: LayoutNode) => {
    const p = positions[ln.node.id];
    return p ? { x: p.x, y: p.y, cx: p.x + NODE_W / 2, cy: p.y + NODE_H / 2 } : { x: ln.x, y: ln.y, cx: ln.cx, cy: ln.cy };
  }, [positions]);

  const handleDragEnd = useCallback((id: number, newX: number, newY: number) => {
    setPositions((prev) => ({ ...prev, [id]: { x: newX, y: newY } }));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) containerRef.current?.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, [isFullscreen]);

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el || (e.target as HTMLElement).closest('[data-orgnode]')) return;
    isDraggingCanvas.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, scrollLeft: el.scrollLeft, scrollTop: el.scrollTop };
    el.style.cursor = 'grabbing';
  }, []);
  const onCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingCanvas.current) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x);
    el.scrollTop  = dragStart.current.scrollTop  - (e.clientY - dragStart.current.y);
  }, []);
  const onCanvasMouseUp = useCallback(() => {
    isDraggingCanvas.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'default';
  }, []);

  const hasMoved = Object.keys(positions).length > 0;

  const pct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
  const bannerW = Math.min(320, canvasW);

  return (
    <div ref={containerRef} className={cn('relative', isFullscreen && 'bg-[#060b18] p-6 overflow-hidden')}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-white/30">
            {[
              { color: 'bg-rose-500', label: '≥90% critical' },
              { color: 'bg-amber-500', label: '70-89%' },
              { color: 'bg-blue-500', label: '40-69%' },
              { color: 'bg-emerald-500', label: '<40%' },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1">
                <span className={cn('w-2 h-2 rounded-full', color)} />{label}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {hasMoved && (
            <button onClick={() => setPositions({})} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 text-xs transition-all">
              <RotateCcw size={11} /> Reset layout
            </button>
          )}
          <button onClick={toggleFullscreen} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/40 hover:text-white transition-all">
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={scrollRef}
        className="overflow-auto rounded-2xl"
        style={{ maxHeight: isFullscreen ? 'calc(100vh - 120px)' : 600, background: 'rgba(5,10,25,0.6)' }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
      >
        <div style={{ width: canvasW, height: h + BANNER_EXTRA + 20, position: 'relative', paddingTop: BANNER_EXTRA }}>
          {/* Budget banner */}
          <div style={{ position: 'absolute', left: canvasW / 2 - bannerW / 2, top: 10, width: bannerW, borderRadius: 16, background: 'linear-gradient(135deg, rgba(30,60,120,0.9) 0%, rgba(20,40,90,0.95) 100%)', border: '1.5px solid rgba(96,165,250,0.5)', boxShadow: '0 0 40px rgba(59,130,246,0.25)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="text-2xl">🏛️</div>
            <div className="flex-1 min-w-0">
              <p className="text-[8px] uppercase tracking-widest text-blue-400/60 font-bold">Active Cycle</p>
              <p className="text-sm font-bold text-white mt-0.5 truncate">{cycleName || 'Government Budget'}</p>
              <p className="text-[9px] text-blue-300/70 mt-0.5">Total: {formatCompact(totalBudget)}</p>
            </div>
            <UtilizationRing value={pct} size={52} strokeWidth={4} />
          </div>

          {/* SVG connectors */}
          <svg style={{ position: 'absolute', left: 0, top: BANNER_EXTRA, width: canvasW, height: h, pointerEvents: 'none' }}>
            <Connectors nodes={layoutNodes} getPos={(ln) => { const ep = getEffPos(ln); return { x: ep.x, y: ep.y, cx: ep.cx, cy: ep.cy }; }} />
          </svg>

          {/* Nodes */}
          {flat.map((ln, i) => {
            const { x, y } = getEffPos(ln);
            return (
              <FullOrgNode
                key={ln.node.id}
                ln={ln}
                effectiveX={x}
                effectiveY={y + BANNER_EXTRA}
                selected={selectedNode?.id === ln.node.id}
                onClick={(n) => {
                  setSelectedNode(prev => prev?.id === n.id ? null : n);
                  onOpenPopup(n);
                }}
                onDragEnd={handleDragEnd}
                animDelay={i * 0.02}
              />
            );
          })}
        </div>
      </div>

      {/* Popup */}
      <OrgChartPopup node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Root OrgChart — mode toggle + both modes                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
export interface OrgChartProps {
  nodes:        SectorTreeNode[];
  totalBudget?: number;
  cycleName?:   string;
}

export function OrgChart({ nodes, totalBudget = 0, cycleName }: OrgChartProps) {
  const [mode, setMode] = useState<'focus' | 'full'>('focus');
  const [popupNode, setPopupNode] = useState<SectorTreeNode | null>(null);

  return (
    <div className={cn('space-y-4', mode === 'full' && 'overflow-x-hidden')}>
      {/* Mode toggle header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-white/30">
            {mode === 'focus'
              ? 'Click a sector to explore its sub-sectors — use the breadcrumb to navigate back'
              : 'Full hierarchy canvas — drag nodes or pan the canvas'}
          </p>
        </div>

        {/* Pill toggle */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          <button
            onClick={() => setMode('focus')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              mode === 'focus'
                ? 'bg-blue-500/25 text-blue-300 border border-blue-500/30'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            <Layers size={12} />
            Focus
          </button>
          <button
            onClick={() => setMode('full')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
              mode === 'full'
                ? 'bg-blue-500/25 text-blue-300 border border-blue-500/30'
                : 'text-white/40 hover:text-white/70',
            )}
          >
            <Network size={12} />
            Full Chart
          </button>
        </div>
      </div>

      {/* Mode content */}
      <AnimatePresence mode="wait">
        {mode === 'focus' ? (
          <motion.div key="focus" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <FocusMode
              rootNodes={nodes}
              cycleName={cycleName}
              totalBudget={totalBudget}
              onOpenPopup={setPopupNode}
            />
          </motion.div>
        ) : (
          <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            <FullCanvasMode
              nodes={nodes}
              totalBudget={totalBudget}
              cycleName={cycleName}
              onOpenPopup={setPopupNode}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared popup (focus mode details) */}
      {mode === 'focus' && (
        <OrgChartPopup node={popupNode} onClose={() => setPopupNode(null)} />
      )}
    </div>
  );
}
