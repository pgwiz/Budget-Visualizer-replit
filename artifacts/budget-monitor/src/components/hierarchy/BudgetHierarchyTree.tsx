import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, ZoomIn, ChevronUp } from 'lucide-react';
import { SectorTreeNode } from '@workspace/api-client-react';
import { UtilizationRing } from './UtilizationRing';
import { NodeDetailPanel } from './NodeDetailPanel';
import { formatCurrency } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
          'relative flex items-center gap-5 px-7 py-5 rounded-2xl border-2 cursor-default',
          'border-blue-500/50 bg-blue-500/10',
        )}
        style={{ boxShadow: '0 0 40px rgba(59,130,246,0.2), inset 0 0 0 1px rgba(59,130,246,0.1)' }}
      >
        {/* Government icon */}
        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-2xl shrink-0">
          🏛️
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-blue-400/60 font-bold">Active Cycle</div>
          <div className="text-base font-bold text-white mt-0.5">{cycleName || 'Government Budget'}</div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="text-xs text-white/50">
              Budget: <span className="text-blue-300 font-semibold">{formatCurrency(totalBudget)}</span>
            </span>
            <span className="text-xs text-white/50">
              Sectors: <span className="text-blue-300 font-semibold">{nodeCount}</span>
            </span>
          </div>
        </div>
        <div className="ml-4 shrink-0">
          <UtilizationRing value={pct} size={64} strokeWidth={5} />
        </div>
      </motion.div>

      {/* Connector down */}
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
  defaultExpanded?: boolean;
}

function HierarchyNodeCard({ node, depth, isSelected, onSelect, defaultExpanded = false }: HNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const hasChildren = (node.children?.length ?? 0) > 0;
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

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, delay: depth * 0.05 }}
        onClick={handleSelect}
        className={cn(
          'relative w-full cursor-pointer rounded-2xl border transition-all duration-300 select-none',
          'hover:translate-y-[-2px] hover:shadow-xl',
          isSelected
            ? 'border-blue-400/70 ring-2 ring-blue-400/30 bg-blue-500/10'
            : utilizationBg(pct),
        )}
        style={{
          boxShadow: isSelected
            ? '0 0 30px rgba(59,130,246,0.3), inset 0 0 0 1px rgba(59,130,246,0.1)'
            : `0 8px 24px ${utilizationGlow(pct)}`,
        }}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Ring */}
          <UtilizationRing
            value={pct}
            size={depth === 0 ? 72 : 56}
            strokeWidth={depth === 0 ? 5 : 4}
            className="shrink-0"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('font-bold text-white truncate', depth === 0 ? 'text-sm' : 'text-xs')}>
                    {node.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[9px] font-bold uppercase tracking-wider shrink-0 px-1.5 py-0"
                  >
                    {node.code}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
                  <span className="text-[10px] text-white/40">
                    Allocated <span className="text-white/70 font-semibold">{formatCurrency(node.netAllocated)}</span>
                  </span>
                  <span className="text-[10px] text-white/40">
                    Available <span className="text-emerald-400/80 font-semibold">{formatCurrency(node.availableBalance)}</span>
                  </span>
                </div>
                {/* Progress bar */}
                <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, pct)}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                    style={{
                      background: pct >= 90
                        ? 'linear-gradient(90deg, #ef4444, #f87171)'
                        : pct >= 70
                        ? 'linear-gradient(90deg, #f59e0b, #fcd34d)'
                        : 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                    }}
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-1.5 shrink-0">
                <button
                  onClick={handleSelect}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors text-xs',
                    isSelected
                      ? 'bg-blue-500/30 text-blue-400'
                      : 'hover:bg-white/10 text-white/30 hover:text-white/70',
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

        {/* Selected glow pulse */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 rounded-2xl pointer-events-none"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ boxShadow: '0 0 20px rgba(59,130,246,0.4)' }}
          />
        )}
      </motion.div>

      {/* Children */}
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
            <ChildrenLevel nodes={node.children!} depth={depth + 1} selectedId={null as any} onSelect={onSelect} parentSelected={isSelected} />
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
  parentSelected,
}: {
  nodes: SectorTreeNode[];
  depth: number;
  selectedId: number | null;
  onSelect: (n: SectorTreeNode) => void;
  parentSelected: boolean;
}) {
  return (
    <div className="flex flex-col items-center w-full">
      {/* Vertical connector from parent */}
      <div
        className="w-px h-5 shrink-0"
        style={{ background: parentSelected ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)' }}
      />

      {/* Children container */}
      {nodes.length === 1 ? (
        <div className="w-full pl-6 border-l-2 border-white/5">
          <HierarchyNodeCard
            node={nodes[0]}
            depth={depth}
            isSelected={selectedId === nodes[0].id}
            onSelect={onSelect}
            defaultExpanded={depth < 2}
          />
        </div>
      ) : (
        <div className="relative w-full">
          {/* Horizontal branch line */}
          <div
            className="absolute top-0 left-6 right-6 h-px"
            style={{ background: parentSelected ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.07)' }}
          />
          <div className="grid gap-4 w-full pt-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(nodes.length, depth === 1 ? 3 : 2)}, minmax(0, 1fr))` }}
          >
            {nodes.map((child) => (
              <HierarchyNodeCard
                key={child.id}
                node={child}
                depth={depth}
                isSelected={selectedId === child.id}
                onSelect={onSelect}
                defaultExpanded={depth < 1}
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

  const handleSelect = useCallback((node: SectorTreeNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const totalAllocated = nodes.reduce((s, n) => s + n.netAllocated, 0);
  const totalNodes = nodes.reduce((s, n) => s + 1 + (n.children?.length ?? 0), 0);

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex items-center gap-6 mb-6 flex-wrap">
        <p className="text-xs text-white/40 italic">Click any node to explore its budget breakdown</p>
        <div className="flex items-center gap-4 ml-auto">
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

      {/* Tree */}
      <div className="space-y-0 w-full">
        <RootNode
          totalBudget={totalBudget}
          cycleName={cycleName}
          nodeCount={totalNodes}
          totalAllocated={totalAllocated}
        />

        {/* Top level sectors */}
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${Math.min(nodes.length, 3)}, minmax(0, 1fr))` }}
        >
          {nodes.map((node) => (
            <div key={node.id} className="flex flex-col items-center">
              <div className="w-px h-5 bg-white/10" />
              <HierarchyNodeCard
                node={node}
                depth={0}
                isSelected={selectedNode?.id === node.id}
                onSelect={handleSelect}
                defaultExpanded={true}
              />
            </div>
          ))}
        </div>

        {nodes.length === 0 && (
          <div className="flex flex-col items-center py-16 text-white/20">
            <ChevronRight size={48} className="mb-3 opacity-30" />
            <p className="text-sm">No sectors to display</p>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
    </div>
  );
}
