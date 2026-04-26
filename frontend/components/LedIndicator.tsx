import React from 'react';

interface LedIndicatorProps {
  color: 'green' | 'red' | 'yellow';
  active: boolean;
  label: string;
}

export const LedIndicator: React.FC<LedIndicatorProps> = ({ color, active, label }) => {
  let baseColorClass = '';
  let glowClass = '';

  switch (color) {
    case 'green':
      baseColorClass = active ? 'bg-green-500' : 'bg-green-900/30';
      glowClass = active ? 'shadow-[0_0_15px_rgba(34,197,94,0.7)]' : '';
      break;
    case 'red':
      baseColorClass = active ? 'bg-red-500' : 'bg-red-900/30';
      glowClass = active ? 'shadow-[0_0_20px_rgba(239,68,68,0.9)] animate-pulse-fast' : '';
      break;
    case 'yellow':
      baseColorClass = active ? 'bg-yellow-400' : 'bg-yellow-900/30';
      glowClass = active ? 'shadow-[0_0_15px_rgba(250,204,21,0.7)]' : '';
      break;
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className={`w-10 h-10 rounded-full border-2 border-dashboard-border transition-all duration-300 ${baseColorClass} ${glowClass}`}
        aria-label={`${color} LED - ${active ? 'ON' : 'OFF'}`}
      />
      <span className="text-xs font-medium text-dashboard-muted uppercase tracking-wider">{label}</span>
    </div>
  );
};
