import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useListUsers, useCreateUser, useUpdateUser, useDeleteUser,
  useListSectors, getListUsersQueryKey,
} from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { queryClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import {
  UserPlus, Trash2, Search, Shield, Edit2, X, Check,
  ChevronDown, Users, Eye, Building2, Crown, Settings2,
} from 'lucide-react';

/* ── Role config ────────────────────────────────────────────── */
const ROLES = [
  {
    value: 'super_admin',
    label: 'System Administrator',
    desc: 'Full system access — users, cycles, structure, config',
    icon: Settings2,
    color: '#f87171',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.22)',
    adminOnly: true,
  },
  {
    value: 'ceo',
    label: 'Chief Executive Officer',
    desc: 'Business leadership — allocations, procurement approval, reports',
    icon: Crown,
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.22)',
    adminOnly: false,
  },
  {
    value: 'ministry_head',
    label: 'Ministry Head',
    desc: 'Manages ministry budget and distributes to departments',
    icon: Building2,
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.22)',
    adminOnly: false,
  },
  {
    value: 'department_head',
    label: 'Department Head',
    desc: 'Manages department budget and raises purchase orders',
    icon: Users,
    color: '#34d399',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.22)',
    adminOnly: false,
  },
  {
    value: 'viewer',
    label: 'Read-only Viewer',
    desc: 'Can view data but cannot make any changes',
    icon: Eye,
    color: '#94a3b8',
    bg: 'rgba(148,163,184,0.08)',
    border: 'rgba(148,163,184,0.15)',
    adminOnly: false,
  },
] as const;

type RoleValue = typeof ROLES[number]['value'];

function roleMeta(role: string) {
  return ROLES.find(r => r.value === role) ?? ROLES[4];
}

function RoleBadge({ role }: { role: string }) {
  const m = roleMeta(role);
  const Icon = m.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold"
      style={{ color: m.color, background: m.bg, border: `1px solid ${m.border}` }}>
      <Icon size={11} />
      {m.label}
    </span>
  );
}

/* ── Create / Edit user form ─────────────────────────────────── */
interface UserFormProps {
  mode: 'create' | 'edit';
  initial?: { name: string; email: string; role: string; sectorId?: number | null };
  isSuperAdmin: boolean;
  sectors: any[];
  onSave: (data: any) => void;
  onCancel: () => void;
  saving: boolean;
}

