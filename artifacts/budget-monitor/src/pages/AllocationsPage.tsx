import { useState } from 'react';
import { 
  useListAllocations, 
  useCreateAllocation, 
  useRevokeAllocation,
  useListSectors,
  useGetActiveCycle,
  getListAllocationsQueryKey,
  getGetDashboardSummaryQueryKey,
  AllocationWithDetails,
  SectorWithStats,
} from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, queryClient } from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faUndo, faSearch, faFilter, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/hooks/useAuth';

export default function AllocationsPage() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<number | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [advancedView, setAdvancedView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: allocations, isLoading } = useListAllocations({ advanced: advancedView });
  const { data: rawSectors } = useListSectors();
  const sectors = Array.isArray(rawSectors) ? rawSectors : [];
  const { data: cycle } = useGetActiveCycle();

  // Filter to only show immediate children for allocation targets
  const userSectorId = user?.sectorId;
  const allocableTargets = sectors?.filter((s: SectorWithStats) => {
    if (user?.role === 'super_admin') return true;
    if (!userSectorId) return true;
    return s.parent?.id === userSectorId;
  }) ?? [];

  const createMutation = useCreateAllocation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setIsCreateOpen(false);
      }
    }
  });

  const revokeMutation = useRevokeAllocation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAllocationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setIsRevokeOpen(false);
        setRevokeReason('');
        setSelectedAllocation(null);
      }
    }
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        budgetCycleId: cycle?.id || 0,
        fromSectorId: userSectorId ?? undefined,
        toSectorId: parseInt(formData.get('toSectorId') as string),
        amount: parseFloat(formData.get('amount') as string),
        comment: formData.get('comment') as string,
      }
    });
  };

  const handleRevoke = () => {
    if (selectedAllocation) {
      revokeMutation.mutate({
        allocationId: selectedAllocation,
        data: { reason: revokeReason }
      });
    }
  };

  // Filter allocations
  const filteredAllocations = (allocations ?? []).filter((item: AllocationWithDetails) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchFrom = item.fromSector?.name?.toLowerCase().includes(q);
      const matchTo = item.toSector?.name?.toLowerCase().includes(q);
      const matchComment = item.comment?.toLowerCase().includes(q);
      if (!matchFrom && !matchTo && !matchComment) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Allocations</h2>
          <p className="text-gray-500 mt-1">Resource transfer and audit trail</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Advanced View Toggle */}
          <div className="flex items-center gap-2 glass px-3 py-2 rounded-xl border border-gray-200">
            <span className="text-xs text-gray-500">
              {advancedView ? <FontAwesomeIcon icon={faEye} className="mr-1" /> : <FontAwesomeIcon icon={faEyeSlash} className="mr-1" />}
              {advancedView ? 'Full View' : 'Direct Only'}
            </span>
            <Switch
              checked={advancedView}
              onCheckedChange={setAdvancedView}
              className="data-[state=checked]:bg-blue-600"
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-11 px-6 rounded-xl">
                <FontAwesomeIcon icon={faPlus} />
                New Allocation
              </Button>
            </DialogTrigger>
            <DialogContent className="glass border-gray-200 text-gray-900 max-w-md bg-white">
              <DialogHeader>
                <DialogTitle>New Allocation</DialogTitle>
                <DialogDescription className="text-gray-500">
                  Transfer budget resources to an immediate sub-sector.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Active Cycle</Label>
                  <Input value={cycle?.name || ''} disabled className="border-gray-200 bg-gray-50 text-gray-900" />
                </div>
                <div className="space-y-2">
                  <Label>To Sub-Sector</Label>
                  <Select name="toSectorId" required>
                    <SelectTrigger className="border-gray-200 bg-gray-50 text-gray-900">
                      <SelectValue placeholder="Select target sub-sector" />
                    </SelectTrigger>
                    <SelectContent className="border-gray-200 bg-white text-gray-900">
                      {allocableTargets.map((s: SectorWithStats) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {allocableTargets.length === 0 && (
                    <p className="text-xs text-amber-600">No allocable sub-sectors found. You can only allocate to your immediate children.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Amount (KES)</Label>
                  <Input name="amount" type="number" step="0.01" required placeholder="0.00" className="border-gray-200 bg-gray-50 text-gray-900" />
                </div>
                <div className="space-y-2">
                  <Label>Comment</Label>
                  <Input name="comment" placeholder="Purpose of allocation" className="border-gray-200 bg-gray-50 text-gray-900" />
                </div>
                <DialogFooter className="pt-4">
                  <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="text-gray-600">Cancel</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Confirm Allocation'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 bg-gray-50">
          <div className="relative flex items-center flex-1">
            <input
              placeholder="Search allocations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-5 pr-14 rounded-full border border-gray-200 bg-white text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#4B117A]/40 focus:ring-2 focus:ring-[#4B117A]/10 transition-all"
            />
            <button className="absolute right-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all"
              style={{ background: '#4B117A' }}>
              <FontAwesomeIcon icon={faSearch} className="text-white text-[13px]" />
            </button>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="border-gray-200 bg-white w-[160px] text-gray-900">
              <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-400" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="border-gray-200 bg-white text-gray-900">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
              <SelectItem value="exhausted">Exhausted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <LoadingSpinner size={40} className="py-20" />
        ) : (
          <div className="p-4 space-y-6 bg-gray-50/50">
            {filteredAllocations.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                {searchQuery || statusFilter !== 'all' ? 'No matching allocations' : 'No allocations yet'}
              </div>
            ) : (
              Object.entries(
                filteredAllocations.reduce((acc: Record<string, AllocationWithDetails[]>, item: AllocationWithDetails) => {
                  const key = item.fromSector?.name || 'National Treasury (System)';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(item);
                  return acc;
                }, {})
              ).map(([sectionName, items], index) => {
                const COLORS = [
                  'bg-blue-600',
                  'bg-purple-600',
                  'bg-emerald-600',
                  'bg-orange-600',
                  'bg-rose-600',
                  'bg-indigo-600',
                  'bg-cyan-600',
                ];
                const headerBg = COLORS[index % COLORS.length];

                return (
                  <div key={sectionName} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
                    <div className={`px-4 py-3 flex items-center justify-between text-white ${headerBg}`}>
                      <span className="text-sm font-bold tracking-wide">{sectionName}</span>
                      <Badge variant="outline" className="bg-white/20 text-white border-white/30 shadow-sm hover:bg-white/30 transition-colors">{items.length} Allocations</Badge>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="border-b border-gray-200">
                          <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="bg-slate-200/80 text-gray-700 font-bold text-xs uppercase tracking-wider">ID</TableHead>
                            <TableHead className="bg-blue-200/80 text-gray-700 font-bold text-xs uppercase tracking-wider">To</TableHead>
                            <TableHead className="bg-emerald-200/80 text-gray-700 font-bold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                            <TableHead className="bg-amber-200/80 text-gray-700 font-bold text-xs uppercase tracking-wider">Status</TableHead>
                            <TableHead className="bg-purple-200/80 text-gray-700 font-bold text-xs uppercase tracking-wider">Date</TableHead>
                            <TableHead className="bg-gray-200/80 text-gray-700 font-bold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item: AllocationWithDetails) => {
                            const amt = item.amount;
                            const shortAmt = amt >= 1e9 ? `KES ${(amt / 1e9).toFixed(2)}B` :
                                             amt >= 1e6 ? `KES ${(amt / 1e6).toFixed(2)}M` :
                                             amt >= 1e3 ? `KES ${(amt / 1e3).toFixed(2)}K` :
                                             `KES ${amt.toFixed(2)}`;

                            return (
                              <TableRow key={item.id} className="border-gray-200 transition-colors">
                                <TableCell className="bg-slate-100 text-gray-700 font-mono text-xs font-semibold">#{item.id}</TableCell>
                                <TableCell className="bg-blue-100 text-gray-900 font-bold">{item.toSector?.name}</TableCell>
                                <TableCell className="bg-emerald-100 text-right text-emerald-900 font-black">{shortAmt}</TableCell>
                                <TableCell className="bg-amber-100">
                                  <Badge className={
                                    item.status === 'active' ? "bg-emerald-500 text-white border-emerald-600 shadow-sm" :
                                    item.status === 'revoked' ? "bg-red-500 text-white border-red-600 shadow-sm" :
                                    "bg-amber-500 text-white border-amber-600 shadow-sm"
                                  }>
                                    {item.status.toUpperCase()}
                                  </Badge>
                                </TableCell>
                                <TableCell className="bg-purple-100 text-purple-900 font-semibold text-xs">
                                  {new Date(item.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="bg-gray-100 text-right">
                                  {item.status === 'active' && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      className="text-red-600 hover:bg-red-200 hover:text-red-700 rounded-lg h-8 w-8"
                                      onClick={() => {
                                        setSelectedAllocation(item.id);
                                        setIsRevokeOpen(true);
                                      }}
                                    >
                                      <FontAwesomeIcon icon={faUndo} className="text-[13px]" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </GlassCard>

      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent className="glass border-gray-200 text-gray-900 bg-white">
          <DialogHeader>
            <DialogTitle className="text-red-600">Revoke Allocation</DialogTitle>
            <DialogDescription className="text-gray-500">
              This action will return the allocated funds to the parent sector. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Revocation</Label>
              <Input 
                value={revokeReason} 
                onChange={e => setRevokeReason(e.target.value)}
                placeholder="e.g. Budget reallocation, error in entry" 
                className="border-gray-200 bg-gray-50 text-gray-900" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRevokeOpen(false)} className="text-gray-600">Cancel</Button>
            <Button 
              className="bg-red-600 hover:bg-red-500 text-white" 
              onClick={handleRevoke}
              disabled={revokeMutation.isPending || !revokeReason}
            >
              {revokeMutation.isPending ? 'Revoking...' : 'Confirm Revocation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
