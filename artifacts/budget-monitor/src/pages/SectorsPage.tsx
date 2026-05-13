import { useListSectors, useGetSectorTree, useGetActiveCycle, useGetDashboardSummary } from '@workspace/api-client-react';
import { SectorTree } from '@/components/sectors/SectorTree';
import { BudgetHierarchyTree } from '@/components/hierarchy/BudgetHierarchyTree';
import { OrgChart } from '@/components/orgchart/OrgChart';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { formatCurrency } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faList, faProjectDiagram, faCodeBranch, faSitemap } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

export default function SectorsPage() {
  const { data: rawSectors, isLoading: listLoading } = useListSectors();
  const sectors = Array.isArray(rawSectors) ? rawSectors : [];
  const { data: tree, isLoading: treeLoading } = useGetSectorTree();
  const { data: cycle } = useGetActiveCycle();
  const { data: summary } = useGetDashboardSummary();
  const { isSuperAdmin } = useAuth();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Sectors</h2>
          <p className="text-gray-500 mt-1">Government structure and budget distribution</p>
        </div>
        <div className="flex items-center gap-3">
          {cycle && (
            <div className="glass bg-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm border border-gray-200">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-gray-600">Active: <span className="text-gray-900 font-semibold">{cycle.name}</span></span>
            </div>
          )}
          {isSuperAdmin && (
            <Link
              href="/hierarchy-designer"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 text-sm font-semibold transition-all"
            >
              <FontAwesomeIcon icon={faProjectDiagram} className="w-3" />
              Designer
            </Link>
          )}
        </div>
      </div>

      <Tabs defaultValue="orgchart" className="w-full">
        <TabsList className="glass bg-white border border-gray-200 p-1 mb-6 rounded-xl flex shadow-sm">
          <TabsTrigger value="orgchart" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 gap-2">
            <FontAwesomeIcon icon={faSitemap} className="w-3" />
            Org Chart
          </TabsTrigger>
          <TabsTrigger value="hierarchy" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 gap-2">
            <FontAwesomeIcon icon={faCodeBranch} className="w-3" />
            Hierarchy Map
          </TabsTrigger>
          <TabsTrigger value="tree" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 gap-2">
            <FontAwesomeIcon icon={faProjectDiagram} className="w-3" />
            Tree View
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 gap-2">
            <FontAwesomeIcon icon={faList} className="w-3" />
            List View
          </TabsTrigger>
        </TabsList>

        {/* ── Org Chart ── */}
        <TabsContent value="orgchart">
          <GlassCard className="p-6 overflow-hidden max-w-full">
            {treeLoading ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : (
              <OrgChart
                nodes={tree || []}
                totalBudget={summary?.totalBudget ?? 0}
                cycleName={cycle?.name}
              />
            )}
          </GlassCard>
        </TabsContent>

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
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50 border-b border-gray-200">
                  <TableRow className="hover:bg-transparent border-gray-200">
                    <TableHead className="text-gray-500 font-semibold">Sector Name</TableHead>
                    <TableHead className="text-gray-500 font-semibold">Code</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-right">Allocated</TableHead>
                    <TableHead className="text-gray-500 font-semibold text-right">Available</TableHead>
                    <TableHead className="text-gray-500 font-semibold">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectors?.map((sector) => (
                    <TableRow key={sector.id} className="hover:bg-gray-50 border-b border-gray-100 transition-colors group">
                      <TableCell className="font-medium text-gray-900">
                        <Link href={`/sectors/${sector.id}`} className="hover:text-blue-600 transition-colors">
                          {sector.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-bold border-gray-300 text-gray-600">
                          {sector.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {formatCurrency(sector.netAllocated || 0)}
                      </TableCell>
                      <TableCell className="text-right text-gray-700">
                        {formatCurrency(sector.availableBalance || 0)}
                      </TableCell>
                      <TableCell className="w-48">
                        <div className="flex items-center gap-3">
                          <ProgressBar
                            value={sector.utilizationPct || 0}
                            className="flex-1"
                            color={(sector.utilizationPct || 0) > 90 ? 'danger' : (sector.utilizationPct || 0) > 70 ? 'warning' : 'primary'}
                          />
                          <span className="text-xs font-medium text-gray-500 group-hover:text-gray-900 transition-colors">
                            {Math.round(sector.utilizationPct || 0)}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
