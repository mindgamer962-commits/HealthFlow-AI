import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, AlertCircle, ArrowRightLeft, FileCheck2, Lightbulb } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

interface Message {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: Date;
  suggestions?: { text: string; action: string }[];
}

export const GeminiCopilotPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'gemini',
      text: `Hello ${user?.name || 'Admin'}. I am your HealthFlow AI Operations Copilot. How can I help you optimize district resources today?`,
      timestamp: new Date(),
      suggestions: [
        { text: 'Which PHCs have medicine stock-outs?', action: 'medicine_alert' },
        { text: 'Analyze doctor attendance shortages.', action: 'doctor_alert' },
        { text: 'Draft resource redistribution plan.', action: 'redistribute' }
      ]
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response based on typed or selected action
    setTimeout(() => {
      let aiText = "I've analyzed the district metrics. ";
      let suggestions: { text: string; action: string }[] = [];

      const query = textToSend.toLowerCase();

      if (query.includes('medicine') || query.includes('stock')) {
        aiText = `Based on current Firestore sync records:
- **Mawphlang PHC** has critical stock levels (<10%) for Amoxicillin and ORS.
- **Laitryngew PHC** has excess stock of Amoxicillin (120 caps) and Paracetamol (350 tabs).

**Recommendation**: Authorize a transfer request of 50 Capsules of Amoxicillin and 20 ORS sachets from Laitryngew to Mawphlang.`;
        suggestions = [{ text: 'Draft transfer order', action: 'draft_transfer_1' }];
      } else if (query.includes('doctor') || query.includes('attendance') || query.includes('present')) {
        aiText = `District attendance stands at **81%** today:
- **Mawsynram PHC** reports **0/2** doctors present (Critical).
- **Pynursla CHC** reports **2/5** doctors present (Warning, bed occupancy 93%).
- **Sohryngkham PHC** has **2/3** doctors present and excess footfall.

**Recommendation**: Temporarily delegate 1 physician from Sohryngkham PHC to Mawsynram PHC for a 2-day period.`;
        suggestions = [{ text: 'Generate doctor transfer requisition', action: 'draft_transfer_2' }];
      } else if (query.includes('redistribute') || query.includes('redistribution')) {
        aiText = `I have optimized the resource deployment layout for East Khasi Hills:
1. **Beds**: Pynursla CHC is running at 93% capacity. Cherrapunjee CHC is running at 48% with 13 beds free. Recommended: Transfer 5 foldable emergency cot beds from Cherrapunjee CHC to Pynursla CHC.
2. **Medicines**: Send Amoxicillin/ORS from Laitryngew PHC to Mawphlang PHC.
3. **Staffing**: Delegate General Physician from Sohryngkham PHC to Mawsynram PHC.`;
        suggestions = [
          { text: 'Approve all recommended transfers', action: 'approve_all' }
        ];
      } else if (query.includes('draft_transfer_1')) {
        aiText = `Drafted resource transfer request **#TR-1**:
- **Resource**: Medicines (Amoxicillin, ORS)
- **Source**: Laitryngew PHC
- **Destination**: Mawphlang PHC
- **Status**: Ready for approval.

Please click the approve button in the "Reports" or "Dashboard" tab to complete.`;
      } else {
        aiText = `I have logged your query about: "${textToSend}". Under production settings, I will parse this query using Gemini-2.0-Flash to evaluate active Firestore collections and generate optimized clinical or operational pipelines. What would you like to review next?`;
        suggestions = [
          { text: 'Check medicine inventory health', action: 'medicine_alert' },
          { text: 'Check bed occupancy capacity', action: 'bed_alert' }
        ];
      }

      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'gemini',
        text: aiText,
        timestamp: new Date(),
        suggestions
      }]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950 z-40 lg:hidden"
          />

          {/* Copilot Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-apex-lg z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-brand-blue/10 via-brand-orange/5 to-transparent">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-xl">
                  <Bot className="h-5 w-5 text-brand-blue" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    Gemini Operations Copilot
                    <Sparkles className="h-3.5 w-3.5 text-brand-orange animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                    Intelligent PHC & CHC Optimization
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-apex p-3.5 ${
                      msg.sender === 'user'
                        ? 'bg-brand-blue text-white shadow-apex-sm rounded-tr-none'
                        : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-apex-sm'
                    }`}
                  >
                    <div className="text-xs font-semibold mb-1 opacity-70 flex items-center gap-1">
                      {msg.sender === 'user' ? 'District Administrator' : 'AI Copilot'}
                    </div>
                    
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {msg.text}
                    </p>

                    {/* Suggestions */}
                    {msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-200/50 dark:border-slate-700/50 space-y-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                          <Lightbulb className="h-3 w-3 text-brand-orange" /> Suggested Actions
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.suggestions.map((sug, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(sug.action)}
                              className="text-[11px] font-medium px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-brand-blue dark:hover:border-brand-blue rounded-lg text-brand-blue transition-all-ease shadow-sm hover:shadow"
                            >
                              {sug.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 rounded-apex rounded-tl-none p-4 flex items-center space-x-2">
                    <span className="h-2 w-2 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-2 w-2 bg-brand-blue rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900"
            >
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1 focus-within:ring-2 focus-within:ring-brand-blue/30 focus-within:border-brand-blue transition-all-ease">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Gemini to draft redistribution, list shortages..."
                  className="flex-1 bg-transparent text-sm border-none focus:outline-none focus:ring-0 py-2.5 text-slate-800 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-brand-blue hover:bg-brand-darkBlue disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-lg transition-colors"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
