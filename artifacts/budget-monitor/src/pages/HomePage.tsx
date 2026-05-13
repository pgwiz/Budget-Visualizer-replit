import { useEffect, useRef, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import budgetIllustration from '@/assets /PNG/4 - BUDGETTING.png';
import { motion, useAnimation, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useGetDashboardSummary, useGetActiveCycle, useGetSectorBreakdown } from '@workspace/api-client-react';
import { formatCompact, formatCurrency } from '@/lib/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartPie, faShieldAlt, faArrowRight, faCheckCircle,
  faPlayCircle, faBuilding, faUsers, faGlobe,
  faLayerGroup, faChartLine, faLock, faBolt,
  faExchangeAlt, faStar, faQuoteLeft, faCheck,
  faTachometerAlt, faProjectDiagram, faBox, faFileAlt,
  faSitemap, faShoppingCart, faChevronRight, faHome,
  faWallet, faCoins, faBullseye
} from '@fortawesome/free-solid-svg-icons';

/* ════════════════════════════════════════════════════════════════
   ANIMATED NETWORK GRAPH — FA ICONS
   ════════════════════════════════════════════════════════════════ */

// Shared line/particle color
const FLOW_COLOR = 'rgba(255,255,255,0.25)';
const PARTICLE_COLOR = 'rgba(255,255,255,0.7)';

const NODES = [
  { id: 'pool', x: 220, y: 60,  size: 48, label: 'National Pool', icon: 'faLayerGroup' },
  { id: 'm1',  x: 80,  y: 175, size: 40, label: 'Agriculture',   icon: 'faBuilding'   },
  { id: 'm2',  x: 220, y: 185, size: 40, label: 'Education',     icon: 'faUsers'      },
  { id: 'm3',  x: 360, y: 175, size: 40, label: 'Health',        icon: 'faChartPie'   },
  { id: 'd1',  x: 30,  y: 295, size: 32, label: 'Crops',         icon: 'faLayerGroup' },
  { id: 'd2',  x: 120, y: 295, size: 32, label: 'Livestock',     icon: 'faLayerGroup' },
  { id: 'd3',  x: 185, y: 295, size: 32, label: 'Primary',       icon: 'faUsers'      },
  { id: 'd4',  x: 260, y: 295, size: 32, label: 'Secondary',     icon: 'faUsers'      },
  { id: 'd5',  x: 315, y: 295, size: 32, label: 'Hospitals',     icon: 'faChartPie'   },
  { id: 'd6',  x: 400, y: 295, size: 32, label: 'Clinics',       icon: 'faChartPie'   },
];

const EDGES = [
  ['pool','m1'],['pool','m2'],['pool','m3'],
  ['m1','d1'],['m1','d2'],
  ['m2','d3'],['m2','d4'],
  ['m3','d5'],['m3','d6'],
];

// Map icon names to actual FA icons — resolved at render
const FA_MAP: Record<string, any> = {
  faLayerGroup, faBuilding, faUsers, faChartPie,
};

