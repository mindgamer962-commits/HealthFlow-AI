import { create } from 'zustand';
import { BedManagement } from '../types';
import { db, IS_MOCK_ENV } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { useFootfallStore } from './footfallStore';
import { usePhcStore } from './phcStore';

export interface RedistributionRecommendation {
  targetPhcId: string;
  targetPhcName: string;
  distance: number; // in km
  travelTime: number; // in minutes
  availableBeds: number;
  reason: string;
}

export interface BedForecastPrediction {
  expectedOccupancyTomorrow: number; // percentage
  next7Days: number[]; // daily occupancy percentages
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  confidenceScore: number;
  reasoning: string;
  recommendations: RedistributionRecommendation[];
}

interface BedState {
  beds: BedManagement[];
  predictions: Record<string, BedForecastPrediction>;
  loading: boolean;
  
  subscribeToBeds: () => () => void;
  updateBedPool: (healthCenterId: string, bedType: BedManagement['bedType'], fields: Partial<Omit<BedManagement, 'bedId' | 'healthCenterId' | 'bedType'>>) => Promise<void>;
  runAiBedForecast: (healthCenterId: string) => Promise<void>;
}

// Generate high-fidelity initial mock beds per type per clinic
const generateMockBeds = (): BedManagement[] => {
  const list: BedManagement[] = [];
  const facilities = [
    { id: 'phc-1', name: 'Mawphlang PHC', general: 5, icu: 1, emergency: 2, isolation: 2 },
    { id: 'phc-2', name: 'Laitryngew PHC', general: 4, icu: 0, emergency: 2, isolation: 2 },
    { id: 'phc-3', name: 'Sohryngkham PHC', general: 6, icu: 1, emergency: 3, isolation: 2 },
    { id: 'chc-1', name: 'Pynursla CHC', general: 15, icu: 4, emergency: 6, isolation: 5 },
    { id: 'phc-4', name: 'Mawsynram PHC', general: 4, icu: 0, emergency: 2, isolation: 2 }
  ];

  facilities.forEach(fac => {
    const types: ('General' | 'ICU' | 'Emergency' | 'Isolation' | 'Maternity' | 'Pediatric')[] = 
      ['General', 'ICU', 'Emergency', 'Isolation', 'Maternity', 'Pediatric'];

    types.forEach(t => {
      let total = 0;
      let occupied = 0;
      let reserved = 0;
      let maintenance = 0;

      if (t === 'General') {
        total = fac.general;
        occupied = Math.round(total * 0.7) || 1;
      } else if (t === 'ICU') {
        total = fac.icu;
        occupied = total > 0 ? (Math.random() > 0.3 ? total : total - 1) : 0;
      } else if (t === 'Emergency') {
        total = fac.emergency;
        occupied = total > 0 ? (Math.random() > 0.4 ? total : total - 1) : 0;
      } else if (t === 'Isolation') {
        total = fac.isolation;
        occupied = Math.round(total * 0.5);
      } else if (t === 'Maternity') {
        total = Math.round(fac.general * 0.5) || 2;
        occupied = Math.round(total * 0.4);
      } else if (t === 'Pediatric') {
        total = Math.round(fac.general * 0.3) || 1;
        occupied = Math.round(total * 0.3);
      }

      if (total > 0) {
        list.push({
          bedId: `bm-${fac.id}-${t.toLowerCase()}`,
          healthCenterId: fac.id,
          bedType: t,
          TotalBeds: total,
          OccupiedBeds: occupied,
          AvailableBeds: Math.max(0, total - occupied - reserved - maintenance),
          ReservedBeds: reserved,
          MaintenanceBeds: maintenance,
          UpdatedBy: 'system-seed',
          UpdatedAt: new Date().toISOString()
        });
      }
    });
  });

  return list;
};

