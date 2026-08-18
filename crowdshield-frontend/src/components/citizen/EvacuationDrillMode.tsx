import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  RotateCcw,
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  Volume2,
  VolumeX,
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
  Navigation,
} from 'lucide-react';
import api from '../../utils/api';
import { SupportedLanguage } from '../../types';
import { tc } from '../../i18n/citizen';
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
  language?: SupportedLanguage;
}
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
export const EvacuationDrillMode: React.FC<EvacuationDrillModeProps> = ({
  userLocation,
  venueId = 'soa-iter-01',
  isScenarioActive = false,
  language = 'en',
}) => {
  const [dynamicSteps, setDynamicSteps] = useState<EvacuationStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [drillCompleted, setDrillCompleted] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isVoiceGuidanceActive, setIsVoiceGuidanceActive] = useState(true);
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
  const progressPercent = totalSteps > 0
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
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAutoSimulating && !drillCompleted) {
      timer = setInterval(() => setElapsedSeconds((prev) => prev + 1), 1000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [isAutoSimulating, drillCompleted]);

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
              const speak = new SpeechSynthesisUtterance('Evacuation drill complete. You have reached the safe exit.');
              window.speechSynthesis.speak(speak);
            }
            return prev;
          }
        });
      }, 4000);
    }
    return () => { if (simInterval) clearInterval(simInterval); };
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
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200/80 shadow-sm gap-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Loader2 className="w-7 h-7 text-indigo-500 animate-spin" />
        </div>
        <div className="text-center">
          <span className="font-heading font-bold text-sm text-slate-800 block">
            {tc('computingOptimalRoute', language)}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {tc('analyzingTelemetry', language)}
          </span>
        </div>
      </div>
    );
  }
  if (dynamicSteps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-red-50 border border-red-100 rounded-3xl gap-4">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center shadow-inner">
          <ShieldAlert className="w-7 h-7 text-red-500" />
        </div>
        <div className="text-center">
          <span className="font-heading font-bold text-sm text-slate-900 block">
            {tc('noRouteFound', language)}
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            {tc('awaitInstructions', language)}
          </span>
        </div>
      </div>
    );
  }
  // ─── MAIN RENDER ────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 font-body w-full max-w-full">
      {/* ── Header Banner ── */}
      <div
        className={`p-4 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-500 shadow-sm border ${
          isScenarioActive ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              isScenarioActive
                ? 'bg-red-500 text-white shadow-red-600/30'
                : 'bg-emerald-50 border border-emerald-100 text-emerald-600'
            }`}
          >
            <Compass className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex flex-col">
            <h2 className="font-heading font-bold text-base tracking-tight flex items-center gap-2 truncate text-slate-900">
              <span>{tc('liveEvacuationRoute', language)}</span>
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase shrink-0 tracking-wider ${
                  isScenarioActive
                    ? 'bg-red-200 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {tc('interactiveGps', language)}
              </span>
              <span className="text-[11px] text-slate-500 truncate font-medium">
                {tc('guidanceSubtitle', language)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsVoiceGuidanceActive(!isVoiceGuidanceActive)}
          className={`py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 active:scale-95 shadow-sm ${
            isVoiceGuidanceActive
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'bg-slate-50 text-slate-500 border border-slate-200 hover:text-slate-700'
          }`}
        >
          {isVoiceGuidanceActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>{isVoiceGuidanceActive ? tc('voiceOn', language) : tc('voiceOff', language)}</span>
        </button>
      </div>
      {/* ── SVG Map Visualizer ── */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 flex flex-col gap-4 border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between text-xs font-mono-num gap-2 px-1">
          <span className="flex items-center gap-1.5 font-bold text-slate-700 truncate">
            <Route className="w-4 h-4 text-indigo-500 shrink-0" />
            <span className="truncate">{tc('activeEvacuationRoute', language)}</span>
          </span>
          <span className="bg-slate-100 px-3 py-1 rounded-full text-[10px] text-slate-600 font-bold tracking-wide">
            {totalSteps} {tc('waypoints', language)}
          </span>
        </div>

        {/* SVG Map Canvas */}
        <div className="relative w-full h-64 sm:h-72 rounded-2xl border border-slate-200/80 overflow-hidden select-none bg-[#FAFAF7]">
          {/* Subtle Dot Grid Background */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#94A3B8 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />
          {/* Route path SVG */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818CF8" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
            </defs>
            <path
              d={svgPathD}
              stroke="url(#routeGradient)"
              strokeWidth="1.2"
              strokeDasharray="2 1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
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
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    isPassed
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : isCurrent
                      ? 'bg-indigo-600 text-white ring-4 ring-indigo-500/20 shadow-xl shadow-indigo-500/40 scale-110'
                      : 'bg-white text-slate-500 border-2 border-slate-300 hover:bg-slate-50 hover:scale-105'
                  }`}
                >
                  {isPassed ? <CheckCircle2 className="w-5 h-5" /> : step.stepNumber}
                </div>
                <span className="mt-1.5 text-[9px] sm:text-[10px] font-bold text-slate-800 bg-white/80 backdrop-blur-sm px-2 py-0.5 rounded-md shadow-sm whitespace-nowrap border border-white/50">
                  {step.landmark}
                </span>
              </div>
            );
          })}
          {/* Glowing Blue dot tracker */}
          {!drillCompleted && currentStep && (
            <div
              style={{ left: `${currentStep.xPercent}%`, top: `${currentStep.yPercent}%` }}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out pointer-events-none z-20"
            >
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-indigo-400 opacity-30" />
                <div className="w-6 h-6 rounded-full bg-indigo-500 border-2 border-white shadow-lg shadow-indigo-500/40 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
              </div>
            </div>
          )}
        </div>
        {/* HUD Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: tc('remaining', language), value: drillCompleted ? '0m' : `${remainingDistance}m`, icon: <MapPin className="w-3.5 h-3.5" />, color: 'text-slate-800', bg: 'bg-slate-50' },
            { label: tc('elapsed', language), value: formatTime(elapsedSeconds), icon: <Timer className="w-3.5 h-3.5" />, color: 'text-emerald-700', bg: 'bg-emerald-50/50' },
            { label: tc('pace', language), value: '1.2 m/s', icon: <Gauge className="w-3.5 h-3.5" />, color: 'text-indigo-700', bg: 'bg-indigo-50/50' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.bg} border border-slate-100 rounded-2xl p-3 flex flex-col justify-center items-center gap-1 shadow-sm`}>
              <span className="text-[10px] text-slate-500 font-mono-num uppercase tracking-wider flex items-center gap-1 font-semibold">
                {stat.icon} {stat.label}
              </span>
              <span className={`text-sm sm:text-base font-bold font-mono-num tracking-tight ${stat.color}`}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* ── Progress Bar ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-600">{tc('evacuationProgress', language)}</span>
          <span className="font-mono-num text-indigo-600">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
      {/* ── Navigation / Completion Card  ── */}
      <AnimatePresence mode="wait">
        {drillCompleted ? (
          <motion.div
            key="completed"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center gap-5 bg-emerald-50 border-2 border-emerald-100 shadow-sm"
          >
            <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-xl shadow-emerald-500/30">
              <Award className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-heading font-black text-xl text-emerald-900 tracking-tight">{tc('evacuationCompleted', language)}</h3>
              <p className="text-sm text-emerald-700/90 mt-2 max-w-sm leading-relaxed">
                {tc('navigatedOptimalRoute', language)}{' '}
                <strong className="text-emerald-900 font-mono-num bg-emerald-100/50 px-1 rounded">{formatTime(elapsedSeconds)}</strong>.
              </p>
            </div>
            <div className="w-full bg-white rounded-2xl p-4 flex items-center justify-around text-xs font-mono-num gap-2 shadow-sm border border-emerald-100 mt-2">
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{tc('rating', language)}</span>
                <strong className="text-emerald-600 text-base">A+ OPTIMAL</strong>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div className="text-center">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{tc('waypoints', language)}</span>
                <strong className="text-slate-800 text-base">{totalSteps} {tc('nodes', language)}</strong>
              </div>
            </div> 
            <button
              onClick={handleResetDrill}
              className="w-full py-4 mt-2 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all border border-slate-200 shadow-sm"
            >
              <RotateCcw className="w-4 h-4 text-emerald-500" />
              <span>{tc('restartSimulation', language)}</span>
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={`step-${currentStepIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl p-5 flex flex-col gap-4 bg-white border border-slate-200/80 shadow-md relative overflow-hidden"
          >
            {/* Nav Accent Line */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
            
            <div className="flex items-center justify-between pl-2">
              <span className="text-xs font-bold font-mono-num text-indigo-600 uppercase tracking-wider flex items-center gap-2 bg-indigo-50 px-2.5 py-1 rounded-md">
                <Navigation className="w-3.5 h-3.5" />
                {tc('stepLabel', language)} {currentStep.stepNumber} / {totalSteps}
              </span>
              <span className="text-[11px] text-slate-500 font-mono-num font-semibold bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                ~{currentStep.distanceMeter}m {tc('ahead', language)}
              </span>
            </div>
            <div className="pl-2">
              <h3 className="font-heading font-black text-xl sm:text-2xl text-slate-900 flex items-start gap-2.5 tracking-tight leading-tight">
                <ArrowUpRight className="w-7 h-7 text-indigo-500 shrink-0 mt-0.5" />
                <span>{currentStep.title}</span>
              </h3>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 font-medium">
                {currentStep.instruction}
              </p>
            </div>
            {/* Huge Mobile-Friendly Navigation Controls */}
            <div className="flex items-center gap-2.5 pt-2 pl-2">
              <button
                onClick={handlePrevStep}
                disabled={currentStepIndex === 0}
                className={`p-3.5 sm:px-5 rounded-2xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  currentStepIndex === 0
                    ? 'opacity-40 bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-200'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 cursor-pointer active:scale-95'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {isAutoSimulating ? (
                <button
                  onClick={handlePauseDrill}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/30 active:scale-[0.98]"
                >
                  <Pause className="w-5 h-5" />
                  <span>{tc('pauseBtn', language)}</span>
                </button>
              ) : (
                <button
                  onClick={handleStartDrill}
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-[0.98]"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{tc('startSimulation', language)}</span>
                </button>
              )}
              <button
                onClick={handleNextStep}
                className="py-3.5 px-4 sm:px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg active:scale-95"
              >
                <span>{tc('nextBtn', language)}</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="bg-white rounded-2xl p-4 flex items-start gap-3 text-xs border border-slate-200/80 shadow-sm mt-1">
        <div className="p-1.5 bg-indigo-50 rounded-lg shrink-0">
          <Info className="w-4 h-4 text-indigo-600" />
        </div>
        <div className="text-[11px] sm:text-xs leading-relaxed text-slate-600 font-medium pt-0.5">
          {tc('safetyTip', language)}
        </div>
      </div>
    </div>
  );
};