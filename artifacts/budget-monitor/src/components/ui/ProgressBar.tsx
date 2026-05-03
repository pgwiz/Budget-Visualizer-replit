import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number; // 0 to 100
  max?: number;
  className?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
}

const colorMap = {
  primary: 'from-blue-600 to-blue-400',
  success: 'from-emerald-600 to-emerald-400',
  warning: 'from-amber-600 to-amber-400',
  danger: 'from-rose-600 to-rose-400',
};

export function ProgressBar({ 
  value, 
  max = 100, 
  className, 
  color = 'primary',
  showLabel = false 
}: ProgressBarProps) {
  const percentage = Math.min(Math.max(0, (value / max) * 100), 100);

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1 text-xs font-medium text-white/60">
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
            colorMap[color]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
