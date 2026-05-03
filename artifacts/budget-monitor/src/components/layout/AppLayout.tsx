import { Sidebar }    from './Sidebar';
import { TopBar }     from './TopBar';
import { BottomNav }  from './BottomNav';
import { SidebarProvider } from '@/context/sidebar';

interface AppLayoutProps { children: React.ReactNode }

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-transparent">
        <Sidebar />

        {/* Main area — pushed right on desktop, full-width on mobile */}
        <div className="flex-1 flex flex-col min-h-screen md:ml-60">
          <TopBar />
          <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
