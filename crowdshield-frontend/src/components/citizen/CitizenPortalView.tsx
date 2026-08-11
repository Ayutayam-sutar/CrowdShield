import React, { useState, useRef, useEffect } from 'react';
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
  Radio,
  Wifi,
  History
} from 'lucide-react';
import { speakAnnouncement } from '../../utils/speech';
import { VolunteerTasksView } from './VolunteerTasksView';
import { useAuth } from '../../context/AuthContext';
import { checkGeofenceIntersections, GeofenceZone } from '../../utils/geofence';
import { wsService } from '../../services/websocket';
import api from '../../utils/api';

interface CitizenPortalViewProps {
  isScenarioActive: boolean;
  onLogout?: () => void;
  alerts?: CrowdAlert[];
  zones?: VenueZone[];
}

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  isScenarioActive,
  onLogout,
  alerts,
  zones = [],
}) => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'drill'>('feed');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');
  
  // Real Data states
  const [liveReports, setLiveReports] = useState<CitizenReport[]>([]);
  const [notifications, setNotifications] = useState<{time: string, msg: string}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch Real Incidents from the database on load
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        // Must match the api_router.py prefix exactly
        const response = await api.get('/incidents/'); 
        if (response.data && Array.isArray(response.data)) {
          const formattedReports: CitizenReport[] = response.data.map((inc: any) => ({
            id: String(inc.id),
            category: inc.category || 'Hazard',
            location: inc.location_name || 'Campus',
            description: inc.description || '',
            status: 'PENDING' as any, // TS Cast to prevent type error
            upvotes: inc.upvotes || 0,
            timestamp: new Date(inc.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            photoUrl: inc.media_type === 'image' ? inc.media_url : undefined,
            videoUrl: inc.media_type === 'video' ? inc.media_url : undefined,
          }));
          // Sort by newest first
          setLiveReports(formattedReports);
        }
      } catch (err) {
        console.error("Failed to fetch incidents:", err);
      }
    };
    fetchIncidents();
  }, []);

  const [reportCategory, setReportCategory] = useState<string>('Overcrowding');
  const activeCampusZones = zones.length > 0 ? zones : [
    { id: 'gate_1', name: 'Main Gate', center: [20.2512, 85.8018] },
    { id: 'zone_admin_block_rd', name: 'Administrative Block Road', center: [20.2503, 85.8008] },
    { id: 'zone_library_roundabout', name: 'Central Library Roundabout', center: [20.2494, 85.8000] },
    { id: 'zone_sports_complex_rd', name: 'Sports Complex Road', center: [20.2480, 85.7990] },
    { id: 'gate_2', name: 'EV Charging Junction (Gate 2)', center: [20.2472, 85.7983] }
  ];

  const [reportLocation, setReportLocation] = useState<string>(activeCampusZones[0].name);
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [geofenceWarning, setGeofenceWarning] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Default to SOA ITER coordinates
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>({ lat: 20.2494, lng: 85.8000 });
  const [liveAnnouncementText, setLiveAnnouncementText] = useState<string | null>(null);

  const highestRiskZone = zones && zones.length > 0 ? [...zones].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))[0] : null;
  const currentZoneName = highestRiskZone?.name || activeCampusZones[2]?.name || 'Central Library Roundabout';

  // WebSocket Listener for Notifications
  useEffect(() => {
    const unsubscribe = wsService.subscribe((data) => {
      if (data.event === 'INTERVENTION_DISPATCHED') {
        const textToAnnounce = data.announcementText || data.message || data.actionText || '';
        const langToUse = (data.language as SupportedLanguage) || selectedLang || 'en';

        if (textToAnnounce) {
          setLiveAnnouncementText(textToAnnounce);
          setNotifications(prev => [{ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), msg: textToAnnounce }, ...prev]);
          setIsPlayingAudio(true);
          speakAnnouncement(textToAnnounce, langToUse);

          setTimeout(() => setIsPlayingAudio(false), Math.max(textToAnnounce.length * 75, 4000));
        }
      }
    });
    return () => unsubscribe();
  }, [selectedLang]);

  // Geofence Warning Checks
  useEffect(() => {
    if (isScenarioActive) {
      const gfZones: GeofenceZone[] = activeCampusZones.map((z: any) => ({
        id: z.id,
        name: z.name,
        centerLat: z.center?.[0] || z.center_lat || 20.2494,
        centerLng: z.center?.[1] || z.center_lng || 85.8000,
        radiusMeters: 60,
        riskLevel: z.riskLevel || (z.id === 'zone_library_roundabout' ? 'critical' : 'safe')
      }));

      const intersections = checkGeofenceIntersections(userLocation.lat, userLocation.lng, gfZones);
      const criticalIntersection = intersections.find((i: any) => i.riskLevel === 'critical' || i.riskLevel === 'warning');

      if (criticalIntersection) {
        setGeofenceWarning(`CRITICAL CONGESTION AHEAD: You are approaching ${criticalIntersection.name}. Divert immediately via safe route.`);
        if ('vibrate' in navigator) navigator.vibrate([500, 250, 500]);
      } else {
        setGeofenceWarning(null);
      }
    } else {
      setGeofenceWarning(null);
    }
  }, [isScenarioActive, zones, activeCampusZones, userLocation.lat, userLocation.lng]);

  const [bleMeshActive, setBleMeshActive] = useState(true);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const translation = BHASHINI_TRANSLATIONS[selectedLang] || BHASHINI_TRANSLATIONS.en;
  const activeAnnouncementText = liveAnnouncementText || translation.announcementText;

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

  // Real Database Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;

    const newIncidentPayload = {
      category: reportCategory,
      description: reportDesc,
      location_name: reportLocation,
      latitude: userLocation.lat,
      longitude: userLocation.lng,
      media_url: mediaUrl || null, // FastAPI validators require null instead of empty strings
      media_type: mediaType || null
    };

    try {
      // 1. Post to Backend with Trailing Slash
      const res = await api.post('/incidents/', newIncidentPayload);
      
      // 2. Add to Local State so citizens see it immediately
      const formattedNew: CitizenReport = {
        id: res.data?.id || Math.random().toString(),
        category: reportCategory as any,
        location: reportLocation,
        description: reportDesc,
        status: 'PENDING' as any,
        upvotes: 0,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        photoUrl: mediaType === 'image' ? (mediaUrl || undefined) : undefined,
        videoUrl: mediaType === 'video' ? (mediaUrl || undefined) : undefined,
      };
      setLiveReports([formattedNew, ...liveReports]);

    } catch (err: any) {
      console.error("Failed to submit incident to DB", err.response?.data || err);
      // Fallback for demo purposes if backend fails
      const formattedNew: CitizenReport = {
        id: Math.random().toString(),
        category: reportCategory as any,
        location: reportLocation,
        description: reportDesc,
        status: 'PENDING' as any,
        upvotes: 0,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        photoUrl: mediaType === 'image' ? (mediaUrl || undefined) : undefined,
        videoUrl: mediaType === 'video' ? (mediaUrl || undefined) : undefined,
      };
      setLiveReports([formattedNew, ...liveReports]);
    }

    setReportDesc('');
    setMediaUrl(null);
    setMediaType(null);
    setMediaFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setReportSubmitted(true);
    setTimeout(() => {
      setReportSubmitted(false);
      setIsReportModalOpen(false);
    }, 2000);
  };

  const playBhashiniTTS = () => {
    setIsPlayingAudio(true);
    speakAnnouncement(activeAnnouncementText, selectedLang);
    setTimeout(() => setIsPlayingAudio(false), Math.max(activeAnnouncementText.length * 75, 3000));
  };

  return (
    <div className="w-full max-w-5xl mx-auto min-h-screen bg-[#F4F3EF] flex flex-col font-body shadow-2xl border-x border-[#E7E5DD] relative selection:bg-[#2C7BE5]/20">
      
      {/* Geofence Warning Modal */}
      {geofenceWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#151726] rounded-3xl p-6 max-w-sm w-full border border-[#FF3B5C]/30 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#FF3B5C]/20 flex items-center justify-center mb-4 border border-[#FF3B5C]/40 animate-pulse">
              <ShieldAlert className="w-8 h-8 text-[#FF3B5C]" />
            </div>
            <h2 className="text-xl font-heading font-black text-white mb-2 tracking-tight">PROXIMITY WARNING</h2>
            <p className="text-sm text-white/80 font-medium mb-6 leading-relaxed">{geofenceWarning}</p>
            <button
              onClick={() => { setGeofenceWarning(null); setActiveTab('drill'); }}
              className="w-full py-3.5 bg-[#FF3B5C] hover:bg-[#e02e4d] text-white rounded-xl font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-[#FF3B5C]/20 active:scale-95"
            >
              <Compass className="w-4 h-4" /><span>Show Safe Route</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications History Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-[90] flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-[#E7E5DD] flex items-center justify-between bg-[#151726] text-white">
              <h2 className="font-heading font-bold flex items-center gap-2">
                <History className="w-4 h-4 text-[#2C7BE5]"/> Notification History
              </h2>
              <button onClick={() => setShowNotifications(false)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F4F3EF]">
              {notifications.length === 0 ? (
                <div className="text-center text-[#5B5F73] text-sm mt-10">No recent alerts.</div>
              ) : (
                notifications.map((n, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-[#E7E5DD] shadow-xs text-sm">
                    <div className="text-[10px] text-[#5B5F73] mb-1 font-mono-num">{n.time}</div>
                    <div className="text-[#151726]">{n.msg}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Mobile Top Header */}
      <header className="bg-[#151726] text-white p-3 sm:p-4 shadow-md flex items-center justify-between px-3.5 sm:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#2C7BE5] flex items-center justify-center font-bold text-white shadow-sm font-heading shrink-0 text-xs sm:text-sm">
            CS
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="font-heading font-bold text-xs sm:text-base tracking-tight truncate">CrowdShield Safety · ITER</h1>
            <span className="text-[10px] text-[#22D3A6] font-mono-num flex items-center gap-1 font-semibold truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3A6] animate-ping shrink-0" />
              SOA University Network Live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Notification Bell Toggle */}
          <button 
            onClick={() => setShowNotifications(true)} 
            className="relative p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
          >
            <BellRing className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#FF3B5C] border border-[#151726] rounded-full"></span>
            )}
          </button>

          <div className="flex items-center gap-1 bg-white/10 px-2 sm:px-2.5 py-1 rounded-xl border border-white/15 hover:bg-white/15 transition-colors">
            <Languages className="w-3.5 h-3.5 text-[#2C7BE5] shrink-0" />
            <select
              value={selectedLang}
              onChange={(e) => setSelectedLang(e.target.value as SupportedLanguage)}
              className="bg-transparent text-white text-[11px] sm:text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="en" className="bg-[#151726] text-white">English</option>
              <option value="hi" className="bg-[#151726] text-white">हिंदी (Hindi)</option>
              <option value="od" className="bg-[#151726] text-white">ଓଡ଼ିଆ (Odia)</option>
            </select>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-1.5 sm:p-2 bg-white/10 hover:bg-[#FF3B5C] rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Navigation Bar */}
      <div className="bg-white border-b border-[#E7E5DD] px-3.5 sm:px-6 py-2 flex items-center gap-2 sm:gap-3 shadow-xs">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer active:scale-[0.99] ${
            activeTab === 'feed'
              ? 'bg-[#151726] text-white shadow-sm'
              : 'bg-[#FAFAF7] text-[#5B5F73] hover:text-[#151726] border border-[#E7E5DD]'
          }`}
        >
          <Radio className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${activeTab === 'feed' ? 'text-[#22D3A6]' : 'text-[#2C7BE5]'}`} />
          <span>Safety & SOS</span>
        </button>

        <button
          onClick={() => setActiveTab('drill')}
          className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer relative active:scale-[0.99] ${
            activeTab === 'drill'
              ? 'bg-[#22D3A6] text-[#151726] shadow-sm'
              : 'bg-[#FAFAF7] text-[#5B5F73] hover:text-[#151726] border border-[#E7E5DD]'
          }`}
        >
          <Compass className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#151726]" />
          <span>Safe Exit Guide</span>
          <span className="w-2 h-2 rounded-full bg-[#FF3B5C] animate-ping absolute -top-0.5 -right-0.5" />
        </button>
      </div>

      {/* Main Content */}
      <main className="p-3.5 sm:p-6 flex flex-col gap-4 sm:gap-5 flex-1 pb-28 sm:pb-32">
        {activeTab === 'drill' ? (
          <EvacuationDrillMode userLocation={userLocation} venueId="v-1" />
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
              {role === 'VOLUNTEER' && alerts && (
                <div className="lg:col-span-3">
                  <VolunteerTasksView alerts={alerts} />
                </div>
              )}
              
              <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-xs lg:col-span-2 transition-all ${
                isScenarioActive || liveAnnouncementText
                  ? 'bg-[#FF3B5C]/10 border-[#FF3B5C]/40 text-[#151726]'
                  : 'bg-white border-[#E7E5DD] text-[#151726]'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BellRing className={`w-4 h-4 shrink-0 ${isScenarioActive || liveAnnouncementText ? 'text-[#FF3B5C] animate-bounce' : 'text-[#2C7BE5]'}`} />
                    <span className="font-heading font-bold text-xs uppercase tracking-wider truncate">
                      {isScenarioActive ? 'EVACUATE NOW' : liveAnnouncementText ? 'LIVE EMERGENCY DISPATCH' : 'SAFETY UPDATE'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-num font-semibold text-[#5B5F73] bg-[#FAFAF7] px-2 py-0.5 rounded-md border border-[#E7E5DD] shrink-0">
                    Official Command Stream
                  </span>
                </div>

                <p className="text-xs font-medium leading-relaxed bg-[#FAFAF7] p-3 rounded-xl border border-[#E7E5DD]/70 text-[#151726]">
                  "{activeAnnouncementText}"
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={playBhashiniTTS}
                    className="flex-1 py-2.5 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse text-[#22D3A6]' : ''}`} />
                    <span>{isPlayingAudio ? 'Broadcasting Speech...' : `Listen in ${translation.langName}`}</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('drill')}
                    className="py-2.5 px-4 bg-[#22D3A6] hover:bg-[#1eb992] text-[#151726] rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <Compass className="w-4 h-4" />
                    <span>Show Safe Exit</span>
                  </button>
                </div>
              </div>

              <div className="bg-[#151726] border border-white/10 rounded-2xl p-4 text-white shadow-xs flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                      bleMeshActive ? 'bg-[#22D3A6]/20 text-[#22D3A6] border border-[#22D3A6]/30' : 'bg-white/10 text-white/50'
                    }`}>
                      <Radio className={`w-4 h-4 ${bleMeshActive ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 font-heading truncate">
                        <span>Offline Safety Network</span>
                      </div>
                      <div className="text-[10px] text-white/60 font-mono-num truncate">
                        Works even without internet
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setBleMeshActive(!bleMeshActive)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                      bleMeshActive ? 'bg-[#22D3A6] justify-end' : 'bg-white/20 justify-start'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-white shadow-md transform transition-transform" />
                  </button>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-[11px] font-mono-num flex items-center justify-between gap-2">
                  <span className="text-white/70 flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-[#22D3A6]" /> Network Status:
                  </span>
                  <span className={`font-bold truncate ${bleMeshActive ? 'text-[#22D3A6]' : 'text-white/50'}`}>
                    {bleMeshActive ? 'Offline Network Active' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E7E5DD] rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
                  isScenarioActive ? 'bg-[#FF3B5C]' : 'bg-[#22D3A6] text-[#151726]'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#151726] truncate">You are near {currentZoneName}</div>
                  <div className="text-[11px] text-[#5B5F73] font-medium truncate">
                    Crowd Level: {isScenarioActive ? 'Very High' : 'Normal'}
                  </div>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono-num uppercase shrink-0 ${
                isScenarioActive ? 'bg-[#FF3B5C]/15 text-[#FF3B5C]' : 'bg-[#22D3A6]/20 text-[#059669]'
              }`}>
                {isScenarioActive ? 'AVOID THIS AREA' : 'AREA IS SAFE'}
              </span>
            </div>

            <CitizenEvacuationMap 
              isScenarioActive={isScenarioActive} 
              userLocation={userLocation}
              zones={zones}
              venueId="v-1"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
              <div className="lg:col-span-2 flex flex-col gap-3">
                <h3 className="font-heading font-bold text-xs text-[#5B5F73] uppercase tracking-wider flex items-center justify-between">
                  <span>Nearby Safety Reports ({liveReports.length})</span>
                  <span className="text-[10px] text-[#059669] font-mono-num font-bold bg-[#22D3A6]/15 px-2 py-0.5 rounded-full">Live</span>
                </h3>

                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {liveReports.length === 0 ? (
                    <div className="text-center text-[#5B5F73] p-4 bg-white border border-[#E7E5DD] rounded-xl text-sm">
                      No active hazards reported.
                    </div>
                  ) : (
                    liveReports.map((rep, idx) => (
                      <div key={rep.id || idx} className="bg-white border border-[#E7E5DD] rounded-2xl p-3.5 shadow-xs flex flex-col gap-2 hover:border-[#2C7BE5]/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-[#151726] flex items-center gap-1.5 truncate">
                            <ShieldAlert className="w-3.5 h-3.5 text-[#FF3B5C] shrink-0" />
                            <span className="truncate">{rep.category}</span>
                          </span>
                          <span className="text-[10px] font-mono-num text-[#5B5F73] shrink-0">{rep.timestamp}</span>
                        </div>

                        <div className="text-xs text-[#5B5F73] leading-relaxed">
                          <strong className="text-[#151726]">{rep.location}:</strong> {rep.description}
                        </div>

                        {rep.photoUrl && (
                          <div className="rounded-xl overflow-hidden border border-[#E7E5DD] mt-1 max-h-40 bg-black">
                            <img src={rep.photoUrl} alt="Report attachment" className="w-full h-36 object-cover" />
                          </div>
                        )}

                        {rep.videoUrl && (
                          <div className="rounded-xl overflow-hidden border border-[#E7E5DD] mt-1 bg-black">
                            <video src={rep.videoUrl} controls className="w-full max-h-40 object-cover" />
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-[#E7E5DD]/70 text-[11px]">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFB627]/15 text-[#D97706] uppercase">
                            {rep.status}
                          </span>
                          <span className="text-[#5B5F73] font-mono-num flex items-center gap-1 font-semibold">
                            <ThumbsUp className="w-3 h-3 text-[#2C7BE5]" /> {rep.upvotes || 0} Confirmed
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 w-full max-w-5xl mx-auto p-3 sm:p-4 bg-[#151726] text-white border-t border-white/10 z-40 flex items-center justify-between shadow-2xl px-4 sm:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <PhoneCall className="w-4 h-4 text-[#FF3B5C] animate-pulse shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white font-heading truncate">Emergency Help</span>
            <span className="text-[10px] text-white/60 font-mono-num truncate hidden sm:inline">Quick Emergency Call</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="tel:112"
            className="px-2.5 sm:px-3.5 py-1.5 bg-[#FF3B5C] hover:bg-[#e02e4d] text-white rounded-xl font-heading font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
          >
            <span>📞 112 <span className="hidden sm:inline">(Police)</span></span>
          </a>

          <a
            href="tel:108"
            className="px-2.5 sm:px-3.5 py-1.5 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-xl font-heading font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
          >
            <span>🚑 108 <span className="hidden sm:inline">(Ambulance)</span></span>
          </a>
        </div>
      </div>

      <button
        onClick={() => setIsReportModalOpen(true)}
        className="fixed bottom-24 right-4 sm:right-6 w-14 h-14 bg-[#FF3B5C] hover:bg-[#e02e4d] text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-110 z-40 group"
      >
        <ShieldAlert className="w-6 h-6 group-hover:animate-bounce" />
        <span className="absolute -top-10 bg-[#151726] text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Report Hazard
        </span>
      </button>

      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
          <div className="bg-white border-2 border-[#FF3B5C]/30 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 flex flex-col gap-4 relative">
            <div className="flex justify-between items-center border-b border-[#E7E5DD] pb-3">
              <span className="font-heading font-bold text-sm text-[#FF3B5C] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" /> Report Hazard
              </span>
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#FAFAF7] text-[#5B5F73]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSubmitted ? (
              <div className="bg-[#22D3A6]/15 border border-[#22D3A6]/40 p-4 rounded-xl flex flex-col items-center gap-3 text-center text-sm text-[#151726] font-bold animate-fadeIn py-8">
                <CheckCircle2 className="w-12 h-12 text-[#059669]" />
                <span>Report successfully submitted.<br/>Security team has been notified.</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73]">What's happening?</label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-[#E7E5DD] text-xs font-body text-[#151726] bg-[#FAFAF7] focus:outline-none focus:border-[#FF3B5C] focus:ring-2 focus:ring-[#FF3B5C]/20"
                  >
                    <option value="Blocked Exit">Blocked Exit</option>
                    <option value="Medical Emergency">Medical Emergency</option>
                    <option value="Overcrowding">Overcrowding</option>
                    <option value="Hazard">Hazard</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73]">Target Campus Sector / Zone</label>
                  <select
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-[#E7E5DD] text-xs font-body text-[#151726] bg-[#FAFAF7] focus:outline-none focus:border-[#FF3B5C] focus:ring-2 focus:ring-[#FF3B5C]/20"
                  >
                    {activeCampusZones.map((z: any) => (
                      <option key={z.id} value={z.name}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-[#5B5F73]">What happened?</label>
                  <textarea
                    rows={2}
                    value={reportDesc}
                    onChange={(e) => setReportDesc(e.target.value)}
                    placeholder="Describe situation..."
                    className="w-full mt-1 p-2.5 rounded-xl border border-[#E7E5DD] text-xs font-body text-[#151726] bg-[#FAFAF7] focus:outline-none focus:border-[#FF3B5C] focus:ring-2 focus:ring-[#FF3B5C]/20"
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  {mediaUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-[#E7E5DD] bg-black h-32">
                      {mediaType === 'image' ? (
                        <img src={mediaUrl} alt="Attached" className="w-full h-full object-cover opacity-80" />
                      ) : (
                        <video src={mediaUrl} className="w-full h-full object-cover opacity-80" />
                      )}
                      <button
                        type="button"
                        onClick={removeMedia}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-[#FF3B5C] text-white rounded-lg transition-colors"
                      >
                        <X className="w-4 h-4"/>
                      </button>
                      <span className="absolute bottom-2 left-2 bg-black/80 text-white text-[10px] px-2 py-0.5 rounded font-mono-num">
                        {mediaFileName}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSimulateSampleImage}
                        className="flex-1 py-2 bg-[#FAFAF7] hover:bg-[#E7E5DD] border border-[#E7E5DD] text-[#5B5F73] hover:text-[#151726] rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5"/> Attach Photo
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulateSampleVideo}
                        className="flex-1 py-2 bg-[#FAFAF7] hover:bg-[#E7E5DD] border border-[#E7E5DD] text-[#5B5F73] hover:text-[#151726] rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Video className="w-3.5 h-3.5"/> Attach Video
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 bg-[#FF3B5C] hover:bg-[#e02e4d] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Report</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};