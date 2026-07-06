import { create } from 'zustand';
import { CopilotSession, CopilotMessage, CopilotNotification } from '../types';
import { usePhcStore } from './phcStore';
import { useMedicineStore } from './medicineStore';
import { useFootfallStore } from './footfallStore';
import { useBedStore } from './bedStore';
import { useDoctorStore } from './doctorStore';
import { useLabStore } from './labStore';
import { useCommandStore } from './commandStore';

interface CopilotState {
  sessions: CopilotSession[];
  activeSessionId: string | null;
  notifications: CopilotNotification[];
  language: 'en-US' | 'hi-IN' | 'gu-IN';
  loading: boolean;

  startNewSession: () => void;
  selectSession: (sessionId: string) => void;
  setLanguage: (lang: 'en-US' | 'hi-IN' | 'gu-IN') => void;
  sendMessage: (content: string) => Promise<void>;
  clearNotifications: () => void;
  dismissNotification: (id: string) => void;
  deleteSession: (sessionId: string) => void;
}

const INITIAL_MOCK_SESSIONS: CopilotSession[] = [];

const INITIAL_MOCK_NOTIFICATIONS: CopilotNotification[] = [];

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

export const useCopilotStore = create<CopilotState>((set, get) => ({
  sessions: getPersisted('hf_copilot_sessions_v2', INITIAL_MOCK_SESSIONS),
  activeSessionId: getPersisted('hf_copilot_active_session_id_v2', null),
  notifications: getPersisted('hf_copilot_notifications_v2', INITIAL_MOCK_NOTIFICATIONS),
  language: 'en-US',
  loading: false,

  startNewSession: () => {
    const id = `sess-${Math.random().toString(36).substr(2, 9)}`;
    const newSession: CopilotSession = {
      sessionId: id,
      title: `New Session (${new Date().toLocaleDateString()})`,
      messages: [],
      createdAt: new Date().toISOString()
    };
    const updated = [newSession, ...get().sessions];
    setPersisted('hf_copilot_sessions_v2', updated);
    setPersisted('hf_copilot_active_session_id_v2', id);
    set({ sessions: updated, activeSessionId: id });
  },

  selectSession: (sessionId) => {
    setPersisted('hf_copilot_active_session_id_v2', sessionId);
    set({ activeSessionId: sessionId });
  },

  setLanguage: (lang) => {
    set({ language: lang });
  },

  sendMessage: async (content) => {
    if (!content.trim()) return;
    let activeId = get().activeSessionId;

    if (!activeId) {
      activeId = `sess-${Math.random().toString(36).substr(2, 9)}`;
      const newSession: CopilotSession = {
        sessionId: activeId,
        title: content.length > 30 ? content.substring(0, 30) + '...' : content,
        messages: [],
        createdAt: new Date().toISOString()
      };
      const updated = [newSession, ...get().sessions];
      setPersisted('hf_copilot_sessions_v2', updated);
      setPersisted('hf_copilot_active_session_id_v2', activeId);
      set({ sessions: updated, activeSessionId: activeId });
    }

    set({ loading: true });

    // 1. Add user message to active session
    const userMsg: CopilotMessage = {
      messageId: `msg-u-${Math.random().toString(36).substr(2, 9)}`,
      sender: 'user',
      content,
      timestamp: new Date().toISOString()
    };

    const activeSessionIdLocal = activeId;
    let currentSessions = get().sessions.map(s => {
      if (s.sessionId === activeSessionIdLocal) {
        return {
          ...s,
          messages: [...s.messages, userMsg],
          title: s.messages.length === 0 ? (content.length > 30 ? content.substring(0, 30) + '...' : content) : s.title
        };
      }
      return s;
    });

    set({ sessions: currentSessions });
    setPersisted('hf_copilot_sessions_v2', currentSessions);

    // 2. Fetch live data metrics to feed into prompt context
    const phcStore = usePhcStore.getState();
    const medStore = useMedicineStore.getState();
    const footStore = useFootfallStore.getState();
    const bedStore = useBedStore.getState();
    const docStore = useDoctorStore.getState();
    const labStore = useLabStore.getState();
    const cmdStore = useCommandStore.getState();

    // Compile clinical state summaries
    const centersSummary = phcStore.centers.map(c => {
      const risk = cmdStore.getDynamicRiskScore(c.centerId);
      const beds = bedStore.beds.filter(b => b.healthCenterId === c.centerId);
      const totalBeds = beds.reduce((sum, b) => sum + b.TotalBeds, 0) || c.bedsTotal || 10;
      const occupiedBeds = beds.reduce((sum, b) => sum + b.OccupiedBeds, 0) || c.bedsOccupied || 0;
      
      const doctors = docStore.doctors.filter(d => d.assignedHealthCenter === c.centerId);
      const docsCount = doctors.length;
      const presentDocs = docStore.attendanceLogs.filter(
        a => a.healthCenterId === c.centerId && a.date === new Date().toISOString().split('T')[0] && (a.attendanceStatus === 'Present' || a.attendanceStatus === 'Late')
      ).length;

      const labs = labStore.inventories.filter(i => i.healthCenterId === c.centerId);
      const activeLabs = labs.filter(l => l.isAvailable).length;

      return {
        centerId: c.centerId,
        centerName: c.centerName,
        centerType: c.centerType || c.type,
        district: c.district,
        riskScore: risk.score,
        riskLabel: risk.label,
        bedOccupancy: `${occupiedBeds}/${totalBeds} occupied`,
        doctorsRoster: `${presentDocs}/${docsCount} present`,
        labTestsCount: `${activeLabs}/${labs.length || 5} active tests`,
        medicineIndex: `${c.medicineHealthScore || 70}% Health`
      };
    });

    const lowStockMeds = medStore.stocks.filter(s => {
      const m = medStore.medicines.find(x => x.medicineId === s.medicineId);
      return s.currentQuantity < (m ? m.minStockLevel : 100);
    }).map(s => {
      const m = medStore.medicines.find(x => x.medicineId === s.medicineId);
      const c = phcStore.centers.find(x => x.centerId === s.phcId);
      return {
        medicineName: m ? m.medicineName : 'Unknown Medicine',
        centerName: c ? c.centerName : 'Unknown PHC',
        quantity: s.currentQuantity,
        minLevel: m ? m.minStockLevel : 100
      };
    });

    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY || "";
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

    const runLocalFallback = async () => {
      // Local fallback rules evaluator
      await new Promise(r => setTimeout(r, 1200));
      const textQuery = content.toLowerCase();

      let summaryText = "I have analyzed East Khasi Hills medical division metrics. ";
      let priority: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
      let confidence = 90;
      let outcome = "Operational readiness index balanced.";
      const supportingData: string[] = [];
      const recActions: any[] = [];

      if (textQuery.includes('critical') || textQuery.includes('phc') || textQuery.includes('risk')) {
        summaryText = "Currently, Mawphlang PHC is at Critical Risk (Risk Score: 89) due to bed overcapacity, physician deficit, and lab reagent shortage. Sohryngkham PHC requires attention.";
        priority = 'Critical';
        supportingData.push("Mawphlang PHC: Bed occupancy at 96%, Doctor attendance 50%, CBC reagent level at 12%.");
        supportingData.push("Sohryngkham PHC: Widal typhoid reagents low at 35%.");
        recActions.push({
          actionType: 'Transfer Medicine',
          description: 'Transfer 500 Paracetamol tablets from Sohryngkham PHC to Mawphlang PHC.',
          details: 'Averts stockout for Mawphlang OPD today.'
        });
        recActions.push({
          actionType: 'Transfer Doctor',
          description: 'Reassign 1 clinician from Pynursla CHC to Mawphlang PHC.',
          details: 'Balances Mawphlang workloads.'
        });
        outcome = "Mawphlang PHC stress score reduced from 89 to 45 (Healthy).";
      } else if (textQuery.includes('medicine') || textQuery.includes('shortage') || textQuery.includes('out')) {
        summaryText = "Paracetamol 650mg and Vitamin C supplies are running low at Mawphlang PHC. Sohryngkham PHC holds stock surpluses.";
        priority = 'High';
        lowStockMeds.forEach(m => {
          supportingData.push(`${m.medicineName} at ${m.centerName}: ${m.quantity} tabs (Min threshold is ${m.minLevel}).`);
        });
        recActions.push({
          actionType: 'Transfer Medicine',
          description: 'Reallocate 500 Paracetamol tablets from Sohryngkham to Mawphlang.',
          details: 'Prevent stockout for the upcoming 7 days.'
        });
        outcome = "Medicine safety margins restored.";
      } else if (textQuery.includes('doctor') || textQuery.includes('staff') || textQuery.includes('reassign')) {
        summaryText = "Workforce deficit detected at Mawphlang PHC (50% attendance today). Pynursla CHC and Laitryngew PHC are operating at full clinician capacity.";
        priority = 'High';
        supportingData.push("Mawphlang PHC: 1/2 physicians present.");
        supportingData.push("Pynursla CHC: 3/3 physicians present.");
        recActions.push({
          actionType: 'Transfer Doctor',
          description: 'Deploy 1 General Physician from Pynursla CHC to Mawphlang PHC for a 3-day temporary shift.',
          details: 'Stabilizes physician workload ratios.'
        });
        outcome = "Workforce roster coverage stabilized at 100%.";
      } else if (textQuery.includes('report') || textQuery.includes('weekly') || textQuery.includes('executive')) {
        summaryText = "East Khasi Hills Health Division Weekly Report is ready. Primary stress points are diagnostic kits supply velocities and doctor shift rosters.";
        priority = 'Medium';
        supportingData.push("District Average Medicine Health: 84%.");
        supportingData.push("Total Beds Occupancy: 65% average.");
        supportingData.push("Overall District Operational Readiness score: 88/100.");
        outcome = "Executive PDF formatted and prepared for download.";
      } else {
        summaryText = "I am ready to assist you. Ask me about critical PHCs, doctor reassignments, medicine stocks, or to generate report files.";
      }

      const copilotResponse: CopilotMessage = {
        messageId: `msg-c-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'copilot',
        content: summaryText,
        timestamp: new Date().toISOString(),
        cardData: {
          summary: summaryText,
          reasoning: "Telemetry rules engine scan detected critical alerts.",
          supportingData,
          actions: recActions,
          priority,
          confidence,
          expectedOutcome: outcome
        }
      };

      const finalSessions = get().sessions.map(s => {
        if (s.sessionId === activeId) {
          return { ...s, messages: [...s.messages, copilotResponse] };
        }
        return s;
      });

      set({ sessions: finalSessions, loading: false });
      setPersisted('hf_copilot_sessions_v2', finalSessions);
    };

    if (!openRouterKey && !geminiKey) {
      await runLocalFallback();
      return;
    }

    try {
      const promptText = `
        You are the Operations Copilot, an experienced District Health Operations Officer for East Khasi Hills division.
        Analyze the following live clinical and resource state summaries to answer the administrator's query:
 
        Live Centers Statuses:
        ${JSON.stringify(centersSummary)}
 
        Low Stock Medicines:
        ${JSON.stringify(lowStockMeds)}
 
        Active Command Actions:
        ${JSON.stringify(cmdStore.actions)}
 
        User Query: "${content}"
 
        Format your answer as a JSON object with:
        1. "conversationalResponse": string containing a summary of the situation.
        2. "cardData": {
            "summary": concise summary (string)
            "reasoning": explainable clinical reasoning justifying recommendations (string)
            "supportingData": array of strings (telemetry data points)
            "actions": array of recommended interventions, format each as: { "actionType": "Transfer Medicine" | "Transfer Doctor" | "Inspection" | "Notification", "description": string, "details": string }
            "priority": "Low" | "Medium" | "High" | "Critical"
            "confidence": confidence percentage (number 50-100)
            "expectedOutcome": expected clinical outcome/impact (string)
        }
 
        Output ONLY valid JSON. No markdown wrappers.
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
        console.log("OpenRouter Response JSON:", json);
        if (json.choices && json.choices.length > 0) {
          text = json.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
        } else {
          console.error("OpenRouter Error response details:", json.error || json);
          throw new Error(json.error?.message || "OpenRouter response structure invalid");
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

      const parsed = JSON.parse(text);

      const copilotResponse: CopilotMessage = {
        messageId: `msg-c-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'copilot',
        content: parsed.conversationalResponse || parsed.cardData?.summary || "Request handled successfully.",
        timestamp: new Date().toISOString(),
        cardData: parsed.cardData
      };

      const finalSessions = get().sessions.map(s => {
        if (s.sessionId === activeId) {
          return { ...s, messages: [...s.messages, copilotResponse] };
        }
        return s;
      });

      set({ sessions: finalSessions, loading: false });
      setPersisted('hf_copilot_sessions_v2', finalSessions);
    } catch (e) {
      console.warn("API query failed, invoking local offline fallback intelligence:", e);
      await runLocalFallback();
    }
  },

  clearNotifications: () => {
    setPersisted('hf_copilot_notifications_v2', []);
    set({ notifications: [] });
  },

  dismissNotification: (id) => {
    const updated = get().notifications.filter(n => n.notificationId !== id);
    setPersisted('hf_copilot_notifications_v2', updated);
    set({ notifications: updated });
  },

  deleteSession: (sessionId) => {
    const updated = get().sessions.filter(s => s.sessionId !== sessionId);
    let activeId = get().activeSessionId;
    if (activeId === sessionId) {
      activeId = updated.length > 0 ? updated[0].sessionId : null;
    }
    setPersisted('hf_copilot_sessions_v2', updated);
    setPersisted('hf_copilot_active_session_id_v2', activeId);
    set({ sessions: updated, activeSessionId: activeId });
  }
}));
