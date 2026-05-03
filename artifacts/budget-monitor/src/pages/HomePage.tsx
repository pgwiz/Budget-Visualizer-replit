import { useEffect, useRef, useState } from 'react';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useGetDashboardSummary, useGetActiveCycle, useGetSectorBreakdown } from '@workspace/api-client-react';
import { formatCompact } from '@/lib/api';
import {
  LayoutDashboard, Network, ArrowLeftRight, FileText,
  Workflow, Users, ChevronRight, ShoppingCart, Package,
  ArrowRight, TrendingUp,
} from 'lucide-react';

/* ════════════════════════════════════════════════════════════════
   ANIMATED NETWORK GRAPH
   ════════════════════════════════════════════════════════════════ */
const NODES = [
  { id: 'pool',  x: 220, y: 70,  r: 24, label: 'National Pool', color: '#3b82f6', ring: '#60a5fa' },
  { id: 'm1',   x: 90,  y: 180, r: 18, label: 'Agriculture',   color: '#10b981', ring: '#34d399' },
  { id: 'm2',   x: 220, y: 190, r: 18, label: 'Education',     color: '#f59e0b', ring: '#fbbf24' },
  { id: 'm3',   x: 350, y: 180, r: 18, label: 'Health',        color: '#6366f1', ring: '#818cf8' },
  { id: 'd1',   x: 40,  y: 295, r: 12, label: 'Crops',         color: '#10b981', ring: '#34d399' },
  { id: 'd2',   x: 130, y: 295, r: 12, label: 'Livestock',     color: '#10b981', ring: '#34d399' },
  { id: 'd3',   x: 185, y: 295, r: 12, label: 'Primary',       color: '#f59e0b', ring: '#fbbf24' },
  { id: 'd4',   x: 260, y: 295, r: 12, label: 'Secondary',     color: '#f59e0b', ring: '#fbbf24' },
  { id: 'd5',   x: 320, y: 295, r: 12, label: 'Hospitals',     color: '#6366f1', ring: '#818cf8' },
  { id: 'd6',   x: 400, y: 295, r: 12, label: 'Clinics',       color: '#6366f1', ring: '#818cf8' },
];
const EDGES = [
  ['pool','m1'],['pool','m2'],['pool','m3'],
  ['m1','d1'],['m1','d2'],
  ['m2','d3'],['m2','d4'],
  ['m3','d5'],['m3','d6'],
];

