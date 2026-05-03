import { 
  Home,
  LayoutDashboard, 
  Network, 
  ArrowLeftRight, 
  RefreshCw, 
  Users, 
  FileText, 
  LogOut,
  Workflow,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLogout, getGetMeQueryKey } from '@workspace/api-client-react';
import { queryClient } from '@/lib/api';

export function Sidebar() {
  const [location] = useLocation();
  const { user, isSuperAdmin, isCeo } = useAuth();
  const [, navigate] = useLocation();
  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
        navigate('/login');
      },
    },
  });

  const navItems = [
    { href: '/',          label: 'Home',      icon: Home,            show: true },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
    { href: '/sectors', label: 'Sectors', icon: Network, show: true },
    { href: '/hierarchy-designer', label: 'Designer', icon: Workflow, show: isSuperAdmin || isCeo },
    { href: '/allocations', label: 'Allocations', icon: ArrowLeftRight, show: true },
    { href: '/cycles', label: 'Cycles', icon: RefreshCw, show: isSuperAdmin },
    { href: '/users', label: 'Users', icon: Users, show: isSuperAdmin || isCeo },
    { href: '/reports', label: 'Reports', icon: FileText, show: true },
  ];

  return (
    <aside className="w-64 glass rounded-none border-y-0 border-l-0 border-r border-white/10 flex flex-col h-screen fixed left-0 top-0 z-20">
      <div className="p-6">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
          Budget Monitor
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.filter(item => item.show).map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
              )}>
                <item.icon size={20} className={cn(
                  "transition-colors",
                  isActive ? "text-blue-400" : "text-white/40 group-hover:text-white/60"
                )} />
                <span className="font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={() => logoutMutation.mutate()}
          className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-rose-400 hover:bg-rose-400/10 transition-colors group"
        >
          <LogOut size={20} className="text-rose-400/60 group-hover:text-rose-400" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
