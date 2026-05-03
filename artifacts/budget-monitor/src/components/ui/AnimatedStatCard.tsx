import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { AnimatedCounter } from '@/components/hierarchy/AnimatedCounter';
import { motion } from 'framer-motion';

interface AnimatedStatCardProps {
  icon: LucideIcon;
  label: string;
  /** Raw numeric value fed into the counter animation */
  rawValue: number;
  /** Formats the animated counter integer for the headline display */
  formatFn: (v: number) => string;
  /** Optional secondary line — e.g. the full un-abbreviated value */
  sub?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  className?: string;
  index?: number;
}

const colorMap = {
  primary: { text: 'text-blue-400',    bg: 'bg-blue-400/10',    bar: 'rgba(59,130,246,0.5)',  ring: 'rgba(59,130,246,0.3)'  },
  success: { text: 'text-emerald-400', bg: 'bg-emerald-400/10', bar: 'rgba(16,185,129,0.5)',  ring: 'rgba(16,185,129,0.3)'  },
  warning: { text: 'text-amber-400',   bg: 'bg-amber-400/10',   bar: 'rgba(245,158,11,0.5)',  ring: 'rgba(245,158,11,0.3)'  },
  danger:  { text: 'text-rose-400',    bg: 'bg-rose-400/10',    bar: 'rgba(239,68,68,0.5)',   ring: 'rgba(239,68,68,0.3)'   },
};

export function AnimatedStatCard({
  icon: Icon,
  label,
  rawValue,
  formatFn,
  sub,
  color = 'primary',
  onClick,
  className,
  index = 0,
}: AnimatedStatCardProps) {
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <GlassCard
        className={cn(
          'p-5 transition-all duration-200 flex flex-col gap-4',
          onClick && 'cursor-pointer hover:-translate-y-0.5 active:translate-y-0',
          className,
        )}
        onClick={onClick}
      >
        {/* Top row: icon + label */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest leading-none truncate">
            {label}
          </p>
          <motion.div
            className={cn('p-2.5 rounded-xl shrink-0', c.bg)}
            whileHover={{ scale: 1.12, rotate: 6 }}
            transition={{ type: 'spring', stiffness: 420, damping: 14 }}
          >
            <Icon size={18} className={c.text} />
          </motion.div>
        </div>

        {/* Value — auto-shrinks text to fit */}
        <div className="min-w-0">
          <h3
            className={cn(
              'font-extrabold leading-none tracking-tight break-words',
              c.text,
              // step down font size for longer strings
              'text-2xl',
            )}
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
          >
            <AnimatedCounter value={rawValue} formatFn={formatFn} />
          </h3>

          {sub && (
            <p className="mt-1.5 text-[11px] text-white/30 truncate" title={sub}>
              {sub}
            </p>
          )}
        </div>

        {/* Accent bar */}
        <div className="h-px w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${c.bar}, transparent)` }}
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.4, delay: index * 0.08 + 0.3, ease: 'easeOut' }}
          />
        </div>
      </GlassCard>
    </motion.div>
  );
}
