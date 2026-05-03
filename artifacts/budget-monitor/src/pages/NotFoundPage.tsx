import { Link } from 'wouter';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full text-center p-12">
        <h1 className="text-6xl font-bold text-blue-500 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-2">Page Not Found</h2>
        <p className="text-white/40 mb-8">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button className="bg-blue-600 hover:bg-blue-500 text-white gap-2 px-8 py-6 rounded-xl text-lg font-semibold">
            <Home size={20} />
            Back to Dashboard
          </Button>
        </Link>
      </GlassCard>
    </div>
  );
}
