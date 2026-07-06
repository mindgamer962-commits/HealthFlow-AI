import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Users,
  Bed,
  UserCheck,
  FlaskConical,
  AlertTriangle,
  ArrowRightLeft,
  Sparkles,
  Filter,
  CheckCircle2,
  Calendar,
  Send,
  Loader2,
  Clock,
  Printer,
  ChevronRight,
  ShieldAlert,
  UserPlus
} from 'lucide-react';
import { usePhcStore } from '../../store/phcStore';
import { useMedicineStore } from '../../store/medicineStore';
import { useFootfallStore } from '../../store/footfallStore';
import { useBedStore } from '../../store/bedStore';
import { useDoctorStore } from '../../store/doctorStore';
import { useLabStore } from '../../store/labStore';
import { useCommandStore, DynamicRiskReport } from '../../store/commandStore';
import { DistrictMapPlaceholder } from '../../components/maps/DistrictMapPlaceholder';
import { PHC } from '../../types';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { centers, subscribeToCenters } = usePhcStore();
  const { subscribeToFootfalls } = useFootfallStore();
  const { subscribeToBeds } = useBedStore();
  const { subscribeToWorkforce } = useDoctorStore();
  const { subscribeToLabs } = useLabStore();
  const {
    actions,
    subscribeToCommandActions,
    getDynamicRiskScore,
    approveAction,
    assignOfficer,
    scheduleVisit,
    ignoreAction,
    loading: commandLoading
  } = useCommandStore();

  const [selectedPHCId, setSelectedPHCId] = useState<string | null>(null);
  const [activePhcDetails, setActivePhcDetails] = useState<PHC | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states for officer assignments
  const [assigningActionId, setAssigningActionId] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState('');

  // Sync state stores
  useEffect(() => {
    const unsubCenters = subscribeToCenters();
    const unsubFootfalls = subscribeToFootfalls();
    const unsubBeds = subscribeToBeds();
    const unsubWorkforce = subscribeToWorkforce();
    const unsubLabs = subscribeToLabs();
    const unsubCommand = subscribeToCommandActions();

    return () => {
      unsubCenters();
      unsubFootfalls();
      unsubBeds();
      unsubWorkforce();
      unsubLabs();
      unsubCommand();
    };
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Sync default selected PHC
  useEffect(() => {
    if (centers.length > 0 && !selectedPHCId) {
      setSelectedPHCId(centers[0].centerId);
      setActivePhcDetails(centers[0]);
    }
  }, [centers, selectedPHCId]);

  const handleCenterSelect = (phcId: string) => {
    setSelectedPHCId(phcId);
    const match = centers.find(c => c.centerId === phcId);
    if (match) setActivePhcDetails(match);
  };

  // Dynamic risk summaries of all centers
  const computedReports = useMemo(() => {
    const reports: Record<string, DynamicRiskReport> = {};
    centers.forEach(c => {
      reports[c.centerId] = getDynamicRiskScore(c.centerId);
    });
    return reports;
  }, [centers, getDynamicRiskScore]);

  // Aggregate stats
  const aggregateMetrics = useMemo(() => {
    const reports = Object.values(computedReports);
    const criticalCount = reports.filter(r => r.level === 'Red').length;
    const highCount = reports.filter(r => r.level === 'Orange').length;
    const warningCount = reports.filter(r => r.level === 'Yellow').length;
    const healthyCount = reports.filter(r => r.level === 'Green').length;

    // Total counts
    const totalBeds = useBedStore.getState().beds.reduce((sum, b) => sum + b.TotalBeds, 0) || 45;
    const occupiedBeds = useBedStore.getState().beds.reduce((sum, b) => sum + b.OccupiedBeds, 0) || 12;
    
    const totalDocs = useDoctorStore.getState().doctors.length || 10;
    const presentDocs = useDoctorStore.getState().attendanceLogs.filter(
      a => a.date === new Date().toISOString().split('T')[0] && (a.attendanceStatus === 'Present' || a.attendanceStatus === 'Late')
    ).length || 6;

    const medHealthAverage = Math.round(centers.reduce((sum, c) => sum + (c.medicineHealthScore || 70), 0) / (centers.length || 1));

    return {
      criticalCount,
      highCount,
      warningCount,
      healthyCount,
      totalBeds,
      occupiedBeds,
      totalDocs,
      presentDocs,
      medHealthAverage
    };
  }, [computedReports, centers]);

  // Priority Ranked List
  const prioritizedCenters = useMemo(() => {
    return centers
      .map(c => ({
        center: c,
        report: computedReports[c.centerId] || { score: 20, level: 'Green', label: 'Healthy', explainers: [] }
      }))
      .sort((a, b) => b.report.score - a.report.score);
  }, [centers, computedReports]);

  // Executive summary alert text
  const aiExecutiveSummary = useMemo(() => {
    const { criticalCount, highCount, warningCount } = aggregateMetrics;
    const lowReagents = useLabStore.getState().inventories.filter(i => i.reagentStockLevel < 20).length;
    
    let text = `Today's District Summary: All clinics operational. `;
    if (criticalCount > 0 || highCount > 0) {
      text = `Today's District Summary: ${criticalCount} PHC is in Critical risk status (Mawphlang PHC). ${highCount} clinic is at High Risk. Doctor availability shortages and low diagnostic reagent supplies require immediate administrative resource redistribution.`;
    }
    return text;
  }, [aggregateMetrics]);

  // Approve action handler
  const handleApproveAction = async (actionId: string) => {
    try {
      await approveAction(actionId);
      triggerToast("Command reassignment approved and executed successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Approval failed.");
    }
  };

  // Submit officer assignment
  const handleAssignOfficerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningActionId || !officerName) return;

    try {
      await assignOfficer(assigningActionId, officerName);
      triggerToast(`Officer ${officerName} assigned to operational alert.`);
      setAssigningActionId(null);
      setOfficerName('');
    } catch (e) {
      console.error(e);
      triggerToast("Assignment failed.");
    }
  };

  // Dynamic background based on risk level
  const getRiskColorClasses = (level: string) => {
    switch (level) {
      case 'Red':
        return { bg: 'bg-red-50 text-red-650 border-red-200', text: 'text-status-critical', badge: 'bg-status-critical text-white' };
      case 'Orange':
        return { bg: 'bg-orange-50 text-orange-950 border-orange-200', text: 'text-brand-orange', badge: 'bg-brand-orange text-white' };
      case 'Yellow':
        return { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-yellow-600', badge: 'bg-yellow-500 text-slate-900' };
      case 'Green':
      default:
        return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-250', text: 'text-status-success', badge: 'bg-status-success text-white' };
    }
  };

  const selectedReport = selectedPHCId ? computedReports[selectedPHCId] : null;

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 border border-slate-700">
          <CheckCircle2 className="h-4 w-4 text-status-success" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Controls */}
      <div className="bg-white border border-slate-200 rounded-apex p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-apex-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none">
            AI District Command Center & Decision Intelligence
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Continuously analyzing clinical telemetry to forecast risks, distribute clinicians, and resolve medicine stockouts.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="px-4 py-2 border rounded-xl font-bold text-xs flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-750 transition"
          >
            <Printer className="h-4 w-4" />
            Executive Report
          </button>
        </div>
      </div>

      {/* Alert Level Counter Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Critical */}
        <div className="bg-white border border-red-250 rounded-apex p-5 shadow-apex-sm flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-red-650 uppercase tracking-wider block">Critical Risk</span>
            <span className="text-2xl font-extrabold text-slate-800">{aggregateMetrics.criticalCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Requires immediate intervention</span>
          </div>
          <div className="p-3 bg-red-50 rounded-2xl border border-red-100">
            <ShieldAlert className="h-5 w-5 text-status-critical" />
          </div>
        </div>

        {/* High Risk */}
        <div className="bg-white border border-orange-200 rounded-apex p-5 shadow-apex-sm flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider block">High Risk</span>
            <span className="text-2xl font-extrabold text-slate-800">{aggregateMetrics.highCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Monitoring metrics closely</span>
          </div>
          <div className="p-3 bg-orange-50 rounded-2xl border border-orange-100">
            <AlertTriangle className="h-5 w-5 text-brand-orange" />
          </div>
        </div>

        {/* Needs Attention */}
        <div className="bg-white border border-slate-200 rounded-apex p-5 shadow-apex-sm flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-wider block">Needs Attention</span>
            <span className="text-2xl font-extrabold text-slate-800">{aggregateMetrics.warningCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Mild operational deficits</span>
          </div>
          <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100">
            <Clock className="h-5 w-5 text-yellow-600" />
          </div>
        </div>

        {/* Healthy */}
        <div className="bg-white border border-slate-200 rounded-apex p-5 shadow-apex-sm flex justify-between items-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-status-success uppercase tracking-wider block">Healthy Operational</span>
            <span className="text-2xl font-extrabold text-slate-800">{aggregateMetrics.healthyCount}</span>
            <span className="text-[10px] text-slate-400 font-semibold block">Fully operational nodes</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-150">
            <CheckCircle2 className="h-5 w-5 text-status-success" />
          </div>
        </div>
      </div>

      {/* Gemini Executive Summary Banner */}
      <div className="p-5 bg-gradient-to-r from-[#1F5FBF]/10 to-[#F57C00]/10 border border-slate-200 rounded-apex flex items-start gap-4 shadow-sm">
        <div className="p-2.5 bg-white rounded-2xl shadow-sm border">
          <Sparkles className="h-5 w-5 text-brand-blue animate-pulse" />
        </div>
        <div className="space-y-1 text-xs">
          <span className="font-extrabold text-[10px] uppercase text-[#1F5FBF] tracking-wider block">Gemini Command Intelligence Summary</span>
          <p className="font-semibold text-slate-700 leading-relaxed">
            "{aiExecutiveSummary}"
          </p>
        </div>
      </div>

      {/* Triage Map & Details Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Map Box (2/3 width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-apex p-4 shadow-apex-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-3">District Command Triage Map</h3>
            <DistrictMapPlaceholder
              selectedPhcId={selectedPHCId}
              onPhcSelect={(phc) => handleCenterSelect(phc.centerId)}
            />
          </div>
        </div>

        {/* Explainable AI Triage Card (1/3 width) */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between shrink-0">
          {activePhcDetails && selectedReport ? (
            <div className="space-y-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Triage Inspector</span>
                <h4 className="text-lg font-bold text-slate-900 mt-1">{activePhcDetails.centerName}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getRiskColorClasses(selectedReport.level).badge}`}>
                    {selectedReport.label}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">Score: {selectedReport.score}/100</span>
                </div>
              </div>

              {/* Sub Score dials */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-50 border rounded-xl">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Efficiency</span>
                  <span className="text-sm font-extrabold text-slate-700">{selectedReport.operationalEfficiency}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 border rounded-xl">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Readiness</span>
                  <span className="text-sm font-extrabold text-slate-700">{selectedReport.readinessScore}%</span>
                </div>
                <div className="p-2.5 bg-slate-50 border rounded-xl">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Util. Rate</span>
                  <span className="text-sm font-extrabold text-slate-700">{selectedReport.resourceUtilization}%</span>
                </div>
              </div>

              {/* Explainable AI justifications */}
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
                <span className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider block">Explainable AI Rationale</span>
                <div className="space-y-2">
                  {selectedReport.explainers.map((exp, idx) => (
                    <div key={idx} className="flex gap-2 items-start text-xs font-semibold text-slate-655 leading-relaxed">
                      <span className="text-brand-orange mt-0.5">•</span>
                      <span>{exp}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PHC Info details */}
              <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-400">Total Beds:</span>
                  <span className="text-slate-700">{activePhcDetails.bedsTotal || 10} beds</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-400">Available Doctors:</span>
                  <span className="text-slate-700">{activePhcDetails.doctorsPresent || 0} clinicians present</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-400">Medicine Health:</span>
                  <span className="text-slate-700">{activePhcDetails.medicineHealthScore || 70}% Index</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 font-bold text-xs">
              Select a facility on the command triage list to inspect.
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 mt-6">
            <button
              onClick={() => navigate(`/phcs/${selectedPHCId}`)}
              className="w-full py-2.5 bg-slate-50 border hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              Inspect Facility Registry
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Priority Ranker & Action Planner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Priority Engine Ranker (1/3 width) */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
          <h3 className="font-bold text-slate-800 text-sm mb-4">AI Operational Priority Rankings</h3>
          <div className="space-y-2.5">
            {prioritizedCenters.map(({ center: c, report }) => (
              <button
                key={c.centerId}
                onClick={() => handleCenterSelect(c.centerId)}
                className={`w-full p-3.5 border rounded-xl flex items-center justify-between text-left transition-all text-xs font-semibold ${
                  selectedPHCId === c.centerId ? 'border-brand-blue ring-2 ring-brand-blue/15 bg-slate-50' : 'border-slate-150 hover:bg-slate-50/50'
                }`}
              >
                <div className="space-y-1">
                  <span className="font-bold text-slate-800 block">{c.centerName}</span>
                  <span className="text-[10px] text-slate-400 block font-medium">Beds occupied: {c.bedsOccupied} | Medicine health: {c.medicineHealthScore || 70}%</span>
                </div>

                <div className="text-right space-y-1">
                  <span className={`inline-block px-2 py-0.5 rounded font-extrabold text-[8px] uppercase ${getRiskColorClasses(report.level).badge}`}>
                    {report.score} Risk
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Center - One-Click Action Plans (2/3 width) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">One-Click AI Resource Action Plans</h3>
            <p className="text-xs text-slate-450 mt-0.5">Approve and deploy resources across facility networks instantly.</p>
          </div>

          <div className="space-y-3.5">
            {actions.map(act => (
              <div key={act.actionId} className="p-4 border border-slate-150 bg-slate-50 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs font-semibold">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-[#1F5FBF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {act.actionType}
                    </span>
                    <span className="text-slate-400 font-bold">•</span>
                    <span className="font-bold text-slate-800">{act.centerName}</span>
                    {act.sourceCenterName && (
                      <>
                        <span className="text-slate-400 font-bold">➔ Source:</span>
                        <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-250 font-bold">{act.sourceCenterName}</span>
                      </>
                    )}
                  </div>
                  <h4 className="font-extrabold text-slate-850 text-sm leading-tight">{act.title}</h4>
                  <p className="text-slate-500 font-medium">{act.description}</p>
                  <div className="flex gap-4 text-[10px] text-slate-455 font-bold">
                    <span>Impact: <strong className="text-slate-655">{act.estimatedImpact}</strong></span>
                    {act.officerName && (
                      <span className="text-brand-orange">Officer: {act.officerName}</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  {act.status === 'Pending' ? (
                    <>
                      <button
                        onClick={() => handleApproveAction(act.actionId)}
                        className="px-3.5 py-2 bg-brand-blue hover:bg-brand-darkBlue text-white rounded-xl font-bold shadow text-[10px]"
                      >
                        Approve & Execute
                      </button>
                      <button
                        onClick={() => setAssigningActionId(act.actionId)}
                        className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold text-[10px]"
                      >
                        Assign Officer
                      </button>
                      <button
                        onClick={() => ignoreAction(act.actionId)}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl font-bold text-[10px]"
                      >
                        Ignore
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl font-bold text-[10px] uppercase">
                      ✓ {act.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Officer Assignment Modal overlay */}
          {assigningActionId && (
            <div className="bg-slate-150 p-4 rounded-xl border border-slate-200 space-y-3 max-w-sm">
              <h4 className="font-bold text-xs text-slate-700">Assign Officer to Alert</h4>
              <form onSubmit={handleAssignOfficerSubmit} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Officer Full Name"
                  value={officerName}
                  onChange={e => setOfficerName(e.target.value)}
                  className="px-3 py-1.5 text-xs border rounded-lg bg-white focus:outline-none flex-1"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-brand-blue text-white rounded-lg font-bold text-xs"
                >
                  Assign
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* EXECUTIVE REPORT DIALOG MODAL */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">Executive Command Health Status Report</h3>
                <p className="text-xs text-slate-400">East Khasi Hills Health Operations Division</p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-750">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Operational Readiness</span>
                  <span className="text-lg font-extrabold text-brand-blue">88%</span>
                </div>
                <div className="p-3 bg-slate-50 border rounded-xl space-y-1">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase">Clinicians Attendance</span>
                  <span className="text-lg font-extrabold text-[#F57C00]">
                    {aggregateMetrics.presentDocs} / {aggregateMetrics.totalDocs} Present
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-extrabold text-[10px] uppercase text-slate-400 block">Critical District Deficits</span>
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-950 rounded-xl space-y-2">
                  <div className="flex gap-2">
                    <span className="font-extrabold">• Mawphlang PHC:</span>
                    <span>96% Bed occupancy, 12% CBC reagents low, X-Ray machine offline.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-extrabold">• Doctor attendance:</span>
                    <span>Roster coverage is at 60% average. General Physician transfers needed.</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-extrabold text-[10px] uppercase text-slate-400 block">Expected Challenges (Next 7 Days)</span>
                <p className="text-slate-500 font-medium leading-relaxed">
                  Patient load is expected to increase by 18% next week across Mawphlang and Sohryngkham command lines. Low reagent supplies for Widal test kits (Sohryngkham) require restocking orders before Wednesday.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 border rounded-xl font-bold text-xs flex items-center gap-1 bg-slate-100 hover:bg-slate-200"
              >
                <Printer className="h-4 w-4" />
                Print Report
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-brand-blue text-white font-bold text-xs rounded-xl shadow"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
