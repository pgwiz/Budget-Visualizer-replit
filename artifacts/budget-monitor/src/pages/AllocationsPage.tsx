import { useState } from 'react';
import { 
  useListAllocations, 
  useCreateAllocation, 
  useRevokeAllocation,
  useListSectors,
  useGetActiveCycle,
  getListAllocationsQueryKey,
  getGetDashboardSummaryQueryKey
} from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, queryClient } from '@/lib/api';
import { Plus, RotateCcw, Search, Filter } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth';

export default function AllocationsPage() {
  const { user } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState<number | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const { data: allocations, isLoading } = useListAllocations();
  const { data: sectors } = useListSectors();
  const { data: cycle } = useGetActiveCycle();

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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Allocations</h2>
          <p className="text-white/40 mt-1">Resource transfer and audit trail</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-11 px-6 rounded-xl">
              <Plus size={18} />
              New Allocation
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>New Allocation</DialogTitle>
              <DialogDescription className="text-white/40">
                Transfer budget resources to a sub-sector.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Active Cycle</Label>
                <Input value={cycle?.name || ''} disabled className="glass border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>To Sector</Label>
                <Select name="toSectorId" required>
                  <SelectTrigger className="glass border-white/10">
                    <SelectValue placeholder="Select target sector" />
                  </SelectTrigger>
                  <SelectContent className="glass border-white/10 text-white">
                    {sectors?.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.code})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount (KES)</Label>
                <Input name="amount" type="number" step="0.01" required placeholder="0.00" className="glass border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Comment</Label>
                <Input name="comment" placeholder="Purpose of allocation" className="glass border-white/10" />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Confirm Allocation'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row gap-4 bg-white/5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/20" />
            <Input placeholder="Search allocations..." className="pl-10 glass border-white/10 h-10" />
          </div>
          <Button variant="outline" className="glass border-white/10 gap-2">
            <Filter size={16} />
            Filters
          </Button>
        </div>

        {isLoading ? (
          <LoadingSpinner size={40} className="py-20" />
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-white/40">ID</TableHead>
                <TableHead className="text-white/40">From</TableHead>
                <TableHead className="text-white/40">To</TableHead>
                <TableHead className="text-white/40 text-right">Amount</TableHead>
                <TableHead className="text-white/40">Status</TableHead>
                <TableHead className="text-white/40">Date</TableHead>
                <TableHead className="text-white/40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allocations?.map((item) => (
                <TableRow key={item.id} className="hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell className="text-white/40 font-mono text-xs">#{item.id}</TableCell>
                  <TableCell className="text-white font-medium">{item.fromSector?.name || 'System'}</TableCell>
                  <TableCell className="text-white font-medium">{item.toSector?.name}</TableCell>
                  <TableCell className="text-right text-white font-bold">{formatCurrency(item.amount)}</TableCell>
                  <TableCell>
                    <Badge className={
                      item.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      item.status === 'revoked' ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                      "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }>
                      {item.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/40 text-xs">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {item.status === 'active' && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="text-rose-400 hover:bg-rose-400/10 rounded-lg"
                        onClick={() => {
                          setSelectedAllocation(item.id);
                          setIsRevokeOpen(true);
                        }}
                      >
                        <RotateCcw size={16} />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </GlassCard>

      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent className="glass border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-rose-400">Revoke Allocation</DialogTitle>
            <DialogDescription className="text-white/40">
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
                className="glass border-white/10" 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRevokeOpen(false)}>Cancel</Button>
            <Button 
              className="bg-rose-600 hover:bg-rose-500 text-white" 
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
