import { useLocation } from 'wouter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronRight, faChevronDown, faUser, faSignOutAlt, faShieldAlt, faBars, faCircleNodes, faSearch, faPlus } from '@fortawesome/free-solid-svg-icons';
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
    <header className="h-[60px] border-b border-[#343a40] bg-[#212529] flex items-center justify-between fixed top-0 left-0 right-0 w-full z-50">
      <div className="flex items-center h-full">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="md:hidden flex items-center justify-center w-14 h-full border-r border-[#343a40] text-gray-400 hover:text-white transition-colors"
          aria-label="Open menu"
        >
          <FontAwesomeIcon icon={faBars} className="w-5" />
        </button>

        {/* Top left Icon (Logo substitute) */}
        <div className="hidden md:flex items-center justify-center w-14 h-full border-r border-[#343a40]">
          <FontAwesomeIcon icon={faCircleNodes} className="text-white text-xl" />
        </div>

        {/* Workspace/User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-4 sm:px-5 h-full border-r border-[#343a40] hover:bg-white/5 transition-colors focus:outline-none">
              <FontAwesomeIcon icon={faUser} className="text-white text-[15px]" />
              <div className="text-left hidden sm:flex flex-col justify-center">
                <span className="text-sm font-medium text-gray-200 leading-tight truncate max-w-[150px]">{user?.name}</span>
                <span className="text-[10px] uppercase tracking-wider leading-tight" style={{ color: roleColor }}>{roleLabel}</span>
              </div>
              <FontAwesomeIcon icon={faChevronDown} className="text-gray-500 text-[10px] ml-1 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 bg-[#212529] border-[#343a40] shadow-md text-white mt-1 ml-14 sm:ml-0">
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

        {/* Current Page */}
        <div className="flex items-center gap-3 px-4 sm:px-5 h-full">
          <span className="text-gray-200 font-medium text-sm hidden sm:block">{pageTitle}</span>
        </div>
      </div>

      <div className="flex items-center h-full gap-3 px-4">
        {/* Global Search Button Placeholder */}
        <button className="hidden sm:flex items-center gap-2 px-3 h-8 rounded-md bg-[#161b22] border border-[#343a40] hover:bg-[#343a40] transition-colors text-gray-400 text-xs">
          <FontAwesomeIcon icon={faSearch} />
          <span>Search</span>
          <span className="ml-2 bg-[#212529] border border-[#343a40] px-1 rounded text-[10px] font-mono">⌘K</span>
        </button>

        {/* Admin pill */}
        {isSuperAdmin && (
          <div className="hidden sm:flex items-center gap-1.5 px-2 text-[11px] font-bold text-gray-200 uppercase tracking-wider">
            <FontAwesomeIcon icon={faShieldAlt} className="w-3.5" />
            Admin
          </div>
        )}
      </div>
    </header>
  );
}
