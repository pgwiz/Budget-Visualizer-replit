import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface UtilizationRingProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  className?: string;
  animate?: boolean;
}

function ringColor(pct: number) {
  if (pct >= 90) return { stroke: '#ef4444', glow: 'rgba(239,68,68,0.4)', text: 'text-rose-400' };
  if (pct >= 70) return { stroke: '#f59e0b', glow: 'rgba(245,158,11,0.4)', text: 'text-amber-400' };
  if (pct >= 40) return { stroke: '#3b82f6', glow: 'rgba(59,130,246,0.4)', text: 'text-blue-400' };
  return { stroke: '#10b981', glow: 'rgba(16,185,129,0.4)', text: 'text-emerald-400' };
}

export function UtilizationRing({
  value,
  size = 80,
  strokeWidth = 6,
  showLabel = true,
  className,
  animate = true,
}: UtilizationRingProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const colors = ringColor(clamped);
  const center = size / 2;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        {/* fill */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={animate ? { strokeDashoffset: circumference } : { strokeDashoffset: offset }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('font-bold leading-none', colors.text, size >= 80 ? 'text-base' : 'text-xs')}>
            {Math.round(clamped)}%
          </span>
          {size >= 80 && <span className="text-[9px] text-white/30 mt-0.5 uppercase tracking-wider">used</span>}
        </div>
      )}
    </div>
  );
}
