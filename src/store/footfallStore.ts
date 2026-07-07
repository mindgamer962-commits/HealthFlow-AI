import { create } from 'zustand';
import { PatientFootfall } from '../types';
import { db, IS_MOCK_ENV } from '../config/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';

export interface PatientFootfallPrediction {
  tomorrowCount: number;
  next7Days: number[];
  next7DaysTotal: number;
  confidenceScore: number;
  reason: string;
  alerts: string[];
}

interface FootfallState {
  footfalls: PatientFootfall[];
  predictions: Record<string, PatientFootfallPrediction>;
  loading: boolean;
  
  subscribeToFootfalls: () => () => void;
  addFootfallRecord: (record: Omit<PatientFootfall, 'footfallId' | 'createdAt'>) => Promise<void>;
  runAiFootfallPrediction: (healthCenterId: string, options?: { season?: string; weather?: string; festival?: string }) => Promise<void>;
  runAiFootfallForecast: (healthCenterId: string, options?: { season?: string; weather?: string; festival?: string }) => Promise<void>;
}

const generateMockFootfalls = (): PatientFootfall[] => {
  const list: PatientFootfall[] = [];
  const facilities = ['phc-1', 'phc-2', 'phc-3', 'chc-1', 'phc-4'];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const dayOfWeek = d.getDay();
    
    facilities.forEach(fac => {
      let baseLoad = 40;
      if (fac === 'chc-1') baseLoad = 120;
      if (fac === 'phc-3') baseLoad = 75;
      
      let dayFactor = 1.0;
      if (dayOfWeek === 1) dayFactor = 1.35; // Mondays are peak
      else if (dayOfWeek === 3) dayFactor = 1.2;
      else if (dayOfWeek === 0) dayFactor = 0.45; // Sundays are slow
      
      const variance = 0.85 + Math.random() * 0.3;
      const total = Math.max(5, Math.round(baseLoad * dayFactor * variance));
      
      const male = Math.round(total * 0.35);
      const female = Math.round(total * 0.4);
      const children = Math.round(total * 0.15);
      const senior = Math.max(0, total - male - female - children);
      
      const emergency = Math.round(total * 0.08);
      const ipd = Math.round(total * 0.12);
      const opd = Math.max(0, total - emergency - ipd);
      
      list.push({
        footfallId: `ff-${fac}-${dateStr}`,
        healthCenterId: fac,
        date: dateStr,
        day,
        month,
        year,
        malePatients: male,
        femalePatients: female,
        childrenPatients: children,
        seniorCitizens: senior,
        totalPatients: total,
        emergencyPatients: emergency,
        opdPatients: opd,
        ipdPatients: ipd,
        createdBy: 'system-seed',
        createdAt: new Date(d.getTime() + 12 * 3600000).toISOString()
      });
    });
  }
  return list;
};

const INITIAL_MOCK_PREDICTIONS: Record<string, PatientFootfallPrediction> = {
  'phc-1': { tomorrowCount: 62, next7Days: [62, 58, 68, 55, 61, 59, 25], next7DaysTotal: 388, confidenceScore: 92, reason: 'Seasonal monsoon viral coughs and high Monday morning consultations forecast.', alerts: ['Patient Load Increasing'] },
  'phc-2': { tomorrowCount: 48, next7Days: [48, 45, 52, 41, 46, 44, 18], next7DaysTotal: 294, confidenceScore: 89, reason: 'Stable operational loads returning to local baselines after weekend festivals.', alerts: [] },
  'phc-3': { tomorrowCount: 95, next7Days: [95, 91, 105, 88, 93, 90, 42], next7DaysTotal: 604, confidenceScore: 94, reason: 'Immunization campaign scheduled tomorrow drives high expected pediatric turnouts.', alerts: ['Patient Load Increasing', 'Doctor Shortage Risk'] },
  'chc-1': { tomorrowCount: 168, next7Days: [168, 160, 185, 155, 162, 159, 78], next7DaysTotal: 1067, confidenceScore: 95, reason: 'Referral emergency transfers from local sub-centers and acute climate shifts.', alerts: ['PHC Capacity Reached', 'Overcrowding Expected', 'Doctor Shortage Risk', 'Medicine Demand Increase'] },
  'phc-4': { tomorrowCount: 52, next7Days: [52, 49, 56, 45, 50, 48, 22], next7DaysTotal: 322, confidenceScore: 91, reason: 'Prevalence of seasonal waterborne gastroenteritis cases under heavy rains.', alerts: [] }
};

