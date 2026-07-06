import { create } from 'zustand';
import { DoctorProfile, DoctorAttendance, DoctorSchedule, DoctorTransferHistory } from '../types';
import { db, IS_MOCK_ENV } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useFootfallStore } from './footfallStore';
import { useBedStore } from './bedStore';
import { usePhcStore } from './phcStore';

export interface DoctorRedistributionRecommendation {
  doctorId: string;
  doctorName: string;
  specialization: string;
  sourceCenterId: string;
  sourceCenterName: string;
  targetCenterId: string;
  targetCenterName: string;
  distance: number;
  durationDays: number;
  expectedImprovement: string;
  reason: string;
}

export interface WorkforceForecastPrediction {
  staffingRiskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  doctorShortagePrediction: boolean;
  recommendedAdditionalDoctors: number;
  confidenceScore: number;
  reasoning: string;
  recommendations: DoctorRedistributionRecommendation[];
}

interface DoctorState {
  doctors: DoctorProfile[];
  attendanceLogs: DoctorAttendance[];
  schedules: DoctorSchedule[];
  transfers: DoctorTransferHistory[];
  predictions: Record<string, WorkforceForecastPrediction>;
  loading: boolean;
  
  subscribeToWorkforce: () => () => void;
  addDoctorProfile: (profile: Omit<DoctorProfile, 'doctorId' | 'joiningDate'>) => Promise<void>;
  checkInDoctor: (doctorId: string, healthCenterId: string, checkIn: string, status: DoctorAttendance['attendanceStatus'], lateMinutes: number, remarks: string) => Promise<void>;
  checkOutDoctor: (attendanceId: string, checkOut: string, workingHours: number) => Promise<void>;
  recommendWorkforceTransfer: (doctorId: string, sourceCenterId: string, destCenterId: string, reason: string, duration: number, approvedBy: string) => Promise<void>;
  runAiWorkforcePrediction: (healthCenterId: string) => Promise<void>;
}

