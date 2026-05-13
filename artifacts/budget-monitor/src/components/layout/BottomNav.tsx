import { Link, useLocation } from 'wouter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faChartPie, faExchangeAlt, faShoppingCart, faFileAlt } from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/',            label: 'Home',       icon: faHome           },
  { href: '/dashboard',   label: 'Dashboard',  icon: faChartPie       },
  { href: '/allocations', label: 'Funds',      icon: faExchangeAlt    },
  { href: '/procurement', label: 'Orders',     icon: faShoppingCart   },
  { href: '/reports',     label: 'Reports',    icon: faFileAlt        },
];

export function BottomNav() {
  const [location] = useLocation();
  const at = (href: string) => href === '/' ? location === '/' : location.startsWith(href);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-gray-200 flex items-stretch bg-white"
    >
      {TABS.map(t => {
        const active = at(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              'relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-all',
              active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800',
            )}
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-blue-600" />
            )}
            <FontAwesomeIcon
              icon={t.icon}
              className={cn('text-lg transition-all', active ? 'text-blue-600' : 'text-gray-400')}
            />
            <span className="leading-none">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
