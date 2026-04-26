import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  unit: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'stable';
  alertLevel?: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend,
  alertLevel = 'NORMAL'
}) => {
  
  let valueColor = 'text-dashboard-text';
  if (alertLevel === 'WARNING') valueColor = 'text-yellow-400';
  if (alertLevel === 'CRITICAL') valueColor = 'text-red-500';

  return (
    <div className="bg-dashboard-card border border-dashboard-border rounded-xl p-5 flex flex-col relative overflow-hidden">
      {/* Subtle background glow based on alert level */}
      {alertLevel === 'CRITICAL' && (
        <div className="absolute inset-0 bg-red-500/5 pointer-events-none animate-pulse" />
      )}
      
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-dashboard-muted font-medium text-sm uppercase tracking-wider">{title}</h3>
        <div className={`p-2 rounded-lg bg-dashboard-bg border border-dashboard-border ${valueColor}`}>
          <Icon size={20} />
        </div>
      </div>
      
      <div className="flex items-baseline gap-1 mt-auto">
        <span className={`text-4xl font-bold tracking-tight ${valueColor}`}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </span>
        <span className="text-dashboard-muted font-medium">{unit}</span>
      </div>
      
      {trend && (
        <div className="mt-2 text-xs text-dashboard-muted flex items-center gap-1">
          {trend === 'up' && <span className="text-red-400">↑ Rising</span>}
          {trend === 'down' && <span className="text-green-400">↓ Falling</span>}
          {trend === 'stable' && <span className="text-blue-400">→ Stable</span>}
        </div>
      )}
    </div>
  );
};
