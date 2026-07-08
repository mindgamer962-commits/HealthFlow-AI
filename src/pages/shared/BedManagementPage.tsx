import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bed,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  Clock,
  Calendar,
  Plus,
  CheckCircle2,
  XCircle,
  MapPin,
  Save,
  ArrowRightLeft,
  Info,
  Loader2,
  ShieldCheck,
  Activity,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { usePhcStore } from '../../store/phcStore';
import { useBedStore, RedistributionRecommendation } from '../../store/bedStore';
import { useFootfallStore } from '../../store/footfallStore';
import { BedManagement } from '../../types';
import { db, IS_MOCK_ENV } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

const PIE_COLORS = ['#1F5FBF', '#F57C00', '#10B981', '#8B5CF6', '#EC4899', '#6366F1'];

export const BedManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { centers, subscribeToCenters } = usePhcStore();
  const { beds, predictions, subscribeToBeds, updateBedPool, runAiBedForecast, loading: storeLoading } = useBedStore();
  const { predictions: footfallPredictions, subscribeToFootfalls } = useFootfallStore();

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'district' | 'my-phc' | 'visuals'>('district');

  // Form states for Bed Update
  const [formType, setFormType] = useState<BedManagement['bedType']>('General');
  const [formTotal, setFormTotal] = useState(10);
  const [formOccupied, setFormOccupied] = useState(5);
  const [formReserved, setFormReserved] = useState(0);
  const [formMaintenance, setFormMaintenance] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isForecasting, setIsForecasting] = useState(false);

  // Subscribe to store snapshots
  useEffect(() => {
    const unsubCenters = subscribeToCenters();
    const unsubBeds = subscribeToBeds();
    const unsubFootfalls = subscribeToFootfalls();
    return () => {
      unsubCenters();
      unsubBeds();
      unsubFootfalls();
    };
  }, []);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Determine current active PHC target
  const activePhcId = useMemo(() => {
    if (user?.role === 'PHC Staff' || user?.role === 'CHC Staff') {
      return user.phcId || 'phc-1';
    }
    return selectedCenterId;
  }, [user, selectedCenterId]);

  // Set default view on load
  useEffect(() => {
    if (user?.role === 'PHC Staff' || user?.role === 'CHC Staff') {
      setActiveTab('my-phc');
    }
  }, [user]);

  // Filtered beds list
  const filteredBeds = useMemo(() => {
    if (activePhcId === 'all') return beds;
    return beds.filter(b => b.healthCenterId === activePhcId);
  }, [beds, activePhcId]);

  // Auto-initialize default bed pools if empty for this clinic
  useEffect(() => {
    if (activePhcId && activePhcId !== 'all' && !storeLoading && filteredBeds.length === 0) {
      const bedTypes = ['General', 'ICU', 'Emergency', 'Isolation', 'Maternity', 'Pediatric'] as const;
      const defaultBeds = bedTypes.map(t => {
        const total = t === 'General' ? 10 : t === 'Emergency' ? 4 : 2;
        return {
          bedId: `bm-${activePhcId}-${t.toLowerCase()}`,
          healthCenterId: activePhcId,
          bedType: t,
          TotalBeds: total,
          OccupiedBeds: 0,
          AvailableBeds: total,
          ReservedBeds: 0,
          MaintenanceBeds: 0,
          UpdatedBy: 'system-init',
          UpdatedAt: new Date().toISOString()
        };
      });

      const initializeBeds = async () => {
        try {
          for (const bed of defaultBeds) {
            if (IS_MOCK_ENV) {
              const current = localStorage.getItem('healthflow_beds');
              let list = [];
              if (current) {
                try { list = JSON.parse(current); } catch (e) {}
              }
              if (!list.some((b: any) => b.bedId === bed.bedId)) {
                localStorage.setItem('healthflow_beds', JSON.stringify([...list, bed]));
              }
            } else {
              await setDoc(doc(db, 'bed_management', bed.bedId), bed);
            }
          }
          // Trigger refresh
          subscribeToBeds();
        } catch (err) {
          console.error("Auto-initialization of bed pools failed:", err);
        }
      };

      initializeBeds();
    }
  }, [activePhcId, storeLoading, filteredBeds.length]);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const total = filteredBeds.reduce((sum, b) => sum + b.TotalBeds, 0);
    const occupied = filteredBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0);
    const reserved = filteredBeds.reduce((sum, b) => sum + b.ReservedBeds, 0);
    const maintenance = filteredBeds.reduce((sum, b) => sum + b.MaintenanceBeds, 0);
    const available = total - occupied - reserved - maintenance;
    const occupancyPercent = total > 0 ? Math.round((occupied / total) * 100) : 0;

    // Get specific critical care counters
    const emergencyBeds = filteredBeds.find(b => b.bedType === 'Emergency');
    const emergencyAvailable = emergencyBeds ? emergencyBeds.AvailableBeds : 0;

    const icuBeds = filteredBeds.find(b => b.bedType === 'ICU');
    const icuAvailable = icuBeds ? icuBeds.AvailableBeds : 0;

    // Simulated admissions/discharges
    const admissionsToday = Math.round(occupied * 0.15) || 2;
    const dischargesToday = Math.round(occupied * 0.1) || 1;

    return {
      total,
      occupied,
      available: Math.max(0, available),
      reserved,
      maintenance,
      occupancyPercent,
      emergencyAvailable,
      icuAvailable,
      admissionsToday,
      dischargesToday
    };
  }, [filteredBeds]);

  // Aggregate bed types details for Pie Chart
  const bedTypeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBeds.forEach(b => {
      map[b.bedType] = (map[b.bedType] || 0) + b.TotalBeds;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredBeds]);

  // Compare PHC occupancies in a Bar Chart (District Dashboard)
  const phcComparisonData = useMemo(() => {
    return centers.map(c => {
      const cBeds = beds.filter(b => b.healthCenterId === c.centerId);
      const tot = cBeds.reduce((sum, b) => sum + b.TotalBeds, 0);
      const occ = cBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0);
      const percent = tot > 0 ? Math.round((occ / tot) * 100) : 0;
      return {
        name: c.centerName,
        'Occupancy %': percent,
        'Available Beds': tot - occ
      };
    });
  }, [centers, beds]);

  // Dynamic capacity risk calculations
  const capacityRisks = useMemo(() => {
    return centers.map(c => {
      const cBeds = beds.filter(b => b.healthCenterId === c.centerId);
      const tot = cBeds.reduce((sum, b) => sum + b.TotalBeds, 0);
      const occ = cBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0);
      const percent = tot > 0 ? Math.round((occ / tot) * 100) : 0;

      let risk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (percent > 90) risk = 'Critical';
      else if (percent > 75) risk = 'High';
      else if (percent > 50) risk = 'Medium';

      return {
        centerId: c.centerId,
        name: c.centerName,
        total: tot,
        occupied: occ,
        available: tot - occ,
        occupancy: percent,
        risk
      };
    });
  }, [centers, beds]);

  // Redistribution Recommendations List
  const activeRedistributions = useMemo(() => {
    const list: (RedistributionRecommendation & { sourcePhcName: string })[] = [];
    capacityRisks.forEach(cr => {
      if (cr.risk === 'Critical' || cr.risk === 'High') {
        const pred = predictions[cr.centerId];
        if (pred && pred.recommendations && pred.recommendations.length > 0) {
          pred.recommendations.forEach(r => {
            list.push({
              ...r,
              sourcePhcName: cr.name
            });
          });
        }
      }
    });
    return list;
  }, [capacityRisks, predictions]);

  // Save specific bed pool data changes
  const handleUpdateBeds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePhcId || activePhcId === 'all') {
      triggerToast("Please select a specific clinic node first.", "error");
      return;
    }

    setIsUpdating(true);
    try {
      await updateBedPool(activePhcId, formType, {
        TotalBeds: formTotal,
        OccupiedBeds: formOccupied,
        ReservedBeds: formReserved,
        MaintenanceBeds: formMaintenance,
        UpdatedBy: user?.name || 'Staff Console'
      });
      triggerToast("Bed capacity settings updated successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Failed to write update.", "error");
    } finally {
      setIsUpdating(false);
    }
  };

  // Trigger AI occupancy forecast
  const handleRunForecast = async () => {
    if (activePhcId === 'all') {
      triggerToast("Select a clinic to evaluate AI capacity forecasting.", "error");
      return;
    }
    setIsForecasting(true);
    try {
      await runAiBedForecast(activePhcId);
      triggerToast("AI Capacity forecasts calculated successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Gemini forecasting failure.", "error");
    } finally {
      setIsForecasting(false);
    }
  };

  // Generate simulated historical trends
  const historicalTrendData = useMemo(() => {
    return [
      { day: 'Mon', 'Occupancy %': Math.max(30, stats.occupancyPercent - 5) },
      { day: 'Tue', 'Occupancy %': Math.max(30, stats.occupancyPercent - 2) },
      { day: 'Wed', 'Occupancy %': stats.occupancyPercent },
      { day: 'Thu', 'Occupancy %': Math.min(100, stats.occupancyPercent + 4) },
      { day: 'Fri', 'Occupancy %': Math.min(100, stats.occupancyPercent + 2) },
      { day: 'Sat', 'Occupancy %': Math.max(30, stats.occupancyPercent - 4) },
      { day: 'Sun', 'Occupancy %': Math.max(30, stats.occupancyPercent - 8) }
    ];
  }, [stats.occupancyPercent]);

  return (
    <div className="space-y-6">
      {/* Header and selection */}
      <div className="bg-white border border-slate-200 rounded-apex p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-apex-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none">
            Smart Bed Capacity Intelligence
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Real-time occupancy tracking, Gemini AI demand forecasting, and smart redistribution recommendation triggers.
          </p>
        </div>

        {user?.role === 'District Health Administrator' && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Select Clinic:</span>
            <select
              value={selectedCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            >
              <option value="all">All District Centers</option>
              {centers.map(c => (
                <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {toast && (
        <div className={`p-4 rounded-xl border text-xs font-bold ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-250' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Beds */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Total capacity</span>
            <Bed className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.total}</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">Cots registered</span>
          </div>
        </div>

        {/* Occupied % */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Occupancy Rate</span>
            {stats.occupancyPercent > 80 ? (
              <TrendingUp className="h-5 w-5 text-status-critical" />
            ) : (
              <TrendingDown className="h-5 w-5 text-status-success" />
            )}
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.occupancyPercent}%</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">
              {stats.occupied} beds currently in use
            </span>
          </div>
        </div>

        {/* Available Beds */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Available Cots</span>
            <ShieldCheck className="h-5 w-5 text-status-success" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.available}</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">
              {stats.icuAvailable} ICU | {stats.emergencyAvailable} Emergency free
            </span>
          </div>
        </div>

        {/* Today's flow */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Daily cot flow</span>
            <Activity className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">
              +{stats.admissionsToday} / -{stats.dischargesToday}
            </span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">Admissions vs Discharges</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 text-xs font-bold">
        {user?.role === 'District Health Administrator' && (
          <button
            onClick={() => setActiveTab('district')}
            className={`pb-3 px-4 transition-all border-b-2 ${
              activeTab === 'district' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
            }`}
          >
            District Comparison
          </button>
        )}
        <button
          onClick={() => setActiveTab('my-phc')}
          className={`pb-3 px-4 transition-all border-b-2 ${
            activeTab === 'my-phc' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
          }`}
        >
          {(user?.role === 'PHC Staff' || user?.role === 'CHC Staff') ? 'My Facility Registers' : 'Facility Analytics'}
        </button>
        <button
          onClick={() => setActiveTab('visuals')}
          className={`pb-3 px-4 transition-all border-b-2 ${
            activeTab === 'visuals' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
          }`}
        >
          Visual Trends & Timelines
        </button>
      </div>

      {/* DISTRICT VIEW TAB */}
      {activeTab === 'district' && user?.role === 'District Health Administrator' && (
        <div className="space-y-6">
          {/* Critical PHC Alerts */}
          {capacityRisks.some(r => r.risk === 'Critical') && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-status-critical shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-xs text-status-critical block">CRITICAL OVERCAPACITY ALERT</span>
                <span className="text-xs text-red-800 block mt-1">
                  {capacityRisks.filter(r => r.risk === 'Critical').map(r => r.name).join(', ')} exceeded 90% occupancy threshold. 
                  Trigger AI redistribution recommendations below to refer incoming patients.
                </span>
              </div>
            </div>
          )}

          {/* Smart Redistribution recommendations */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Smart Patient Redistribution Advisor</h3>
                <p className="text-xs text-slate-400 mt-0.5">AI-backed patient redistribution suggestions based on travel time and nearby low-occupancy clinics.</p>
              </div>
              <Sparkles className="h-5 w-5 text-brand-orange" />
            </div>

            <div className="space-y-3">
              {activeRedistributions.map((r, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {r.sourcePhcName} (High Load)
                      </span>
                      <span className="text-slate-400 font-bold">➔</span>
                      <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">
                        {r.targetPhcName} (Available Target)
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">{r.reason}</p>
                    <div className="flex gap-4 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Distance: {r.distance} km</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Est. Travel Time: {r.travelTime} mins</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerToast(`Referral route authorized to ${r.targetPhcName}. Dispatch notification sent.`)}
                    className="px-4 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs shadow hover:bg-brand-darkBlue transition"
                  >
                    Authorize Referral Route
                  </button>
                </div>
              ))}

              {activeRedistributions.length === 0 && (
                <div className="py-6 text-center text-slate-400 font-bold">
                  ✓ Capacity balances are stable across all district nodes. No active redistribution proposals needed.
                </div>
              )}
            </div>
          </div>

          {/* comparative capacity table */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">District Capacity Registry Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 uppercase text-slate-400 font-bold tracking-wider">
                    <th className="py-3 px-4">Center Node Name</th>
                    <th className="py-3 px-4">Occupancy %</th>
                    <th className="py-3 px-4">Total Cots</th>
                    <th className="py-3 px-4">Occupied</th>
                    <th className="py-3 px-4">Available</th>
                    <th className="py-3 px-4">Risk Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {capacityRisks.map((cr) => (
                    <tr key={cr.centerId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{cr.name}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className={`h-full ${cr.risk === 'Critical' ? 'bg-status-critical' : cr.risk === 'High' ? 'bg-brand-orange' : 'bg-status-success'}`} style={{ width: `${cr.occupancy}%` }} />
                          </div>
                          <span>{cr.occupancy}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">{cr.total}</td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">{cr.occupied}</td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">{cr.available}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          cr.risk === 'Critical' ? 'bg-red-50 text-red-650' : cr.risk === 'High' ? 'bg-orange-50 text-orange-650' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {cr.risk} Risk
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* FACILITY/MY PHC TAB */}
      {activeTab === 'my-phc' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bed Inventory list (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4">
                {centers.find(c => c.centerId === activePhcId)?.centerName || 'Selected'} Roster Pools
              </h3>
              
              <div className="space-y-3">
                {filteredBeds.map(b => (
                  <div key={b.bedId} className="p-4 bg-slate-50 rounded-xl border flex items-center justify-between gap-4 text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{b.bedType} Beds Block</span>
                      <span className="text-[10px] text-slate-400 font-medium">Updated at {new Date(b.UpdatedAt).toLocaleTimeString()}</span>
                    </div>

                    <div className="flex gap-4 font-bold text-slate-500">
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-400">TOTAL</span>
                        <span className="text-slate-700">{b.TotalBeds}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-400">OCCUPIED</span>
                        <span className="text-slate-700">{b.OccupiedBeds}</span>
                      </div>
                      <div className="text-center">
                        <span className="block text-[10px] text-slate-400">AVAILABLE</span>
                        <span className="text-brand-blue">{b.AvailableBeds}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredBeds.length === 0 && (
                  <div className="py-6 text-center text-slate-400 font-bold">
                    No bed pools initialized for this facility. Add bed pools below.
                  </div>
                )}
              </div>
            </div>

            {/* AI Occupancy Forecast card */}
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Gemini AI Bed Capacity Forecasting</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Analyses patient footfall trends and seasonal caseload indicators.</p>
                </div>
                <button
                  onClick={handleRunForecast}
                  disabled={isForecasting || activePhcId === 'all'}
                  className="px-3 py-1.5 bg-brand-orange text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow hover:bg-orange-650 disabled:opacity-50"
                >
                  {isForecasting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generate AI Forecast
                </button>
              </div>

              {predictions[activePhcId] ? (
                <div className="p-4 bg-slate-50 border rounded-xl space-y-3.5 text-xs text-slate-500">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">AI Prediction Output</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                      predictions[activePhcId].riskLevel === 'Critical' ? 'bg-red-50 text-red-650' : 'bg-emerald-50 text-emerald-800'
                    }`}>
                      {predictions[activePhcId].riskLevel} Capacity Risk
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-slate-700">
                    <div className="p-3 bg-white border rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold block">Tomorrow Occupancy</span>
                      <span className="text-lg font-extrabold text-brand-blue block mt-1">{predictions[activePhcId].expectedOccupancyTomorrow}% Expected</span>
                    </div>
                    <div className="p-3 bg-white border rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold block">Confidence Level</span>
                      <span className="text-lg font-extrabold text-brand-orange block mt-1">{predictions[activePhcId].confidenceScore}%</span>
                    </div>
                  </div>

                  <div className="p-3 bg-white border rounded-xl border-dashed">
                    <span className="font-bold text-[9px] uppercase block tracking-wider mb-1 text-slate-400">AI Reasoning</span>
                    <p className="font-medium text-slate-600 leading-relaxed">{predictions[activePhcId].reasoning}</p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-bold text-xs bg-slate-50 border border-dashed rounded-xl">
                  Click "Generate AI Forecast" to query Gemini prediction logs.
                </div>
              )}
            </div>
          </div>

          {/* Bed Registry Update Form (1 col) */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4">Edit Bed Block Roster</h3>
              
              <form onSubmit={handleUpdateBeds} className="space-y-4 text-xs">
                {/* Bed Type */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Bed Category Block</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="General">General Wards</option>
                    <option value="ICU">Intensive Care Unit (ICU)</option>
                    <option value="Emergency">Emergency Triage</option>
                    <option value="Isolation">Isolation/Infirmary</option>
                    <option value="Maternity">Maternity Wing</option>
                    <option value="Pediatric">Pediatric Ward</option>
                  </select>
                </div>

                {/* Total Beds */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Total Cots Assigned</label>
                  <input
                    type="number"
                    value={formTotal}
                    onChange={(e) => setFormTotal(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Occupied Beds */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Active Occupied Cots</label>
                  <input
                    type="number"
                    value={formOccupied}
                    onChange={(e) => setFormOccupied(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Reserved Beds */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Reserved Cots</label>
                  <input
                    type="number"
                    value={formReserved}
                    onChange={(e) => setFormReserved(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>

                {/* Maintenance Beds */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Maintenance Beds</label>
                  <input
                    type="number"
                    value={formMaintenance}
                    onChange={(e) => setFormMaintenance(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdating || activePhcId === 'all'}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-darkBlue transition disabled:opacity-50"
                >
                  {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Bed Configuration
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VISUAL TRENDS TAB */}
      {activeTab === 'visuals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bed Occupancy Timeline Chart */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Historical Bed Occupancy Timeline</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalTrendData}>
                  <defs>
                    <linearGradient id="colorBeds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F5FBF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#1F5FBF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Occupancy %" stroke="#1F5FBF" strokeWidth={2} fillOpacity={1} fill="url(#colorBeds)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bed Type distribution Pie Chart */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-4">Capacity Bed Type Distributions</h3>
              {bedTypeData.length > 0 ? (
                <div className="h-60 flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={bedTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {bedTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-bold text-xs">
                  No distribution details.
                </div>
              )}
            </div>

            {/* Legends */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 pt-4 border-t">
              {bedTypeData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate">{d.name} ({d.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* District Comparison Bar chart */}
          {user?.role === 'District Health Administrator' && (
            <div className="lg:col-span-3 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4">District-wide Occupancy Comparisons</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={phcComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Occupancy %" fill="#1F5FBF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Available Beds" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BedManagementPage;
