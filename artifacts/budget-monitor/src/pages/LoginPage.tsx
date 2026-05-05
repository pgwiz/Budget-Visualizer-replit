import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogin } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLocation } from 'wouter';
import {
  Mail, Lock, Eye, EyeOff, Shield, BarChart3, GitBranch,
  Users, AlertTriangle, ChevronRight, Building2, School,
  BookOpen, Zap, LogIn, Landmark, Globe, Search, Filter,
  ChevronDown,
} from 'lucide-react';
import { queryClient } from '@/lib/api';
import { getGetMeQueryKey } from '@workspace/api-client-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'super_admin' | 'ceo' | 'ministry_head' | 'department_head' | 'viewer';

interface DemoUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  sectorId: number | null;
}

interface DemoSector {
  id: number;
  name: string;
  code: string;
  parentId: number | null;
  depth: number;
}

interface SectorNode {
  sector: DemoSector;
  users: DemoUser[];
  children: SectorNode[];
}

const ROLE_META: Record<Role, { label: string; color: string; bg: string }> = {
  super_admin:     { label: 'Sys Admin',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  ceo:             { label: 'CS / DG',    color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  ministry_head:   { label: 'Head / PS',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  department_head: { label: 'HOD',        color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  viewer:          { label: 'Auditor',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

function depthIcon(depth: number) {
  if (depth === 0) return Globe;
  if (depth === 1) return Landmark;
  if (depth === 2) return Shield;
  if (depth === 3) return Building2;
  if (depth === 4) return School;
  return BookOpen;
}

function depthStyle(depth: number) {
  if (depth === 0) return { bg: 'rgba(234,179,8,0.15)',  color: '#eab308' };
  if (depth === 1) return { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa' };
  if (depth === 2) return { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' };
  if (depth === 3) return { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' };
  if (depth === 4) return { bg: 'rgba(52,211,153,0.12)', color: '#34d399' };
  return { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8' };
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// ─── Build tree from flat data ────────────────────────────────────────────────

function buildTree(sectors: DemoSector[], users: DemoUser[]): SectorNode[] {
  const usersBySector = new Map<number, DemoUser[]>();
  for (const u of users) {
    if (u.sectorId != null) {
      const arr = usersBySector.get(u.sectorId) ?? [];
      arr.push(u);
      usersBySector.set(u.sectorId, arr);
    }
  }

  const nodeMap = new Map<number, SectorNode>();
  for (const s of sectors) {
    nodeMap.set(s.id, { sector: s, users: usersBySector.get(s.id) ?? [], children: [] });
  }

  const roots: SectorNode[] = [];
  for (const s of sectors) {
    const node = nodeMap.get(s.id)!;
    if (s.parentId != null && nodeMap.has(s.parentId)) {
      nodeMap.get(s.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// ─── Filter tree by search ────────────────────────────────────────────────────

function treeMatchesSearch(node: SectorNode, query: string): boolean {
  const q = query.toLowerCase();
  if (node.sector.name.toLowerCase().includes(q) || node.sector.code.toLowerCase().includes(q)) return true;
  if (node.users.some(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return true;
  return node.children.some(c => treeMatchesSearch(c, q));
}

function filterTree(nodes: SectorNode[], query: string): SectorNode[] {
  if (!query) return nodes;
  return nodes.filter(n => treeMatchesSearch(n, query)).map(n => ({
    ...n,
    children: filterTree(n.children, query),
  }));
}

// ─── Sector Tree Node ─────────────────────────────────────────────────────────

function SectorTreeNode({
  node,
  onSelect,
  loading,
  searchQuery,
  defaultOpen,
}: {
  node: SectorNode;
  onSelect: (user: DemoUser) => void;
  loading: string | null;
  searchQuery: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasContent = node.children.length > 0 || node.users.length > 0;
  const Icon = depthIcon(node.sector.depth);
  const style = depthStyle(node.sector.depth);
  const totalUsers = countUsers(node);

  // Auto-expand when searching
  useEffect(() => {
    if (searchQuery && treeMatchesSearch(node, searchQuery)) {
      setOpen(true);
    }
  }, [searchQuery, node]);

  return (
    <div>
      <button
        onClick={() => hasContent && setOpen(o => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${hasContent ? 'cursor-pointer hover:bg-white/5' : 'cursor-default opacity-50'}`}
      >
        {hasContent ? (
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight size={12} className="text-white/30 shrink-0" />
          </motion.div>
        ) : (
          <div className="w-3 shrink-0" />
        )}

        <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center" style={{ background: style.bg }}>
          <Icon size={12} style={{ color: style.color }} />
        </div>

        <span className="text-white/60 text-[11px] font-semibold truncate flex-1">{node.sector.name}</span>
        <span className="text-[9px] text-white/20 font-mono shrink-0">{node.sector.code}</span>
        <span className="text-[9px] text-white/15 shrink-0 ml-1">{totalUsers} user{totalUsers !== 1 ? 's' : ''}</span>
      </button>

      <AnimatePresence>
        {open && hasContent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pt-0.5 pb-1 ml-4 pl-3 border-l border-white/7">
              {/* Users in this sector */}
              {node.users.map(user => (
                <UserButton key={user.id} user={user} onSelect={onSelect} loading={loading} />
              ))}
              {/* Child sectors */}
              {node.children.map(child => (
                <SectorTreeNode
                  key={child.sector.id}
                  node={child}
                  onSelect={onSelect}
                  loading={loading}
                  searchQuery={searchQuery}
                  defaultOpen={node.sector.depth < 1 || !!searchQuery}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function countUsers(node: SectorNode): number {
  return node.users.length + node.children.reduce((s, c) => s + countUsers(c), 0);
}

// ─── User Button ──────────────────────────────────────────────────────────────

function UserButton({ user, onSelect, loading }: { user: DemoUser; onSelect: (u: DemoUser) => void; loading: string | null }) {
  const meta = ROLE_META[user.role];
  const isLoading = loading === user.email;

  return (
    <motion.button
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15 }}
      onClick={() => onSelect(user)}
      disabled={!!loading}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all group disabled:opacity-60 hover:bg-white/5"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div
        className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
      >
        {isLoading ? <LoadingSpinner size={12} className="p-0" style={{ color: meta.color }} /> : initials(user.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white/80 text-[11px] font-semibold truncate group-hover:text-white transition-colors">{user.name}</p>
        <p className="text-white/25 text-[9px] font-mono truncate">{user.email}</p>
      </div>
      <span
        className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
        style={{ color: meta.color, background: meta.bg }}
      >
        {meta.label}
      </span>
      <LogIn size={11} className="shrink-0 text-white/15 group-hover:text-white/50 transition-colors" />
    </motion.button>
  );
}

// ─── Ambient Orb ──────────────────────────────────────────────────────────────

function Orb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color, filter: 'blur(80px)' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

// ─── Features list ────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: BarChart3, title: 'Real-time Budget Tracking', desc: 'Live utilization metrics across all institutions and departments.' },
  { icon: GitBranch, title: 'Hierarchical Allocation', desc: 'Multi-level budget flows from National Government down to sub-departments.' },
  { icon: Users, title: 'Role-based Access Control', desc: 'Scoped views — each level sees only downward, never upward.' },
  { icon: Zap, title: 'Procurement & Catalog', desc: 'Purchase orders linked to budget allocations in real time.' },
];

// ─── Ministry filter dropdown ─────────────────────────────────────────────────

function MinistryFilter({
  ministries,
  selected,
  onSelect,
}: {
  ministries: DemoSector[];
  selected: number | null;
  onSelect: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedName = selected ? ministries.find(m => m.id === selected)?.name ?? 'All Ministries' : 'All Ministries';

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-white/50 hover:text-white/70 border border-white/10 hover:border-white/20 transition-all bg-white/3"
      >
        <Filter size={11} />
        <span className="truncate max-w-[140px]">{selectedName}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1 z-50 rounded-lg overflow-hidden max-h-60 overflow-y-auto"
            style={{ background: 'rgba(10,18,40,0.98)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 200 }}
          >
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[11px] hover:bg-white/5 transition-colors ${!selected ? 'text-blue-400' : 'text-white/50'}`}
            >
              All Ministries
            </button>
            {ministries.map(m => (
              <button
                key={m.id}
                onClick={() => { onSelect(m.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[11px] hover:bg-white/5 transition-colors truncate ${selected === m.id ? 'text-blue-400' : 'text-white/50'}`}
              >
                {m.name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'signin' | 'quick';

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('quick');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [ministryFilter, setMinistryFilter] = useState<number | null>(null);

  // Fetch demo users from API
  const [demoData, setDemoData] = useState<{ users: DemoUser[]; sectors: DemoSector[] } | null>(null);
  const [fetchLoading, setFetchLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/demo-users')
      .then(res => res.json())
      .then(data => setDemoData(data))
      .catch(() => setDemoData({ users: [], sectors: [] }))
      .finally(() => setFetchLoading(false));
  }, []);

  const tree = useMemo(() => {
    if (!demoData) return [];
    return buildTree(demoData.sectors, demoData.users);
  }, [demoData]);

  // Filter by ministry (depth=1 sectors)
  const ministries = useMemo(() => {
    if (!demoData) return [];
    return demoData.sectors.filter(s => s.depth === 1);
  }, [demoData]);

  const filteredTree = useMemo(() => {
    let nodes = tree;
    if (ministryFilter != null) {
      // Show only the selected ministry subtree
      function findNode(nodes: SectorNode[], id: number): SectorNode | null {
        for (const n of nodes) {
          if (n.sector.id === id) return n;
          const found = findNode(n.children, id);
          if (found) return found;
        }
        return null;
      }
      const ministry = findNode(tree, ministryFilter);
      nodes = ministry ? [ministry] : [];
    }
    return filterTree(nodes, search);
  }, [tree, ministryFilter, search]);

  const totalUsers = demoData?.users.length ?? 0;
  const totalSectors = demoData?.sectors.length ?? 0;

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation('/');
      },
      onSettled: () => setQuickLoading(null),
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  const handleQuickLogin = (user: DemoUser) => {
    setQuickLoading(user.email);
    loginMutation.mutate({ data: { email: user.email, password: 'password' } });
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#060b18 0%,#0a1020 50%,#060d1f 100%)' }}>

      {/* Ambient orbs */}
      <Orb x="-10%" y="10%" size={500} color="rgba(59,130,246,0.22)" delay={0} />
      <Orb x="60%" y="55%" size={450} color="rgba(99,102,241,0.18)" delay={2} />
      <Orb x="20%" y="65%" size={350} color="rgba(16,185,129,0.12)" delay={4} />
      <Orb x="80%" y="-5%" size={320} color="rgba(59,130,246,0.15)" delay={1} />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      {/* LEFT BRAND PANEL */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-[48%] p-14 relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">Budget Monitor</p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">Republic of Kenya</p>
          </div>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.6 }}>
            <h1 className="text-5xl font-extrabold leading-[1.15] tracking-tight">
              <span className="text-white">National</span>
              <br />
              <span style={{ background: 'linear-gradient(90deg,#3b82f6,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Budget Control
              </span>
              <br />
              <span className="text-white">Platform</span>
            </h1>
            <p className="text-white/40 text-base mt-4 leading-relaxed max-w-sm">
              Transparent allocation, real-time monitoring and hierarchical oversight for Kenya's government institutions.
            </p>
          </motion.div>

          <motion.div className="space-y-4 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.6 }}>
            {FEATURES.map(({ icon: FIcon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                className="flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border border-white/10" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <FIcon size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-semibold">{title}</p>
                  <p className="text-white/30 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-white/20 text-xs tracking-wider">REPUBLIC OF KENYA · FY 2025/26</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </motion.div>

      {/* RIGHT PANEL */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10"
      >
        <div className="w-full max-w-md space-y-5">

          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
              <Shield size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Budget Monitor</h1>
            <p className="text-white/40 text-sm">National Budget Control Platform</p>
          </div>

          {/* Card */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.7), rgba(59,130,246,0.7), transparent)' }} />

            {/* Tabs */}
            <div className="flex border-b border-white/8">
              {([
                { id: 'quick' as Tab, label: 'Quick Login', icon: Users },
                { id: 'signin' as Tab, label: 'Email Sign In', icon: Mail },
              ]).map(({ id, label, icon: TIcon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all relative ${tab === id ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                >
                  <TIcon size={13} />
                  {label}
                  {tab === id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full"
                      style={{ background: 'linear-gradient(90deg,#3b82f6,#6366f1)' }}
                    />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">

              {/* QUICK LOGIN TAB */}
              {tab === 'quick' && (
                <motion.div
                  key="quick"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="p-5"
                >
                  {/* Stats bar */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20">
                      <Users size={10} className="text-blue-400" />
                      <span className="text-[10px] text-blue-400 font-bold">{totalUsers.toLocaleString()} users</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                      <Building2 size={10} className="text-indigo-400" />
                      <span className="text-[10px] text-indigo-400 font-bold">{totalSectors.toLocaleString()} sectors</span>
                    </div>
                  </div>

                  {/* Search + Filter */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                      <input
                        type="text"
                        placeholder="Search users, sectors, codes..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg text-[11px] text-white bg-white/5 border border-white/10 placeholder:text-white/20 focus:border-blue-500/40 focus:outline-none"
                      />
                    </div>
                    <MinistryFilter ministries={ministries} selected={ministryFilter} onSelect={setMinistryFilter} />
                  </div>

                  <p className="text-white/30 text-[10px] mb-3 text-center">
                    Browse the hierarchy and click any user to sign in. Password: <span className="font-mono text-white/40">password</span>
                  </p>

                  {/* Error */}
                  <AnimatePresence>
                    {loginMutation.isError && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 mb-3"
                      >
                        <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                        <p className="text-rose-400 text-xs">Login failed. Please try again.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tree */}
                  <div className="space-y-0.5 max-h-[420px] overflow-y-auto pr-1 custom-scroll">
                    {fetchLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <LoadingSpinner size={24} />
                        <span className="text-white/30 text-xs ml-3">Loading users...</span>
                      </div>
                    ) : filteredTree.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-white/20 text-xs">No users match your search.</p>
                      </div>
                    ) : (
                      filteredTree.map(node => (
                        <SectorTreeNode
                          key={node.sector.id}
                          node={node}
                          onSelect={handleQuickLogin}
                          loading={quickLoading}
                          searchQuery={search}
                          defaultOpen={node.sector.depth === 0}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {/* EMAIL SIGN IN TAB */}
              {tab === 'signin' && (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="p-6 space-y-5"
                >
                  <div className="text-center">
                    <h2 className="text-white font-bold text-lg">Sign In</h2>
                    <p className="text-white/30 text-xs mt-1">Enter your credentials to access the portal</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-white/50 text-xs font-semibold uppercase tracking-wider">Email Address</Label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          placeholder="you@agency.go.ke"
                          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-white/50 text-xs font-semibold uppercase tracking-wider">Password</Label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
                        <Input
                          id="password"
                          type={showPw ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-blue-500/50 focus:ring-blue-500/20"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                        >
                          {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {loginMutation.isError && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10"
                        >
                          <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                          <p className="text-rose-400 text-xs">Invalid credentials. Please try again.</p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <motion.button
                      type="submit"
                      disabled={loginMutation.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow: '0 4px 20px rgba(59,130,246,0.3)' }}
                      whileHover={{ scale: 1.02, boxShadow: '0 8px 28px rgba(59,130,246,0.4)' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {loginMutation.isPending ? <LoadingSpinner size={16} className="p-0" /> : <LogIn size={16} />}
                      {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
                    </motion.button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
