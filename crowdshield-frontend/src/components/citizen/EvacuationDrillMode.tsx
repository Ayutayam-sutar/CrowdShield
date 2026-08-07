import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  RotateCcw, 
  Play, 
  Pause, 
  ChevronRight, 
  ChevronLeft,
  Volume2, 
  ShieldAlert, 
  Award, 
  MapPin, 
  Info,
  Compass,
  ArrowUpRight
} from 'lucide-react';

interface EvacuationStep {
  stepNumber: number;
  title: string;
  instruction: string;
  distanceMeter: number;
  landmark: string;
  hazardNote?: string;
  xPercent: number; // For map positioning 0-100%
  yPercent: number;
}

const DRILL_STEPS: EvacuationStep[] = [
  {
    stepNumber: 1,
    title: 'Depart Gate 3 Area',
    instruction: 'Immediately turn left away from Gate 3 congestion and enter West Concourse Corridor.',
    distanceMeter: 50,
    landmark: 'Concourse Food Court B',
    hazardNote: 'Avoid Gate 3 turnstiles due to 92% crowd surge.',
    xPercent: 25,
    yPercent: 75,
  },
  {
    stepNumber: 2,
    title: 'Bypass Sector 7 Bottleneck',
    instruction: 'Proceed along Sector 7 Ramp B. Keep right to allow emergency responders to pass.',
    distanceMeter: 60,
    landmark: 'Ramp B - North Stairwell',
    xPercent: 50,
    yPercent: 45,
  },
  {
    stepNumber: 3,
    title: 'Reach Safe Exit - Gate 4',
    instruction: 'Pass through Emergency Unlocked Turnstiles at Gate 4 into Safe Assembly Zone North.',
    distanceMeter: 40,
    landmark: 'Emergency Gate 4 / Open Grounds',
    xPercent: 82,
    yPercent: 20,
  },
];

