import { useLocation } from 'wouter';
import { ChevronRight, User as UserIcon, LogOut, Bell, Shield } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/hooks/useAuth';
import { useLogout, getGetMeQueryKey } from '@workspace/api-client-react';
import { queryClient } from '@/lib/api';

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
};

export function TopBar() {
  const [location] = useLocation();
  const { user, isSuperAdmin } = useAuth();
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
      },
    },
  });

  const pathKey = location.split('/').filter(Boolean)[0] ?? '';
  const pageTitle = PAGE_LABELS[pathKey] ?? (pathKey.charAt(0).toUpperCase() + pathKey.slice(1));
  const roleColor = ROLE_COLORS[user?.role ?? ''] ?? '#94a3b8';
  const roleLabel = ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '';
  const initials  = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';

  return (
    <header className="h-14 border-b border-white/8 flex items-center justify-between px-6 sticky top-0 z-10 backdrop-blur-xl"
      style={{ background: 'rgba(9,14,29,0.85)' }}>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white/25 text-xs">Budget Monitor</span>
        <ChevronRight size={13} className="text-white/15" />
        <span className="text-white font-semibold text-sm">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Admin indicator pill */}
        {isSuperAdmin && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Shield size={10} />
            Admin
          </div>
        )}

        {/* Notifications */}
        <button className="p-2 text-white/30 hover:text-white/70 transition-colors rounded-xl hover:bg-white/5">
          <Bell size={17} />
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 pl-1 py-1 pr-1 rounded-xl hover:bg-white/5 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-white leading-tight">{user?.name}</p>
                <p className="text-[10px] font-semibold leading-tight" style={{ color: roleColor }}>{roleLabel}</p>
              </div>
              <Avatar className="h-8 w-8 border border-white/10">
                <AvatarFallback className="text-xs font-bold" style={{ background: `${roleColor}20`, color: roleColor }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass border-white/10 text-white">
            <DropdownMenuLabel className="font-normal">
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="text-xs mt-0.5" style={{ color: roleColor }}>{roleLabel}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer gap-2 text-white/70">
              <UserIcon size={14} /> Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => logoutMutation.mutate()}
              className="focus:bg-rose-400/10 text-rose-400 focus:text-rose-400 cursor-pointer gap-2"
            >
              <LogOut size={14} /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
