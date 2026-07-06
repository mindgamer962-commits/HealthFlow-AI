import { create } from 'zustand';
import { CommandCenterAction } from '../types';
import { db, IS_MOCK_ENV } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { usePhcStore } from './phcStore';
import { MedicineStock } from '../types';
import { useMedicineStore } from './medicineStore';
import { useFootfallStore } from './footfallStore';
import { useBedStore } from './bedStore';
import { useDoctorStore } from './doctorStore';
import { useLabStore } from './labStore';

export interface DynamicRiskReport {
  score: number; // 0 - 100
  level: 'Green' | 'Yellow' | 'Orange' | 'Red';
  label: 'Healthy' | 'Needs Attention' | 'High Risk' | 'Critical';
  explainers: string[];
  operationalEfficiency: number;
  readinessScore: number;
  resourceUtilization: number;
}

interface CommandState {
  actions: CommandCenterAction[];
  loading: boolean;
  
  subscribeToCommandActions: () => () => void;
  getDynamicRiskScore: (centerId: string) => DynamicRiskReport;
  approveAction: (actionId: string) => Promise<void>;
  assignOfficer: (actionId: string, officerName: string) => Promise<void>;
  scheduleVisit: (actionId: string) => Promise<void>;
  ignoreAction: (actionId: string) => Promise<void>;
}

const INITIAL_MOCK_ACTIONS: CommandCenterAction[] = [
  {
    actionId: 'act-101',
    healthCenterId: 'phc-1',
    centerName: 'Mawphlang PHC',
    actionType: 'Transfer Medicine',
    title: 'Transfer Paracetamol Stock',
    description: 'Transfer 500 Paracetamol 650mg tablets to prevent imminent stockout.',
    sourceCenterId: 'phc-3',
    sourceCenterName: 'Sohryngkham PHC',
    resourceDetails: '500 tabs Paracetamol 650mg',
    estimatedImpact: 'Averts stockout; ensures continuous OPD supply for 7 days.',
    status: 'Pending',
    createdAt: new Date().toISOString()
  },
  {
    actionId: 'act-102',
    healthCenterId: 'phc-1',
    centerName: 'Mawphlang PHC',
    actionType: 'Transfer Doctor',
    title: 'Deploy General Physician',
    description: 'Temporarily reassign General Physician from surplus clinic to cover roster deficit.',
    sourceCenterId: 'chc-1',
    sourceCenterName: 'Pynursla CHC',
    resourceDetails: '1 General Physician (Dr. Ibapynhun)',
    estimatedImpact: 'Reduces doctor workload ratio to 20:1; shortens patient wait times by 40%.',
    status: 'Pending',
    createdAt: new Date().toISOString()
  },
  {
    actionId: 'act-103',
    healthCenterId: 'phc-1',
    centerName: 'Mawphlang PHC',
    actionType: 'Maintenance',
    title: 'Radiology Machine Maintenance',
    description: 'Service offline Siemens X-Ray machinery to restore imaging diagnostics.',
    resourceDetails: 'Maintenance Technician Dispatch',
    estimatedImpact: 'Restores Chest X-Ray services for average 15 patients daily.',
    status: 'Pending',
    createdAt: new Date().toISOString()
  }
];

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

