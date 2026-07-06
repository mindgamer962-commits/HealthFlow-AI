import React from 'react';
import { DistrictMapPlaceholder } from '../../components/maps/DistrictMapPlaceholder';
import { useUIStore } from '../../store/uiStore';
import { Sparkles, Map } from 'lucide-react';

export const DistrictMapPage: React.FC = () => {
  const { selectedPHCId, setSelectedPHCId } = useUIStore();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-none">
            District Medical Deployment Map
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
            Geographic view of PHCs & CHCs within East Khasi Hills. Click markers to inspect facility metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-brand-orange bg-brand-orange/10 px-3 py-1.5 rounded-xl border border-brand-orange/20 animate-pulse">
          <Sparkles className="h-4 w-4" />
          <span>Active redirection routing recommended</span>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-apex overflow-hidden p-2">
        <DistrictMapPlaceholder
          selectedPhcId={selectedPHCId}
          onPhcSelect={(phc) => setSelectedPHCId(phc.id)}
        />
      </div>
    </div>
  );
};
export default DistrictMapPage;
