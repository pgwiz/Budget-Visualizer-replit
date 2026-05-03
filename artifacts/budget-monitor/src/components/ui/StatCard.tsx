import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: {
    value: number;
    isUp: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const colorMap = {
  primary: 'text-blue-400 bg-blue-400/10',
  success: 'text-emerald-400 bg-emerald-400/10',
  warning: 'text-amber-400 bg-amber-400/10',
  danger: 'text-rose-400 bg-rose-400/10',
};

export function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  color = 'primary', 
  className 
}: StatCardProps) {
  return (
    <GlassCard className={cn("p-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/40">{label}</p>
          <h3 className="mt-2 text-2xl font-bold text-white">{value}</h3>
          
          {trend && (
            <div className={cn(
              "mt-2 flex items-center text-xs font-medium",
              trend.isUp ? "text-emerald-400" : "text-rose-400"
            )}>
              <span>{trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="ml-1 text-white/40">vs last cycle</span>
            </div>
          )}
        </div>
        
        <div className={cn("p-3 rounded-xl", colorMap[color])}>
          <Icon size={24} />
        </div>
      </div>
    </GlassCard>
  );
}