export const EvacuationDrillMode: React.FC = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [drillCompleted, setDrillCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isVoiceGuidanceActive, setIsVoiceGuidanceActive] = useState(true);

  const currentStep = DRILL_STEPS[currentStepIndex];
  const totalSteps = DRILL_STEPS.length;
  const progressPercent = Math.round(((currentStepIndex + (drillCompleted ? 1 : 0)) / totalSteps) * 100);

  // Remaining distance calculation
  const remainingDistance = DRILL_STEPS.slice(currentStepIndex).reduce((acc, step) => acc + step.distanceMeter, 0);

  // Timer effect during drill
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAutoSimulating && !drillCompleted) {
      timer = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoSimulating, drillCompleted]);

  // Auto Step Progression Simulation
  useEffect(() => {
    let simInterval: NodeJS.Timeout | null = null;
    if (isAutoSimulating && !drillCompleted) {
      simInterval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < totalSteps - 1) {
            announceStepVoice(DRILL_STEPS[prev + 1]);
            return prev + 1;
          } else {
            setDrillCompleted(true);
            setIsAutoSimulating(false);
            if ('speechSynthesis' in window && isVoiceGuidanceActive) {
              const speak = new SpeechSynthesisUtterance('Evacuation drill complete. You have reached Safe Assembly Zone North.');
              window.speechSynthesis.speak(speak);
            }
            return prev;
          }
        });
      }, 4000); // Progress every 4 seconds
    }
    return () => {
      if (simInterval) clearInterval(simInterval);
    };
  }, [isAutoSimulating, drillCompleted, totalSteps, isVoiceGuidanceActive]);

  const announceStepVoice = (step: EvacuationStep) => {
    if (!isVoiceGuidanceActive || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const text = `Step ${step.stepNumber}: ${step.title}. ${step.instruction}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleStartDrill = () => {
    setCurrentStepIndex(0);
    setDrillCompleted(false);
    setElapsedSeconds(0);
    setIsAutoSimulating(true);
    announceStepVoice(DRILL_STEPS[0]);
  };

  const handlePauseDrill = () => {
    setIsAutoSimulating(false);
  };

  const handleResetDrill = () => {
    setIsAutoSimulating(false);
    setCurrentStepIndex(0);
    setDrillCompleted(false);
    setElapsedSeconds(0);
  };

  const handleNextStep = () => {
    if (currentStepIndex < totalSteps - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      announceStepVoice(DRILL_STEPS[nextIdx]);
    } else {
      setDrillCompleted(true);
      setIsAutoSimulating(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
      setDrillCompleted(false);
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins}m ${remaining < 10 ? '0' : ''}${remaining}s`;
  };

  return (
    <div className="flex flex-col gap-3.5 sm:gap-4 font-body text-[#151726] w-full max-w-full">
      {/* Mode Header Banner */}
      <div className="bg-[#151726] text-white p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#22D3A6]/20 text-[#22D3A6] border border-[#22D3A6]/30 flex items-center justify-center font-bold font-heading shrink-0">
            <Compass className="w-5 h-5 animate-spin-slow text-[#22D3A6]" />
          </div>
          <div className="min-w-0 flex flex-col">
            <h2 className="font-heading font-bold text-xs sm:text-base tracking-tight flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">Evacuation Drill Mode</span>
              <span className="px-2 py-0.5 rounded-full bg-[#22D3A6] text-[#151726] text-[9px] sm:text-[10px] font-mono-num font-bold uppercase shrink-0">
                Interactive GPS
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-white/70 truncate">
              Simulated turn-by-turn guidance to nearest safe exit
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsVoiceGuidanceActive(!isVoiceGuidanceActive)}
          className={`p-2 sm:px-3 sm:py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 ${
            isVoiceGuidanceActive
              ? 'bg-[#2C7BE5] text-white border-[#2C7BE5] shadow-xs'
              : 'bg-white/10 text-white/70 border-white/10 hover:bg-white/20'
          }`}
          title="Toggle Voice Guidance"
        >
          <Volume2 className="w-4 h-4" />
          <span className="hidden sm:inline">{isVoiceGuidanceActive ? 'Voice ON' : 'Voice OFF'}</span>
        </button>
      </div>

      {/* Interactive Map Visualizer */}
      <div className="bg-[#151726] rounded-2xl border border-white/10 shadow-md p-3 sm:p-4 flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs text-white/80 font-mono-num gap-2">
          <span className="flex items-center gap-1.5 font-bold text-[#22D3A6] truncate">
            <MapPin className="w-4 h-4 text-[#22D3A6] shrink-0" />
            <span className="truncate">Stadium Sector 7G Safe Map</span>
          </span>
          <span className="bg-white/10 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] text-white/90 shrink-0 border border-white/10">
            Live Route: Gate 3 → Gate 4
          </span>
        </div>

        {/* Vector SVG Map Container */}
        <div className="relative w-full h-56 sm:h-64 bg-[#0D0F1A] rounded-xl border border-white/10 overflow-hidden select-none">
          {/* Map Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-15 pointer-events-none" 
            style={{
              backgroundImage: 'radial-gradient(#2C7BE5 1px, transparent 1px)',
              backgroundSize: '16px 16px'
            }}
          />

          {/* Stadium Structure Outlines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none stroke-white/20 fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Outer perimeter */}
            <rect x="5" y="5" width="90" height="90" rx="10" strokeWidth="0.8" strokeDasharray="2 2" />
            
            {/* Sector 7 Block */}
            <rect x="15" y="60" width="25" height="25" rx="3" className="fill-white/5 stroke-white/15" />
            <text x="27" y="74" fill="#A0A5BA" fontSize="3" textAnchor="middle" className="font-sans font-bold">SECTOR 7</text>

            {/* Danger Zone (Gate 3 Area) */}
            <circle cx="20" cy="80" r="8" className="fill-[#FF3B5C]/20 stroke-[#FF3B5C] animate-pulse" strokeWidth="1" />
            <text x="20" y="81" fill="#FF3B5C" fontSize="2.5" textAnchor="middle" fontWeight="bold">GATE 3 (SURGE)</text>

            {/* Safe Exit Gate 4 */}
            <rect x="75" y="10" width="18" height="18" rx="4" className="fill-[#22D3A6]/20 stroke-[#22D3A6]" strokeWidth="1.2" />
            <text x="84" y="20" fill="#22D3A6" fontSize="2.8" textAnchor="middle" fontWeight="bold">GATE 4 EXIT</text>

            {/* Safe Path Vector */}
            <path
              d="M 25 75 L 50 45 L 82 20"
              stroke="#22D3A6"
              strokeWidth="2.5"
              strokeDasharray="4 2"
              className="animate-pulse"
              strokeLinecap="round"
            />
          </svg>

          {/* Step Waypoint Markers */}
          {DRILL_STEPS.map((step, idx) => {
            const isPassed = idx < currentStepIndex || drillCompleted;
            const isCurrent = idx === currentStepIndex && !drillCompleted;

            return (
              <div
                key={step.stepNumber}
                style={{ left: `${step.xPercent}%`, top: `${step.yPercent}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer z-10"
                onClick={() => {
                  setCurrentStepIndex(idx);
                  setDrillCompleted(false);
                }}
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-md ${
                  isPassed
                    ? 'bg-[#22D3A6] text-[#151726]'
                    : isCurrent
                    ? 'bg-[#2C7BE5] text-white ring-4 ring-[#2C7BE5]/40 animate-bounce'
                    : 'bg-[#25283e] text-white/60 border border-white/20'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-4 h-4" /> : step.stepNumber}
                </div>
                <span className="mt-1 text-[9px] font-bold text-white bg-black/85 px-1.5 py-0.5 rounded backdrop-blur whitespace-nowrap shadow-xs border border-white/10">
                  {step.title}
                </span>
              </div>
            );
          })}

          {/* User Location Pulsating Dot */}
          {!drillCompleted && (
            <div
              style={{
                left: `${currentStep.xPercent}%`,
                top: `${currentStep.yPercent}%`,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out pointer-events-none z-20"
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-[#38BDF8] opacity-75" />
                <div className="w-5 h-5 rounded-full bg-[#38BDF8] border-2 border-white shadow-xl flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Real-time Distance & Time HUD */}
        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-white/60 font-mono-num uppercase tracking-wider">Remaining</span>
            <span className="text-xs sm:text-sm font-bold text-white font-mono-num truncate">
              {drillCompleted ? '0 meters' : `${remainingDistance}m`}
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-white/60 font-mono-num uppercase tracking-wider">Drill Time</span>
            <span className="text-xs sm:text-sm font-bold text-[#22D3A6] font-mono-num truncate">
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col justify-center">
            <span className="text-[9px] sm:text-[10px] text-white/60 font-mono-num uppercase tracking-wider">Exit Pace</span>
            <span className="text-xs sm:text-sm font-bold text-[#38BDF8] font-mono-num truncate">
              1.2 m/sec
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border border-[#E7E5DD] rounded-2xl p-3.5 sm:p-4 shadow-xs flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold text-[#151726]">
          <span>Evacuation Progress</span>
          <span className="font-mono-num text-[#2C7BE5]">{progressPercent}%</span>
        </div>
        <div className="w-full h-2.5 bg-[#FAFAF7] border border-[#E7E5DD] rounded-full overflow-hidden p-0.5">
          <div 
            className="h-full bg-gradient-to-r from-[#2C7BE5] via-[#38BDF8] to-[#22D3A6] rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Active Instruction Card or Drill Completed Card */}
      {drillCompleted ? (
        <div className="bg-[#22D3A6]/15 border-2 border-[#22D3A6] rounded-2xl p-5 shadow-md flex flex-col items-center text-center gap-3 animate-in zoom-in-95">
          <div className="w-12 h-12 rounded-full bg-[#22D3A6] text-[#151726] flex items-center justify-center font-bold shadow-md shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-base sm:text-lg text-[#151726]">
              EVACUATION DRILL COMPLETED!
            </h3>
            <p className="text-xs text-[#5B5F73] mt-1 max-w-xs leading-relaxed">
              You successfully navigated away from congested Gate 3 to Safe Assembly Zone Gate 4 in <strong className="text-[#151726] font-mono-num">{formatTime(elapsedSeconds)}</strong>.
            </p>
          </div>

          <div className="w-full p-3 rounded-xl bg-white border border-[#22D3A6]/40 flex items-center justify-around text-xs font-mono-num text-[#151726] gap-2">
            <div className="text-center">
              <span className="block text-[10px] text-[#5B5F73]">SAFETY RATING</span>
              <strong className="text-[#059669] text-xs sm:text-sm">A+ OPTIMAL</strong>
            </div>
            <div className="h-6 w-px bg-[#E7E5DD]" />
            <div className="text-center">
              <span className="block text-[10px] text-[#5B5F73]">TOTAL DISTANCE</span>
              <strong className="text-[#151726] text-xs sm:text-sm">150 meters</strong>
            </div>
          </div>

          <button
            onClick={handleResetDrill}
            className="w-full mt-1 py-3 bg-[#151726] hover:bg-[#25283e] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md active:scale-[0.99] transition-all"
          >
            <RotateCcw className="w-4 h-4 text-[#22D3A6]" />
            <span>Restart Evacuation Drill</span>
          </button>
        </div>
      ) : (
        <div className="bg-white border-2 border-[#2C7BE5] rounded-2xl p-4 shadow-xs flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#E7E5DD] pb-2">
            <span className="text-[11px] font-bold font-mono-num text-[#2C7BE5] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2C7BE5] animate-ping shrink-0" />
              Step {currentStep.stepNumber} of {totalSteps}
            </span>
            <span className="text-[10px] text-[#5B5F73] font-mono-num">
              ~{currentStep.distanceMeter}m ahead
            </span>
          </div>

          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-[#151726] flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-[#2C7BE5] shrink-0" />
              <span>{currentStep.title}</span>
            </h3>
            <p className="text-xs text-[#5B5F73] mt-1.5 leading-relaxed bg-[#FAFAF7] p-3 rounded-xl border border-[#E7E5DD]">
              {currentStep.instruction}
            </p>
          </div>

          {currentStep.hazardNote && (
            <div className="bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 p-2.5 rounded-xl flex items-center gap-2 text-xs text-[#151726]">
              <ShieldAlert className="w-4 h-4 text-[#FF3B5C] shrink-0" />
              <span className="text-[11px]"><strong>Warning:</strong> {currentStep.hazardNote}</span>
            </div>
          )}

          {/* Navigation Control CTAs */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                currentStepIndex === 0
                  ? 'opacity-40 bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white border-[#E7E5DD] text-[#151726] hover:bg-gray-50 cursor-pointer active:scale-95'
              }`}
              title="Previous Step"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {isAutoSimulating ? (
              <button
                onClick={handlePauseDrill}
                className="flex-1 py-2.5 sm:py-3 bg-[#FF7A45] hover:bg-[#e06332] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
              >
                <Pause className="w-4 h-4" />
                <span>Pause Simulation</span>
              </button>
            ) : (
              <button
                onClick={handleStartDrill}
                className="flex-1 py-2.5 sm:py-3 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-[0.99]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Live Auto Drill</span>
              </button>
            )}

            <button
              onClick={handleNextStep}
              className="py-2.5 px-3 sm:px-4 bg-[#151726] hover:bg-[#25283e] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.99]"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Educational Emergency Guidance Footer Tip */}
      <div className="bg-[#FAFAF7] border border-[#E7E5DD] rounded-xl p-3 flex items-start gap-2.5 text-xs text-[#5B5F73]">
        <Info className="w-4 h-4 text-[#2C7BE5] shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed">
          <strong className="text-[#151726]">Pro Safety Tip:</strong> Practice this drill before stadium exit announcements. In real crowd emergencies, follow green exit light indicators and remain calm.
        </div>
      </div>
    </div>
  );
};