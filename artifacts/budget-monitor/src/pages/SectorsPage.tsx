import { useState } from 'react';
import { useListSectors, useGetSectorTree, useGetActiveCycle, useGetDashboardSummary } from '@workspace/api-client-react';
import { SectorTree } from '@/components/sectors/SectorTree';
import { BudgetHierarchyTree } from '@/components/hierarchy/BudgetHierarchyTree';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { LayoutList, Network, GitBranch } from 'lucide-react';
import { Link } from 'wouter';

export default function SectorsPage() {
  const { data: sectors, isLoading: listLoading } = useListSectors();
  const { data: tree, isLoading: treeLoading } = useGetSectorTree();
  const { data: cycle } = useGetActiveCycle();
  const { data: summary } = useGetDashboardSummary();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Sectors</h2>
          <p className="text-white/40 mt-1">Government structure and budget distribution</p>
        </div>
        {cycle && (
          <div className="glass px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm text-white/70">Active: <span className="text-white font-semibold">{cycle.name}</span></span>
          </div>
        )}
      </div>

      <Tabs defaultValue="hierarchy" className="w-full">
        <TabsList className="glass border-white/10 p-1 mb-6">
          <TabsTrigger value="hierarchy" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2">
            <GitBranch size={15} />
            Hierarchy Map
          </TabsTrigger>
          <TabsTrigger value="tree" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2">
            <Network size={15} />
            Tree View
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2">
            <LayoutList size={15} />
            List View
          </TabsTrigger>
        </TabsList>

        {/* ── Hierarchy Map ── */}
        <TabsContent value="hierarchy">
          <GlassCard className="p-6">
            {treeLoading ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : (
              <BudgetHierarchyTree
                nodes={tree || []}
                totalBudget={summary?.totalBudget ?? 0}
                cycleName={cycle?.name}
              />
            )}
          </GlassCard>
        </TabsContent>

        {/* ── Tree View (existing) ── */}
        <TabsContent value="tree">
          <GlassCard className="p-6">
            {treeLoading ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : (
              <SectorTree nodes={tree || []} />
            )}
          </GlassCard>
        </TabsContent>

        {/* ── List View ── */}
        <TabsContent value="list">
          <GlassCard className="p-0 overflow-hidden">
            {listLoading ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="text-white/40">Sector Name</TableHead>
                    <TableHead className="text-white/40">Code</TableHead>
                    <TableHead className="text-white/40 text-right">Allocated</TableHead>
                    <TableHead className="text-white/40 text-right">Available</TableHead>
                    <TableHead className="text-white/40">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors?.map((sector) => (
                    <TableRow key={sector.id} className="hover:bg-white/5 border-white/5 transition-colors group">
                      <TableCell className="font-medium text-white">
                        <Link href={`/sectors/${sector.id}`}>
                          <a className="hover:text-blue-400 transition-colors">{sector.name}</a>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {sector.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-white/80">
                        {formatCurrency(sector.netAllocated || 0)}
                      </TableCell>
                      <TableCell className="text-right text-white/80">
                        {formatCurrency(sector.availableBalance || 0)}
                      </TableCell>
                      <TableCell className="w-48">
                        <div className="flex items-center gap-3">
                          <ProgressBar
                            value={sector.utilizationPct || 0}
                            className="flex-1"
                            color={(sector.utilizationPct || 0) > 90 ? 'danger' : (sector.utilizationPct || 0) > 70 ? 'warning' : 'primary'}
                          />
                          <span className="text-xs font-medium text-white/40 group-hover:text-white transition-colors">
                            {Math.round(sector.utilizationPct || 0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
