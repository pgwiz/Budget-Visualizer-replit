import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogin } from '@workspace/api-client-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useLocation } from 'wouter';
import { Mail, Lock, Eye, EyeOff, Shield, BarChart3, GitBranch, Users, AlertTriangle } from 'lucide-react';
import { queryClient } from '@/lib/api';
import { getGetMeQueryKey } from '@workspace/api-client-react';

const FEATURES = [
  { icon: BarChart3,  title: 'Real-time Budget Tracking',   desc: 'Live utilization metrics across all ministries and departments.' },
  { icon: GitBranch, title: 'Hierarchical Allocation',      desc: 'Multi-level budget flows from National Pool down to sub-sectors.' },
  { icon: Users,     title: 'Role-based Access Control',    desc: 'Scoped views for super-admins, CEOs, ministers, and viewers.' },
];

function Orb({ x, y, size, color, delay }: { x: string; y: string; size: number; color: string; delay: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: x, top: y, width: size, height: size, background: color, filter: 'blur(80px)' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  );
}

export default function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [, setLocation]         = useLocation();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setLocation('/');
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { email, password } });
  };

  return (
    <div className="min-h-screen w-full flex overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#060b18 0%,#0a1020 50%,#060d1f 100%)' }}>

      {/* ── Ambient orbs ── */}
      <Orb x="-10%"  y="10%"  size={500} color="rgba(59,130,246,0.22)"  delay={0} />
      <Orb x="60%"   y="55%"  size={450} color="rgba(99,102,241,0.18)"  delay={2} />
      <Orb x="20%"   y="65%"  size={350} color="rgba(16,185,129,0.12)"  delay={4} />
      <Orb x="80%"   y="-5%"  size={320} color="rgba(59,130,246,0.15)"  delay={1} />

      {/* ── Subtle dot grid ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '32px 32px' }}
      />

      {/* ════════════════════════════════════════ LEFT BRAND PANEL */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="hidden lg:flex flex-col justify-between w-[52%] p-14 relative z-10"
      >
        {/* Logo mark */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-base leading-none">Budget Monitor</p>
            <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">Gov Resource System</p>
          </div>
        </div>

        {/* Central hero text */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
          >
            <h1 className="text-5xl font-extrabold leading-[1.15] tracking-tight">
              <span className="text-white">National</span>
              <br />
              <span style={{ background: 'linear-gradient(90deg,#3b82f6,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Budget Control
              </span>
              <br />
              <span className="text-white">Platform</span>
            </h1>
            <p className="text-white/40 text-base mt-4 leading-relaxed max-w-sm">
              Transparent allocation, real-time monitoring and hierarchical oversight for Kenya's fiscal year budget.
            </p>
          </motion.div>

          {/* Feature list */}
          <motion.div
            className="space-y-4 mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.6 }}
          >
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.45 }}
                className="flex items-start gap-4"
              >
                <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center border border-white/10" style={{ background: 'rgba(59,130,246,0.12)' }}>
                  <Icon size={16} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-semibold">{title}</p>
                  <p className="text-white/30 text-xs mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Bottom strip */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <p className="text-white/20 text-xs tracking-wider">REPUBLIC OF KENYA · FY 2024/25</p>
          <div className="h-px flex-1 bg-white/10" />
        </div>
      </motion.div>

      {/* ════════════════════════════════════════ RIGHT FORM PANEL */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex-1 flex items-center justify-center p-6 lg:p-16 relative z-10"
      >
        <div className="w-full max-w-md space-y-8">

          {/* Mobile-only logo */}
          <div className="lg:hidden text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
              <Shield size={24} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Budget Monitor</h1>
            <p className="text-white/40 text-sm">Government Resource Tracking System</p>
          </div>

          {/* Card */}
          <div
            className="relative rounded-2xl p-8 space-y-6"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Animated top border accent */}
            <div className="absolute top-0 left-8 right-8 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.7), rgba(59,130,246,0.7), transparent)' }} />

            {/* Heading */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-white/40 text-sm">Sign in to access the budget control dashboard</p>
            </div>

            {/* Error */}
            <AnimatePresence>
              {loginMutation.isError && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl border border-rose-500/30 bg-rose-500/10"
                >
                  <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-rose-400 text-sm">Invalid email or password. Please try again.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/50 text-xs uppercase tracking-wider font-semibold">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="minister@treasury.go.ke"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 text-sm text-white placeholder:text-white/20 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-white/50 text-xs uppercase tracking-wider font-semibold">
                  Password
                </Label>
                <div className="relative group">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 group-focus-within:text-blue-400 transition-colors" />
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 pr-11 h-11 text-sm text-white placeholder:text-white/20 rounded-xl transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loginMutation.isPending}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="w-full h-11 rounded-xl font-semibold text-sm text-white relative overflow-hidden transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 24px rgba(59,130,246,0.35)' }}
              >
                {loginMutation.isPending ? (
                  <LoadingSpinner size={18} className="p-0 text-white" />
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Shield size={15} />
                    Sign In Securely
                  </span>
                )}
              </motion.button>
            </form>

            {/* Demo credentials hint */}
            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <p className="text-white/15 text-[10px] text-center uppercase tracking-wider font-bold">Demo Accounts · password: password</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { email: 'admin@tvetauthority.go.ke', role: 'Sys Admin', color: '#f87171' },
                  { email: 'dg@tvetauthority.go.ke',    role: 'Director General', color: '#fbbf24' },
                  { email: 'principal@tonp.ac.ke',      role: 'Principal TONP', color: '#60a5fa' },
                  { email: 'hod.ict@tonp.ac.ke',        role: 'HOD ICT', color: '#34d399' },
                ].map(a => (
                  <button
                    key={a.email}
                    type="button"
                    onClick={() => { setEmail(a.email); setPassword('password'); }}
                    className="text-left px-2.5 py-1.5 rounded-lg border border-white/8 hover:border-white/20 bg-white/3 hover:bg-white/6 transition-all"
                  >
                    <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: a.color }}>{a.role}</p>
                    <p className="text-[9px] text-white/30 font-mono truncate">{a.email}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-center text-white/15 text-xs flex items-center justify-center gap-2">
            <Shield size={11} />
            Protected government system. Authorized access only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
