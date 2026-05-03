import { useLocation } from 'wouter';
import { 
  ChevronRight, 
  User as UserIcon, 
  LogOut,
  Bell
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '@/hooks/useAuth';
import { useLogout } from '@workspace/api-client-react';

export function TopBar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const logoutMutation = useLogout();

  const pathParts = location.split('/').filter(Boolean);
  const pageTitle = pathParts.length > 0 
    ? pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1)
    : 'Dashboard';

  return (
    <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 sticky top-0 z-10 bg-transparent backdrop-blur-md">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white/40">Pages</span>
        <ChevronRight size={14} className="text-white/20" />
        <span className="text-white font-medium">{pageTitle}</span>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-white/40 hover:text-white transition-colors">
          <Bell size={20} />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 pl-2 py-1 pr-1 rounded-full hover:bg-white/5 transition-colors">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-white/40 capitalize">{user?.role.replace('_', ' ')}</p>
              </div>
              <Avatar className="h-8 w-8 border border-white/10">
                <AvatarFallback className="bg-blue-500/20 text-blue-400 text-xs">
                  {user?.name?.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 glass border-white/10 text-white">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="focus:bg-white/10 focus:text-white cursor-pointer gap-2">
              <UserIcon size={16} />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              onClick={() => logoutMutation.mutate()}
              className="focus:bg-rose-400/10 text-rose-400 focus:text-rose-400 cursor-pointer gap-2"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
