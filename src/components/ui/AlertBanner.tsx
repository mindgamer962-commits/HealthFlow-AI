import React from 'react';
import { AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import { OperationalAlert } from '../../types';

interface AlertBannerProps {
  alerts: OperationalAlert[];
  onActionClick?: (alert: OperationalAlert) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onActionClick }) => {
  if (alerts.length === 0) return null;

  // Group alerts by severity: Critical first, then Warning, then Info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityWeight = { Critical: 3, Warning: 2, Info: 1 };
    return severityWeight[b.severity] - severityWeight[a.severity];
  });

  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return {
          container: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30',
          text: 'text-red-800 dark:text-red-300',
          badge: 'bg-status-critical text-white',
          actionBtn: 'text-status-critical hover:bg-status-critical/10 hover:text-red-900',
          icon: <ShieldAlert className="h-5 w-5 text-status-critical shrink-0" />,
        };
      case 'Warning':
        return {
          container: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/30',
          text: 'text-amber-800 dark:text-amber-300',
          badge: 'bg-status-warning text-white',
          actionBtn: 'text-brand-orange hover:bg-status-warning/10 hover:text-amber-900',
          icon: <AlertCircle className="h-5 w-5 text-status-warning shrink-0" />,
        };
      default:
        return {
          container: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-900/30',
          text: 'text-blue-800 dark:text-blue-300',
          badge: 'bg-brand-blue text-white',
          actionBtn: 'text-brand-blue hover:bg-brand-blue/10 hover:text-blue-900',
          icon: <AlertCircle className="h-5 w-5 text-brand-blue shrink-0" />,
        };
    }
  };

  return (
    <div className="space-y-3">
      {sortedAlerts.map((alert) => {
        const styles = getAlertStyles(alert.severity);
        return (
          <div
            key={alert.id}
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-apex border ${styles.container} transition-all-ease shadow-apex-sm`}
          >
            <div className="flex items-center gap-3">
              {styles.icon}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded ${styles.badge}`}>
                    {alert.severity}
                  </span>
                  <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                    {alert.phcName} — {alert.type}
                  </span>
                </div>
                <p className={`text-sm ${styles.text}`}>
                  {alert.message}
                </p>
              </div>
            </div>
            
            {onActionClick && (
              <button
                onClick={() => onActionClick(alert)}
                className={`mt-3 sm:mt-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg border border-transparent transition-all-ease shrink-0 ${styles.actionBtn}`}
              >
                Resolve Ops
                <ArrowRight className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
