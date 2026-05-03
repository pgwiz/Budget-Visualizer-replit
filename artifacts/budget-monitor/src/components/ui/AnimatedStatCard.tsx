import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from '@/components/hierarchy/AnimatedCounter';
import { motion } from 'framer-motion';

interface AnimatedStatCardProps {
  icon: LucideIcon;
  label: string;
  rawValue: number;
  formatFn: (v: number) => string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  sub?: string;
  onClick?: () => void;
  className?: string;
  index?: number;
}

const colorMap = {
  primary:  { text: 'text-blue-400',    bg: 'bg-blue-400/10',    ring: 'rgba(59,130,246,0.3)' },
  success:  { text: 'text-emerald-400', bg: 'bg-emerald-400/10', ring: 'rgba(16,185,129,0.3)' },
  warning:  { text: 'text-amber-400',   bg: 'bg-amber-400/10',   ring: 'rgba(245,158,11,0.3)' },
  danger:   { text: 'text-rose-400',    bg: 'bg-rose-400/10',    ring: 'rgba(239,68,68,0.3)'  },
};

export function AnimatedStatCard({
  icon: Icon,
  label,
  rawValue,
  formatFn,
  color = 'primary',
  sub,
  onClick,
  className,
  index = 0,
}: AnimatedStatCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <GlassCard
        className={cn('p-6 transition-all duration-200', onClick && 'cursor-pointer hover:translate-y-[-2px]', className)}
        onClick={onClick}
        style={onClick ? { boxShadow: `0 8px 32px ${c.ring}` } : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">{label}</p>
            <h3 className="mt-2 text-2xl font-bold text-white leading-none">
              <AnimatedCounter value={rawValue} formatFn={formatFn} />
            </h3>
            {sub && <p className="mt-1.5 text-xs text-white/30">{sub}</p>}
          </div>
          <motion.div
            className={cn('p-3 rounded-xl shrink-0', c.bg)}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            <Icon size={22} className={c.text} />
          </motion.div>
        </div>

        {/* bottom accent */}
        <div className="mt-4 h-px w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${c.ring}, transparent)` }}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, delay: index * 0.08 + 0.4, ease: 'easeOut' }}
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}