function Particle({ x1,y1,x2,y2,color,delay }:{x1:number;y1:number;x2:number;y2:number;color:string;delay:number}) {
  return (
    <motion.circle
      r={3} fill={color} opacity={0.85}
      initial={{ cx: x1, cy: y1, opacity: 0 }}
      animate={{ cx: [x1, x2], cy: [y1, y2], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.8, delay, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
    />
  );
}

function NetworkGraph() {
  return (
    <svg viewBox="0 0 440 340" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 30px rgba(59,130,246,0.15))' }}>
      {/* Glow defs */}
      <defs>
        {NODES.map(n => (
          <filter key={n.id} id={`glow-${n.id}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        ))}
      </defs>

      {/* Edges */}
      {EDGES.map(([a, b], i) => {
        const na = NODES.find(n => n.id === a)!;
        const nb = NODES.find(n => n.id === b)!;
        return (
          <motion.line
            key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={nb.color} strokeWidth={1.5} strokeOpacity={0.3}
            strokeDasharray="4 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.1 }}
          />
        );
      })}

      {/* Particles flowing along edges */}
      {EDGES.map(([a, b], i) => {
        const na = NODES.find(n => n.id === a)!;
        const nb = NODES.find(n => n.id === b)!;
        return (
          <Particle key={`p-${i}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            color={nb.ring} delay={i * 0.5} />
        );
      })}

      {/* Nodes */}
      {NODES.map((n, i) => (
        <g key={n.id}>
          {/* Pulse ring */}
          <motion.circle cx={n.x} cy={n.y} r={n.r + 6}
            fill="none" stroke={n.ring} strokeWidth={1.5}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.5, delay: i * 0.25, repeat: Infinity, ease: 'easeInOut' }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
          {/* Node fill */}
          <motion.circle cx={n.x} cy={n.y} r={n.r}
            fill={n.color} fillOpacity={0.15}
            stroke={n.color} strokeWidth={2}
            filter={`url(#glow-${n.id})`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 + i * 0.1, type: 'spring', stiffness: 200 }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
          {/* Inner dot */}
          <motion.circle cx={n.x} cy={n.y} r={n.r * 0.35}
            fill={n.ring}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
            style={{ transformOrigin: `${n.x}px ${n.y}px` }}
          />
          {/* Label */}
          {n.r >= 18 && (
            <motion.text x={n.x} y={n.y + n.r + 14} textAnchor="middle"
              fill={n.ring} fontSize={9} fontWeight={600} opacity={0.85}
              initial={{ opacity: 0 }} animate={{ opacity: 0.85 }}
              transition={{ delay: 0.6 + i * 0.1 }}
            >
              {n.label}
            </motion.text>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   CORPORATE MEMPHIS / ALEGRIA SVG ILLUSTRATION
   ════════════════════════════════════════════════════════════════ */
function MemphisIllustration() {
  return (
    <svg viewBox="0 0 320 280" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="blob1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="blob2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Background blobs */}
      <motion.ellipse cx={160} cy={140} rx={130} ry={100}
        fill="url(#blob1)"
        animate={{ rx:[130,145,130], ry:[100,110,100] }}
        transition={{ duration:6, repeat:Infinity, ease:'easeInOut' }}
      />
      <motion.ellipse cx={220} cy={190} rx={70} ry={55}
        fill="url(#blob2)"
        animate={{ rx:[70,80,70], ry:[55,65,55] }}
        transition={{ duration:5, delay:1, repeat:Infinity, ease:'easeInOut' }}
      />

      {/* === FIGURE LEFT: person analyzing chart === */}
      {/* Body */}
      <motion.ellipse cx={78} cy={195} rx={28} ry={40} fill="#f59e0b"
        initial={{y:8, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.3, duration:0.6}}
      />
      {/* Head */}
      <motion.circle cx={78} cy={148} r={22} fill="#fde68a"
        initial={{y:8, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.2, duration:0.6}}
      />
      {/* Hair */}
      <motion.path d="M56 145 Q78 128 100 145" fill="#92400e" stroke="none"
        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.4}}
      />
      {/* Arm holding chart */}
      <motion.path d="M100 180 Q130 165 148 155" stroke="#f59e0b" strokeWidth={10} strokeLinecap="round" fill="none"
        initial={{pathLength:0}} animate={{pathLength:1}} transition={{delay:0.6, duration:0.5}}
      />
      {/* Legs */}
      <motion.path d="M65 230 L58 262" stroke="#d97706" strokeWidth={10} strokeLinecap="round" fill="none"
        initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:0.5}}
        style={{transformOrigin:'65px 230px'}}
      />
      <motion.path d="M91 230 L98 262" stroke="#d97706" strokeWidth={10} strokeLinecap="round" fill="none"
        initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:0.6}}
        style={{transformOrigin:'91px 230px'}}
      />
      {/* Left arm */}
      <motion.path d="M56 185 Q40 200 38 215" stroke="#f59e0b" strokeWidth={10} strokeLinecap="round" fill="none"
        animate={{ rotate: [-5, 5, -5] }} transition={{ duration:2.5, repeat:Infinity, ease:'easeInOut' }}
        style={{ transformOrigin:'56px 185px' }}
      />

      {/* === BAR CHART held by figure === */}
      <motion.rect x={148} y={120} width={8} height={35} rx={3} fill="#10b981"
        initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:0.9, duration:0.4}}
        style={{transformOrigin:'152px 155px'}}
      />
      <motion.rect x={160} y={108} width={8} height={47} rx={3} fill="#3b82f6"
        initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:1.0, duration:0.4}}
        style={{transformOrigin:'164px 155px'}}
      />
      <motion.rect x={172} y={130} width={8} height={25} rx={3} fill="#f59e0b"
        initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:1.1, duration:0.4}}
        style={{transformOrigin:'176px 155px'}}
      />
      <motion.rect x={184} y={118} width={8} height={37} rx={3} fill="#6366f1"
        initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:1.2, duration:0.4}}
        style={{transformOrigin:'188px 155px'}}
      />
      {/* Chart baseline */}
      <line x1={145} y1={155} x2={196} y2={155} stroke="#ffffff" strokeWidth={1.5} strokeOpacity={0.3} />

      {/* === FIGURE RIGHT: person on laptop === */}
      {/* Body */}
      <motion.ellipse cx={252} cy={195} rx={26} ry={38} fill="#6366f1"
        initial={{y:8, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.4, duration:0.6}}
      />
      {/* Head */}
      <motion.circle cx={252} cy={150} r={20} fill="#c7d2fe"
        initial={{y:8, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.3, duration:0.6}}
      />
      {/* Hair */}
      <motion.path d="M232 148 Q252 132 272 148" fill="#312e81" stroke="none"
        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.5}}
      />
      {/* Legs */}
      <motion.path d="M240 230 L233 262" stroke="#4338ca" strokeWidth={10} strokeLinecap="round" fill="none"
        initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:0.55}}
        style={{transformOrigin:'240px 230px'}}
      />
      <motion.path d="M264 230 L271 262" stroke="#4338ca" strokeWidth={10} strokeLinecap="round" fill="none"
        initial={{scaleY:0}} animate={{scaleY:1}} transition={{delay:0.65}}
        style={{transformOrigin:'264px 230px'}}
      />
      {/* Right arm — pointing up */}
      <motion.path d="M272 182 Q292 168 296 150" stroke="#6366f1" strokeWidth={10} strokeLinecap="round" fill="none"
        animate={{ rotate: [0, 8, 0] }} transition={{ duration:3, repeat:Infinity, ease:'easeInOut' }}
        style={{ transformOrigin:'272px 182px' }}
      />
      {/* Left arm */}
      <motion.path d="M232 182 Q215 195 212 210" stroke="#6366f1" strokeWidth={10} strokeLinecap="round" fill="none" />

      {/* Laptop on lap */}
      <motion.rect x={215} y={228} width={74} height={38} rx={5} fill="#1e3a5f"
        stroke="#3b82f6" strokeWidth={1.5}
        initial={{scaleX:0}} animate={{scaleX:1}} transition={{delay:0.8}}
        style={{transformOrigin:'252px 247px'}}
      />
      {/* Screen */}
      <motion.rect x={220} y={232} width={64} height={28} rx={3} fill="#0f172a"
        initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.0}}
      />
      {/* Screen lines (code) */}
      {[0,1,2].map((row) => (
        <motion.rect key={row} x={224} y={236 + row*8} width={30 + row*8} height={3} rx={1.5}
          fill={['#3b82f6','#10b981','#f59e0b'][row]} opacity={0.7}
          initial={{scaleX:0}} animate={{scaleX:1}}
          transition={{delay:1.1 + row*0.1, duration:0.4}}
          style={{transformOrigin:`224px ${237 + row*8}px`}}
        />
      ))}

      {/* Floating coins / currency symbols */}
      {[
        { x:38,  y:110, s:'₭', color:'#f59e0b', delay:0.8 },
        { x:290, y:95,  s:'$', color:'#10b981', delay:1.2 },
        { x:310, y:200, s:'%', color:'#6366f1', delay:0.6 },
        { x:20,  y:230, s:'↑', color:'#3b82f6', delay:1.5 },
      ].map(({ x, y, s, color, delay }) => (
        <motion.text key={s+x} x={x} y={y} fill={color} fontSize={18} fontWeight={700} opacity={0.7}
          animate={{ y: [y, y - 10, y], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeInOut' }}
        >{s}</motion.text>
      ))}

      {/* Decorative Memphis dots + shapes */}
      <motion.circle cx={30} cy={60} r={8} fill="#ef4444" opacity={0.5}
        animate={{ scale:[1,1.3,1] }} transition={{ duration:2.5, repeat:Infinity }}
        style={{transformOrigin:'30px 60px'}}
      />
      <motion.circle cx={295} cy={55} r={6} fill="#10b981" opacity={0.5}
        animate={{ scale:[1,1.4,1] }} transition={{ duration:3, delay:0.5, repeat:Infinity }}
        style={{transformOrigin:'295px 55px'}}
      />
      <motion.rect x={295} y={230} width={14} height={14} rx={3} fill="#f59e0b" opacity={0.4}
        animate={{ rotate:[0,45,0] }} transition={{ duration:4, repeat:Infinity }}
        style={{transformOrigin:'302px 237px'}}
      />
      <motion.polygon points="25,270 35,250 45,270" fill="#6366f1" opacity={0.4}
        animate={{ rotate:[0,20,0] }} transition={{ duration:3.5, repeat:Infinity }}
        style={{transformOrigin:'35px 260px'}}
      />
      {/* Zigzag line */}
      <motion.path d="M130 40 L140 30 L150 40 L160 30 L170 40 L180 30"
        stroke="#f59e0b" strokeWidth={2.5} fill="none" strokeLinecap="round" opacity={0.5}
        initial={{pathLength:0}} animate={{pathLength:1}} transition={{delay:1.2, duration:1}}
      />
      {/* Dotted arc */}
      <motion.path d="M205 50 Q240 20 275 50"
        stroke="#3b82f6" strokeWidth={2} fill="none" strokeDasharray="4 4" opacity={0.4}
        animate={{ strokeDashoffset:[0,-16] }} transition={{ duration:2, repeat:Infinity, ease:'linear' }}
      />
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════════
   ANIMATED BAR CHART (live utilization data)
   ════════════════════════════════════════════════════════════════ */
function LiveBarChart({ data }: { data: { name: string; pct: number; color: string }[] }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), 600); return () => clearTimeout(t); }, []);

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.name}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/50 font-medium truncate max-w-[140px]">{d.name}</span>
            <motion.span
              className="text-xs font-bold"
              style={{ color: d.color }}
              initial={{ opacity: 0 }}
              animate={{ opacity: visible ? 1 : 0 }}
              transition={{ delay: 0.4 + i * 0.12 }}
            >
              {Math.round(d.pct)}%
            </motion.span>
          </div>
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: d.color }}
              initial={{ width: 0 }}
              animate={{ width: visible ? `${Math.min(d.pct, 100)}%` : 0 }}
              transition={{ duration: 0.9, delay: 0.3 + i * 0.12, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   COUNTING STAT
   ════════════════════════════════════════════════════════════════ */
function CountingStat({ target, prefix = '', suffix = '', color, label, delay = 0 }:
  { target: number; prefix?: string; suffix?: string; color: string; label: string; delay?: number }) {
  const [val, setVal] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay * 1000 + 400);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started || target === 0) return;
    const steps = 40;
    const inc   = target / steps;
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(current + inc, target);
      setVal(Math.round(current));
      if (current >= target) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [started, target]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay + 0.2, duration: 0.5 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-5 flex flex-col gap-1 backdrop-blur-sm"
    >
      <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{label}</p>
      <p className="text-2xl font-extrabold" style={{ color }}>
        {prefix}{target >= 1e6 ? formatCompact(val) : val.toLocaleString()}{suffix}
      </p>
      <motion.div className="h-0.5 rounded-full mt-1 origin-left"
        style={{ backgroundColor: color, opacity: 0.3 }}
        initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
        transition={{ delay: delay + 0.6, duration: 0.6 }}
      />
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════════════
   QUICK LINKS
   ════════════════════════════════════════════════════════════════ */
const ALL_LINKS = [
  { href:'/dashboard',   icon:LayoutDashboard, label:'Dashboard',    desc:'Live KPIs & charts',          color:'#3b82f6' },
  { href:'/sectors',     icon:Network,         label:'Sectors',      desc:'Org chart & hierarchy',        color:'#6366f1' },
  { href:'/allocations', icon:ArrowLeftRight,  label:'Allocations',  desc:'Budget flows & transfers',     color:'#10b981' },
  { href:'/procurement', icon:ShoppingCart,    label:'Procurement',  desc:'Purchase orders & spend',      color:'#f59e0b' },
  { href:'/catalog',     icon:Package,         label:'Catalog',      desc:'Products & pricing',           color:'#8b5cf6' },
  { href:'/reports',     icon:FileText,        label:'Reports',      desc:'Export & breakdowns',          color:'#ef4444' },
  { href:'/hierarchy-designer', icon:Workflow, label:'Designer',     desc:'Build the budget tree',        color:'#ec4899' },
  { href:'/users',       icon:Users,           label:'Users',        desc:'Accounts & roles',             color:'#0ea5e9' },
];

/* ════════════════════════════════════════════════════════════════
   ROLE HELPERS
   ════════════════════════════════════════════════════════════════ */
function roleLabel(role?: string) {
  return ({ super_admin:'System Administrator', ceo:'Chief Executive Officer', ministry_head:'Ministry Head', department_head:'Department Head', viewer:'Read-only Viewer' } as any)[role ?? ''] ?? 'User';
}
function roleBadgeStyle(role?: string): React.CSSProperties {
  const map: Record<string, React.CSSProperties> = {
    super_admin:     { color:'#f87171', background:'rgba(239,68,68,0.12)',  border:'1px solid rgba(239,68,68,0.25)' },
    ceo:             { color:'#fbbf24', background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.25)' },
    ministry_head:   { color:'#60a5fa', background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.25)' },
    department_head: { color:'#34d399', background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.25)' },
  };
  return map[role ?? ''] ?? { color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)' };
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [, navigate] = useLocation();
  const { user, isSuperAdmin, isCeo } = useAuth();
  const { data: summary } = useGetDashboardSummary();
  const { data: cycle }   = useGetActiveCycle();
  const { data: breakdown } = useGetSectorBreakdown({ limit: 6 } as any);

  const visibleLinks = ALL_LINKS.filter(l => {
    if (l.href === '/hierarchy-designer') return isSuperAdmin || isCeo;
    if (l.href === '/users') return isSuperAdmin || isCeo;
    return true;
  });

  const barData = (breakdown ?? []).slice(0, 6).map(s => ({
    name: s.sectorName,
    pct: s.utilizationPct ?? 0,
    color: (s.utilizationPct ?? 0) > 90 ? '#ef4444' : (s.utilizationPct ?? 0) > 70 ? '#f59e0b' : '#10b981',
  }));

  return (
    <div className="space-y-0 pb-12 -mt-2">

      {/* ══════════════════════════════════════════════════════════
          HERO SECTION
      ══════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[420px] flex items-center overflow-hidden rounded-3xl mb-8"
        style={{ background:'linear-gradient(135deg,rgba(15,23,42,0.95) 0%,rgba(30,42,74,0.9) 50%,rgba(15,23,42,0.95) 100%)', border:'1px solid rgba(255,255,255,0.07)' }}>

        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage:'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize:'28px 28px' }} />

        {/* Moving glow blobs */}
        <motion.div className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background:'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }}
          animate={{ x:[0,40,0], y:[0,30,0] }} transition={{ duration:10, repeat:Infinity, ease:'easeInOut' }}
        />
        <motion.div className="absolute -bottom-20 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background:'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }}
          animate={{ x:[0,-30,0], y:[0,-20,0] }} transition={{ duration:8, delay:2, repeat:Infinity, ease:'easeInOut' }}
        />

        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-0 items-center">
          {/* Left: text */}
          <div className="p-8 md:p-12">
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5 }}
              className="flex items-center gap-3 mb-5">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border"
                style={{ color:'#60a5fa', background:'rgba(59,130,246,0.1)', borderColor:'rgba(59,130,246,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {cycle?.name ?? 'Budget Monitor'} · Live
              </span>
            </motion.div>

            <motion.h1 initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.6, delay:0.1 }}
              className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-3">
              Welcome back,<br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-300 bg-clip-text text-transparent">
                {user?.name?.split(' ')[0] ?? 'User'}
              </span>
            </motion.h1>

            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.3 }}
              className="flex items-center gap-2 mb-5">
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg"
                style={roleBadgeStyle(user?.role)}>
                {roleLabel(user?.role)}
              </span>
            </motion.div>

            <motion.p initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35, duration:0.5 }}
              className="text-white/40 text-sm leading-relaxed mb-8 max-w-md">
              National Budget Control Platform — real-time hierarchical budget tracking, allocation flows, procurement orders and sector analytics in one place.
            </motion.p>

            <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.5 }}
              className="flex items-center gap-3 flex-wrap">
              <button onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95"
                style={{ background:'linear-gradient(135deg,#3b82f6,#6366f1)', boxShadow:'0 0 24px rgba(99,102,241,0.4)' }}>
                Open Dashboard <ArrowRight size={15} />
              </button>
              <button onClick={() => navigate('/sectors')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white/70 border border-white/10 hover:border-white/25 hover:text-white transition-all">
                View Sectors <ChevronRight size={15} />
              </button>
            </motion.div>
          </div>

          {/* Right: illustration split */}
          <div className="relative hidden lg:grid grid-rows-2 h-full min-h-[420px]">
            {/* Top: Memphis illustration */}
            <div className="flex items-center justify-center p-4 border-b border-white/5">
              <div className="w-full max-w-xs h-[200px]">
                <MemphisIllustration />
              </div>
            </div>
            {/* Bottom: mini live stats */}
            <div className="grid grid-cols-3 divide-x divide-white/8">
              {[
                { label:'Total Budget',  value: summary ? formatCompact(summary.totalBudget) : '—',                color:'#3b82f6' },
                { label:'Utilization',   value: summary ? `${Math.round(summary.utilizationPct ?? 0)}%` : '—',    color:'#f59e0b' },
                { label:'Active Sectors',value: summary ? String(summary.sectorCount) : '—',                      color:'#10b981' },
              ].map((s, i) => (
                <motion.div key={s.label}
                  initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex flex-col justify-center items-center gap-1 p-5">
                  <TrendingUp size={14} style={{ color:s.color }} className="opacity-60" />
                  <p className="text-xl font-extrabold" style={{ color:s.color }}>{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold text-center">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          NETWORK GRAPH + UTILIZATION SIDE BY SIDE
      ══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        {/* Network graph (3/5) */}
        <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Budget Hierarchy Graph</h2>
              <p className="text-[11px] text-white/30 mt-0.5">Live node map — funds flow from pool to sectors</p>
            </div>
            <motion.span className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-lg"
              style={{ color:'#34d399', background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)' }}
              animate={{ opacity:[1,0.6,1] }} transition={{ duration:2, repeat:Infinity }}>
              ● Live
            </motion.span>
          </div>
          <div className="h-[300px]">
            <NetworkGraph />
          </div>
        </div>

        {/* Utilization bars (2/5) */}
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white">Sector Utilization</h2>
            <p className="text-[11px] text-white/30 mt-0.5">Budget utilization % by sector</p>
          </div>
          <div className="flex-1">
            {barData.length > 0 ? (
              <LiveBarChart data={barData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20">
                <Network size={32} className="opacity-30" />
                <p className="text-xs">No sector data yet</p>
              </div>
            )}
          </div>
          {summary && (
            <motion.div className="mt-5 pt-4 border-t border-white/8 grid grid-cols-2 gap-3"
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1 }}>
              <div className="text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Allocations</p>
                <p className="text-lg font-extrabold text-blue-400">{summary.activeAllocations}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-bold">Available</p>
                <p className="text-lg font-extrabold text-emerald-400">{formatCompact(summary.availableBalance)}</p>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          COUNTING STATS ROW (mobile-first)
      ══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 lg:hidden">
        <CountingStat label="Total Budget"    target={summary?.totalBudget ?? 0}          color="#3b82f6" prefix="KSh " delay={0}    />
        <CountingStat label="Utilization"     target={summary?.utilizationPct ?? 0}        color="#f59e0b" suffix="%" delay={0.1}  />
        <CountingStat label="Active Sectors"  target={summary?.sectorCount ?? 0}           color="#10b981" delay={0.2}  />
        <CountingStat label="Allocations"     target={summary?.activeAllocations ?? 0}     color="#8b5cf6" delay={0.3}  />
      </section>

      {/* ══════════════════════════════════════════════════════════
          QUICK ACCESS GRID
      ══════════════════════════════════════════════════════════ */}
      <section className="mb-2">
        <motion.h2 initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4 }}
          className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span className="w-1 h-4 rounded-full bg-blue-500 inline-block" />
          Quick Access
        </motion.h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleLinks.map((link, i) => (
            <motion.button
              key={link.href}
              initial={{ opacity:0, scale:0.92 }}
              animate={{ opacity:1, scale:1 }}
              transition={{ delay: 0.15 + i * 0.05, duration:0.35, type:'spring', stiffness:260 }}
              onClick={() => navigate(link.href)}
              whileHover={{ y:-4, scale:1.03 }}
              whileTap={{ scale:0.96 }}
              className="relative text-left rounded-2xl p-4 border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] transition-colors group overflow-hidden cursor-pointer"
            >
              {/* Background accent */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
                style={{ background:`radial-gradient(circle at 20% 20%, ${link.color}10 0%, transparent 70%)` }} />

              <div className="relative">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                  style={{ background:`${link.color}18`, border:`1px solid ${link.color}28` }}>
                  <link.icon size={16} style={{ color:link.color }} />
                </div>
                <p className="text-sm font-bold text-white mb-0.5">{link.label}</p>
                <p className="text-[11px] text-white/35 leading-snug">{link.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}
