import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronDown, faProjectDiagram, faUndo, faGripVertical, faExpand, faCompress, faTimes, faExternalLinkAlt, faChartLine, faWallet, faSearchPlus, faChevronUp, faChevronLeft, faLayerGroup, faList, faCog, faPercentage, faHome, faDownload, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
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
    <div className={cn("space-y-2", depth > 0 && "ml-6 border-l border-gray-100 pl-4")}>
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
      <div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all duration-200">
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            "p-1 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors",
            !hasChildren && "invisible"
          )}
        >
          {isExpanded ? <FontAwesomeIcon icon={faChevronDown} className={`text-[${16}px] `} /> : <FontAwesomeIcon icon={faChevronRight} className={`text-[${16}px] `} />}
        </button>

        <div className="flex-1 flex items-center justify-between gap-4">
          <Link href={`/sectors/${node.id}`}>
            <a className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faProjectDiagram} className={`text-[${16}px] text-blue-400`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 truncate">{node.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-500">
                    {node.code}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-xs text-gray-500">
                    Allocated: <span className="text-gray-600" title={formatCurrency(node.netAllocated)}>{formatCompact(node.netAllocated)}</span>
                  </span>
                  <span className="text-xs text-gray-500">
                    Available: <span className={node.availableBalance < 0 ? 'text-rose-400' : 'text-gray-600'} title={formatCurrency(node.availableBalance)}>{formatCompact(node.availableBalance)}</span>
                  </span>
                </div>
              </div>
            </a>
          </Link>

          <div className="w-32 hidden sm:block">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Utilization</span>
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
