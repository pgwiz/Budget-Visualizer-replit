import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faChartPie, faFileAlt, faProjectDiagram, faExchangeAlt,
  faShoppingCart, faBox, faUsers, faSitemap, faSyncAlt, faCog,
  faSignOutAlt, faChartLine, faChevronDown, faChevronUp, faCircleNodes, faUser, faSignal,
  faBell, faHistory, faGlobe, faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLogout, getGetMeQueryKey, useGetActiveCycle } from '@workspace/api-client-react';
import { queryClient } from '@/lib/api';
import { useSidebar } from '@/context/sidebar';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

function NavItem({ href, label, icon, active, onNavigate }: {
  href: string; label: string; icon: any; active: boolean; onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 px-3 py-2 mx-2 rounded-md transition-all duration-150 group text-sm',
        active
          ? 'bg-[#4B117A] text-white shadow-sm'
          : 'text-gray-300 hover:text-white hover:bg-white/10',
      )}
    >
      <FontAwesomeIcon icon={icon} className={cn('shrink-0 w-[18px] text-[15px]', active ? 'text-white' : 'text-gray-400 group-hover:text-white')} />
      <span className="font-medium tracking-wide">{label}</span>
    </Link>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pt-6 pb-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </span>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { user, isSuperAdmin, isCeo } = useAuth();
  const [, navigate] = useLocation();
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const { data: cycle } = useGetActiveCycle();

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
        navigate('/login');
        onNavigate?.();
      },
    },
  });

  const at = (href: string) => location === href || (href !== '/' && location.startsWith(href));

  return (
    <div className="flex flex-col h-full bg-[#212529] border-r border-[#343a40]">
      {/* ── Header ── */}
      <div className="flex items-center border-b border-[#343a40] h-[60px]">
        <div className="w-14 flex items-center justify-center border-r border-[#343a40] h-full">
          <FontAwesomeIcon icon={faCircleNodes} className="text-white text-xl" />
        </div>
        <div className="flex-1 flex items-center justify-between px-3 h-full">
          <div className="flex items-center gap-3 text-left truncate">
            <div className="flex items-center justify-center shrink-0">
              <FontAwesomeIcon icon={faUser} className="text-gray-400 w-5" />
            </div>
            <div className="truncate min-w-0">
               <div className="text-sm text-gray-200 font-bold truncate">{user?.name || 'Current User'}</div>
               <div className="text-[10px] text-gray-400 uppercase tracking-wider truncate">
                 {(user?.role || 'User').replace('_', ' ')}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 scrollbar-thin">
        <NavItem href="/"            label="Home"        icon={faHome}            active={location === '/'} onNavigate={onNavigate} />
        <NavItem href="/dashboard"   label="Dashboard"   icon={faChartPie} active={at('/dashboard')} onNavigate={onNavigate} />
        <NavItem href="/reports"     label="Reports"     icon={faFileAlt}        active={at('/reports')} onNavigate={onNavigate} />

        <SectionLabel label="Execution" />
        <NavItem href="/sectors"     label="Sectors"     icon={faProjectDiagram}         active={at('/sectors')} onNavigate={onNavigate} />
        <NavItem href="/allocations" label="Allocations" icon={faExchangeAlt}  active={at('/allocations')} onNavigate={onNavigate} />
        <NavItem href="/procurement" label="Procurement" icon={faShoppingCart}    active={at('/procurement')} onNavigate={onNavigate} />
        <NavItem href="/catalog"     label="Catalog"     icon={faBox}         active={at('/catalog')} onNavigate={onNavigate} />

        {(isCeo || isSuperAdmin) && (
          <>
            <SectionLabel label="Administration" />
            <NavItem href="/users"               label="Users"              icon={faUsers}    active={at('/users')} onNavigate={onNavigate} />
            {isSuperAdmin && (
              <>
                <NavItem href="/hierarchy-designer"  label="Hierarchy Designer" icon={faSitemap} active={at('/hierarchy-designer')} onNavigate={onNavigate} />
                <NavItem href="/cycles"              label="Budget Cycles"      icon={faSyncAlt} active={at('/cycles')} onNavigate={onNavigate} />
              </>
            )}
          </>
        )}

        <SectionLabel label="Workspace" />
        <NavItem href="/notifications" label="Notifications" icon={faBell}    active={at('/notifications')} onNavigate={onNavigate} />
        <NavItem href="/audit"         label="Audit Log"     icon={faHistory}  active={at('/audit')} onNavigate={onNavigate} />
        <NavItem href="/public"        label="Public Portal" icon={faGlobe}    active={at('/public')} onNavigate={onNavigate} />
        <NavItem href="/settings"      label="Settings"      icon={faCog}      active={at('/settings')} onNavigate={onNavigate} />
      </nav>

      {/* ── System Status ── */}
      <div className="h-12 border-t border-[#343a40] flex items-center gap-3 px-4 text-gray-300 w-full bg-[#212529]/50">
        <FontAwesomeIcon icon={faSignal} className="text-emerald-400 w-5 animate-pulse" />
        <span className="text-xs font-semibold tracking-wide">
          {cycle?.name ?? 'Budget Monitor'} · <span className="text-emerald-400">Live</span>
        </span>
      </div>

      {/* ── Footer / Sign Out ── */}
      <button 
        onClick={() => logoutMutation.mutate()}
        className="h-12 border-t border-[#343a40] flex items-center gap-3 px-4 hover:bg-white/5 cursor-pointer transition-colors text-gray-300 hover:text-white w-full"
      >
        <FontAwesomeIcon icon={faSignOutAlt} className="text-gray-400 w-5" />
        <span className="text-sm font-medium tracking-wide">Sign out</span>
      </button>
    </div>
  );
}

export function Sidebar() {
  const { isOpen, close } = useSidebar();

  const sidebarStyle: React.CSSProperties = {
    background: '#212529',
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
                <FontAwesomeIcon icon={faTimes} className="text-base" />
              </button>
              <SidebarContent onNavigate={close} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
