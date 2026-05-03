import { useState } from 'react';
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
import { FileText, History } from 'lucide-react';
import { ExportMenu } from '@/components/ui/ExportMenu';
import type { ExportColumn } from '@/lib/export';

/* ── Column definitions ─────────────────────────────────── */
const AUDIT_COLUMNS: ExportColumn[] = [
  { key: 'timestamp',  label: 'Timestamp' },
  { key: 'userName',   label: 'User' },
  { key: 'action',     label: 'Action' },
  { key: 'details',    label: 'Details' },
];

const BREAKDOWN_COLUMNS: ExportColumn[] = [
  { key: 'sectorName',      label: 'Sector' },
  { key: 'budget',          label: 'Budget (KSh)',      align: 'right' },
  { key: 'allocated',       label: 'Allocated (KSh)',   align: 'right' },
  { key: 'available',       label: 'Available (KSh)',   align: 'right' },
  { key: 'utilizationPct',  label: 'Utilization (%)',   align: 'right' },
];

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'audit' | 'breakdown'>('audit');

  const { data: auditLog,        isLoading: auditLoading }     = useGetAuditLog({ limit: 200 });
  const { data: sectorBreakdown, isLoading: breakdownLoading } = useGetSectorBreakdown();

  /* ── Shaped export data ────────────────────────────────── */
  const auditExportData = (auditLog?.items ?? []).map(log => ({
    timestamp: new Date(log.createdAt).toLocaleString(),
    userName:  log.userName,
    action:    log.action,
    details:   log.meta ? JSON.stringify(log.meta) : '',
  }));

  const breakdownExportData = (sectorBreakdown ?? []).map(item => ({
    sectorName:     item.sectorName,
    budget:         formatCurrency(item.netAllocated + item.availableBalance),
    allocated:      formatCurrency(item.netAllocated),
    available:      formatCurrency(item.availableBalance),
    utilizationPct: `${Math.round(item.utilizationPct)}%`,
  }));

  const isAudit      = activeTab === 'audit';
  const exportData   = isAudit ? auditExportData   : breakdownExportData;
  const exportCols   = isAudit ? AUDIT_COLUMNS      : BREAKDOWN_COLUMNS;
  const exportFile   = isAudit ? 'budget-audit-log' : 'budget-sector-breakdown';
  const exportTitle  = isAudit ? 'Budget Monitor — Audit Log' : 'Budget Monitor — Sector Breakdown';
  const isLoading    = isAudit ? auditLoading : breakdownLoading;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-white">Reports</h2>
          <p className="text-white/40 mt-1">Audit logs and sector performance analysis</p>
        </div>
        <ExportMenu
          data={exportData}
          columns={exportCols}
          filename={exportFile}
          title={exportTitle}
          disabled={isLoading || exportData.length === 0}
        />
      </div>

      <Tabs
        defaultValue="audit"
        onValueChange={v => setActiveTab(v as 'audit' | 'breakdown')}
        className="w-full"
      >
        <TabsList className="glass border-white/10 p-1 mb-6">
          <TabsTrigger
            value="audit"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2"
          >
            <History size={16} />
            Audit Log
            {auditLog && (
              <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/40">
                {auditLog.items.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="breakdown"
            className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-2"
          >
            <FileText size={16} />
            Sector Breakdown
            {sectorBreakdown && (
              <span className="ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/40">
                {sectorBreakdown.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Audit Log ──────────────────────────────────── */}
        <TabsContent value="audit">
          <GlassCard className="p-0 overflow-hidden">
            {auditLoading ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : !auditLog?.items.length ? (
              <div className="flex flex-col items-center py-20 text-white/20 gap-3">
                <History size={40} className="opacity-30" />
                <p className="text-sm">No audit log entries yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                    {auditLog.items.map((log) => (
                      <TableRow key={log.id} className="hover:bg-white/5 border-white/5 transition-colors">
                        <TableCell className="text-white/40 text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-white font-medium">{log.userName}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.action.includes('CREATE') ? 'success' :
                              log.action.includes('REVOKE') ? 'danger' :
                              'default'
                            }
                            className="text-[10px]"
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white/60 text-sm max-w-xs truncate">
                          {log.meta ? JSON.stringify(log.meta) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── Sector Breakdown ───────────────────────────── */}
        <TabsContent value="breakdown">
          <GlassCard className="p-0 overflow-hidden">
            {breakdownLoading ? (
              <LoadingSpinner size={40} className="py-20" />
            ) : !sectorBreakdown?.length ? (
              <div className="flex flex-col items-center py-20 text-white/20 gap-3">
                <FileText size={40} className="opacity-30" />
                <p className="text-sm">No sector data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
                    {sectorBreakdown.map((item) => (
                      <TableRow key={item.sectorId} className="hover:bg-white/5 border-white/5 transition-colors">
                        <TableCell className="text-white font-medium">{item.sectorName}</TableCell>
                        <TableCell className="text-right text-white/80">
                          {formatCurrency(item.netAllocated + item.availableBalance)}
                        </TableCell>
                        <TableCell className="text-right text-white/80">
                          {formatCurrency(item.netAllocated)}
                        </TableCell>
                        <TableCell className="text-right text-white/80">
                          {formatCurrency(item.availableBalance)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={item.utilizationPct > 90 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-semibold'}>
                            {Math.round(item.utilizationPct)}%
                          </span>
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