export const useCommandStore = create<CommandState>((set, get) => ({
  actions: getPersisted('hf_command_actions', INITIAL_MOCK_ACTIONS),
  loading: false,

  subscribeToCommandActions: () => {
    if (IS_MOCK_ENV) {
      set({
        actions: getPersisted('hf_command_actions', INITIAL_MOCK_ACTIONS),
        loading: false
      });
      return () => {};
    }

    set({ loading: true });
    return onSnapshot(collection(db, 'command_center_actions'), (snapshot) => {
      const list: CommandCenterAction[] = [];
      snapshot.forEach(doc => list.push(doc.data() as CommandCenterAction));
      if (list.length > 0) set({ actions: list });
      set({ loading: false });
    });
  },

  getDynamicRiskScore: (centerId) => {
    const center = usePhcStore.getState().centers.find(c => c.centerId === centerId);
    if (!center) {
      return {
        score: 25,
        level: 'Green',
        label: 'Healthy',
        explainers: ['Operational data stable.'],
        operationalEfficiency: 90,
        readinessScore: 88,
        resourceUtilization: 45
      };
    }

    // Accumulate variables from other stores
    const phcBeds = useBedStore.getState().beds.filter(b => b.healthCenterId === centerId);
    const totalBeds = phcBeds.reduce((sum, b) => sum + b.TotalBeds, 0) || center.bedsTotal || 10;
    const occupiedBeds = phcBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0) || center.bedsOccupied || 0;
    const bedOccupancy = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0;

    const centerDoctors = useDoctorStore.getState().doctors.filter(d => d.assignedHealthCenter === centerId);
    const assignedDocs = centerDoctors.length;
    const todayStr = new Date().toISOString().split('T')[0];
    const presentDocs = useDoctorStore.getState().attendanceLogs.filter(a => a.healthCenterId === centerId && a.date === todayStr && (a.attendanceStatus === 'Present' || a.attendanceStatus === 'Late')).length;
    const docAttendance = assignedDocs > 0 ? (presentDocs / assignedDocs) * 100 : 100;

    const labInvs = useLabStore.getState().inventories.filter(i => i.healthCenterId === centerId);
    const availableTests = labInvs.filter(i => i.isAvailable).length;
    const totalTests = labInvs.length || 5;
    const labTestRate = totalTests > 0 ? (availableTests / totalTests) * 100 : 100;

    const offlineMachines = useLabStore.getState().equipments.filter(e => e.healthCenterId === centerId && e.status !== 'Working').length;

    const medHealth = center.medicineHealthScore || 70;

    // COMPUTE SCORE
    const explainers: string[] = [];
    let score = 20;

    // Bed occupancies impact
    if (bedOccupancy > 90) {
      score += 25;
      explainers.push(`Bed occupancy is critically high at ${Math.round(bedOccupancy)}%`);
    } else if (bedOccupancy > 75) {
      score += 15;
      explainers.push(`Bed occupancy is high at ${Math.round(bedOccupancy)}%`);
    }

    // Doctor attendance impact
    if (docAttendance < 50) {
      score += 25;
      explainers.push(`Doctor attendance rate is critically low at ${Math.round(docAttendance)}% (${presentDocs}/${assignedDocs} present)`);
    } else if (docAttendance < 75) {
      score += 15;
      explainers.push(`Doctor attendance rate is low at ${Math.round(docAttendance)}%`);
    }

    // Reagent levels impact
    const lowReagents = labInvs.filter(i => i.reagentStockLevel < 20);
    if (lowReagents.length > 0) {
      score += 15;
      explainers.push(`Critical low reagents detected for ${lowReagents.map(i => i.testName.split(' ')[0]).join(', ')}`);
    }

    // Lab test availabilities impact
    if (availableTests < totalTests) {
      score += 15;
      explainers.push(`${totalTests - availableTests} diagnostic test services are currently offline`);
    }
    if (offlineMachines > 0) {
      score += 10;
      explainers.push(`${offlineMachines} diagnostic analyzers require technical service`);
    }

    // Medicine health impact
    if (medHealth < 40) {
      score += 20;
      explainers.push(`Medicine inventory status is critical (health score ${medHealth}%)`);
    } else if (medHealth < 70) {
      score += 10;
      explainers.push(`Medicine stock levels are low (health score ${medHealth}%)`);
    }

    // Limit score
    score = Math.min(100, Math.max(10, score));

    // Tomorrow predicted patient surges impact
    const surgeExpected = useFootfallStore.getState().predictions[centerId]?.tomorrowCount > 60;
    if (surgeExpected && score > 50) {
      score = Math.min(100, score + 10);
      explainers.push('Patient footfall surge expected tomorrow');
    }

    let level: 'Green' | 'Yellow' | 'Orange' | 'Red' = 'Green';
    let label: 'Healthy' | 'Needs Attention' | 'High Risk' | 'Critical' = 'Healthy';

    if (score >= 80) {
      level = 'Red';
      label = 'Critical';
    } else if (score >= 60) {
      level = 'Orange';
      label = 'High Risk';
    } else if (score >= 40) {
      level = 'Yellow';
      label = 'Needs Attention';
    }

    if (explainers.length === 0) {
      explainers.push('All diagnostic, staffing, and beds occupancy levels are healthy.');
    }

    // Compute sub components
    const operationalEfficiency = Math.round(100 - (score * 0.4));
    const readinessScore = Math.round(docAttendance * 0.4 + (100 - bedOccupancy) * 0.2 + medHealth * 0.4);
    const resourceUtilization = Math.round((bedOccupancy + (100 - docAttendance) + (100 - labTestRate)) / 3);

    return {
      score,
      level,
      label,
      explainers,
      operationalEfficiency,
      readinessScore,
      resourceUtilization
    };
  },

  approveAction: async (actionId) => {
    set({ loading: true });
    const target = get().actions.find(a => a.actionId === actionId);
    
    // Calculate final actions list update
    const updated = get().actions.map(a => a.actionId === actionId ? { ...a, status: 'Approved' as const } : a);

    if (IS_MOCK_ENV) {
      // Simulate updating target stores upon approval!
      if (target && target.actionType === 'Transfer Medicine') {
        const medStore = useMedicineStore.getState();
        const currentList = medStore.stocks.map(s => ({ ...s }));
        // Boost target stock count & deduct source stock count
        const sourceStock = currentList.find(s => s.phcId === target.sourceCenterId && s.medicineId === 'med-1');
        const targetStock = currentList.find(s => s.phcId === target.healthCenterId && s.medicineId === 'med-1');
        if (sourceStock && targetStock) {
          sourceStock.currentQuantity = Math.max(10, sourceStock.currentQuantity - 500);
          targetStock.currentQuantity += 500;
          
          localStorage.setItem('hf_stocks', JSON.stringify(currentList));
          useMedicineStore.setState({ stocks: currentList });
        }
      }

      if (target && target.actionType === 'Transfer Doctor') {
        const docStore = useDoctorStore.getState();
        const docs = docStore.doctors.map(d => ({ ...d }));
        const targetDoc = docs.find(d => d.assignedHealthCenter === target.sourceCenterId);
        if (targetDoc) {
          targetDoc.assignedHealthCenter = target.healthCenterId;
          localStorage.setItem('hf_wf_doctors', JSON.stringify(docs));
          useDoctorStore.setState({ doctors: docs });
        }

        // Sync legacy doctors in phcStore
        const phcStore = usePhcStore.getState();
        const legacyDocs = phcStore.doctors.map(d => ({ ...d }));
        const targetLegacyDoc = legacyDocs.find(d => d.phcId === target.sourceCenterId);
        if (targetLegacyDoc) {
          targetLegacyDoc.phcId = target.healthCenterId;
          localStorage.setItem('healthflow_doctors', JSON.stringify(legacyDocs));
          usePhcStore.setState({ doctors: legacyDocs });
        }
      }

      setPersisted('hf_command_actions', updated);
      set({ actions: updated, loading: false });
      return;
    }

    try {
      if (target && target.actionType === 'Transfer Medicine') {
        const stocksSnap = await getDocs(collection(db, 'medicine_stock'));
        let srcStockDocId = '';
        let srcStockQty = 0;
        let destStockDocId = '';
        let destStockQty = 0;

        stocksSnap.forEach((doc) => {
          const data = doc.data() as MedicineStock;
          if (data.phcId === target.sourceCenterId && data.medicineId === 'med-1') {
            srcStockDocId = doc.id;
            srcStockQty = data.currentQuantity;
          }
          if (data.phcId === target.healthCenterId && data.medicineId === 'med-1') {
            destStockDocId = doc.id;
            destStockQty = data.currentQuantity;
          }
        });

        if (srcStockDocId) {
          await updateDoc(doc(db, 'medicine_stock', srcStockDocId), {
            currentQuantity: Math.max(0, srcStockQty - 500),
            lastUpdated: new Date().toISOString()
          });
        }
        if (destStockDocId) {
          await updateDoc(doc(db, 'medicine_stock', destStockDocId), {
            currentQuantity: destStockQty + 500,
            lastUpdated: new Date().toISOString()
          });
        }

        // Record stock transaction log in Firestore
        const txId = `tx-${Math.random().toString(36).substr(2, 9)}`;
        await setDoc(doc(db, 'stock_transactions', txId), {
          transactionId: txId,
          medicineId: 'med-1',
          phcId: target.healthCenterId,
          type: 'Transfer',
          quantity: 500,
          userId: 'admin',
          userName: 'System Command',
          reason: `AI Action approved transfer from ${target.sourceCenterName}`,
          timestamp: new Date().toISOString()
        });
      }

      if (target && target.actionType === 'Transfer Doctor') {
        const docsSnap = await getDocs(collection(db, 'doctors'));
        let docIdToMove = '';
        docsSnap.forEach((doc) => {
          const data = doc.data() as any;
          if (data.assignedHealthCenter === target.sourceCenterId || data.phcId === target.sourceCenterId) {
            docIdToMove = doc.id;
          }
        });
        
        if (docIdToMove) {
          await updateDoc(doc(db, 'doctors', docIdToMove), {
            assignedHealthCenter: target.healthCenterId,
            phcId: target.healthCenterId
          });
        }
      }

      await updateDoc(doc(db, 'command_center_actions', actionId), { status: 'Approved' });
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  assignOfficer: async (actionId, officerName) => {
    set({ loading: true });
    const updated = get().actions.map(a => a.actionId === actionId ? { ...a, status: 'Assigned' as const, officerName } : a);

    if (IS_MOCK_ENV) {
      setPersisted('hf_command_actions', updated);
      set({ actions: updated, loading: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'command_center_actions', actionId), { status: 'Assigned', officerName });
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  scheduleVisit: async (actionId) => {
    set({ loading: true });
    const updated = get().actions.map(a => a.actionId === actionId ? { ...a, status: 'Scheduled' as const } : a);

    if (IS_MOCK_ENV) {
      setPersisted('hf_command_actions', updated);
      set({ actions: updated, loading: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'command_center_actions', actionId), { status: 'Scheduled' });
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  ignoreAction: async (actionId) => {
    set({ loading: true });
    const updated = get().actions.map(a => a.actionId === actionId ? { ...a, status: 'Ignored' as const } : a);

    if (IS_MOCK_ENV) {
      setPersisted('hf_command_actions', updated);
      set({ actions: updated, loading: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'command_center_actions', actionId), { status: 'Ignored' });
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  }
}));