function UserForm({ mode, initial, isSuperAdmin, sectors, onSave, onCancel, saving }: UserFormProps) {
  const [name, setName]         = useState(initial?.name ?? '');
  const [email, setEmail]       = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole]         = useState<RoleValue>((initial?.role as RoleValue) ?? 'viewer');
  const [sectorId, setSector]   = useState<string>(initial?.sectorId ? String(initial.sectorId) : '');

  const availableRoles = isSuperAdmin ? ROLES : ROLES.filter(r => !r.adminOnly);
  const selectedMeta = roleMeta(role);
  const SelectedIcon = selectedMeta.icon;

  const valid = name.trim() && email.trim() && (mode === 'edit' || password.trim());

  const handleSave = () => {
    const data: any = { name: name.trim(), email: email.trim(), role };
    if (password) data.password = password;
    if (sectorId) data.sectorId = parseInt(sectorId);
    onSave(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-blue-500/25 bg-blue-500/5 p-6 space-y-5"
    >
      <p className="text-sm font-bold text-white">{mode === 'create' ? 'Add New User' : 'Edit User'}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-white/50 text-xs uppercase tracking-wider">Full Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grace Wanjiku" className="glass border-white/10 text-white placeholder:text-white/20" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/50 text-xs uppercase tracking-wider">Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@ministry.go.ke" className="glass border-white/10 text-white placeholder:text-white/20" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/50 text-xs uppercase tracking-wider">
            {mode === 'edit' ? 'New Password (leave blank to keep)' : 'Password'}
          </Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="glass border-white/10 text-white placeholder:text-white/20" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-white/50 text-xs uppercase tracking-wider">Sector (optional)</Label>
          <select
            value={sectorId}
            onChange={e => setSector(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="" className="bg-[#0d1527]">— All Sectors —</option>
            {sectors.map(s => <option key={s.id} value={s.id} className="bg-[#0d1527]">{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Role picker */}
      <div className="space-y-2">
        <Label className="text-white/50 text-xs uppercase tracking-wider">Role</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableRoles.map(r => {
            const Icon = r.icon;
            const selected = role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  selected ? 'border-opacity-60' : 'border-white/8 hover:border-white/15 bg-white/3'
                }`}
                style={selected ? { background: r.bg, borderColor: r.border } : {}}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: selected ? r.bg : 'rgba(255,255,255,0.05)', border: `1px solid ${selected ? r.border : 'rgba(255,255,255,0.08)'}` }}>
                  <Icon size={13} style={{ color: selected ? r.color : 'rgba(255,255,255,0.3)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${selected ? 'text-white' : 'text-white/50'}`}>{r.label}</p>
                  <p className="text-[10px] text-white/25 leading-snug mt-0.5">{r.desc}</p>
                </div>
                {selected && <Check size={13} style={{ color: r.color }} className="shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
        {role === 'super_admin' && (
          <p className="text-[11px] text-rose-400/70 flex items-center gap-1.5 px-1">
            <Shield size={11} /> System Administrator has unrestricted access to all features.
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={!valid || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors"
        >
          {saving ? <LoadingSpinner size={14} className="p-0 text-white" /> : <Check size={14} />}
          {mode === 'create' ? 'Create User' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1.5">
          <X size={14} /> Cancel
        </button>
      </div>
    </motion.div>
  );
}

/* ── User row ────────────────────────────────────────────────── */
function UserRow({ u, isSuperAdmin, sectors, onEdit, onDelete }: {
  u: any; isSuperAdmin: boolean; sectors: any[];
  onEdit: () => void; onDelete: () => void;
}) {
  const meta = roleMeta(u.role);
  const initials = u.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/4 hover:bg-white/6 transition-colors group"
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
        style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.color }}>
        {initials}
      </div>
      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">{u.name}</p>
        <p className="text-xs text-white/35 truncate">{u.email}</p>
      </div>
      {/* Role badge */}
      <div className="hidden sm:block shrink-0">
        <RoleBadge role={u.role} />
      </div>
      {/* Sector */}
      <p className="hidden md:block text-xs text-white/35 shrink-0 max-w-[120px] truncate">
        {u.sector?.name ?? 'All sectors'}
      </p>
      {/* Status */}
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0"
        style={{ color: u.isActive ? '#34d399' : '#f87171', background: u.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' }}>
        {u.isActive ? 'ACTIVE' : 'INACTIVE'}
      </span>
      {/* Actions */}
      {isSuperAdmin && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white transition-all">
            <Edit2 size={13} />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-white/30 hover:text-rose-400 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function UsersPage() {
  const { isSuperAdmin } = useAuth();
  const [search, setSearch]   = useState('');
  const [adding, setAdding]   = useState(false);
  const [editId, setEditId]   = useState<number | null>(null);
  const [roleFilter, setRole] = useState<string>('all');

  const { data: users = [], isLoading } = useListUsers();
  const { data: sectors = [] }          = useListSectors();

  const createMutation = useCreateUser({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); setAdding(false); } } });
  const updateMutation = useUpdateUser({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); setEditId(null); } } });
  const deleteMutation = useDeleteUser({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }) } });

  /* group users by role section */
  const adminUsers  = users.filter(u => u.role === 'super_admin');
  const bizUsers    = users.filter(u => u.role === 'ceo');
  const mgmtUsers   = users.filter(u => ['ministry_head','department_head'].includes(u.role));
  const viewerUsers = users.filter(u => u.role === 'viewer');

  const filtered = (arr: typeof users) => arr.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (!search) return true;
    return u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
  });

  const counts: Record<string, number> = { all: users.length };
  ROLES.forEach(r => { counts[r.value] = users.filter(u => u.role === r.value).length; });

  const sections = [
    { label: 'System Administrators', icon: Settings2, color: '#f87171', users: adminUsers },
    { label: 'Chief Executive Officers', icon: Crown, color: '#fbbf24', users: bizUsers },
    { label: 'Ministry & Department Heads', icon: Building2, color: '#60a5fa', users: mgmtUsers },
    { label: 'Viewers', icon: Eye, color: '#94a3b8', users: viewerUsers },
  ];

  const editUser = users.find(u => u.id === editId);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users size={22} className="text-blue-400" />
            Users & Access Control
          </h1>
          <p className="text-white/30 text-sm mt-1">
            {users.length} users · {isSuperAdmin ? 'Full management access' : 'Read-only view'}
          </p>
        </div>
        {isSuperAdmin && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            <UserPlus size={15} /> Add User
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-44">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." className="pl-9 glass border-white/10 text-white text-sm placeholder:text-white/20" />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
          <button onClick={() => setRole('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === 'all' ? 'bg-blue-500/20 text-blue-400' : 'text-white/40 hover:text-white'}`}>
            All ({counts.all})
          </button>
          {ROLES.map(r => counts[r.value] > 0 && (
            <button key={r.value} onClick={() => setRole(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === r.value ? 'text-white' : 'text-white/40 hover:text-white'}`}
              style={roleFilter === r.value ? { background: r.bg, color: r.color } : {}}
            >
              {r.label.split(' ')[0]} ({counts[r.value]})
            </button>
          ))}
        </div>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {adding && (
          <UserForm
            mode="create"
            isSuperAdmin={isSuperAdmin}
            sectors={sectors}
            onSave={data => createMutation.mutate({ data })}
            onCancel={() => setAdding(false)}
            saving={createMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Edit form */}
      <AnimatePresence>
        {editId && editUser && (
          <UserForm
            mode="edit"
            initial={{ name: editUser.name, email: editUser.email, role: editUser.role, sectorId: editUser.sectorId }}
            isSuperAdmin={isSuperAdmin}
            sectors={sectors}
            onSave={data => updateMutation.mutate({ userId: editId, data })}
            onCancel={() => setEditId(null)}
            saving={updateMutation.isPending}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="flex justify-center py-20"><LoadingSpinner size={36} /></div>
      ) : roleFilter !== 'all' ? (
        /* Flat filtered list */
        <GlassCard header={<span className="text-sm font-bold text-white">Filtered Results</span>}>
          <div className="space-y-2">
            <AnimatePresence>
              {filtered(users).map(u => (
                <UserRow key={u.id} u={u} isSuperAdmin={isSuperAdmin} sectors={sectors}
                  onEdit={() => setEditId(u.id)}
                  onDelete={() => { if (confirm(`Delete "${u.name}"?`)) deleteMutation.mutate({ userId: u.id }); }}
                />
              ))}
            </AnimatePresence>
            {filtered(users).length === 0 && (
              <p className="text-center text-white/20 text-sm py-8">No users match your filter</p>
            )}
          </div>
        </GlassCard>
      ) : (
        /* Grouped by role section */
        <div className="space-y-4">
          {sections.map(({ label, icon: Icon, color, users: sectionUsers }) => {
            const visibleUsers = filtered(sectionUsers);
            if (visibleUsers.length === 0 && !search) return null;
            return (
              <GlassCard
                key={label}
                header={
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                      <Icon size={13} style={{ color }} />
                    </div>
                    <span className="text-sm font-bold text-white">{label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color, background: `${color}15`, border: `1px solid ${color}20` }}>
                      {visibleUsers.length}
                    </span>
                  </div>
                }
              >
                {visibleUsers.length === 0 ? (
                  <p className="text-center text-white/20 text-sm py-6">No users in this group</p>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {visibleUsers.map(u => (
                        <UserRow key={u.id} u={u} isSuperAdmin={isSuperAdmin} sectors={sectors}
                          onEdit={() => setEditId(u.id)}
                          onDelete={() => { if (confirm(`Delete "${u.name}"?`)) deleteMutation.mutate({ userId: u.id }); }}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
