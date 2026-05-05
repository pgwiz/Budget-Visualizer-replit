import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { SectorTreeNode } from '@workspace/api-client-react';
import { UtilizationRing } from '@/components/hierarchy/UtilizationRing';
import { OrgChartPopup } from './OrgChartPopup';
import { formatCurrency, formatCompact } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { RotateCcw, GripVertical, Maximize2, Minimize2, ChevronDown, ChevronRight } from 'lucide-react';

/* ─────────────────────────────────────────────────────────── */
/*  Layout constants & types                                   */
/* ─────────────────────────────────────────────────────────── */
const NODE_W = 200;
const NODE_H = 148;
const GAP_H  = 20;
const GAP_V  = 72;
const RING_SIZE = 48;

interface LayoutNode {
  node:     SectorTreeNode;
  x:        number;
  y:        number;
  cx:       number;
  cy:       number;
  children: LayoutNode[];
  depth:    number;
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
  const h    = (maxD + 1) * (NODE_H + GAP_V) + 20;
  return { nodes, w, h };
}

function flattenLayout(nodes: LayoutNode[]): LayoutNode[] {
  const result: LayoutNode[] = [];
  function traverse(n: LayoutNode) { result.push(n); n.children.forEach(traverse); }
  nodes.forEach(traverse);
  return result;
}

/* ─────────────────────────────────────────────────────────── */
/*  Connector SVG                                              */
/* ─────────────────────────────────────────────────────────── */
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
/*  Node colour helpers                                        */
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

/* ─────────────────────────────────────────────────────────── */
/*  Individual draggable node card                             */
/* ─────────────────────────────────────────────────────────── */
interface OrgNodeProps {
  ln:          LayoutNode;
  effectiveX:  number;
  effectiveY:  number;
  selected:    boolean;
  expanded:    boolean;
  onClick:     (n: SectorTreeNode) => void;
  onToggleExpand: (n: SectorTreeNode) => void;
  onDragEnd:   (id: number, newX: number, newY: number) => void;
  animDelay:   number;
}

