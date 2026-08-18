import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CitizenReport, SupportedLanguage, VenueZone, CrowdAlert, VenueInfo } from '../../types';
import { SARVAM_TRANSLATIONS } from '../../data/mockData';
import { tc } from '../../i18n/citizen';
import { EvacuationDrillMode } from './EvacuationDrillMode';
import { CitizenEvacuationMap } from './CitizenEvacuationMap';
import {
  ShieldAlert,
  MapPin,
  BellRing,
  Volume2,
  PhoneCall,
  CheckCircle2,
  Send,
  Languages,
  Video,
  Image as ImageIcon,
  X,
  LogOut,
  Compass,
  History,
  AlertTriangle,
  Navigation,
  Search,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { speakAnnouncement } from '../../utils/speech';
import { VolunteerTasksView } from './VolunteerTasksView';
import { useAuth } from '../../context/AuthContext';
import { checkGeofenceIntersections, GeofenceZone } from '../../utils/geofence';
import { wsService } from '../../services/websocket';
import api from '../../utils/api';
interface CitizenPortalViewProps {
  reports: CitizenReport[];
  onSubmitReport: (report: Omit<CitizenReport, 'id' | 'upvotes' | 'status' | 'timestamp'>) => Promise<void>;
  isScenarioActive: boolean;
  onLogout?: () => void;
  alerts?: CrowdAlert[];
  zones?: VenueZone[];
  selectedVenue?: VenueInfo | null;
  venues?: VenueInfo[];
}
const CAMPUS_ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Main Gate': { lat: 20.2512, lng: 85.8018 },
  'Administrative Block Road': { lat: 20.2503, lng: 85.8008 },
  'Central Library Roundabout': { lat: 20.2494, lng: 85.8000 },
  'Sports Complex Road': { lat: 20.2480, lng: 85.7990 },
  'EV Charging Junction (Gate 2)': { lat: 20.2472, lng: 85.7983 },
};
export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  reports,
  onSubmitReport,
  isScenarioActive,
  onLogout,
  alerts,
  zones = [],
  selectedVenue,
  venues = [],
}) => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'exit'>('feed');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');
  const [isCriticalUI, setIsCriticalUI] = useState(false);
  const [liveReports, setLiveReports] = useState<CitizenReport[]>([]);
  const [notifications, setNotifications] = useState<{ time: string; msg: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedExitZone, setSelectedExitZone] = useState<string>('');
  const [exitUserLocation, setExitUserLocation] = useState<{ lat: number; lng: number }>({ lat: 20.2494, lng: 85.8 });
  const [exitRouteTriggered, setExitRouteTriggered] = useState(false);
  const getStatusBadgeStyle = (status?: string) => {
    const upper = (status || '').toUpperCase();
    if (upper === 'RESOLVED') {
      return { label: tc('resolved', selectedLang), className: 'bg-[#67b2b9]/10 text-[#648d6a] border-[#67b2b9]/30 font-bold' };
    }
    if (upper === 'CONFIRMED' || upper === 'VERIFIED') {
      return { label: tc('confirmedBadge', selectedLang), className: 'bg-rose-50 text-rose-600 border-rose-200 font-bold' };
    }
    return { label: tc('pending', selectedLang), className: 'bg-amber-50 text-amber-600 border-amber-200 font-bold' };
  };
  const getCategoryTranslation = (cat?: string, lang: SupportedLanguage = 'en') => {
    const c = (cat || '').trim();
    if (c.toLowerCase().includes('medical') || c === 'Medical Emergency') return tc('medicalEmergencyOpt', lang);
    if (c.toLowerCase().includes('overcrowd') || c === 'Overcrowding') return tc('overcrowdingOpt', lang);
    if (c.toLowerCase().includes('hazard') || c === 'Hazard') return tc('hazardOpt', lang);
    return cat || tc('hazardOpt', lang);
  };
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const vid = selectedVenue?.id || 'soa-iter-01';
        const response = await api.get(`/incidents/?venue_id=${vid}`);
        if (response.data && Array.isArray(response.data)) {
          const formattedReports: CitizenReport[] = response.data.map((inc: any) => {
            const rawStatus = (inc.status || 'PENDING').toUpperCase();
            const displayStatus = rawStatus === 'VERIFIED' ? 'CONFIRMED' : rawStatus;
            return {
              id: String(inc.id),
              category: inc.category || 'Hazard',
              location: inc.location_name || 'Campus',
              description: inc.description || '',
              status: displayStatus as any,
              upvotes: inc.upvotes || 0,
              timestamp: new Date(inc.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              photoUrl: inc.media_type === 'image' ? inc.media_url : undefined,
              videoUrl: inc.media_type === 'video' ? inc.media_url : undefined,
            };
          });
          setLiveReports(formattedReports);
        }
      } catch (err) {
        console.error('Failed to fetch incidents:', err);
      }
    };
    fetchIncidents();
  }, [selectedVenue?.id]);
  const [reportCategory, setReportCategory] = useState<string>('Overcrowding');
  const filteredZones = zones.filter((z: any) => {
    if (!selectedVenue) return true;
    const zVid = z.venueId || z.venue_id;
    return !zVid || zVid === selectedVenue.id;
  });
  const activeCampusZones = filteredZones.length > 0 ? filteredZones : [
    { id: 'gate_1', name: 'Main Gate', center: [20.2512, 85.8018] },
    { id: 'zone_admin_block_rd', name: 'Administrative Block Road', center: [20.2503, 85.8008] },
    { id: 'zone_library_roundabout', name: 'Central Library Roundabout', center: [20.2494, 85.8] },
    { id: 'zone_sports_complex_rd', name: 'Sports Complex Road', center: [20.248, 85.799] },
    { id: 'gate_2', name: 'EV Charging Junction (Gate 2)', center: [20.2472, 85.7983] },
  ];
  const currentZoneCoords = useMemo(() => {
    const map: Record<string, { lat: number; lng: number }> = {};
    activeCampusZones.forEach((z: any) => {
      const lat = z.center ? z.center[0] : (z.center_lat || 20.2494);
      const lng = z.center ? z.center[1] : (z.center_lng || 85.8);
      map[z.name] = { lat, lng };
    });
    return map;
  }, [activeCampusZones]);
  useEffect(() => {
    if (activeCampusZones.length > 0) {
      const isCurrentZoneValid = activeCampusZones.some((z: any) => z.name === selectedExitZone);
      if (!selectedExitZone || !isCurrentZoneValid) {
        const firstZone = activeCampusZones[0];
        setSelectedExitZone(firstZone.name);
        setReportLocation(firstZone.name);
        const lat = firstZone.center ? firstZone.center[0] : ((firstZone as any).center_lat || 20.2494);
        const lng = firstZone.center ? firstZone.center[1] : ((firstZone as any).center_lng || 85.8);
        setExitUserLocation({ lat, lng });
      }
    }
  }, [activeCampusZones, selectedExitZone]);
  const [reportLocation, setReportLocation] = useState<string>('');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [geofenceWarning, setGeofenceWarning] = useState<string | null>(null);
  const [userLocation] = useState<{ lat: number; lng: number }>({ lat: 20.2494, lng: 85.8 });
  const [liveAnnouncementText, setLiveAnnouncementText] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const highestRiskZone = zones && zones.length > 0 ? [...zones].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0] : null;
  const currentZoneName = highestRiskZone?.name || activeCampusZones[2]?.name || 'Central Library Roundabout';
  const translation = SARVAM_TRANSLATIONS[selectedLang] || SARVAM_TRANSLATIONS.en;
  const [routeWaypoints, setRouteWaypoints] = useState<string[]>([]);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  useEffect(() => {
    const fetchRouteInfo = async () => {
      if (!isScenarioActive) { setRouteWaypoints([]); return; }
      setIsRouteLoading(true);
      try {
        const response = await api.post('/routing/evacuate/', {
          venue_id: selectedVenue?.id || 'soa-iter-01',
          current_lat: exitUserLocation.lat,
          current_lng: exitUserLocation.lng,
        });
        if (response.data && response.data.waypoints) {
          const names = response.data.waypoints.map((wp: any) => wp.zone_name);
          setRouteWaypoints(names);
        }
      } catch (err) {
        console.error('Error fetching evacuation route waypoints for announcement:', err);
      } finally {
        setIsRouteLoading(false);
      }
    };
    fetchRouteInfo();
  }, [isScenarioActive, exitUserLocation]);
  const getDynamicEvacuationText = () => {
    const startZone = selectedExitZone || 'your location';
    if (routeWaypoints.length < 2) {
      if (selectedLang === 'hi') return `कृपया ध्यान दें! शिक्षा ओ अनुसंधान विश्वविद्यालय परिसर में भगदड़ की आशंका है। कृपया निकटतम सुरक्षित निकास की ओर शांतिपूर्वक आगे बढ़ें।`;
      if (selectedLang === 'od') return `ଧ୍ୟାନ ଦିଅନ୍ତୁ! ଭିଡ଼ ବିପଦ ଚିହ୍ନଟ ହୋଇଛି। ଦୟାକରି ଶୀଘ୍ର ନିକଟସ୍ଥ ପ୍ରସ୍ଥାନ ଦ୍ୱାରକୁ ଯାଆନ୍ତୁ।`;
      if (selectedLang === 'bn') return `বিশেষ সতর্কবার্তা! ভিড় ও হুড়োহুড়ি এড়াতে অনুগ্রহ করে নিকটতম নিরাপদ গেটের দিকে যান।`;
      if (selectedLang === 'ta') return `கவனத்திற்கு! நெரிசல் ஆபத்து. தயவுசெய்து அருகிலுள்ள அவசர வழியே வெளியேறவும்.`;
      return `Attention! A stampede risk has been detected at Siksha O Anusandhan University Campus. Please proceed calmly towards the nearest safe exit.`;
    }
    const viaZones = routeWaypoints.slice(0, -1).join(', ');
    const destination = routeWaypoints[routeWaypoints.length - 1];
    if (selectedLang === 'hi') return `कृपया ध्यान दें! शिक्षा ओ अनुसंधान विश्वविद्यालय परिसर में भगदड़ की आशंका है। ${startZone} से आपका सुरक्षित मार्ग है: ${viaZones}, फिर ${destination}। कृपया शांतिपूर्वक बाहर निकलें।`;
    if (selectedLang === 'od') return `ଧ୍ୟାନ ଦିଅନ୍ତୁ! ଶିକ୍ଷା ଓ ଅନୁସନ୍ଧାନ ବିଶ୍ୱବିଦ୍ୟାଳୟ ପରିସରରେ ଭିଡ଼ ଜନିତ ବିପଦ ଅଛି। ${startZone} ରୁ ଆପଣଙ୍କ ପ୍ରସ୍ଥାନ ମାର୍ଗ ହେଉଛି: ${viaZones}, ଏବଂ ${destination}। ଦୟାକରି ଶାନ୍ତ ଭାବରେ ପ୍ରସ୍ଥାନ କରନ୍ତୁ।`;
    if (selectedLang === 'bn') return `বিশেষ সতর্কবার্তা! শিক্ষা ও অনুসন্ধান বিশ্ববিদ্যালয় চত্বরে হুড়োহুড়ির আশঙ্কা রয়েছে। ${startZone} থেকে আপনার নিরাপদ পথ হলো: ${viaZones}, তারপর ${destination}। অনুগ্রহ করে শান্তভাবে চলুন।`;
    if (selectedLang === 'ta') return `கவனத்திற்கு! சிக்ஷா ஓ அனுசந்தன் பல்கலைக்கழக வளாகத்தில் நெரிசல் ஆபத்து. ${startZone} இலிருந்து உங்களின் அவசர வழி: ${viaZones}, பின்னர் ${destination}. தயவுசெய்து அமைதியாக வெளியேறவும்.`;
    return `Attention! A stampede risk has been detected at Siksha O Anusandhan University Campus. Your safest route from ${startZone} is: ${viaZones}, then pass through ${destination} to successfully evacuate. Please proceed calmly.`;
  };
  const activeAnnouncementText = isScenarioActive ? getDynamicEvacuationText() : (liveAnnouncementText || translation.announcementText);
  useEffect(() => {
    const unsubscribe = wsService.subscribe((data: any) => {
      if (data.event === 'INTERVENTION_DISPATCHED' || data.event === 'PA_BROADCAST' || data.event === 'BROADCAST_DISPATCHED' || data.event === 'EMERGENCY_BROADCAST') {
        const textToAnnounce = data.announcementText || data.message || data.actionText || data.text || '';
        const langToUse = (data.language as SupportedLanguage) || selectedLang || 'en';
        if (textToAnnounce) {
          setLiveAnnouncementText(textToAnnounce);
          setNotifications((prev) => [
            { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), msg: textToAnnounce },
            ...prev,
          ]);
          if (textToAnnounce.includes('SMS') || textToAnnounce.includes('CRITICAL') || data.actionText?.includes('SMS')) {
            setIsCriticalUI(true);
            setTimeout(() => setIsCriticalUI(false), 20000);
          }
          setIsPlayingAudio(true);
          speakAnnouncement(textToAnnounce, langToUse).finally(() => {
              setIsPlayingAudio(false);
          });
        }
      } 
      else if (data.event === 'HAZARD_STATUS_UPDATED' && data.reportId) {
        const updatedId = String(data.reportId);
        const updatedStatus = (data.status === 'VERIFIED' ? 'CONFIRMED' : data.status).toUpperCase();
        setLiveReports((prev) =>
          prev.map((rep) => rep.id === updatedId ? { ...rep, status: updatedStatus as any } : rep)
        );
      } 
      else if (data.event === 'CITIZEN_HAZARD_SUBMITTED' && data.report) {
        const inc = data.report;
        const rawStatus = (inc.status || 'PENDING').toUpperCase();
        const displayStatus = rawStatus === 'VERIFIED' ? 'CONFIRMED' : rawStatus;
        const formatted: CitizenReport = {
          id: String(inc.id),
          category: inc.category || 'Hazard',
          location: inc.location || inc.location_name || 'Campus',
          description: inc.description || '',
          status: displayStatus as any,
          upvotes: inc.confirmationsCount || inc.upvotes || 0,
          timestamp: inc.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          photoUrl: inc.imageUrl || inc.photoUrl,
        };
        setLiveReports((prev) => [formatted, ...prev.filter((r) => r.id !== formatted.id)]);
      }
    });
    return () => unsubscribe();
  }, [selectedLang]);
  useEffect(() => {
    if (isScenarioActive) {
      const gfZones: GeofenceZone[] = activeCampusZones.map((z: any) => ({
        id: z.id,
        name: z.name,
        centerLat: z.center?.[0] || z.center_lat || 20.2494,
        centerLng: z.center?.[1] || z.center_lng || 85.8,
        radiusMeters: 60,
        riskLevel: z.riskLevel || (z.id === 'zone_library_roundabout' ? 'critical' : 'safe'),
      }));
      const intersections = checkGeofenceIntersections(userLocation.lat, userLocation.lng, gfZones);
      const criticalIntersection = intersections.find(
        (i: any) => i.riskLevel === 'critical' || i.riskLevel === 'warning'
      );
      if (criticalIntersection) {
        setGeofenceWarning(`You are approaching ${criticalIntersection.name}. Critical congestion detected — divert immediately.`);
        if ('vibrate' in navigator) navigator.vibrate([500, 250, 500]);
      } else {
        setGeofenceWarning(null);
      }
    } else {
      setGeofenceWarning(null);
    }
  }, [isScenarioActive, zones, activeCampusZones, userLocation.lat, userLocation.lng]);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFileName(file.name);
    setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    const reader = new FileReader();
    reader.onloadend = () => {
      setMediaUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  const handleSimulateSampleImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };
  const handleSimulateSampleVideo = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'video/*';
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };
  const removeMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    setMediaFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;
    const payload = {
      category: reportCategory,
      description: reportDesc,
      location_name: reportLocation,
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      venue_id: selectedVenue?.id || 'soa-iter-01',
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    };
    try {
      const res = await api.post('/incidents/', payload);
      const formatted: CitizenReport = {
        id: res.data?.id || Math.random().toString(),
        category: reportCategory as any,
        location: reportLocation,
        description: reportDesc,
        status: 'PENDING' as any,
        upvotes: 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        photoUrl: mediaType === 'image' ? mediaUrl || undefined : undefined,
        videoUrl: mediaType === 'video' ? mediaUrl || undefined : undefined,
      };
      setLiveReports([formatted, ...liveReports]);
    } catch (err: any) {
      console.error('Failed to submit incident to DB', err.response?.data || err);
      const formatted: CitizenReport = {
        id: Math.random().toString(),
        category: reportCategory as any,
        location: reportLocation,
        description: reportDesc,
        status: 'PENDING' as any,
        upvotes: 0,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        photoUrl: mediaType === 'image' ? mediaUrl || undefined : undefined,
        videoUrl: mediaType === 'video' ? mediaUrl || undefined : undefined,
      };
      setLiveReports([formatted, ...liveReports]);
    }
    setReportDesc('');
    removeMedia();
    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
    }, 2500);
  };
  const playSarvamTTS = async () => {
    setIsPlayingAudio(true);
    await speakAnnouncement(activeAnnouncementText, selectedLang);
    setIsPlayingAudio(false);
  };
  const handleExitZoneChange = (zoneName: string) => {
    setSelectedExitZone(zoneName);
    const coords = currentZoneCoords[zoneName];
    if (coords) {
      setExitUserLocation(coords);
    }
    setExitRouteTriggered(false);
  };
  const handleFindSafeExit = () => {
    const coords = currentZoneCoords[selectedExitZone];
    if (coords) {
      setExitUserLocation({ ...coords });
      setExitRouteTriggered(true);
      setActiveTab('exit');
    }
  };
  return (
    <div className={`w-full max-w-6xl mx-auto min-h-screen flex flex-col font-body relative transition-colors duration-500 ${
        isScenarioActive ? 'bg-rose-50/50' : 'bg-[#FAFAF7]'
      }`}
    >
      {/* ── GEOFENCE WARNING ── */}
      <AnimatePresence>
        {geofenceWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-slate-900/60 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="bg-white border-2 border-rose-500 rounded-3xl p-6 sm:p-8 max-w-sm w-full relative shadow-2xl flex flex-col items-center text-center"
            >
              <button
                onClick={() => setGeofenceWarning(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-4 shadow-inner">
                <ShieldAlert className="w-8 h-8 text-rose-500 animate-pulse" />
              </div>
              <h2 className="text-xl font-heading font-black text-slate-900 mb-2 tracking-tight">Proximity Warning</h2>
              <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">{geofenceWarning}</p>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => { setGeofenceWarning(null); setActiveTab('exit'); }}
                  className="w-full py-3.5 bg-gradient-to-r from-rose-500 to-red-600 hover:opacity-90 text-white rounded-xl font-heading font-black text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-rose-500/30 active:scale-95 border-none"
                >
                  <Compass className="w-4 h-4" /> Show Safe Route
                </button>
                <button
                  onClick={() => setGeofenceWarning(null)}
                  className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl font-heading font-black text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── NOTIFICATION DRAWER ── */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex justify-end bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-sm h-full shadow-2xl flex flex-col bg-[#FAFAF7] border-l border-slate-200/80"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-200/80 flex items-center justify-between bg-white">
                <h2 className="font-heading font-black text-base text-slate-900 flex items-center gap-2 tracking-tight">
                  <History className="w-5 h-5 text-[#67b2b9]" /> Notifications
                </h2>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-4 smooth-scroll">
                {notifications.length === 0 ? (
                  <div className="text-center text-slate-400 font-mono text-xs mt-10 tracking-widest uppercase">No alerts yet</div>
                ) : (
                  notifications.map((n, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
                    >
                      <div className="text-[10px] text-[#67b2b9] mb-1.5 font-mono font-black tracking-widest">{n.time}</div>
                      <div className="text-slate-700 text-sm font-medium leading-relaxed">{n.msg}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── HEADER ── */}
      <header
        className={`sticky top-0 z-40 px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between border-b transition-colors duration-500 backdrop-blur-xl gap-2 ${
          isScenarioActive
            ? 'bg-rose-600/90 text-white border-rose-500 shadow-lg shadow-rose-600/20'
            : 'bg-white/80 text-slate-900 border-slate-200/80 shadow-sm'
        }`}
      >
        {/* Left Section */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
          {isScenarioActive ? (
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 flex items-center justify-center shadow-inner shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-white animate-pulse" />
            </div>
          ) : (
            <img 
              src="/photos/crowdshieldlogo1.png" 
              alt="CrowdShield Logo" 
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl shadow-sm bg-white shrink-0" 
            />
          )}
          <div className="min-w-0 flex-1 flex flex-col">
            <h1 className="font-heading font-black text-xs sm:text-base tracking-tight truncate leading-tight">
              {isScenarioActive ? '⚠ EMERGENCY ACTIVE' : 'CrowdShield Portal'}
            </h1>
            <div
              className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 min-w-0 mt-0.5 ${
                isScenarioActive ? 'text-white/80' : 'text-[#67b2b9]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isScenarioActive ? 'bg-white animate-ping' : 'bg-[#67b2b9] animate-pulse'
                }`}
              />
              <span className="truncate">
                {isScenarioActive 
                  ? `Evacuate Now · ${selectedVenue?.name || 'Campus'}` 
                  : `${selectedVenue?.name || 'SOA ITER Campus'} · Live`}
              </span>
            </div>
          </div>
        </div>
        {/* Right Section: Notification & Language Selector */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            onClick={() => setShowNotifications(true)}
            className={`relative p-2 sm:p-2.5 rounded-xl transition-colors cursor-pointer border ${
              isScenarioActive ? 'hover:bg-white/20 text-white border-white/20' : 'hover:bg-slate-50 bg-white text-slate-500 border-slate-200 shadow-sm'
            }`}
          >
            <BellRing className="w-4 h-4 sm:w-5 sm:h-5" />
            {notifications.length > 0 && (
              <span
                className={`absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 animate-gentle-pulse ${
                  isScenarioActive
                    ? 'bg-white border-rose-600'
                    : 'bg-rose-500 border-white'
                }`}
              />
            )}
          </button>
          <div
            className={`flex items-center gap-1 px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-[10px] sm:text-[11px] font-black tracking-wider border transition-all ${
              isScenarioActive
                ? 'bg-white/20 border-white/30 text-white'
                : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 shadow-sm'
            }`}
          >
            <Languages className="w-3.5 h-3.5 shrink-0" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
              className="bg-transparent focus:outline-none cursor-pointer font-mono font-bold outline-none text-[10px] sm:text-[11px]"
            >
              <option value="en" className="text-slate-900 bg-white">EN</option>
              <option value="hi" className="text-slate-900 bg-white">हिन्दी</option>
              <option value="od" className="text-slate-900 bg-white">ଓଡ଼ିଆ</option>
              <option value="bn" className="text-slate-900 bg-white">বাংলা</option>
              <option value="ta" className="text-slate-900 bg-white">தமிழ்</option>
            </select>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className={`hidden sm:flex p-2.5 rounded-xl transition-colors cursor-pointer active:scale-95 border ${
                isScenarioActive
                  ? 'hover:bg-white/20 text-white border-white/20'
                  : 'hover:bg-rose-50 bg-white text-slate-400 hover:text-rose-500 border-slate-200 shadow-sm'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── TAB NAVIGATION ── */}
      <div className="px-4 sm:px-6 pt-5 pb-2">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 flex gap-1.5 shadow-sm">
          {[
            { key: 'feed' as const, label: tc('safetyFeedReport', selectedLang), icon: <ShieldAlert className="w-4 h-4" /> },
            { key: 'exit' as const, label: tc('safeExitGuide', selectedLang), icon: <Navigation className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 py-3 px-4 rounded-xl font-heading font-black text-[11px] sm:text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 border-none ${
                activeTab === tab.key
                  ? isScenarioActive && tab.key === 'feed'
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                    : 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white shadow-md shadow-[#67b2b9]/20'
                  : 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              {tab.icon}
              <span className="tracking-wide">{tab.label}</span>
              {tab.key === 'exit' && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping absolute top-2 right-2" />
              )}
            </button>
          ))}
        </div>
      </div>
      {/* ── MAIN CONTENT ── */}
      <main className="px-4 sm:px-6 pb-28 sm:pb-32 flex flex-col gap-6 flex-1 pt-2">
        <AnimatePresence mode="wait">
          {activeTab === 'exit' ? (
            <motion.div
              key="exit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-5 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#67b2b9]/10 flex items-center justify-center shadow-inner">
                    <Search className="w-5 h-5 text-[#67b2b9]" />
                  </div>
                  <div>
                    <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 tracking-tight">{tc('whereAreYou', selectedLang)}</h3>
                    <p className="text-[11px] sm:text-xs font-medium text-slate-500">{tc('selectZoneDesc', selectedLang)}</p>
                  </div>
                </div>
                <select
                  value={selectedExitZone}
                  onChange={(e) => handleExitZoneChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#67b2b9]/50 transition-all shadow-inner outline-none cursor-pointer"
                >
                  {Object.keys(currentZoneCoords).map((zone) => (
                    <option key={zone} value={zone} className="font-mono">{zone}</option>
                  ))}
                </select>
                <button
                  onClick={handleFindSafeExit}
                  className="w-full py-4 bg-gradient-to-r from-[#67b2b9] to-[#648d6a] hover:opacity-95 text-white rounded-2xl font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#67b2b9]/30 active:scale-[0.98] border-none"
                >
                  <Compass className="w-5 h-5" />
                  {tc('findSafeExitRoute', selectedLang)}
                  <ArrowRight className="w-5 h-5 ml-1" />
                </button>
              </div>
              <CitizenEvacuationMap
                isScenarioActive={isScenarioActive}
                userLocation={exitUserLocation}
                zones={zones}
                venueId={selectedVenue?.id || "soa-iter-01"}
                venueName={selectedVenue?.name || "SOA ITER Campus"}
                key={`${exitUserLocation.lat}-${exitUserLocation.lng}`}
                language={selectedLang}
              />
              <EvacuationDrillMode
                userLocation={exitUserLocation}
                venueId={selectedVenue?.id || "soa-iter-01"}
                isScenarioActive={isScenarioActive}
                key={`drill-${exitUserLocation.lat}-${exitUserLocation.lng}`}
                language={selectedLang}
              />
            </motion.div>
          ) : (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {role === 'VOLUNTEER' && alerts && <VolunteerTasksView alerts={alerts} />}
              {/* ── LOCATION STATUS ── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm transition-all duration-300 relative overflow-hidden border ${
                  isScenarioActive ? 'border-rose-300 bg-rose-50' : 'bg-white border-slate-200/80 hover:border-[#67b2b9]/50'
                }`}
              >
                <div className={`absolute inset-0 opacity-10 bg-gradient-to-r ${isScenarioActive ? 'from-rose-500 to-transparent animate-pulse' : 'from-[#67b2b9] to-transparent'}`} />
                <div className="flex items-center gap-4 min-w-0 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                    isScenarioActive ? 'bg-rose-500 text-white shadow-rose-600/30' : 'bg-[#67b2b9]/10 text-[#67b2b9] border border-[#67b2b9]/20'
                  }`}>
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <div className="text-sm font-black font-heading text-slate-900 tracking-tight truncate">
                      {selectedLang === 'en' ? `Near ${currentZoneName}` : `${currentZoneName} ${tc('near', selectedLang)}`}
                    </div>
                    <div className="text-[11px] font-mono font-medium text-slate-500 truncate flex items-center gap-1.5 uppercase tracking-widest">
                      {tc('crowdDensityLabel', selectedLang)}{' '}
                      <span className={`font-black flex items-center gap-1 ${isScenarioActive ? 'text-rose-600' : 'text-[#648d6a]'}`}>
                        {!isScenarioActive && <span className="w-1.5 h-1.5 rounded-full bg-[#648d6a] animate-pulse" />}
                        {isScenarioActive && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                        {isScenarioActive ? tc('criticalDanger', selectedLang) : tc('normal', selectedLang)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-black uppercase tracking-widest shrink-0 relative z-10 shadow-sm border ${
                  isScenarioActive ? 'bg-rose-600 text-white border-none' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}>
                  {isScenarioActive ? tc('avoid', selectedLang) : tc('safe', selectedLang)}
                </div>
              </motion.div>
              {/* ── EMERGENCY / ANNOUNCEMENT CARD ── */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className={`rounded-3xl p-6 flex flex-col gap-5 transition-all duration-500 relative overflow-hidden border ${
                  isCriticalUI
                    ? 'bg-rose-600 text-white shadow-2xl shadow-rose-600/40 animate-pulse border-rose-400'
                    : isScenarioActive || liveAnnouncementText
                    ? 'bg-gradient-to-br from-rose-50 to-red-50 border-rose-200 shadow-md'
                    : 'bg-white border-slate-200/80 shadow-sm'
                }`}
              >
                <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none ${isScenarioActive ? 'bg-rose-600' : 'bg-[#67b2b9]'}`} />

                <div className="flex items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0 ${
                      isCriticalUI ? 'bg-white/20 text-white' : isScenarioActive || liveAnnouncementText ? 'bg-rose-500 text-white shadow-rose-600/30' : 'bg-[#67b2b9]/10 text-[#67b2b9] border border-[#67b2b9]/20'
                    }`}>
                      <BellRing className={`w-6 h-6 ${isScenarioActive || isCriticalUI ? 'animate-bounce' : ''}`} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className={`font-heading font-black text-sm tracking-tight uppercase ${isCriticalUI ? 'text-white' : isScenarioActive ? 'text-rose-600' : 'text-slate-900'}`}>
                        {isCriticalUI ? tc('criticalSmsAlert', selectedLang) : isScenarioActive ? tc('evacuateNow', selectedLang) : liveAnnouncementText ? tc('liveDispatch', selectedLang) : tc('safetyUpdate', selectedLang)}
                      </span>
                      <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isCriticalUI ? 'text-white/80' : 'text-slate-400'}`}>
                        {tc('officialCommandStream', selectedLang)}
                      </div>
                    </div>
                  </div>
                  {isScenarioActive && !isCriticalUI && (
                    <span className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-mono font-black uppercase tracking-widest animate-gentle-pulse shadow-sm border-none">
                      {tc('criticalStatus', selectedLang)}
                    </span>
                  )}
                </div>
                <div className={`text-sm sm:text-base leading-relaxed p-5 rounded-2xl border relative z-10 backdrop-blur-sm font-medium ${
                  isCriticalUI 
                    ? 'bg-rose-700/50 border-rose-500/50 text-white font-bold shadow-inner' 
                    : isScenarioActive
                    ? 'bg-white/80 border-rose-100 text-slate-800 shadow-inner'
                    : 'bg-slate-50 border-slate-100 text-slate-700 shadow-inner'
                }`}>
                  "{activeAnnouncementText}"
                </div>
                <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={playSarvamTTS}
                    disabled={isPlayingAudio}
                    className={`flex-1 py-3.5 sm:py-4 px-5 rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border-none disabled:opacity-50 ${
                      isCriticalUI
                        ? 'bg-white text-rose-600 hover:bg-rose-50'
                        : isScenarioActive
                        ? 'bg-white text-rose-600 hover:bg-rose-50 border border-rose-100 shadow-md'
                        : isPlayingAudio
                        ? 'bg-[#67b2b9]/10 text-[#648d6a]'
                        : 'bg-[#67b2b9]/10 text-[#67b2b9] hover:bg-[#67b2b9]/20'
                    }`}
                  >
                    <Volume2 className={`w-5 h-5 ${isPlayingAudio ? 'animate-pulse text-emerald-500' : ''}`} />
                    {isPlayingAudio ? tc('speaking', selectedLang) : `${tc('listen', selectedLang)} (${translation.langName})`}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setActiveTab('exit')}
                    className="flex-1 py-3.5 sm:py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/30 border-none"
                  >
                    <Compass className="w-5 h-5" /> {tc('safeExitBtn', selectedLang)}
                  </motion.button>
                </div>
              </motion.div>
              {/* ── REPORT HAZARD ── */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
                className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                <div className="w-full flex items-center gap-3.5 p-5 border-b border-rose-100/50 bg-gradient-to-br from-rose-50/50 to-white">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100/80 border border-rose-200 flex items-center justify-center shrink-0 shadow-inner">
                    <ShieldAlert className="w-6 h-6 text-rose-500" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="font-heading font-black text-base sm:text-lg text-slate-900 tracking-tight">{tc('reportHazard', selectedLang)}</h2>
                    <p className="text-[11px] sm:text-xs font-mono font-medium text-slate-500 uppercase tracking-widest">{tc('alertCampusSecurity', selectedLang)}</p>
                  </div>
                </div>
                <div className="p-5 sm:p-6 flex flex-col gap-5 bg-white">
                  {reportSubmitted ? (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-emerald-50 border border-emerald-100 py-10 px-6 rounded-2xl flex flex-col items-center gap-3 text-center my-2 shadow-inner"
                    >
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center shadow-inner mb-2">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <p className="font-heading font-black text-lg text-emerald-900 tracking-tight">{tc('reportSubmitted', selectedLang)}</p>
                      <p className="text-xs sm:text-sm font-medium text-emerald-600/80">{tc('securityNotified', selectedLang)}</p>
                    </motion.div>
                  ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest ml-1">
                            {tc('category', selectedLang)}
                          </label>
                          <div className="relative">
                            <select
                              value={reportCategory}
                              onChange={(e) => setReportCategory(e.target.value)}
                              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all shadow-inner outline-none cursor-pointer"
                            >
                              <option value="Medical Emergency">{tc('medicalEmergencyOpt', selectedLang)}</option>
                              <option value="Overcrowding">{tc('overcrowdingOpt', selectedLang)}</option>
                              <option value="Hazard">{tc('hazardOpt', selectedLang)}</option>
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                             
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest ml-1">
                            {tc('zone', selectedLang)}
                          </label>
                          <div className="relative">
                            <select
                              value={reportLocation}
                              onChange={(e) => setReportLocation(e.target.value)}
                              className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all shadow-inner outline-none cursor-pointer"
                            >
                              {activeCampusZones.map((z: any) => (
                                <option key={z.id} value={z.name}>{z.name}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                            
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest ml-1">
                          {tc('whatHappened', selectedLang)}
                        </label>
                        <textarea
                          rows={3}
                          value={reportDesc}
                          onChange={(e) => setReportDesc(e.target.value)}
                          placeholder={tc('describeSituation', selectedLang)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 text-sm font-medium text-slate-800 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition-all shadow-inner outline-none"
                          required
                        />
                      </div>
                      {mediaUrl ? (
                        <div className="relative rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 h-48 shadow-sm">
                          {mediaType === 'image' ? (
                            <img src={mediaUrl} alt="Attached" className="w-full h-full object-cover opacity-90" />
                          ) : (
                            <video src={mediaUrl} className="w-full h-full object-cover opacity-90" />
                          )}
                          <button
                            type="button"
                            onClick={removeMedia}
                            className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-rose-500 text-white rounded-full transition-colors cursor-pointer backdrop-blur-md border border-white/20"
                          >
                            <X className="w-5 h-5" />
                          </button>
                          <span className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white text-[10px] px-3 py-1.5 rounded-lg font-mono font-bold tracking-widest uppercase truncate max-w-[80%] border border-white/10">
                            {mediaFileName}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-1">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={handleSimulateSampleImage}
                            className="flex-1 py-5 bg-slate-50 border border-dashed border-slate-300 hover:border-[#67b2b9] hover:bg-[#67b2b9]/5 text-slate-600 rounded-2xl font-black font-heading text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm group"
                          >
                            <div className="w-10 h-10 rounded-full bg-[#67b2b9]/10 flex items-center justify-center group-hover:bg-[#67b2b9]/20 transition-colors">
                              <ImageIcon className="w-5 h-5 text-[#67b2b9]" />
                            </div>
                            <span>{tc('photo', selectedLang)}</span>
                          </motion.button>                          
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={handleSimulateSampleVideo}
                            className="flex-1 py-5 bg-slate-50 border border-dashed border-slate-300 hover:border-rose-400 hover:bg-rose-50/50 text-slate-600 rounded-2xl font-black font-heading text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer shadow-sm group"
                          >
                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 transition-colors">
                              <Video className="w-5 h-5 text-rose-600" />
                            </div>
                            <span>{tc('video', selectedLang)}</span>
                          </motion.button>
                        </div>
                      )}
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="submit"
                        className="w-full py-4 sm:py-5 mt-2 bg-[#FF3B5C] hover:bg-[#E63553] text-white rounded-2xl font-heading font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg shadow-red-500/30 border-none"
                      >
                        <Send className="w-5 h-5" /> {tc('sendHazardReport', selectedLang)}
                      </motion.button>
                    </form>
                  )}
                </div>
              </motion.div>
              {/* ── LIVE REPORTS FEED ── */}
              <div className="flex flex-col gap-5 font-body mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-slate-200/80 px-5 sm:px-6 py-4 rounded-3xl shadow-sm gap-3">
                  <div className="flex flex-col gap-1">
                    <h3 className="font-heading font-black text-base uppercase tracking-tight text-slate-900 flex items-center gap-2.5">
                      <span>{tc('nearbyReports', selectedLang)}</span>
                      <span className="bg-[#67b2b9]/10 text-[#648d6a] border border-[#67b2b9]/20 px-2.5 py-0.5 rounded-lg font-mono font-bold text-[10px]">
                        {liveReports.length}
                      </span>
                    </h3>
                    <span className="text-[11px] sm:text-xs text-slate-500 font-mono font-medium uppercase tracking-widest">Real-time crowdsourced safety feed</span>
                  </div>
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-2 shadow-sm w-fit">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    {tc('live', selectedLang)}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {liveReports.length === 0 ? (
                    <div className="col-span-full text-center py-16 px-6 bg-white border border-dashed border-slate-200 rounded-3xl flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                        <ShieldAlert className="w-6 h-6 opacity-60" />
                      </div>
                      <p className="text-sm font-black font-heading text-slate-700 tracking-wide">{tc('noActiveHazards', selectedLang)}</p>
                      <p className="text-xs font-mono text-slate-400 max-w-sm uppercase tracking-wider">All sectors are reporting normal conditions.</p>
                    </div>
                  ) : (
                    liveReports.map((rawRep, idx) => {
                      const rep = rawRep as any;
                      const badgeStyle = getStatusBadgeStyle(rep.status);
                      let photoSrc = rep.photoUrl || (rep.media_type === 'image' ? rep.media_url : null) || rep.imageUrl || rep.mediaUrl || (!rep.media_url?.endsWith('.mp4') ? rep.media_url : null);
                      let videoSrc = rep.videoUrl || (rep.media_type === 'video' ? rep.media_url : null) || (rep.media_url?.endsWith('.mp4') ? rep.media_url : null);
                      if (photoSrc && photoSrc.startsWith('blob:')) photoSrc = null;
                      if (videoSrc && videoSrc.startsWith('blob:')) videoSrc = null;
                      if (photoSrc && photoSrc.includes('video')) {
                        videoSrc = photoSrc;
                        photoSrc = null;
                      }
                      return (
                        <motion.div
                          key={rep.id || idx}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05, duration: 0.3 }}
                          className="bg-white border border-slate-200/80 rounded-3xl p-5 flex flex-col gap-4 shadow-sm hover:shadow-lg transition-all duration-300 group"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 border border-rose-100 shadow-inner">
                                <ShieldAlert className="w-5 h-5" />
                              </div>
                              <span className="text-sm font-black font-heading text-slate-900 truncate tracking-tight">
                                {getCategoryTranslation(rep.category, selectedLang)}
                              </span>
                            </div>
                        
                          </div>

                          <div className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                            <strong className="text-slate-900 font-black font-heading block mb-1">{rep.location || rep.location_name || 'Campus Sector'}</strong> 
                            {rep.description}
                          </div>

                          {/* ── Photo Renderer ── */}
                          {photoSrc && !videoSrc && (
                            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm max-h-48 bg-slate-900 relative">
                              <img 
                                src={photoSrc} 
                                alt="Report Incident" 
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 hover:opacity-100" 
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          {/* ── Video Renderer ── */}
                          {videoSrc && (
                            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900">
                              <video 
                                src={videoSrc} 
                                controls 
                                className="w-full max-h-48 object-cover opacity-90 hover:opacity-100 transition-opacity" 
                              />
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px]">
                            <span className={`px-3 py-1.5 rounded-lg text-[9px] font-mono font-black uppercase tracking-widest border shadow-sm ${badgeStyle.className}`}>
                              {badgeStyle.label}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      {/* ── EMERGENCY BOTTOM BAR ── */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-w-6xl mx-auto px-4 py-2.5 sm:px-6 sm:py-4 z-40 flex items-center justify-between gap-3 border-t transition-colors duration-500 backdrop-blur-xl ${
          isScenarioActive
            ? 'bg-rose-600/95 text-white border-rose-500 shadow-[0_-10px_40px_rgba(244,63,94,0.3)]'
            : 'bg-white/90 text-slate-900 border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'
        }`}> 
       {/* Left: Compact Emergency Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-xl shadow-inner shrink-0 ${isScenarioActive ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-500 border border-rose-100'}`}>
            <PhoneCall className={`w-4 h-4 sm:w-5 sm:h-5 ${isScenarioActive ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className={`text-xs sm:text-base font-black font-heading tracking-tight truncate ${isScenarioActive ? 'text-white' : 'text-slate-900'}`}>
              {isScenarioActive ? 'Emergency' : 'Emergency SOS'}
            </span>
            <span className={`text-[9px] sm:text-[11px] font-mono font-bold uppercase tracking-widest truncate ${isScenarioActive ? 'text-white/80' : 'text-slate-400'}`}>
              Direct Official Lines
            </span>
          </div>
        </div>
        {/* Right: Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <a
            href="tel:112"
            className={`px-3.5 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md ${
              isScenarioActive
                ? 'bg-white text-rose-600 hover:bg-rose-50'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            📞 112 <span className="hidden sm:inline ml-1">Police</span>
          </a>
          <a
            href="tel:108"
            className={`px-3.5 py-2.5 sm:px-6 sm:py-3.5 rounded-xl sm:rounded-2xl font-heading font-black text-xs sm:text-sm uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-md ${
              isScenarioActive
                ? 'bg-white text-rose-600 hover:bg-rose-50'
                : 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white hover:opacity-90'
            }`}
          >
            🚑 108 <span className="hidden sm:inline ml-1">Ambulance</span>
          </a>
        </div>
      </div>
    </div>
  );
};