import { Sidebar }    from './Sidebar';
import { TopBar }     from './TopBar';
import { BottomNav }  from './BottomNav';
import { SidebarProvider } from '@/context/sidebar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLocation, Link } from 'wouter';
import { 
  faBell, faHome, faChartPie, faProjectDiagram, faExchangeAlt, 
  faSyncAlt, faUsers, faFileAlt, faBox, faShoppingCart, faSitemap, faHandPaper 
} from '@fortawesome/free-solid-svg-icons';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogTrigger, DialogFooter, DialogClose
} from '@/components/ui/dialog';

const ROUTE_ICONS: Record<string, any> = {
  '': faHome,
  'dashboard': faChartPie,
  'sectors': faProjectDiagram,
  'allocations': faExchangeAlt,
  'cycles': faSyncAlt,
  'users': faUsers,
  'reports': faFileAlt,
  'catalog': faBox,
  'procurement': faShoppingCart,
  'hierarchy-designer': faSitemap,
};

function BackgroundWatermark() {
  const [location] = useLocation();
  const pathKey = location.split('/').filter(Boolean)[0] ?? '';
  const icon = ROUTE_ICONS[pathKey] || faHome;

  return (
    <div className="fixed bottom-0 right-0 pointer-events-none z-0 overflow-hidden w-[600px] h-[600px] flex items-end justify-end">
      <motion.div
        key={pathKey}
        initial={{ opacity: 0, scale: 0.8, rotate: -15, x: 50, y: 50 }}
        animate={{ opacity: 0.03, scale: 1, rotate: -25, x: 120, y: 120 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <FontAwesomeIcon icon={icon} style={{ fontSize: '480px', color: '#1f2937' }} />
      </motion.div>
    </div>
  );
}

interface AppLayoutProps { children: React.ReactNode }

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-transparent relative">
        <BackgroundWatermark />
        
        <Sidebar />

        {/* Main area — pushed right on desktop, full-width on mobile */}
        <div className="flex-1 flex flex-col min-h-screen md:ml-60">
          <TopBar />
          <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8 relative z-10">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <BottomNav />

        {/* Welcome Hand Modal & Trigger */}
        <Dialog>
          <DialogTrigger asChild>
            <motion.button
              className="fixed bottom-[100px] right-6 z-50 flex items-center justify-center cursor-pointer outline-none drop-shadow-xl"
              animate={{ rotate: [0, 15, -10, 15, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2, ease: 'easeInOut' }}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Welcome"
            >
              <FontAwesomeIcon icon={faHandPaper} style={{ fontSize: '38px', color: '#fbbf24' }} />
            </motion.button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-[#212529] border-[#343a40] text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl text-white flex items-center gap-2">
                <FontAwesomeIcon icon={faHandPaper} className="text-yellow-400" /> Welcome!
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Let's get you acquainted with the Budget Monitor system.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
               <div className="w-full h-36 bg-[#161b22] rounded-xl flex items-center justify-center overflow-hidden border border-[#343a40] relative">
                  <FontAwesomeIcon icon={faProjectDiagram} className="text-6xl text-blue-500 opacity-30 absolute -right-4 -bottom-4" />
                  <FontAwesomeIcon icon={faChartPie} className="text-4xl text-purple-500 opacity-20 absolute top-4 left-4" />
                  <h3 className="text-lg font-bold z-10 drop-shadow-md">National Budget Control</h3>
               </div>
               <p className="text-sm text-gray-300 leading-relaxed">
                 Explore the real-time budget tracking, hierarchical allocation flows, and more. Need help navigating the architecture? Check out our documented pitchdeck.
               </p>
            </div>
            <DialogFooter className="flex gap-2">
               <Link href="/documentation" className="flex-1">
                 <DialogClose asChild>
                   <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm">
                     View Documented Pitchdeck
                   </button>
                 </DialogClose>
               </Link>
               <DialogClose asChild>
                 <button className="flex-1 bg-[#343a40] hover:bg-[#495057] text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm border border-[#495057]">
                   Take System Tour
                 </button>
               </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Floating Notification FAB → uses the live NotificationBell component */}
        <div className="fixed bottom-6 right-6 z-50 drop-shadow-xl flex items-center justify-center">
          <NotificationBell />
        </div>

      </div>
    </SidebarProvider>
  );
}
