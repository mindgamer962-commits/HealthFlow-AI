import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FlaskConical,
  Sparkles,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  MapPin,
  Save,
  ArrowRightLeft,
  Info,
  Loader2,
  ShieldCheck,
  Activity,
  Plus,
  Send,
  AlertCircle,
  Wrench,
  Database
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
  Cell
} from 'recharts';
import { useAuthStore } from '../../store/authStore';
import { usePhcStore } from '../../store/phcStore';
import { useLabStore, LabRedistributionRecommendation } from '../../store/labStore';
import { useFootfallStore } from '../../store/footfallStore';
import { LabEquipment, LabTestInventory } from '../../types';
import { db, IS_MOCK_ENV } from '../../config/firebase';
import { doc, setDoc } from 'firebase/firestore';

const PIE_COLORS = ['#1F5FBF', '#F57C00', '#10B981', '#8B5CF6', '#EC4899', '#6366F1'];

export const LabManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { centers, subscribeToCenters } = usePhcStore();
  const {
    tests,
    inventories,
    equipments,
    requests,
    predictions,
    subscribeToLabs,
    updateReagentStock,
    updateEquipmentStatus,
    createTestRequest,
    referTestRequest,
    runAiLabForecast,
    loading: storeLoading
  } = useLabStore();
  const { subscribeToFootfalls } = useFootfallStore();

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'district' | 'inventory' | 'equipment' | 'visuals'>('district');

  // Form states for reagent and machine updates
  const [selectedInvId, setSelectedInvId] = useState('');
  const [formReagentLevel, setFormReagentLevel] = useState(80);
  const [selectedEqId, setSelectedEqId] = useState('');
  const [formEqStatus, setFormEqStatus] = useState<LabEquipment['status']>('Working');

  // Test request order states
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderPatientName, setOrderPatientName] = useState('');
  const [orderPatientId, setOrderPatientId] = useState('');
  const [orderTestId, setOrderTestId] = useState('t-cbc');

  const [isSavingRequest, setIsSavingRequest] = useState(false);
  const [isUpdatingInventory, setIsUpdatingInventory] = useState(false);
  const [isForecasting, setIsForecasting] = useState(false);

  // Sync state stores
  useEffect(() => {
    const unsubCenters = subscribeToCenters();
    const unsubLabs = subscribeToLabs();
    const unsubFootfalls = subscribeToFootfalls();
    return () => {
      unsubCenters();
      unsubLabs();
      unsubFootfalls();
    };
  }, []);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const activePhcId = useMemo(() => {
    if (user?.role === 'PHC Staff' || user?.role === 'CHC Staff') {
      return user.phcId || 'phc-1';
    }
    return selectedCenterId;
  }, [user, selectedCenterId]);

  useEffect(() => {
    if (user?.role === 'PHC Staff' || user?.role === 'CHC Staff') {
      setActiveTab('inventory');
    }
  }, [user]);

  // Filtered inventories
  const filteredInventories = useMemo(() => {
    if (activePhcId === 'all') return inventories;
    return inventories.filter(i => i.healthCenterId === activePhcId);
  }, [inventories, activePhcId]);

  // Auto-initialize default lab registries if empty for this clinic
  useEffect(() => {
    if (activePhcId && activePhcId !== 'all' && !storeLoading && filteredInventories.length === 0) {
      const defaultTests = [
        { testId: 't-cbc', testName: 'CBC (Complete Blood Count)', dailyCapacity: 30 },
        { testId: 't-malaria', testName: 'Malaria Smear Test', dailyCapacity: 25 },
        { testId: 't-glucose', testName: 'Blood Glucose Test', dailyCapacity: 40 },
        { testId: 't-xray', testName: 'Chest X-Ray', dailyCapacity: 15 },
        { testId: 't-widal', testName: 'Typhoid Widal Test', dailyCapacity: 20 }
      ];
      
      const initializeDefaults = async () => {
        try {
          // Initialize inventories
          for (const test of defaultTests) {
            const invId = `inv-${activePhcId}-${test.testId}`;
            const invObj = {
              inventoryId: invId,
              healthCenterId: activePhcId,
              testId: test.testId,
              testName: test.testName,
              isAvailable: true,
              dailyCapacity: test.dailyCapacity,
              todayCompleted: 0,
              todayPending: 0,
              reagentStockLevel: 80,
              updatedAt: new Date().toISOString()
            };
            if (IS_MOCK_ENV) {
              const current = localStorage.getItem('hf_lab_inventories');
              let list = [];
              if (current) {
                try { list = JSON.parse(current); } catch (e) {}
              }
              if (!list.some((i: any) => i.inventoryId === invId)) {
                localStorage.setItem('hf_lab_inventories', JSON.stringify([...list, invObj]));
              }
            } else {
              await setDoc(doc(db, 'test_inventory', invId), invObj);
            }
          }

          // Initialize equipment
          const defaultEquipment = [
            { equipmentId: `eq-${activePhcId}-cbc`, healthCenterId: activePhcId, equipmentName: 'Hematology Analyzer', status: 'Working' as const, installationDate: new Date().toISOString().split('T')[0], lastServiceDate: new Date().toISOString().split('T')[0], nextServiceDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], manufacturer: 'Sysmex' },
            { equipmentId: `eq-${activePhcId}-xray`, healthCenterId: activePhcId, equipmentName: 'X-Ray Machine', status: 'Working' as const, installationDate: new Date().toISOString().split('T')[0], lastServiceDate: new Date().toISOString().split('T')[0], nextServiceDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], manufacturer: 'GE Health' }
          ];

          for (const eq of defaultEquipment) {
            if (IS_MOCK_ENV) {
              const current = localStorage.getItem('hf_lab_equipments');
              let list = [];
              if (current) {
                try { list = JSON.parse(current); } catch (e) {}
              }
              if (!list.some((i: any) => i.equipmentId === eq.equipmentId)) {
                localStorage.setItem('hf_lab_equipments', JSON.stringify([...list, eq]));
              }
            } else {
              await setDoc(doc(db, 'laboratory_equipment', eq.equipmentId), eq);
            }
          }

          // Trigger refresh
          subscribeToLabs();
        } catch (err) {
          console.error("Auto-initialization of lab resources failed:", err);
        }
      };

      initializeDefaults();
    }
  }, [activePhcId, storeLoading, filteredInventories.length]);

  // Filtered equipment
  const filteredEquipment = useMemo(() => {
    if (activePhcId === 'all') return equipments;
    return equipments.filter(e => e.healthCenterId === activePhcId);
  }, [equipments, activePhcId]);

  // Calculations for KPIs
  const stats = useMemo(() => {
    const totalTests = filteredInventories.length;
    const availableTests = filteredInventories.filter(i => i.isAvailable).length;
    const unavailableTests = totalTests - availableTests;

    const workingMachines = filteredEquipment.filter(e => e.status === 'Working').length;
    const maintenanceMachines = filteredEquipment.filter(e => e.status === 'Maintenance').length;

    const pendingTests = filteredInventories.reduce((sum, i) => sum + i.todayPending, 0);
    const completedTests = filteredInventories.reduce((sum, i) => sum + i.todayCompleted, 0);

    return {
      availableTests,
      unavailableTests,
      workingMachines,
      maintenanceMachines,
      pendingTests,
      completedTests,
      avgTurnaroundTime: 24 // average turnaround in minutes
    };
  }, [filteredInventories, filteredEquipment]);

  // Compare test volumes chart
  const testVolumeChartData = useMemo(() => {
    return filteredInventories.map(inv => ({
      name: inv.testName.split(' ')[0],
      Completed: inv.todayCompleted,
      Pending: inv.todayPending
    }));
  }, [filteredInventories]);

  // Compare reagent stock chart
  const reagentStockChartData = useMemo(() => {
    return filteredInventories.map(inv => ({
      name: inv.testName.split(' ')[0],
      'Reagent Stock %': inv.reagentStockLevel
    }));
  }, [filteredInventories]);

  // District comparison (District Dashboard)
  const districtComparisonData = useMemo(() => {
    return centers.map(c => {
      const cInvs = inventories.filter(i => i.healthCenterId === c.centerId);
      const completed = cInvs.reduce((sum, i) => sum + i.todayCompleted, 0);
      const pending = cInvs.reduce((sum, i) => sum + i.todayPending, 0);
      return {
        name: c.centerName,
        Completed: completed,
        Pending: pending
      };
    });
  }, [centers, inventories]);

  // Capacity Deficit status of centers
  const labCapacityStatusList = useMemo(() => {
    return centers.map(c => {
      const cInvs = inventories.filter(i => i.healthCenterId === c.centerId);
      const available = cInvs.filter(i => i.isAvailable).length;
      const total = cInvs.length || 5;

      const hasOfflineMachine = equipments.some(e => e.healthCenterId === c.centerId && e.status !== 'Working');

      let risk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (available === 0 || hasOfflineMachine) risk = 'Critical';
      else if (available < total - 1) risk = 'High';
      else if (available < total) risk = 'Medium';

      return {
        centerId: c.centerId,
        name: c.centerName,
        available,
        total,
        risk
      };
    });
  }, [centers, inventories, equipments]);

  // Active redistribution recommendations
  const activeRedistributions = useMemo(() => {
    const list: (LabRedistributionRecommendation & { sourcePhcName: string })[] = [];
    labCapacityStatusList.forEach(ls => {
      if (ls.risk === 'Critical' || ls.risk === 'High') {
        const pred = predictions[ls.centerId];
        if (pred && pred.recommendations && pred.recommendations.length > 0) {
          pred.recommendations.forEach(r => {
            list.push({
              ...r,
              sourcePhcName: ls.name
            });
          });
        }
      }
    });
    return list;
  }, [labCapacityStatusList, predictions]);

  // Submit test request order
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderPatientName || !orderPatientId) {
      triggerToast("Please fill in patient details.", "error");
      return;
    }

    setIsSavingRequest(true);
    try {
      const selectedTest = tests.find(t => t.testId === orderTestId);
      await createTestRequest({
        patientId: orderPatientId,
        patientName: orderPatientName,
        testId: orderTestId,
        testName: selectedTest?.testName || 'Lab Test',
        healthCenterId: activePhcId
      });
      triggerToast("Laboratory test requisition created successfully!");
      setShowOrderForm(false);
      setOrderPatientName('');
      setOrderPatientId('');
    } catch (e) {
      console.error(e);
      triggerToast("Failed to file test order.", "error");
    } finally {
      setIsSavingRequest(false);
    }
  };

  // Update Reagents Stock level
  const handleUpdateReagent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvId) {
      triggerToast("Please select a diagnostic test pool.", "error");
      return;
    }

    setIsUpdatingInventory(true);
    try {
      await updateReagentStock(selectedInvId, formReagentLevel);
      triggerToast("Reagent stock registry updated successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Update failed.", "error");
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  // Update Equipment Status
  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId) {
      triggerToast("Please select laboratory equipment.", "error");
      return;
    }

    setIsUpdatingInventory(true);
    try {
      await updateEquipmentStatus(selectedEqId, formEqStatus);
      triggerToast("Laboratory equipment status updated successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Update failed.", "error");
    } finally {
      setIsUpdatingInventory(false);
    }
  };

  // Trigger AI analysis
  const handleRunForecast = async () => {
    if (activePhcId === 'all') {
      triggerToast("Select a clinic node target first.", "error");
      return;
    }
    setIsForecasting(true);
    try {
      await runAiLabForecast(activePhcId);
      triggerToast("AI lab capacity evaluation completed!");
    } catch (e) {
      console.error(e);
      triggerToast("AI forecasting failed.", "error");
    } finally {
      setIsForecasting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-apex p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-apex-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none">
            Laboratory Availability & Diagnostic Resource Management
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Real-time reagents monitoring, machine health diagnostics, and smart patient referral recommenders.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'District Health Administrator' ? (
            <select
              value={selectedCenterId}
              onChange={(e) => setSelectedCenterId(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border rounded-xl font-bold focus:outline-none"
            >
              <option value="all">All District Laboratories</option>
              {centers.map(c => (
                <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
              ))}
            </select>
          ) : (
            <button
              onClick={() => setShowOrderForm(!showOrderForm)}
              className="px-3.5 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-brand-darkBlue transition shadow"
            >
              <Plus className="h-4 w-4" />
              File Test Requisition
            </button>
          )}
        </div>
      </div>

      {toast && (
        <div className={`p-4 rounded-xl border text-xs font-bold ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-250' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Test Request Order Form Modal */}
      {showOrderForm && (
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex p-6 max-w-md mx-auto space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Create Diagnostic Test Requisition</h3>
          <form onSubmit={handleCreateRequest} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 block">Patient Full Name</label>
              <input
                type="text"
                placeholder="Patient name"
                value={orderPatientName}
                onChange={e => setOrderPatientName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 block">Patient ID</label>
              <input
                type="text"
                placeholder="PAT-xxxx"
                value={orderPatientId}
                onChange={e => setOrderPatientId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-500 block">Select Diagnostic Test</label>
              <select
                value={orderTestId}
                onChange={e => setOrderTestId(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              >
                {tests.map(t => (
                  <option key={t.testId} value={t.testId}>{t.testName}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowOrderForm(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingRequest}
                className="px-4 py-2 bg-brand-blue text-white rounded-xl font-bold shadow"
              >
                {isSavingRequest ? 'Submitting...' : 'Submit Requisition'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Available Tests */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Available Services</span>
            <FlaskConical className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.availableTests}</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">
              Active test services ({stats.unavailableTests} offline)
            </span>
          </div>
        </div>

        {/* Working Equipment */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Working Equipment</span>
            <ShieldCheck className="h-5 w-5 text-status-success" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.workingMachines}</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">
              {stats.maintenanceMachines} machines under maintenance
            </span>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Pending test queue</span>
            <Activity className="h-5 w-5 text-brand-orange animate-pulse" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.pendingTests}</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">
              {stats.completedTests} tests completed today
            </span>
          </div>
        </div>

        {/* Turnaround Time */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Turnaround</span>
            <Clock className="h-5 w-5 text-slate-450" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.avgTurnaroundTime} mins</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">Average report release time</span>
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
            District Overview
          </button>
        )}
        <button
          onClick={() => setActiveTab('inventory')}
          className={`pb-3 px-4 transition-all border-b-2 ${
            activeTab === 'inventory' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
          }`}
        >
          Test Registries & Reagents
        </button>
        <button
          onClick={() => setActiveTab('equipment')}
          className={`pb-3 px-4 transition-all border-b-2 ${
            activeTab === 'equipment' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
          }`}
        >
          Equipment Health Monitor
        </button>
        <button
          onClick={() => setActiveTab('visuals')}
          className={`pb-3 px-4 transition-all border-b-2 ${
            activeTab === 'visuals' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
          }`}
        >
          Diagnostic Visuals
        </button>
      </div>

      {/* DISTRICT VIEW TAB */}
      {activeTab === 'district' && user?.role === 'District Health Administrator' && (
        <div className="space-y-6">
          {/* Smart Referrals Recommendations */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Smart Patient Referral Advisor</h3>
                <p className="text-xs text-slate-400 mt-0.5">AI-backed patient redistribution recommendations when equipment diagnostics go offline.</p>
              </div>
              <Sparkles className="h-5 w-5 text-brand-orange" />
            </div>

            <div className="space-y-3">
              {activeRedistributions.map((r, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {r.sourcePhcName} ({r.unavailableTestName} Offline)
                      </span>
                      <span className="text-slate-400 font-bold">➔</span>
                      <span className="font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">
                        {r.targetCenterName} (Available Referral Node)
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">{r.reason}</p>
                    <div className="flex gap-4 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Distance: {r.distance} km</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Travel Time: {r.travelTime} mins</span>
                      <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Daily capacity: {r.availableCapacity} tests</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => triggerToast(`Referral route approved to ${r.targetCenterName}. Patient referred.`)}
                    className="px-4 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs shadow hover:bg-brand-darkBlue transition"
                  >
                    Authorize Patient Referral
                  </button>
                </div>
              ))}

              {activeRedistributions.length === 0 && (
                <div className="py-6 text-center text-slate-400 font-bold">
                  ✓ Diagnostic services are fully operational across all district nodes.
                </div>
              )}
            </div>
          </div>

          {/* District lab capacity table */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">District Lab Capacities Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 uppercase text-slate-400 font-bold tracking-wider">
                    <th className="py-3 px-4">Center Node Name</th>
                    <th className="py-3 px-4">Test Availability Status</th>
                    <th className="py-3 px-4">Active test count</th>
                    <th className="py-3 px-4">Deficit Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {labCapacityStatusList.map((ls) => (
                    <tr key={ls.centerId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{ls.name}</td>
                      <td className="py-3 px-4 text-slate-550 font-semibold">
                        {ls.available} / {ls.total} tests active
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${ls.risk === 'Critical' ? 'bg-status-critical' : 'bg-status-success'}`} style={{ width: `${(ls.available / ls.total) * 100}%` }} />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          ls.risk === 'Critical' ? 'bg-red-50 text-red-650' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {ls.risk} Risk
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

      {/* TEST REGISTRIES TAB */}
      {activeTab === 'inventory' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Test inventories details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4">
                {centers.find(c => c.centerId === activePhcId)?.centerName || 'Selected'} Diagnostic Registry
              </h3>

              <div className="space-y-3">
                {filteredInventories.map(inv => (
                  <div key={inv.inventoryId} className="p-4 bg-slate-50 border rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="font-bold text-slate-800 block text-xs">{inv.testName}</span>
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] uppercase ${
                          inv.isAvailable ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-650'
                        }`}>
                          {inv.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] uppercase ${
                          inv.reagentStockLevel < 20 ? 'bg-amber-50 text-amber-800 border animate-pulse' : 'bg-slate-100 text-slate-500'
                        }`}>
                          Reagents: {inv.reagentStockLevel}%
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-4 text-slate-500 font-bold text-right sm:text-left">
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase">Completed</span>
                        <span className="text-slate-700 text-sm">{inv.todayCompleted}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 uppercase">Pending</span>
                        <span className="text-brand-orange text-sm">{inv.todayPending}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Diagnostics forecast */}
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Gemini AI Diagnostic Demand Forecasting</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Analyses patient footfall trends and reagents depletion velocities.</p>
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
                    <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">AI Predictions Output</span>
                    <span className="px-2 py-0.5 rounded font-bold text-[9px] uppercase bg-emerald-50 text-emerald-800">
                      {predictions[activePhcId].confidenceScore}% Confidence
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
                    <div className="p-3 bg-white border rounded-xl space-y-1">
                      <span className="text-[9px] text-slate-450 font-bold block uppercase">Expected Demand tomorrow</span>
                      {Object.entries(predictions[activePhcId].expectedTestDemand).map(([name, val]) => (
                        <div key={name} className="flex justify-between text-xs font-semibold">
                          <span>{name.split(' ')[0]}</span>
                          <span className="text-brand-blue font-bold">{val} cases</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 bg-white border rounded-xl space-y-1">
                      <span className="text-[9px] text-slate-450 font-bold block uppercase">Reagent Shortage Risk</span>
                      {Object.entries(predictions[activePhcId].reagentShortagePrediction).map(([name, shortage]) => (
                        <div key={name} className="flex justify-between text-xs font-semibold">
                          <span>{name.split(' ')[0]}</span>
                          <span className={shortage ? 'text-red-650 font-bold' : 'text-emerald-800'}>
                            {shortage ? 'Shortage Alert' : 'Healthy'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-white border rounded-xl border-dashed">
                    <span className="font-bold text-[9px] uppercase block tracking-wider mb-1 text-slate-450">Clinical Rationale</span>
                    <p className="font-medium text-slate-600 leading-relaxed">{predictions[activePhcId].reasoning}</p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-bold text-xs bg-slate-50 border border-dashed rounded-xl">
                  Click "Generate AI Forecast" to evaluate Gemini diagnostics predictions.
                </div>
              )}
            </div>
          </div>

          {/* Reagents Registry Form */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Update Reagent Level</h3>
              <form onSubmit={handleUpdateReagent} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Select Diagnostic Test</label>
                  <select
                    value={selectedInvId}
                    onChange={e => setSelectedInvId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="">-- Choose Test --</option>
                    {filteredInventories.map(inv => (
                      <option key={inv.inventoryId} value={inv.inventoryId}>{inv.testName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Reagent Stock Percentage (%)</label>
                  <input
                    type="number"
                    value={formReagentLevel}
                    onChange={e => setFormReagentLevel(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingInventory || !selectedInvId}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-darkBlue transition disabled:opacity-50"
                >
                  {isUpdatingInventory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Reagent Level
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* EQUIPMENT MONITOR TAB */}
      {activeTab === 'equipment' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Equipment list (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Diagnostics Equipment Register</h3>
            <div className="space-y-3">
              {filteredEquipment.map(eq => (
                <div key={eq.equipmentId} className="p-4 bg-slate-50 border rounded-xl flex items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-bold text-slate-800 block text-xs">{eq.equipmentName}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">Manufacturer: {eq.manufacturer} | Last Service: {eq.lastServiceDate}</span>
                  </div>

                  <div className="flex gap-4 items-center">
                    <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] uppercase ${
                      eq.status === 'Working' ? 'bg-emerald-50 text-emerald-800 border' : eq.status === 'Maintenance' ? 'bg-amber-50 text-amber-800 border' : 'bg-red-50 text-red-650 border animate-pulse'
                    }`}>
                      {eq.status}
                    </span>
                  </div>
                </div>
              ))}

              {filteredEquipment.length === 0 && (
                <div className="py-6 text-center text-slate-400 font-bold">
                  No diagnostic machinery registered for this facility.
                </div>
              )}
            </div>
          </div>

          {/* Equipment editor form */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
              <h3 className="font-bold text-slate-800 text-sm">Update Equipment Status</h3>
              <form onSubmit={handleUpdateEquipment} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Select Diagnostic Machine</label>
                  <select
                    value={selectedEqId}
                    onChange={e => setSelectedEqId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="">-- Choose Machine --</option>
                    {filteredEquipment.map(eq => (
                      <option key={eq.equipmentId} value={eq.equipmentId}>{eq.equipmentName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 block">Status</label>
                  <select
                    value={formEqStatus}
                    onChange={e => setFormEqStatus(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
                  >
                    <option value="Working">Working (Active)</option>
                    <option value="Maintenance">Maintenance Due</option>
                    <option value="Offline">Offline (Malfunction)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingInventory || !selectedEqId}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-darkBlue transition disabled:opacity-50"
                >
                  {isUpdatingInventory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                  Save Equipment Status
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VISUALS TAB */}
      {activeTab === 'visuals' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Volume Recharts chart */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Diagnostics Daily Test Volume</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={testVolumeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Completed" fill="#1F5FBF" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Pending" fill="#F57C00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Reagents consumption chart */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Active Reagent Stocks level</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reagentStockChartData}>
                  <defs>
                    <linearGradient id="colorReagent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Reagent Stock %" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorReagent)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* District Comparison Chart */}
          {user?.role === 'District Health Administrator' && (
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
              <h3 className="font-bold text-slate-800 text-sm mb-4">District-wide Test Volume comparison</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Completed" fill="#1F5FBF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Pending" fill="#F57C00" radius={[4, 4, 0, 0]} />
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

export default LabManagementPage;
