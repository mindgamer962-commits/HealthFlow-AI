import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Pill,
  Users,
  Bed,
  UserCheck,
  FlaskConical,
  Save,
  CheckCircle2,
  ChevronRight,
  Activity,
  Calendar,
  Trash2,
  Plus,
  Phone,
  Award
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePhcStore } from '../../store/phcStore';
import { useUserStore } from '../../store/userStore';
import { useMedicineStore } from '../../store/medicineStore';
import { useCommandStore } from '../../store/commandStore';
import { Doctor, LabTestItem } from '../../types';

export const PhcPortal: React.FC = () => {
  const { user } = useAuthStore();
  const staffPhcId = user?.phcId || 'phc-1';
  const { users } = useUserStore();
  
  const {
    centers,
    doctors,
    labs,
    subscribeToCenters,
    subscribeToDoctors,
    subscribeToLabs,
    updateCenter,
    addDoctor,
    updateDoctor,
    deleteDoctor,
    updateLabAvailability
  } = usePhcStore();

  const {
    stocks: storeStocks,
    medicines: storeMeds,
    subscribeToMedicineData,
    recordTransaction
  } = useMedicineStore();

  const { actions, subscribeToCommandActions, getDynamicRiskScore } = useCommandStore();

  // 1. Subscribe to Firestore databases on mount
  useEffect(() => {
    const unsubUsers = useUserStore.getState().subscribeToUsers();
    const unsubCenters = subscribeToCenters();
    const unsubDocs = subscribeToDoctors();
    const unsubLabs = subscribeToLabs();
    const unsubMeds = subscribeToMedicineData();
    const unsubCommand = subscribeToCommandActions();
    return () => {
      unsubUsers();
      unsubCenters();
      unsubDocs();
      unsubLabs();
      unsubMeds();
      unsubCommand();
    };
  }, []);

  // Fetch the active health center reference
  const phcDetails = useMemo(() => {
    return centers.find((p) => p.centerId === staffPhcId) || centers[0];
  }, [centers, staffPhcId]);

  const report = useMemo(() => {
    return getDynamicRiskScore(staffPhcId);
  }, [getDynamicRiskScore, staffPhcId, centers]);

  const myActions = useMemo(() => {
    return actions.filter(a => a.healthCenterId === staffPhcId);
  }, [actions, staffPhcId]);

  // Form states for local inputs (staff can edit before saving)
  const [patientCount, setPatientCount] = useState<number>(0);
  const [bedsOccupied, setBedsOccupied] = useState<number>(0);
  const [totalBeds, setTotalBeds] = useState<number>(0);

  const [discardingMed, setDiscardingMed] = useState<any>(null);
  const [discardQty, setDiscardQty] = useState<number>(0);
  const [discardReason, setDiscardReason] = useState<'Expired' | 'Damaged'>('Damaged');

  // Sync state whenever phcDetails refreshes from Firestore snapshot
  useEffect(() => {
    if (phcDetails) {
      setPatientCount(phcDetails.patientFootfallToday || 0);
      setBedsOccupied(phcDetails.bedsOccupied || 0);
      setTotalBeds(phcDetails.bedsTotal || 10);
    }
  }, [phcDetails]);

  // Sync registered users matching this phcId to doctors list roster
  const combinedDoctors = useMemo(() => {
    const filtered = doctors.filter(d => d.phcId === staffPhcId);
    const combined = [...filtered];

    users.forEach(u => {
      if (u.phcId === staffPhcId && u.isActive) {
        const exists = combined.some(d => d.id === u.uid || d.id === u.id || d.name.toLowerCase() === u.name.toLowerCase());
        if (!exists) {
          combined.push({
            id: u.uid || u.id,
            name: u.name,
            specialization: u.role,
            phone: u.phone || '+91-00000-00000',
            attendance: 'Present',
            phcId: staffPhcId
          });
        }
      }
    });

    return combined;
  }, [doctors, users, staffPhcId]);

  // Doctor Form inputs
  const [newDocName, setNewDocName] = useState('');
  const [newDocSpec, setNewDocSpec] = useState('');
  const [newDocPhone, setNewDocPhone] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form states mapping for local medicine items
  const portalMeds = useMemo(() => {
    const phcStocks = storeStocks.filter(s => s.phcId === staffPhcId);
    return phcStocks.map(s => {
      const med = storeMeds.find(m => m.medicineId === s.medicineId);
      return {
        id: s.stockId,
        medicineId: s.medicineId,
        name: med ? med.medicineName : 'Unknown',
        stock: s.currentQuantity,
        minThreshold: med ? med.minStockLevel : 100,
        unit: med ? med.packSize.split(' ')[1] || 'Units' : 'Units',
        category: med ? med.category : 'General',
        status: s.currentQuantity < (med ? med.minStockLevel : 100) ? 'Critical' : 'Good'
      };
    });
  }, [storeStocks, storeMeds, staffPhcId]);

  // Filter lab kits for this PHC
  const phcLabs = useMemo(() => {
    return labs.filter(l => l.phcId === staffPhcId || !l.phcId);
  }, [labs, staffPhcId]);

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Computed Present and Total doctor counts
  const doctorsTotal = combinedDoctors.length;
  const doctorsPresent = combinedDoctors.filter((d) => d.attendance === 'Present' || d.attendance === 'On Duty').length;

  const handleMedicineStockChange = async (stockId: string, newStock: number) => {
    const targetStock = storeStocks.find(s => s.stockId === stockId);
    if (!targetStock) return;
    
    const diff = newStock - targetStock.currentQuantity;
    if (diff === 0) return;

    try {
      await recordTransaction({
        medicineId: targetStock.medicineId,
        phcId: targetStock.phcId,
        stockId: targetStock.stockId,
        type: diff > 0 ? 'Stock In' : 'Stock Out',
        quantity: Math.abs(diff),
        userId: user?.uid || 'unknown',
        userName: user?.name || 'Staff User',
        reason: `Daily stock count update in Staff Portal.`
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleDiscardConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discardingMed || discardQty <= 0) return;

    try {
      const targetStock = storeStocks.find(s => s.stockId === discardingMed.id);
      if (!targetStock) return;

      if (discardQty > targetStock.currentQuantity) {
        alert("Cannot discard more than the current available stock.");
        return;
      }

      await recordTransaction({
        medicineId: targetStock.medicineId,
        phcId: targetStock.phcId,
        type: discardReason,
        quantity: discardQty,
        userId: user?.uid || 'unknown',
        userName: user?.name || 'Staff User',
        reason: `Discarded ${discardQty} units. Reason: ${discardReason}.`
      });

      setDiscardingMed(null);
      setDiscardQty(0);
      setSaveStatus(`Successfully recorded discard of ${discardQty} units of ${discardingMed.name}!`);
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Failed to process discard transaction.");
    }
  };

  const handleLabAvailabilityToggle = async (id: string) => {
    const targetLab = labs.find(l => l.id === id);
    if (!targetLab) return;
    try {
      await updateLabAvailability(id, !targetLab.available);
      setSaveStatus("Lab kit status synchronized!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  // Add a doctor to roster list
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName || !newDocSpec) return;

    try {
      await addDoctor({
        name: newDocName,
        specialization: newDocSpec,
        phone: newDocPhone || '+91-94361-XXXXX',
        attendance: 'Present',
        phcId: staffPhcId
      });

      // Update facility counters
      await updateCenter(staffPhcId, {
        totalDoctors: doctorsTotal + 1
      });

      // Reset inputs
      setNewDocName('');
      setNewDocSpec('');
      setNewDocPhone('');
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Remove a doctor from roster list
  const handleRemoveDoctor = async (docId: string) => {
    try {
      await deleteDoctor(docId);
      await updateCenter(staffPhcId, {
        totalDoctors: Math.max(0, doctorsTotal - 1)
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Switch doctor's daily shift attendance status
  const handleAttendanceChange = async (docId: string, status: 'Present' | 'Absent' | 'On Leave' | 'On Duty') => {
    try {
      const exists = doctors.some(d => d.id === docId);
      if (exists) {
        await updateDoctor(docId, { attendance: status });
      } else {
        const matchedCombined = combinedDoctors.find(d => d.id === docId);
        if (matchedCombined) {
          await addDoctor({
            name: matchedCombined.name,
            specialization: matchedCombined.specialization,
            phone: matchedCombined.phone,
            attendance: status,
            phcId: staffPhcId,
            id: docId
          } as any);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (section: string) => {
    setSaveStatus(`Updating ${section} in database...`);
    try {
      if (section === 'Patient & Bed Capacity') {
        await updateCenter(staffPhcId, {
          currentPatients: patientCount,
          bedsOccupied: bedsOccupied,
          totalBeds: totalBeds
        });
      } else if (section === 'Doctor Attendance') {
        await updateCenter(staffPhcId, {
          totalDoctors: doctorsTotal,
          doctorsPresent: doctorsPresent
        });
      }
      setTimeout(() => {
        setSaveStatus(`Successfully synchronized ${section}!`);
        setTimeout(() => setSaveStatus(null), 3000);
      }, 1000);
    } catch (e) {
      console.error(e);
      setSaveStatus(`Failed to update ${section}.`);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  if (!phcDetails) {
    return (
      <div className="py-12 text-center text-xs text-slate-400 font-bold">
        Loading facility dashboard details...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-apex p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-apex-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-brand-blue/15 text-brand-blue font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Portal restricted
            </span>
            <span className="text-xs text-slate-400 font-semibold">• Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {phcDetails.centerName} Operational Updates
          </h2>
          <p className="text-sm text-slate-500">
            Submit daily patient counts, track medicine stocks, and manage physician attendance registers.
          </p>
        </div>

        {saveStatus && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-250 text-emerald-800 rounded-xl text-xs font-bold shadow-sm"
          >
            <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 animate-bounce" />
            <span>{saveStatus}</span>
          </motion.div>
        )}
      </div>

      {/* Explainable AI Risk Score Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
        <div className="md:col-span-1 flex flex-col justify-center items-center p-4 border-r border-slate-100 text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Facility Health Risk Score</span>
          <div className="relative flex items-center justify-center mt-3">
            <span className={`text-4xl font-black ${
              report.level === 'Red' ? 'text-status-critical' : report.level === 'Orange' ? 'text-brand-orange' : 'text-status-success'
            }`}>{report.score}</span>
            <span className="text-xs text-slate-400 font-bold ml-0.5">/100</span>
          </div>
          <span className={`mt-2 inline-block px-3 py-0.5 rounded-full font-bold text-[9px] uppercase ${
            report.level === 'Red' ? 'bg-status-critical/10 text-status-critical' : report.level === 'Orange' ? 'bg-brand-orange/10 text-brand-orange' : 'bg-status-success/10 text-status-success'
          }`}>
            {report.label} Status
          </span>
        </div>

        <div className="md:col-span-2 space-y-4 text-xs font-semibold">
          <div>
            <span className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider block">Explainable AI Justifications</span>
            <div className="space-y-1.5 mt-2">
              {report.explainers.map((exp, idx) => (
                <div key={idx} className="flex gap-2 items-start text-slate-655 leading-relaxed">
                  <span className="text-brand-orange mt-0.5">•</span>
                  <span>{exp}</span>
                </div>
              ))}
            </div>
          </div>

          {myActions.length > 0 && (
            <div className="border-t border-slate-100 pt-3.5 space-y-2">
              <span className="font-extrabold text-[10px] uppercase text-slate-400 tracking-wider block">Active Command Actions</span>
              <div className="space-y-2">
                {myActions.map((act, i) => (
                  <div key={i} className="p-2.5 bg-slate-50 border rounded-xl flex justify-between items-center gap-4">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-slate-800">{act.title}</span>
                      <p className="text-slate-500 font-medium">{act.description}</p>
                    </div>
                    <span className="px-2 py-0.5 bg-[#1F5FBF]/15 text-[#1F5FBF] rounded text-[8px] uppercase font-bold tracking-wider shrink-0">
                      {act.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Roster & Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Patient Footfall & Bed management card */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Users className="h-5 w-5 text-brand-blue" />
              <h3 className="font-bold text-sm text-slate-800">
                Patient & Bed Registries
              </h3>
            </div>

            {/* Patient Footfall Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">
                Today's Patient Footfall Count
              </label>
              <input
                type="number"
                value={patientCount}
                onChange={(e) => setPatientCount(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            {/* Total Bed Capacity Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 block">
                Total Bed Capacity
              </label>
              <input
                type="number"
                value={totalBeds}
                onChange={(e) => setTotalBeds(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              />
            </div>

            {/* Bed Occupancy Tracker slider */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Active Bed Occupancy</span>
                <span className="text-slate-700">{bedsOccupied} / {totalBeds} occupied</span>
              </div>
              <input
                type="range"
                min="0"
                max={totalBeds}
                value={bedsOccupied}
                onChange={(e) => setBedsOccupied(parseInt(e.target.value) || 0)}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand-blue"
              />
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    totalBeds > 0 && bedsOccupied / totalBeds > 0.8 ? 'bg-status-critical' : 'bg-brand-blue'
                  }`}
                  style={{ width: `${totalBeds > 0 ? (bedsOccupied / totalBeds) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSave('Patient & Bed Capacity')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all shadow mt-6"
          >
            <Save className="h-4 w-4" />
            Synchronize Patient Registry
          </button>
        </div>

        {/* Doctor Shift register card */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="font-bold text-sm text-slate-800">
                  Physician Shift Roster
                </h3>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-lg">
                {doctorsPresent} / {doctorsTotal} present
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Active Shift Physicians</span>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-0.5 text-brand-blue font-extrabold hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Add Doctor
              </button>
            </div>

            {/* Collapsed Add Doctor Form */}
            {showAddForm && (
              <form onSubmit={handleAddDoctor} className="p-4 bg-slate-50 border border-dashed rounded-xl space-y-3 text-xs">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">Add Physician Entry</span>
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Physician Name (e.g. Dr. A. Lyngdoh)"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    className="w-full px-2.5 py-2 border rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Specialization (e.g. Pediatrics)"
                    value={newDocSpec}
                    onChange={(e) => setNewDocSpec(e.target.value)}
                    className="w-full px-2.5 py-2 border rounded-lg bg-white"
                  />
                  <input
                    type="text"
                    placeholder="Phone number"
                    value={newDocPhone}
                    onChange={(e) => setNewDocPhone(e.target.value)}
                    className="w-full px-2.5 py-2 border rounded-lg bg-white"
                  />
                </div>
                <div className="flex justify-end gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-2.5 py-1.5 border rounded-lg text-slate-500 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1.5 bg-brand-blue text-white rounded-lg font-bold"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Doctors List Container */}
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {combinedDoctors.map((d) => (
                <div key={d.id} className="p-3 bg-white border border-slate-150 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 block truncate">{d.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Award className="h-3 w-3 text-slate-350" /> {d.specialization}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Attendance selectors P, A, L, O */}
                    <div className="flex border rounded-lg overflow-hidden bg-slate-50">
                      {(['Present', 'Absent', 'On Leave', 'On Duty'] as const).map((status) => {
                        const letter = status === 'Present' ? 'P' : status === 'Absent' ? 'A' : status === 'On Leave' ? 'L' : 'O';
                        const isSelected = d.attendance === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleAttendanceChange(d.id, status)}
                            title={status}
                            className={`w-6 h-6 text-[10px] font-extrabold flex items-center justify-center transition-all ${
                              isSelected
                                ? status === 'Present'
                                  ? 'bg-emerald-500 text-white'
                                  : status === 'Absent'
                                  ? 'bg-red-500 text-white'
                                  : status === 'On Leave'
                                  ? 'bg-yellow-500 text-white'
                                  : 'bg-brand-blue text-white'
                                : 'text-slate-400 hover:bg-slate-100'
                            }`}
                          >
                            {letter}
                          </button>
                        );
                      })}
                    </div>

                    {/* Delete Doctor button */}
                    <button
                      onClick={() => handleRemoveDoctor(d.id)}
                      className="p-1 text-slate-400 hover:text-red-650 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove Doctor"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => handleSave('Doctor Attendance')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all shadow mt-6"
          >
            <CheckCircle2 className="h-4 w-4" />
            Synchronize Doctor Roster
          </button>
        </div>

        {/* Laboratory Kit availability updates */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <FlaskConical className="h-5 w-5 text-purple-500" />
              <h3 className="font-bold text-sm text-slate-800">
                Lab Test Kit Availabilities
              </h3>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500 block">
                Active Diagnostic Kits
              </label>
              <div className="space-y-2">
                {phcLabs.map((lab) => (
                  <div
                    key={lab.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-150"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        {lab.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Daily capacity: {lab.dailyCapacity} tests
                      </span>
                    </div>

                    <button
                      onClick={() => handleLabAvailabilityToggle(lab.id)}
                      className={`text-[10px] uppercase font-extrabold px-2.5 py-1.5 rounded-lg transition-all ${
                        lab.available
                          ? 'bg-status-success/15 text-status-success border border-status-success/20'
                          : 'bg-status-critical/15 text-status-critical border border-status-critical/20'
                      }`}
                    >
                      {lab.available ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleSave('Laboratory Kit Status')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-brand-blue hover:bg-brand-darkBlue text-white font-bold text-xs rounded-xl transition-all shadow mt-6"
          >
            <CheckCircle2 className="h-4 w-4" />
            Lab Kits Synced
          </button>
        </div>
      </div>

      {/* Medicine Inventory levels editing form */}
      <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-brand-orange" />
            <div>
              <h3 className="font-bold text-sm text-slate-800">
                Essential Medicine Inventory Counts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Update stock counts. Warnings trigger automatically at critical thresholds.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleSave('Medicine Inventory')}
            className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline"
          >
            Save All Stocks
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Medicine Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Min. Threshold</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {portalMeds.map((med) => (
                <tr key={med.id} className="hover:bg-slate-50/30">
                  <td className="py-3 px-4 font-bold text-slate-800">
                    {med.name}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {med.category}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={med.stock}
                        onChange={(e) => handleMedicineStockChange(med.id, parseInt(e.target.value) || 0)}
                        className="w-20 px-2 py-1 bg-slate-50 border rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-blue"
                      />
                      <span className="text-[10px] text-slate-400 font-medium">{med.unit}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-semibold">
                    {med.minThreshold} {med.unit}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                        med.status === 'Critical'
                          ? 'bg-status-critical/15 text-status-critical'
                          : 'bg-status-success/15 text-status-success'
                      }`}
                    >
                      {med.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => setDiscardingMed(med)}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 font-bold text-[10px] rounded-lg transition-colors border border-red-100 flex items-center gap-1 mx-auto"
                    >
                      <Trash2 className="h-3 w-3" />
                      Discard
                    </button>
                  </td>
                </tr>
              ))}

              {portalMeds.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-bold">
                    No medicine batches assigned to this PHC. Load batches in Medicine Inventory page.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* DISCARD MEDICINE OVERLAY MODAL */}
      {discardingMed && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border rounded-apex shadow-apex-lg max-w-md w-full p-6 space-y-4 text-xs font-semibold"
          >
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                <Trash2 className="h-4.5 w-4.5 text-red-500" />
                <span>Discard / Remove Medicine Stock</span>
              </h3>
              <button
                type="button"
                onClick={() => setDiscardingMed(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleDiscardConfirm} className="space-y-3.5">
              <div>
                <span className="text-[10px] text-slate-450 block uppercase tracking-wider font-extrabold">Active Medicine</span>
                <span className="font-extrabold text-slate-800 text-sm mt-0.5 block">{discardingMed.name}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">Category: {discardingMed.category} | Current Stock: {discardingMed.stock} {discardingMed.unit}</span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block">Quantity to Remove</label>
                <input
                  type="number"
                  required
                  min="1"
                  max={discardingMed.stock}
                  value={discardQty || ''}
                  onChange={(e) => setDiscardQty(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border rounded-xl font-medium focus:outline-none"
                  placeholder="e.g. 50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-500 font-bold block">Reason for Removal</label>
                <select
                  value={discardReason}
                  onChange={(e) => setDiscardReason(e.target.value as 'Expired' | 'Damaged')}
                  className="w-full px-3 py-2.5 border rounded-xl font-medium focus:outline-none bg-slate-50"
                >
                  <option value="Damaged">Damaged Batch / Broken Package</option>
                  <option value="Expired">Expired Shelf-Life Date reached</option>
                </select>
              </div>

              <div className="pt-4 border-t flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setDiscardingMed(null)}
                  className="px-4 py-2 border rounded-xl hover:bg-slate-50 font-bold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={discardQty <= 0 || discardQty > discardingMed.stock}
                  className="px-4.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm disabled:bg-slate-200 disabled:cursor-not-allowed"
                >
                  Confirm Discard
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default PhcPortal;