// PROGRAMMATIC SEEDS FOR WORKFORCE
const generateMockDoctors = (): DoctorProfile[] => [
  { doctorId: 'doc-1', doctorName: 'Dr. Sarah Lyngdoh', photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150', specialization: 'General Medicine', qualification: 'MBBS, MD', registrationNumber: 'MCI-12345', phone: '+91-94361-22456', email: 'sarah.lyngdoh@healthflow.gov.in', assignedHealthCenter: 'phc-1', joiningDate: '2023-05-10', employmentType: 'Full-time', status: 'Active' },
  { doctorId: 'doc-2', doctorName: 'Dr. John Mawlong', photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=150', specialization: 'Pediatrics', qualification: 'MBBS, DCH', registrationNumber: 'MCI-88776', phone: '+91-98630-44567', email: 'john.mawlong@healthflow.gov.in', assignedHealthCenter: 'phc-2', joiningDate: '2024-02-15', employmentType: 'Full-time', status: 'Active' },
  { doctorId: 'doc-3', doctorName: 'Dr. Wanboklang Kurkalang', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150', specialization: 'Gynecology', qualification: 'MBBS, MD (OBG)', registrationNumber: 'MCI-99001', phone: '+91-94021-99881', email: 'wanbok.kur@healthflow.gov.in', assignedHealthCenter: 'phc-3', joiningDate: '2022-09-01', employmentType: 'Full-time', status: 'Active' },
  { doctorId: 'doc-4', doctorName: 'Dr. Daphne Sohkhlet', photo: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=150', specialization: 'General Medicine', qualification: 'MBBS', registrationNumber: 'MCI-77665', phone: '+91-97743-88776', email: 'daphne.soh@healthflow.gov.in', assignedHealthCenter: 'chc-1', joiningDate: '2024-01-10', employmentType: 'Full-time', status: 'Active' },
  { doctorId: 'doc-5', doctorName: 'Dr. Sildora Nongrum', photo: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=150', specialization: 'Pediatrics', qualification: 'MBBS, DCH', registrationNumber: 'MCI-66554', phone: '+91-97740-12345', email: 'sildora.n@healthflow.gov.in', assignedHealthCenter: 'phc-4', joiningDate: '2023-11-20', employmentType: 'Full-time', status: 'Active' },
  { doctorId: 'doc-6', doctorName: 'Dr. Ribor Syiem', photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=150', specialization: 'Cardiology', qualification: 'MBBS, MD, DM', registrationNumber: 'MCI-44332', phone: '+91-98630-11223', email: 'ribor.syiem@healthflow.gov.in', assignedHealthCenter: 'chc-1', joiningDate: '2021-06-15', employmentType: 'Full-time', status: 'Active' },
  { doctorId: 'doc-7', doctorName: 'Dr. Badap Rani', photo: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=150', specialization: 'General Surgery', qualification: 'MBBS, MS', registrationNumber: 'MCI-22110', phone: '+91-98560-44561', email: 'badap.rani@healthflow.gov.in', assignedHealthCenter: 'chc-1', joiningDate: '2022-03-20', employmentType: 'Full-time', status: 'Active' }
];

const generateMockSchedules = (): DoctorSchedule[] => [
  { scheduleId: 'sch-1', doctorId: 'doc-1', dayOfWeek: 'Monday', shiftStart: '09:00', shiftEnd: '16:00', roomNumber: 'OPD Room 1' },
  { scheduleId: 'sch-2', doctorId: 'doc-1', dayOfWeek: 'Wednesday', shiftStart: '09:00', shiftEnd: '16:00', roomNumber: 'OPD Room 1' },
  { scheduleId: 'sch-3', doctorId: 'doc-2', dayOfWeek: 'Tuesday', shiftStart: '09:00', shiftEnd: '16:00', roomNumber: 'Pediatric Ward 2' },
  { scheduleId: 'sch-4', doctorId: 'doc-3', dayOfWeek: 'Thursday', shiftStart: '09:00', shiftEnd: '17:00', roomNumber: 'Gynecology Wing A' },
  { scheduleId: 'sch-5', doctorId: 'doc-4', dayOfWeek: 'Friday', shiftStart: '08:00', shiftEnd: '20:00', roomNumber: 'Maternity OPD' }
];

const generateMockAttendance = (docsList: DoctorProfile[]): DoctorAttendance[] => {
  const logs: DoctorAttendance[] = [];
  const today = new Date();
  
  // Seed attendance history for last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isSunday = d.getDay() === 0;
    
    docsList.forEach(doc => {
      // Sundays off or small on-duty rosters
      if (isSunday && Math.random() > 0.15) return;
      
      const attendanceStatus = Math.random() > 0.08 ? 'Present' : Math.random() > 0.5 ? 'Absent' : 'On Leave';
      let checkIn = '09:00 AM';
      let checkOut = '04:00 PM';
      let lateMinutes = 0;
      let workingHours = 7;
      
      if (attendanceStatus === 'Present') {
        const isLate = Math.random() > 0.85;
        if (isLate) {
          lateMinutes = 10 + Math.round(Math.random() * 50);
          checkIn = `09:${lateMinutes < 10 ? '0' + lateMinutes : lateMinutes} AM`;
          workingHours = Number((7 - (lateMinutes / 60)).toFixed(1));
        }
      } else {
        checkIn = '--';
        checkOut = '--';
        workingHours = 0;
      }
      
      logs.push({
        attendanceId: `att-${doc.doctorId}-${dateStr}`,
        doctorId: doc.doctorId,
        healthCenterId: doc.assignedHealthCenter,
        date: dateStr,
        checkIn,
        checkOut,
        workingHours,
        attendanceStatus: attendanceStatus === 'Present' && lateMinutes > 0 ? 'Late' : attendanceStatus as any,
        lateMinutes,
        remarks: attendanceStatus === 'Present' ? 'Checked in via clinical bio-terminal.' : attendanceStatus === 'On Leave' ? 'Personal medical leave approved.' : 'Absent without active notify registers.'
      });
    });
  }
  return logs;
};

const INITIAL_MOCK_PREDICTIONS: Record<string, WorkforceForecastPrediction> = {
  'phc-1': {
    staffingRiskLevel: 'Critical',
    doctorShortagePrediction: true,
    recommendedAdditionalDoctors: 1,
    confidenceScore: 93,
    reasoning: 'Patient footfall forecast expects 35% surge tomorrow with only two clinical practitioners on duty.',
    recommendations: [
      { doctorId: 'doc-7', doctorName: 'Dr. Badap Rani', specialization: 'General Surgery', sourceCenterId: 'chc-1', sourceCenterName: 'Pynursla CHC', targetCenterId: 'phc-1', targetCenterName: 'Mawphlang PHC', distance: 24.5, durationDays: 3, expectedImprovement: 'OPD wait times reduced by 40%.', reason: 'Pynursla CHC has low client loads relative to their active 5 doctors on roster.' }
    ]
  },
  'phc-2': { staffingRiskLevel: 'Low', doctorShortagePrediction: false, recommendedAdditionalDoctors: 0, confidenceScore: 90, reasoning: 'Workforce levels are balanced for local clinical baselines.', recommendations: [] },
  'phc-3': { staffingRiskLevel: 'Medium', doctorShortagePrediction: false, recommendedAdditionalDoctors: 0, confidenceScore: 88, reasoning: 'Adequate doctors on roster to handle current patient expectations.', recommendations: [] },
  'chc-1': { staffingRiskLevel: 'Low', doctorShortagePrediction: false, recommendedAdditionalDoctors: 0, confidenceScore: 92, reasoning: 'Strong workforce baseline supports daily referral client loads.', recommendations: [] },
  'phc-4': { staffingRiskLevel: 'High', doctorShortagePrediction: true, recommendedAdditionalDoctors: 1, confidenceScore: 89, reasoning: 'Surging pediatric viral influenza counts place heavy strain on single child-care physician.', recommendations: [
    { doctorId: 'doc-2', doctorName: 'Dr. John Mawlong', specialization: 'Pediatrics', sourceCenterId: 'phc-2', sourceCenterName: 'Laitryngew PHC', targetCenterId: 'phc-4', targetCenterName: 'Mawsynram PHC', distance: 16.5, durationDays: 5, expectedImprovement: 'Coverage for child wards extended.', reason: 'Laitryngew PHC has low pediatric caseload volumes expected.' }
  ] }
};

const getPersisted = (key: string, initial: any) => {
  const data = localStorage.getItem(key);
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  localStorage.setItem(key, JSON.stringify(initial));
  return initial;
};

const setPersisted = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const useDoctorStore = create<DoctorState>((set, get) => ({
  doctors: getPersisted('hf_wf_doctors', generateMockDoctors()),
  attendanceLogs: getPersisted('hf_wf_attendance', generateMockAttendance(generateMockDoctors())),
  schedules: getPersisted('hf_wf_schedule', generateMockSchedules()),
  transfers: getPersisted('hf_wf_transfers', []),
  predictions: getPersisted('hf_wf_predictions', INITIAL_MOCK_PREDICTIONS),
  loading: false,

  subscribeToWorkforce: () => {
    if (IS_MOCK_ENV) {
      set({
        doctors: getPersisted('hf_wf_doctors', generateMockDoctors()),
        attendanceLogs: getPersisted('hf_wf_attendance', generateMockAttendance(generateMockDoctors())),
        schedules: getPersisted('hf_wf_schedule', generateMockSchedules()),
        transfers: getPersisted('hf_wf_transfers', []),
        predictions: getPersisted('hf_wf_predictions', INITIAL_MOCK_PREDICTIONS),
        loading: false
      });
      return () => {};
    }

    set({ loading: true });
    const unsubDocs = onSnapshot(collection(db, 'doctors'), (snapshot) => {
      const list: DoctorProfile[] = [];
      snapshot.forEach(doc => list.push(doc.data() as DoctorProfile));
      if (list.length > 0) set({ doctors: list });
    });

    const unsubAttendance = onSnapshot(collection(db, 'doctor_attendance'), (snapshot) => {
      const list: DoctorAttendance[] = [];
      snapshot.forEach(doc => list.push(doc.data() as DoctorAttendance));
      if (list.length > 0) set({ attendanceLogs: list });
    });

    const unsubSchedules = onSnapshot(collection(db, 'doctor_schedule'), (snapshot) => {
      const list: DoctorSchedule[] = [];
      snapshot.forEach(doc => list.push(doc.data() as DoctorSchedule));
      if (list.length > 0) set({ schedules: list });
    });

    const unsubTransfers = onSnapshot(collection(db, 'doctor_transfer_history'), (snapshot) => {
      const list: DoctorTransferHistory[] = [];
      snapshot.forEach(doc => list.push(doc.data() as DoctorTransferHistory));
      if (list.length > 0) set({ transfers: list });
      set({ loading: false });
    });

    return () => {
      unsubDocs();
      unsubAttendance();
      unsubSchedules();
      unsubTransfers();
    };
  },

  addDoctorProfile: async (newProfile) => {
    set({ loading: true });
    const id = `doc-${Math.random().toString(36).substr(2, 9)}`;
    const docObj: DoctorProfile = {
      ...newProfile,
      doctorId: id,
      joiningDate: new Date().toISOString().split('T')[0]
    };

    if (IS_MOCK_ENV) {
      const list = getPersisted('hf_wf_doctors', generateMockDoctors());
      const updated = [...list, docObj];
      setPersisted('hf_wf_doctors', updated);
      set({ doctors: updated, loading: false });
      return;
    }

    try {
      await setDoc(doc(db, 'doctors', id), docObj);
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  checkInDoctor: async (doctorId, healthCenterId, checkIn, status, lateMinutes, remarks) => {
    set({ loading: true });
    const dateStr = new Date().toISOString().split('T')[0];
    const id = `att-${doctorId}-${dateStr}`;

    const log: DoctorAttendance = {
      attendanceId: id,
      doctorId,
      healthCenterId,
      date: dateStr,
      checkIn,
      checkOut: '--',
      workingHours: status === 'Present' ? 7 : 0,
      attendanceStatus: status,
      lateMinutes,
      remarks
    };

    // Calculate aggregate present count
    const calculatePresentCount = (allAttendance: DoctorAttendance[]) => {
      const todayLogs = allAttendance.filter(
        x => x.healthCenterId === healthCenterId && 
             x.date === dateStr && 
             (x.attendanceStatus === 'Present' || x.attendanceStatus === 'Late' || x.attendanceStatus === 'On Duty')
      );
      return todayLogs.length;
    };

    if (IS_MOCK_ENV) {
      const list = getPersisted('hf_wf_attendance', []);
      const updated = [log, ...list.filter((x: any) => x.attendanceId !== id)];
      setPersisted('hf_wf_attendance', updated);
      set({ attendanceLogs: updated, loading: false });

      // Sync count to parent center node
      const presentCount = calculatePresentCount(updated);
      usePhcStore.getState().updateCenter(healthCenterId, { doctorsPresent: presentCount });
      return;
    }

    try {
      await setDoc(doc(db, 'doctor_attendance', id), log);
      
      const allLogs = get().attendanceLogs;
      const updatedLogs = [log, ...allLogs.filter(x => x.attendanceId !== id)];
      const presentCount = calculatePresentCount(updatedLogs);
      
      await usePhcStore.getState().updateCenter(healthCenterId, { doctorsPresent: presentCount });
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  checkOutDoctor: async (attendanceId, checkOut, workingHours) => {
    set({ loading: true });
    
    const targetLog = get().attendanceLogs.find(l => l.attendanceId === attendanceId);
    const healthCenterId = targetLog ? targetLog.healthCenterId : '';
    const dateStr = targetLog ? targetLog.date : new Date().toISOString().split('T')[0];

    const calculatePresentCount = (allAttendance: DoctorAttendance[]) => {
      if (!healthCenterId) return 0;
      const todayLogs = allAttendance.filter(
        x => x.healthCenterId === healthCenterId && 
             x.date === dateStr && 
             (x.attendanceStatus === 'Present' || x.attendanceStatus === 'Late' || x.attendanceStatus === 'On Duty')
      );
      return todayLogs.length;
    };

    if (IS_MOCK_ENV) {
      const list = getPersisted('hf_wf_attendance', []);
      const updated = list.map((l: any) => l.attendanceId === attendanceId ? { ...l, checkOut, workingHours } : l);
      setPersisted('hf_wf_attendance', updated);
      set({ attendanceLogs: updated, loading: false });

      if (healthCenterId) {
        const presentCount = calculatePresentCount(updated);
        usePhcStore.getState().updateCenter(healthCenterId, { doctorsPresent: presentCount });
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'doctor_attendance', attendanceId), { checkOut, workingHours });
      
      const allLogs = get().attendanceLogs;
      const updatedLogs = allLogs.map(l => l.attendanceId === attendanceId ? { ...l, checkOut, workingHours } : l);
      
      if (healthCenterId) {
        const presentCount = calculatePresentCount(updatedLogs);
        await usePhcStore.getState().updateCenter(healthCenterId, { doctorsPresent: presentCount });
      }
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  recommendWorkforceTransfer: async (doctorId, sourceCenterId, destCenterId, reason, duration, approvedBy) => {
    set({ loading: true });
    const targetDoc = get().doctors.find(d => d.doctorId === doctorId);
    if (!targetDoc) {
      set({ loading: false });
      throw new Error("Target clinician not found.");
    }

    const id = `tx-${Math.random().toString(36).substr(2, 9)}`;
    const txObj: DoctorTransferHistory = {
      transferId: id,
      doctorId,
      doctorName: targetDoc.doctorName,
      sourceHealthCenter: sourceCenterId,
      destHealthCenter: destCenterId,
      transferDate: new Date().toISOString().split('T')[0],
      durationDays: duration,
      reason,
      approvedBy
    };

    // Update doctor's assigned clinic
    const updatedDocs = get().doctors.map(d => d.doctorId === doctorId ? { ...d, assignedHealthCenter: destCenterId } : d);

    if (IS_MOCK_ENV) {
      const transfersList = getPersisted('hf_wf_transfers', []);
      const updatedTransfers = [txObj, ...transfersList];
      setPersisted('hf_wf_doctors', updatedDocs);
      setPersisted('hf_wf_transfers', updatedTransfers);
      
      set({
        doctors: updatedDocs,
        transfers: updatedTransfers,
        loading: false
      });
      return;
    }

    try {
      await updateDoc(doc(db, 'doctors', doctorId), { assignedHealthCenter: destCenterId });
      await setDoc(doc(db, 'doctor_transfer_history', id), txObj);
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  runAiWorkforcePrediction: async (healthCenterId) => {
    set({ loading: true });
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || "";
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Grab current clinic metadata
    const activeStaff = get().doctors.filter(d => d.assignedHealthCenter === healthCenterId && d.status === 'Active');
    const doctorCount = activeStaff.length || 1;

    // Grab expected tomorrow patient footfall to scale predictions
    const footfallTomorrow = useFootfallStore.getState().predictions[healthCenterId]?.tomorrowCount || 45;
    
    // Grab bed occupancy levels
    const centerBeds = useBedStore.getState().beds.filter(b => b.healthCenterId === healthCenterId);
    const totalBeds = centerBeds.reduce((sum, b) => sum + b.TotalBeds, 0) || 10;
    const occupiedBeds = centerBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0) || 0;
    const bedPercent = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 40;

    // Grab candidates for reassignment transfers
    const otherDocs = get().doctors.filter(d => d.assignedHealthCenter !== healthCenterId && d.status === 'Active');
    const candidates: any[] = [];
    otherDocs.forEach(d => {
      const sourceCount = get().doctors.filter(x => x.assignedHealthCenter === d.assignedHealthCenter).length;
      if (sourceCount > 2) {
        candidates.push({ doctorId: d.doctorId, doctorName: d.doctorName, specialization: d.specialization, sourceCenterId: d.assignedHealthCenter });
      }
    });

    if (!openRouterKey && !geminiKey) {
      await new Promise(r => setTimeout(r, 1200));

      // Mock workforce reasoning
      const workloadRatio = Math.round(footfallTomorrow / doctorCount);
      let risk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      let shortage = false;
      let recom = 0;
      const recs: DoctorRedistributionRecommendation[] = [];

      if (workloadRatio > 50 || bedPercent > 85) {
        risk = 'Critical';
        shortage = true;
        recom = 1;
      } else if (workloadRatio > 30) {
        risk = 'High';
        shortage = true;
        recom = 1;
      } else if (workloadRatio > 15) {
        risk = 'Medium';
      }

      if (shortage && candidates.length > 0) {
        const best = candidates[0];
        let srcName = 'Pynursla CHC';
        let destName = healthCenterId === 'phc-1' ? 'Mawphlang PHC' : 'PHC Target';
        let dist = 18.5;

        if (best.sourceCenterId === 'chc-1') { srcName = 'Pynursla CHC'; dist = 24.5; }
        else if (best.sourceCenterId === 'phc-2') { srcName = 'Laitryngew PHC'; dist = 14.8; }
        else if (best.sourceCenterId === 'phc-3') { srcName = 'Sohryngkham PHC'; dist = 22.0; }

        recs.push({
          doctorId: best.doctorId,
          doctorName: best.doctorName,
          specialization: best.specialization,
          sourceCenterId: best.sourceCenterId,
          sourceCenterName: srcName,
          targetCenterId: healthCenterId,
          targetCenterName: destName,
          distance: dist,
          durationDays: 5,
          expectedImprovement: 'Workload client-ratio balanced.',
          reason: `Patient-to-Clinician workload is currently high at ${destName}. Reassign ${best.doctorName} from ${srcName} (surplus workforce node).`
        });
      }

      const prediction: WorkforceForecastPrediction = {
        staffingRiskLevel: risk,
        doctorShortagePrediction: shortage,
        recommendedAdditionalDoctors: recom,
        confidenceScore: 85 + Math.round(Math.random() * 14),
        reasoning: `Expected patient-to-physician ratio tomorrow is ${workloadRatio}:1 under predicted load of ${footfallTomorrow} patients and ${doctorCount} active doctors.`,
        recommendations: recs
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      setPersisted('hf_wf_predictions', updated);
      set({ predictions: updated, loading: false });
      return;
    }

    try {
      const promptText = `
        You are a clinical workforce planning AI.
        Health Center ID: "${healthCenterId}"
        Active Doctors Count: ${doctorCount}
        Beds occupancy: ${bedPercent}%
        Expected Patient Footfall Tomorrow: ${footfallTomorrow} patients
        Nearby candidate physicians for redistribution: ${JSON.stringify(candidates)}

        Analyze this data and generate a JSON response predicting workforce requirements:
        1. "staffingRiskLevel": 'Low' | 'Medium' | 'High' | 'Critical'
        2. "doctorShortagePrediction": true or false (shortage tomorrow?)
        3. "recommendedAdditionalDoctors": number of extra doctors recommended (number, e.g. 1)
        4. "confidenceScore": confidence score percentage (number between 50 and 100)
        5. "reasoning": clinical rationale explaining the staffing risk (string)
        6. "recommendations": array of reassignment suggestions from the candidate list. Format each as: { "doctorId": string, "doctorName": string, "specialization": string, "sourceCenterId": string, "sourceCenterName": string, "targetCenterId": string, "targetCenterName": string, "distance": number, "durationDays": number, "expectedImprovement": string, "reason": string }

        Output only valid JSON. Do not include markdown wraps.
      `;

      let text = "";
      if (openRouterKey) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'HealthFlow AI'
          },
          body: JSON.stringify({
            model: "meta-llama/llama-3.3-70b-instruct:free",
            messages: [{ role: "user", content: promptText }],
            max_tokens: 1000
          })
        });
        const json = await response.json();
        if (json.choices && json.choices.length > 0) {
          text = json.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        } else {
          throw new Error("OpenRouter error: " + JSON.stringify(json.error || json));
        }
      } else {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }]
          })
        });
        const json = await response.json();
        text = json.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
      }
      const data = JSON.parse(text);

      const prediction: WorkforceForecastPrediction = {
        staffingRiskLevel: data.staffingRiskLevel,
        doctorShortagePrediction: !!data.doctorShortagePrediction,
        recommendedAdditionalDoctors: Number(data.recommendedAdditionalDoctors),
        confidenceScore: Number(data.confidenceScore),
        reasoning: data.reasoning,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : []
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      setPersisted('hf_wf_predictions', updated);
      set({ predictions: updated, loading: false });
    } catch (err) {
      console.warn("AI workforce prediction query failed, invoking local fallback logic:", err);
      const workloadRatio = Math.round(footfallTomorrow / doctorCount);
      let risk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      let shortage = false;
      let recom = 0;
      const recs: DoctorRedistributionRecommendation[] = [];

      if (workloadRatio > 50 || bedPercent > 85) {
        risk = 'Critical';
        shortage = true;
        recom = 1;
      } else if (workloadRatio > 30) {
        risk = 'High';
        shortage = true;
        recom = 1;
      } else if (workloadRatio > 15) {
        risk = 'Medium';
      }

      if (shortage && candidates.length > 0) {
        const best = candidates[0];
        let srcName = 'Pynursla CHC';
        let destName = healthCenterId === 'phc-1' ? 'Mawphlang PHC' : 'PHC Target';
        let dist = 18.5;

        if (best.sourceCenterId === 'chc-1') { srcName = 'Pynursla CHC'; dist = 24.5; }
        else if (best.sourceCenterId === 'phc-2') { srcName = 'Laitryngew PHC'; dist = 14.8; }
        else if (best.sourceCenterId === 'phc-3') { srcName = 'Sohryngkham PHC'; dist = 22.0; }

        recs.push({
          doctorId: best.doctorId,
          doctorName: best.doctorName,
          specialization: best.specialization,
          sourceCenterId: best.sourceCenterId,
          sourceCenterName: srcName,
          targetCenterId: healthCenterId,
          targetCenterName: destName,
          distance: dist,
          durationDays: 5,
          expectedImprovement: '[Offline Fallback] Workload clinician-ratio balanced.',
          reason: `[Offline Fallback] Clinician workload is high. Reassign ${best.doctorName} from ${srcName}.`
        });
      }

      const prediction: WorkforceForecastPrediction = {
        staffingRiskLevel: risk,
        doctorShortagePrediction: shortage,
        recommendedAdditionalDoctors: recom,
        confidenceScore: 85 + Math.round(Math.random() * 14),
        reasoning: `[Offline Fallback] Rationale based on tomorrow's load ratio of ${workloadRatio}:1 patients-to-clinician under predicted patient load of ${footfallTomorrow} patients.`,
        recommendations: recs
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      setPersisted('hf_wf_predictions', updated);
      set({ predictions: updated, loading: false });
    }
  }
}));
