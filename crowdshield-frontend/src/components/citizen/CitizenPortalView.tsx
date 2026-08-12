import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CitizenReport, SupportedLanguage, VenueZone, CrowdAlert } from '../../types';
import { BHASHINI_TRANSLATIONS } from '../../data/mockData';
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
  ThumbsUp,
  LogOut,
  Compass,
  History,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Navigation,
  Search,
  ArrowRight,
  Shield,
  Clock,
} from 'lucide-react';
import { speakAnnouncement, speakSarvamTTS } from '../../utils/speech';
import { VolunteerTasksView } from './VolunteerTasksView';
import { useAuth } from '../../context/AuthContext';
import { checkGeofenceIntersections, GeofenceZone } from '../../utils/geofence';
import { wsService } from '../../services/websocket';
import api from '../../utils/api';

/* ─── TYPES ──────────────────────────────────────────── */

interface CitizenPortalViewProps {
  reports: CitizenReport[];
  onSubmitReport: (report: Omit<CitizenReport, 'id' | 'upvotes' | 'status' | 'timestamp'>) => Promise<void>;
  isScenarioActive: boolean;
  onLogout?: () => void;
  alerts?: CrowdAlert[];
  zones?: VenueZone[];
}

/* ─── ZONE COORDINATE MAP ────────────────────────────── */

const CAMPUS_ZONE_COORDS: Record<string, { lat: number; lng: number }> = {
  'Main Gate': { lat: 20.2512, lng: 85.8018 },
  'Administrative Block Road': { lat: 20.2503, lng: 85.8008 },
  'Central Library Roundabout': { lat: 20.2494, lng: 85.8000 },
  'Sports Complex Road': { lat: 20.2480, lng: 85.7990 },
  'EV Charging Junction (Gate 2)': { lat: 20.2472, lng: 85.7983 },
};

