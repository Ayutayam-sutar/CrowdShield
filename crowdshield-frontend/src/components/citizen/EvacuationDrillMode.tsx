import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
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
  ArrowUpRight,
  Loader2,
  Timer,
  Gauge,
  Route,
} from 'lucide-react';
import api from '../../utils/api';

// ─── TYPES ──────────────────────────────────────────────────

interface EvacuationStep {
  stepNumber: number;
  title: string;
  instruction: string;
  distanceMeter: number;
  landmark: string;
  hazardNote?: string;
  xPercent: number;
  yPercent: number;
  lat: number;
  lng: number;
}

interface EvacuationDrillModeProps {
  userLocation: { lat: number; lng: number };
  venueId?: string;
  isScenarioActive?: boolean;
}

// ─── UTILS ──────────────────────────────────────────────────

const calculateDistanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dp / 2) * Math.sin(dp / 2) +
    Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// ─── COMPONENT ──────────────────────────────────────────────

export const EvacuationDrillMode: React.FC<EvacuationDrillModeProps> = ({
  userLocation,
  venueId = 'soa-iter-01',
  isScenarioActive = false,
}) => {
  const [dynamicSteps, setDynamicSteps] = useState<EvacuationStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [drillCompleted, setDrillCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isVoiceGuidanceActive, setIsVoiceGuidanceActive] = useState(true);

  // Fetch live route
  useEffect(() => {
    const fetchLiveRoute = async () => {
      setIsLoading(true);
      try {
        const response = await api.post('/routing/evacuate/', {
          venue_id: venueId,
          current_lat: userLocation.lat,
          current_lng: userLocation.lng,
        });

        if (response.data && response.data.waypoints && response.data.waypoints.length > 0) {
          const waypoints = response.data.waypoints;
          const lats = waypoints.map((w: any) => w.lat);
          const lngs = waypoints.map((w: any) => w.lng);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLng = Math.min(...lngs);
          const maxLng = Math.max(...lngs);

          const steps: EvacuationStep[] = waypoints.map((wp: any, index: number) => {
            const xPercent = minLng === maxLng ? 50 : ((wp.lng - minLng) / (maxLng - minLng)) * 80 + 10;
            const yPercent = minLat === maxLat ? 50 : 100 - (((wp.lat - minLat) / (maxLat - minLat)) * 80 + 10);

            let dist = 0;
            if (index < waypoints.length - 1) {
              dist = calculateDistanceMeters(wp.lat, wp.lng, waypoints[index + 1].lat, waypoints[index + 1].lng);
            }

            let title = `Navigate to ${wp.zone_name}`;
            let instruction = `Proceed safely towards ${wp.zone_name}.`;
            if (index === 0) {
              title = `Depart ${wp.zone_name}`;
              instruction = `Exit your current location at ${wp.zone_name} immediately.`;
            } else if (index === waypoints.length - 1) {
              title = `Reach Safe Exit`;
              instruction = `Pass through ${wp.zone_name} to successfully evacuate.`;
            }

            return {
              stepNumber: index + 1,
              title,
              instruction,
              distanceMeter: dist,
              landmark: wp.zone_name,
              xPercent,
              yPercent,
              lat: wp.lat,
              lng: wp.lng,
            };
          });

          setDynamicSteps(steps);
        }
      } catch (err) {
        console.error('Failed to fetch live drill route', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveRoute();
  }, [userLocation, venueId]);

  const currentStep = dynamicSteps[currentStepIndex];
  const totalSteps = dynamicSteps.length;
  const progressPercent =
    totalSteps > 0
      ? Math.round(((currentStepIndex + (drillCompleted ? 1 : 0)) / totalSteps) * 100)
      : 0;
  const remainingDistance = dynamicSteps
    .slice(currentStepIndex)
    .reduce((acc, step) => acc + step.distanceMeter, 0);

  const svgPathD = useMemo(() => {
    if (dynamicSteps.length < 2) return '';
    return dynamicSteps
      .map((step, idx) => `${idx === 0 ? 'M' : 'L'} ${step.xPercent} ${step.yPercent}`)
      .join(' ');
  }, [dynamicSteps]);

  // Timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAutoSimulating && !drillCompleted) {
      timer = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoSimulating, drillCompleted]);

  // Auto-advance simulation
  useEffect(() => {
    let simInterval: NodeJS.Timeout | null = null;
    if (isAutoSimulating && !drillCompleted && dynamicSteps.length > 0) {
      simInterval = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev < totalSteps - 1) {
            announceStepVoice(dynamicSteps[prev + 1]);
            return prev + 1;
          } else {
            setDrillCompleted(true);
            setIsAutoSimulating(false);
            if ('speechSynthesis' in window && isVoiceGuidanceActive) {
              const speak = new SpeechSynthesisUtterance(
                'Evacuation drill complete. You have reached the safe exit.'
              );
              window.speechSynthesis.speak(speak);
            }
            return prev;
          }
        });
      }, 4000);
    }
    return () => {
      if (simInterval) clearInterval(simInterval);
    };
  }, [isAutoSimulating, drillCompleted, totalSteps, isVoiceGuidanceActive, dynamicSteps]);

  const announceStepVoice = (step: EvacuationStep) => {
    if (!isVoiceGuidanceActive || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const text = `Step ${step.stepNumber}: ${step.title}. ${step.instruction}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const handleStartDrill = () => {
    if (dynamicSteps.length === 0) return;
    setCurrentStepIndex(0);
    setDrillCompleted(false);
    setElapsedSeconds(0);
    setIsAutoSimulating(true);
    announceStepVoice(dynamicSteps[0]);
  };

  const handlePauseDrill = () => setIsAutoSimulating(false);

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
      announceStepVoice(dynamicSteps[nextIdx]);
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

  // ─── LOADING STATE ──────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 app-card rounded-2xl gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
        <span className="font-heading font-bold text-sm text-slate-700">
          Computing Safe Evacuation Path...
        </span>
        <span className="text-[11px] text-slate-400 font-mono-num">
          Analyzing campus telemetry data
        </span>
      </div>
    );
  }

  // ─── ERROR STATE ────────────────────────────────────────

  if (dynamicSteps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 app-card-danger rounded-2xl gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
          <ShieldAlert className="w-6 h-6 text-red-500" />
        </div>
        <span className="font-heading font-bold text-sm text-slate-900">
          No valid route found
        </span>
        <span className="text-[11px] text-slate-500 font-mono-num">
          Await further instructions from command
        </span>
      </div>
    );
  }

  // ─── MAIN RENDER ────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 font-body w-full max-w-full">
      {/* ── Header Banner ── */}
      <div
        className={`p-4 rounded-2xl flex items-center justify-between gap-3 transition-colors duration-500 ${
          isScenarioActive ? 'app-card-danger' : 'app-card'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isScenarioActive
                ? 'bg-red-100 border border-red-200'
                : 'bg-emerald-50 border border-emerald-100'
            }`}
          >
            <Compass className={`w-5 h-5 ${isScenarioActive ? 'text-red-500' : 'text-emerald-600'}`} />
          </div>
          <div className="min-w-0 flex flex-col">
            <h2 className={`font-heading font-bold text-sm sm:text-base tracking-tight flex items-center gap-2 truncate ${isScenarioActive ? 'text-slate-900' : 'text-slate-900'}`}>
              <span>Live Evacuation Route</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono-num font-bold uppercase shrink-0 ${
                  isScenarioActive
                    ? 'bg-red-100 text-red-600 border border-red-200'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                }`}
              >
                Interactive GPS
              </span>
            </h2>
            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate font-mono-num">
              Turn-by-turn guidance · Real-time crowd data
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsVoiceGuidanceActive(!isVoiceGuidanceActive)}
          className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 ${
            isVoiceGuidanceActive
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
              : 'bg-slate-50 text-slate-400 border border-slate-100 hover:text-slate-600'
          }`}
        >
          <Volume2 className="w-4 h-4" />
          <span className="hidden sm:inline">{isVoiceGuidanceActive ? 'Voice ON' : 'Voice OFF'}</span>
        </button>
      </div>

      {/* ── SVG Map Visualizer ── */}
      <div className="app-card rounded-2xl p-4 flex flex-col gap-3 relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono-num gap-2">
          <span className="flex items-center gap-1.5 font-bold text-indigo-500 truncate">
            <Route className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="truncate">Active Evacuation Route</span>
          </span>
          <span className="bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full text-[10px] text-slate-500 shrink-0">
            {totalSteps} Waypoints
          </span>
        </div>

        {/* SVG Map Canvas */}
        <div className="relative w-full h-56 sm:h-64 rounded-xl border border-slate-200 overflow-hidden select-none bg-slate-50">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(rgba(99,102,241,0.5) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />

          {/* Route path SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="routeGradientLight" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
            <path
              d={svgPathD}
              stroke="url(#routeGradientLight)"
              strokeWidth="0.8"
              strokeDasharray="2 1"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.8"
            />
          </svg>

          {/* Step dots */}
          {dynamicSteps.map((step, idx) => {
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
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isPassed
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : isCurrent
                      ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20 shadow-lg shadow-indigo-500/30'
                      : 'bg-white text-slate-400 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {isPassed ? <CheckCircle2 className="w-4 h-4" /> : step.stepNumber}
                </div>
                <span className="mt-1 text-[8px] sm:text-[9px] font-bold text-slate-700 bg-white/90 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap border border-slate-200">
                  {step.landmark}
                </span>
              </div>
            );
          })}

          {/* Blue dot tracker */}
          {!drillCompleted && currentStep && (
            <div
              style={{ left: `${currentStep.xPercent}%`, top: `${currentStep.yPercent}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out pointer-events-none z-20"
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-indigo-400 opacity-40" />
                <div className="w-5 h-5 rounded-full bg-indigo-500 border-2 border-white shadow-md shadow-indigo-500/30 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* HUD Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            {
              label: 'Remaining',
              value: drillCompleted ? '0m' : `${remainingDistance}m`,
              icon: <MapPin className="w-3 h-3" />,
              color: 'text-slate-800',
            },
            {
              label: 'Elapsed',
              value: formatTime(elapsedSeconds),
              icon: <Timer className="w-3 h-3" />,
              color: 'text-emerald-600',
            },
            {
              label: 'Pace',
              value: '1.2 m/s',
              icon: <Gauge className="w-3 h-3" />,
              color: 'text-indigo-600',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 flex flex-col justify-center items-center gap-1"
            >
              <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono-num uppercase tracking-wider flex items-center gap-1">
                {stat.icon} {stat.label}
              </span>
              <span className={`text-xs sm:text-sm font-bold font-mono-num ${stat.color}`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <div className="app-card rounded-2xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-500">Evacuation Progress</span>
          <span className="font-mono-num text-indigo-500">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Instruction / Completion Card ── */}
      {drillCompleted ? (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="rounded-2xl p-6 flex flex-col items-center text-center gap-4 bg-emerald-50 border-2 border-emerald-100"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-heading font-bold text-lg text-emerald-900">EVACUATION COMPLETED!</h3>
            <p className="text-xs text-emerald-700 mt-1.5 max-w-xs leading-relaxed">
              You navigated the optimal safe route in{' '}
              <strong className="text-emerald-900 font-mono-num">{formatTime(elapsedSeconds)}</strong>.
            </p>
          </div>

          <div className="w-full bg-white rounded-xl p-3 flex items-center justify-around text-xs font-mono-num gap-2 shadow-sm border border-emerald-100">
            <div className="text-center">
              <span className="block text-[10px] text-slate-400">RATING</span>
              <strong className="text-emerald-600 text-sm">A+ OPTIMAL</strong>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center">
              <span className="block text-[10px] text-slate-400">WAYPOINTS</span>
              <strong className="text-slate-800 text-sm">{totalSteps} Nodes</strong>
            </div>
          </div>

          <button
            onClick={handleResetDrill}
            className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] transition-all border border-slate-200 shadow-sm"
          >
            <RotateCcw className="w-4 h-4 text-emerald-500" />
            <span>Restart Simulation</span>
          </button>
        </motion.div>
      ) : (
        <div className="rounded-2xl p-4 flex flex-col gap-3 app-card border-l-2 border-l-indigo-500">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-bold font-mono-num text-indigo-600 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
              Step {currentStep.stepNumber} of {totalSteps}
            </span>
            <span className="text-[10px] text-slate-400 font-mono-num">~{currentStep.distanceMeter}m ahead</span>
          </div>

          <div>
            <h3 className="font-heading font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-indigo-500 shrink-0" />
              <span>{currentStep.title}</span>
            </h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
              {currentStep.instruction}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                currentStepIndex === 0
                  ? 'opacity-50 bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer active:scale-95 shadow-sm'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {isAutoSimulating ? (
              <button
                onClick={handlePauseDrill}
                className="flex-1 py-2.5 sm:py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-[0.99]"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handleStartDrill}
                className="flex-1 py-2.5 sm:py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-indigo-500/20 active:scale-[0.99]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Simulation</span>
              </button>
            )}

            <button
              onClick={handleNextStep}
              className="py-2.5 px-3 sm:px-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Pro Tip ── */}
      <div className="bg-white rounded-xl p-3 flex items-start gap-2.5 text-xs border border-slate-200 shadow-sm">
        <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <div className="text-[11px] leading-relaxed text-slate-600">
          <strong className="text-slate-900">Safety Tip:</strong> Practice this drill before campus events. Follow
          computed waypoints and remain calm during real evacuations.
        </div>
      </div>
    </div>
  );
};