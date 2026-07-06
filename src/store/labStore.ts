import { create } from 'zustand';
import { LabTestMaster, LabTestInventory, LabEquipment, LabTestRequest } from '../types';
import { db, IS_MOCK_ENV } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { useFootfallStore } from './footfallStore';
import { useBedStore } from './bedStore';

export interface LabRedistributionRecommendation {
  unavailableTestId: string;
  unavailableTestName: string;
  sourceCenterId: string;
  sourceCenterName: string;
  targetCenterId: string;
  targetCenterName: string;
  distance: number;
  travelTime: number;
  availableCapacity: number;
  reason: string;
}

export interface LabForecastPrediction {
  expectedTestDemand: Record<string, number>;
  machineFailureRisk: Record<string, 'Low' | 'Medium' | 'High' | 'Critical'>;
  reagentShortagePrediction: Record<string, boolean>;
  confidenceScore: number;
  reasoning: string;
  recommendations: LabRedistributionRecommendation[];
}

interface LabState {
  tests: LabTestMaster[];
  inventories: LabTestInventory[];
  equipments: LabEquipment[];
  requests: LabTestRequest[];
  predictions: Record<string, LabForecastPrediction>;
  loading: boolean;
  
  subscribeToLabs: () => () => void;
  updateReagentStock: (inventoryId: string, level: number) => Promise<void>;
  updateEquipmentStatus: (equipmentId: string, status: LabEquipment['status']) => Promise<void>;
  createTestRequest: (req: Omit<LabTestRequest, 'requestId' | 'requestDate' | 'status'>) => Promise<void>;
  referTestRequest: (requestId: string, targetCenterId: string) => Promise<void>;
  runAiLabForecast: (healthCenterId: string) => Promise<void>;
}

// PROGRAMMATIC SEEDS FOR LABORATORY
const INITIAL_MOCK_TESTS: LabTestMaster[] = [
  { testId: 't-cbc', testName: 'CBC (Complete Blood Count)', category: 'Hematology', sampleType: 'Blood', estimatedTimeMins: 20, price: 150, dailyCapacity: 30, equipmentRequired: 'Hematology Analyzer', reagentRequired: 'CBC Lyse & Diluent', description: 'Evaluates overall blood health and detects anemia, infection, and leukemia.' },
  { testId: 't-malaria', testName: 'Malaria Smear Test', category: 'Parasitology', sampleType: 'Blood', estimatedTimeMins: 30, price: 80, dailyCapacity: 25, equipmentRequired: 'Compound Microscope', reagentRequired: 'Giemsa Stain', description: 'Identifies Plasmodium parasites in blood smears to detect Malaria.' },
  { testId: 't-glucose', testName: 'Blood Glucose Test', category: 'Biochemistry', sampleType: 'Blood', estimatedTimeMins: 15, price: 60, dailyCapacity: 40, equipmentRequired: 'Biochemistry Analyzer', reagentRequired: 'Glucose Oxidase kit', description: 'Measures blood sugar levels to monitor and diagnose Diabetes.' },
  { testId: 't-xray', testName: 'Chest X-Ray', category: 'Radiology', sampleType: 'Imaging', estimatedTimeMins: 25, price: 350, dailyCapacity: 15, equipmentRequired: 'X-Ray Machine', reagentRequired: 'Radiology Films', description: 'Generates pictures of structures inside the chest to monitor lungs and chest walls.' },
  { testId: 't-widal', testName: 'Typhoid Widal Test', category: 'Serology', sampleType: 'Serum', estimatedTimeMins: 20, price: 120, dailyCapacity: 20, equipmentRequired: 'Microscope', reagentRequired: 'Widal Antigen kits', description: 'Serological test for enteric typhoid fever.' }
];

