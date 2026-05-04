import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ZoomIn, ChevronUp, ChevronLeft, Maximize2, Minimize2, Layers, List } from 'lucide-react';
import { SectorTreeNode } from '@workspace/api-client-react';
import { UtilizationRing } from './UtilizationRing';
import { NodeDetailPanel } from './NodeDetailPanel';
import { formatCurrency, formatCompact } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type ViewMode = 'full' | 'minimalist';

interface BudgetHierarchyTreeProps {
  nodes: SectorTreeNode[];
  totalBudget?: number;
  cycleName?: string;
}

function utilizationBg(pct: number) {
  if (pct >= 90) return 'border-rose-500/40 bg-rose-500/5';
  if (pct >= 70) return 'border-amber-500/40 bg-amber-500/5';
  if (pct >= 40) return 'border-blue-500/30 bg-blue-500/5';
  return 'border-emerald-500/30 bg-emerald-500/5';
}

function utilizationGlow(pct: number) {
  if (pct >= 90) return 'rgba(239,68,68,0.15)';
  if (pct >= 70) return 'rgba(245,158,11,0.12)';
  if (pct >= 40) return 'rgba(59,130,246,0.12)';
  return 'rgba(16,185,129,0.1)';
}

function flattenNodes(nodes: SectorTreeNode[]): SectorTreeNode[] {
  const result: SectorTreeNode[] = [];
  function walk(list: SectorTreeNode[]) {
    for (const n of list) {
      result.push(n);
      if (n.children?.length) walk(n.children);
    }
  }
  walk(nodes);
  return result;
}

