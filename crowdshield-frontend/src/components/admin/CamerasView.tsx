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
  X
} from 'lucide-react';

interface CamerasViewProps {
  cctvFeeds: CCTVFeed[];
  zones?: VenueZone[];
  selectedVenue?: VenueInfo | null;
}

export const CamerasView: React.FC<CamerasViewProps> = ({ cctvFeeds, zones = [], selectedVenue }) => {
  const [showDetections, setShowDetections] = useState(true);
  const [selectedFeed, setSelectedFeed] = useState<CCTVFeed | null>(null);
  const [failedFeeds, setFailedFeeds] = useState<Record<string, boolean>>({});
  const [streamCacheBusters, setStreamCacheBusters] = useState<Record<string, number>>({});
  const [uploadingFeeds, setUploadingFeeds] = useState<Record<string, boolean>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  const filteredFeeds = useMemo(() => {
    const isKalingaSelected = selectedVenue?.id?.includes('kalinga') || selectedVenue?.name?.includes('Kalinga');
    
    return cctvFeeds.filter((feed) => {
      const isKalingaFeed = (feed.zoneId || '').toLowerCase().startsWith('ks_') || feed.id.startsWith('ks_');
      if (isKalingaSelected) {
        return isKalingaFeed;
      }
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

    try {
      const response = await fetch(`http://127.0.0.1:${port}/upload`, {
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
      case 'critical':
        return 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse';
      case 'warning':
        return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'caution':
        return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'safe':
      default:
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
  };

  return (
    <div className="p-6 flex flex-col gap-8 font-body text-slate-800 bg-slate-50/50 min-h-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity className="w-5 h-5" />
            </span>
            <span className="font-mono-num text-xs font-bold tracking-wider text-indigo-600 uppercase">
              Edge Node Active
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-slate-900 tracking-tight">
            YOLO11 Vision Matrix
          </h1>
          <p className="text-sm text-slate-500 max-w-xl">
            Real-time optical sensors streaming multi-port MJPEG video with live crowd telemetry, velocity vectors, and neural detection.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <button
            onClick={() => setShowDetections(!showDetections)}
            className={`px-4 py-2.5 rounded-xl border text-sm font-bold flex items-center gap-2.5 transition-all shadow-sm cursor-pointer ${
              showDetections
                ? 'bg-indigo-600 border-indigo-700 text-white hover:bg-indigo-700 hover:shadow-md'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layers className={`w-4 h-4 ${showDetections ? 'text-indigo-200' : 'text-slate-400'}`} />
            <span>AI Bounding Boxes: {showDetections ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
        {filteredFeeds.map((feed) => {
          const port = getPortFromUrl(feed.imageUrl);
          const matchedZone = findMatchedZone(feed);
          const isOffline = failedFeeds[feed.id];
          const isUploading = uploadingFeeds[feed.id];
          const currentStatus = uploadStatus[feed.id];
          const cacheBuster = streamCacheBusters[feed.id];
          const streamUrl = cacheBuster ? `${feed.imageUrl}?t=${cacheBuster}` : feed.imageUrl;

        // Check the zone first, then fall back to the live feed object itself
          const headcount = matchedZone?.currentHeadcount || feed.personCount || 0;
          const density = matchedZone?.density || (feed as any).density || 0;
          const riskLevel = matchedZone?.riskLevel || 'safe';
          
          // AGGRESSIVE VELOCITY CATCH-ALL:
          const rawVelocity = matchedZone?.avg_speed || matchedZone?.flowRate || (feed as any).avg_speed || (feed as any).flowRate || 0;

          return (
            <div
              key={feed.id}
              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
            >
              {/* Card Header */}
              <div className="px-4 py-3 bg-white flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center">
                    <span className={`absolute w-3 h-3 rounded-full opacity-40 ${isOffline ? 'bg-rose-500' : 'bg-emerald-500 animate-ping'}`} />
                    <span className={`relative w-2 h-2 rounded-full ${isOffline ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                  </div>
                  <span className="font-heading font-bold text-sm text-slate-800">{feed.name}</span>
                  {currentStatus && (
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                      {currentStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 font-mono-num text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">Port {port}</span>
                  <span className="bg-slate-50 px-2 py-1 rounded border border-slate-100">{feed.fps} FPS</span>
                </div>
              </div>

              {/* Video Stream Container */}
              <div className="relative aspect-video bg-slate-900 w-full overflow-hidden">
                {isOffline ? (
                  <div className="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center gap-3 text-center p-6 border-b border-slate-200">
                    <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center mb-1">
                      <VideoOff className="w-7 h-7 text-rose-500 animate-pulse" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="font-heading font-bold text-sm text-slate-800">Connection Lost</span>
                      <span className="text-xs text-slate-500">Awaiting edge feed on target port {port}</span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => handleRetryFeed(feed.id)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 rounded-lg text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>

                      <label className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors border border-indigo-200">
                        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        <span>{isUploading ? 'Uploading...' : 'Hot-Swap'}</span>
                        <input
                          type="file"
                          accept="video/*,image/*"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(feed.id, port, e.target.files[0]);
                            }
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
                        className={`absolute border-2 rounded-[2px] transition-all duration-75 ${
                          det.type === 'backlog'
                            ? 'border-rose-500 bg-rose-500/20'
                            : det.type === 'velocity_anomaly'
                            ? 'border-amber-400 bg-amber-400/20'
                            : 'border-emerald-400 bg-emerald-400/10'
                        }`}
                      >
                        <span className="absolute -top-5 left-[-2px] bg-black/80 backdrop-blur-sm text-[9px] font-mono-num px-1.5 py-0.5 rounded-sm text-white font-bold whitespace-nowrap shadow-sm">
                          {det.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hover Glassmorphism Controls */}
                {!isOffline && (
                  <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-4">
                    <button
                      onClick={() => setSelectedFeed(feed)}
                      className="p-3.5 bg-white/90 backdrop-blur text-slate-800 rounded-full shadow-xl hover:bg-white transition-transform hover:scale-110 cursor-pointer"
                      title="Expand Feed"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>

                    <label
                      className="p-3.5 bg-indigo-600/90 backdrop-blur text-white rounded-full shadow-xl hover:bg-indigo-600 transition-transform hover:scale-110 cursor-pointer flex items-center justify-center"
                      title="Hot-Swap Video File"
                    >
                      {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                      <input
                        type="file"
                        accept="video/*,image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(feed.id, port, e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Premium Footer Stats Area (Inference Removed, Velocity Added) */}
              <div className="px-5 py-4 bg-white flex items-center justify-between">
                
                {/* 3-Column Metrics Grid */}
                <div className="flex items-center gap-6">
                  {/* Headcount */}
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-0.5">Headcount</span>
                    <span className={`font-mono-num font-extrabold text-lg leading-none ${isOffline ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isOffline ? '--' : headcount}
                    </span>
                  </div>

                  {/* Density */}
                  <div className="flex flex-col border-l border-slate-100 pl-6">
                    <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-0.5">Density</span>
                    <span className={`font-mono-num font-extrabold text-lg leading-none ${isOffline ? 'text-slate-300' : 'text-slate-800'}`}>
                      {isOffline || !matchedZone ? '--' : density.toFixed(1)} <span className="text-[10px] text-slate-400 font-semibold ml-0.5">p/m²</span>
                    </span>
                  </div>

                  
                  {/* Velocity */}
                  <div className="flex flex-col border-l border-slate-100 pl-6">
                    <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider mb-0.5">Velocity</span>
                    <span className={`font-mono-num font-extrabold text-lg leading-none ${isOffline ? 'text-slate-300' : 'text-sky-500'}`}>
                      {isOffline ? '--' : Number(rawVelocity).toFixed(2)} <span className="text-[10px] text-slate-400 font-semibold ml-0.5">m/s</span>
                    </span>
                  </div>
                </div>

                {/* Risk Status Badge */}
                <div className="shrink-0 ml-4">
                  <span className={`px-3 py-1.5 rounded-lg border font-bold uppercase text-[10px] tracking-wide whitespace-nowrap shadow-sm ${
                    isOffline ? 'bg-slate-50 border-slate-200 text-slate-400' : getRiskBadge(riskLevel)
                  }`}>
                    {isOffline
                      ? `NO FEED`
                      : matchedZone
                      ? `ZONE ${matchedZone.code}: ${riskLevel}`
                      : `PORT ${port} ACTIVE`}
                  </span>
                </div>

              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Feed Modal (Refined) */}
      {selectedFeed && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 md:p-8 font-body animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-5xl w-full overflow-hidden flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex flex-col">
                <h3 className="font-heading font-extrabold text-xl text-slate-900">
                  {selectedFeed.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono-num mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-bold">Port {getPortFromUrl(selectedFeed.imageUrl)}</span>
                  <span>·</span>
                  <span>{selectedFeed.location}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedFeed(null)}
                className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative w-full bg-black flex-1 aspect-video">
              <img
                src={selectedFeed.imageUrl}
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