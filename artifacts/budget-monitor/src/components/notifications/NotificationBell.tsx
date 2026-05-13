import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell, faCheck, faCheckDouble, faExternalLinkAlt,
  faCoins, faBan, faShoppingCart, faThumbsUp, faTimesCircle,
  faSignInAlt, faFileAlt, faLayerGroup, faChartLine, faWallet,
} from '@fortawesome/free-solid-svg-icons';

/* ── Action type display config ─────────────────────────────── */
const ACTION_CFG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  ALLOCATION_CREATED:          { label: 'Allocation Made',    icon: faCoins,        color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
  ALLOCATION_REVOKED:          { label: 'Allocation Revoked', icon: faBan,          color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
  PROCUREMENT_ORDER_CREATED:   { label: 'PO Raised',         icon: faShoppingCart,  color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
  PROCUREMENT_ORDER_APPROVED:  { label: 'PO Approved',       icon: faThumbsUp,      color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
  PROCUREMENT_ORDER_REJECTED:  { label: 'PO Rejected',       icon: faTimesCircle,   color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
  USER_LOGIN:                  { label: 'User Login',         icon: faSignInAlt,     color: '#4B117A', bg: 'rgba(75,17,122,0.12)' },
  REPORT_GENERATED:            { label: 'Report Generated',   icon: faFileAlt,       color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
  SECTOR_CREATED:              { label: 'Sector Created',     icon: faLayerGroup,    color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
  SECTOR_UPDATED:              { label: 'Sector Updated',     icon: faLayerGroup,    color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
  BUDGET_UPDATED:              { label: 'Budget Updated',     icon: faWallet,        color: '#4B117A', bg: 'rgba(75,17,122,0.15)' },
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

function entityPath(entityType: string, entityId: number | null): string | null {
  if (!entityId) return null;
  if (entityType === 'allocation') return `/allocations`;
  if (entityType === 'procurement') return `/procurement`;
  return null;
}

/* ── Notification Item ──────────────────────────────────────── */
function NotifItem({ notif, onRead }: { notif: any; onRead: (id: number) => void }) {
  const [, navigate] = useLocation();
  const cfg = ACTION_CFG[notif.actionType] ?? ACTION_CFG['USER_LOGIN'];

  const handleClick = () => {
    onRead(notif.id);
    const path = entityPath(notif.entityType, notif.entityId);
    if (path) navigate(path);
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors relative"
      style={{ borderLeft: notif.isRead ? '3px solid transparent' : '3px solid #3b82f6' }}
    >
      {/* Icon */}
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: cfg.bg }}>
        <FontAwesomeIcon icon={cfg.icon} className="text-[13px]" style={{ color: cfg.color }} />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md" style={{ color: cfg.color, background: cfg.bg }}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-gray-700 mt-0.5 leading-snug font-medium">
          {notif.actorName}
          <span className="text-gray-400 font-normal"> ({notif.actorRole})</span>
        </p>
        <p className="text-[11px] text-gray-400 mt-0.5">{timeAgo(notif.createdAt)}</p>
      </div>
    </button>
  );
}

/* ── Main Bell Component ─────────────────────────────────────── */
export function NotificationBell() {
  const [, navigate] = useLocation();
  const [open, setOpen]           = useState(false);
  const [count, setCount]         = useState(0);
  const [notifs, setNotifs]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(false);
  const dropdownRef               = useRef<HTMLDivElement>(null);
  const esRef                     = useRef<EventSource | null>(null);

  /* ── Fetch unread count ─────────────────────────── */
  const fetchCount = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications/unread-count', { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setCount(d.count ?? 0); }
    } catch { /* ignore */ }
  }, []);

  /* ── Fetch notifications list ───────────────────── */
  const fetchNotifs = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/notifications?limit=15', { credentials: 'include' });
      if (r.ok) {
        const d = await r.json();
        setNotifs(d.notifications ?? []);
        setCount(d.totalUnread ?? 0);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  /* ── SSE connection ─────────────────────────────── */
  useEffect(() => {
    fetchCount();

    const es = new EventSource('/api/notifications/stream', { withCredentials: true });
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'NEW_NOTIFICATION') {
          setCount(c => c + 1);
          setNotifs(prev => [data.notification, ...prev.slice(0, 14)]);
        }
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      // Fallback: poll every 60 seconds
    };

    // Fallback poll
    const poll = setInterval(fetchCount, 60_000);

    return () => {
      es.close();
      clearInterval(poll);
    };
  }, [fetchCount]);

  /* ── Close on outside click ─────────────────────── */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── Toggle dropdown ────────────────────────────── */
  const handleOpen = () => {
    if (!open) fetchNotifs();
    setOpen(o => !o);
  };

  /* ── Mark one as read ───────────────────────────── */
  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST', credentials: 'include' });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setCount(c => Math.max(0, c - 1));
  };

  /* ── Mark all as read ───────────────────────────── */
  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST', credentials: 'include' });
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
    setCount(0);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <motion.button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-xl hover:shadow-2xl transition-all text-[#94a3b8] hover:text-[#4B117A] cursor-pointer"
        title="Notifications"
        id="notification-bell"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <FontAwesomeIcon icon={faBell} className="text-[26px]" />
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.7 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none"
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 bottom-full mb-4 w-80 rounded-2xl border border-gray-200 bg-white shadow-2xl z-50 overflow-hidden"
            style={{ maxHeight: '480px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faBell} className="text-[13px] text-gray-500" />
                <span className="text-sm font-bold text-gray-900">Notifications</span>
                {count > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">{count} unread</span>
                )}
              </div>
              {count > 0 && (
                <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors font-semibold">
                  <FontAwesomeIcon icon={faCheckDouble} className="text-[11px]" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto divide-y divide-gray-50" style={{ maxHeight: '360px' }}>
              {loading ? (
                <div className="py-8 text-center text-gray-400 text-sm">Loading...</div>
              ) : notifs.length === 0 ? (
                <div className="py-10 text-center">
                  <FontAwesomeIcon icon={faBell} className="text-[28px] text-gray-200 mb-2" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              ) : (
                notifs.map(n => (
                  <NotifItem key={n.id} notif={n} onRead={markRead} />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-2.5">
              <button
                onClick={() => { setOpen(false); navigate('/notifications'); }}
                className="flex items-center gap-1.5 text-[12px] text-blue-500 hover:text-blue-700 font-semibold transition-colors w-full justify-center"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[11px]" />
                View all notifications
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