function Particle({ x1,y1,x2,y2,delay }:{x1:number;y1:number;x2:number;y2:number;delay:number}) {
  return (
    <motion.circle
      r={3} fill={PARTICLE_COLOR}
      initial={{ cx: x1, cy: y1, opacity: 0 }}
      animate={{ cx: [x1, x2], cy: [y1, y2], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 1.8, delay, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
    />
  );
}

function NetworkGraph() {
  return (
    <svg viewBox="0 0 440 350" className="w-full h-full">
      {/* Edges */}
      {EDGES.map(([a, b], i) => {
        const na = NODES.find(n => n.id === a)!;
        const nb = NODES.find(n => n.id === b)!;
        return (
          <motion.line
            key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={FLOW_COLOR} strokeWidth={1.5} strokeDasharray="5 5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
          />
        );
      })}

      {/* Particles */}
      {EDGES.map(([a, b], i) => {
        const na = NODES.find(n => n.id === a)!;
        const nb = NODES.find(n => n.id === b)!;
        return <Particle key={`p-${i}`} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} delay={i * 0.4} />;
      })}

      {/* Nodes — icon only, no background */}
      {NODES.map((n, i) => {
        const half = n.size / 2;
        const iconPx = n.size * 0.5;
        return (
          <g key={n.id}>
            {/* Soft pulse glow ring */}
            <motion.circle cx={n.x} cy={n.y} r={half + 4}
              fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1}
              animate={{ opacity: [0.4, 0, 0.4], r: [half + 4, half + 12, half + 4] }}
              transition={{ duration: 2.5, delay: i * 0.3, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* FA icon — no backing, transparent foreignObject */}
            <motion.foreignObject
              x={n.x - half} y={n.y - half}
              width={n.size} height={n.size}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.08, type: 'spring', stiffness: 220 }}
              style={{ transformOrigin: `${n.x}px ${n.y}px`, overflow: 'visible' }}
            >
              <div
                style={{
                  width: '100%', height: '100%',
                  background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <FontAwesomeIcon
                  icon={FA_MAP[n.icon]}
                  style={{ fontSize: `${iconPx}px`, color: 'rgba(255,255,255,0.8)' }}
                />
              </div>
            </motion.foreignObject>

            {/* Label */}
            {n.size >= 40 && (
              <motion.text x={n.x} y={n.y + half + 14} textAnchor="middle"
                fill="rgba(255,255,255,0.45)" fontSize={9} fontWeight={600}
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.08 }}
              >
                {n.label}
              </motion.text>
            )}
          </g>
        );
      })}
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

      {/* Background blobs — use motion.g + scale to avoid rx/ry WAAPI issues */}
      <motion.g
        animate={{ scale:[1, 1.1, 1] }}
        transition={{ duration:6, repeat:Infinity, ease:'easeInOut' }}
        style={{ transformOrigin:'160px 140px' }}
      >
        <ellipse cx={160} cy={140} rx={130} ry={100} fill="url(#blob1)" />
      </motion.g>
      <motion.g
        animate={{ scale:[1, 1.12, 1] }}
        transition={{ duration:5, delay:1, repeat:Infinity, ease:'easeInOut' }}
        style={{ transformOrigin:'220px 190px' }}
      >
        <ellipse cx={220} cy={190} rx={70} ry={55} fill="url(#blob2)" />
      </motion.g>

      {/* === FIGURE LEFT: person analyzing chart === */}
      {/* Body */}
      <motion.g initial={{y:8, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.3, duration:0.6}}>
        <ellipse cx={78} cy={195} rx={28} ry={40} fill="#f59e0b" />
      </motion.g>
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
      <motion.g initial={{y:8, opacity:0}} animate={{y:0, opacity:1}} transition={{delay:0.4, duration:0.6}}>
        <ellipse cx={252} cy={195} rx={26} ry={38} fill="#6366f1" />
      </motion.g>
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
            <span className="text-xs text-gray-600 font-medium truncate max-w-[140px]">{d.name}</span>
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
          <div className="h-2 rounded-full bg-gray-50 overflow-hidden">
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
      className="rounded-2xl border border-gray-200 bg-gray-50 p-5 flex flex-col gap-1 backdrop-blur-sm"
    >
      <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{label}</p>
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
   BUDGET STATS CARD
   ════════════════════════════════════════════════════════════════ */
function StatIconHover({ icon }: { icon: any }) {
  return (
    <motion.div
      className="mb-3 inline-block"
      whileHover={{ scale: 1.5, rotate: 15, y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      style={{ cursor: 'default' }}
    >
      <FontAwesomeIcon
        icon={icon}
        style={{ fontSize: '42px', color: '#ffffff' }}
      />
    </motion.div>
  );
}

function BudgetStatsCard({ summary }: { summary: any }) {
  const stats = [
    {
      label: 'Total Budget',
      value: summary ? formatCurrency(summary.totalBudget ?? 0) : 'Ksh 0',
      sub: summary ? `${(summary.utilizationPct ?? 0).toFixed(1)}% utilized` : '0% utilized',
      icon: faWallet,
    },
    {
      label: 'Total Allocated',
      value: summary ? formatCurrency(summary.totalAllocated ?? 0) : 'Ksh 0',
      sub: summary ? `${summary.activeAllocations ?? 0} active allocations` : '0 active allocations',
      icon: faCoins,
    },
    {
      label: 'Available Balance',
      value: summary ? formatCurrency(summary.availableBalance ?? 0) : 'Ksh 0',
      sub: summary ? `${summary.sectorCount ?? 0} active sectors` : '0 sectors',
      icon: faChartLine,
    },
    {
      label: 'Utilization',
      value: summary ? `${(summary.utilizationPct ?? 0).toFixed(1)}%` : '0%',
      sub: summary ? `${summary.activeAllocations ?? 0} active allocations` : '0 active allocations',
      icon: faBullseye,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="mb-8"
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-[#343a40]/50">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="relative px-5 py-5"
            style={{ backgroundColor: '#212529' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.07 }}
          >
            {/* Icon — top-left, white, with hover pop+tilt */}
            <StatIconHover icon={s.icon} />

            {/* Label */}
            <p className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: '#6b7280' }}>
              {s.label}
            </p>

            {/* Value */}
            <motion.p
              className="text-lg md:text-xl font-extrabold leading-none mb-1 text-white"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              {s.value}
            </motion.p>

            {/* Sub label */}
            <p className="text-[11px]" style={{ color: '#6b7280' }}>{s.sub}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}



/* ════════════════════════════════════════════════════════════════
   QUICK LINKS
   ════════════════════════════════════════════════════════════════ */
const ALL_LINKS = [
  { href:'/dashboard',          faIcon:faTachometerAlt,  label:'Dashboard',    desc:'Live KPIs & charts',          color:'#3b82f6' },
  { href:'/sectors',            faIcon:faProjectDiagram, label:'Sectors',      desc:'Org chart & hierarchy',        color:'#6366f1' },
  { href:'/allocations',        faIcon:faExchangeAlt,    label:'Allocations',  desc:'Budget flows & transfers',     color:'#10b981' },
  { href:'/procurement',        faIcon:faShoppingCart,   label:'Procurement',  desc:'Purchase orders & spend',      color:'#f59e0b' },
  { href:'/catalog',            faIcon:faBox,            label:'Catalog',      desc:'Products & pricing',           color:'#8b5cf6' },
  { href:'/reports',            faIcon:faFileAlt,        label:'Reports',      desc:'Export & breakdowns',          color:'#ef4444' },
  { href:'/hierarchy-designer', faIcon:faSitemap,        label:'Designer',     desc:'Build the budget tree',        color:'#ec4899' },
  { href:'/users',              faIcon:faUsers,          label:'Users',        desc:'Accounts & roles',             color:'#0ea5e9' },
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

  const barData = (Array.isArray(breakdown) ? breakdown : []).slice(0, 6).map(s => ({
    name: s.sectorName,
    pct: s.utilizationPct ?? 0,
    color: (s.utilizationPct ?? 0) > 90 ? '#ef4444' : (s.utilizationPct ?? 0) > 70 ? '#f59e0b' : '#10b981',
  }));

  return (
    <div className="space-y-0 pb-12 -mt-2">

      {/* ══════════════════════════════════════════════════════════
          WELCOME BANNER
      ══════════════════════════════════════════════════════════ */}
      <section
        className="relative rounded-2xl mb-8 flex items-center group"
        style={{ backgroundColor: '#212529', minHeight: '220px', overflow: 'visible' }}
      >
        {/* Clip container for bg effects */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        </div>


        {/* Left content */}
        <div className="relative z-10 flex-1 px-8 py-10">
          <motion.h1 initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.5, delay:0.1 }}
            className="text-2xl md:text-3xl font-extrabold text-white leading-snug mb-1">
            Welcome back, <span style={{ color:'#fcbf49' }}>{user?.name?.split(' ')[0] ?? 'User'}!</span>
          </motion.h1>

          <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }}
            className="text-sm mb-5" style={{ color:'rgba(255,255,255,0.55)', maxWidth:'380px' }}>
            Real-time hierarchical budget tracking, allocation flows and sector analytics — all in one place.
          </motion.p>

          {/* CTA */}
          <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.35 }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: '#ffffff', color: '#212529' }}
            >
              Open Dashboard <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </motion.div>
        </div>

        {/* Right: faded home icon — pops out on hover like Quick Access */}
        <div
          className="absolute top-1/2 -translate-y-1/2 pointer-events-none hidden md:block"
          style={{ right: '-24px' }}
        >
          <div
            className="opacity-10 rotate-0 scale-100 group-hover:opacity-90 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
            style={{
              maskImage: 'linear-gradient(to right, black 20%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, black 20%, transparent 100%)',
            }}
          >
            <FontAwesomeIcon icon={faHome} style={{ fontSize: '220px', color: '#ffffff' }} />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          BUDGET STATS CARD
      ══════════════════════════════════════════════════════════ */}
      <BudgetStatsCard summary={summary} />

      {/* ══════════════════════════════════════════════════════════
          QUICK ACCESS GRID
      ══════════════════════════════════════════════════════════ */}
      <section className="mb-8">
        <motion.h2 initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.4 }}
          className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
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
              className="relative text-left rounded-2xl p-6 min-h-[110px] flex flex-col justify-center border border-[#343a40] hover:border-white/20 transition-colors group overflow-hidden cursor-pointer"
              style={{ backgroundColor: '#212529' }}
            >
              {/* Icon overlay — pops out white on hover */}
              <div
                className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  right: '-18px',
                  transition: 'opacity 0.25s ease, transform 0.25s ease, mask-image 0.25s ease',
                }}
              >
                {/* Faded state wrapper — becomes opaque on group hover via CSS */}
                <div
                  className="opacity-10 rotate-0 scale-100 group-hover:opacity-90 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
                  style={{
                    maskImage: 'linear-gradient(to right, black 30%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, black 30%, transparent 100%)',
                  }}
                >
                  <FontAwesomeIcon icon={link.faIcon} style={{ fontSize: '80px', color: '#ffffff' }} />
                </div>
              </div>

              <div className="relative">
                <p className="text-base font-bold text-white mb-1">{link.label}</p>
                <p className="text-xs text-gray-400 leading-snug">{link.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════
          NETWORK GRAPH + UTILIZATION SIDE BY SIDE
      ══════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        {/* Network graph (3/5) */}
        <div className="lg:col-span-3 rounded-2xl border border-[#343a40] p-5" style={{ backgroundColor: '#212529' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">Budget Hierarchy Graph</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">Live node map — funds flow from pool to sectors</p>
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
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white/[0.03] p-5 backdrop-blur-sm flex flex-col">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-900">Sector Utilization</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Budget utilization % by sector</p>
          </div>
          <div className="flex-1">
            {barData.length > 0 ? (
              <LiveBarChart data={barData} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <FontAwesomeIcon icon={faProjectDiagram} style={{ fontSize: '32px' }} className="opacity-30" />
                <p className="text-xs">No sector data yet</p>
              </div>
            )}
          </div>
          {summary && (
            <motion.div className="mt-5 pt-4 border-t border-gray-200 grid grid-cols-2 gap-3"
              initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:1 }}>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Allocations</p>
                <p className="text-lg font-extrabold text-blue-400">{summary.activeAllocations}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Available</p>
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


    </div>
  );
}