const INITIAL_MOCK_PREDICTIONS: Record<string, BedForecastPrediction> = {
  'phc-1': {
    expectedOccupancyTomorrow: 96,
    next7Days: [96, 92, 95, 90, 94, 88, 70],
    riskLevel: 'Critical',
    confidenceScore: 92,
    reasoning: 'High patient footfall and consecutive emergency admissions over the last 5 days.',
    recommendations: [
      { targetPhcId: 'phc-2', targetPhcName: 'Laitryngew PHC', distance: 12.8, travelTime: 20, availableBeds: 5, reason: 'Laitryngew PHC is only 45% occupied with 5 available beds. Travel times are low.' }
    ]
  },
  'phc-2': {
    expectedOccupancyTomorrow: 48,
    next7Days: [48, 45, 50, 42, 44, 40, 25],
    riskLevel: 'Low',
    confidenceScore: 89,
    reasoning: 'Normal operational loads and high available capacity.',
    recommendations: []
  },
  'phc-3': {
    expectedOccupancyTomorrow: 76,
    next7Days: [76, 72, 80, 70, 75, 68, 45],
    riskLevel: 'Medium',
    confidenceScore: 91,
    reasoning: 'Moderately high pediatric ward admissions forecast.',
    recommendations: []
  },
  'chc-1': {
    expectedOccupancyTomorrow: 84,
    next7Days: [84, 82, 88, 80, 85, 78, 55],
    riskLevel: 'High',
    confidenceScore: 93,
    reasoning: 'High volume of referral critical care cases expected from peripheral nodes.',
    recommendations: [
      { targetPhcId: 'phc-4', targetPhcName: 'Mawsynram PHC', distance: 22.5, travelTime: 35, availableBeds: 6, reason: 'Mawsynram PHC has 6 available general and maternity beds with 35% occupancy.' }
    ]
  },
  'phc-4': {
    expectedOccupancyTomorrow: 35,
    next7Days: [35, 32, 38, 30, 34, 32, 20],
    riskLevel: 'Low',
    confidenceScore: 90,
    reasoning: 'Steady seasonal profiles and zero isolation bed strain forecast.',
    recommendations: []
  }
};

const loadPersistedBeds = (): BedManagement[] => {
  const data = localStorage.getItem('healthflow_beds');
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  const initial = generateMockBeds();
  localStorage.setItem('healthflow_beds', JSON.stringify(initial));
  return initial;
};

const savePersistedBeds = (list: BedManagement[]) => {
  localStorage.setItem('healthflow_beds', JSON.stringify(list));
};

const loadPersistedPredictions = (): Record<string, BedForecastPrediction> => {
  const data = localStorage.getItem('healthflow_beds_predictions');
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  return INITIAL_MOCK_PREDICTIONS;
};

const savePersistedPredictions = (preds: Record<string, BedForecastPrediction>) => {
  localStorage.setItem('healthflow_beds_predictions', JSON.stringify(preds));
};

