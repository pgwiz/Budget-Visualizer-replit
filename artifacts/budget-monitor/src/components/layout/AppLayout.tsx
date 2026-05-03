import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        <TopBar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
