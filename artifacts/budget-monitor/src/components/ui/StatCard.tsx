import { cn } from '@/lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  icon: any;
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
  primary: 'text-blue-600 bg-blue-50',
  success: 'text-emerald-600 bg-emerald-50',
  warning: 'text-amber-600 bg-amber-50',
  danger: 'text-red-600 bg-red-50',
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
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <h3 className="mt-2 text-2xl font-bold text-gray-900">{value}</h3>
          
          {trend && (
            <div className={cn(
              "mt-2 flex items-center text-xs font-medium",
              trend.isUp ? "text-emerald-600" : "text-red-600"
            )}>
              <span>{trend.isUp ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
              <span className="ml-1 text-gray-400">vs last cycle</span>
            </div>
          )}
        </div>
        
        <div className={cn("p-3 rounded-xl", colorMap[color])}>
          <FontAwesomeIcon icon={Icon} className="text-2xl" />
        </div>
      </div>
    </GlassCard>
  );
}
