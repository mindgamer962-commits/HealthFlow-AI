import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Info, Users, Bed, Sparkles, ExternalLink, Activity, ArrowRightLeft, UserCheck, FlaskConical } from 'lucide-react';
import { usePhcStore } from '../../store/phcStore';
import { useFootfallStore } from '../../store/footfallStore';
import { useBedStore } from '../../store/bedStore';
import { useDoctorStore } from '../../store/doctorStore';
import { useLabStore } from '../../store/labStore';
import { PHC } from '../../types';

interface DistrictMapPlaceholderProps {
  onPhcSelect?: (phc: PHC) => void;
  selectedPhcId?: string | null;
}

// Convert coordinates to map relative percent positions
const getMapPosition = (lat: number, lng: number) => {
  const minLng = 91.50;
  const maxLng = 92.05;
  const minLat = 25.25;
  const maxLat = 25.65;
  
  const x = 10 + ((lng - minLng) / (maxLng - minLng)) * 80;
  const y = 90 - ((lat - minLat) / (maxLat - minLat)) * 80;
  
  const clampedX = Math.min(95, Math.max(5, x));
  const clampedY = Math.min(95, Math.max(5, y));
  
  return { x: `${clampedX}%`, y: `${clampedY}%` };
};

export const DistrictMapPlaceholder: React.FC<DistrictMapPlaceholderProps> = ({
  onPhcSelect,
  selectedPhcId,
}) => {
  const navigate = useNavigate();
  const { centers, subscribeToCenters } = usePhcStore();
  const { predictions: footfallPredictions, subscribeToFootfalls } = useFootfallStore();
  const { beds, predictions: bedPredictions, subscribeToBeds } = useBedStore();
  const { doctors, attendanceLogs, predictions: doctorPredictions, subscribeToWorkforce } = useDoctorStore();
  const { inventories, equipments, predictions: labPredictions, subscribeToLabs } = useLabStore();

  useEffect(() => {
    const unsubCenters = subscribeToCenters();
    const unsubFootfalls = subscribeToFootfalls();
    const unsubBeds = subscribeToBeds();
    const unsubWorkforce = subscribeToWorkforce();
    const unsubLabs = subscribeToLabs();
    return () => {
      unsubCenters();
      unsubFootfalls();
      unsubBeds();
      unsubWorkforce();
      unsubLabs();
    };
  }, []);

  const [activePhc, setActivePhc] = useState<PHC | null>(null);

  // Sync active PHC marker selector when store loads or target shifts
  useEffect(() => {
    if (selectedPhcId) {
      const match = centers.find((p) => p.centerId === selectedPhcId);
      if (match) setActivePhc(match);
    } else if (centers.length > 0 && !activePhc) {
      setActivePhc(centers[0]);
    }
  }, [centers, selectedPhcId]);

  const handleMarkerClick = (phc: PHC) => {
    setActivePhc(phc);
    if (onPhcSelect) onPhcSelect(phc);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'text-status-critical bg-status-critical/15 border-status-critical animate-pulse';
      case 'Needs Attention':
        return 'text-status-warning bg-status-warning/15 border-status-warning';
      case 'Healthy':
      default:
        return 'text-status-success bg-status-success/15 border-status-success';
    }
  };

  return (
    <div className="relative h-[550px] w-full rounded-apex overflow-hidden border border-slate-200 bg-slate-100 shadow-apex-sm flex flex-col lg:flex-row">
      {/* Map Content Box */}
      <div className="relative flex-1 bg-slate-200 overflow-hidden min-h-[300px]">
        {/* Grid pattern background simulating map roads */}
        <div className="absolute inset-0 opacity-20 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:30px_30px]" />
        
        {/* Topographic mock shapes */}
        <div className="absolute left-[15%] top-[25%] w-48 h-24 rounded-full bg-blue-300/20 blur-xl" />
        <div className="absolute right-[25%] bottom-[20%] w-60 h-40 rounded-full bg-emerald-300/10 blur-2xl" />

        {/* Legend Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-md">
          <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">Map Legend</p>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-status-critical" />
            <span className="font-medium text-slate-700">Critical Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-status-warning" />
            <span className="font-medium text-slate-700">Needs Attention</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-status-success" />
            <span className="font-medium text-slate-700">Healthy Operational</span>
          </div>
        </div>

        {/* Simulated markers mapped across grid coordinates */}
        {centers.map((phc) => {
          const coord = getMapPosition(phc.latitude || 25.45, phc.longitude || 91.75);
          const isSelected = activePhc?.centerId === phc.centerId;
          
          const phcBeds = beds.filter(b => b.healthCenterId === phc.centerId);
          const totalBeds = phcBeds.reduce((sum, b) => sum + b.TotalBeds, 0) || phc.bedsTotal || 10;
          const occupiedBeds = phcBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0) || phc.bedsOccupied || 0;
          const availableBeds = Math.max(0, totalBeds - occupiedBeds);
          const occupancyPercent = Math.round((occupiedBeds / totalBeds) * 100);

          const bedForecast = bedPredictions[phc.centerId];
          const tomorrowOccupancy = bedForecast ? bedForecast.expectedOccupancyTomorrow : occupancyPercent;

          const centerDoctors = doctors.filter(d => d.assignedHealthCenter === phc.centerId);
          const assignedCount = centerDoctors.length;
          const todayStr = new Date().toISOString().split('T')[0];
          const presentToday = attendanceLogs.filter(a => a.healthCenterId === phc.centerId && a.date === todayStr && (a.attendanceStatus === 'Present' || a.attendanceStatus === 'Late')).length;
          const attendanceRate = assignedCount > 0 ? Math.round((presentToday / assignedCount) * 100) : 100;
          const staffingRisk = doctorPredictions[phc.centerId]?.staffingRiskLevel || 'Low';

          const phcInvs = inventories.filter(i => i.healthCenterId === phc.centerId);
          const availableTestsCount = phcInvs.filter(i => i.isAvailable).length;
          const totalTestsCount = phcInvs.length || 5;
          const workingMachines = equipments.filter(e => e.healthCenterId === phc.centerId && e.status === 'Working').length;
          const totalMachines = equipments.filter(e => e.healthCenterId === phc.centerId).length;

          const labForecast = labPredictions[phc.centerId];
          const labRisk = labForecast ? (Object.values(labForecast.machineFailureRisk).includes('Critical') ? 'Critical' : 'Normal') : 'Normal';

          let bedRisk = 'Low';
          let markerColor = 'text-status-success';
          if (tomorrowOccupancy > 90 || staffingRisk === 'Critical' || labRisk === 'Critical') {
            bedRisk = 'Critical';
            markerColor = 'text-status-critical animate-pulse';
          } else if (tomorrowOccupancy > 75 || staffingRisk === 'High') {
            bedRisk = 'High';
            markerColor = 'text-status-warning';
          } else if (tomorrowOccupancy > 50 || staffingRisk === 'Medium') {
            bedRisk = 'Medium';
            markerColor = 'text-brand-blue';
          }

          return (
            <button
              key={phc.centerId}
              onClick={() => handleMarkerClick(phc)}
              style={{ left: coord.x, top: coord.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group z-10"
            >
              <div className="relative flex items-center justify-center">
                {/* Glow ring */}
                {isSelected && (
                  <span className={`absolute inline-flex h-8 w-8 rounded-full animate-ping ${
                    bedRisk === 'Critical' ? 'bg-status-critical/30' : bedRisk === 'High' ? 'bg-status-warning/30' : 'bg-brand-blue/30'
                  }`} />
                )}

                <div
                  className={`flex flex-col items-start gap-0.5 px-2.5 py-1.5 rounded-lg border-2 bg-white shadow-md transition-all duration-200 hover:scale-105 ${
                    isSelected ? 'border-brand-blue ring-2 ring-brand-blue/20 scale-105' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <MapPin className={`h-3.5 w-3.5 ${markerColor}`} />
                    <span className="text-[9.5px] font-bold text-slate-800 whitespace-nowrap">
                      {phc.centerName}
                    </span>
                  </div>
                  <div className="flex flex-col text-[7.5px] text-slate-400 font-semibold leading-normal">
                    <span>Cots: {availableBeds} free | Docs: {presentToday}/{assignedCount}</span>
                    <span>Labs: {availableTestsCount}/{totalTestsCount} tests | Eq: {workingMachines}/{totalMachines}</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}

        {/* Satellite/Compass scale details */}
        <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 bg-slate-900/80 text-white rounded-lg px-2.5 py-1 text-[10px] font-mono">
          <Navigation className="h-3 w-3 rotate-45 text-brand-orange" />
          <span>25.5788° N, 91.8933° E (Shillong Command Area)</span>
        </div>
      </div>

      {/* Map Inspector Panel */}
      {activePhc && (() => {
        const phcBeds = beds.filter(b => b.healthCenterId === activePhc.centerId);
        const totalBeds = phcBeds.reduce((sum, b) => sum + b.TotalBeds, 0) || activePhc.bedsTotal || 10;
        const occupiedBeds = phcBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0) || activePhc.bedsOccupied || 0;
        const availableBeds = Math.max(0, totalBeds - occupiedBeds);
        const occupancyPercent = Math.round((occupiedBeds / totalBeds) * 100);

        const bedForecast = bedPredictions[activePhc.centerId];
        const tomorrowOccupancy = bedForecast ? bedForecast.expectedOccupancyTomorrow : occupancyPercent;
        const recommendation = bedForecast?.recommendations?.[0];

        const centerDoctors = doctors.filter(d => d.assignedHealthCenter === activePhc.centerId);
        const assignedCount = centerDoctors.length;
        const todayStr = new Date().toISOString().split('T')[0];
        const presentToday = attendanceLogs.filter(a => a.healthCenterId === activePhc.centerId && a.date === todayStr && (a.attendanceStatus === 'Present' || a.attendanceStatus === 'Late')).length;
        const attendanceRate = assignedCount > 0 ? Math.round((presentToday / assignedCount) * 100) : 100;

        const doctorForecast = doctorPredictions[activePhc.centerId];
        const staffingRisk = doctorForecast ? doctorForecast.staffingRiskLevel : 'Low';
        const docRecommendation = doctorForecast?.recommendations?.[0];

        const phcInvs = inventories.filter(i => i.healthCenterId === activePhc.centerId);
        const availableTestsCount = phcInvs.filter(i => i.isAvailable).length;
        const totalTestsCount = phcInvs.length || 5;

        const labForecast = labPredictions[activePhc.centerId];
        const labRecommendation = labForecast?.recommendations?.[0];

        let combinedRisk = 'Low';
        if (tomorrowOccupancy > 90 || staffingRisk === 'Critical') combinedRisk = 'Critical';
        else if (tomorrowOccupancy > 75 || staffingRisk === 'High') combinedRisk = 'High';
        else if (tomorrowOccupancy > 50 || staffingRisk === 'Medium') combinedRisk = 'Medium';

        return (
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white p-6 flex flex-col justify-between shrink-0">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {activePhc.centerType} Inspector
                  </span>
                  <span
                    className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                      combinedRisk === 'Critical'
                        ? 'bg-status-critical/10 text-status-critical'
                        : combinedRisk === 'High'
                        ? 'bg-status-warning/10 text-status-warning'
                        : 'bg-status-success/10 text-status-success'
                    }`}
                  >
                    {combinedRisk} Risk
                  </span>
                </div>
                <h4 className="text-lg font-bold text-slate-900 mt-1">
                  {activePhc.centerName}
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  District: {activePhc.district}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Bed className="h-3.5 w-3.5 text-brand-blue" />
                    <span className="text-[10px] font-bold">Available Beds</span>
                  </div>
                  <span className="text-base font-bold text-slate-800">
                    {availableBeds} / {totalBeds}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <UserCheck className="h-3.5 w-3.5 text-brand-orange" />
                    <span className="text-[10px] font-bold">Doctors Available</span>
                  </div>
                  <span className="text-base font-bold text-brand-orange">
                    {presentToday} / {assignedCount}
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <FlaskConical className="h-3.5 w-3.5 text-brand-blue" />
                    <span className="text-[10px] font-bold">Available Diagnostic Tests</span>
                  </div>
                  <span className="text-base font-bold text-slate-800">
                    {availableTestsCount} / {totalTestsCount} Active Tests
                  </span>
                </div>
              </div>

              {/* Redistribution Recommendation Alert */}
              {recommendation && (
                <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-[11.5px] space-y-1">
                  <span className="font-extrabold flex items-center gap-1.5"><ArrowRightLeft className="h-3.5 w-3.5 text-brand-blue animate-bounce" /> AI Bed Redistribution</span>
                  <p className="font-medium">{recommendation.reason}</p>
                </div>
              )}

              {/* Doctor Reassignment Recommendation Alert */}
              {docRecommendation && (
                <div className="p-3 bg-orange-50 border border-orange-200 text-orange-950 rounded-xl text-[11.5px] space-y-1">
                  <span className="font-extrabold flex items-center gap-1.5"><ArrowRightLeft className="h-3.5 w-3.5 text-brand-orange animate-bounce" /> AI Workforce Assignment</span>
                  <p className="font-medium">{docRecommendation.reason}</p>
                </div>
              )}

              {/* Lab Referral Recommendation Alert */}
              {labRecommendation && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-950 rounded-xl text-[11.5px] space-y-1">
                  <span className="font-extrabold flex items-center gap-1.5"><ArrowRightLeft className="h-3.5 w-3.5 text-status-critical animate-bounce" /> AI Diagnostic Referral</span>
                  <p className="font-medium">{labRecommendation.reason}</p>
                </div>
              )}

              {/* Overcrowding Risk Alert Box */}
              {(() => {
                let alertBox = { color: 'bg-emerald-50 text-emerald-800 border-emerald-250', text: '✓ Normal occupancy & staff volumes.' };
                if (tomorrowOccupancy > 90 || staffingRisk === 'Critical') {
                  alertBox = {
                    color: 'bg-red-50 text-red-800 border-red-200',
                    text: '🚨 Critical bed overcapacity or staff deficit forecast tomorrow.'
                  };
                } else if (tomorrowOccupancy > 75 || staffingRisk === 'High') {
                  alertBox = {
                    color: 'bg-orange-50 text-orange-850 border-orange-200',
                    text: '⚠️ High workload ratio or high bed load forecast tomorrow.'
                  };
                }
                return (
                  <div className={`p-3 rounded-xl border text-[11px] font-semibold leading-relaxed ${alertBox.color}`}>
                    {alertBox.text}
                  </div>
                );
              })()}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold">Today's Patients</span>
                </div>
                <span className="text-base font-bold text-slate-800">
                  {activePhc.currentPatients}
                </span>
              </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Medicine Health</span>
                <span className={`font-bold ${activePhc.medicineHealthScore < 50 ? 'text-status-critical' : activePhc.medicineHealthScore < 80 ? 'text-status-warning' : 'text-status-success'}`}>
                  {activePhc.medicineHealthScore}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    activePhc.medicineHealthScore < 50
                      ? 'bg-status-critical'
                      : activePhc.medicineHealthScore < 80
                      ? 'bg-status-warning'
                      : 'bg-status-success'
                  }`}
                  style={{ width: `${activePhc.medicineHealthScore}%` }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Lab Capacity score</span>
                <span className={`font-bold ${activePhc.labStatusScore < 50 ? 'text-status-critical' : activePhc.labStatusScore < 80 ? 'text-status-warning' : 'text-status-success'}`}>
                  {activePhc.labStatusScore}%
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    activePhc.labStatusScore < 50
                      ? 'bg-status-critical'
                      : activePhc.labStatusScore < 80
                      ? 'bg-status-warning'
                      : 'bg-status-success'
                  }`}
                  style={{ width: `${activePhc.labStatusScore}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 space-y-2 mt-4 lg:mt-0">
            <button
              onClick={() => navigate(`/phcs/${activePhc.centerId}`)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 border text-slate-700 font-bold text-xs rounded-xl transition-all-ease"
            >
              <ExternalLink className="h-4 w-4" />
              Inspect Facility Details
            </button>

            <button className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all-ease shadow">
              <Sparkles className="h-3.5 w-3.5" />
              Analyze with Gemini
            </button>
          </div>
        </div>
      );
    })()}
    </div>
  );
};
