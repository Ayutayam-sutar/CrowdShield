import React, { useState } from 'react';
import { CCTVFeed } from '../../types';
import { 
  Video, 
  Cpu, 
  Eye, 
  Maximize2, 
  Camera, 
  Sliders, 
  ShieldCheck, 
  Activity,
  Layers
} from 'lucide-react';

interface CamerasViewProps {
  cctvFeeds: CCTVFeed[];
}

export const CamerasView: React.FC<CamerasViewProps> = ({ cctvFeeds }) => {
  const [showDetections, setShowDetections] = useState(true);
  const [selectedFeed, setSelectedFeed] = useState<CCTVFeed | null>(null);

  return (
    <div className="p-6 flex flex-col gap-6 font-body">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-[#151726] tracking-tight">
            YOLO11 Edge Camera Vision Matrix
          </h1>
          <p className="text-xs text-[#5B5F73] mt-1">
            Real-time optical sensors with neural crowd detection bounding boxes & density counters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDetections(!showDetections)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              showDetections
                ? 'bg-[#7C6CFF]/15 border-[#7C6CFF]/40 text-[#7C6CFF]'
                : 'bg-white border-[#E7E5DD] text-[#5B5F73]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>YOLO11 Bounding Boxes: {showDetections ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cctvFeeds.map((feed) => (
          <div
            key={feed.id}
            className="bg-white border border-[#E7E5DD] rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(21,23,38,0.04)] flex flex-col"
          >
            {/* Feed Header */}
            <div className="p-3 bg-[#151726] text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#22D3A6] animate-pulse" />
                <span className="font-heading font-bold text-sm">{feed.name}</span>
              </div>
              <div className="flex items-center gap-2 font-mono-num text-xs text-gray-400">
                <span>{feed.fps} FPS</span>
                <span>·</span>
                <span>{feed.edgeNodeId}</span>
              </div>
            </div>

            {/* CCTV Stream Container */}
            <div className="relative aspect-video bg-black overflow-hidden group">
              <img
                src={feed.imageUrl}
                alt={feed.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />

              {/* Bounding Box Overlay */}
              {showDetections && (
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

              {/* Controls Overlay on Hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  onClick={() => setSelectedFeed(feed)}
                  className="p-2.5 bg-white text-[#151726] rounded-full shadow-lg hover:bg-gray-100 transition-transform hover:scale-110 cursor-pointer"
                  title="Expand Feed"
                >
                  <Maximize2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* CCTV Footer Stats */}
            <div className="p-4 bg-[#FAFAF7] border-t border-[#E7E5DD] flex items-center justify-between text-xs font-mono-num">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[#5B5F73] block text-[10px] uppercase font-bold">Headcount</span>
                  <span className="font-bold text-sm text-[#151726]">{feed.personCount}</span>
                </div>
                <div>
                  <span className="text-[#5B5F73] block text-[10px] uppercase font-bold">Inference Latency</span>
                  <span className="font-bold text-[#22D3A6]">8.4 ms</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-[#2C7BE5]/10 text-[#2C7BE5] rounded-lg font-bold">
                  YOLO11 Active
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
