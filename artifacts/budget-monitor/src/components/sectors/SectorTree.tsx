import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Network } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency, formatCompact } from '@/lib/api';
import { SectorTreeNode } from '@workspace/api-client-react';
import { cn } from '@/lib/utils';
import { Link } from 'wouter';

interface SectorTreeProps {
  nodes: SectorTreeNode[];
  depth?: number;
}

export function SectorTree({ nodes, depth = 0 }: SectorTreeProps) {
  return (
    <div className={cn("space-y-2", depth > 0 && "ml-6 border-l border-white/5 pl-4")}>
      {nodes.map((node) => (
        <SectorNode key={node.id} node={node} depth={depth} />
      ))}
    </div>
  );
}

function SectorNode({ node, depth }: { node: SectorTreeNode; depth: number }) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="space-y-2">
      <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-200">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white transition-colors",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="flex-1 flex items-center justify-between gap-4">
          <Link href={`/sectors/${node.id}`}>
            <a className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <Network size={16} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate">{node.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-white/40">
                    {node.code}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-white/40">
                    Allocated: <span className="text-white/60" title={formatCurrency(node.netAllocated)}>{formatCompact(node.netAllocated)}</span>
                  </span>
                  <span className="text-xs text-white/40">
                    Available: <span className={node.availableBalance < 0 ? 'text-rose-400' : 'text-white/60'} title={formatCurrency(node.availableBalance)}>{formatCompact(node.availableBalance)}</span>
                  </span>
                </div>
              </div>
            </a>
          </Link>

          <div className="w-32 hidden sm:block">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Utilization</span>
              <span className="text-[10px] text-blue-400 font-bold">{Math.round(node.utilizationPct)}%</span>
            </div>
            <ProgressBar 
              value={node.utilizationPct} 
              color={node.utilizationPct > 90 ? 'danger' : node.utilizationPct > 70 ? 'warning' : 'primary'} 
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <SectorTree nodes={node.children!} depth={depth + 1} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