const generateMockEquipment = (): LabEquipment[] => [
  { equipmentId: 'eq-phc-1-cbc', healthCenterId: 'phc-1', equipmentName: 'Hematology Analyzer', status: 'Working', installationDate: '2023-01-10', lastServiceDate: '2026-03-01', nextServiceDate: '2026-09-01', manufacturer: 'Sysmex' },
  { equipmentId: 'eq-phc-1-xray', healthCenterId: 'phc-1', equipmentName: 'X-Ray Machine', status: 'Offline', installationDate: '2021-06-15', lastServiceDate: '2025-11-20', nextServiceDate: '2026-05-20', manufacturer: 'Siemens' },
  { equipmentId: 'eq-phc-2-cbc', healthCenterId: 'phc-2', equipmentName: 'Hematology Analyzer', status: 'Working', installationDate: '2024-05-01', lastServiceDate: '2026-04-10', nextServiceDate: '2026-10-10', manufacturer: 'Sysmex' },
  { equipmentId: 'eq-phc-2-xray', healthCenterId: 'phc-2', equipmentName: 'X-Ray Machine', status: 'Working', installationDate: '2022-09-12', lastServiceDate: '2026-02-15', nextServiceDate: '2026-08-15', manufacturer: 'GE Health' },
  { equipmentId: 'eq-chc-1-cbc', healthCenterId: 'chc-1', equipmentName: 'Hematology Analyzer', status: 'Working', installationDate: '2023-08-20', lastServiceDate: '2026-03-12', nextServiceDate: '2026-09-12', manufacturer: 'Sysmex' },
  { equipmentId: 'eq-chc-1-xray', healthCenterId: 'chc-1', equipmentName: 'X-Ray Machine', status: 'Working', installationDate: '2020-04-05', lastServiceDate: '2026-04-05', nextServiceDate: '2026-10-05', manufacturer: 'Siemens' }
];

const generateMockInventories = (): LabTestInventory[] => {
  const list: LabTestInventory[] = [];
  const centersList = ['phc-1', 'phc-2', 'phc-3', 'chc-1', 'phc-4'];

  centersList.forEach(cid => {
    INITIAL_MOCK_TESTS.forEach(test => {
      // Mawphlang X-ray is offline
      const available = !(cid === 'phc-1' && test.testId === 't-xray');
      let reagentStock = 75;
      
      if (cid === 'phc-1' && test.testId === 't-cbc') reagentStock = 12; // critical low
      else if (cid === 'phc-3' && test.testId === 't-widal') reagentStock = 35;
      
      list.push({
        inventoryId: `inv-${cid}-${test.testId}`,
        healthCenterId: cid,
        testId: test.testId,
        testName: test.testName,
        isAvailable: available,
        dailyCapacity: cid === 'chc-1' ? test.dailyCapacity * 2 : test.dailyCapacity,
        todayCompleted: Math.round(Math.random() * 8) + 2,
        todayPending: Math.round(Math.random() * 5),
        reagentStockLevel: reagentStock,
        updatedAt: new Date().toISOString()
      });
    });
  });
  return list;
};

const generateMockRequests = (): LabTestRequest[] => [
  { requestId: 'req-l-1', patientId: 'pat-101', patientName: 'Ribor Langstieh', testId: 't-cbc', testName: 'CBC (Complete Blood Count)', healthCenterId: 'phc-1', status: 'Pending', requestDate: new Date().toISOString() },
  { requestId: 'req-l-2', patientId: 'pat-102', patientName: 'Wanri Kharkongor', testId: 't-xray', testName: 'Chest X-Ray', healthCenterId: 'phc-1', status: 'Referred', referredToCenterId: 'phc-2', requestDate: new Date().toISOString() },
  { requestId: 'req-l-3', patientId: 'pat-103', patientName: 'Lari Kurkalang', testId: 't-glucose', testName: 'Blood Glucose Test', healthCenterId: 'phc-2', status: 'Completed', requestDate: new Date().toISOString() }
];

