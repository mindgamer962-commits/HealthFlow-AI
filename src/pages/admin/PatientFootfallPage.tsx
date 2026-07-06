import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  Clock,
  Calendar,
  Building2,
  Plus,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MapPin,
  Save,
  ArrowRight,
  Info,
  Loader2,
  ChevronDown,
  ChevronUp,
  UserCheck,
  X
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { usePhcStore } from '../../store/phcStore';
import { useFootfallStore } from '../../store/footfallStore';
import { PatientFootfall } from '../../types';

const COLORS = ['#1F5FBF', '#F57C00', '#10B981', '#8B5CF6'];

export const PatientFootfallPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { centers, subscribeToCenters } = usePhcStore();
  const {
    footfalls,
    predictions,
    loading: storeLoading,
    subscribeToFootfalls,
    addFootfallRecord,
    runAiFootfallForecast
  } = useFootfallStore();

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'demographics' | 'phc-analytics'>('overview');
  const [selectedMapNodeId, setSelectedMapNodeId] = useState<string | null>(null);
  
  // Custom forecast inputs
  const [forecastSeason, setForecastSeason] = useState('Monsoon');
  const [forecastWeather, setForecastWeather] = useState('Heavy Rain');
  const [forecastFestival, setForecastFestival] = useState('None');
  const [isForecasting, setIsForecasting] = useState(false);

  // Form states for PHC Staff input
  const [showAddForm, setShowAddForm] = useState(false);
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [formMale, setFormMale] = useState(15);
  const [formFemale, setFormFemale] = useState(20);
  const [formChildren, setFormChildren] = useState(8);
  const [formSeniors, setFormSeniors] = useState(5);
  const [formEmergency, setFormEmergency] = useState(3);
  const [formOpd, setFormOpd] = useState(38);
  const [formIpd, setFormIpd] = useState(7);

  // Subscribe to updates
  useEffect(() => {
    const unsubCenters = subscribeToCenters();
    const unsubFootfalls = subscribeToFootfalls();
    return () => {
      unsubCenters();
      unsubFootfalls();
    };
  }, []);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Restrict center selection for staff
  useEffect(() => {
    if (user?.role === 'PHC Staff' || user?.role === 'CHC Staff') {
      if (user.phcId) {
        setSelectedCenterId(user.phcId);
      }
    }
  }, [user]);

  // Bidirectional map-dropdown synchronization
  useEffect(() => {
    if (selectedCenterId !== 'all') {
      setSelectedMapNodeId(selectedCenterId);
    }
  }, [selectedCenterId]);

  // Aggregate statistics for selected facility
  const stats = useMemo(() => {
    const filtered = selectedCenterId === 'all'
      ? footfalls
      : footfalls.filter(f => f.healthCenterId === selectedCenterId);

    if (filtered.length === 0) {
      return {
        today: 0, yesterday: 0, last7: 0, last30: 0, average: 0,
        peakHour: 'N/A', peakDay: 'N/A', maxCount: 0, minCount: 0,
        emergencyRate: 0, opdRate: 0, ipdRate: 0
      };
    }

    // Sort by date descending
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    const todayCount = sorted[0]?.totalPatients || 0;
    const yesterdayCount = sorted[1]?.totalPatients || 0;

    const last7List = sorted.slice(0, 7);
    const last30List = sorted.slice(0, 30);

    const total7 = last7List.reduce((sum, f) => sum + f.totalPatients, 0);
    const total30 = last30List.reduce((sum, f) => sum + f.totalPatients, 0);
    
    const averagePatients = Math.round(total30 / (last30List.length || 1));
    const maxCount = Math.max(...filtered.map(f => f.totalPatients));
    const minCount = Math.min(...filtered.map(f => f.totalPatients));

    // Peak day calculation
    const daysCount: Record<string, number> = {};
    filtered.forEach(f => {
      const dayName = new Date(f.date).toLocaleDateString('en-US', { weekday: 'long' });
      daysCount[dayName] = (daysCount[dayName] || 0) + f.totalPatients;
    });
    const peakDay = Object.keys(daysCount).sort((a, b) => daysCount[b] - daysCount[a])[0] || 'Monday';

    // Demographic breakdowns
    const totalDemographics = total30 || 1;
    const emergencyTotal = last30List.reduce((sum, f) => sum + f.emergencyPatients, 0);
    const opdTotal = last30List.reduce((sum, f) => sum + f.opdPatients, 0);
    const ipdTotal = last30List.reduce((sum, f) => sum + f.ipdPatients, 0);

    return {
      today: todayCount,
      yesterday: yesterdayCount,
      last7: total7,
      last30: total30,
      average: averagePatients,
      peakHour: todayCount > 60 ? '11:00 AM - 01:00 PM' : '10:00 AM - 12:00 PM',
      peakDay,
      maxCount,
      minCount,
      emergencyRate: Math.round((emergencyTotal / totalDemographics) * 100),
      opdRate: Math.round((opdTotal / totalDemographics) * 100),
      ipdRate: Math.round((ipdTotal / totalDemographics) * 100)
    };
  }, [footfalls, selectedCenterId]);

  // Aggregate demographics lists for Recharts
  const demographicsChartData = useMemo(() => {
    const last30 = selectedCenterId === 'all'
      ? footfalls.slice(0, 100)
      : footfalls.filter(f => f.healthCenterId === selectedCenterId).slice(0, 30);

    let male = 0, female = 0, children = 0, seniors = 0;
    last30.forEach(f => {
      male += f.malePatients;
      female += f.femalePatients;
      children += f.childrenPatients;
      seniors += f.seniorCitizens;
    });

    return [
      { name: 'Male Patients', value: male },
      { name: 'Female Patients', value: female },
      { name: 'Children', value: children },
      { name: 'Senior Citizens', value: seniors }
    ];
  }, [footfalls, selectedCenterId]);

  // Daily Consumption/OPD trend chart data
  const trendChartData = useMemo(() => {
    const filtered = selectedCenterId === 'all'
      ? footfalls
      : footfalls.filter(f => f.healthCenterId === selectedCenterId);

    // Group by date
    const grouped: Record<string, { date: string; OPD: number; IPD: number; Emergency: number; Total: number }> = {};
    
    filtered.forEach(f => {
      if (!grouped[f.date]) {
        grouped[f.date] = { date: f.date, OPD: 0, IPD: 0, Emergency: 0, Total: 0 };
      }
      grouped[f.date].OPD += f.opdPatients;
      grouped[f.date].IPD += f.ipdPatients;
      grouped[f.date].Emergency += f.emergencyPatients;
      grouped[f.date].Total += f.totalPatients;
    });

    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10); // Show last 10 days
  }, [footfalls, selectedCenterId]);

  // District Comparison lists
  const districtComparisonData = useMemo(() => {
    const result: Record<string, { name: string; OPD: number; IPD: number; Emergency: number; Total: number }> = {};
    
    centers.forEach(c => {
      result[c.centerId] = { name: c.centerName.split(' ')[0], OPD: 0, IPD: 0, Emergency: 0, Total: 0 };
    });

    footfalls.forEach(f => {
      if (result[f.healthCenterId]) {
        result[f.healthCenterId].OPD += f.opdPatients;
        result[f.healthCenterId].IPD += f.ipdPatients;
        result[f.healthCenterId].Emergency += f.emergencyPatients;
        result[f.healthCenterId].Total += f.totalPatients;
      }
    });

    return Object.values(result).sort((a, b) => b.Total - a.Total);
  }, [footfalls, centers]);

  // Dynamic Alerts center generator based on predictions and capacity
  const activeAlerts = useMemo(() => {
    const list: { id: string; phcId: string; phcName: string; type: string; msg: string; severity: 'Critical' | 'Warning' | 'Info' }[] = [];
    
    centers.forEach(c => {
      const pred = predictions[c.centerId];
      if (!pred) return;

      pred.alerts.forEach((alert, i) => {
        let severity: 'Critical' | 'Warning' | 'Info' = 'Info';
        let msg = '';
        
        if (alert === 'PHC Capacity Reached' || alert === 'Overcrowding Expected') {
          severity = 'Critical';
          msg = `CRITICAL Overcrowding Threat at ${c.centerName}: Predicted load reaches capacity limits. Risk of clinic triage congestion.`;
        } else if (alert === 'Doctor Shortage Risk') {
          severity = 'Warning';
          msg = `Warning: Clinician scarcity at ${c.centerName}. Active roster attendance cannot support the predicted ${pred.tomorrowCount} tomorrow.`;
        } else if (alert === 'Medicine Demand Increase') {
          severity = 'Warning';
          msg = `Supply Warning: Stock out acceleration forecast for Paracetamol and Saline at ${c.centerName} due to rising footfalls.`;
        } else {
          msg = `Notice: Patient load is showing a rising trend at ${c.centerName}.`;
        }

        list.push({
          id: `alert-ff-${c.centerId}-${i}`,
          phcId: c.centerId,
          phcName: c.centerName,
          type: alert,
          msg,
          severity
        });
      });
    });

    return list;
  }, [predictions, centers]);

  // Helper to project coordinates dynamically on the vector map
  const getMapNodePosition = (c: any) => {
    const initialCoords: Record<string, { cx: number; cy: number }> = {
      'phc-1': { cx: 200, cy: 120 },
      'phc-2': { cx: 280, cy: 180 },
      'phc-3': { cx: 420, cy: 80 },
      'phc-4': { cx: 340, cy: 260 },
      'phc-5': { cx: 90, cy: 210 },
      'phc-6': { cx: 450, cy: 230 }
    };
    
    if (initialCoords[c.centerId]) {
      return initialCoords[c.centerId];
    }
    
    const minLng = 91.50;
    const maxLng = 92.05;
    const minLat = 25.25;
    const maxLat = 25.65;
    
    const lat = c.latitude || 25.45;
    const lng = c.longitude || 91.75;
    
    const x = 54 + ((lng - minLng) / (maxLng - minLng)) * 432;
    const y = 288 - ((lat - minLat) / (maxLat - minLat)) * 256;
    
    const clampedX = Math.min(500, Math.max(40, x));
    const clampedY = Math.min(280, Math.max(40, y));
    
    return { cx: Math.round(clampedX), cy: Math.round(clampedY) };
  };

  const MAP_NODES = useMemo(() => {
    return centers.map(c => {
      const coords = getMapNodePosition(c);
      return {
        id: c.centerId,
        name: c.centerName,
        cx: coords.cx,
        cy: coords.cy
      };
    });
  }, [centers]);

  const mapSelectedNodeDetails = useMemo(() => {
    if (!selectedMapNodeId) return null;
    const center = centers.find(c => c.centerId === selectedMapNodeId);
    if (!center) return null;

    const centerFootfalls = footfalls.filter(f => f.healthCenterId === selectedMapNodeId);
    const sorted = [...centerFootfalls].sort((a, b) => b.date.localeCompare(a.date));
    const todayCount = sorted[0]?.totalPatients || 0;
    const prediction = predictions[selectedMapNodeId];

    // Evaluate risk based on overcrowding alerts
    let risk = 'Low';
    if (prediction?.alerts.includes('PHC Capacity Reached')) risk = 'Critical';
    else if (prediction?.alerts.includes('Overcrowding Expected') || prediction?.alerts.includes('Doctor Shortage Risk')) risk = 'High';
    else if (prediction?.alerts.includes('Patient Load Increasing')) risk = 'Medium';

    return {
      center,
      todayCount,
      prediction,
      risk
    };
  }, [selectedMapNodeId, centers, footfalls, predictions]);

  // Trigger Gemini AI Demand Forecasting
  const handleRunForecast = async () => {
    if (selectedCenterId === 'all') {
      triggerToast("Select a specific facility to generate AI forecasts.", "error");
      return;
    }

    setIsForecasting(true);
    triggerToast("Contacting Gemini supply chains intelligence engine...", "success");

    try {
      await runAiFootfallForecast(selectedCenterId, {
        season: forecastSeason,
        weather: forecastWeather,
        festival: forecastFestival
      });
      triggerToast("Gemini patient demand predictions generated successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Failed to run Gemini forecast.", "error");
    } finally {
      setIsForecasting(false);
    }
  };

  // Submit new daily patient counts (Staff portal use-case)
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.phcId) {
      triggerToast("Only facility operators can submit local footfall records.", "error");
      return;
    }

    const total = Number(formMale) + Number(formFemale) + Number(formChildren) + Number(formSeniors);
    const checkSum = Number(formEmergency) + Number(formOpd) + Number(formIpd);

    if (total !== checkSum) {
      triggerToast(`Verification Mismatch: Patient demographics total (${total}) must equal OPD+IPD+Emergency total (${checkSum})!`, "error");
      return;
    }

    try {
      await addFootfallRecord({
        healthCenterId: user.phcId,
        date: formDate,
        day: Number(formDate.split('-')[2]),
        month: Number(formDate.split('-')[1]),
        year: Number(formDate.split('-')[0]),
        malePatients: Number(formMale),
        femalePatients: Number(formFemale),
        childrenPatients: Number(formChildren),
        seniorCitizens: Number(formSeniors),
        totalPatients: total,
        emergencyPatients: Number(formEmergency),
        opdPatients: Number(formOpd),
        ipdPatients: Number(formIpd),
        createdBy: user.name
      });
      
      triggerToast("Today's patient footfall recorded and synced successfully!");
      setShowAddForm(false);
    } catch (err: any) {
      triggerToast(err.message || "Failed to save record.", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast notifications */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 p-4 rounded-xl shadow-apex-lg flex items-center gap-3 text-xs font-bold ${
              toast.type === 'error' ? 'bg-red-650 text-white' : 'bg-slate-900 text-white'
            }`}
          >
            {toast.type === 'error' ? <XCircle className="h-4.5 w-4.5 text-white" /> : <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />}
            <span>{toast.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-apex p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-apex-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-brand-blue/10 text-brand-blue font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              District Analytics Console
            </span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Patient Footfall Intelligence</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none">
            Clinical Patient Traffic & Load Forecasting
          </h2>
          <p className="text-sm text-slate-500 max-w-2xl mt-1.5">
            Audit OPD/IPD flows across regional clinics. Utilize seasonal demand projections and Gemini AI forecasting to adjust clinical staffing registers and local inventory levels.
          </p>
        </div>

        {/* Action Button: Staff can record patient numbers */}
        {(user?.role === 'PHC Staff' || user?.role === 'CHC Staff') && (
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl shadow transition-all-ease shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Record Today's Counts</span>
          </button>
        )}
      </div>

      {/* Visual Analytics Selector Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-white p-4 border rounded-apex shadow-apex-sm no-print">
        <div className="flex items-center gap-1">
          <Building2 className="h-4.5 w-4.5 text-slate-400 shrink-0" />
          <select
            value={selectedCenterId}
            disabled={user?.role === 'PHC Staff' || user?.role === 'CHC Staff'}
            onChange={(e) => setSelectedCenterId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none disabled:bg-slate-100 disabled:cursor-not-allowed"
          >
            <option value="all">All District Facilities</option>
            {centers.map(c => (
              <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
            ))}
          </select>
        </div>

        {/* Tab switcher buttons */}
        <div className="md:col-span-3 flex justify-end gap-1 text-xs">
          {[
            { id: 'overview', label: 'Command Overview' },
            { id: 'trends', label: 'OPD/IPD Trends' },
            { id: 'demographics', label: 'Demographics' },
            { id: 'phc-analytics', label: 'District PHC/CHC Comparison' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-bold transition-all border ${
                activeTab === tab.id
                  ? 'bg-brand-blue border-brand-blue text-white shadow-sm'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Statistics Scorecards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Patient Traffic", val: stats.today, change: stats.today >= stats.yesterday, color: 'text-brand-blue bg-blue-50/50' },
          { label: "Yesterday's Counts", val: stats.yesterday, note: 'Synced registry data', color: 'text-slate-700 bg-slate-50' },
          { label: 'Weekly Average', val: Math.round(stats.last7 / 7), note: 'Per facility daily average', color: 'text-brand-orange bg-orange-50/50' },
          { label: 'Peak Traffic Day', val: stats.peakDay, note: 'Highest average outpatient load', color: 'text-emerald-700 bg-emerald-50' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border rounded-apex p-4 flex flex-col justify-between shadow-apex-sm">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block tracking-wider">{item.label}</span>
            <div className="flex items-baseline justify-between mt-2.5">
              <span className={`text-xl font-extrabold px-3 py-0.5 rounded-xl ${item.color}`}>{item.val}</span>
              {item.change !== undefined && (
                <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${item.change ? 'text-emerald-600' : 'text-red-500'}`}>
                  {item.change ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {item.change ? 'Upward' : 'Downward'}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-450 font-semibold mt-2.5 block">{item.note || 'Dynamic computation'}</span>
          </div>
        ))}
      </div>

      {/* MAIN COMMAND SCREEN TAB VIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1 & 2: Hub Vector Map and Inter-Facility Alerts */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* SVG Interactive Map */}
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3.5">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <MapPin className="h-4.5 w-4.5 text-brand-blue" />
                    <span>Vector Hub Map: Traffic & Demands</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Evaluate real-time OPD metrics and AI load forecasts for district clinics.</p>
                </div>
                <span className="text-[10px] bg-slate-100 font-bold px-2.5 py-1 rounded-full text-slate-550 uppercase tracking-wider">East Khasi Map</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* SVG Drawing */}
                <div className="md:col-span-2 bg-slate-900 border rounded-2xl relative overflow-hidden flex items-center justify-center p-2" style={{ height: '320px' }}>
                  <svg className="w-full h-full" viewBox="0 0 540 320" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100%" height="100%" fill="url(#mapGrid)" />
                    {MAP_NODES.map((n, i) => {
                      const cFootfalls = footfalls.filter(f => f.healthCenterId === n.id);
                      const sorted = [...cFootfalls].sort((a, b) => b.date.localeCompare(a.date));
                      const todayCount = sorted[0]?.totalPatients || 0;
                      const pred = predictions[n.id];

                      let pinColor = '#10B981'; // Green (Normal)
                      if (pred?.alerts.includes('PHC Capacity Reached')) pinColor = '#EF4444'; // Red (Critical)
                      else if (pred?.alerts.includes('Overcrowding Expected') || pred?.alerts.includes('Doctor Shortage Risk')) pinColor = '#F57C00'; // Orange (High)
                      else if (pred?.alerts.includes('Patient Load Increasing')) pinColor = '#EAB308'; // Yellow (Medium)

                      const isSelected = selectedMapNodeId === n.id;

                      return (
                        <g
                          key={i}
                          className="cursor-pointer group"
                          onClick={() => {
                            setSelectedMapNodeId(n.id);
                            setSelectedCenterId(n.id);
                          }}
                        >
                          {isSelected && (
                            <circle cx={n.cx} cy={n.cy} r="18" fill="transparent" stroke={pinColor} strokeWidth="2.5" className="animate-ping" opacity="0.5" />
                          )}
                          <circle cx={n.cx} cy={n.cy} r={isSelected ? '13' : '10'} fill={`${pinColor}22`} stroke={pinColor} strokeWidth="2.5" className="transition-all" />
                          <circle cx={n.cx} cy={n.cy} r="5" fill={pinColor} />
                          <text
                            x={n.cx}
                            y={n.cy - 16}
                            fill="#f8fafc"
                            fontSize="9.5"
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ textShadow: '0px 1px 3px rgba(0,0,0,0.9)' }}
                          >
                            {n.name.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Selected Node Sidebar Overlay */}
                <div className="flex flex-col justify-between min-h-[300px] text-xs">
                  {mapSelectedNodeDetails ? (
                    <div className="space-y-4">
                      <div className="border-b pb-2">
                        <span className="text-[10px] text-brand-blue font-bold uppercase tracking-wider block">
                          {mapSelectedNodeDetails.center.centerType} Node Profile
                        </span>
                        <h4 className="font-extrabold text-xs text-slate-800">{mapSelectedNodeDetails.center.centerName}</h4>
                      </div>

                      <div className="space-y-3.5 font-semibold text-slate-650">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Today's Patients</span>
                          <span className="font-extrabold text-slate-850 text-sm">{mapSelectedNodeDetails.todayCount} patients</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">AI Risk Rating</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                            mapSelectedNodeDetails.risk === 'Critical'
                              ? 'bg-red-50 text-red-650 animate-pulse'
                              : mapSelectedNodeDetails.risk === 'High'
                              ? 'bg-orange-50 text-brand-orange'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {mapSelectedNodeDetails.risk}
                          </span>
                        </div>

                        {mapSelectedNodeDetails.prediction ? (
                          <div className="p-3 bg-slate-50 border rounded-xl space-y-1.5">
                            <span className="text-[9px] text-brand-blue uppercase font-extrabold block">AI Prediction Tomorrow</span>
                            <div className="flex justify-between text-slate-700">
                              <span>Expected Load:</span>
                              <span className="font-bold text-slate-900">{mapSelectedNodeDetails.prediction.tomorrowCount} Patients</span>
                            </div>
                            <div className="flex justify-between text-slate-700">
                              <span>Confidence:</span>
                              <span className="font-bold text-slate-900">{mapSelectedNodeDetails.prediction.confidenceScore}%</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50/50 border border-dashed rounded-xl text-slate-400 italic text-[11px] font-medium text-center">
                            No AI demand forecast loaded. Use the forecasting panel to trigger.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col justify-center items-center text-center h-full text-slate-450 p-4 border border-dashed rounded-2xl">
                      <Info className="h-8 w-8 text-slate-300 mb-2" />
                      <p className="font-bold text-[11.5px]">Select a facility on the map to audit patient footfall.</p>
                    </div>
                  )}

                  {mapSelectedNodeDetails && (
                    <div className="pt-4 border-t">
                      <button
                        onClick={() => navigate(`/phcs/${selectedMapNodeId}`)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl text-xs shadow-sm transition-all"
                      >
                        <span>Audit Clinical Staffing</span>
                        <ArrowRight className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* AI Patient Capacity Alerts Card */}
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="h-4.5 w-4.5 text-brand-orange animate-pulse" />
                    <span>AI Traffic & Overcrowding Alert Center</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium">Audits patient loads and flags overcrowding bottlenecks or resource shortfalls.</p>
                </div>
                <span className="text-[10px] bg-red-100 font-bold px-2 py-0.5 rounded-full text-red-750">
                  {activeAlerts.length} Active Warnings
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 text-xs">
                {activeAlerts.length > 0 ? (
                  activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3.5 border rounded-xl flex items-center gap-3.5 shadow-apex-sm border-l-4 ${
                        alert.severity === 'Critical'
                          ? 'border-l-red-500 bg-red-50/10'
                          : 'border-l-orange-500 bg-orange-50/5'
                      }`}
                    >
                      <AlertTriangle className={`h-5 w-5 shrink-0 ${alert.severity === 'Critical' ? 'text-red-500' : 'text-brand-orange'}`} />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{alert.type}</span>
                          <span className="text-[9.5px] text-slate-400 font-semibold uppercase">{alert.phcName}</span>
                        </div>
                        <p className="text-slate-650 font-medium leading-relaxed mt-0.5">{alert.msg}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-450 font-bold border border-dashed rounded-xl">
                    No overcrowding risks or doctor shortage warnings detected. Patient traffic normal.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Column 3: Gemini AI Demand Forecasting Config Panel */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-apex p-6 shadow-apex-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3.5">
                <Sparkles className="h-5 w-5 text-brand-orange animate-pulse" />
                <h3 className="font-extrabold text-sm uppercase tracking-wider">AI Traffic Forecasting Engine</h3>
              </div>

              <div className="space-y-4 text-xs leading-relaxed font-semibold text-slate-350">
                <p className="text-slate-300 font-medium">
                  Run Gemini Content analysis to calculate tomorrow's patient load and predict the 7-day surge index.
                </p>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-slate-400 block font-bold">Climate/Weather Context</label>
                    <select
                      value={forecastWeather}
                      onChange={(e) => setForecastWeather(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none text-white"
                    >
                      <option value="Normal Clear">Clear / Mild Temperature</option>
                      <option value="Heavy Rain / Flooding">Heavy Monsoonal Rains</option>
                      <option value="Cold Wave / Temperature Dip">Cold Wave / Temperature Dip</option>
                      <option value="Dry Season Surge">Dry Season Surge</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block font-bold">Holiday / Festival Period</label>
                    <select
                      value={forecastFestival}
                      onChange={(e) => setForecastFestival(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none text-white"
                    >
                      <option value="None">Regular Weekday Ops</option>
                      <option value="Major Local Festival">Major Festival (National Holiday)</option>
                      <option value="Weekly Village Market Day">Weekly Village Market Day</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 block font-bold">Surge Season profile</label>
                    <select
                      value={forecastSeason}
                      onChange={(e) => setForecastSeason(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 cursor-pointer focus:outline-none text-white"
                    >
                      <option value="Summer Outbreak">Summer Outbreak season</option>
                      <option value="Monsoon viral surge">Monsoon viral surge</option>
                      <option value="Winter Respiratory season">Winter Respiratory season</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleRunForecast}
                  disabled={isForecasting}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-orange hover:bg-orange-600 disabled:bg-slate-750 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                >
                  {isForecasting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Gemini Forecasting...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>Forecast Selected Node Load</span>
                    </>
                  )}
                </button>

                {/* Render Selected Prediction Details */}
                {selectedCenterId !== 'all' && predictions[selectedCenterId] && (
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-3.5 text-slate-350 bg-slate-850 p-4 rounded-xl">
                    <span className="font-bold text-[10px] text-brand-orange uppercase block tracking-wider">AI Forecast Insights</span>
                    
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-slate-800 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-bold">Tomorrow Load</span>
                        <span className="text-lg font-extrabold text-white block mt-0.5">{predictions[selectedCenterId].tomorrowCount} Patients</span>
                      </div>
                      <div className="bg-slate-800 p-2.5 rounded-lg">
                        <span className="text-[10px] text-slate-400 block font-bold">7-Day Projection</span>
                        <span className="text-lg font-extrabold text-white block mt-0.5">{predictions[selectedCenterId].next7DaysTotal} Patients</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold">Confidence Rating</span>
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-orange rounded-full" style={{ width: `${predictions[selectedCenterId].confidenceScore}%` }} />
                        </div>
                        <span className="font-bold text-white text-xs">{predictions[selectedCenterId].confidenceScore}%</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-bold">Justified Reason</span>
                      <p className="text-[10.5px] leading-relaxed text-slate-200 font-medium italic">
                        "{predictions[selectedCenterId].reason}"
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Link with other operational modules card */}
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-3">
              <div className="border-b pb-2">
                <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">AI Cross-Module Operational Links</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Understand how higher patient traffic dynamically adjusts related capacities.</p>
              </div>

              <div className="space-y-3 text-xs font-semibold text-slate-650">
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-400">Medicine Consumption</span>
                  <span className="font-bold text-slate-800">+12% depletion per 10 patients</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-400">AI Risk Score Coefficient</span>
                  <span className="font-bold text-slate-850">Weight 0.35 (Direct OPD Load)</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b">
                  <span className="text-slate-400">Doctor Requirement Index</span>
                  <span className="font-bold text-slate-850">1 physician per 35 daily OPDs</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Emergency Bed Buffer</span>
                  <span className="font-bold text-slate-850">ICU safety margin: 10% patients</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TREND ANALYTICS VIEW TAB */}
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border rounded-apex p-6 shadow-apex-sm space-y-4">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Daily Patient flow by Category (Last 10 Days)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="OPD" stroke="#1F5FBF" fill="#1F5FBF22" strokeWidth={2} />
                  <Area type="monotone" dataKey="IPD" stroke="#F57C00" fill="#F57C0022" strokeWidth={2} />
                  <Area type="monotone" dataKey="Emergency" stroke="#EF4444" fill="#EF444422" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border rounded-apex p-6 shadow-apex-sm flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">OPD vs Emergency Breakdown</h3>
              <p className="text-xs text-slate-500 font-medium">
                Analysis of emergency vs outpatient triage patterns across the selected facility.
              </p>
              
              <div className="space-y-3.5 text-xs font-semibold text-slate-650 mt-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-slate-800">
                    <span>OPD Rate</span>
                    <span>{stats.opdRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-blue" style={{ width: `${stats.opdRate}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-800">
                    <span>Emergency Triage</span>
                    <span>{stats.emergencyRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${stats.emergencyRate}%` }} />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-slate-800">
                    <span>IPD Admission Rate</span>
                    <span>{stats.ipdRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-orange" style={{ width: `${stats.ipdRate}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t text-[11px] text-slate-400 font-medium italic">
              * Rates computed dynamically over the last 30 operational days.
            </div>
          </div>
        </div>
      )}

      {/* DEMOGRAPHICS TAB VIEW */}
      {activeTab === 'demographics' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border rounded-apex p-6 shadow-apex-sm space-y-4">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Patient Demographic Breakdown (Age & Gender)</h3>
            <div className="h-80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demographicsChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {demographicsChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border rounded-apex p-6 shadow-apex-sm space-y-4">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Demographic Insights</h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Based on the patient registries, the primary clinic demographics are heavily composed of Female and Child outpatient flows, indicating a strong requirement for maternal care, pediatrics, and rehydration salt caches.
            </p>

            <div className="space-y-3 mt-4 text-xs font-semibold text-slate-650">
              {demographicsChartData.map((entry, index) => (
                <div key={index} className="flex justify-between items-center pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[index] }} />
                    <span className="text-slate-500">{entry.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{entry.value} patients</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DISTRICT COMPARISON VIEW */}
      {activeTab === 'phc-analytics' && (
        <div className="bg-white border rounded-apex p-6 shadow-apex-sm space-y-4">
          <div className="border-b pb-3.5">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">District Wide Facility Load Comparison</h3>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Compare OPD, IPD, and Emergency patient load aggregates across all clinics.</p>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="OPD" stackId="a" fill="#1F5FBF" radius={[0, 0, 0, 0]} />
                <Bar dataKey="IPD" stackId="a" fill="#F57C00" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Emergency" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* RECORD TODAY'S COUNT OVERLAY MODAL FORM */}
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border rounded-apex shadow-apex-lg max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-3.5">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-brand-blue" />
                <span>Sync Daily Patient Numbers</span>
              </h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs font-semibold text-slate-650">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-500 font-bold block">Record Date</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Male Patients</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formMale}
                    onChange={(e) => setFormMale(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Female Patients</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formFemale}
                    onChange={(e) => setFormFemale(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Children Patients</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formChildren}
                    onChange={(e) => setFormChildren(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-500 font-bold block">Senior Citizens</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formSeniors}
                    onChange={(e) => setFormSeniors(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1 border-t pt-3 md:col-span-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                  Triage Category Breakdown
                </div>

                <div className="space-y-1">
                  <label className="text-slate-505 font-bold block">OPD Patients</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formOpd}
                    onChange={(e) => setFormOpd(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-505 font-bold block">IPD Patients</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formIpd}
                    onChange={(e) => setFormIpd(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-slate-505 font-bold block">Emergency Patients</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={formEmergency}
                    onChange={(e) => setFormEmergency(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 font-bold text-slate-550"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold rounded-xl shadow"
                >
                  Sync Records
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
