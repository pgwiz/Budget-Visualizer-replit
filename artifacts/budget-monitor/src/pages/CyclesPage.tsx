import { 
  useListCycles, 
  useCreateCycle, 
  useUpdateCycle, 
  useActivateCycle,
  getListCyclesQueryKey,
  getGetDashboardSummaryQueryKey,
  BudgetCycle,
} from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, queryClient } from '@/lib/api';
import { Plus, CheckCircle2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function CyclesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: cycles, isLoading } = useListCycles();

  const createMutation = useCreateCycle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCyclesQueryKey() });
        setIsCreateOpen(false);
      }
    }
  });

  const activateMutation = useActivateCycle({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCyclesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    }
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        name: formData.get('name') as string,
        totalBudget: parseFloat(formData.get('totalBudget') as string),
        startDate: formData.get('startDate') as string,
        endDate: formData.get('endDate') as string,
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Budget Cycles</h2>
          <p className="text-white/40 mt-1">Manage fiscal periods and base budgets</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-11 px-6 rounded-xl">
              <Plus size={18} />
              New Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Create Budget Cycle</DialogTitle>
              <DialogDescription className="text-white/40">
                Define a new fiscal period and its total available budget.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cycle Name</Label>
                <Input name="name" placeholder="FY 2024/2025" required className="glass border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Total Budget (KES)</Label>
                <Input name="totalBudget" type="number" step="0.01" required placeholder="0.00" className="glass border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input name="startDate" type="date" required className="glass border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input name="endDate" type="date" required className="glass border-white/10" />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Cycle'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        {isLoading ? (
          <LoadingSpinner size={40} className="py-20" />
        ) : (
          <Table>
            <TableHeader className="bg-white/5">
              <TableRow className="hover:bg-transparent border-white/10">
                <TableHead className="text-white/40">Cycle Name</TableHead>
                <TableHead className="text-white/40">Total Budget</TableHead>
                <TableHead className="text-white/40">Dates</TableHead>
                <TableHead className="text-white/40">Status</TableHead>
                <TableHead className="text-white/40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cycles?.map((item: BudgetCycle) => (
                <TableRow key={item.id} className="hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell className="text-white font-medium">{item.name}</TableCell>
                  <TableCell className="text-white font-bold">{formatCurrency(item.totalBudget)}</TableCell>
                  <TableCell className="text-white/40 text-xs">
                    {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {item.isActive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">ACTIVE</Badge>
                    ) : (
                      <Badge variant="outline">INACTIVE</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!item.isActive && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-blue-400 hover:bg-blue-400/10 gap-2"
                        onClick={() => activateMutation.mutate({ cycleId: item.id })}
                        disabled={activateMutation.isPending}
                      >
                        <CheckCircle2 size={16} />
                        Activate
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>
    </div>
  );
}
