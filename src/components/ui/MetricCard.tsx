import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  status?: 'Good' | 'Warning' | 'Critical' | 'Default';
  trend?: {
    value: string;
    isPositive: boolean;
  };
  onClick?: () => void;
  isActive?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  status = 'Default',
  trend,
  onClick,
  isActive = false,
}) => {
  const getStatusColors = () => {
    switch (status) {
      case 'Critical':
        return {
          border: 'border-status-critical/30 dark:border-status-critical/40',
          bg: 'bg-status-critical/5 dark:bg-status-critical/10',
          text: 'text-status-critical',
          indicator: 'bg-status-critical',
          badgeText: 'text-status-critical bg-status-critical/10',
          icon: <AlertTriangle className="h-4 w-4 text-status-critical" />,
        };
      case 'Warning':
        return {
          border: 'border-status-warning/30 dark:border-status-warning/40',
          bg: 'bg-status-warning/5 dark:bg-status-warning/10',
          text: 'text-status-warning',
          indicator: 'bg-status-warning',
          badgeText: 'text-status-warning bg-status-warning/10',
          icon: <AlertTriangle className="h-4 w-4 text-status-warning" />,
        };
      case 'Good':
        return {
          border: 'border-status-success/30 dark:border-status-success/40',
          bg: 'bg-status-success/5 dark:bg-status-success/10',
          text: 'text-status-success',
          indicator: 'bg-status-success',
          badgeText: 'text-status-success bg-status-success/10',
          icon: <CheckCircle className="h-4 w-4 text-status-success" />,
        };
      default:
        return {
          border: 'border-slate-200 dark:border-slate-800',
          bg: 'bg-transparent',
          text: 'text-slate-500 dark:text-slate-400',
          indicator: 'bg-brand-blue',
          badgeText: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300',
          icon: <Info className="h-4 w-4 text-slate-400" />,
        };
    }
  };

  const colors = getStatusColors();

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)' }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={`relative p-6 rounded-apex border bg-white dark:bg-slate-900 shadow-apex-sm ${
        isActive ? 'ring-2 ring-brand-blue border-transparent' : colors.border
      } ${onClick ? 'cursor-pointer' : ''} overflow-hidden`}
    >
      {/* Top Border Status Indicator Bar */}
      <div className={`absolute top-0 left-0 right-0 h-1.5 ${colors.indicator}`} />

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase">
            {title}
          </p>
          <div className="flex items-baseline space-x-2">
            <h3 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {value}
            </h3>
          </div>
        </div>

        {icon && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300">
            {icon}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        {subtitle && (
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[70%]">
            {subtitle}
          </p>
        )}

        <div className="flex items-center gap-1.5">
          {trend && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                trend.isPositive
                  ? 'text-status-success bg-status-success/10'
                  : 'text-status-critical bg-status-critical/10'
              }`}
            >
              {trend.isPositive ? '+' : ''}
              {trend.value}
            </span>
          )}
          {status !== 'Default' && (
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${colors.badgeText}`}>
              {status}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
