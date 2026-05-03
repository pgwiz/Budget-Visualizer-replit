import { useState } from 'react';
import { useLogin } from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLocation } from 'wouter';
import { Mail, Lock } from 'lucide-react';
import { queryClient } from '@/lib/api';
import { getGetMeQueryKey } from '@workspace/api-client-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [, setLocation] = useLocation();
  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation('/');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Budget Monitor
          </h1>
          <p className="text-white/40">
            Government Resource Tracking System
          </p>
        </div>

        <GlassCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {loginMutation.isError && (
              <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400">
                <AlertDescription>
                  Invalid email or password. Please try again.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/60">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-white/20" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 glass border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 text-white placeholder:text-white/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" title="password" className="text-white/60">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-white/20" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 glass border-white/10 focus:border-blue-500/50 focus:ring-blue-500/20 text-white placeholder:text-white/20"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-6 rounded-xl transition-all duration-200"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? <LoadingSpinner size={20} className="p-0 text-white" /> : 'Sign In'}
            </Button>
          </form>
        </GlassCard>
        
        <p className="text-center text-white/20 text-sm">
          Protected government system. Authorized access only.
        </p>
      </div>
    </div>
  );
}
