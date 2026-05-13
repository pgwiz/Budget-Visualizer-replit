import { useState, useEffect, useMemo } from 'react';
import { Globe, Landmark, Shield, Building2, School, BookOpen, ChevronRight, ChevronDown, LogIn, Search, Filter, Mail, Zap, GitBranch, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogin } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLocation } from 'wouter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLock, faEnvelope, faEye, faEyeSlash, faChartPie,
  faBuilding, faUsers, faShieldAlt, faCheckCircle, faCrown,
  faArrowRight, faChartBar
} from '@fortawesome/free-solid-svg-icons';
import { queryClient } from '@/lib/api';
import { getGetMeQueryKey } from '@workspace/api-client-react';

import budgettingSvg from '../assets /PNG/4 - BUDGETTING.svg';
import economyAnalysisSvg from '../assets /PNG/9 - ECONOMY ANALYSIS.svg';
import financesSvg from '../assets /PNG/6 - FINANCES.svg';
import bankDealSvg from '../assets /PNG/7 - BANK DEAL.svg';

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
  if (!name) return '?';
  const parts = name.split(' ').filter(Boolean);
  const sliced = parts.slice(0, 2);
  const mapped = sliced.map(w => w[0]);
  return mapped.join('').toUpperCase();
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
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${hasContent ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default opacity-50'}`}
      >
        {hasContent ? (
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.15 }}>
            <ChevronRight size={12} className="text-slate-400 shrink-0" />
          </motion.div>
        ) : (
          <div className="w-3 shrink-0" />
        )}

        <div className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center" style={{ background: style.bg }}>
          <Icon size={12} style={{ color: style.color }} />
        </div>

        <span className="text-slate-600 text-[11px] font-semibold truncate flex-1">{node.sector.name}</span>
        <span className="text-[9px] text-slate-300 font-mono shrink-0">{node.sector.code}</span>
        <span className="text-[9px] text-slate-300 shrink-0 ml-1">{totalUsers} user{totalUsers !== 1 ? 's' : ''}</span>
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
            <div className="space-y-0.5 pt-0.5 pb-1 ml-4 pl-3 border-l border-slate-100">
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
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all group disabled:opacity-60 hover:bg-slate-50"
      style={{ background: 'rgba(248,250,252,1)', border: '1px solid rgba(226,232,240,1)' }}
    >
      <div
        className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold"
        style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
      >
        {isLoading ? <LoadingSpinner size={12} className="p-0" style={{ color: meta.color }} /> : initials(user.name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 text-[11px] font-semibold truncate group-hover:text-slate-900 transition-colors">{user.name}</p>
        <p className="text-slate-400 text-[9px] font-mono truncate">{user.email}</p>
      </div>
      <span
        className="shrink-0 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
        style={{ color: meta.color, background: meta.bg }}
      >
        {meta.label}
      </span>
      <LogIn size={11} className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
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
  { icon: faChartBar, title: 'Real-time Budget Tracking', desc: 'Live utilization metrics across all institutions and departments.' },
  { icon: GitBranch, title: 'Hierarchical Allocation', desc: 'Multi-level budget flows from National Government down to sub-departments.' },
  { icon: faUsers, title: 'Role-based Access Control', desc: 'Scoped views — each level sees only downward, never upward.' },
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
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-slate-500 hover:text-slate-900/70 border border-slate-200 hover:border-slate-300 transition-all bg-slate-50"
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
            style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 200 }}
          >
            <button
              onClick={() => { onSelect(null); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50 transition-colors ${!selected ? 'text-blue-400' : 'text-slate-500'}`}
            >
              All Ministries
            </button>
            {ministries.map(m => (
              <button
                key={m.id}
                onClick={() => { onSelect(m.id); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50 transition-colors truncate ${selected === m.id ? 'text-blue-400' : 'text-slate-500'}`}
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
  const [tab, setTab] = useState<Tab>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [ministryFilter, setMinistryFilter] = useState<number | null>(null);

  // Fetch demo users from API
  const [demoData, setDemoData] = useState<{ users: DemoUser[]; sectors: DemoSector[] } | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);

  useEffect(() => {
    if (demoData) return;

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);
    setFetchLoading(true);

    fetch('/api/auth/demo-users', { signal: controller.signal })
      .then(res => res.json())
      .then((data: any) => {
        // New format: flat array of { id, name, email, role, sectorId, sectorName, sectorCode, password }
        // Old format: { users: [...], sectors: [...] }
        if (Array.isArray(data)) {
          const users = data.map((u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, sectorId: u.sectorId }));
          const sectors = data
            .filter((u: any) => u.sectorId)
            .map((u: any) => ({ id: u.sectorId, name: u.sectorName ?? u.sectorCode ?? 'Unknown', code: u.sectorCode ?? '', parentId: null, depth: 0 }));
          setDemoData({ users, sectors });
        } else {
          setDemoData(data);
        }
      })
      .catch(() => setDemoData({ users: [], sectors: [] }))
      .finally(() => {
        window.clearTimeout(timeoutId);
        setFetchLoading(false);
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [tab, demoData]);

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
        // Set auth cache with user data from login response
        // Don't invalidate - the login response IS our auth state
        queryClient.setQueryData(getGetMeQueryKey(), data.user);
        // Small delay ensures Set-Cookie is processed before navigation
        setTimeout(() => setLocation('/'), 100);
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
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* TOP SECTION: Split Layout */}
      <div className="min-h-screen flex flex-col lg:flex-row relative">
        
        {/* LEFT SIDE: Form */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-24 py-12 relative z-10 bg-slate-50">
          <div className="absolute inset-0 pointer-events-none opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

          <div className="w-full max-w-md mx-auto relative z-10 pt-8 pb-16">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-10 text-center space-y-3">
               <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-600/20">
                  <FontAwesomeIcon icon={faShieldAlt} className="text-2xl text-white" />
               </div>
               <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Budget Monitor</h1>
               <p className="text-slate-500 text-sm font-medium">National Budget Control Platform</p>
            </motion.div>

            {/* Email Form */}
            <motion.form 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
              onSubmit={handleSubmit} 
              className="space-y-5"
            >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 text-xs font-bold uppercase tracking-wider">Email Address</Label>
                <div className="relative">
                  <FontAwesomeIcon icon={faEnvelope} className="text-base absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@agency.go.ke"
                    className="pl-10 py-5 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 text-xs font-bold uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <FontAwesomeIcon icon={faLock} className="text-base absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10 py-5 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20 rounded-xl shadow-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(p => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <FontAwesomeIcon icon={faEyeSlash} /> : <FontAwesomeIcon icon={faEye} />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                {loginMutation.isPending ? <LoadingSpinner size={18} className="p-0 text-white" /> : <LogIn size={18} />}
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </motion.button>
            </motion.form>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="relative my-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-3 bg-slate-50 text-slate-500 font-bold text-[10px] tracking-wider uppercase">Or quick login as</span></div>
            </motion.div>

            {/* Quick Login Section */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users, sectors..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs text-slate-900 bg-white border border-slate-200 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all shadow-sm"
                  />
                </div>
                <MinistryFilter ministries={ministries} selected={ministryFilter} onSelect={setMinistryFilter} />
              </div>

              <div className="space-y-1 max-h-[220px] overflow-y-auto pr-2 custom-scroll bg-white/50 backdrop-blur-sm p-3 rounded-xl border border-slate-200/60 shadow-sm">
                {fetchLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <LoadingSpinner size={24} className="text-blue-600" />
                    <span className="text-slate-500 text-xs font-medium">Loading users...</span>
                  </div>
                ) : filteredTree.map(node => (
                  <SectorTreeNode
                    key={node.sector.id}
                    node={node}
                    onSelect={handleQuickLogin}
                    loading={quickLoading}
                    searchQuery={search}
                    defaultOpen={node.sector.depth === 0}
                  />
                ))}
              </div>
            </motion.div>
          </div>

          {/* Scroll down indicator */}
          <motion.div 
            animate={{ y: [0, 8, 0] }} 
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2 text-slate-400 flex flex-col items-center gap-2 hidden sm:flex"
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">Discover Features</span>
            <ChevronDown size={16} />
          </motion.div>
        </div>

        {/* RIGHT SIDE: Illustration */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative overflow-hidden" style={{ backgroundColor: '#003049' }}>
           {/* Subtle background decoration */}
           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
           
           {/* Glow */}
           <div className="absolute -right-32 -top-32 w-96 h-96 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)' }} />

           <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.2 }} className="relative z-10 max-w-lg text-center flex flex-col items-center">
              <img src={budgettingSvg} alt="Budgeting Platform" className="w-full h-auto mb-10 max-w-md drop-shadow-2xl" />
              <h2 className="text-3xl font-extrabold text-white mb-4 leading-tight">Complete Financial Oversight</h2>
              <p className="text-blue-100 text-lg leading-relaxed opacity-90">
                Track, allocate, and monitor budgets across all government departments with real-time analytics and scoped role-based access control.
              </p>
           </motion.div>
        </div>

      </div>

      {/* BOTTOM SECTION: Features */}
      <div className="py-32 bg-white relative">
        <div className="max-w-6xl mx-auto px-6 space-y-40">
           
           {/* Feature 1 */}
           <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
              <div className="flex-1 space-y-6">
                 <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">Real-time Budget Tracking</h3>
                 <p className="text-lg text-slate-600 leading-relaxed">
                   Experience full transparency with our live dashboard. Teacup monitors budget utilization across all institutions and departments, giving you the real-time metrics needed to make confident decisions without the guesswork.
                 </p>
                 <button className="text-blue-600 font-bold text-sm tracking-wide uppercase hover:text-blue-700 flex items-center gap-2">
                    See how it works <ChevronRight size={16} />
                 </button>
              </div>
              <div className="flex-1 w-full flex justify-center">
                 <img src={budgettingSvg} alt="Real-time Budget Tracking" className="w-full max-w-lg" />
              </div>
           </div>

           {/* Feature 2 */}
           <div className="flex flex-col md:flex-row-reverse items-center gap-16 md:gap-24">
              <div className="flex-1 space-y-6">
                 <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">Hierarchical Allocation</h3>
                 <p className="text-lg text-slate-600 leading-relaxed">
                   Streamline budget flows seamlessly from the National Government down to specific sub-departments. Allocate funds intuitively and instantly, ensuring resources always reach their intended destination.
                 </p>
                 <button className="text-blue-600 font-bold text-sm tracking-wide uppercase hover:text-blue-700 flex items-center gap-2">
                    Let's get started <ChevronRight size={16} />
                 </button>
              </div>
              <div className="flex-1 w-full flex justify-center">
                 <img src={economyAnalysisSvg} alt="Hierarchical Allocation" className="w-full max-w-lg" />
              </div>
           </div>

           {/* Feature 3 */}
           <div className="flex flex-col md:flex-row items-center gap-16 md:gap-24">
              <div className="flex-1 space-y-6">
                 <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">Role-based Access Control</h3>
                 <p className="text-lg text-slate-600 leading-relaxed">
                   Security and privacy are paramount. Implement strict scoped views—every organizational level sees only their downwards allocation, never upward, keeping sensitive financial data safe.
                 </p>
                 <button className="text-blue-600 font-bold text-sm tracking-wide uppercase hover:text-blue-700 flex items-center gap-2">
                    Let's get started <ChevronRight size={16} />
                 </button>
              </div>
              <div className="flex-1 w-full flex justify-center">
                 <img src={financesSvg} alt="Role-based Access Control" className="w-full max-w-lg" />
              </div>
           </div>

           {/* Feature 4 */}
           <div className="flex flex-col md:flex-row-reverse items-center gap-16 md:gap-24">
              <div className="flex-1 space-y-6">
                 <h3 className="text-4xl font-extrabold text-slate-900 tracking-tight">Procurement & Catalog</h3>
                 <p className="text-lg text-slate-600 leading-relaxed">
                   Link your purchase orders directly to budget allocations in real-time. Keep your financial workflows fresh and targeted, maintaining complete transparency from initial requisition to final payout.
                 </p>
                 <button className="text-blue-600 font-bold text-sm tracking-wide uppercase hover:text-blue-700 flex items-center gap-2">
                    Let's get started <ChevronRight size={16} />
                 </button>
              </div>
              <div className="flex-1 w-full flex justify-center">
                 <img src={bankDealSvg} alt="Procurement & Catalog" className="w-full max-w-lg" />
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
