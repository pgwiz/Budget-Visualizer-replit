import { 
  useListUsers, 
  useCreateUser, 
  useUpdateUser, 
  useDeleteUser,
  useListSectors,
  getListUsersQueryKey
} from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { queryClient } from '@/lib/api';
import { Plus, Trash2, UserPlus } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function UsersPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data: users, isLoading } = useListUsers();
  const { data: sectors } = useListSectors();

  const createMutation = useCreateUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsCreateOpen(false);
      }
    }
  });

  const deleteMutation = useDeleteUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      }
    }
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      data: {
        email: formData.get('email') as string,
        name: formData.get('name') as string,
        password: formData.get('password') as string,
        role: formData.get('role') as any,
        sectorId: formData.get('sectorId') ? parseInt(formData.get('sectorId') as string) : undefined,
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Users</h2>
          <p className="text-white/40 mt-1">Manage system access and roles</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 h-11 px-6 rounded-xl">
              <UserPlus size={18} />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="glass border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription className="text-white/40">
                Grant access to the budget monitor system.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input name="name" placeholder="John Doe" required className="glass border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input name="email" type="email" placeholder="john@example.gov" required className="glass border-white/10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input name="password" type="password" required className="glass border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select name="role" required>
                    <SelectTrigger className="glass border-white/10">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/10 text-white">
                      <SelectItem value="ministry_head">Ministry Head</SelectItem>
                      <SelectItem value="department_head">Department Head</SelectItem>
                      <SelectItem value="ceo">CEO</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sector (Optional)</Label>
                  <Select name="sectorId">
                    <SelectTrigger className="glass border-white/10">
                      <SelectValue placeholder="Assigned sector" />
                    </SelectTrigger>
                    <SelectContent className="glass border-white/10 text-white">
                      {sectors?.map(s => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-500" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
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
                <TableHead className="text-white/40">User</TableHead>
                <TableHead className="text-white/40">Role</TableHead>
                <TableHead className="text-white/40">Sector</TableHead>
                <TableHead className="text-white/40">Status</TableHead>
                <TableHead className="text-white/40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id} className="hover:bg-white/5 border-white/5 transition-colors">
                  <TableCell>
                    <div>
                      <p className="text-white font-medium">{u.name}</p>
                      <p className="text-xs text-white/40">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-[10px]">
                      {u.role.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/60">
                    {u.sector?.name || 'All Sectors'}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">ACTIVE</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-rose-400 hover:bg-rose-400/10 rounded-lg"
                      onClick={() => deleteMutation.mutate({ userId: u.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 size={16} />
                    </Button>
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