function OrgNode({ ln, effectiveX, effectiveY, selected, expanded, onClick, onToggleExpand, onDragEnd, animDelay }: OrgNodeProps) {
  const { node } = ln;
  const pct = node.utilizationPct;
  const didDragRef = useRef(false);
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <motion.div
      drag
      dragMomentum={false}
      dragElastic={0}
      animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      initial={{ opacity: 0, scale: 0.75, y: -20 }}
      style={{
        position:   'absolute',
        left:       effectiveX,
        top:        effectiveY,
        width:      NODE_W,
        height:     NODE_H,
        borderRadius:  16,
        border:    `1.5px solid ${selected ? 'rgba(96,165,250,0.9)' : nodeBorderColor(pct)}`,
        background: 'linear-gradient(135deg, rgba(15,24,50,0.95) 0%, rgba(20,32,65,0.95) 100%)',
        boxShadow:  selected
          ? '0 0 0 3px rgba(59,130,246,0.35), 0 12px 40px rgba(59,130,246,0.3)'
          : `0 8px 32px ${nodeGlow(pct)}, 0 0 0 0.5px rgba(255,255,255,0.04) inset`,
        cursor:     'grab',
        userSelect: 'none',
        overflow:   'hidden',
        display:    'flex',
        flexDirection: 'column',
        padding:    '12px',
        gap:        '6px',
      }}
      transition={{ opacity: { duration: 0.4, delay: animDelay }, scale: { duration: 0.4, delay: animDelay, type: 'spring', stiffness: 260, damping: 22 } }}
      whileHover={{ scale: 1.03 }}
      onDragStart={() => { didDragRef.current = false; }}
      onDrag={() => { didDragRef.current = true; }}
      onDragEnd={(_, info) => {
        onDragEnd(node.id, effectiveX + info.offset.x, effectiveY + info.offset.y);
      }}
      onClick={() => {
        if (!didDragRef.current) onClick(node);
      }}
    >
      {/* Drag handle */}
      <div className="absolute top-2 left-2 text-white/15">
        <GripVertical size={10} />
      </div>

      {/* Depth badge */}
      {ln.depth === 0 && (
        <div className="absolute top-2 right-2">
          <span className="text-[7px] uppercase tracking-widest font-bold text-blue-400/70 bg-blue-500/10 px-1.5 py-0.5 rounded-md">L1</span>
        </div>
      )}

      {/* Top row: ring + name */}
      <div className="flex items-start gap-2.5">
        <UtilizationRing value={pct} size={RING_SIZE} strokeWidth={3.5} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-white leading-tight line-clamp-2 mb-0.5">{node.name}</p>
          <Badge variant="outline" className="text-[7px] font-bold uppercase tracking-widest px-1 py-0">
            {node.code}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-1">
        <div className="bg-white/5 rounded-lg p-1.5">
          <p className="text-[7px] uppercase tracking-wider text-white/30 font-bold">Received</p>
          <p className="text-[9px] font-bold text-blue-400 mt-0.5 truncate" title={formatCurrency(node.netAllocated)}>
            {formatCompact(node.netAllocated)}
          </p>
        </div>
        <div className="bg-white/5 rounded-lg p-1.5">
          <p className="text-[7px] uppercase tracking-wider text-white/30 font-bold">Available</p>
          <p className={`text-[9px] font-bold mt-0.5 truncate ${node.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}
             title={formatCurrency(node.availableBalance)}>
            {formatCompact(node.availableBalance)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-0.5">
        <div className="flex justify-between items-center">
          <span className="text-[7px] text-white/30">Utilization</span>
          <span className={cn('text-[8px] font-bold', pct >= 90 ? 'text-rose-400' : pct >= 70 ? 'text-amber-400' : 'text-blue-400')}>
            {Math.round(pct)}%
          </span>
        </div>
        <div className="h-1 w-full bg-white/8 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 1.2, delay: animDelay + 0.2 }}
            style={{ background: nodeBarColor(pct) }}
          />
        </div>
      </div>

      {/* Expand/collapse button for children */}
      {hasChildren && (
        <button
          className="absolute bottom-1.5 right-2 flex items-center gap-1 text-[8px] text-white/30 hover:text-white/60 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(node);
          }}
        >
          {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
          <span>{node.children?.length ?? 0} sub</span>
        </button>
      )}

      {/* Selected pulse */}
      {selected && (
        <motion.div
          className="absolute inset-0 rounded-[15px] pointer-events-none"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ boxShadow: '0 0 20px rgba(59,130,246,0.5)' }}
        />
      )}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Root banner                                                */
/* ─────────────────────────────────────────────────────────── */
function RootBanner({
  cycleName, totalBudget, totalAllocated, canvasW,
}: {
  cycleName: string; totalBudget: number; totalAllocated: number; canvasW: number;
}) {
  const pct     = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;
  const bannerW = Math.min(320, canvasW);
  const left    = canvasW / 2 - bannerW / 2;
  const TOP     = -90;

  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} width={canvasW} height={120} overflow="visible">
        <line x1={canvasW / 2} y1={TOP + 72} x2={canvasW / 2} y2={-10} stroke="rgba(59,130,246,0.3)" strokeWidth={2} strokeDasharray="4 4" />
        <line x1={NODE_W / 2 + GAP_H / 2} y1={-10} x2={canvasW - NODE_W / 2 - GAP_H / 2} y2={-10} stroke="rgba(255,255,255,0.08)" strokeWidth={1.5} strokeDasharray="4 4" />
      </svg>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: 'absolute', left, top: TOP, width: bannerW,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(30,60,120,0.9) 0%, rgba(20,40,90,0.95) 100%)',
          border: '1.5px solid rgba(96,165,250,0.5)',
          boxShadow: '0 0 40px rgba(59,130,246,0.25), 0 8px 32px rgba(0,0,0,0.4)',
          padding: '14px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <div className="text-2xl">🏛️</div>
        <div className="flex-1 min-w-0">
          <p className="text-[8px] uppercase tracking-widest text-blue-400/60 font-bold">Active Cycle</p>
          <p className="text-sm font-bold text-white mt-0.5 truncate">{cycleName || 'Government Budget'}</p>
          <p className="text-[9px] text-blue-300/70 mt-0.5">Total: {formatCompact(totalBudget)}</p>
        </div>
        <UtilizationRing value={pct} size={52} strokeWidth={4} />
      </motion.div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Expanded children overlay                                  */
/* ─────────────────────────────────────────────────────────── */
function ExpandedChildren({
  node,
  onClose,
  onNavigate,
}: {
  node: SectorTreeNode;
  onClose: () => void;
  onNavigate: (id: number) => void;
}) {
  const children = node.children ?? [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl max-h-[85vh] overflow-y-auto rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, rgba(10,18,40,0.99) 0%, rgba(15,25,55,0.99) 100%)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white">{node.name}</h3>
            <p className="text-xs text-white/40 mt-0.5">
              {children.length} sub-sector{children.length !== 1 ? 's' : ''} · Budget: {formatCompact(node.netAllocated)}
            </p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-sm px-3 py-1 rounded-lg border border-white/10 hover:border-white/20">
            Close
          </button>
        </div>

        {children.length === 0 ? (
          <p className="text-white/30 text-sm py-8 text-center">No sub-sectors</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {children.map((child: SectorTreeNode) => {
              const pct = child.utilizationPct;
              return (
                <button
                  key={child.id}
                  onClick={() => onNavigate(child.id)}
                  className="text-left p-4 rounded-xl border border-white/8 hover:border-white/20 bg-white/3 hover:bg-white/6 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <UtilizationRing value={pct} size={40} strokeWidth={3} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-white/80 group-hover:text-white leading-tight line-clamp-2">{child.name}</p>
                      <p className="text-[9px] text-white/30 font-mono mt-0.5">{child.code}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-white/5 rounded-lg px-2 py-1.5">
                      <p className="text-[7px] uppercase text-white/30 font-bold">Allocated</p>
                      <p className="text-[10px] font-bold text-blue-400">{formatCompact(child.netAllocated)}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg px-2 py-1.5">
                      <p className="text-[7px] uppercase text-white/30 font-bold">Available</p>
                      <p className={`text-[10px] font-bold ${child.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {formatCompact(child.availableBalance)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-[7px]">
                      <span className="text-white/30">Utilization</span>
                      <span className={cn('font-bold', pct >= 90 ? 'text-rose-400' : pct >= 70 ? 'text-amber-400' : 'text-blue-400')}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div className="h-1 w-full bg-white/8 rounded-full mt-0.5 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#3b82f6' }} />
                    </div>
                  </div>
                  {(child.children?.length ?? 0) > 0 && (
                    <p className="text-[8px] text-white/20 mt-2">↓ {child.children?.length ?? 0} sub-sectors</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main OrgChart component                                    */
/* ─────────────────────────────────────────────────────────── */
interface OrgChartProps {
  nodes:        SectorTreeNode[];
  totalBudget?: number;
  cycleName?:   string;
}

export function OrgChart({ nodes, totalBudget = 0, cycleName }: OrgChartProps) {
  const [, navigate]       = useLocation();
  const [selectedNode, setSelectedNode] = useState<SectorTreeNode | null>(null);
  const [expandedNode, setExpandedNode] = useState<SectorTreeNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [positions, setPositions] = useState<Positions>({});

  const { nodes: layoutNodes, w, h } = computeAll(nodes);
  const flat           = flattenLayout(layoutNodes);
  const totalAllocated = nodes.reduce((s, n) => s + n.netAllocated, 0);
  const canvasW        = Math.max(w, 800);
  const BANNER_EXTRA   = 100;

  // Track which nodes are "expanded" (just visual indicator)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const getEffPos = useCallback((ln: LayoutNode) => {
    const p = positions[ln.node.id];
    return p
      ? { x: p.x, y: p.y, cx: p.x + NODE_W / 2, cy: p.y + NODE_H / 2 }
      : { x: ln.x, y: ln.y, cx: ln.cx, cy: ln.cy };
  }, [positions]);

  const handleDragEnd = useCallback((id: number, newX: number, newY: number) => {
    setPositions((prev) => ({ ...prev, [id]: { x: newX, y: newY } }));
  }, []);

  const handleSelect = useCallback((n: SectorTreeNode) => {
    setSelectedNode((prev: SectorTreeNode | null) => (prev?.id === n.id ? null : n));
  }, []);

  const handleDesign = useCallback((n: SectorTreeNode) => {
    navigate(`/hierarchy-designer?edit=${n.id}`);
  }, [navigate]);

  const handleToggleExpand = useCallback((n: SectorTreeNode) => {
    if ((n.children?.length ?? 0) > 0) {
      setExpandedNode(n);
      setExpandedIds(prev => {
        const next = new Set(prev);
        if (next.has(n.id)) next.delete(n.id);
        else next.add(n.id);
        return next;
      });
    }
  }, []);

  const handleNavigateToSector = useCallback((id: number) => {
    navigate(`/sectors/${id}`);
  }, [navigate]);

  const resetLayout = useCallback(() => setPositions({}), []);

  const hasMoved = Object.keys(positions).length > 0;

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [isFullscreen]);

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Drag-to-scroll on the container
  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const onCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only drag on empty canvas, not on nodes
    if ((e.target as HTMLElement).closest('[data-orgnode]')) return;
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

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative',
        isFullscreen && 'bg-[#060b18] p-6 overflow-hidden'
      )}
    >
      {/* Legend + controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-xs text-white/30 italic">Drag nodes to rearrange · Click to inspect · Click sub-sectors to expand</p>
          {hasMoved && (
            <button
              onClick={resetLayout}
              className="flex items-center gap-1.5 text-xs text-blue-400/70 hover:text-blue-400 transition-colors px-2.5 py-1 rounded-lg border border-blue-500/20 hover:border-blue-500/40 bg-blue-500/5"
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Legend */}
          {[
            { label: '<40%', color: '#10b981' },
            { label: '40-70%', color: '#3b82f6' },
            { label: '70-90%', color: '#f59e0b' },
            { label: '>90%', color: '#ef4444' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] text-white/35">{label}</span>
            </div>
          ))}
          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors px-2 py-1 rounded-lg border border-white/10 hover:border-white/20"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Fixed-width scrollable canvas */}
      <div
        ref={scrollRef}
        className="overflow-auto pb-4"
        style={{
          maxWidth: '100%',
          maxHeight: isFullscreen ? 'calc(100vh - 100px)' : '70vh',
          cursor: 'default',
        }}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onMouseLeave={onCanvasMouseUp}
      >
        <div style={{ position: 'relative', width: canvasW, height: h + BANNER_EXTRA, marginTop: BANNER_EXTRA }}>

          {/* Root banner */}
          <RootBanner
            cycleName={cycleName ?? 'Government Budget'}
            totalBudget={totalBudget}
            totalAllocated={totalAllocated}
            canvasW={canvasW}
          />

          {/* SVG connector lines */}
          <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }} width={canvasW} height={h}>
            <Connectors nodes={layoutNodes} getPos={getEffPos} />
          </svg>

          {/* Draggable node cards */}
          {flat.map((ln, i) => {
            const { x, y } = getEffPos(ln);
            return (
              <div key={ln.node.id} data-orgnode>
                <OrgNode
                  ln={ln}
                  effectiveX={x}
                  effectiveY={y}
                  selected={selectedNode?.id === ln.node.id}
                  expanded={expandedIds.has(ln.node.id)}
                  onClick={handleSelect}
                  onToggleExpand={handleToggleExpand}
                  onDragEnd={handleDragEnd}
                  animDelay={i * 0.03}
                />
              </div>
            );
          })}

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

      {/* Expanded children overlay */}
      <AnimatePresence>
        {expandedNode && (
          <ExpandedChildren
            key={expandedNode.id}
            node={expandedNode}
            onClose={() => setExpandedNode(null)}
            onNavigate={handleNavigateToSector}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
