import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
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
  UserCheck,
  UserX,
  QrCode,
  Plus,
  Send,
  Sliders,
  CheckSquare,
  TrendingUp
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
import { useDoctorStore, DoctorRedistributionRecommendation } from '../../store/doctorStore';
import { useFootfallStore } from '../../store/footfallStore';
import { DoctorProfile, DoctorAttendance } from '../../types';

const PIE_COLORS = ['#1F5FBF', '#F57C00', '#10B981', '#8B5CF6', '#EC4899', '#6366F1'];

export const DoctorWorkforcePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { centers, subscribeToCenters } = usePhcStore();
  const {
    doctors,
    attendanceLogs,
    transfers,
    predictions,
    subscribeToWorkforce,
    addDoctorProfile,
    checkInDoctor,
    checkOutDoctor,
    recommendWorkforceTransfer,
    runAiWorkforcePrediction,
    loading: storeLoading
  } = useDoctorStore();
  const { predictions: footfallPredictions, subscribeToFootfalls } = useFootfallStore();

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'district' | 'roster' | 'attendance' | 'visuals'>('district');

  // QR Check-in Simulator state
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedDocIdForQr, setSelectedDocIdForQr] = useState<string>('');

  // Add doctor profile form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSpecialization, setFormSpecialization] = useState('General Medicine');
  const [formQualification, setFormQualification] = useState('MBBS');
  const [formRegNo, setFormRegNo] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCenter, setFormCenter] = useState('phc-1');
  const [formEmployment, setFormEmployment] = useState<'Full-time' | 'Part-time' | 'Contract' | 'Consultant'>('Full-time');
  
  // Checking/Checkout form states
  const [checkInRemarks, setCheckInRemarks] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<DoctorAttendance['attendanceStatus']>('Present');
  const [checkInLateMinutes, setCheckInLateMinutes] = useState(0);
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, DoctorAttendance['attendanceStatus']>>({});

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingAttendance, setIsUpdatingAttendance] = useState(false);
  const [isForecasting, setIsForecasting] = useState(false);

  // Sync registries
  useEffect(() => {
    const unsubCenters = subscribeToCenters();
    const unsubWorkforce = subscribeToWorkforce();
    const unsubFootfalls = subscribeToFootfalls();
    return () => {
      unsubCenters();
      unsubWorkforce();
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
      setActiveTab('attendance');
    }
  }, [user]);

  // Target today's date ISO
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Filtered doctors list
  const filteredDoctors = useMemo(() => {
    if (activePhcId === 'all') return doctors;
    return doctors.filter(d => d.assignedHealthCenter === activePhcId);
  }, [doctors, activePhcId]);

  // Filtered attendance logs for today
  const todayAttendance = useMemo(() => {
    return attendanceLogs.filter(a => a.date === todayStr);
  }, [attendanceLogs, todayStr]);

  // Calculations for KPIs
  const stats = useMemo(() => {
    const total = filteredDoctors.length;
    const activeCenterIds = filteredDoctors.map(d => d.assignedHealthCenter);
    
    // Present today
    const present = todayAttendance.filter(a => 
      activeCenterIds.includes(a.healthCenterId) && 
      (a.attendanceStatus === 'Present' || a.attendanceStatus === 'Late')
    ).length;

    // Absent today
    const absent = todayAttendance.filter(a => 
      activeCenterIds.includes(a.healthCenterId) && 
      a.attendanceStatus === 'Absent'
    ).length;

    // Late check-ins
    const late = todayAttendance.filter(a => 
      activeCenterIds.includes(a.healthCenterId) && 
      a.attendanceStatus === 'Late'
    ).length;

    // Calculate averages from historical logs
    const centerLogs = attendanceLogs.filter(a => activeCenterIds.includes(a.healthCenterId));
    const totalPresentLogs = centerLogs.filter(a => a.attendanceStatus === 'Present' || a.attendanceStatus === 'Late').length;
    const avgAttendance = centerLogs.length > 0 ? Math.round((totalPresentLogs / centerLogs.length) * 100) : 92;

    const totalWorkingHours = centerLogs.filter(a => a.date === todayStr && a.workingHours > 0).reduce((sum, a) => sum + a.workingHours, 0);
    const presentTodayCount = centerLogs.filter(a => a.date === todayStr && a.workingHours > 0).length;
    const avgWorkingHours = presentTodayCount > 0 ? Number((totalWorkingHours / presentTodayCount).toFixed(1)) : 7.2;

    return {
      total,
      present,
      absent,
      late,
      avgAttendance,
      avgWorkingHours
    };
  }, [filteredDoctors, todayAttendance, attendanceLogs, todayStr]);

  // Specialization Pie Chart
  const specializationData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredDoctors.forEach(d => {
      map[d.specialization] = (map[d.specialization] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredDoctors]);

  // Attendance rates by facility
  const districtAttendanceData = useMemo(() => {
    return centers.map(c => {
      const cDocs = doctors.filter(d => d.assignedHealthCenter === c.centerId);
      const cLogs = attendanceLogs.filter(a => a.healthCenterId === c.centerId && a.date === todayStr);
      const present = cLogs.filter(l => l.attendanceStatus === 'Present' || l.attendanceStatus === 'Late').length;
      const rate = cDocs.length > 0 ? Math.round((present / cDocs.length) * 100) : 100;
      return {
        name: c.centerName,
        'Attendance Rate %': rate,
        'Active Doctors': cDocs.length
      };
    });
  }, [centers, doctors, attendanceLogs, todayStr]);

  // Staffing deficit calculations
  const staffingDeficits = useMemo(() => {
    return centers.map(c => {
      const cDocs = doctors.filter(d => d.assignedHealthCenter === c.centerId && d.status === 'Active');
      const cFootfall = footfallPredictions[c.centerId]?.tomorrowCount || 40;
      
      const ratio = cDocs.length > 0 ? Math.round(cFootfall / cDocs.length) : cFootfall;
      
      let risk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      if (ratio > 45) risk = 'Critical';
      else if (ratio > 30) risk = 'High';
      else if (ratio > 15) risk = 'Medium';

      return {
        centerId: c.centerId,
        name: c.centerName,
        docsCount: cDocs.length,
        footfall: cFootfall,
        ratio,
        risk
      };
    });
  }, [centers, doctors, footfallPredictions]);

  // Active redistribution recommends list
  const activeRedistributions = useMemo(() => {
    const list: (DoctorRedistributionRecommendation & { sourcePhcName: string })[] = [];
    staffingDeficits.forEach(sd => {
      if (sd.risk === 'Critical' || sd.risk === 'High') {
        const pred = predictions[sd.centerId];
        if (pred && pred.recommendations && pred.recommendations.length > 0) {
          pred.recommendations.forEach(r => {
            list.push({
              ...r,
              sourcePhcName: r.sourceCenterName
            });
          });
        }
      }
    });
    return list;
  }, [staffingDeficits, predictions]);

  // Save new Doctor profile (Admin only)
  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formRegNo || !formEmail) {
      triggerToast("Please fill in all required fields.", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      await addDoctorProfile({
        doctorName: formName,
        photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150',
        specialization: formSpecialization,
        qualification: formQualification,
        registrationNumber: formRegNo,
        phone: formPhone,
        email: formEmail,
        assignedHealthCenter: formCenter,
        employmentType: formEmployment,
        status: 'Active'
      });
      triggerToast("Doctor profile registered successfully!");
      setShowAddForm(false);
      setFormName('');
      setFormRegNo('');
      setFormEmail('');
      setFormPhone('');
    } catch (e) {
      console.error(e);
      triggerToast("Registration failed.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Perform Manual / QR Check-in
  const handleCheckIn = async (docId: string, customCheckIn: string = '09:00 AM', status: DoctorAttendance['attendanceStatus'] = 'Present') => {
    setIsUpdatingAttendance(true);
    try {
      await checkInDoctor(
        docId,
        activePhcId,
        customCheckIn,
        status,
        status === 'Late' ? 15 : 0,
        checkInRemarks || 'Checked in at facility registry.'
      );
      triggerToast("Check-in registered successfully!");
      setShowQrModal(false);
      setCheckInRemarks('');
    } catch (e) {
      console.error(e);
      triggerToast("Check-in register error.", "error");
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  // Perform checkout
  const handleCheckOut = async (attendanceId: string) => {
    setIsUpdatingAttendance(true);
    try {
      await checkOutDoctor(attendanceId, '04:00 PM', 7.0);
      triggerToast("Check-out registered successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Check-out register error.", "error");
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  // Trigger AI deficit evaluation
  const handleRunForecast = async () => {
    if (activePhcId === 'all') {
      triggerToast("Select a clinic target first.", "error");
      return;
    }
    setIsForecasting(true);
    try {
      await runAiWorkforcePrediction(activePhcId);
      triggerToast("AI workforce analysis completed successfully!");
    } catch (e) {
      console.error(e);
      triggerToast("Forecasting failed.", "error");
    } finally {
      setIsForecasting(false);
    }
  };

  // Authorize doctor redistribution transfers
  const handleAuthorizeTransfer = async (r: DoctorRedistributionRecommendation) => {
    setIsUpdatingAttendance(true);
    try {
      await recommendWorkforceTransfer(
        r.doctorId,
        r.sourceCenterId,
        r.targetCenterId,
        r.reason,
        r.durationDays,
        user?.name || 'Administrator'
      );
      triggerToast(`Authorized temporary transfer of ${r.doctorName} to ${r.targetCenterName}!`);
    } catch (e) {
      console.error(e);
      triggerToast("Transfer authorization failed.", "error");
    } finally {
      setIsUpdatingAttendance(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="bg-white border border-slate-200 rounded-apex p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-apex-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 leading-none">
            Smart Doctor Attendance & Workforce Intelligence
          </h2>
          <p className="text-sm text-slate-500 mt-1.5">
            Real-time physician check-in terminals, dynamic workload risk calculations, and AI staffing reassignments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'District Health Administrator' ? (
            <>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3.5 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs flex items-center gap-1.5 hover:bg-brand-darkBlue transition shadow"
              >
                <Plus className="h-4 w-4" />
                Add Physician
              </button>

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
            </>
          ) : (
            <span className="text-xs font-extrabold text-slate-500 bg-slate-50 border px-3 py-1.5 rounded-xl">
              Assigned Clinic: {centers.find(c => c.centerId === activePhcId)?.centerName || 'My Facility'}
            </span>
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

      {/* Profile Registration Modal */}
      {showAddForm && (
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex p-6 max-w-xl mx-auto space-y-4">
          <h3 className="font-bold text-slate-800 text-sm border-b pb-2">Add New Physician Profile</h3>
          
          <form onSubmit={handleAddDoctor} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Full Name *</label>
              <input
                type="text"
                placeholder="Dr. Name"
                value={formName}
                onChange={e => setFormName(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>
            
            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Specialization *</label>
              <select
                value={formSpecialization}
                onChange={e => setFormSpecialization(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              >
                <option value="General Medicine">General Medicine</option>
                <option value="Pediatrics">Pediatrics</option>
                <option value="Gynecology">Gynecology</option>
                <option value="Cardiology">Cardiology</option>
                <option value="General Surgery">General Surgery</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Qualifications *</label>
              <input
                type="text"
                placeholder="MBBS, MD"
                value={formQualification}
                onChange={e => setFormQualification(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">MCI Registration Number *</label>
              <input
                type="text"
                placeholder="MCI-xxxxx"
                value={formRegNo}
                onChange={e => setFormRegNo(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Phone Number *</label>
              <input
                type="text"
                placeholder="+91-xxxxx"
                value={formPhone}
                onChange={e => setFormPhone(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Email Address *</label>
              <input
                type="email"
                placeholder="doctor@healthflow.gov.in"
                value={formEmail}
                onChange={e => setFormEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Assigned Health Center *</label>
              <select
                value={formCenter}
                onChange={e => setFormCenter(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              >
                {centers.map(c => (
                  <option key={c.centerId} value={c.centerId}>{c.centerName}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Employment Type</label>
              <select
                value={formEmployment}
                onChange={e => setFormEmployment(e.target.value as any)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Consultant">Consultant</option>
              </select>
            </div>

            <div className="col-span-1 md:col-span-2 pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 bg-slate-100 rounded-xl font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                className="px-4 py-2 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-darkBlue shadow"
              >
                {isSavingProfile ? 'Saving...' : 'Register Profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Doctors */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Workforce roster</span>
            <Users className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.total}</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">Assigned physicians</span>
          </div>
        </div>

        {/* Present Today */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Present Today</span>
            <UserCheck className="h-5 w-5 text-status-success" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">
              {stats.present} <span className="text-xs font-bold text-slate-400">on duty</span>
            </span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">
              {stats.late} checked-in late today
            </span>
          </div>
        </div>

        {/* Average Attendance rate */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Attendance Index</span>
            <ShieldCheck className="h-5 w-5 text-status-success" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.avgAttendance}%</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">Last 30 days average</span>
          </div>
        </div>

        {/* Average hours */}
        <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-5 space-y-3">
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Shift Hours</span>
            <Clock className="h-5 w-5 text-brand-orange" />
          </div>
          <div>
            <span className="text-2xl font-extrabold text-slate-800">{stats.avgWorkingHours} hrs</span>
            <span className="text-slate-400 text-xs font-semibold block mt-1">Shift duration average</span>
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
            District Workforce map
          </button>
        )}
        <button
          onClick={() => setActiveTab('roster')}
          className={`pb-3 px-4 transition-all border-b-2 ${
            activeTab === 'roster' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
          }`}
        >
          Staff Directory & Schedules
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 transition-all border-b-2 ${
            activeTab === 'attendance' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
          }`}
        >
          Roster Check-in Terminal
        </button>
        <button
          onClick={() => setActiveTab('visuals')}
          className={`pb-3 px-4 transition-all border-b-2 ${
            activeTab === 'visuals' ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-400'
          }`}
        >
          Attendance Timelines
        </button>
      </div>

      {/* DISTRICT VIEW TAB */}
      {activeTab === 'district' && user?.role === 'District Health Administrator' && (
        <div className="space-y-6">
          {/* Smart Workforce Redistribution Suggestions */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Smart Doctor Redistribution Advisor</h3>
                <p className="text-xs text-slate-400 mt-0.5">AI-reassignment recommendations based on patient-to-practitioner workloads and active rosters.</p>
              </div>
              <Sparkles className="h-5 w-5 text-brand-orange" />
            </div>

            <div className="space-y-3">
              {activeRedistributions.map((r, i) => (
                <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {r.doctorName} ({r.specialization})
                      </span>
                      <span className="text-slate-400 font-bold">➔</span>
                      <span className="font-extrabold text-red-650 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                        {r.targetCenterName} (Staff Deficit)
                      </span>
                    </div>
                    <p className="text-slate-500 font-medium">{r.reason}</p>
                    <div className="flex gap-4 text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Distance: {r.distance} km</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Recommended Duration: {r.durationDays} Days</span>
                      <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-800" /> Expected: {r.expectedImprovement}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleAuthorizeTransfer(r)}
                    className="px-4 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs shadow hover:bg-brand-darkBlue transition"
                  >
                    Authorize Reassignment
                  </button>
                </div>
              ))}

              {activeRedistributions.length === 0 && (
                <div className="py-6 text-center text-slate-400 font-bold">
                  ✓ Practitioner allocations are balanced across all district nodes. No active redistribution proposals needed.
                </div>
              )}
            </div>
          </div>

          {/* District deficit comparison grid */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Patient-to-Doctor Workload Strain Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 uppercase text-slate-400 font-bold tracking-wider">
                    <th className="py-3 px-4">Center Node Name</th>
                    <th className="py-3 px-4">Roster count</th>
                    <th className="py-3 px-4">Expected load tomorrow</th>
                    <th className="py-3 px-4">Patient-to-Doctor Ratio</th>
                    <th className="py-3 px-4">Staffing Deficit Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffingDeficits.map((sd) => (
                    <tr key={sd.centerId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-800">{sd.name}</td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">{sd.docsCount} doctors</td>
                      <td className="py-3 px-4 text-slate-500 font-semibold">{sd.footfall} patients</td>
                      <td className="py-3 px-4 text-slate-650 font-bold">{sd.ratio} : 1</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                          sd.risk === 'Critical' ? 'bg-red-50 text-red-650' : sd.risk === 'High' ? 'bg-orange-50 text-orange-650' : 'bg-emerald-50 text-emerald-800'
                        }`}>
                          {sd.risk} Deficit Risk
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

      {/* ROSTER DIRECTORY TAB */}
      {activeTab === 'roster' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctors directory list */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Physicians Directory Roster</h3>
            <div className="divide-y divide-slate-100">
              {filteredDoctors.map(doc => (
                <div key={doc.doctorId} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <img src={doc.photo} alt={doc.doctorName} className="h-10 w-10 rounded-full object-cover border" />
                    <div>
                      <span className="font-extrabold text-slate-800 block text-xs">{doc.doctorName}</span>
                      <span className="text-[10px] text-brand-blue font-bold block">{doc.specialization} | {doc.qualification}</span>
                      <span className="text-[10px] text-slate-400 font-semibold block">{doc.registrationNumber}</span>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      {centers.find(c => c.centerId === doc.assignedHealthCenter)?.centerName || 'Assigned'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium block">Phone: {doc.phone}</span>
                    <span className="text-[9px] text-slate-400 font-semibold block">Email: {doc.email}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedules list */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Shift Schedules</h3>
            <div className="space-y-3 text-xs">
              {doctors.map(d => {
                const centerDocsIds = filteredDoctors.map(x => x.doctorId);
                if (!centerDocsIds.includes(d.doctorId)) return null;

                return (
                  <div key={d.doctorId} className="p-3 bg-slate-50 rounded-xl border space-y-1.5">
                    <span className="font-bold text-slate-800 block">{d.doctorName}</span>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Mon, Wed, Fri</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> 09:00 AM - 04:00 PM</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE TERMINAL TAB */}
      {activeTab === 'attendance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Attendance check-in buttons (2 cols) */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">Clinical Check-in / Check-out Logs</h3>
            <p className="text-xs text-slate-400 mt-0.5">Click doctor check-in or quick QR scan below to register check-ins.</p>

            <div className="divide-y divide-slate-100">
              {filteredDoctors.map(doc => {
                const log = todayAttendance.find(a => a.doctorId === doc.doctorId && a.healthCenterId === activePhcId);
                const isCheckedIn = !!log;
                const isCheckedOut = isCheckedIn && log.checkOut !== '--';

                return (
                  <div key={doc.doctorId} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    <div className="flex items-center gap-3">
                      <img src={doc.photo} alt={doc.doctorName} className="h-10 w-10 rounded-full object-cover border" />
                      <div>
                        <span className="font-bold text-slate-800 block">{doc.doctorName}</span>
                        <span className="text-[10px] text-slate-400 font-medium block">
                          {doc.specialization}
                        </span>
                        {isCheckedIn && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded font-extrabold text-[8px] uppercase ${
                            log.attendanceStatus === 'Late' ? 'bg-amber-50 text-amber-800 border border-amber-250' : 'bg-emerald-50 text-emerald-800 border border-emerald-250'
                          }`}>
                            {log.attendanceStatus} (In: {log.checkIn})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {!isCheckedIn ? (
                        <div className="flex gap-2 items-center">
                          <select
                            value={selectedStatuses[doc.doctorId] || 'Present'}
                            onChange={(e) => setSelectedStatuses(prev => ({ ...prev, [doc.doctorId]: e.target.value as any }))}
                            className="px-2 py-1 text-xs bg-slate-50 border rounded-xl font-bold focus:outline-none"
                          >
                            <option value="Present">Present</option>
                            <option value="Absent">Absent</option>
                            <option value="On Leave">On Leave</option>
                            <option value="On Duty">On Duty</option>
                            <option value="Late">Late</option>
                          </select>
                          
                          <button
                            onClick={() => {
                              setSelectedDocIdForQr(doc.doctorId);
                              setShowQrModal(true);
                            }}
                            className="px-3 py-1.5 bg-slate-50 border hover:bg-slate-100 rounded-xl font-bold text-slate-700 flex items-center gap-1.5"
                          >
                            <QrCode className="h-4.5 w-4.5" />
                            QR Check-in
                          </button>
                          <button
                            onClick={() => {
                              const status = selectedStatuses[doc.doctorId] || 'Present';
                              handleCheckIn(doc.doctorId, status === 'Late' ? '09:15 AM' : '09:00 AM', status);
                            }}
                            className="px-3 py-1.5 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-darkBlue"
                          >
                            Manual Check-in
                          </button>
                        </div>
                      ) : !isCheckedOut ? (
                        <button
                          onClick={() => handleCheckOut(log.attendanceId)}
                          className="px-3 py-1.5 bg-brand-orange text-white rounded-xl font-bold hover:bg-orange-650"
                        >
                          Mark Check-out
                        </button>
                      ) : (
                        <span className="font-extrabold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-xl block">
                          Checkout complete (Out: {log.checkOut})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Workforce analysis & alerts */}
          <div className="space-y-6">
            {/* AI forecast trigger */}
            <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">AI Workforce Deficit Forecaster</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Gemini predictions evaluating doctor count shortages.</p>
                </div>
                <button
                  onClick={handleRunForecast}
                  disabled={isForecasting || activePhcId === 'all'}
                  className="px-3 py-1.5 bg-brand-orange text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow hover:bg-orange-650 disabled:opacity-50"
                >
                  {isForecasting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  Generate AI Analysis
                </button>
              </div>

              {predictions[activePhcId] ? (
                <div className="p-4 bg-slate-50 border rounded-xl space-y-3.5 text-xs text-slate-500">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <span className="font-bold text-slate-700 block uppercase tracking-wider text-[9px]">AI Staffing Prediction</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                      predictions[activePhcId].staffingRiskLevel === 'Critical' ? 'bg-red-50 text-red-650 border border-red-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-250'
                    }`}>
                      {predictions[activePhcId].staffingRiskLevel} Staffing Risk
                    </span>
                  </div>

                  <div className="p-3 bg-white border rounded-xl">
                    <span className="text-[10px] text-slate-400 font-bold block">Doctor Deficit Expected Tomorrow?</span>
                    <span className={`text-sm font-extrabold block mt-1 ${predictions[activePhcId].doctorShortagePrediction ? 'text-red-650' : 'text-slate-800'}`}>
                      {predictions[activePhcId].doctorShortagePrediction ? `Yes, Shortage of ${predictions[activePhcId].recommendedAdditionalDoctors} Doctors` : 'No Shortage Expected'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border rounded-xl border-dashed">
                    <span className="font-bold text-[9px] uppercase block tracking-wider mb-1 text-slate-400">AI Staffing Reason</span>
                    <p className="font-medium text-slate-600 leading-relaxed">{predictions[activePhcId].reasoning}</p>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-bold text-xs bg-slate-50 border border-dashed rounded-xl">
                  Click "Generate AI Analysis" to query Gemini workforce analysis logs.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VISUAL TRENDS TAB */}
      {activeTab === 'visuals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily attendance timeline */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6">
            <h3 className="font-bold text-slate-800 text-sm mb-4">Doctor Availability Trend Index</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { day: 'Mon', 'Attendance Rate %': 94 },
                  { day: 'Tue', 'Attendance Rate %': 96 },
                  { day: 'Wed', 'Attendance Rate %': 88 },
                  { day: 'Thu', 'Attendance Rate %': 92 },
                  { day: 'Fri', 'Attendance Rate %': 95 },
                  { day: 'Sat', 'Attendance Rate %': 84 },
                  { day: 'Sun', 'Attendance Rate %': 40 }
                ]}>
                  <defs>
                    <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F5FBF" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#1F5FBF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Attendance Rate %" stroke="#1F5FBF" strokeWidth={2} fillOpacity={1} fill="url(#colorAttendance)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Department distribution Pie Chart */}
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex-sm p-6 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-4">Specialization Roster Distribution</h3>
              {specializationData.length > 0 ? (
                <div className="h-60 flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={specializationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {specializationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-6 text-center text-slate-400 font-bold text-xs">
                  No specialization details.
                </div>
              )}
            </div>

            {/* Legends */}
            <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 pt-4 border-t">
              {specializationData.map((d, i) => (
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
              <h3 className="font-bold text-slate-800 text-sm mb-4">District-wide Doctor Roster Comparison</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={districtAttendanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} />
                    <YAxis stroke="#94A3B8" fontSize={11} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Attendance Rate %" fill="#1F5FBF" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Active Doctors" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR Code Scanner Simulation modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-apex shadow-apex p-6 max-w-sm w-full space-y-4 text-center">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-bold text-slate-800 text-xs text-left">Clinical Bio QR Check-in Terminal</span>
              <button onClick={() => setShowQrModal(false)} className="text-slate-400 font-bold hover:text-slate-650">✕</button>
            </div>
            
            <div className="p-6 bg-slate-50 border rounded-xl flex flex-col items-center justify-center space-y-3">
              <QrCode className="h-32 w-32 text-slate-800 animate-pulse" />
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Device ID: HF-BIO-TERM-04</span>
            </div>

            <p className="text-xs text-slate-500 font-medium">Scan QR code using doctor smartphone token to mark attendance.</p>
            
            <button
              onClick={() => handleCheckIn(selectedDocIdForQr, '09:02 AM', 'Present')}
              className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs shadow transition"
            >
              Simulate Successful QR Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorWorkforcePage;
