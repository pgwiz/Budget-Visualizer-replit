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
  faUserPlus, faTrashAlt, faSearch, faShieldAlt, faEdit, faTimes, faCheck,
  faChevronDown, faUsers, faEye, faBuilding, faCrown, faCog, faUser,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/* ── Role config ────────────────────────────────────────────── */
const ROLES = [
  {
    value: 'super_admin',
    label: 'System Administrator',
    desc: 'Full system access — users, cycles, structure, config',
    icon: faCog,
    color: '#f87171',
    bg: 'rgba(239,68,68,0.10)',
    border: 'rgba(239,68,68,0.22)',
    adminOnly: true,
  },
  {
    value: 'ceo',
    label: 'Chief Executive Officer',
    desc: 'Business leadership — allocations, procurement approval, reports',
    icon: faCrown,
    color: '#fbbf24',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.22)',
    adminOnly: false,
  },
  {
    value: 'ministry_head',
    label: 'Ministry Head',
    desc: 'Manages ministry budget and distributes to departments',
    icon: faBuilding,
    color: '#60a5fa',
    bg: 'rgba(59,130,246,0.10)',
    border: 'rgba(59,130,246,0.22)',
    adminOnly: false,
  },
  {
    value: 'department_head',
    label: 'Department Head',
    desc: 'Manages department budget and raises purchase orders',
    icon: faUsers,
    color: '#34d399',
    bg: 'rgba(16,185,129,0.10)',
    border: 'rgba(16,185,129,0.22)',
    adminOnly: false,
  },
  {
    value: 'viewer',
    label: 'Read-only Viewer',
    desc: 'Can view data but cannot make any changes',
    icon: faEye,
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
      <FontAwesomeIcon icon={Icon} className="text-[11px]" />
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
      <p className="text-sm font-bold text-gray-900">{mode === 'create' ? 'Add New User' : 'Edit User'}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">Full Name</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Grace Wanjiku" className="glass border-gray-200 text-gray-900 placeholder:text-gray-400" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">Email</Label>
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@ministry.go.ke" className="glass border-gray-200 text-gray-900 placeholder:text-gray-400" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">
            {mode === 'edit' ? 'New Password (leave blank to keep)' : 'Password'}
          </Label>
          <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="glass border-gray-200 text-gray-900 placeholder:text-gray-400" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-gray-600 text-xs uppercase tracking-wider">Sector (optional)</Label>
          <select
            value={sectorId}
            onChange={e => setSector(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:border-blue-500/50"
          >
            <option value="" className="bg-white">— All Sectors —</option>
            {sectors.map(s => <option key={s.id} value={s.id} className="bg-white">{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Role picker */}
      <div className="space-y-2">
        <Label className="text-gray-600 text-xs uppercase tracking-wider">Role</Label>
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
                  selected ? 'border-opacity-60' : 'border-gray-200 hover:border-white/15 bg-gray-50'
                }`}
                style={selected ? { background: r.bg, borderColor: r.border } : {}}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: selected ? r.bg : 'rgba(255,255,255,0.05)', border: `1px solid ${selected ? r.border : 'rgba(255,255,255,0.08)'}` }}>
                  <FontAwesomeIcon icon={Icon} className="text-[13px]" style={{ color: selected ? r.color : 'rgba(255,255,255,0.3)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${selected ? 'text-gray-900' : 'text-gray-600'}`}>{r.label}</p>
                  <p className="text-[10px] text-gray-400 leading-snug mt-0.5">{r.desc}</p>
                </div>
                {selected && <FontAwesomeIcon icon={faCheck} className="text-[13px] shrink-0 mt-1" style={{ color: r.color }} />}
              </button>
            );
          })}
        </div>
        {role === 'super_admin' && (
          <p className="text-[11px] text-rose-400/70 flex items-center gap-1.5 px-1">
            <FontAwesomeIcon icon={faShieldAlt} className="text-[11px]" /> System Administrator has unrestricted access to all features.
          </p>
        )}
      </div>

      <div className="flex gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={!valid || saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-gray-900 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition-colors"
        >
          {saving ? <LoadingSpinner size={14} className="p-0 text-gray-900" /> : <FontAwesomeIcon icon={faCheck} className="text-[14px]" />}
          {mode === 'create' ? 'Create User' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1.5">
          <FontAwesomeIcon icon={faTimes} className="text-[14px]" /> Cancel
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
      {/* Avatar — bare FA icon, sidebar dark color, no bg */}
      <div className="w-9 h-9 flex items-center justify-center shrink-0">
        <FontAwesomeIcon icon={faUser} className="text-[22px]" style={{ color: '#4B117A' }} />
      </div>
      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
        <p className="text-xs text-gray-900/35 truncate">{u.email}</p>
      </div>
      {/* Role badge */}
      <div className="hidden sm:block shrink-0">
        <RoleBadge role={u.role} />
      </div>
      {/* Sector */}
      <p className="hidden md:block text-xs text-gray-900/35 shrink-0 max-w-[120px] truncate">
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
          <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all">
            <FontAwesomeIcon icon={faEdit} className="text-[13px]" />
          </button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 transition-all">
            <FontAwesomeIcon icon={faTrashAlt} className="text-[13px]" />
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
  const { data: rawSectors }          = useListSectors();
  const sectors = Array.isArray(rawSectors) ? rawSectors : [];

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
    { label: 'System Administrators', icon: faCog, color: '#f87171', users: adminUsers },
    { label: 'Chief Executive Officers', icon: faCrown, color: '#fbbf24', users: bizUsers },
    { label: 'Ministry & Department Heads', icon: faBuilding, color: '#60a5fa', users: mgmtUsers },
    { label: 'Viewers', icon: faEye, color: '#94a3b8', users: viewerUsers },
  ];

  const editUser = users.find(u => u.id === editId);

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FontAwesomeIcon icon={faUsers} className="text-[22px] text-blue-400" />
            Users & Access Control
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {users.length} users · {isSuperAdmin ? 'Full management access' : 'Read-only view'}
          </p>
        </div>
        {isSuperAdmin && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-900 bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            <FontAwesomeIcon icon={faUserPlus} className="text-[15px]" /> Add User
          </button>
        )}
      </div>

      {/* Search + filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-44 flex items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full h-11 pl-5 pr-14 rounded-full border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#4B117A]/40 focus:ring-2 focus:ring-[#4B117A]/10 transition-all"
          />
          <button className="absolute right-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#4B117A' }}
            onClick={() => {}}
          >
            <FontAwesomeIcon icon={faSearch} className="text-white text-[13px]" />
          </button>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-50 border border-gray-200">
          <button onClick={() => setRole('all')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === 'all' ? 'bg-blue-500/20 text-blue-400' : 'text-gray-500 hover:text-gray-900'}`}>
            All ({counts.all})
          </button>
          {ROLES.map(r => counts[r.value] > 0 && (
            <button key={r.value} onClick={() => setRole(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${roleFilter === r.value ? 'text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
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
        <GlassCard header={<span className="text-sm font-bold text-gray-900">Filtered Results</span>}>
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
              <p className="text-center text-gray-400 text-sm py-8">No users match your filter</p>
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
                    <FontAwesomeIcon icon={Icon} className="text-[16px]" style={{ color: '#4B117A' }} />
                    <span className="text-sm font-bold text-gray-900">{label}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color, background: `${color}15`, border: `1px solid ${color}20` }}>
                      {visibleUsers.length}
                    </span>
                  </div>
                }
              >
                {visibleUsers.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">No users in this group</p>
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
