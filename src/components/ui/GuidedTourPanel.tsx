import React from 'react';
import { useDemoStore } from '../../store/demoStore';
import { Sparkles, ChevronLeft, ChevronRight, X, Play, RefreshCw, EyeOff, Eye } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface TourStepDetails {
  title: string;
  instructions: string;
  actionHint: string;
}

const TOUR_STEPS: Record<number, TourStepDetails> = {
  1: {
    title: "Step 1: Role Authentication",
    instructions: "Ensure you are authenticated as the District Health Administrator to access all high-level widgets.",
    actionHint: "Look at the profile bar at the top or verify login panel credentials."
  },
  2: {
    title: "Step 2: Operations Command Center",
    instructions: "Examine the central operations dashboard showing district readiness ratings, beds, and attendance.",
    actionHint: "Go to `/` (District Command Center) to check today's status."
  },
  3: {
    title: "Step 3: AI Health Center Risk Scores",
    instructions: "Highlight the 0-100 Risk ratings. Notice Mawphlang PHC is ranked at Critical Risk (Red).",
    actionHint: "Select Mawphlang PHC on the priority ranker or click its marker on the map."
  },
  4: {
    title: "Step 4: Medicine Stock Registries",
    instructions: "Navigate to the Medicine Inventory registries showing real-time stocks across the clinics network.",
    actionHint: "Click 'Medicine Inventory' in the sidebar or navigate to `/medicine`."
  },
  5: {
    title: "Step 5: AI Stockout Predictions",
    instructions: "Review the safety thresholds and days-remaining stockout calculators for critical drugs.",
    actionHint: "Inspect the predicted stockout date columns and the AI evaluation card."
  },
  6: {
    title: "Step 6: Smart Reallocation proposal",
    instructions: "Showcase the smart transfer plans reallocating medicine boxes from Sohryngkham PHC.",
    actionHint: "Examine the transfer proposals and verify source/target distance."
  },
  7: {
    title: "Step 7: AI Operations Copilot",
    instructions: "Open the floating / fullscreen conversational interface of the Operations Copilot.",
    actionHint: "Click 'AI Operations Copilot' in the sidebar or go to `/copilot`."
  },
  8: {
    title: "Step 8: Conversational Dictation",
    instructions: "Ask the Copilot: 'Which PHCs need attention today?'. Listen as it speaks the answer.",
    actionHint: "Click the mic icon to dictate or click the first suggested prompt chip."
  },
  9: {
    title: "Step 9: Executive report print",
    instructions: "Open the Executive Report modal to compile a print-ready PDF audit sheet.",
    actionHint: "Go back to `/` and click 'Executive Report' in the header panel."
  },
  10: {
    title: "Step 10: Presentation Summary",
    instructions: "End your presentation by summarizing how HealthFlow AI converts telemetry into fast interventions.",
    actionHint: "Examine the district operations readiness averages card."
  }
};

export const GuidedTourPanel: React.FC = () => {
  const { user } = useAuthStore();
  const {
    isSimulating,
    tourStep,
    tourVisible,
    startSimulation,
    stopSimulation,
    setTourStep,
    toggleTourVisible
  } = useDemoStore();

  if (!user || user.role !== 'District Health Administrator') return null;

  const currentStep = TOUR_STEPS[tourStep];

  const handleNext = () => {
    if (tourStep < 10) setTourStep(tourStep + 1);
  };

  const handleBack = () => {
    if (tourStep > 1) setTourStep(tourStep - 1);
  };

  return (
    <div className="bg-white border-2 border-brand-blue/35 rounded-apex shadow-lg p-5 space-y-4 max-w-xl mx-auto">
      <div className="flex justify-between items-center border-b pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-xl">
            <Sparkles className="h-4 w-4 text-brand-blue" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
              Google Cloud Hackathon Demo Tour Guide
            </h4>
            <span className="text-[10px] text-slate-450 block font-medium mt-0.5">East Khasi Hills Command Tour</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Simulation Toggle */}
          <button
            onClick={isSimulating ? stopSimulation : startSimulation}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase flex items-center gap-1 shadow-sm border ${
              isSimulating ? 'bg-status-critical/15 text-status-critical border-status-critical' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            {isSimulating ? (
              <>
                <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                Live Sim Active
              </>
            ) : (
              <>
                <Play className="h-2.5 w-2.5" />
                Start Simulation
              </>
            )}
          </button>

          <button
            onClick={toggleTourVisible}
            className="p-1 bg-slate-50 border hover:bg-slate-100 rounded-lg text-slate-400"
            title={tourVisible ? "Collapse Tour Details" : "Expand Tour Details"}
          >
            {tourVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {tourVisible && currentStep && (
        <div className="space-y-4 text-xs font-semibold text-slate-750">
          <div className="p-3.5 bg-[#1F5FBF]/5 border border-brand-blue/15 rounded-xl space-y-1.5">
            <span className="font-extrabold text-[#1F5FBF] block text-xs">{currentStep.title}</span>
            <p className="text-slate-655 font-medium leading-relaxed">{currentStep.instructions}</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1">
            <span className="text-[9px] uppercase font-bold text-slate-450 block">Live Presentation Action Hint</span>
            <p className="font-bold text-slate-700">{currentStep.actionHint}</p>
          </div>

          {/* Tour Navigation Controls */}
          <div className="flex justify-between items-center pt-2">
            <span className="text-[10px] text-slate-400 font-bold">Step {tourStep} of 10</span>
            <div className="flex gap-2">
              <button
                onClick={handleBack}
                disabled={tourStep === 1}
                className="px-3 py-1.5 bg-slate-100 rounded-xl font-bold hover:bg-slate-200 disabled:opacity-50 text-[11px]"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={tourStep === 10}
                className="px-3.5 py-1.5 bg-brand-blue text-white rounded-xl font-bold hover:bg-brand-darkBlue disabled:opacity-50 shadow text-[11px]"
              >
                Next Step
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
