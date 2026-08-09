import React, { useState, useEffect } from 'react';
import { NetworkMode } from '../../types';
import { HardDrive, Cloud, Server, Activity, Cpu, Database, Camera, WifiOff, RefreshCcw } from 'lucide-react';

interface EdgeSettingsViewProps {
  networkMode: NetworkMode;
  onToggleNetworkMode: () => void;
}

export const EdgeSettingsView: React.FC<EdgeSettingsViewProps> = ({
  networkMode,
  onToggleNetworkMode
}) => {
  // Mock live telemetry
  const [cpuLoad, setCpuLoad] = useState(42);
  const [gpuLoad, setGpuLoad] = useState(68);
  const [ramUsage, setRamUsage] = useState(14.2);
  const [inferenceLatency, setInferenceLatency] = useState(24);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuLoad(40 + Math.floor(Math.random() * 10));
      setGpuLoad(65 + Math.floor(Math.random() * 8));
      setRamUsage(14.0 + (Math.random() * 0.5));
      setInferenceLatency(22 + Math.floor(Math.random() * 6));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 flex flex-col gap-6 font-body text-white">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-heading font-bold text-2xl tracking-tight">
          Edge Infrastructure & Settings
        </h1>
        <p className="text-xs text-white/50">
          Manage local compute nodes, network resilience, and hardware telemetry.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Edge Isolated Mode & Ports */}
        <div className="flex flex-col gap-6">
          
          {/* Network Resilience Toggle */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                <WifiOff className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Network Resilience</h3>
                <p className="text-xs text-white/50">Simulate cloud outages by isolating the edge node.</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
              <div>
                <h4 className="font-bold text-sm">Edge Isolated Mode</h4>
                <p className="text-xs text-white/50 mt-1 max-w-xs">
                  Forces the system to rely strictly on the local SQLite DB and Redis cache, severing external cloud dependencies.
                </p>
              </div>
              <button 
                onClick={onToggleNetworkMode}
                className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${
                  networkMode === 'edge' ? 'bg-amber-500' : 'bg-white/20'
                }`}
              >
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                  networkMode === 'edge' ? 'translate-x-8' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {networkMode === 'edge' && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                <RefreshCcw className="w-4 h-4 text-amber-500 mt-0.5 animate-spin" />
                <div className="text-xs text-amber-200">
                  <span className="font-bold block text-amber-400 mb-1">LOCAL SQLITE & REDIS ACTIVE</span>
                  System is fully operational in disconnected mode. AI inferences are being written locally. Cloud sync is queued.
                </div>
              </div>
            )}
          </div>

          {/* Camera Ports */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#06b6d4]/10 text-[#06b6d4] rounded-xl">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Active Camera Ports</h3>
                <p className="text-xs text-white/50">Localhost RTSP streams feeding the inference engine.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {[5000, 5001, 5002, 5003].map(port => (
                <div key={port} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-white/50" />
                    <span className="font-mono-num text-sm text-white/80">localhost:{port}</span>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-[#22D3A6]/10 text-[#22D3A6] text-[10px] font-bold border border-[#22D3A6]/20 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22D3A6] animate-pulse" />
                    ONLINE
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: System Health & Hardware */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#7C6CFF]/10 text-[#7C6CFF] rounded-xl">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg">Hardware Telemetry</h3>
                <p className="text-xs text-white/50">Local Edge Node Diagnostic Stats</p>
              </div>
            </div>
            <span className="text-[10px] font-mono-num px-2 py-1 bg-white/5 rounded text-white/50 border border-white/10">NODE: EDGE-ALPHA-01</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-2">
              <span className="text-xs text-white/50 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> CPU Load</span>
              <span className="font-mono-num text-2xl font-bold text-white">{cpuLoad}%</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#06b6d4] h-full transition-all duration-500" style={{ width: `${cpuLoad}%` }} />
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-2">
              <span className="text-xs text-white/50 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> NVIDIA RTX 3060</span>
              <span className="font-mono-num text-2xl font-bold text-white">{gpuLoad}%</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#f43f5e] h-full transition-all duration-500" style={{ width: `${gpuLoad}%` }} />
              </div>
            </div>
          </div>

          <div className="p-4 bg-black/40 rounded-xl border border-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50">RAM Usage (32GB Total)</span>
              <span className="font-mono-num text-sm font-bold text-white">{ramUsage.toFixed(1)} GB</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#7C6CFF] h-full transition-all duration-500" style={{ width: `${(ramUsage/32)*100}%` }} />
            </div>
          </div>

          <div className="p-4 bg-[#f43f5e]/10 rounded-xl border border-[#f43f5e]/20 flex items-center justify-between mt-auto">
            <div>
              <h4 className="font-bold text-[#f43f5e] text-sm">YOLOv11 Inference Latency</h4>
              <p className="text-[10px] text-white/50 mt-1">Real-time object detection processing delay.</p>
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#f43f5e] flex items-baseline gap-1">
              {inferenceLatency} <span className="text-sm">ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