const INITIAL_MOCK_PREDICTIONS: Record<string, LabForecastPrediction> = {
  'phc-1': {
    expectedTestDemand: { 'CBC (Complete Blood Count)': 38, 'Chest X-Ray': 18 },
    machineFailureRisk: { 'Hematology Analyzer': 'Medium', 'X-Ray Machine': 'Critical' },
    reagentShortagePrediction: { 'CBC (Complete Blood Count)': true },
    confidenceScore: 93,
    reasoning: 'High fever cases increased over the last five days, driving up CBC tests demand. X-Ray is offline for maintenance.',
    recommendations: [
      { unavailableTestId: 't-xray', unavailableTestName: 'Chest X-Ray', sourceCenterId: 'phc-1', sourceCenterName: 'Mawphlang PHC', targetCenterId: 'phc-2', targetCenterName: 'Laitryngew PHC', distance: 12.8, travelTime: 20, availableCapacity: 12, reason: 'Mawphlang X-Ray machine is offline. Refer patients requiring Chest X-Rays to Laitryngew PHC (12.8 km away).' }
    ]
  },
  'phc-2': { expectedTestDemand: { 'CBC (Complete Blood Count)': 18, 'Chest X-Ray': 8 }, machineFailureRisk: { 'Hematology Analyzer': 'Low', 'X-Ray Machine': 'Low' }, reagentShortagePrediction: { 'CBC (Complete Blood Count)': false }, confidenceScore: 91, reasoning: 'Operational metrics stable.', recommendations: [] }
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

export const useLabStore = create<LabState>((set, get) => ({
  tests: INITIAL_MOCK_TESTS,
  inventories: getPersisted('hf_lab_inventories', generateMockInventories()),
  equipments: getPersisted('hf_lab_equipments', generateMockEquipment()),
  requests: getPersisted('hf_lab_requests', generateMockRequests()),
  predictions: getPersisted('hf_lab_predictions', INITIAL_MOCK_PREDICTIONS),
  loading: false,

  subscribeToLabs: () => {
    if (IS_MOCK_ENV) {
      set({
        tests: INITIAL_MOCK_TESTS,
        inventories: getPersisted('hf_lab_inventories', generateMockInventories()),
        equipments: getPersisted('hf_lab_equipments', generateMockEquipment()),
        requests: getPersisted('hf_lab_requests', generateMockRequests()),
        predictions: getPersisted('hf_lab_predictions', INITIAL_MOCK_PREDICTIONS),
        loading: false
      });
      return () => {};
    }

    set({ loading: true });
    const unsubInv = onSnapshot(collection(db, 'test_inventory'), (snapshot) => {
      const list: LabTestInventory[] = [];
      snapshot.forEach(doc => list.push(doc.data() as LabTestInventory));
      if (list.length > 0) set({ inventories: list });
    });

    const unsubEq = onSnapshot(collection(db, 'laboratory_equipment'), (snapshot) => {
      const list: LabEquipment[] = [];
      snapshot.forEach(doc => list.push(doc.data() as LabEquipment));
      if (list.length > 0) set({ equipments: list });
    });

    const unsubReq = onSnapshot(collection(db, 'test_requests'), (snapshot) => {
      const list: LabTestRequest[] = [];
      snapshot.forEach(doc => list.push(doc.data() as LabTestRequest));
      if (list.length > 0) set({ requests: list });
      set({ loading: false });
    });

    return () => {
      unsubInv();
      unsubEq();
      unsubReq();
    };
  },

  updateReagentStock: async (inventoryId, level) => {
    set({ loading: true });
    const updated = get().inventories.map(inv => inv.inventoryId === inventoryId ? { ...inv, reagentStockLevel: level, updatedAt: new Date().toISOString() } : inv);

    if (IS_MOCK_ENV) {
      setPersisted('hf_lab_inventories', updated);
      set({ inventories: updated, loading: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'test_inventory', inventoryId), { reagentStockLevel: level, updatedAt: new Date().toISOString() });
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  updateEquipmentStatus: async (equipmentId, status) => {
    set({ loading: true });
    const updated = get().equipments.map(eq => eq.equipmentId === equipmentId ? { ...eq, status } : eq);

    // Also update availability status of tests linked to this machine
    const targetEq = get().equipments.find(e => e.equipmentId === equipmentId);
    let updatedInv = get().inventories;
    if (targetEq) {
      const isAvailable = status === 'Working';
      updatedInv = get().inventories.map(inv => {
        // Match tests requiring this machine
        const testMaster = get().tests.find(t => t.testId === inv.testId);
        if (inv.healthCenterId === targetEq.healthCenterId && testMaster && testMaster.equipmentRequired === targetEq.equipmentName) {
          return { ...inv, isAvailable, updatedAt: new Date().toISOString() };
        }
        return inv;
      });
    }

    if (IS_MOCK_ENV) {
      setPersisted('hf_lab_equipments', updated);
      setPersisted('hf_lab_inventories', updatedInv);
      set({ equipments: updated, inventories: updatedInv, loading: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'laboratory_equipment', equipmentId), { status });
      // Update linked inventory docs in Firestore
      if (targetEq) {
        const isAvailable = status === 'Working';
        const linkedInvs = get().inventories.filter(inv => {
          const testMaster = get().tests.find(t => t.testId === inv.testId);
          return inv.healthCenterId === targetEq.healthCenterId && testMaster && testMaster.equipmentRequired === targetEq.equipmentName;
        });
        for (const inv of linkedInvs) {
          await updateDoc(doc(db, 'test_inventory', inv.inventoryId), { isAvailable, updatedAt: new Date().toISOString() });
        }
      }
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  createTestRequest: async (newReq) => {
    set({ loading: true });
    const id = `req-l-${Math.random().toString(36).substr(2, 9)}`;
    const log: LabTestRequest = {
      ...newReq,
      requestId: id,
      status: 'Pending',
      requestDate: new Date().toISOString()
    };

    if (IS_MOCK_ENV) {
      const list = getPersisted('hf_lab_requests', []);
      const updated = [log, ...list];
      setPersisted('hf_lab_requests', updated);
      set({ requests: updated, loading: false });
      return;
    }

    try {
      await setDoc(doc(db, 'test_requests', id), log);
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  referTestRequest: async (requestId, targetCenterId) => {
    set({ loading: true });
    const updated = get().requests.map(req => req.requestId === requestId ? { ...req, status: 'Referred' as const, referredToCenterId: targetCenterId } : req);

    if (IS_MOCK_ENV) {
      setPersisted('hf_lab_requests', updated);
      set({ requests: updated, loading: false });
      return;
    }

    try {
      await updateDoc(doc(db, 'test_requests', requestId), { status: 'Referred', referredToCenterId: targetCenterId });
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  runAiLabForecast: async (healthCenterId) => {
    set({ loading: true });
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || "";
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Grab current inventory and equipment loads
    const centerInvs = get().inventories.filter(inv => inv.healthCenterId === healthCenterId);
    const centerEquip = get().equipments.filter(e => e.healthCenterId === healthCenterId);

    // Expected tomorrow footfall count
    const footfallTomorrow = useFootfallStore.getState().predictions[healthCenterId]?.tomorrowCount || 45;

    // Reassignment target selection
    const otherInvs = get().inventories.filter(inv => inv.healthCenterId !== healthCenterId && inv.isAvailable);
    const candidates: any[] = [];
    const uniqueIds = Array.from(new Set(otherInvs.map(i => i.healthCenterId)));

    uniqueIds.forEach(id => {
      const availableCount = get().inventories.filter(i => i.healthCenterId === id && i.isAvailable).length;
      if (availableCount > 3) {
        candidates.push({ phcId: id, availableCount });
      }
    });

    if (!openRouterKey && !geminiKey) {
      await new Promise(r => setTimeout(r, 1200));

      // Mock forecasting
      const expectedDemand: Record<string, number> = {};
      const machineRisk: Record<string, any> = {};
      const reagentShortage: Record<string, boolean> = {};
      const recs: LabRedistributionRecommendation[] = [];

      centerInvs.forEach(inv => {
        let baseCount = Math.round(footfallTomorrow * 0.4);
        if (inv.reagentStockLevel < 20) {
          reagentShortage[inv.testName] = true;
        }
        expectedDemand[inv.testName] = baseCount;
      });

      centerEquip.forEach(eq => {
        machineRisk[eq.equipmentName] = eq.status === 'Offline' ? 'Critical' : 'Low';
      });

      // Find referral recommendation targets
      const unavailableTests = centerInvs.filter(i => !i.isAvailable);
      if (unavailableTests.length > 0 && candidates.length > 0) {
        const best = candidates[0];
        let name = 'Laitryngew PHC';
        let dist = 12.8;
        let time = 20;

        if (best.phcId === 'phc-2') { name = 'Laitryngew PHC'; dist = 12.8; time = 20; }
        else if (best.phcId === 'phc-3') { name = 'Sohryngkham PHC'; dist = 18.2; time = 28; }
        else if (best.phcId === 'chc-1') { name = 'Pynursla CHC'; dist = 24.5; time = 38; }

        recs.push({
          unavailableTestId: unavailableTests[0].testId,
          unavailableTestName: unavailableTests[0].testName,
          sourceCenterId: healthCenterId,
          sourceCenterName: 'Current PHC',
          targetCenterId: best.phcId,
          targetCenterName: name,
          distance: dist,
          travelTime: time,
          availableCapacity: 20,
          reason: `Refer patients requiring ${unavailableTests[0].testName} to ${name} (${dist} km away, travel time is ${time} mins).`
        });
      }

      const prediction: LabForecastPrediction = {
        expectedTestDemand: expectedDemand,
        machineFailureRisk: machineRisk,
        reagentShortagePrediction: reagentShortage,
        confidenceScore: 89 + Math.round(Math.random() * 10),
        reasoning: `Diagnostic load expects ${footfallTomorrow} patients tomorrow. Reagent stock level for Hematology is critically low at 12%.`,
        recommendations: recs
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      setPersisted('hf_lab_predictions', updated);
      set({ predictions: updated, loading: false });
      return;
    }

    try {
      const promptText = `
        You are a clinical laboratory operations planner AI.
        Health Center ID: "${healthCenterId}"
        Active Equipment: ${JSON.stringify(centerEquip)}
        Current Inventory: ${JSON.stringify(centerInvs)}
        Expected Patient Footfall Tomorrow: ${footfallTomorrow} patients
        Nearby low-strain referral targets: ${JSON.stringify(candidates)}

        Analyze this data and generate a JSON response predicting lab loads:
        1. "expectedTestDemand": Record/Map of expected daily test volumes per test name tomorrow (e.g. { "CBC": 25, "Malaria": 12 })
        2. "machineFailureRisk": Record/Map of equipment failure risks per machine name ('Low' | 'Medium' | 'High' | 'Critical')
        3. "reagentShortagePrediction": Record/Map of predicted reagent shortages per test name (boolean, e.g. { "CBC": true })
        4. "confidenceScore": confidence score percentage (number between 50 and 100)
        5. "reasoning": clinical rationale explaining the forecast (string)
        6. "recommendations": array of referral re-routing suggestions for unavailable tests to candidate centers. Format each as: { "unavailableTestId": string, "unavailableTestName": string, "sourceCenterId": string, "sourceCenterName": string, "targetCenterId": string, "targetCenterName": string, "distance": number, "travelTime": number, "availableCapacity": number, "reason": string }

        Output only valid JSON. Do not include markdown wraps.
      `;

      let text = "";
      if (openRouterKey) {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': 'http://localhost:5173',
            'X-Title': 'HealthFlow AI'
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: promptText }],
            max_tokens: 1500
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

      const prediction: LabForecastPrediction = {
        expectedTestDemand: data.expectedTestDemand || {},
        machineFailureRisk: data.machineFailureRisk || {},
        reagentShortagePrediction: data.reagentShortagePrediction || {},
        confidenceScore: Number(data.confidenceScore),
        reasoning: data.reasoning,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : []
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      setPersisted('hf_lab_predictions', updated);
      set({ predictions: updated, loading: false });
    } catch (err) {
      console.warn("AI laboratory prediction query failed, invoking local fallback logic:", err);
      const expectedDemand: Record<string, number> = {};
      const machineRisk: Record<string, any> = {};
      const reagentShortage: Record<string, boolean> = {};
      const recs: LabRedistributionRecommendation[] = [];

      centerInvs.forEach(inv => {
        let baseCount = Math.round(footfallTomorrow * 0.4);
        if (inv.reagentStockLevel < 20) {
          reagentShortage[inv.testName] = true;
        }
        expectedDemand[inv.testName] = baseCount;
      });

      centerEquip.forEach(eq => {
        machineRisk[eq.equipmentName] = eq.status === 'Offline' ? 'Critical' : 'Low';
      });

      const unavailableTests = centerInvs.filter(i => !i.isAvailable);
      if (unavailableTests.length > 0 && candidates.length > 0) {
        const best = candidates[0];
        let name = 'Laitryngew PHC';
        let dist = 12.8;
        let time = 20;

        if (best.phcId === 'phc-2') { name = 'Laitryngew PHC'; dist = 12.8; time = 20; }
        else if (best.phcId === 'phc-3') { name = 'Sohryngkham PHC'; dist = 18.2; time = 28; }
        else if (best.phcId === 'chc-1') { name = 'Pynursla CHC'; dist = 24.5; time = 38; }

        recs.push({
          unavailableTestId: unavailableTests[0].testId,
          unavailableTestName: unavailableTests[0].testName,
          sourceCenterId: healthCenterId,
          sourceCenterName: healthCenterId === 'phc-1' ? 'Mawphlang PHC' : 'Sohryngkham PHC',
          targetCenterId: best.phcId,
          targetCenterName: name,
          distance: dist,
          travelTime: time,
          availableCapacity: best.availableCount,
          reason: `[Offline Fallback] Service offline at target PHC. Refer patient diagnostics to nearby active laboratory at ${name}.`
        });
      }

      const prediction: LabForecastPrediction = {
        expectedTestDemand: expectedDemand,
        machineFailureRisk: machineRisk,
        reagentShortagePrediction: reagentShortage,
        confidenceScore: 85 + Math.round(Math.random() * 11),
        reasoning: `[Offline Fallback] Forecast diagnostic workloads mapped from expected daily patient traffic of ${footfallTomorrow} patients.`,
        recommendations: recs
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      setPersisted('hf_lab_predictions', updated);
      set({ predictions: updated, loading: false });
    }
  }
}));
