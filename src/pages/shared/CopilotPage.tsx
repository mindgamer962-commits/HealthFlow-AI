import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Printer,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  UserCheck,
  Building2,
  ArrowRightLeft,
  Loader2,
  FlaskConical,
  Activity,
  FileText
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCopilotStore } from '../../store/copilotStore';
import { useCommandStore } from '../../store/commandStore';

export const CopilotPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    sessions,
    activeSessionId,
    notifications,
    language,
    loading,
    startNewSession,
    selectSession,
    setLanguage,
    sendMessage,
    clearNotifications,
    dismissNotification,
    deleteSession
  } = useCopilotStore();

  const { approveAction, assignOfficer, ignoreAction } = useCommandStore();

  const [inputVal, setInputVal] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);
  
  // Officer assignment form states inside chat
  const [assigningActionId, setAssigningActionId] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions, activeSessionId, loading]);

  // Load Speech Recognition API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = language;

      rec.onresult = (e: any) => {
        const text = e.results[0][0].transcript;
        setInputVal(text);
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error("Speech Recognition Error: ", e);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [language]);

  // Trigger Speech Synthesis for Copilot Answers
  const speakText = (text: string) => {
    if (!speechEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // stop past speeches
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    window.speechSynthesis.speak(utterance);
  };

  const activeSession = useMemo(() => {
    return sessions.find(s => s.sessionId === activeSessionId) || sessions[0] || null;
  }, [sessions, activeSessionId]);

  // Trigger speech synthesis when new copilot message lands
  useEffect(() => {
    if (activeSession && activeSession.messages.length > 0) {
      const last = activeSession.messages[activeSession.messages.length - 1];
      if (last.sender === 'copilot') {
        speakText(last.content);
      }
    }
  }, [activeSession?.messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputVal.trim()) return;

    const query = inputVal;
    setInputVal('');
    await sendMessage(query);
  };

  const handleMicToggle = () => {
    if (!recognitionRef.current) {
      alert("Web Speech recognition is not supported in this browser version.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    }
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s =>
      s.title.toLowerCase().includes(historySearch.toLowerCase()) ||
      s.messages.some(m => m.content.toLowerCase().includes(historySearch.toLowerCase()))
    );
  }, [sessions, historySearch]);

  const handleApproveAction = async (actionId: string) => {
    try {
      await approveAction(actionId);
      triggerSpeech("Action approved and executed.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignOfficer = async (actionId: string, name: string) => {
    if (!name) return;
    try {
      await assignOfficer(actionId, name);
      setAssigningActionId(null);
      setOfficerName('');
      triggerSpeech("Officer assigned successfully.");
    } catch (e) {
      console.error(e);
    }
  };

  const triggerSpeech = (msg: string) => {
    if (speechEnabled && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg));
    }
  };

  const suggestedPrompts = [
    "Which PHCs require immediate attention today?",
    "Which medicines are likely to run out this week?",
    "Which doctors should be reassigned?",
    "Show all high-risk PHCs on the map."
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-8rem)]">
      {/* LEFT COLUMN: History, Notifications, Voice preferences */}
      <div className="lg:col-span-1 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-4 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          {/* Header Controls */}
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-brand-blue" />
              Copilot Sessions
            </h3>
            <button
              onClick={startNewSession}
              className="p-1.5 bg-slate-50 border hover:bg-slate-100 rounded-lg text-brand-blue"
              title="New Session"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Voice Engine controls */}
          <div className="p-3 bg-slate-50 border rounded-xl space-y-2.5 text-xs font-semibold">
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider">Voice Engine Settings</span>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Audio Speech response:</span>
              <button
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className={`p-1.5 rounded-lg border ${
                  speechEnabled ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-red-50 border-red-200 text-red-750'
                }`}
              >
                {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] text-slate-450 uppercase block">Speech Language</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value as any)}
                className="w-full px-2 py-1.5 border rounded-lg bg-white focus:outline-none"
              >
                <option value="en-US">English (India)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="gu-IN">Gujarati (ગુજરાતી)</option>
              </select>
            </div>
          </div>

          {/* History Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search chat sessions..."
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border rounded-xl bg-slate-50 focus:bg-white focus:outline-none"
            />
          </div>

          {/* Session List */}
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {filteredSessions.map(sess => (
              <div
                key={sess.sessionId}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold ${
                  activeSessionId === sess.sessionId ? 'border-brand-blue bg-[#1F5FBF]/5 text-brand-blue' : 'border-slate-105 hover:bg-slate-50'
                }`}
              >
                <button
                  onClick={() => selectSession(sess.sessionId)}
                  className="flex-1 text-left truncate mr-2"
                >
                  {sess.title}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Are you sure you want to delete this chat session?")) {
                      deleteSession(sess.sessionId);
                    }
                  }}
                  className="text-slate-400 hover:text-red-650 transition-colors duration-150 p-1 rounded hover:bg-slate-100"
                  title="Delete Session"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Proactive notifications alert list */}
        {notifications.length > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-2 mt-4">
            <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
              <span>Proactive AI Alerts</span>
              <button onClick={clearNotifications} className="hover:underline">Clear all</button>
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto">
              {notifications.map(not => (
                <div key={not.notificationId} className="p-2.5 bg-red-50/80 border border-red-150 rounded-xl text-[10.5px] font-semibold text-red-950 flex justify-between items-start gap-2">
                  <div className="space-y-0.5">
                    <span className="font-extrabold flex items-center gap-1"><ShieldAlert className="h-3 w-3 text-status-critical" /> {not.title}</span>
                    <p className="text-slate-500 font-medium leading-normal">{not.message}</p>
                  </div>
                  <button onClick={() => dismissNotification(not.notificationId)} className="text-red-650 hover:text-red-800">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Active Conversational Pane */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-apex shadow-apex-sm p-4 flex flex-col justify-between h-full">
        {/* Messages view pane */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
          {activeSession?.messages.map((msg, idx) => {
            const isUser = msg.sender === 'user';
            return (
              <div key={msg.messageId || idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm text-xs font-semibold leading-relaxed space-y-3 ${
                  isUser ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 border border-slate-200 text-slate-700'
                }`}>
                  <p>{msg.content}</p>

                  {/* Gemini Card analytics wrapper */}
                  {msg.cardData && (
                    <div className="border-t border-slate-200 pt-3 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded font-extrabold text-[8px] uppercase ${
                          msg.cardData.priority === 'Critical' ? 'bg-red-50 text-red-650 border border-red-200 animate-pulse' : 'bg-slate-100 text-slate-500'
                        }`}>
                          Priority: {msg.cardData.priority}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[8px] uppercase">
                          {msg.cardData.confidence}% Confidence
                        </span>
                      </div>

                      {msg.cardData.supportingData.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Supporting Data</span>
                          <div className="space-y-1">
                            {msg.cardData.supportingData.map((d, i) => (
                              <div key={i} className="flex gap-1.5 items-start text-[11px] font-medium text-slate-600">
                                <span>•</span>
                                <span>{d}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {msg.cardData.actions.length > 0 && (
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">AI Recommended Interventions</span>
                          <div className="space-y-2.5">
                            {msg.cardData.actions.map((act, i) => (
                              <div key={i} className="p-3 bg-white border rounded-xl space-y-2 flex flex-col justify-between sm:flex-row sm:items-center sm:gap-4">
                                <div className="space-y-0.5 text-[11.5px]">
                                  <span className="font-extrabold text-slate-800 block">{act.description}</span>
                                  <span className="text-slate-450 block text-[10px] font-medium">{act.details}</span>
                                </div>
                                <div className="flex gap-1.5 shrink-0 pt-1.5 sm:pt-0">
                                  <button
                                    onClick={() => handleApproveAction(msg.messageId)}
                                    className="px-2.5 py-1.5 bg-brand-blue hover:bg-brand-darkBlue text-white rounded-lg font-bold text-[9px] shadow"
                                  >
                                    Approve & Execute
                                  </button>
                                  <button
                                    onClick={() => setAssigningActionId(msg.messageId)}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-lg font-bold text-[9px] border"
                                  >
                                    Assign Officer
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Officer assignment inline card */}
                      {assigningActionId === msg.messageId && (
                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                          <span className="text-[9px] font-bold text-slate-500 uppercase block">Assign Officer Roster</span>
                          <div className="flex gap-1.5 items-center">
                            <input
                              type="text"
                              placeholder="Officer Full Name"
                              value={officerName}
                              onChange={e => setOfficerName(e.target.value)}
                              className="px-2.5 py-1 border rounded bg-slate-50 text-[10.5px] focus:outline-none flex-1"
                            />
                            <button
                              onClick={() => handleAssignOfficer(msg.messageId, officerName)}
                              className="px-3 py-1 bg-brand-blue text-white rounded text-[10px] font-bold"
                            >
                              Assign
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="text-[10px] text-slate-450 border-t border-slate-100 pt-2 flex justify-between font-medium">
                        <span>Expected outcome: <strong>{msg.cardData.expectedOutcome}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex justify-start">
              <div className="p-4 bg-slate-50 border rounded-2xl flex items-center gap-2 text-xs font-bold text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand-blue" />
                <span>Ops Copilot is scanning telemetry logs...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input area controls */}
        <div className="space-y-3.5 border-t border-slate-200 pt-4 bg-white">
          {/* Suggested prompts list */}
          {(!activeSession || activeSession.messages.length === 0) && (
            <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
              {suggestedPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputVal(p)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-655 font-semibold text-[10px] rounded-xl whitespace-nowrap transition"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Form inputs */}
          <form onSubmit={handleSend} className="flex gap-2 items-center">
            <button
              type="button"
              onClick={handleMicToggle}
              className={`p-3.5 rounded-2xl flex items-center justify-center shadow transition shrink-0 ${
                isListening ? 'bg-status-critical text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title="Dictate Question (STT)"
            >
              {isListening ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
            </button>

            <input
              type="text"
              placeholder="Ask Ops Copilot about clinical loads, reallocations, or stockouts..."
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              className="flex-1 px-4.5 py-3 text-xs border rounded-2xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/15"
            />

            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="p-3.5 bg-[#1F5FBF] hover:bg-brand-darkBlue text-white rounded-2xl flex items-center justify-center shadow disabled:opacity-50 shrink-0"
            >
              <Send className="h-4.5 w-4.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CopilotPage;