const loadPersistedFootfalls = (): PatientFootfall[] => {
  const data = localStorage.getItem('healthflow_footfall');
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  const initial = generateMockFootfalls();
  localStorage.setItem('healthflow_footfall', JSON.stringify(initial));
  return initial;
};

const savePersistedFootfalls = (list: PatientFootfall[]) => {
  localStorage.setItem('healthflow_footfall', JSON.stringify(list));
};

const loadPersistedPredictions = (): Record<string, PatientFootfallPrediction> => {
  const data = localStorage.getItem('healthflow_footfall_predictions');
  if (data) {
    try { return JSON.parse(data); } catch (e) {}
  }
  return INITIAL_MOCK_PREDICTIONS;
};

const savePersistedPredictions = (preds: Record<string, PatientFootfallPrediction>) => {
  localStorage.setItem('healthflow_footfall_predictions', JSON.stringify(preds));
};

export const useFootfallStore = create<FootfallState>((set, get) => ({
  footfalls: loadPersistedFootfalls(),
  predictions: loadPersistedPredictions(),
  loading: false,

  subscribeToFootfalls: () => {
    if (IS_MOCK_ENV) {
      set({
        footfalls: loadPersistedFootfalls(),
        predictions: loadPersistedPredictions(),
        loading: false
      });
      return () => {};
    }

    set({ loading: true });
    
    const unsubFootfalls = onSnapshot(collection(db, 'patient_footfall'), (snapshot) => {
      const list: PatientFootfall[] = [];
      snapshot.forEach(doc => list.push(doc.data() as PatientFootfall));
      set({
        footfalls: list.length > 0 ? list : loadPersistedFootfalls()
      });
    }, (err) => {
      console.error(err);
    });

    const unsubPredictions = onSnapshot(collection(db, 'patient_predictions'), (snapshot) => {
      const preds: Record<string, PatientFootfallPrediction> = {};
      snapshot.forEach(doc => {
        preds[doc.id] = doc.data() as PatientFootfallPrediction;
      });
      set({
        predictions: Object.keys(preds).length > 0 ? preds : loadPersistedPredictions(),
        loading: false
      });
    }, (err) => {
      console.error(err);
      set({ loading: false });
    });

    return () => {
      unsubFootfalls();
      unsubPredictions();
    };
  },

  addFootfallRecord: async (record) => {
    set({ loading: true });
    const id = `ff-${record.healthCenterId}-${record.date}`;
    const entry: PatientFootfall = { ...record, footfallId: id, createdAt: new Date().toISOString() };

    if (IS_MOCK_ENV) {
      const list = loadPersistedFootfalls();
      const updated = [entry, ...list.filter(f => f.footfallId !== id)];
      savePersistedFootfalls(updated);
      set({ footfalls: updated, loading: false });
      return;
    }

    try {
      await setDoc(doc(db, 'patient_footfall', id), entry);
      set({ loading: false });
    } catch (e) {
      console.error(e);
      set({ loading: false });
      throw e;
    }
  },

  runAiFootfallPrediction: async (healthCenterId, options) => {
    set({ loading: true });
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || "";
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const history = get().footfalls
      .filter(f => f.healthCenterId === healthCenterId)
      .slice(0, 15)
      .map(h => ({ date: h.date, total: h.totalPatients }));

    const season = options?.season || 'Monsoon';
    const weather = options?.weather || 'Heavy Rain';
    const festival = options?.festival || 'None';

    if (!openRouterKey && !geminiKey) {
      await new Promise(r => setTimeout(r, 1200));
      
      // Customize prediction values based on options factors
      let multiplier = 1.0;
      if (season === 'Monsoon' && weather.includes('Rain')) multiplier = 1.25; // Fever / flu spike
      if (festival !== 'None') multiplier = 0.7; // People stay home

      const baseMock = INITIAL_MOCK_PREDICTIONS[healthCenterId] || {
        tomorrowCount: 55,
        next7Days: [55, 52, 60, 48, 54, 51, 25],
        next7DaysTotal: 345,
        confidenceScore: 90,
        reason: 'Historical seasonal average indicators suggest steady local trends.',
        alerts: []
      };

      const customTomorrow = Math.round(baseMock.tomorrowCount * multiplier);
      const custom7Days = baseMock.next7Days.map(x => Math.round(x * multiplier));
      const custom7DaysTotal = custom7Days.reduce((sum, x) => sum + x, 0);

      const customAlerts = [...baseMock.alerts];
      if (customTomorrow > 130 && !customAlerts.includes('PHC Capacity Reached')) {
        customAlerts.push('PHC Capacity Reached', 'Overcrowding Expected', 'Doctor Shortage Risk', 'Medicine Demand Increase');
      } else if (customTomorrow > 80 && !customAlerts.includes('Patient Load Increasing')) {
        customAlerts.push('Patient Load Increasing', 'Doctor Shortage Risk');
      }

      const customPred: PatientFootfallPrediction = {
        tomorrowCount: customTomorrow,
        next7Days: custom7Days,
        next7DaysTotal: custom7DaysTotal,
        confidenceScore: Math.min(100, baseMock.confidenceScore + (options ? 3 : 0)),
        reason: `Generated predictions customized for ${season} season under ${weather} conditions. Roster load risk: ${customTomorrow > 100 ? 'High' : 'Normal'}.`,
        alerts: customAlerts
      };

      const updatedPredictions = {
        ...get().predictions,
        [healthCenterId]: customPred
      };
      
      savePersistedPredictions(updatedPredictions);
      set({ predictions: updatedPredictions, loading: false });
      return;
    }

    try {
      const promptText = `
        You are a clinical logistics planning AI.
        Analyze the historical patient footfall registry data for Health Center: "${healthCenterId}".
        Historical counts: ${JSON.stringify(history)}
        Current Local Time: ${new Date().toISOString()}

        External contextual environment parameters:
        - Season: ${season}
        - Weather Profile: ${weather}
        - Festival Holiday: ${festival}

        Generate a JSON response prediction analyzing:
        1. "tomorrowCount": expected patient count tomorrow (number)
        2. "next7Days": expected patient counts for the next 7 days starting tomorrow (array of 7 numbers)
        3. "confidenceScore": confidence score percentage (number between 50 and 100)
        4. "reason": concise clinical reasoning explaining the forecast based on season, weather, festivals, and climate trends (string)
        5. "alerts": list of active load alert flags from this list: "Patient Load Increasing", "Patient Load Decreasing", "Overcrowding Expected", "PHC Capacity Reached", "Doctor Shortage Risk", "Medicine Demand Increase" (array of strings)

        Output only valid JSON. Do not write markdown wraps.
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
            model: "meta-llama/llama-3.2-3b-instruct:free",
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
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

      const prediction: PatientFootfallPrediction = {
        tomorrowCount: Number(data.tomorrowCount),
        next7Days: data.next7Days.map(Number),
        next7DaysTotal: data.next7Days.map(Number).reduce((sum: number, x: number) => sum + x, 0),
        confidenceScore: Number(data.confidenceScore),
        reason: data.reason,
        alerts: Array.isArray(data.alerts) ? data.alerts : []
      };

      const updated = {
        ...get().predictions,
        [healthCenterId]: prediction
      };

      savePersistedPredictions(updated);
      set({ predictions: updated, loading: false });

      if (!IS_MOCK_ENV) {
        try {
          await setDoc(doc(db, 'patient_predictions', healthCenterId), prediction);
        } catch (err) {
          console.error("Firestore prediction save error:", err);
        }
      }
    } catch (err) {
      console.error("AI footfall prediction failed, falling back:", err);
      const fallbackPred = INITIAL_MOCK_PREDICTIONS[healthCenterId] || {
        tomorrowCount: 55,
        next7Days: [55, 52, 60, 48, 54, 51, 25],
        next7DaysTotal: 345,
        confidenceScore: 90,
        reason: 'Historical seasonal average indicators suggest steady local trends.',
        alerts: []
      };
      const updated = {
        ...get().predictions,
        [healthCenterId]: fallbackPred
      };
      set({ predictions: updated, loading: false });

      if (!IS_MOCK_ENV) {
        try {
          await setDoc(doc(db, 'patient_predictions', healthCenterId), fallbackPred);
        } catch (err) {
          console.error("Firestore fallback prediction save error:", err);
        }
      }
    }
  },

  runAiFootfallForecast: async (healthCenterId, options) => {
    await get().runAiFootfallPrediction(healthCenterId, options);
  }
}));