/* ─── COMPONENT ──────────────────────────────────────── */

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  reports,
  onSubmitReport,
  isScenarioActive,
  onLogout,
  alerts,
  zones = [],
}) => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'exit'>('feed');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');

  // Live data
  const [liveReports, setLiveReports] = useState<CitizenReport[]>([]);
  const [notifications, setNotifications] = useState<{ time: string; msg: string }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Safe exit location picker
  const [selectedExitZone, setSelectedExitZone] = useState<string>('Central Library Roundabout');
  const [exitUserLocation, setExitUserLocation] = useState<{ lat: number; lng: number }>(
    CAMPUS_ZONE_COORDS['Central Library Roundabout']
  );
  const [exitRouteTriggered, setExitRouteTriggered] = useState(false);

  // Helper for status badge formatting and color styling
  const getStatusBadgeStyle = (status: string) => {
    const upper = (status || '').toUpperCase();
    if (upper === 'RESOLVED') {
      return {
        label: 'RESOLVED',
        className: 'bg-emerald-50 text-emerald-600 border-emerald-200 font-bold',
      };
    }
    if (upper === 'CONFIRMED' || upper === 'VERIFIED') {
      return {
        label: 'CONFIRMED',
        className: 'bg-rose-50 text-rose-600 border-rose-200 font-bold',
      };
    }
    return {
      label: 'PENDING',
      className: 'bg-amber-50 text-amber-600 border-amber-200 font-bold',
    };
  };

  // Fetch real incidents from backend DB
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        const response = await api.get('/incidents/');
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
              timestamp: new Date(inc.created_at || Date.now()).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              }),
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
  }, []);

  // Report form state
  const [reportCategory, setReportCategory] = useState<string>('Overcrowding');
  const activeCampusZones =
    zones.length > 0
      ? zones
      : [
          { id: 'gate_1', name: 'Main Gate', center: [20.2512, 85.8018] },
          { id: 'zone_admin_block_rd', name: 'Administrative Block Road', center: [20.2503, 85.8008] },
          { id: 'zone_library_roundabout', name: 'Central Library Roundabout', center: [20.2494, 85.8] },
          { id: 'zone_sports_complex_rd', name: 'Sports Complex Road', center: [20.248, 85.799] },
          { id: 'gate_2', name: 'EV Charging Junction (Gate 2)', center: [20.2472, 85.7983] },
        ];

  const [reportLocation, setReportLocation] = useState<string>(activeCampusZones[0].name);
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [geofenceWarning, setGeofenceWarning] = useState<string | null>(null);
  const [isReportFormExpanded, setIsReportFormExpanded] = useState(false);

  const [userLocation] = useState<{ lat: number; lng: number }>({ lat: 20.2494, lng: 85.8 });
  const [liveAnnouncementText, setLiveAnnouncementText] = useState<string | null>(null);

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const highestRiskZone =
    zones && zones.length > 0
      ? [...zones].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0]
      : null;
  const currentZoneName = highestRiskZone?.name || activeCampusZones[2]?.name || 'Central Library Roundabout';

  const translation = BHASHINI_TRANSLATIONS[selectedLang] || BHASHINI_TRANSLATIONS.en;

  const [routeWaypoints, setRouteWaypoints] = useState<string[]>([]);
  const [isRouteLoading, setIsRouteLoading] = useState(false);

  useEffect(() => {
    const fetchRouteInfo = async () => {
      if (!isScenarioActive) {
        setRouteWaypoints([]);
        return;
      }
      setIsRouteLoading(true);
      try {
        const response = await api.post('/routing/evacuate/', {
          venue_id: 'soa-iter-01',
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
      if (selectedLang === 'hi') {
        return `कृपया ध्यान दें! शिक्षा ओ अनुसंधान विश्वविद्यालय परिसर में भगदड़ की आशंका है। कृपया निकटतम सुरक्षित निकास की ओर शांतिपूर्वक आगे बढ़ें।`;
      }
      if (selectedLang === 'od') {
        return `ଧ୍ୟାନ ଦିଅନ୍ତୁ! ଭିଡ଼ ବିପଦ ଚିହ୍ନଟ ହୋଇଛି। ଦୟାକରି ଶୀଘ୍ର ନିକଟସ୍ଥ ପ୍ରସ୍ଥାନ ଦ୍ୱାରକୁ ଯାଆନ୍ତୁ।`;
      }
      if (selectedLang === 'bn') {
        return `বিশেষ সতর্কবার্তা! ভিড় ও হুড়োহুড়ি এড়াতে অনুগ্রহ করে নিকটতম নিরাপদ গেটের দিকে যান।`;
      }
      if (selectedLang === 'ta') {
        return `கவனத்திற்கு! நெரிசல் ஆபத்து. தயவுசெய்து அருகிலுள்ள அவசர வழியே வெளியேறவும்.`;
      }
      return `Attention! A stampede risk has been detected at Siksha O Anusandhan University Campus. Please proceed calmly towards the nearest safe exit.`;
    }

    const viaZones = routeWaypoints.slice(0, -1).join(', ');
    const destination = routeWaypoints[routeWaypoints.length - 1];

    if (selectedLang === 'hi') {
      return `कृपया ध्यान दें! शिक्षा ओ अनुसंधान विश्वविद्यालय परिसर में भगदड़ की आशंका है। ${startZone} से आपका सुरक्षित मार्ग है: ${viaZones}, फिर ${destination}। कृपया शांतिपूर्वक बाहर निकलें।`;
    }
    if (selectedLang === 'od') {
      return `ଧ୍ୟାନ ଦିଅନ୍ତୁ! ଶିକ୍ଷା ଓ ଅନୁସନ୍ଧାନ ବିଶ୍ୱବିଦ୍ୟାଳୟ ପରିସରରେ ଭିଡ଼ ଜନିତ ବିପଦ ଅଛି। ${startZone} ରୁ ଆପଣଙ୍କ ପ୍ରସ୍ଥାନ ମାର୍ଗ ହେଉଛି: ${viaZones}, ଏବଂ ${destination}। ଦୟาକରି ଶାନ୍ତ ଭାବରେ ପ୍ରସ୍ଥାନ କରନ୍ତୁ।`;
    }
    if (selectedLang === 'bn') {
      return `বিশেষ সতর্কবার্তা! শিক্ষা ও অনুসন্ধান বিশ্ববিদ্যালয় চত্বরে হুড়োহুড়ির আশঙ্কা রয়েছে। ${startZone} থেকে আপনার নিরাপদ পথ হলো: ${viaZones}, তারপর ${destination}। অনুগ্রহ করে শান্তভাবে চলুন।`;
    }
    if (selectedLang === 'ta') {
      return `கவனத்திற்கு! சிக்ஷா ஓ அனுசந்தன் பல்கலைக்கழக வளாகத்தில் நெரிசல் ஆபத்து. ${startZone} இலிருந்து உங்களின் அவசர வழி: ${viaZones}, பின்னர் ${destination}. தயவுசெய்து அமைதியாக வெளியேறவும்.`;
    }
    return `Attention! A stampede risk has been detected at Siksha O Anusandhan University Campus. Your safest route from ${startZone} is: ${viaZones}, then pass through ${destination} to successfully evacuate. Please proceed calmly.`;
  };

  const activeAnnouncementText = isScenarioActive
    ? getDynamicEvacuationText()
    : (liveAnnouncementText || translation.announcementText);

  // WebSocket listener for real-time announcements, status updates & new hazards
  useEffect(() => {
    const unsubscribe = wsService.subscribe((data: any) => {
      // 1. Live Interventions / Audio Dispatch
      if (data.event === 'INTERVENTION_DISPATCHED') {
        const textToAnnounce = data.announcementText || data.message || data.actionText || '';
        const langToUse = (data.language as SupportedLanguage) || selectedLang || 'en';
        if (textToAnnounce) {
          setLiveAnnouncementText(textToAnnounce);
          setNotifications((prev) => [
            { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), msg: textToAnnounce },
            ...prev,
          ]);
          setIsPlayingAudio(true);
          speakAnnouncement(textToAnnounce, langToUse);
          setTimeout(() => setIsPlayingAudio(false), Math.max(textToAnnounce.length * 75, 4000));
        }
      } 
      // 2. Real-time Hazard Status Update (Admin Confirms/Resolves Alert)
      else if (data.event === 'HAZARD_STATUS_UPDATED' && data.reportId) {
        const updatedId = String(data.reportId);
        const updatedStatus = (data.status === 'VERIFIED' ? 'CONFIRMED' : data.status).toUpperCase();
        setLiveReports((prev) =>
          prev.map((rep) =>
            rep.id === updatedId ? { ...rep, status: updatedStatus as any } : rep
          )
        );
      } 
      // 3. New Citizen Hazard Submitted in Real Time
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

  // Geofence checks
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
        setGeofenceWarning(
          `You are approaching ${criticalIntersection.name}. Critical congestion detected — divert immediately.`
        );
        if ('vibrate' in navigator) navigator.vibrate([500, 250, 500]);
      } else {
        setGeofenceWarning(null);
      }
    } else {
      setGeofenceWarning(null);
    }
  }, [isScenarioActive, zones, activeCampusZones, userLocation.lat, userLocation.lng]);

  // Media handlers
  const handleSimulateSampleImage = () => {
    setMediaUrl('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80');
    setMediaType('image');
    setMediaFileName('iter_roundabout_surge.jpg');
  };
  const handleSimulateSampleVideo = () => {
    setMediaUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    setMediaType('video');
    setMediaFileName('admin_block_bottleneck.mp4');
  };
  const removeMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    setMediaFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit report to backend
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;
    const payload = {
      category: reportCategory,
      description: reportDesc,
      location_name: reportLocation,
      latitude: userLocation.lat,
      longitude: userLocation.lng,
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
      setIsReportFormExpanded(false);
    }, 2500);
  };

  const playBhashiniTTS = async () => {
    setIsPlayingAudio(true);
    await speakSarvamTTS(activeAnnouncementText, selectedLang);
    setIsPlayingAudio(false);
  };

  // Handle safe exit location change
  const handleExitZoneChange = (zoneName: string) => {
    setSelectedExitZone(zoneName);
    const coords = CAMPUS_ZONE_COORDS[zoneName];
    if (coords) {
      setExitUserLocation(coords);
    }
    setExitRouteTriggered(false);
  };

  const handleFindSafeExit = () => {
    const coords = CAMPUS_ZONE_COORDS[selectedExitZone];
    if (coords) {
      setExitUserLocation({ ...coords });
      setExitRouteTriggered(true);
      setActiveTab('exit');
    }
  };

  return (
    <div
      className={`w-full max-w-5xl mx-auto min-h-screen flex flex-col font-body relative selection:bg-indigo-500/20 transition-colors duration-500 ${
        isScenarioActive ? 'bg-red-50' : 'bg-[#F5F7FA]'
      }`}
    >
      {/* ── GEOFENCE WARNING ──────────────────────────── */}
      <AnimatePresence>
        {geofenceWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: 'spring', damping: 22 }}
              className="app-card-danger p-6 max-w-sm w-full relative"
            >
              <button
                onClick={() => setGeofenceWarning(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                title="Dismiss Warning"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                <ShieldAlert className="w-7 h-7 text-red-500" />
              </div>
              <h2 className="text-lg font-heading font-black text-slate-900 mb-2">Proximity Warning</h2>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">{geofenceWarning}</p>
              
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setGeofenceWarning(null); setActiveTab('exit'); }}
                  className="w-full py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-500/20 active:scale-[0.97]"
                >
                  <Compass className="w-4 h-4" /> Show Safe Route
                </button>
                <button
                  onClick={() => setGeofenceWarning(null)}
                  className="w-full py-3 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-2xl font-heading font-bold text-sm flex items-center justify-center transition-all cursor-pointer active:scale-[0.97]"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NOTIFICATION DRAWER ───────────────────────── */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex justify-end bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShowNotifications(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="w-full max-w-sm h-full shadow-2xl flex flex-col bg-white"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="font-heading font-bold text-sm text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" /> Notifications
                </h2>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 smooth-scroll bg-slate-50">
                {notifications.length === 0 ? (
                  <div className="text-center text-slate-400 text-sm mt-10">No alerts yet</div>
                ) : (
                  notifications.map((n, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="app-card p-3"
                    >
                      <div className="text-[10px] text-indigo-500 mb-1 font-mono-num font-bold">{n.time}</div>
                      <div className="text-slate-700 text-xs leading-relaxed">{n.msg}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HEADER ─────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-40 px-4 sm:px-6 py-3 flex items-center justify-between border-b transition-colors duration-500 ${
          isScenarioActive
            ? 'bg-red-500 text-white border-red-400 shadow-lg shadow-red-500/15'
            : 'bg-white text-slate-900 border-slate-100 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
              isScenarioActive
                ? 'bg-white/20 text-white'
                : 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
            }`}
          >
            {isScenarioActive ? <AlertTriangle className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="font-heading font-bold text-sm sm:text-base tracking-tight truncate">
              {isScenarioActive ? '⚠ EMERGENCY ACTIVE' : 'CrowdShield'}
            </h1>
            <span
              className={`text-[10px] font-mono-num flex items-center gap-1.5 truncate ${
                isScenarioActive ? 'text-white/70' : 'text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isScenarioActive ? 'bg-white animate-ping' : 'bg-emerald-400 animate-pulse'
                }`}
              />
              {isScenarioActive ? 'Evacuate Now · ITER Campus' : 'SOA ITER Campus · Live'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowNotifications(true)}
            className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
              isScenarioActive ? 'hover:bg-white/15 text-white' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <BellRing className="w-4 h-4" />
            {notifications.length > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 animate-gentle-pulse ${
                  isScenarioActive
                    ? 'bg-white border-red-500'
                    : 'bg-red-500 border-white'
                }`}
              />
            )}
          </button>

          <div
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold ${
              isScenarioActive
                ? 'bg-white/15 text-white'
                : 'bg-slate-50 border border-slate-200 text-slate-600'
            }`}
          >
            <Languages className="w-3.5 h-3.5 shrink-0" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="en" className="text-slate-900 bg-white">EN</option>
              <option value="hi" className="text-slate-900 bg-white">हिं</option>
              <option value="od" className="text-slate-900 bg-white">ଓ</option>
            </select>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className={`p-2 rounded-xl transition-colors cursor-pointer active:scale-95 ${
                isScenarioActive
                  ? 'hover:bg-white/15 text-white/80'
                  : 'hover:bg-red-50 text-slate-400 hover:text-red-500'
              }`}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* ── TAB NAVIGATION ─────────────────────────────── */}
      <div className="px-4 sm:px-6 pt-3 pb-1">
        <div className="bg-slate-100 rounded-2xl p-1 flex gap-1">
          {[
            { key: 'feed' as const, label: 'Safety Feed & Report', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            { key: 'exit' as const, label: 'Safe Exit Guide', icon: <Navigation className="w-3.5 h-3.5" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 py-2.5 px-3 rounded-xl font-heading font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] ${
                activeTab === tab.key
                  ? isScenarioActive && tab.key === 'feed'
                    ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
                    : tab.key === 'exit'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                    : 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.key === 'exit' && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping absolute -top-0.5 -right-0.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────── */}
      <main className="px-4 sm:px-6 pb-28 sm:pb-32 flex flex-col gap-4 flex-1 pt-3">
        <AnimatePresence mode="wait">
          {activeTab === 'exit' ? (
            <motion.div
              key="exit"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* ── LOCATION PICKER FOR SAFE EXIT ── */}
              <div className="app-card-elevated p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Search className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-900">Where are you right now?</h3>
                    <p className="text-[11px] text-slate-400">Select your zone to find the nearest safe exit</p>
                  </div>
                </div>

                <select
                  value={selectedExitZone}
                  onChange={(e) => handleExitZoneChange(e.target.value)}
                  className="app-input font-bold"
                >
                  {Object.keys(CAMPUS_ZONE_COORDS).map((zone) => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>

                <button
                  onClick={handleFindSafeExit}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                >
                  <Compass className="w-4 h-4" />
                  Find My Safe Exit Route
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Evacuation Map + Drill */}
              <CitizenEvacuationMap
                isScenarioActive={isScenarioActive}
                userLocation={exitUserLocation}
                zones={zones}
                venueId="soa-iter-01"
                key={`${exitUserLocation.lat}-${exitUserLocation.lng}`}
              />

              <EvacuationDrillMode
                userLocation={exitUserLocation}
                venueId="soa-iter-01"
                isScenarioActive={isScenarioActive}
                key={`drill-${exitUserLocation.lat}-${exitUserLocation.lng}`}
              />
            </motion.div>
          ) : (
            <motion.div
              key="feed"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* Volunteer tasks */}
              {role === 'VOLUNTEER' && alerts && <VolunteerTasksView alerts={alerts} />}

              {/* ── EMERGENCY / ANNOUNCEMENT CARD ── */}
              <div
                className={`rounded-2xl p-4 flex flex-col gap-3 transition-all duration-500 ${
                  isScenarioActive || liveAnnouncementText
                    ? 'app-card-danger animate-emergency-border border-2'
                    : 'app-card'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isScenarioActive || liveAnnouncementText
                          ? 'bg-red-100 text-red-500'
                          : 'bg-indigo-50 text-indigo-500'
                      }`}
                    >
                      <BellRing className={`w-4 h-4 ${isScenarioActive ? 'animate-bounce' : ''}`} />
                    </div>
                    <div>
                      <span className="font-heading font-bold text-xs text-slate-900 uppercase tracking-wider">
                        {isScenarioActive ? '🚨 EVACUATE NOW' : liveAnnouncementText ? 'Live Dispatch' : 'Safety Update'}
                      </span>
                      <div className="text-[10px] text-slate-400 font-mono-num">Official Command Stream</div>
                    </div>
                  </div>
                  {isScenarioActive && (
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 text-[10px] font-bold animate-gentle-pulse">
                      CRITICAL
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  "{activeAnnouncementText}"
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={playBhashiniTTS}
                    className={`flex-1 py-2.5 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98] border ${
                      isScenarioActive
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        : 'bg-indigo-50 border-indigo-100 text-indigo-600 hover:bg-indigo-100'
                    }`}
                  >
                    <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse text-emerald-500' : ''}`} />
                    {isPlayingAudio ? 'Speaking...' : `Listen (${translation.langName})`}
                  </button>
                  <button
                    onClick={() => setActiveTab('exit')}
                    className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/15 active:scale-[0.98]"
                  >
                    <Compass className="w-4 h-4" /> Safe Exit
                  </button>
                </div>
              </div>

              {/* ── QUICK SAFE EXIT FINDER ── */}
              <div
                className={`app-card-elevated p-4 flex flex-col gap-3 ${
                  isScenarioActive ? 'border-2 border-red-200 animate-emergency-border' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-slate-900">
                      {isScenarioActive ? '🚨 Find Safe Passage NOW' : 'Find Safe Exit'}
                    </h3>
                    <p className="text-[11px] text-slate-400">Select your location to check safe routes</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <select
                    value={selectedExitZone}
                    onChange={(e) => handleExitZoneChange(e.target.value)}
                    className="app-input flex-1 text-xs font-bold"
                  >
                    {Object.keys(CAMPUS_ZONE_COORDS).map((zone) => (
                      <option key={zone} value={zone}>{zone}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleFindSafeExit}
                    className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-[0.97] shrink-0 ${
                      isScenarioActive
                        ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span className="hidden sm:inline">Go</span>
                  </button>
                </div>
              </div>

              {/* ── LOCATION STATUS ── */}
              <div
                className={`app-card p-4 flex items-center justify-between gap-3 ${
                  isScenarioActive ? 'border-red-200 bg-red-50' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isScenarioActive ? 'bg-red-100 text-red-500' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">Near {currentZoneName}</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      Crowd:{' '}
                      <span className={`font-bold ${isScenarioActive ? 'text-red-500' : 'text-emerald-500'}`}>
                        {isScenarioActive ? 'Very High — Danger' : 'Normal'}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                    isScenarioActive
                      ? 'bg-red-100 text-red-600 border border-red-200'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}
                >
                  {isScenarioActive ? '⚠ AVOID' : '✓ SAFE'}
                </span>
              </div>

              {/* ── MINI MAP ── */}
              <CitizenEvacuationMap
                isScenarioActive={isScenarioActive}
                userLocation={userLocation}
                zones={zones}
                venueId="soa-iter-01"
              />

              {/* ── REPORT HAZARD ── */}
              <div
                className={`app-card overflow-hidden transition-all ${
                  isReportFormExpanded ? 'border-red-200 bg-red-50/30' : ''
                }`}
              >
                <button
                  onClick={() => setIsReportFormExpanded((v) => !v)}
                  className="w-full flex items-center justify-between p-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                      <ShieldAlert className="w-4 h-4 text-red-500" />
                    </div>
                    <div className="text-left">
                      <div className="font-heading font-bold text-sm text-slate-900">Report a Hazard</div>
                      <div className="text-[11px] text-slate-400">Alert campus security instantly</div>
                    </div>
                  </div>
                  <div className="shrink-0 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-400 group-hover:border-slate-300 transition-colors">
                    {isReportFormExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                <AnimatePresence>
                  {isReportFormExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-red-100 p-4 flex flex-col gap-3 bg-white">
                        {reportSubmitted ? (
                          <motion.div
                            initial={{ scale: 0.9 }}
                            animate={{ scale: 1 }}
                            className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl flex flex-col items-center gap-3 text-center"
                          >
                            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            <p className="font-heading font-bold text-sm text-slate-900">Report Submitted!</p>
                            <p className="text-[11px] text-slate-500">Security team has been notified.</p>
                          </motion.div>
                        ) : (
                          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">
                                  Category
                                </label>
                                <select
                                  value={reportCategory}
                                  onChange={(e) => setReportCategory(e.target.value)}
                                  className="app-input text-xs font-bold"
                                >
                                  <option value="Blocked Exit">🚪 Blocked Exit</option>
                                  <option value="Medical Emergency">🚑 Medical Emergency</option>
                                  <option value="Overcrowding">👥 Overcrowding</option>
                                  <option value="Hazard">⚠ Hazard</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">
                                  Zone
                                </label>
                                <select
                                  value={reportLocation}
                                  onChange={(e) => setReportLocation(e.target.value)}
                                  className="app-input text-xs font-bold"
                                >
                                  {activeCampusZones.map((z: any) => (
                                    <option key={z.id} value={z.name}>{z.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">
                                What happened?
                              </label>
                              <textarea
                                rows={2}
                                value={reportDesc}
                                onChange={(e) => setReportDesc(e.target.value)}
                                placeholder="Describe the situation briefly..."
                                className="app-input text-xs resize-none"
                                required
                              />
                            </div>

                            {mediaUrl ? (
                              <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 h-28">
                                {mediaType === 'image' ? (
                                  <img src={mediaUrl} alt="Attached" className="w-full h-full object-cover opacity-80" />
                                ) : (
                                  <video src={mediaUrl} className="w-full h-full object-cover opacity-80" />
                                )}
                                <button
                                  type="button"
                                  onClick={removeMedia}
                                  className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                                <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-mono-num">
                                  {mediaFileName}
                                </span>
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={handleSimulateSampleImage}
                                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" /> Photo
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSimulateSampleVideo}
                                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <Video className="w-3.5 h-3.5" /> Video
                                </button>
                              </div>
                            )}

                            <button
                              type="submit"
                              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-red-500/15 active:scale-[0.99]"
                            >
                              <Send className="w-4 h-4" /> Send Hazard Report
                            </button>
                          </form>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── LIVE REPORTS FEED ── */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-slate-400">
                    Nearby Reports ({liveReports.length})
                  </h3>
                  <span className="text-[10px] font-mono-num font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                    ● Live
                  </span>
                </div>

                <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-0.5 smooth-scroll">
                  {liveReports.length === 0 ? (
                    <div className="text-center p-8 app-card text-slate-400 text-sm">
                      No active hazards reported.
                    </div>
                  ) : (
                    liveReports.map((rep, idx) => {
                      const badgeStyle = getStatusBadgeStyle(rep.status);
                      return (
                        <motion.div
                          key={rep.id || idx}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="app-card p-3.5 flex flex-col gap-2.5 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span className="truncate">{rep.category}</span>
                            </span>
                            <span className="text-[10px] font-mono-num text-slate-400 shrink-0 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {rep.timestamp}
                            </span>
                          </div>

                          <div className="text-xs text-slate-500 leading-relaxed">
                            <strong className="text-slate-700">{rep.location}:</strong> {rep.description}
                          </div>

                          {rep.photoUrl && (
                            <div className="rounded-xl overflow-hidden border border-slate-100 max-h-36">
                              <img src={rep.photoUrl} alt="Report" className="w-full h-36 object-cover" />
                            </div>
                          )}

                          {rep.videoUrl && (
                            <div className="rounded-xl overflow-hidden border border-slate-100">
                              <video src={rep.videoUrl} controls className="w-full max-h-36 object-cover" />
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px]">
                            {/* DYNAMIC BADGE STYLING */}
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeStyle.className}`}>
                              {badgeStyle.label}
                            </span>
                            <span className="text-slate-400 font-mono-num flex items-center gap-1 font-semibold">
                              <ThumbsUp className="w-3 h-3 text-indigo-400" />
                              {rep.upvotes || 0} Confirmed
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

      {/* ── EMERGENCY BOTTOM BAR ───────────────────────── */}
      <div
        className={`fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-3 sm:p-4 z-40 flex items-center justify-between px-4 sm:px-6 border-t transition-colors duration-500 ${
          isScenarioActive
            ? 'bg-red-500 text-white border-red-400 shadow-2xl'
            : 'bg-white text-slate-900 border-slate-100 shadow-lg'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <PhoneCall
            className={`w-4 h-4 shrink-0 animate-gentle-pulse ${
              isScenarioActive ? 'text-white' : 'text-red-400'
            }`}
          />
          <div className="flex flex-col min-w-0">
            <span className={`text-xs font-bold font-heading truncate ${isScenarioActive ? 'text-white' : 'text-slate-900'}`}>
              {isScenarioActive ? 'Emergency Services' : 'Emergency Help'}
            </span>
            <span className={`text-[10px] font-mono-num truncate hidden sm:inline ${isScenarioActive ? 'text-white/70' : 'text-slate-400'}`}>
              One-tap emergency call
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:112"
            className={`px-3 sm:px-4 py-2 rounded-xl font-heading font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 ${
              isScenarioActive
                ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                : 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/15'
            }`}
          >
            📞 112 <span className="hidden sm:inline">Police</span>
          </a>
          <a
            href="tel:108"
            className={`px-3 sm:px-4 py-2 rounded-xl font-heading font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 ${
              isScenarioActive
                ? 'bg-white/20 text-white border border-white/30 hover:bg-white/30'
                : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md shadow-indigo-500/15'
            }`}
          >
            🚑 108 <span className="hidden sm:inline">Ambulance</span>
          </a>
        </div>
      </div>
    </div>
  );
};