function findNodeById(nodes: SectorTreeNode[], id: number): SectorTreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children?.length) {
      const found = findNodeById(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function findParentNode(nodes: SectorTreeNode[], childId: number): SectorTreeNode | null {
  for (const n of nodes) {
    if (n.children?.some((c: SectorTreeNode) => c.id === childId)) return n;
    if (n.children?.length) {
      const found = findParentNode(n.children, childId);
      if (found) return found;
    }
  }
  return null;
}

/* ─────────────────────────────────────────────────────────── */
/*  Root / Summary node (Government Budget)                   */
/* ─────────────────────────────────────────────────────────── */
function RootNode({
  totalBudget,
  cycleName,
  nodeCount,
  totalAllocated,
}: {
  totalBudget: number;
  cycleName: string;
  nodeCount: number;
  totalAllocated: number;
}) {
  const pct = totalBudget > 0 ? Math.min(100, (totalAllocated / totalBudget) * 100) : 0;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'relative flex items-center gap-3 sm:gap-5 px-4 sm:px-7 py-4 sm:py-5 rounded-2xl border-2 cursor-default w-full max-w-xl',
          'border-blue-500/50 bg-blue-500/10',
        )}
        style={{ boxShadow: '0 0 40px rgba(59,130,246,0.2), inset 0 0 0 1px rgba(59,130,246,0.1)' }}
      >
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl sm:text-2xl shrink-0">
          🏛️
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[9px] sm:text-[10px] uppercase tracking-widest text-blue-400/60 font-bold">Active Cycle</div>
          <div className="text-sm sm:text-base font-bold text-white mt-0.5 truncate">{cycleName || 'Government Budget'}</div>
          <div className="flex items-center gap-3 sm:gap-4 mt-1.5">
            <span className="text-[10px] sm:text-xs text-white/50">
              Budget: <span className="text-blue-300 font-semibold" title={formatCurrency(totalBudget)}>{formatCompact(totalBudget)}</span>
            </span>
            <span className="text-[10px] sm:text-xs text-white/50">
              Sectors: <span className="text-blue-300 font-semibold">{nodeCount}</span>
            </span>
          </div>
        </div>
        <div className="shrink-0">
          <UtilizationRing value={pct} size={56} strokeWidth={5} />
        </div>
      </motion.div>
      <div className="w-px h-6 bg-gradient-to-b from-blue-500/50 to-transparent" />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Single hierarchy node card                                 */
/* ─────────────────────────────────────────────────────────── */
interface HNodeProps {
  node: SectorTreeNode;
  depth: number;
  isSelected: boolean;
  onSelect: (n: SectorTreeNode) => void;
  onFocus?: (n: SectorTreeNode) => void;
  defaultExpanded?: boolean;
  viewMode: ViewMode;
}

function HierarchyNodeCard({ node, depth, isSelected, onSelect, onFocus, defaultExpanded = false, viewMode }: HNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const hasMoreChildren = (node.childCount ?? 0) > (node.children?.length ?? 0);
  const pct = node.utilizationPct;

  const handleSelect = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(node);
    },
    [node, onSelect],
  );

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setExpanded((p) => !p);
    },
    [],
  );

  const handleFocus = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onFocus?.(node);
    },
    [node, onFocus],
  );

  const cardInner =
    depth === 0 ? (
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
        <UtilizationRing value={pct} size={60} strokeWidth={5} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-xs sm:text-sm truncate">{node.name}</span>
                <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0">
                  {node.code}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                <span className="text-[10px] text-white/40">
                  Received{' '}
                  <span className="text-white/70 font-semibold" title={formatCurrency(node.netAllocated)}>
                    {formatCompact(node.netAllocated)}
                  </span>
                </span>
                <span className="text-[10px] text-white/40">
                  Free{' '}
                  <span
                    className={`font-semibold ${node.availableBalance < 0 ? 'text-rose-400/80' : 'text-emerald-400/80'}`}
                    title={formatCurrency(node.availableBalance)}
                  >
                    {formatCompact(node.availableBalance)}
                  </span>
                </span>
              </div>
              <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, pct)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                  style={{
                    background:
                      pct >= 90
                        ? 'linear-gradient(90deg,#ef4444,#f87171)'
                        : pct >= 70
                          ? 'linear-gradient(90deg,#f59e0b,#fcd34d)'
                          : 'linear-gradient(90deg,#3b82f6,#60a5fa)',
                  }}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                onClick={handleSelect}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  isSelected ? 'bg-blue-500/30 text-blue-400' : 'hover:bg-white/10 text-white/30 hover:text-white/70',
                )}
                title="View details"
              >
                <ZoomIn size={13} />
              </button>
              {hasChildren && (
                <button
                  onClick={handleToggle}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/70 transition-colors"
                  title={expanded ? 'Collapse' : 'Expand'}
                >
                  {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="p-2.5 sm:p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          <Badge variant="outline" className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 shrink-0">
            {node.code}
          </Badge>
          <div className="flex items-center gap-1">
            <button
              onClick={handleSelect}
              className={cn(
                'p-1 rounded-md transition-colors',
                isSelected ? 'bg-blue-500/30 text-blue-400' : 'hover:bg-white/10 text-white/20 hover:text-white/60',
              )}
              title="View details"
            >
              <ZoomIn size={11} />
            </button>
            {hasChildren && (
              <button
                onClick={handleToggle}
                className="p-1 rounded-md hover:bg-white/10 text-white/20 hover:text-white/60 transition-colors"
                title={expanded ? 'Collapse' : 'Expand'}
              >
                {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <UtilizationRing value={pct} size={40} strokeWidth={3.5} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-bold text-white truncate leading-tight">{node.name}</p>
            <p className="text-[8px] sm:text-[9px] text-white/40 mt-0.5 leading-tight">
              Rcvd{' '}
              <span className="text-white/65 font-semibold" title={formatCurrency(node.netAllocated)}>
                {formatCompact(node.netAllocated)}
              </span>
            </p>
            <p className="text-[8px] sm:text-[9px] text-white/40 leading-tight">
              Free{' '}
              <span
                className={`font-semibold ${node.availableBalance < 0 ? 'text-rose-400' : 'text-emerald-400/80'}`}
                title={formatCurrency(node.availableBalance)}
              >
                {formatCompact(node.availableBalance)}
              </span>
            </p>
          </div>
        </div>

        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, pct)}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
            style={{
              background:
                pct >= 90
                  ? 'linear-gradient(90deg,#ef4444,#f87171)'
                  : pct >= 70
                    ? 'linear-gradient(90deg,#f59e0b,#fcd34d)'
                    : 'linear-gradient(90deg,#3b82f6,#60a5fa)',
            }}
          />
        </div>

        {hasMoreChildren && !expanded && (
          <p className="text-[8px] text-white/25 italic text-center">
            +{(node.childCount ?? 0) - (node.children?.length ?? 0)} more below
          </p>
        )}
      </div>
    );

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: depth * 0.05 }}
        onClick={handleSelect}
        className={cn(
          'relative w-full cursor-pointer rounded-2xl border transition-all duration-300 select-none overflow-hidden',
          'hover:translate-y-[-2px] hover:shadow-xl',
          isSelected ? 'border-blue-400/70 ring-2 ring-blue-400/30 bg-blue-500/10' : utilizationBg(pct),
        )}
        style={{
          boxShadow: isSelected
            ? '0 0 30px rgba(59,130,246,0.3), inset 0 0 0 1px rgba(59,130,246,0.1)'
            : `0 8px 24px ${utilizationGlow(pct)}`,
        }}
      >
        {cardInner}

        {isSelected && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            key="children"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden w-full"
          >
            <ChildrenLevel
              nodes={node.children!}
              depth={depth + 1}
              selectedId={null as any}
              onSelect={onSelect}
              onFocus={onFocus}
              parentSelected={isSelected}
              viewMode={viewMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Children row (with connector lines)                        */
/* ─────────────────────────────────────────────────────────── */
function ChildrenLevel({
  nodes,
  depth,
  selectedId,
  onSelect,
  onFocus,
  parentSelected,
  viewMode,
}: {
  nodes: SectorTreeNode[];
  depth: number;
  selectedId: number | null;
  onSelect: (n: SectorTreeNode) => void;
  onFocus?: (n: SectorTreeNode) => void;
  parentSelected: boolean;
  viewMode: ViewMode;
}) {
  return (
    <div className="flex flex-col items-center w-full">
      <div
        className="w-px h-5 shrink-0"
        style={{ background: parentSelected ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)' }}
      />

      {nodes.length === 1 ? (
        <div className="w-full pl-4 sm:pl-6 border-l-2 border-white/5">
          <HierarchyNodeCard
            node={nodes[0]}
            depth={depth}
            isSelected={selectedId === nodes[0].id}
            onSelect={onSelect}
            onFocus={onFocus}
            defaultExpanded={depth < 2}
            viewMode={viewMode}
          />
        </div>
      ) : (
        <div className="relative w-full">
          <div
            className="absolute top-0 left-4 right-4 sm:left-6 sm:right-6 h-px"
            style={{ background: parentSelected ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)' }}
          />
          <div className="grid gap-3 sm:gap-4 w-full pt-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(nodes.length, depth === 1 ? 3 : 2)}, minmax(0, 1fr))` }}
          >
            {nodes.map((child) => (
              <HierarchyNodeCard
                key={child.id}
                node={child}
                depth={depth}
                isSelected={selectedId === child.id}
                onSelect={onSelect}
                onFocus={onFocus}
                defaultExpanded={depth < 1}
                viewMode={viewMode}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  Main component                                             */
/* ─────────────────────────────────────────────────────────── */
export function BudgetHierarchyTree({
  nodes,
  totalBudget = 0,
  cycleName = 'Government Budget',
}: BudgetHierarchyTreeProps) {
  const [selectedNode, setSelectedNode] = useState<SectorTreeNode | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [focusedNodeId, setFocusedNodeId] = useState<number | null>(null);
  const [focusHistory, setFocusHistory] = useState<number[]>([]);
  const [startFromId, setStartFromId] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag scroll state
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; scrollX: number; scrollY: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (containerRef.current && e.button === 0) {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="dialog"]')) return;
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        scrollX: containerRef.current.scrollLeft,
        scrollY: containerRef.current.scrollTop,
      };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && dragStart.current && containerRef.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      containerRef.current.scrollLeft = dragStart.current.scrollX - dx;
      containerRef.current.scrollTop = dragStart.current.scrollY - dy;
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
  }, []);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsDragging(false);
      dragStart.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const handleSelect = useCallback((node: SectorTreeNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const handleFocus = useCallback((node: SectorTreeNode) => {
    if (focusedNodeId !== null) {
      setFocusHistory((prev: number[]) => [...prev, focusedNodeId]);
    } else {
      setFocusHistory([]);
    }
    setFocusedNodeId(node.id);
  }, [focusedNodeId]);

  const handleBack = useCallback(() => {
    if (focusHistory.length > 0) {
      const prev = focusHistory[focusHistory.length - 1];
      setFocusHistory(h => h.slice(0, -1));
      setFocusedNodeId(prev);
    } else {
      setFocusedNodeId(null);
    }
  }, [focusHistory]);

  const handleStartFromChange = useCallback((value: string) => {
    setStartFromId(value);
    if (value && value !== 'root') {
      setFocusedNodeId(parseInt(value));
      setFocusHistory([]);
    } else {
      setFocusedNodeId(null);
      setFocusHistory([]);
    }
  }, []);

  const allFlat = flattenNodes(nodes);
  const totalAllocated = nodes.reduce((s, n) => s + n.netAllocated, 0);
  const totalNodes = allFlat.length;

  // Determine displayed nodes
  let displayNodes = nodes;
  if (focusedNodeId !== null) {
    const focusNode = findNodeById(nodes, focusedNodeId);
    if (focusNode) {
      if (viewMode === 'minimalist') {
        displayNodes = [{ ...focusNode }];
      } else {
        displayNodes = [focusNode];
      }
    }
  }

  const canGoBack = focusedNodeId !== null;

  return (
    <div className="relative">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 glass px-2 py-1 rounded-xl border border-white/10">
          <button
            onClick={() => setViewMode('full')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all',
              viewMode === 'full' ? 'bg-blue-500/20 text-blue-400 font-semibold' : 'text-white/40 hover:text-white/60'
            )}
          >
            <Maximize2 size={12} /> Full
          </button>
          <button
            onClick={() => setViewMode('minimalist')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all',
              viewMode === 'minimalist' ? 'bg-blue-500/20 text-blue-400 font-semibold' : 'text-white/40 hover:text-white/60'
            )}
          >
            <Minimize2 size={12} /> Minimalist
          </button>
        </div>

        {/* Start From dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40">Focus:</span>
          <Select value={startFromId || 'root'} onValueChange={handleStartFromChange}>
            <SelectTrigger className="glass border-white/10 h-8 text-xs w-[180px] sm:w-[220px]">
              <SelectValue placeholder="Select starting node" />
            </SelectTrigger>
            <SelectContent className="glass border-white/10 text-white max-h-60">
              <SelectItem value="root">All (Root)</SelectItem>
              {allFlat.map(n => (
                <SelectItem key={n.id} value={n.id.toString()}>
                  {'  '.repeat(n.depth)}{n.code} - {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Previous Button */}
        {canGoBack && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="glass border-white/10 text-white/60 hover:text-white gap-1.5 h-8 text-xs"
          >
            <ChevronLeft size={14} /> Previous
          </Button>
        )}

        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto flex-wrap">
          {[
            { label: '<40%', color: '#10b981' },
            { label: '40-70%', color: '#3b82f6' },
            { label: '70-90%', color: '#f59e0b' },
            { label: '>90%', color: '#ef4444' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[9px] sm:text-[10px] text-white/40">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Draggable Tree Container */}
      <div
        ref={containerRef}
        className={cn(
          'overflow-auto max-h-[70vh] pb-4 scroll-smooth',
          isDragging && 'cursor-grabbing select-none',
          !isDragging && 'cursor-grab',
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="space-y-0 w-full min-w-0">
          {focusedNodeId === null && (
            <RootNode
              totalBudget={totalBudget}
              cycleName={cycleName}
              nodeCount={totalNodes}
              totalAllocated={totalAllocated}
            />
          )}

          {focusedNodeId !== null && (
            <div className="flex items-center gap-2 mb-4">
              <Layers size={14} className="text-blue-400" />
              <span className="text-xs text-white/50">
                Focused on: <span className="text-white font-semibold">{displayNodes[0]?.name}</span>
                {displayNodes[0]?.code && <span className="text-white/30 ml-1">({displayNodes[0].code})</span>}
              </span>
            </div>
          )}

          <div
            className="grid gap-3 sm:gap-4"
            style={{
              gridTemplateColumns: focusedNodeId !== null
                ? '1fr'
                : `repeat(${Math.min(displayNodes.length, 3)}, minmax(0, 1fr))`,
            }}
          >
            {displayNodes.map((node) => (
              <div key={node.id} className="flex flex-col items-center">
                {focusedNodeId === null && <div className="w-px h-5 bg-white/10" />}
                <HierarchyNodeCard
                  node={node}
                  depth={0}
                  isSelected={selectedNode?.id === node.id}
                  onSelect={handleSelect}
                  onFocus={handleFocus}
                  defaultExpanded={true}
                  viewMode={viewMode}
                />
              </div>
            ))}
          </div>

          {displayNodes.length === 0 && (
            <div className="flex flex-col items-center py-16 text-white/20">
              <ChevronRight size={48} className="mb-3 opacity-30" />
              <p className="text-sm">No sectors to display</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
