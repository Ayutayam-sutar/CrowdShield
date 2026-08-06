import React, { useState, useRef } from 'react';
import { CitizenReport, SupportedLanguage } from '../../types';
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
  Upload,
  ThumbsUp,
  LogOut,
  Play,
  Compass,
  Radio,
  Wifi
} from 'lucide-react';

interface CitizenPortalViewProps {
  reports: CitizenReport[];
  onSubmitReport: (report: Omit<CitizenReport, 'id' | 'timestamp' | 'status' | 'upvotes'>) => void;
  isScenarioActive: boolean;
  onLogout?: () => void;
}

export const CitizenPortalView: React.FC<CitizenPortalViewProps> = ({
  reports,
  onSubmitReport,
  isScenarioActive,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'feed' | 'drill'>('feed');
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>('en');
  const [reportCategory, setReportCategory] = useState<CitizenReport['category']>('Overcrowding');
  const [reportDesc, setReportDesc] = useState('');
  const [reportLocation, setReportLocation] = useState('Gate 3 Exit Corridor');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Offline BLE Mesh Relay State (Tier-2 Network Resilience)
  const [bleMeshActive, setBleMeshActive] = useState(true);

  // Photo / Video Media Attachment State
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [mediaFileName, setMediaFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const translation = BHASHINI_TRANSLATIONS[selectedLang] || BHASHINI_TRANSLATIONS.en;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    const url = URL.createObjectURL(file);
    setMediaUrl(url);
    setMediaType(isVideo ? 'video' : 'image');
    setMediaFileName(file.name);
  };

  const handleSimulateSampleImage = () => {
    setMediaUrl('https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80');
    setMediaType('image');
    setMediaFileName('gate3_crowd_surge.jpg');
  };

  const handleSimulateSampleVideo = () => {
    setMediaUrl('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
    setMediaType('video');
    setMediaFileName('stadium_exit_bottleneck.mp4');
  };

  const removeMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
    setMediaFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDesc.trim()) return;

    onSubmitReport({
      category: reportCategory,
      location: reportLocation,
      description: reportDesc,
      photoUrl: mediaType === 'image' ? (mediaUrl || undefined) : undefined,
      videoUrl: mediaType === 'video' ? (mediaUrl || undefined) : undefined,
      mediaType: mediaType || undefined,
    });

    setReportDesc('');
    setMediaUrl(null);
    setMediaType(null);
    setMediaFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setReportSubmitted(true);
    setTimeout(() => setReportSubmitted(false), 4000);
  };

  const playBhashiniTTS = () => {
    setIsPlayingAudio(true);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(translation.announcementText);
      if (selectedLang === 'hi') utterance.lang = 'hi-IN';
      else if (selectedLang === 'ta') utterance.lang = 'ta-IN';
      else if (selectedLang === 'bn') utterance.lang = 'bn-IN';
      else utterance.lang = 'en-US';

      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setTimeout(() => setIsPlayingAudio(false), 3000);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto min-h-screen bg-[#F4F3EF] flex flex-col font-body shadow-2xl border-x border-[#E7E5DD] relative selection:bg-[#2C7BE5]/20">
      
      {/* Mobile Top Header */}
      <header className="bg-[#151726] text-white p-3 sm:p-4 sticky top-0 z-30 shadow-md flex items-center justify-between px-3.5 sm:px-6">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#2C7BE5] flex items-center justify-center font-bold text-white shadow-sm font-heading shrink-0 text-xs sm:text-sm">
            CS
          </div>
          <div className="min-w-0 flex flex-col">
            <h1 className="font-heading font-bold text-xs sm:text-base tracking-tight truncate">CrowdShield Safety</h1>
            <span className="text-[10px] text-[#22D3A6] font-mono-num flex items-center gap-1 font-semibold truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22D3A6] animate-ping shrink-0" />
              Live Safety Updates
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Language Selector */}
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
              <option value="bn" className="bg-[#151726] text-white">বাংলা (Bengali)</option>
              <option value="ta" className="bg-[#151726] text-white">தமிழ் (Tamil)</option>
            </select>
          </div>

          {/* Logout / Return to Portal */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Return to Landing Page"
              className="p-1.5 sm:p-2 bg-white/10 hover:bg-[#FF3B5C] rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Mode Navigation Bar */}
      <div className="bg-white border-b border-[#E7E5DD] px-3.5 sm:px-6 py-2 flex items-center gap-2 sm:gap-3 sticky top-[53px] sm:top-[61px] z-20 shadow-xs">
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

      {/* Main Screen Content */}
      <main className="p-3.5 sm:p-6 flex flex-col gap-4 sm:gap-5 flex-1 pb-28 sm:pb-32">
        {activeTab === 'drill' ? (
          <EvacuationDrillMode />
        ) : (
          <>
            {/* Grid Row 1: Urgent Broadcast Banner & Offline Safety Network */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4 items-stretch">
              
              {/* Urgent Live Broadcast Banner (2 cols on lg) */}
              <div className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 shadow-xs lg:col-span-2 transition-all ${
                isScenarioActive
                  ? 'bg-[#FF3B5C]/10 border-[#FF3B5C]/40 text-[#151726]'
                  : 'bg-white border-[#E7E5DD] text-[#151726]'
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <BellRing className={`w-4 h-4 shrink-0 ${isScenarioActive ? 'text-[#FF3B5C] animate-bounce' : 'text-[#2C7BE5]'}`} />
                    <span className="font-heading font-bold text-xs uppercase tracking-wider truncate">
                      {isScenarioActive ? 'EVACUATE NOW' : 'SAFETY UPDATE'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono-num font-semibold text-[#5B5F73] bg-[#FAFAF7] px-2 py-0.5 rounded-md border border-[#E7E5DD] shrink-0">
                    Official Announcement
                  </span>
                </div>

                <p className="text-xs font-medium leading-relaxed bg-[#FAFAF7] p-3 rounded-xl border border-[#E7E5DD]/70 text-[#151726]">
                  "{translation.announcementText}"
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={playBhashiniTTS}
                    className="flex-1 py-2.5 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                  >
                    <Volume2 className={`w-4 h-4 ${isPlayingAudio ? 'animate-pulse text-[#22D3A6]' : ''}`} />
                    <span>{isPlayingAudio ? 'Playing Audio...' : `Listen in ${translation.langName}`}</span>
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

              {/* Offline Communication Status Bar */}
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

                  {/* Toggle Switch */}
                  <button
                    onClick={() => setBleMeshActive(!bleMeshActive)}
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer flex items-center shrink-0 ${
                      bleMeshActive ? 'bg-[#22D3A6] justify-end' : 'bg-white/20 justify-start'
                    }`}
                    title="Toggle Offline Network Relay"
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

            {/* Live Zone Congestion Status Indicator */}
            <div className="bg-white border border-[#E7E5DD] rounded-2xl p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0 ${
                  isScenarioActive ? 'bg-[#FF3B5C]' : 'bg-[#22D3A6] text-[#151726]'
                }`}>
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#151726] truncate">You are near Gate 3</div>
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

            {/* Safe Exit Navigation Guide Map */}
            <CitizenEvacuationMap isScenarioActive={isScenarioActive} />

            {/* Responsive Grid Row for Incident Report & Community Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
              
              {/* Incident Citizen Report Form */}
              <div className="bg-white border border-[#E7E5DD] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3">
                <h3 className="font-heading font-bold text-sm text-[#151726] flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#FF7A45] shrink-0" />
                  <span>Report a Problem</span>
                </h3>

                {reportSubmitted ? (
                  <div className="bg-[#22D3A6]/15 border border-[#22D3A6]/40 p-4 rounded-xl flex items-center gap-3 text-xs text-[#151726] font-bold animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-[#059669] shrink-0" />
                    <span>Emergency Report sent! Security team notified.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[#5B5F73]">What's happening?</label>
                      <select
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value as CitizenReport['category'])}
                        className="w-full mt-1 p-2.5 rounded-xl border border-[#E7E5DD] text-xs font-body text-[#151726] bg-[#FAFAF7] focus:outline-none focus:border-[#2C7BE5] focus:ring-2 focus:ring-[#2C7BE5]/20"
                      >
                        <option value="Overcrowding">Too Crowded / Pushing</option>
                        <option value="Medical Emergency">Medical Emergency</option>
                        <option value="Hazard">Blocked Exit / Fallen Barrier</option>
                        <option value="Panic / Commotion">Panic / Sudden Rush</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#5B5F73]">Where is it happening?</label>
                      <input
                        type="text"
                        value={reportLocation}
                        onChange={(e) => setReportLocation(e.target.value)}
                        className="w-full mt-1 p-2.5 rounded-xl border border-[#E7E5DD] text-xs font-body text-[#151726] bg-[#FAFAF7] focus:outline-none focus:border-[#2C7BE5] focus:ring-2 focus:ring-[#2C7BE5]/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[#5B5F73]">What happened?</label>
                      <textarea
                        rows={2}
                        value={reportDesc}
                        onChange={(e) => setReportDesc(e.target.value)}
                        placeholder="Describe situation (e.g. Barricade push near Gate 3)..."
                        className="w-full mt-1 p-2.5 rounded-xl border border-[#E7E5DD] text-xs font-body text-[#151726] bg-[#FAFAF7] focus:outline-none focus:border-[#2C7BE5] focus:ring-2 focus:ring-[#2C7BE5]/20"
                        required
                      />
                    </div>

                    {/* Photo & Video Upload Attachment Area */}
                    <div className="flex flex-col gap-2 pt-1 border-t border-[#E7E5DD]">
                      <label className="text-[11px] font-semibold text-[#5B5F73] flex items-center justify-between">
                        <span>Add Photo or Video</span>
                        <span className="text-[10px] text-[#2C7BE5] font-mono-num font-bold">Optional</span>
                      </label>

                      {/* Hidden File Input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />

                      {/* Media Preview Box */}
                      {mediaUrl ? (
                        <div className="relative rounded-xl border border-[#2C7BE5]/40 bg-[#151726] overflow-hidden p-2 flex items-center gap-3">
                          {mediaType === 'image' ? (
                            <img src={mediaUrl} alt="Report Preview" className="w-14 h-14 object-cover rounded-lg border border-white/20 shrink-0" />
                          ) : (
                            <div className="w-14 h-14 bg-black rounded-lg border border-white/20 flex items-center justify-center relative overflow-hidden shrink-0">
                              <video src={mediaUrl} className="w-full h-full object-cover" />
                              <Play className="w-4 h-4 text-white absolute" />
                            </div>
                          )}

                          <div className="flex flex-col min-w-0 flex-1 text-white">
                            <span className="text-xs font-bold truncate">{mediaFileName || 'Attached Media'}</span>
                            <span className="text-[10px] text-[#22D3A6] font-mono-num uppercase flex items-center gap-1 font-semibold">
                              {mediaType === 'image' ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}
                              {mediaType === 'image' ? 'Photo Evidence' : 'Video Recording'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={removeMedia}
                            className="p-1.5 bg-white/10 hover:bg-[#FF3B5C] rounded-lg text-white transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full py-2.5 px-4 border-2 border-dashed border-[#E7E5DD] hover:border-[#2C7BE5] rounded-xl bg-[#FAFAF7] hover:bg-[#2C7BE5]/5 transition-all flex items-center justify-center gap-2 text-xs text-[#5B5F73] font-semibold cursor-pointer"
                          >
                            <Upload className="w-4 h-4 text-[#2C7BE5]" />
                            <span>Upload Photo or Video</span>
                          </button>

                          {/* Quick Simulation Options */}
                          <div className="flex items-center justify-between text-[11px] text-[#5B5F73] pt-0.5">
                            <span>Or attach sample media:</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={handleSimulateSampleImage}
                                className="px-2 py-1 bg-white border border-[#E7E5DD] hover:border-[#2C7BE5] rounded-lg text-[10px] text-[#2C7BE5] font-bold cursor-pointer active:scale-95 transition-all"
                              >
                                + Photo
                              </button>
                              <button
                                type="button"
                                onClick={handleSimulateSampleVideo}
                                className="px-2 py-1 bg-white border border-[#E7E5DD] hover:border-[#7C6CFF] rounded-lg text-[10px] text-[#7C6CFF] font-bold cursor-pointer active:scale-95 transition-all"
                              >
                                + Video Clip
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      className="w-full mt-1 py-3 bg-[#151726] hover:bg-[#25283e] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99]"
                    >
                      <Send className="w-3.5 h-3.5 text-[#22D3A6]" />
                      <span>Send Emergency Report</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Live Submitted Reports Feed */}
              <div className="flex flex-col gap-3">
                <h3 className="font-heading font-bold text-xs text-[#5B5F73] uppercase tracking-wider flex items-center justify-between">
                  <span>Nearby Safety Reports ({reports.length})</span>
                  <span className="text-[10px] text-[#059669] font-mono-num font-bold bg-[#22D3A6]/15 px-2 py-0.5 rounded-full">Live</span>
                </h3>

                <div className="flex flex-col gap-3 max-h-[500px] overflow-y-auto pr-1">
                  {reports.map((rep) => (
                    <div key={rep.id} className="bg-white border border-[#E7E5DD] rounded-2xl p-3.5 shadow-xs flex flex-col gap-2 hover:border-[#2C7BE5]/40 transition-colors">
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

                      {/* Render Media Preview if attached */}
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
                          <ThumbsUp className="w-3 h-3 text-[#2C7BE5]" /> {rep.upvotes} People Confirmed
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}
      </main>

      {/* Bottom Floating SOS Hotline Bar with Quick-Dial Buttons */}
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

    </div>
  );
};