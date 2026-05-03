import { 
  useGetAuditLog, 
  useGetSectorBreakdown 
} from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { FileText, History, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ReportsPage() {
  const { data: auditLog, isLoading: auditLoading } = useGetAuditLog({ limit: 50 });
  const { data: sectorBreakdown, isLoading: breakdownLoading } = useGetSectorBreakdown();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Reports</h2>
          <p className="text-white/40 mt-1">Audit logs and sector performance analysis</p>
        </div>
        <Button variant="outline" className="glass border-white/10 gap-2">
          <Download size={16} />
          Export Data
        </Button>
      </div>

      <Tabs defaultValue="audit" className="w-full">
        <TabsList className="glass border-white/10 p-1 mb-6">
          <TabsTrigger value="audit" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2">
            <History size={16} />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2">
            <FileText size={16} />
            Sector Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit">
          <GlassCard className="p-0 overflow-hidden">
            {auditLoading ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="text-white/40">Timestamp</TableHead>
                    <TableHead className="text-white/40">User</TableHead>
                    <TableHead className="text-white/40">Action</TableHead>
                    <TableHead className="text-white/40">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLog?.items.map((log) => (
                    <TableRow key={log.id} className="hover:bg-white/5 border-white/5 transition-colors">
                      <TableCell className="text-white/40 text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-white font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <Badge variant={
                          log.action.includes('CREATE') ? 'success' :
                          log.action.includes('REVOKE') ? 'danger' :
                          'default'
                        } className="text-[10px]">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white/60 text-sm max-w-xs truncate">
                        {log.meta ? JSON.stringify(log.meta) : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="breakdown">
          <GlassCard className="p-0 overflow-hidden">
            {breakdownLoading ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : (
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="hover:bg-transparent border-white/10">
                    <TableHead className="text-white/40">Sector</TableHead>
                    <TableHead className="text-white/40 text-right">Budget</TableHead>
                    <TableHead className="text-white/40 text-right">Allocated</TableHead>
                    <TableHead className="text-white/40 text-right">Available</TableHead>
                    <TableHead className="text-white/40 text-right">Utilization</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sectorBreakdown?.map((item) => (
                    <TableRow key={item.sectorId} className="hover:bg-white/5 border-white/5 transition-colors">
                      <TableCell className="text-white font-medium">{item.sectorName}</TableCell>
                      <TableCell className="text-right text-white/80">{formatCurrency(item.netAllocated + item.availableBalance)}</TableCell>
                      <TableCell className="text-right text-white/80">{formatCurrency(item.netAllocated)}</TableCell>
                      <TableCell className="text-right text-white/80">{formatCurrency(item.availableBalance)}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.utilizationPct > 90 ? "text-rose-400" : "text-emerald-400"}>
                          {Math.round(item.utilizationPct)}%
                        </span>
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
