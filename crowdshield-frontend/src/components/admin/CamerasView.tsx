import React, { useState, useMemo } from 'react';
import { CCTVFeed, VenueZone, VenueInfo } from '../../types';
import { 
  Layers,
  VideoOff,
  RefreshCw,
  Upload,
  Loader2,
  Maximize2,
  Activity,
  X,
  Server
} from 'lucide-react';

// ─── SET YOUR ACTIVE HTTPS TUNNEL URL HERE ───
// Paste your Pinggy, Cloudflare, or Ngrok URL here (No trailing slash)
const PORT_TUNNELS: Record<string, string> = {
  "5000": "https://dirty-peaches-battle.loca.lt",       // Camera 1 (ITER Campus / gate_1)
  "5001": "https://silver-flies-hear.loca.lt", // Camera 2 (Kalinga Stadium / ks_gate_3)
};
interface CamerasViewProps {
  cctvFeeds: CCTVFeed[];
  zones?: VenueZone[];
  selectedVenue?: VenueInfo | null;
}

export const CamerasView: React.FC<CamerasViewProps> = ({ cctvFeeds, zones = [], selectedVenue }) => {
  const [showDetections, setShowDetections] = useState(true);
  const [selectedFeed, setSelectedFeed] = useState<CCTVFeed | null>(null);
  
  // ─── TEAM's BACKEND LOGIC (100% PRESERVED) ───
  const [failedFeeds, setFailedFeeds] = useState<Record<string, boolean>>({});
  const [streamCacheBusters, setStreamCacheBusters] = useState<Record<string, number>>({});
  const [uploadingFeeds, setUploadingFeeds] = useState<Record<string, boolean>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  // Resolves local URLs (localhost/127.0.0.1) to the secure Tunnel URL for Netlify
const resolveStreamUrl = (url: string, feedId: string): string => {
  if (!url) return '';

  // Extract port from original feed URL (e.g., http://127.0.0.1:5001/video_feed)
  const portMatch = url.match(/:(\d+)\//);
  const port = portMatch ? portMatch[1] : (feedId.includes('ks_') ? '5001' : '5000');

  const activeTunnel = PORT_TUNNELS[port];
  if (!activeTunnel) return url;

  // Extract endpoint path (e.g., /video_feed)
  const path = url.replace(/^https?:\/\/[^/]+/, '') || '/video_feed';
  return `${activeTunnel}${path}`;
};

  const filteredFeeds = useMemo(() => {
    const isKalingaSelected = selectedVenue?.id?.includes('kalinga') || selectedVenue?.name?.includes('Kalinga');
    return cctvFeeds.filter((feed) => {
      const isKalingaFeed = (feed.zoneId || '').toLowerCase().startsWith('ks_') || feed.id.startsWith('ks_');
      if (isKalingaSelected) return isKalingaFeed;
      return !isKalingaFeed;
    });
  }, [cctvFeeds, selectedVenue]);

  const handleImageError = (feedId: string) => {
    setFailedFeeds((prev) => ({ ...prev, [feedId]: true }));
  };

  const handleRetryFeed = (feedId: string) => {
    setStreamCacheBusters((prev) => ({ ...prev, [feedId]: Date.now() }));
    setFailedFeeds((prev) => ({ ...prev, [feedId]: false }));
  };

  const getPortFromUrl = (url: string, defaultPort: string = '5000') => {
    const match = url.match(/:(\d+)\//);
    return match ? match[1] : defaultPort;
  };

const handleFileUpload = async (feedId: string, port: string, file: File) => {
  if (!file) return;
  setUploadingFeeds((prev) => ({ ...prev, [feedId]: true }));
  setUploadStatus((prev) => ({ ...prev, [feedId]: `Uploading ${file.name}...` }));

  const formData = new FormData();
  formData.append('file', file);

  // Dynamically target the correct port's tunnel when deployed, or localhost during local dev
  const uploadBase = PORT_TUNNELS[port] || `http://127.0.0.1:${port}`;

  try {
    const response = await fetch(`${uploadBase}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      setUploadStatus((prev) => ({ ...prev, [feedId]: `Hot-swapped: ${file.name}` }));
      handleRetryFeed(feedId);
    } else {
      setUploadStatus((prev) => ({ ...prev, [feedId]: 'Upload failed on edge node' }));
    }
  } catch (err) {
    console.error(`Failed to upload media to edge port ${port}:`, err);
    setUploadStatus((prev) => ({ ...prev, [feedId]: 'Edge server unreachable' }));
  } finally {
    setUploadingFeeds((prev) => ({ ...prev, [feedId]: false }));
    setTimeout(() => {
      setUploadStatus((prev) => ({ ...prev, [feedId]: '' }));
    }, 4000);
  }
};

  const findMatchedZone = (feed: CCTVFeed): VenueZone | null => {
    if (!zones || zones.length === 0) return null;
    const camNum = feed.id.replace(/\D/g, '');
    return zones.find((z) => {
      const zid = (z.id || '').toLowerCase();
      const zcode = (z.code || '').toLowerCase();
      const targetId = (feed.zoneId || '').toLowerCase();
      if (targetId && (zid === targetId || zcode === targetId)) return true;
      if (camNum) {
        const num = parseInt(camNum, 10);
        if (zid.includes(`z-${num}`) || zid.includes(`z-0${num}`) || zcode.includes(`z-${num}`) || zcode.includes(`z-0${num}`)) {
          return true;
        }
      }
      return false;
    }) || null;
  };

  const getRiskBadge = (riskLevel: string = 'safe') => {
    switch (riskLevel) {
      case 'critical': return 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse';
      case 'warning': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'caution': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'safe':
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 font-body text-slate-800 bg-slate-50/50 min-h-full">
      
      {/* ── Header Section ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-60 pointer-events-none" />
        
        <div className="flex flex-col gap-1.5 relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="p-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-lg shadow-inner">
              <Activity className="w-4 h-4" />
            </span>
            <span className="font-mono-num text-[11px] font-extrabold tracking-widest text-indigo-600 uppercase">
              Edge Node Active
            </span>
          </div>
          <h1 className="font-heading font-black text-3xl md:text-4xl text-slate-900 tracking-tight">
            YOLO11 Vision Matrix
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl leading-relaxed mt-1">
            Real-time optical sensors streaming multi-port MJPEG video with live crowd telemetry, velocity vectors, and neural detection.
          </p>
        </div>

        <div className="flex items-center relative z-10">
          <button
            onClick={() => setShowDetections(!showDetections)}
            className={`w-full lg:w-auto px-5 py-3 rounded-2xl border text-sm font-bold flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-95 ${
              showDetections
                ? 'bg-slate-900 border-slate-800 text-white shadow-lg shadow-slate-900/20'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className={`w-4 h-4 ${showDetections ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>AI Bounding Boxes: {showDetections ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* ── Camera Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 xl:gap-8">
        {filteredFeeds.map((feed) => {
          const port = getPortFromUrl(feed.imageUrl);
          const matchedZone = findMatchedZone(feed);
          const isOffline = failedFeeds[feed.id];
          const isUploading = uploadingFeeds[feed.id];
          const currentStatus = uploadStatus[feed.id];
          const cacheBuster = streamCacheBusters[feed.id];
          
          const rawUrl = resolveStreamUrl(feed.imageUrl, feed.id);
          const streamUrl = cacheBuster ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${cacheBuster}` : rawUrl;

          const headcount = matchedZone?.currentHeadcount || feed.personCount || 0;
          const density = matchedZone?.density || (feed as any).density || 0;
          const riskLevel = matchedZone?.riskLevel || 'safe';

          return (
            <div
              key={feed.id}
              className="group bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col relative"
            >
              {/* Card Header */}
              <div className="px-5 py-4 bg-white flex items-center justify-between z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className={`absolute w-3.5 h-3.5 rounded-full opacity-30 ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-ping'}`} />
                    <span className={`relative w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-heading font-black text-sm sm:text-base text-slate-900 truncate tracking-tight">{feed.name}</span>
                    {currentStatus ? (
                      <span className="text-[10px] text-indigo-600 font-mono font-bold animate-pulse truncate mt-0.5">
                        {currentStatus}
                      </span>
                    ) : (
                      <span className="text-[10px] sm:text-[11px] font-mono-num text-slate-400 font-semibold truncate mt-0.5">
                        PORT {port} · {feed.fps} FPS
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Risk Badge */}
                <div className="shrink-0 ml-3">
                  <span className={`px-3 py-1.5 rounded-lg border font-bold uppercase text-[9px] sm:text-[10px] tracking-wider shadow-sm whitespace-nowrap ${
                    isOffline ? 'bg-slate-100 border-slate-200 text-slate-500' : getRiskBadge(riskLevel)
                  }`}>
                    {isOffline ? 'OFFLINE' : `ZONE ${matchedZone?.code || 'OK'}`}
                  </span>
                </div>
              </div>

              {/* Video Stream Area */}
              <div className="relative aspect-video bg-slate-900 w-full overflow-hidden border-y border-slate-200 animate-bounce-top">
                {isOffline ? (
                  <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3 text-center p-6">
                    <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mb-1 shadow-inner">
                      <Server className="w-6 h-6 text-rose-500/80" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-heading font-bold text-sm text-slate-200 tracking-wide">Signal Lost</span>
                      <span className="text-[10px] font-mono-num text-slate-500">Awaiting Edge Node on Port {port}</span>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleRetryFeed(feed.id)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-[11px] font-bold text-white flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                      <label className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95">
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {isUploading ? 'Uploading...' : 'Hot-Swap'}
                        <input
                          type="file"
                          accept="video/*,image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) handleFileUpload(feed.id, port, e.target.files[0]);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : (
                  <img
                    src={streamUrl}
                    alt={feed.name}
                    onError={() => handleImageError(feed.id)}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* YOLO Bounding Boxes Overlay */}
                {showDetections && !isOffline && (
                  <div className="absolute inset-0 p-2 pointer-events-none">
                    {feed.yoloDetections?.map((det) => (
                      <div
                        key={det.id}
                        style={{
                          left: `${det.bbox.x}%`,
                          top: `${det.bbox.y}%`,
                          width: `${det.bbox.width}%`,
                          height: `${det.bbox.height}%`,
                        }}
                        className={`absolute border-2 rounded-[3px] transition-all duration-75 ${
                          det.type === 'backlog'
                            ? 'border-rose-500 bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.3)]'
                            : det.type === 'velocity_anomaly'
                            ? 'border-amber-400 bg-amber-400/20 shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                            : 'border-emerald-400 bg-emerald-400/10'
                        }`}
                      >
                        <span className="absolute -top-5 left-[-2px] bg-black/80 backdrop-blur-md text-[9px] font-mono-num px-1.5 py-0.5 rounded text-white font-bold whitespace-nowrap shadow-sm tracking-wide">
                          {det.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hover Glassmorphism Controls */}
                {!isOffline && (
                  <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setSelectedFeed(feed)}
                      className="p-3.5 bg-white/95 backdrop-blur-md text-slate-900 rounded-full shadow-2xl hover:bg-white transition-transform hover:scale-110 cursor-pointer"
                      title="Expand Feed"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <label
                      className="p-3.5 bg-indigo-600/95 backdrop-blur-md text-white rounded-full shadow-2xl hover:bg-indigo-500 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center"
                      title="Hot-Swap Video File"
                    >
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      <input
                        type="file"
                        accept="video/*,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) handleFileUpload(feed.id, port, e.target.files[0]);
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Stats Footer */}
              <div className="grid grid-cols-2 divide-x divide-slate-200/60 bg-slate-50 border-t border-slate-100 rounded-b-3xl">
                <div className="flex flex-col items-center justify-center py-4">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Headcount</span>
                  <span className={`font-mono-num font-black text-2xl leading-none ${isOffline ? 'text-slate-300' : 'text-slate-800'}`}>
                    {isOffline ? '--' : headcount}
                  </span>
                </div>

                <div className="flex flex-col items-center justify-center py-4">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Density</span>
                  <div className={`flex items-baseline gap-1 ${isOffline ? 'text-slate-300' : 'text-slate-800'}`}>
                    <span className="font-mono-num font-black text-2xl leading-none">
                      {isOffline || !matchedZone ? '--' : density.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">p/m²</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Expanded Feed Modal ── */}
      {selectedFeed && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 md:p-8 font-body animate-fadeIn">
          <div className="bg-slate-950 rounded-3xl max-w-6xl w-full overflow-hidden flex flex-col shadow-2xl border border-slate-800">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex flex-col">
                <h3 className="font-heading font-black text-xl text-white tracking-wide">
                  {selectedFeed.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono-num mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-800 rounded-md text-slate-300 font-bold border border-slate-700">
                    Port {getPortFromUrl(selectedFeed.imageUrl)}
                  </span>
                  <span>·</span>
                  <span className="uppercase tracking-wider font-semibold">{selectedFeed.location}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedFeed(null)}
                className="p-2.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-full transition-colors cursor-pointer border border-slate-700 hover:border-rose-500/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative w-full bg-black flex-1 aspect-video flex items-center justify-center">
              <img
                src={resolveStreamUrl(selectedFeed.imageUrl, selectedFeed.id)}
                alt={selectedFeed.name}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};