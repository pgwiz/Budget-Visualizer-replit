import { useLocation } from 'wouter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faUser, faSignOutAlt, faBell, faShieldAlt, faBars } from '@fortawesome/free-solid-svg-icons';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@workspace/api-client-react';
import { queryClient } from '@/lib/api';
import { useSidebar } from '@/context/sidebar';


const ROLE_LABELS: Record<string, string> = {
  super_admin:     'System Administrator',
  ceo:             'Chief Executive Officer',
  ministry_head:   'Ministry Head',
  department_head: 'Department Head',
  viewer:          'Read-only Viewer',
};

const ROLE_COLORS: Record<string, string> = {
  super_admin:     '#f87171',
  ceo:             '#fbbf24',
  ministry_head:   '#60a5fa',
  department_head: '#34d399',
  viewer:          '#94a3b8',
};

const PAGE_LABELS: Record<string, string> = {
  '':                   'Home',
  'dashboard':          'Dashboard',
  'sectors':            'Sectors',
  'allocations':        'Allocations',
  'cycles':             'Budget Cycles',
  'users':              'Users',
  'reports':            'Reports',
  'catalog':            'Product Catalog',
  'procurement':        'Procurement',
  'hierarchy-designer': 'Hierarchy Designer',
  'notifications':      'Notifications',
  'audit':              'Audit Log',
  'public':             'Public Portal',
};


export function TopBar() {
  const [location, navigate] = useLocation();
  const { user, isSuperAdmin } = useAuth();
  const { toggle } = useSidebar();

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        navigate('/login');
      },
      onError: () => {
        queryClient.clear();
        navigate('/login');
      },
    },
  });

  const pathKey   = location.split('/').filter(Boolean)[0] ?? '';
  const pageTitle = PAGE_LABELS[pathKey] ?? (pathKey.charAt(0).toUpperCase() + pathKey.slice(1));
  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? '#94a3b8';
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '';
  const initials  = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <header className="h-[60px] border-b border-[#343a40] bg-[#212529] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="md:hidden p-2 -ml-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          aria-label="Open menu"
        >
          <FontAwesomeIcon icon={faBars} className="w-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400 text-xs hidden sm:inline">Budget Monitor</span>
          <FontAwesomeIcon icon={faChevronRight} className="text-gray-500 w-3 hidden sm:inline" />
          <span className="text-white font-semibold text-sm">{pageTitle}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Admin pill */}
        {isSuperAdmin && (
          <div
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <FontAwesomeIcon icon={faShieldAlt} className="w-3" />
            Admin
          </div>
        )}

        {/* User menu */}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-1 py-1 pr-1 rounded-xl hover:bg-white/10 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
                <p className="text-[10px] font-semibold leading-tight" style={{ color: roleColor }}>{roleLabel}</p>
              </div>
              <Avatar className="h-8 w-8 border border-[#343a40]">
                <AvatarFallback className="text-xs font-bold bg-[#212529]" style={{ color: roleColor }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-[#212529] border-[#343a40] shadow-md text-white">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: roleColor }}>{roleLabel}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#343a40]" />
            <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer gap-2 text-gray-300">
              <FontAwesomeIcon icon={faUser} className="w-3" /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#343a40]" />
            <DropdownMenuItem
              onClick={() => logoutMutation.mutate()}
              className="focus:bg-red-500/10 text-red-400 focus:text-red-300 cursor-pointer gap-2"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="w-3" />
              {logoutMutation.isPending ? 'Signing out…' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
