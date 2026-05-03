import {
  Home, LayoutDashboard, Network, ArrowLeftRight, RefreshCw,
  Users, FileText, LogOut, Workflow, ShoppingCart, Package,
  Shield, Settings2, X,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLogout, getGetMeQueryKey } from '@workspace/api-client-react';
import { queryClient } from '@/lib/api';
import { useSidebar } from '@/context/sidebar';
import { AnimatePresence, motion } from 'framer-motion';

const ROLE_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  super_admin:     { label: 'System Administrator', color: '#f87171', bg: 'rgba(239,68,68,0.12)',    border: 'rgba(239,68,68,0.25)' },
  ceo:             { label: 'Chief Executive',       color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)' },
  ministry_head:   { label: 'Ministry Head',         color: '#60a5fa', bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)' },
  department_head: { label: 'Department Head',       color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  viewer:          { label: 'Read-only Viewer',      color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.15)' },
};

function NavItem({ href, label, icon: Icon, active, onNavigate }: {
  href: string; label: string; icon: React.ElementType; active: boolean; onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group text-sm',
        active
          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          : 'text-white/55 hover:text-white hover:bg-white/5 border border-transparent',
      )}
    >
      <Icon size={17} className={cn('shrink-0 transition-colors', active ? 'text-blue-400' : 'text-white/35 group-hover:text-white/60')} />
      <span className="font-medium leading-none">{label}</span>
    </Link>
  );
}

function SectionLabel({ label, icon: Icon, color }: { label: string; icon?: React.ElementType; color?: string }) {
  return (
    <div className="flex items-center gap-2 px-3 pt-4 pb-1">
      {Icon && <Icon size={11} style={{ color: color ?? 'rgba(255,255,255,0.25)' }} />}
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: color ?? 'rgba(255,255,255,0.25)' }}>
        {label}
      </span>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { user, isSuperAdmin, isCeo } = useAuth();
  const [, navigate] = useLocation();

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
        navigate('/login');
        onNavigate?.();
      },
    },
  });

  const roleMeta = ROLE_META[user?.role ?? ''] ?? ROLE_META.viewer;
  const at = (href: string) => location === href || (href !== '/' && location.startsWith(href));

  return (
    <>
      {/* ── Logo ── */}
      <div className="px-5 pt-6 pb-4 border-b border-white/6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <Shield size={14} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-white leading-none">Budget Monitor</p>
            <p className="text-[9px] text-white/25 uppercase tracking-wider mt-0.5 leading-none">Gov Resource System</p>
          </div>
        </div>
      </div>

      {/* ── User identity badge ── */}
      <div className="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl border"
        style={{ background: roleMeta.bg, borderColor: roleMeta.border }}>
        <p className="text-xs font-bold text-white truncate leading-none">{user?.name}</p>
        <p className="text-[10px] mt-0.5 font-semibold leading-none" style={{ color: roleMeta.color }}>
          {roleMeta.label}
        </p>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 scrollbar-thin">
        <SectionLabel label="Main" />
        <NavItem href="/"            label="Home"        icon={Home}            active={location === '/'} onNavigate={onNavigate} />
        <NavItem href="/dashboard"   label="Dashboard"   icon={LayoutDashboard} active={at('/dashboard')} onNavigate={onNavigate} />
        <NavItem href="/sectors"     label="Sectors"     icon={Network}         active={at('/sectors')} onNavigate={onNavigate} />
        <NavItem href="/allocations" label="Allocations" icon={ArrowLeftRight}  active={at('/allocations')} onNavigate={onNavigate} />
        <NavItem href="/procurement" label="Procurement" icon={ShoppingCart}    active={at('/procurement')} onNavigate={onNavigate} />
        <NavItem href="/catalog"     label="Catalog"     icon={Package}         active={at('/catalog')} onNavigate={onNavigate} />
        <NavItem href="/reports"     label="Reports"     icon={FileText}        active={at('/reports')} onNavigate={onNavigate} />

        {isCeo && !isSuperAdmin && (
          <>
            <SectionLabel label="Leadership" color="#fbbf24" />
            <NavItem href="/users" label="Team & Users" icon={Users} active={at('/users')} onNavigate={onNavigate} />
          </>
        )}

        {isSuperAdmin && (
          <>
            <div className="mx-3 my-3 border-t border-white/8" />
            <div className="flex items-center gap-2 px-3 pb-1">
              <Settings2 size={11} className="text-rose-400/70" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-rose-400/70">Administration</span>
            </div>
            <NavItem href="/users"               label="Users"              icon={Users}    active={at('/users')} onNavigate={onNavigate} />
            <NavItem href="/hierarchy-designer"  label="Hierarchy Designer" icon={Workflow} active={at('/hierarchy-designer')} onNavigate={onNavigate} />
            <NavItem href="/cycles"              label="Budget Cycles"      icon={RefreshCw} active={at('/cycles')} onNavigate={onNavigate} />
          </>
        )}
      </nav>

      {/* ── Logout ── */}
      <div className="px-2 pb-4 pt-2 border-t border-white/6">
        <button
          onClick={() => logoutMutation.mutate()}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-rose-400/70 hover:text-rose-400 hover:bg-rose-400/8 transition-all group text-sm"
        >
          <LogOut size={17} className="shrink-0 transition-colors" />
          <span className="font-medium">Sign out</span>
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { isOpen, close } = useSidebar();

  const sidebarStyle: React.CSSProperties = {
    background: 'rgba(9,14,29,0.97)',
    backdropFilter: 'blur(20px)',
  };

  return (
    <>
      {/* ── Desktop sidebar (always visible ≥ md) ── */}
      <aside
        className="hidden md:flex w-60 flex-col h-screen fixed left-0 top-0 z-20 border-r border-white/8"
        style={sidebarStyle}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              style={{ backdropFilter: 'blur(4px)' }}
            />

            {/* Drawer panel */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="md:hidden fixed left-0 top-0 z-50 w-72 h-full flex flex-col border-r border-white/8"
              style={sidebarStyle}
            >
              {/* Close button */}
              <button
                onClick={close}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/8 transition-colors z-10"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={close} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