export const useBedStore = create<BedState>((set, get) => ({
  beds: loadPersistedBeds(),
  predictions: loadPersistedPredictions(),
  loading: false,

  subscribeToBeds: () => {
    if (IS_MOCK_ENV) {
      set({
        beds: loadPersistedBeds(),
        predictions: loadPersistedPredictions(),
        loading: false
      });
      return () => {};
    }

    set({ loading: true });
    const unsub = onSnapshot(collection(db, 'bed_management'), (snapshot) => {
      const list: BedManagement[] = [];
      snapshot.forEach(doc => list.push(doc.data() as BedManagement));
      set({
        beds: list.length > 0 ? list : loadPersistedBeds(),
        loading: false
      });
    }, (err) => {
      console.error(err);
      set({ loading: false });
    });
    return unsub;
  },

  updateBedPool: async (healthCenterId, bedType, fields) => {
    set({ loading: true });
    const id = `bm-${healthCenterId}-${bedType.toLowerCase()}`;
    
    const existing = get().beds.find(b => b.bedId === id) || {
      bedId: id,
      healthCenterId,
      bedType,
      TotalBeds: 5,
      OccupiedBeds: 0,
      AvailableBeds: 5,
      ReservedBeds: 0,
      MaintenanceBeds: 0
    };

    const updatedObj: BedManagement = {
      ...existing,
      ...fields,
      bedId: id,
      healthCenterId,
      bedType,
      AvailableBeds: Math.max(0, (fields.TotalBeds ?? existing.TotalBeds) - (fields.OccupiedBeds ?? existing.OccupiedBeds) - (fields.ReservedBeds ?? existing.ReservedBeds) - (fields.MaintenanceBeds ?? existing.MaintenanceBeds)),
      UpdatedBy: fields.UpdatedBy || 'console-staff',
      UpdatedAt: new Date().toISOString()
    };

    // Calculate aggregated beds count
    const existingBeds = get().beds;
    const centerBeds = existingBeds.filter(b => b.healthCenterId === healthCenterId && b.bedId !== id);
    const newTotalBeds = centerBeds.reduce((sum, b) => sum + b.TotalBeds, 0) + updatedObj.TotalBeds;
    const newBedsOccupied = centerBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0) + updatedObj.OccupiedBeds;

    if (IS_MOCK_ENV) {
      const list = loadPersistedBeds();
      const updated = [updatedObj, ...list.filter(b => b.bedId !== id)];
      savePersistedBeds(updated);
      set({ beds: updated, loading: false });

      // Sync aggregate metrics to parent center node
      usePhcStore.getState().updateCenter(healthCenterId, {
        totalBeds: newTotalBeds,
        bedsOccupied: newBedsOccupied
      });
      return;
    }

    try {
      await setDoc(doc(db, 'bed_management', id), updatedObj);

      // Sync aggregate metrics to parent center node in Firestore
      await usePhcStore.getState().updateCenter(healthCenterId, {
        totalBeds: newTotalBeds,
        bedsOccupied: newBedsOccupied
      });

      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  runAiBedForecast: async (healthCenterId) => {
    set({ loading: true });
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || "";
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    // Pull current occupancy metrics of this center
    const centerBeds = get().beds.filter(b => b.healthCenterId === healthCenterId);
    const total = centerBeds.reduce((sum, b) => sum + b.TotalBeds, 0);
    const occupied = centerBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0);
    const currentPercent = total > 0 ? Math.round((occupied / total) * 100) : 50;

    // Grab expected tomorrow patient footfall to scale predictions
    const footfallTomorrow = useFootfallStore.getState().predictions[healthCenterId]?.tomorrowCount || 45;

    // Find other centers for patient redistribution recommendations
    const otherCenters = get().beds.filter(b => b.healthCenterId !== healthCenterId);
    const candidates: any[] = [];
    const uniqueIds = Array.from(new Set(otherCenters.map(b => b.healthCenterId)));
    
    uniqueIds.forEach(id => {
      const cBeds = get().beds.filter(b => b.healthCenterId === id);
      const cTotal = cBeds.reduce((sum, b) => sum + b.TotalBeds, 0);
      const cOccupied = cBeds.reduce((sum, b) => sum + b.OccupiedBeds, 0);
      const cAvailable = cTotal - cOccupied;
      const cPercent = cTotal > 0 ? Math.round((cOccupied / cTotal) * 100) : 100;
      
      if (cPercent < 55 && cAvailable > 2) {
        candidates.push({ phcId: id, available: cAvailable, occupancy: cPercent });
      }
    });

    if (!openRouterKey && !geminiKey) {
      await new Promise(r => setTimeout(r, 1200));

      // Mock forecasting
      let factor = 1.0;
      if (footfallTomorrow > 120) factor = 1.4;
      else if (footfallTomorrow > 80) factor = 1.2;

      const predictedTomorrow = Math.min(99, Math.round(currentPercent * factor));
      const risk: 'Low' | 'Medium' | 'High' | 'Critical' = 
        predictedTomorrow > 90 ? 'Critical' : predictedTomorrow > 75 ? 'High' : predictedTomorrow > 50 ? 'Medium' : 'Low';

      const recs: RedistributionRecommendation[] = [];
      if ((risk === 'Critical' || risk === 'High') && candidates.length > 0) {
        const best = candidates[0];
        let name = 'Laitryngew PHC';
        let dist = 12.8;
        let time = 20;

        if (best.phcId === 'phc-2') { name = 'Laitryngew PHC'; dist = 12.8; time = 20; }
        else if (best.phcId === 'phc-3') { name = 'Sohryngkham PHC'; dist = 18.2; time = 28; }
        else if (best.phcId === 'chc-1') { name = 'Pynursla CHC'; dist = 24.5; time = 38; }
        else if (best.phcId === 'phc-4') { name = 'Mawsynram PHC'; dist = 22.5; time = 35; }

        recs.push({
          targetPhcId: best.phcId,
          targetPhcName: name,
          distance: dist,
          travelTime: time,
          availableBeds: best.available,
          reason: `${name} has low occupancy (${best.occupancy}%) and ${best.available} available beds. Recommended for patient redistribution.`
        });
      }

      const next7Days = Array.from({ length: 7 }, () => Math.min(99, Math.round(predictedTomorrow * (0.9 + Math.random() * 0.2))));

      const prediction: BedForecastPrediction = {
        expectedOccupancyTomorrow: predictedTomorrow,
        next7Days,
        riskLevel: risk,
        confidenceScore: 88 + Math.round(Math.random() * 11),
        reasoning: `Expected occupancy Tomorrow reaches ${predictedTomorrow}% based on predicted load of ${footfallTomorrow} patients and current ${currentPercent}% occupancy rate.`,
        recommendations: recs
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      savePersistedPredictions(updated);
      set({ predictions: updated, loading: false });
      return;
    }

    try {
      const promptText = `
        You are a clinical capacity forecasting AI.
        Health Center ID: "${healthCenterId}"
        Bed Capacity: Total: ${total}, Occupied: ${occupied} (${currentPercent}% occupancy)
        Tomorrow's Predicted Patient Footfall: ${footfallTomorrow} patients
        Nearby available centers: ${JSON.stringify(candidates)}

        Analyze this data and generate a JSON response predicting:
        1. "expectedOccupancyTomorrow": occupancy percentage (number, e.g. 96)
        2. "next7Days": predicted occupancy percentages for the next 7 days starting tomorrow (array of 7 numbers)
        3. "riskLevel": 'Low' | 'Medium' | 'High' | 'Critical'
        4. "confidenceScore": confidence score percentage (number between 50 and 100)
        5. "reasoning": clinical rationale explaining the expected load (string)
        6. "recommendations": array of recommendations for patient redistribution to nearby low-occupancy centers from the candidates list. Format each as: { "targetPhcId": string, "targetPhcName": string, "distance": number, "travelTime": number, "availableBeds": number, "reason": string }

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
            model: "google/gemini-2.5-flash",
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

      const prediction: BedForecastPrediction = {
        expectedOccupancyTomorrow: Number(data.expectedOccupancyTomorrow),
        next7Days: data.next7Days.map(Number),
        riskLevel: data.riskLevel,
        confidenceScore: Number(data.confidenceScore),
        reasoning: data.reasoning,
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : []
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      savePersistedPredictions(updated);
      set({ predictions: updated, loading: false });
    } catch (err) {
      console.warn("AI bed forecast query failed, invoking local fallback logic:", err);
      let factor = 1.0;
      if (footfallTomorrow > 120) factor = 1.4;
      else if (footfallTomorrow > 80) factor = 1.2;

      const predictedTomorrow = Math.min(99, Math.round(currentPercent * factor));
      const risk: 'Low' | 'Medium' | 'High' | 'Critical' = 
        predictedTomorrow > 90 ? 'Critical' : predictedTomorrow > 75 ? 'High' : predictedTomorrow > 50 ? 'Medium' : 'Low';

      const recs: RedistributionRecommendation[] = [];
      if ((risk === 'Critical' || risk === 'High') && candidates.length > 0) {
        const best = candidates[0];
        let name = 'Laitryngew PHC';
        let dist = 12.8;
        let time = 20;

        if (best.phcId === 'phc-2') { name = 'Laitryngew PHC'; dist = 12.8; time = 20; }
        else if (best.phcId === 'phc-3') { name = 'Sohryngkham PHC'; dist = 18.2; time = 28; }
        else if (best.phcId === 'chc-1') { name = 'Pynursla CHC'; dist = 24.5; time = 38; }
        else if (best.phcId === 'phc-4') { name = 'Mawsynram PHC'; dist = 22.5; time = 35; }

        recs.push({
          targetPhcId: best.phcId,
          targetPhcName: name,
          distance: dist,
          travelTime: time,
          availableBeds: best.available,
          reason: `[Offline Fallback] ${name} has low occupancy (${best.occupancy}%) and ${best.available} cots free.`
        });
      }

      const next7Days = Array.from({ length: 7 }, () => Math.min(99, Math.round(predictedTomorrow * (0.9 + Math.random() * 0.2))));

      const prediction: BedForecastPrediction = {
        expectedOccupancyTomorrow: predictedTomorrow,
        next7Days,
        riskLevel: risk,
        confidenceScore: 85 + Math.round(Math.random() * 11),
        reasoning: `[Offline Fallback] Expected occupancy Tomorrow reaches ${predictedTomorrow}% based on predicted footfall of ${footfallTomorrow} patients and current ${currentPercent}% occupancy rate.`,
        recommendations: recs
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      savePersistedPredictions(updated);
      set({ predictions: updated, loading: false });
    }
  }
}));
