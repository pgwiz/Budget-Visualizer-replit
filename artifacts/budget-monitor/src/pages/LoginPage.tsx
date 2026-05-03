import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogin } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLocation } from 'wouter';
import {
  Mail, Lock, Eye, EyeOff, Shield, BarChart3, GitBranch,
  Users, AlertTriangle, ChevronRight, Building2, School,
  BookOpen, Zap, LogIn, Landmark,
} from 'lucide-react';
import { queryClient } from '@/lib/api';
import { getGetMeQueryKey } from '@workspace/api-client-react';

// ─── Org hierarchy data ───────────────────────────────────────────────────────

type Role = 'super_admin' | 'ceo' | 'ministry_head' | 'department_head' | 'viewer';

interface OrgUser {
  name: string;
  email: string;
  role: Role;
  initials: string;
}

interface OrgNode {
  id: string;
  label: string;
  icon: 'ministry' | 'authority' | 'institution' | 'school' | 'department';
  user?: OrgUser;
  children?: OrgNode[];
}

const ROLE_META: Record<Role, { label: string; color: string; bg: string }> = {
  super_admin:     { label: 'Sys Admin',  color: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  ceo:             { label: 'CEO / DG',   color: '#fbbf24', bg: 'rgba(251,191,36,0.12)'  },
  ministry_head:   { label: 'Principal',  color: '#60a5fa', bg: 'rgba(96,165,250,0.12)'  },
  department_head: { label: 'HOD',        color: '#34d399', bg: 'rgba(52,211,153,0.12)'  },
  viewer:          { label: 'Auditor',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
};

const ORG_TREE: OrgNode[] = [
  {
    id: 'moe',
    label: 'Ministry of Education',
    icon: 'ministry',
    children: [
      {
        id: 'cs-moe',
        label: 'Cabinet Secretary, Ministry of Education',
        icon: 'ministry',
        user: { name: 'Cabinet Secretary, Ministry of Education', email: 'ceo@budget.go.ke', role: 'ceo', initials: 'CS' },
      },
      {
        id: 'tvet-authority',
        label: 'TVET Authority',
        icon: 'authority',
        children: [
          {
            id: 'admin',
            label: 'System Administrator',
            icon: 'authority',
            user: { name: 'System Administrator', email: 'admin@tvetauthority.go.ke', role: 'super_admin', initials: 'SA' },
          },
          {
            id: 'dg',
            label: 'Dr. James Kiprotich Mutai',
            icon: 'authority',
            user: { name: 'Dr. James Kiprotich Mutai', email: 'dg@tvetauthority.go.ke', role: 'ceo', initials: 'JM' },
          },
          {
            id: 'auditor',
            label: 'Mr. Joseph Mwangi Gicheru',
            icon: 'authority',
            user: { name: 'Mr. Joseph Mwangi Gicheru', email: 'auditor@tvetauthority.go.ke', role: 'viewer', initials: 'JG' },
          },
          {
            id: 'tonp',
            label: 'The Ollessos National Polytechnic',
            icon: 'institution',
            children: [
              {
                id: 'tonp-principal',
                label: 'Dr. Grace Wanjiku Njoroge',
                icon: 'institution',
                user: { name: 'Dr. Grace Wanjiku Njoroge', email: 'principal@tonp.ac.ke', role: 'ministry_head', initials: 'GN' },
              },
              {
                id: 'tonp-eng',
                label: 'School of Engineering & Technology',
                icon: 'school',
                children: [
                  { id: 'hod-eng-tonp', label: 'Eng. Peter Kamau Njeru', icon: 'department', user: { name: 'Eng. Peter Kamau Njeru', email: 'hod.engineering@tonp.ac.ke', role: 'department_head', initials: 'PN' } },
                ],
              },
              {
                id: 'tonp-bus',
                label: 'School of Business & Management',
                icon: 'school',
                children: [
                  { id: 'hod-bus-tonp', label: 'Ms. Faith Akinyi Odhiambo', icon: 'department', user: { name: 'Ms. Faith Akinyi Odhiambo', email: 'hod.business@tonp.ac.ke', role: 'department_head', initials: 'FO' } },
                ],
              },
              {
                id: 'tonp-ict',
                label: 'School of ICT & Computing',
                icon: 'school',
                children: [
                  { id: 'hod-ict-tonp', label: 'Mr. Brian Kipchoge Rono', icon: 'department', user: { name: 'Mr. Brian Kipchoge Rono', email: 'hod.ict@tonp.ac.ke', role: 'department_head', initials: 'BR' } },
                ],
              },
              {
                id: 'tonp-sci',
                label: 'School of Applied Sciences & Health',
                icon: 'school',
                children: [
                  { id: 'hod-sci-tonp', label: 'Dr. Lydia Muthoni Kariuki', icon: 'department', user: { name: 'Dr. Lydia Muthoni Kariuki', email: 'hod.sciences@tonp.ac.ke', role: 'department_head', initials: 'LK' } },
                ],
              },
            ],
          },
          {
            id: 'kibt',
            label: 'Kenya Institute of Business Training',
            icon: 'institution',
            children: [
              {
                id: 'kibt-principal',
                label: 'Mr. Samuel Omondi Otieno',
                icon: 'institution',
                user: { name: 'Mr. Samuel Omondi Otieno', email: 'principal@kibt.ac.ke', role: 'ministry_head', initials: 'SO' },
              },
              {
                id: 'kibt-bus',
                label: 'School of Business Studies',
                icon: 'school',
                children: [
                  { id: 'hod-bus-kibt', label: 'Ms. Alice Chepkemoi Koech', icon: 'department', user: { name: 'Ms. Alice Chepkemoi Koech', email: 'hod.engineering@kibt.ac.ke', role: 'department_head', initials: 'AK' } },
                ],
              },
              { id: 'kibt-sec', label: 'School of Secretarial & Office Mgmt', icon: 'school', children: [] },
            ],
          },
          {
            id: 'rvist',
            label: 'Rift Valley Institute of Science & Technology',
            icon: 'institution',
            children: [
              {
                id: 'rvist-principal',
                label: 'Mrs. Beatrice Cherop Sang',
                icon: 'institution',
                user: { name: 'Mrs. Beatrice Cherop Sang', email: 'principal@rvist.ac.ke', role: 'ministry_head', initials: 'BS' },
              },
              { id: 'rvist-eng', label: 'School of Engineering', icon: 'school', children: [] },
              {
                id: 'rvist-com',
                label: 'School of Commerce & Business',
                icon: 'school',
                children: [
                  { id: 'hod-com-rvist', label: 'Mr. Dennis Otieno Ochieng', icon: 'department', user: { name: 'Mr. Dennis Otieno Ochieng', email: 'hod.commerce@rvist.ac.ke', role: 'department_head', initials: 'DO' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const NODE_ICONS: Record<OrgNode['icon'], typeof Building2> = {
  ministry:    Landmark,
  authority:   Shield,
  institution: Building2,
  school:      School,
  department:  BookOpen,
};

// ─── Tree Node Component ───────────────────────────────────────────────────────

function TreeNode({
  node,
  depth,
  onSelect,
  loading,
}: {
  node: OrgNode;
  depth: number;
  onSelect: (user: OrgUser) => void;
  loading: string | null;
}) {
  const [open, setOpen] = useState(depth === 0);
  const hasChildren = node.children && node.children.length > 0;
  const Icon = NODE_ICONS[node.icon];
  const isUser = !!node.user;
  const roleMeta = isUser ? ROLE_META[node.user!.role] : null;
  const isLoading = isUser && loading === node.user!.email;

  const indentPx = depth * 16;

  if (isUser) {
    return (
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
        onClick={() => onSelect(node.user!)}
        disabled={!!loading}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group disabled:opacity-60"
        style={{ marginLeft: indentPx, width: `calc(100% - ${indentPx}px)`, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.07)' }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold"
          style={{ background: roleMeta!.bg, color: roleMeta!.color, border: `1px solid ${roleMeta!.color}30` }}
        >
          {isLoading ? <LoadingSpinner size={14} className="p-0" style={{ color: roleMeta!.color }} /> : node.user!.initials}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <p className="text-white/80 text-[12px] font-semibold truncate group-hover:text-white transition-colors">{node.user!.name}</p>
          <p className="text-white/30 text-[10px] font-mono truncate">{node.user!.email}</p>
        </div>

        {/* Role badge */}
        <span
          className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md"
          style={{ color: roleMeta!.color, background: roleMeta!.bg }}
        >
          {roleMeta!.label}
        </span>

        {/* Arrow */}
        <LogIn size={12} className="shrink-0 text-white/20 group-hover:text-white/60 transition-colors" />
      </motion.button>
    );
  }

  return (
    <div>
      <button
        onClick={() => hasChildren && setOpen((o) => !o)}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all ${hasChildren ? 'cursor-pointer hover:bg-white/5' : 'cursor-default opacity-50'}`}
        style={{ marginLeft: indentPx, width: `calc(100% - ${indentPx}px)` }}
      >
        {hasChildren && (
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }}>
            <ChevronRight size={12} className="text-white/30 shrink-0" />
          </motion.div>
        )}
        {!hasChildren && <div className="w-3 shrink-0" />}

        <div
          className="w-6 h-6 rounded-md shrink-0 flex items-center justify-center"
          style={{ background: depth === 0 ? 'rgba(99,102,241,0.15)' : depth === 1 ? 'rgba(59,130,246,0.12)' : 'rgba(52,211,153,0.1)' }}
        >
          <Icon
            size={12}
            style={{ color: depth === 0 ? '#818cf8' : depth === 1 ? '#60a5fa' : '#34d399' }}
          />
        </div>

        <span className="text-white/60 text-[11px] font-semibold truncate flex-1">{node.label}</span>
        {!hasChildren && node.children !== undefined && (
          <span className="text-white/20 text-[9px] italic">no accounts</span>
        )}
      </button>

      <AnimatePresence>
        {open && hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-1 pt-1 pb-1" style={{ marginLeft: indentPx + 4, paddingLeft: 8, borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
              {node.children!.map((child) => (
                <TreeNode key={child.id} node={child} depth={0} onSelect={onSelect} loading={loading} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  { icon: BarChart3,  title: 'Real-time Budget Tracking',   desc: 'Live utilization metrics across all institutions and departments.' },
  { icon: GitBranch, title: 'Hierarchical Allocation',      desc: 'Multi-level budget flows from TVET Pool down to sub-departments.' },
  { icon: Users,     title: 'Role-based Access Control',    desc: 'Scoped views for admins, principals, HODs, and auditors.' },
  { icon: Zap,       title: 'Procurement & Catalog',        desc: 'Purchase orders linked to budget allocations in real time.' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'signin' | 'quick';

export default function LoginPage() {
  const [tab, setTab]           = useState<Tab>('quick');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);
  const [, setLocation]         = useLocation();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
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

  const handleQuickLogin = (user: OrgUser) => {
    setQuickLoading(user.email);
    loginMutation.mutate({ data: { email: user.email, password: 'password' } });
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#060b18 0%,#0a1020 50%,#060d1f 100%)' }}>

      {/* Ambient orbs */}
      <Orb x="-10%"  y="10%"  size={500} color="rgba(59,130,246,0.22)"  delay={0} />
      <Orb x="60%"   y="55%"  size={450} color="rgba(99,102,241,0.18)"  delay={2} />
      <Orb x="20%"   y="65%"  size={350} color="rgba(16,185,129,0.12)"  delay={4} />
      <Orb x="80%"   y="-5%"  size={320} color="rgba(59,130,246,0.15)"  delay={1} />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      {/* ══ LEFT BRAND PANEL ══ */}
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
            <p className="text-white font-bold text-base leading-none">TVET Budget Monitor</p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">Technical & Vocational Education</p>
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
              Transparent allocation, real-time monitoring and hierarchical oversight for Kenya's TVET institutions.
            </p>
          </motion.div>

          <motion.div className="space-y-4 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.6 }}>
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1, duration: 0.4 }}
                className="flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border border-white/10" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <Icon size={16} className="text-blue-400" />
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
          <p className="text-white/20 text-xs tracking-wider">THE OLLESSOS NATIONAL POLYTECHNIC · FY 2024/25</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </motion.div>

      {/* ══ RIGHT PANEL ══ */}
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
            <h1 className="text-3xl font-bold text-white">TVET Budget Monitor</h1>
            <p className="text-white/40 text-sm">National Budget Control Platform</p>
          </div>

          {/* ── Card ── */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Top accent line */}
            <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.7), rgba(59,130,246,0.7), transparent)' }} />

            {/* ── Tabs ── */}
            <div className="flex border-b border-white/8">
              {([
                { id: 'quick',  label: 'Quick Login',  icon: Users   },
                { id: 'signin', label: 'Email Sign In', icon: Mail },
              ] as { id: Tab; label: string; icon: typeof Users }[]).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider transition-all relative ${tab === id ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                >
                  <Icon size={13} />
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

              {/* ════════ QUICK LOGIN TAB ════════ */}
              {tab === 'quick' && (
                <motion.div
                  key="quick"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="p-5"
                >
                  {/* Institution summary chips */}
                  {(() => {
                    const CHIPS: { label: string; icon: OrgNode['icon']; accounts: number; indent?: boolean }[] = [
                      { label: 'Ministry of Education',                       icon: 'ministry',     accounts: 1 },
                      { label: 'TVET Authority',                              icon: 'authority',    accounts: 3, indent: true },
                      { label: 'The Ollessos National Polytechnic',           icon: 'institution',  accounts: 5, indent: true },
                      { label: 'Kenya Institute of Business Training',        icon: 'institution',  accounts: 2, indent: true },
                      { label: 'Rift Valley Institute of Science & Technology', icon: 'institution', accounts: 2, indent: true },
                    ];
                    const ICON_STYLE: Record<OrgNode['icon'], { bg: string; color: string; rowBg: string; rowBorder: string }> = {
                      ministry:    { bg: 'rgba(139,92,246,0.2)',  color: '#a78bfa', rowBg: 'rgba(139,92,246,0.06)', rowBorder: 'rgba(139,92,246,0.18)' },
                      authority:   { bg: 'rgba(99,102,241,0.2)', color: '#818cf8', rowBg: 'rgba(99,102,241,0.06)', rowBorder: 'rgba(99,102,241,0.14)' },
                      institution: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', rowBg: 'rgba(59,130,246,0.05)', rowBorder: 'rgba(59,130,246,0.12)' },
                      school:      { bg: 'rgba(52,211,153,0.15)', color: '#34d399', rowBg: 'rgba(52,211,153,0.05)', rowBorder: 'rgba(52,211,153,0.12)' },
                      department:  { bg: 'rgba(148,163,184,0.1)', color: '#94a3b8', rowBg: 'rgba(148,163,184,0.04)', rowBorder: 'rgba(148,163,184,0.1)' },
                    };
                    return (
                      <div className="flex flex-col gap-1 mb-3">
                        {CHIPS.map(chip => {
                          const Icon = NODE_ICONS[chip.icon];
                          const s = ICON_STYLE[chip.icon];
                          return (
                            <div
                              key={chip.label}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg"
                              style={{ marginLeft: chip.indent ? 12 : 0, background: s.rowBg, border: `1px solid ${s.rowBorder}` }}
                            >
                              {chip.indent && <div className="w-px h-3 bg-white/10 shrink-0" />}
                              <div className="w-5 h-5 rounded-md shrink-0 flex items-center justify-center" style={{ background: s.bg }}>
                                <Icon size={11} style={{ color: s.color }} />
                              </div>
                              <span className="text-white/60 text-[11px] font-semibold truncate">{chip.label}</span>
                              <span className="ml-auto shrink-0 text-[9px] text-white/20 font-mono">{chip.accounts} accounts</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <p className="text-white/30 text-[11px] mb-4 text-center">
                    Browse the institution hierarchy and click any account to sign in instantly.
                  </p>

                  {/* Error */}
                  <AnimatePresence>
                    {loginMutation.isError && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 mb-4"
                      >
                        <AlertTriangle size={13} className="text-rose-400 shrink-0" />
                        <p className="text-rose-400 text-xs">Login failed. Please try again.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Tree */}
                  <div className="space-y-1.5 max-h-[460px] overflow-y-auto pr-1 custom-scroll">
                    {ORG_TREE.map((node) => (
                      <TreeNode
                        key={node.id}
                        node={node}
                        depth={0}
                        onSelect={handleQuickLogin}
                        loading={quickLoading}
                      />
                    ))}
                  </div>

                  <p className="text-white/15 text-[10px] text-center mt-4">All demo accounts use password: <span className="font-mono text-white/25">password</span></p>
                </motion.div>
              )}

              {/* ════════ EMAIL SIGN IN TAB ════════ */}
              {tab === 'signin' && (
                <motion.div
                  key="signin"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22 }}
                  className="p-8 space-y-6"
                >
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-white">Welcome back</h2>
                    <p className="text-white/40 text-sm">Sign in with your credentials</p>
                  </div>

                  <AnimatePresence>
                    {loginMutation.isError && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.97 }}
                        className="flex items-start gap-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10"
                      >
                        <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-rose-400 text-sm">Invalid email or password. Please try again.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-white/50 text-xs uppercase tracking-wider font-semibold">Email Address</Label>
                      <div className="relative group">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-blue-400 transition-colors" />
                        <Input
                          id="email"
                          type="email"
                          autoComplete="email"
                          placeholder="user@tvetauthority.go.ke"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="pl-10 h-11 text-sm text-white placeholder:text-white/20 rounded-xl transition-all"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-white/50 text-xs uppercase tracking-wider font-semibold">Password</Label>
                      <div className="relative group">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-blue-400 transition-colors" />
                        <Input
                          id="password"
                          type={showPw ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="pl-10 pr-11 h-11 text-sm text-white placeholder:text-white/20 rounded-xl transition-all"
                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw((p) => !p)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                          tabIndex={-1}
                        >
                          {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    <motion.button
                      type="submit"
                      disabled={loginMutation.isPending}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      className="w-full h-11 rounded-xl font-semibold text-sm text-white relative overflow-hidden transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 24px rgba(59,130,246,0.35)' }}
                    >
                      {loginMutation.isPending ? (
                        <LoadingSpinner size={18} className="p-0 text-white" />
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Shield size={15} />
                          Sign In Securely
                        </span>
                      )}
                    </motion.button>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          <p className="text-center text-white/15 text-xs flex items-center justify-center gap-2">
            <Shield size={11} />
            Protected system. Authorized access only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
