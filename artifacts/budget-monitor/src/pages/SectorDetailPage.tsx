import { useGetSector, useGetSectorSubtree } from '@workspace/api-client-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatCard } from '@/components/ui/StatCard';
import { SectorTree } from '@/components/sectors/SectorTree';
import { formatCurrency } from '@/lib/api';
import { Wallet, TrendingUp, PieChart, BarChart3, ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';
import { Badge } from '@/components/ui/badge';

export default function SectorDetailPage({ id }: { id: string }) {
  const sectorId = parseInt(id);
  const { data: sector, isLoading: sectorLoading } = useGetSector(sectorId);
  const { data: subtree, isLoading: subtreeLoading } = useGetSectorSubtree(sectorId);

  if (sectorLoading || subtreeLoading) {
    return <LoadingSpinner size={48} className="min-h-[60vh]" />;
  }

  if (!sector) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold text-white">Sector not found</h2>
        <Link href="/sectors">
          <a className="text-blue-400 hover:underline mt-4 inline-block">Back to sectors</a>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/sectors">
            <a className="p-2 rounded-xl glass border-white/10 text-white/40 hover:text-white transition-colors">
              <ChevronLeft size={20} />
            </a>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-white">{sector.name}</h2>
              <Badge variant="outline" className="px-3 py-1 text-sm font-bold uppercase tracking-wider">
                {sector.code}
              </Badge>
            </div>
            <p className="text-white/40 mt-1">Sector performance and resource distribution</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={Wallet} 
          label="Total Allocated" 
          value={formatCurrency(sector.netAllocated || 0)} 
          color="primary"
        />
        <StatCard 
          icon={TrendingUp} 
          label="Distributed" 
          value={formatCurrency(sector.totalAllocated || 0)} 
          color="success"
        />
        <StatCard 
          icon={PieChart} 
          label="Remaining Balance" 
          value={formatCurrency(sector.availableBalance || 0)} 
          color="warning"
        />
        <StatCard 
          icon={BarChart3} 
          label="Self Utilization" 
          value={`${Math.round(sector.utilizationPct || 0)}%`} 
          color="danger"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        <GlassCard header={<h3 className="font-semibold text-white">Sub-Sectors Hierarchy</h3>}>
          {subtree && Array.isArray(subtree) && subtree.length > 0 ? (
            <SectorTree nodes={subtree} />
          ) : (
            <div className="text-center py-12 text-white/20 italic">
              No sub-sectors found for this department.
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
