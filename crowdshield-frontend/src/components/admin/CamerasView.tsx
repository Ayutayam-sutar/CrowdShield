import React, { useState } from 'react';
import { CCTVFeed, VenueZone } from '../../types';
import { 
  Video, 
  Cpu, 
  Eye, 
  Maximize2, 
  Camera, 
  Sliders, 
  ShieldCheck, 
  Activity,
  Layers,
  VideoOff,
  RefreshCw,
  AlertTriangle,
  Upload,
  Loader2
} from 'lucide-react';

interface CamerasViewProps {
  cctvFeeds: CCTVFeed[];
  zones?: VenueZone[];
}

export const CamerasView: React.FC<CamerasViewProps> = ({ cctvFeeds, zones = [] }) => {
  const [showDetections, setShowDetections] = useState(true);
  const [selectedFeed, setSelectedFeed] = useState<CCTVFeed | null>(null);
  const [failedFeeds, setFailedFeeds] = useState<Record<string, boolean>>({});
  const [streamCacheBusters, setStreamCacheBusters] = useState<Record<string, number>>({});
  const [uploadingFeeds, setUploadingFeeds] = useState<Record<string, boolean>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  const handleImageError = (feedId: string) => {
    setFailedFeeds((prev) => ({ ...prev, [feedId]: true }));
  };

  const handleRetryFeed = (feedId: string) => {
    setStreamCacheBusters((prev) => ({ ...prev, [feedId]: Date.now() }));
    setFailedFeeds((prev) => ({ ...prev, [feedId]: false }));
  };

  // Extract port from stream URL (e.g. http://localhost:5001/video_feed -> 5001)
  const getPortFromUrl = (url: string, defaultPort: string = '5000') => {
    const match = url.match(/:(\d+)\//);
    return match ? match[1] : defaultPort;
  };

  // Handle direct file upload to specific Edge Camera Node port
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
        // Instantly force stream reload
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

  // Match feed with live telemetry zone data
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
        return 'bg-[#FF3B5C]/15 text-[#FF3B5C] border-[#FF3B5C]/30 animate-pulse';
      case 'warning':
        return 'bg-[#FF7A45]/15 text-[#FF7A45] border-[#FF7A45]/30';
      case 'caution':
        return 'bg-[#FFB627]/15 text-[#FFB627] border-[#FFB627]/30';
      case 'safe':
      default:
        return 'bg-[#22D3A6]/15 text-[#22D3A6] border-[#22D3A6]/30';
    }
  };

  return (
    <div className="p-6 flex flex-col gap-6 font-body">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white tracking-tight">
            YOLO11 Edge Camera Vision Matrix
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time optical sensors streaming multi-port MJPEG video with live telemetry counters & neural detection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDetections(!showDetections)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              showDetections
                ? 'bg-[#7C6CFF]/15 border-[#7C6CFF]/40 text-[#7C6CFF]'
                : 'bg-white/5 border-white/10 text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>YOLO11 Bounding Boxes: {showDetections ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cctvFeeds.map((feed) => {
          const port = getPortFromUrl(feed.imageUrl);
          const matchedZone = findMatchedZone(feed);
          const isOffline = failedFeeds[feed.id];
          const isUploading = uploadingFeeds[feed.id];
          const currentStatus = uploadStatus[feed.id];
          const cacheBuster = streamCacheBusters[feed.id];
          const streamUrl = cacheBuster ? `${feed.imageUrl}?t=${cacheBuster}` : feed.imageUrl;

          const headcount = matchedZone ? matchedZone.currentHeadcount : (feed.personCount || 0);
          const density = matchedZone ? matchedZone.density : 0;
          const riskLevel = matchedZone ? matchedZone.riskLevel : 'safe';

          return (
            <div
              key={feed.id}
              className="bg-[#111827] border border-slate-800/80 rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(21,23,38,0.04)] flex flex-col"
            >
              {/* Feed Header */}
              <div className="p-3 bg-[#151726] text-white flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isOffline ? 'bg-[#FF3B5C]' : 'bg-[#22D3A6] animate-pulse'}`} />
                  <span className="font-heading font-bold text-sm">{feed.name}</span>
                  {currentStatus && (
                    <span className="text-[10px] bg-[#06b6d4]/20 text-[#06b6d4] px-2 py-0.5 rounded font-mono font-bold">
                      {currentStatus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 font-mono-num text-xs text-gray-400">
                  <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-bold text-white">Port {port}</span>
                  <span>·</span>
                  <span>{feed.fps} FPS</span>
                  <span>·</span>
                  <span>{feed.edgeNodeId}</span>
                </div>
              </div>

              {/* CCTV Stream Container */}
              <div className="relative aspect-video bg-black overflow-hidden group">
                {isOffline ? (
                  <div className="w-full h-full bg-[#151726] flex flex-col items-center justify-center gap-2.5 text-white p-6 text-center">
                    <VideoOff className="w-9 h-9 text-[#FF3B5C] animate-pulse" />
                    <span className="font-heading font-bold text-sm tracking-wide text-white">
                      Camera Offline - Awaiting Edge Feed
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded bg-[#FF3B5C]/15 border border-[#FF3B5C]/30 text-[#FF3B5C] font-mono-num font-bold text-xs">
                        Target Port {port}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => handleRetryFeed(feed.id)}
                        className="px-3.5 py-1.5 bg-[#2C7BE5] hover:bg-[#2C7BE5]/80 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-colors shadow-md"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Retry Stream</span>
                      </button>

                      {/* Direct Upload Fallback Trigger */}
                      <label className="px-3.5 py-1.5 bg-[#7C6CFF] hover:bg-[#7C6CFF]/80 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer transition-colors shadow-md">
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span>{isUploading ? 'Uploading...' : 'Hot-Swap Video'}</span>
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

                {/* Bounding Box Overlay */}
                {showDetections && !isOffline && (
                  <div className="absolute inset-0 p-2 pointer-events-none">
                    {feed.yoloDetections.map((det) => (
                      <div
                        key={det.id}
                        style={{
                          left: `${det.bbox.x}%`,
                          top: `${det.bbox.y}%`,
                          width: `${det.bbox.width}%`,
                          height: `${det.bbox.height}%`,
                        }}
                        className={`absolute border-2 ${
                          det.type === 'backlog'
                            ? 'border-[#FF3B5C] bg-[#FF3B5C]/20'
                            : det.type === 'velocity_anomaly'
                            ? 'border-[#FFB627] bg-[#FFB627]/20'
                            : 'border-[#22D3A6] bg-[#22D3A6]/10'
                        }`}
                      >
                        <span className="absolute -top-4 left-0 bg-black/80 text-[10px] font-mono-num px-1.5 py-0.5 rounded text-white font-bold whitespace-nowrap">
                          {det.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hover Controls Overlay */}
                {!isOffline && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    {/* Expand Feed Modal */}
                    <button
                      onClick={() => setSelectedFeed(feed)}
                      className="p-3 bg-white text-[#151726] rounded-full shadow-lg hover:bg-gray-100 transition-transform hover:scale-110 cursor-pointer"
                      title="Expand Feed"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>

                    {/* Hot-Swap Media File Upload Button */}
                    <label
                      className="p-3 bg-[#7C6CFF] text-white rounded-full shadow-lg hover:bg-[#6b58ff] transition-transform hover:scale-110 cursor-pointer flex items-center justify-center"
                      title="Hot-Swap Video Feed File"
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

              {/* CCTV Footer Stats - Real Telemetry */}
<div className="p-4 bg-[#151726] border-t border-white/10 flex items-center justify-between text-xs font-mono-num">
  <div className="flex items-center gap-5">
    <div>
      <span className="text-slate-400 block text-[10px] uppercase font-bold">Headcount</span>
      <span className={`font-bold text-sm ${isOffline ? 'text-slate-500' : 'text-slate-100'}`}>
        {isOffline ? '--' : headcount}
      </span>
    </div>
    <div>
      <span className="text-slate-400 block text-[10px] uppercase font-bold">Density</span>
      <span className={`font-bold text-sm ${isOffline ? 'text-slate-500' : 'text-slate-100'}`}>
        {isOffline || !matchedZone ? '--' : `${density.toFixed(1)} p/m²`}
      </span>
    </div>
    <div>
      <span className="text-[#5B5F73] block text-[10px] uppercase font-bold">Inference</span>
      <span className={`font-bold ${isOffline ? 'text-slate-500' : 'text-[#22D3A6]'}`}>
        {isOffline ? '--' : '8.4 ms'}
      </span>
    </div>
  </div>

  <div className="flex items-center gap-2">
    <span className={`px-2.5 py-1 rounded-lg border font-bold uppercase text-[10px] ${
      isOffline ? 'bg-white/5 border-white/10 text-slate-500' : getRiskBadge(riskLevel)
    }`}>
      {isOffline
        ? `Port ${port}: No Live Feed`
        : matchedZone
        ? `Zone ${matchedZone.code}: ${riskLevel}`
        : `Port ${port} Active`}
    </span>
  </div>
</div>
            </div>
          );
        })}
      </div>

      {/* Expanded Feed Modal */}
      {selectedFeed && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 p-4 font-body animate-fadeIn">
          <div className="bg-[#151726] border border-white/20 rounded-2xl max-w-4xl w-full overflow-hidden flex flex-col text-white">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-white">
                  {selectedFeed.name}
                </h3>
                <p className="text-xs text-gray-400 font-mono-num">
                  Location: {selectedFeed.location} · Stream: http://127.0.0.1:{getPortFromUrl(selectedFeed.imageUrl)}/video_feed
                </p>
              </div>
              <button
                onClick={() => setSelectedFeed(null)}
                className="px-3 py-1 bg-white/10 rounded-lg hover:bg-white/20 text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="relative aspect-video bg-black w-full overflow-hidden">
              <img
                src={selectedFeed.imageUrl}
                alt={selectedFeed.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};