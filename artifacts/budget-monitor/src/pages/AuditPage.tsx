import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHistory, faSearch, faDownload, faChevronDown, faChevronRight,
  faCoins, faBan, faShoppingCart, faThumbsUp, faTimesCircle,
  faSignInAlt, faFileAlt, faLayerGroup, faWallet, faShieldAlt,
  faCalendarAlt, faFilter,
} from '@fortawesome/free-solid-svg-icons';

const ACTION_CFG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  allocated:   { label: 'Allocation Made',    icon: faCoins,       color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  revoked:     { label: 'Revoked',            icon: faBan,         color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  login:       { label: 'Login',              icon: faSignInAlt,   color: '#4B117A', bg: 'rgba(75,17,122,0.1)' },
  approved:    { label: 'Approved',           icon: faThumbsUp,    color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  rejected:    { label: 'Rejected',           icon: faTimesCircle, color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  submitted:   { label: 'Submitted',          icon: faShoppingCart,color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  created:     { label: 'Created',            icon: faLayerGroup,  color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  updated:     { label: 'Updated',            icon: faWallet,      color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  report:      { label: 'Report',             icon: faFileAlt,     color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  admin:       { label: 'Admin Action',       icon: faShieldAlt,   color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
};

function getCfg(action: string) {
  const key = Object.keys(ACTION_CFG).find(k => action.toLowerCase().includes(k));
  return key ? ACTION_CFG[key] : ACTION_CFG['created'];
}

function fmtDate(d: string | Date): string {
  return new Date(d).toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtShort(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ── Calendar Heatmap ──────────────────────────────────────── */
function CalendarHeatmap({ data, onSelectDate, selectedDate }: {
  data: { date: string; count: number }[];
  onSelectDate: (date: string | null) => void;
  selectedDate: string | null;
}) {
  const maxCount = Math.max(1, ...data.map(d => d.count));
  const dataMap  = new Map(data.map(d => [d.date, d.count]));

  // Generate last 30 days
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }

  function getIntensity(count: number): string {
    if (count === 0) return 'rgba(59,130,246,0.06)';
    const pct = count / maxCount;
    if (pct < 0.25) return 'rgba(59,130,246,0.2)';
    if (pct < 0.5)  return 'rgba(59,130,246,0.4)';
    if (pct < 0.75) return 'rgba(59,130,246,0.65)';
    return 'rgba(59,130,246,0.9)';
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FontAwesomeIcon icon={faCalendarAlt} className="text-[13px] text-gray-400" />
        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Activity (Last 30 Days)</span>
      </div>
      <div className="flex gap-1 flex-wrap">
        {days.map(day => {
          const count = dataMap.get(day) ?? 0;
          const isSelected = selectedDate === day;
          return (
            <button
              key={day}
              onClick={() => onSelectDate(isSelected ? null : day)}
              title={`${fmtShort(day)}: ${count} action${count !== 1 ? 's' : ''}`}
              className="w-7 h-7 rounded-md transition-all hover:scale-110 hover:shadow-md focus:outline-none"
              style={{
                background: getIntensity(count),
                border: isSelected ? '2px solid #3b82f6' : '1px solid transparent',
                transform: isSelected ? 'scale(1.15)' : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
        <span>Less</span>
        {[0.06, 0.2, 0.4, 0.65, 0.9].map((a, i) => (
          <span key={i} className="w-3.5 h-3.5 rounded-sm" style={{ background: `rgba(59,130,246,${a})` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

/* ── Log Entry ─────────────────────────────────────────────── */
function LogEntry({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = getCfg(log.actionType);
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-100 overflow-hidden"
    >
      <button
        onClick={() => hasMeta && setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.bg }}>
          <FontAwesomeIcon icon={cfg.icon} className="text-[12px]" style={{ color: cfg.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: cfg.color }}>{log.actionType}</span>
            <span className="text-[10px] text-gray-400">on {log.entityType}</span>
            {log.entityId && <span className="text-[10px] text-gray-300">#{log.entityId}</span>}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-gray-600 font-semibold">{log.actorName}</p>
            <span className="text-[10px] text-gray-400">·</span>
            <p className="text-[11px] text-gray-400">{fmtDate(log.occurredAt)}</p>
            {log.ipAddress && (
              <>
                <span className="text-[10px] text-gray-300">·</span>
                <p className="text-[10px] text-gray-300 font-mono">{log.ipAddress}</p>
              </>
            )}
          </div>
        </div>
        {hasMeta && (
          <FontAwesomeIcon
            icon={expanded ? faChevronDown : faChevronRight}
            className="text-[11px] text-gray-300 shrink-0"
          />
        )}
      </button>

      {/* Expanded metadata */}
      <AnimatePresence>
        {expanded && hasMeta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 border-t border-gray-50">
              <pre className="text-[10px] font-mono text-gray-500 bg-gray-50 rounded-lg p-3 overflow-x-auto leading-relaxed">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main Page ─────────────────────────────────────────────── */
export default function AuditPage() {
  const [logs, setLogs]           = useState<any[]>([]);
  const [heatmap, setHeatmap]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [actionType, setActionType] = useState('');
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore]     = useState(false);

  const fetchHeatmap = useCallback(async () => {
    try {
      const r = await fetch('/api/audit/summary', { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setHeatmap(d.dates ?? []); }
    } catch { /* ignore */ }
  }, []);

  const fetchLogs = useCallback(async (cursor?: number, append?: boolean) => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ limit: '50' });
      if (cursor)     p.set('cursor', String(cursor));
      if (selectedDate) p.set('date', selectedDate);
      if (actionType)   p.set('actionType', actionType);
      if (search)       p.set('search', search);
      const r = await fetch(`/api/audit?${p}`, { credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        setLogs(prev => append ? [...prev, ...(d.logs ?? [])] : (d.logs ?? []));
        setNextCursor(d.nextCursor ?? null);
        setHasMore(d.hasMore ?? false);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [selectedDate, actionType, search]);

  useEffect(() => { fetchHeatmap(); }, [fetchHeatmap]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = () => {
    const p = new URLSearchParams();
    if (selectedDate) p.set('date', selectedDate);
    if (actionType) p.set('actionType', actionType);
    window.open(`/api/audit/export?${p}`, '_blank');
  };

  const actionTypes = Object.keys(ACTION_CFG);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <FontAwesomeIcon icon={faHistory} className="text-[20px]" style={{ color: '#6366f1' }} />
            Audit Log
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete system activity history</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
        >
          <FontAwesomeIcon icon={faDownload} className="text-[13px]" />
          Export CSV
        </button>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <CalendarHeatmap
          data={heatmap}
          onSelectDate={setSelectedDate}
          selectedDate={selectedDate}
        />
        {selectedDate && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-blue-600 font-semibold">Filtering: {fmtShort(selectedDate)}</span>
            <button onClick={() => setSelectedDate(null)} className="text-[10px] text-gray-400 underline hover:text-gray-600">Clear</button>
          </div>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] flex items-center">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search actions, entities, metadata…"
            className="w-full h-11 pl-5 pr-14 rounded-full border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#4B117A]/40 focus:ring-2 focus:ring-[#4B117A]/10 transition-all"
          />
          <button className="absolute right-1.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:opacity-90 active:scale-95 transition-all"
            style={{ background: '#4B117A' }}>
            <FontAwesomeIcon icon={faSearch} className="text-white text-[13px]" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setActionType('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${!actionType ? 'bg-gray-900 text-white border-gray-900' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}
          >
            All
          </button>
          {actionTypes.map(type => {
            const cfg = ACTION_CFG[type];
            const active = actionType === type;
            return (
              <button
                key={type}
                onClick={() => setActionType(active ? '' : type)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
                style={{
                  color: active ? cfg.color : '#94a3b8',
                  background: active ? cfg.bg : 'transparent',
                  borderColor: active ? `${cfg.color}40` : '#e2e8f0',
                }}
              >
                <FontAwesomeIcon icon={cfg.icon} className="text-[10px]" />
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log list */}
      <div className="space-y-2">
        {loading && logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Loading audit log…</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <FontAwesomeIcon icon={faHistory} className="text-[36px] text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No audit entries found</p>
          </div>
        ) : (
          logs.map(log => <LogEntry key={log.id} log={log} />)
        )}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchLogs(nextCursor ?? undefined, true)}
            disabled={loading}
            className="px-6 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more entries'}
          </button>
        </div>
      )}
    </div>
  );
}
