import { Link, useLocation } from 'wouter';
import { Home, LayoutDashboard, ArrowLeftRight, ShoppingCart, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/',            label: 'Home',       icon: Home           },
  { href: '/dashboard',   label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/allocations', label: 'Funds',      icon: ArrowLeftRight  },
  { href: '/procurement', label: 'Orders',     icon: ShoppingCart    },
  { href: '/reports',     label: 'Reports',    icon: FileText        },
];

export function BottomNav() {
  const [location] = useLocation();
  const at = (href: string) => href === '/' ? location === '/' : location.startsWith(href);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/8 flex items-stretch"
      style={{ background: 'rgba(9,14,29,0.97)', backdropFilter: 'blur(20px)' }}
    >
      {TABS.map(t => {
        const active = at(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-all',
              active ? 'text-blue-400' : 'text-white/35 hover:text-white/60',
            )}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-400" />
            )}
            <t.icon
              size={20}
              className={cn('transition-all', active ? 'text-blue-400' : 'text-white/30')}
              strokeWidth={active ? 2.5 : 1.8}
            />
            <span className="leading-none">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
