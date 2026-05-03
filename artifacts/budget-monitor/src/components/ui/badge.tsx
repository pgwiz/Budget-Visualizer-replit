import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
  className?: string;
}

const variantMap = {
  default: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  success: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
  warning: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  danger: 'bg-rose-400/10 text-rose-400 border-rose-400/20',
  outline: 'bg-transparent text-white/60 border-white/10',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
      variantMap[variant],
      className
    )}>
      {children}
    </span>
  );
}
