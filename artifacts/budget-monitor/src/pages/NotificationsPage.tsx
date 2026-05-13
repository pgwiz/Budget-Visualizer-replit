import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell, faCheckDouble, faFilter, faCoins, faBan, faShoppingCart,
  faThumbsUp, faTimesCircle, faSignInAlt, faFileAlt, faLayerGroup, faWallet,
  faInbox,
} from '@fortawesome/free-solid-svg-icons';

const ACTION_CFG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  ALLOCATION_CREATED:          { label: 'Allocation Made',    icon: faCoins,        color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  ALLOCATION_REVOKED:          { label: 'Allocation Revoked', icon: faBan,          color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  PROCUREMENT_ORDER_CREATED:   { label: 'PO Raised',         icon: faShoppingCart,  color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  PROCUREMENT_ORDER_APPROVED:  { label: 'PO Approved',       icon: faThumbsUp,      color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  PROCUREMENT_ORDER_REJECTED:  { label: 'PO Rejected',       icon: faTimesCircle,   color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  USER_LOGIN:                  { label: 'User Login',         icon: faSignInAlt,     color: '#4B117A', bg: 'rgba(75,17,122,0.1)' },
  REPORT_GENERATED:            { label: 'Report Generated',   icon: faFileAlt,       color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  SECTOR_CREATED:              { label: 'Sector Created',     icon: faLayerGroup,    color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  SECTOR_UPDATED:              { label: 'Sector Updated',     icon: faLayerGroup,    color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  BUDGET_UPDATED:              { label: 'Budget Updated',     icon: faWallet,        color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
};

function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationsPage() {
  const [, navigate]    = useLocation();
  const [notifs, setNotifs]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [filterType, setFilterType] = useState('');
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore]     = useState(false);
  const [totalUnread, setTotal]   = useState(0);

  const fetchNotifs = useCallback(async (cursor?: number, append?: boolean) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (cursor) params.set('cursor', String(cursor));
      if (unreadOnly) params.set('unread', 'true');
      const r = await fetch(`/api/notifications?${params}`, { credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        const all = d.notifications ?? [];
        const filtered = filterType ? all.filter((n: any) => n.actionType === filterType) : all;
        setNotifs(prev => append ? [...prev, ...filtered] : filtered);
        setNextCursor(d.nextCursor ?? null);
        setHasMore(d.hasMore ?? false);
        setTotal(d.totalUnread ?? 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [unreadOnly, filterType]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setTotal(c => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' });
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setTotal(0);
  };

  const actionTypes = Object.keys(ACTION_CFG);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
            <FontAwesomeIcon icon={faBell} className="text-[22px]" style={{ color: '#3b82f6' }} />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
          </p>
        </div>
        {totalUnread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
          >
            <FontAwesomeIcon icon={faCheckDouble} />
            Mark all read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setUnreadOnly(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${unreadOnly ? 'bg-blue-500/10 text-blue-600 border-blue-300' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}
        >
          <FontAwesomeIcon icon={faFilter} className="text-[11px]" />
          Unread only
        </button>
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${!filterType ? 'bg-gray-800 text-white border-gray-800' : 'text-gray-500 border-gray-200 hover:bg-gray-50'}`}
        >
          All types
        </button>
        {actionTypes.map(type => {
          const cfg = ACTION_CFG[type];
          const active = filterType === type;
          return (
            <button
              key={type}
              onClick={() => setFilterType(active ? '' : type)}
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

      {/* List */}
      <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
        {loading && notifs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">Loading notifications…</div>
        ) : notifs.length === 0 ? (
          <div className="py-16 text-center">
            <FontAwesomeIcon icon={faInbox} className="text-[36px] text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence>
              {notifs.map((n, i) => {
                const cfg = ACTION_CFG[n.actionType] ?? ACTION_CFG['USER_LOGIN'];
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition-colors relative cursor-pointer"
                    style={{ borderLeft: n.isRead ? '3px solid transparent' : '3px solid #3b82f6' }}
                    onClick={() => markRead(n.id)}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg }}>
                      <FontAwesomeIcon icon={cfg.icon} className="text-[16px]" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ color: cfg.color, background: cfg.bg }}>
                          {cfg.label}
                        </span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">
                        {n.actorName}
                        <span className="text-gray-400 font-normal text-xs ml-1">({n.actorRole})</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => fetchNotifs(nextCursor ?? undefined, true)}
            disabled={loading}
            className="px-6 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
