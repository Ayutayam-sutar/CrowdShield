import React, { useState } from 'react';
import { NetworkMode } from '../../types';
import { Settings, Cpu, HardDrive, Wifi, Shield, RefreshCcw, Database, Server, CheckCircle2 } from 'lucide-react';

interface SettingsViewProps {
  networkMode: NetworkMode;
  onToggleNetworkMode: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  networkMode,
  onToggleNetworkMode,
}) => {
  const [offlineSyncInterval, setOfflineSyncInterval] = useState('5s');
  const [yoloConfidenceThreshold, setYoloConfidenceThreshold] = useState(75);
  const [bhashiniVoiceModel, setBhashiniVoiceModel] = useState('Bhashini-v2-HQ');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-6 flex flex-col gap-6 font-body">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-slate-100 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#2C7BE5]" />
            <span>Edge Node Computing & System Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure local AI processing nodes, offline queue synchronization daemon, and Bhashini API engines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-[#22D3A6]" /> : <RefreshCcw className="w-4 h-4" />}
            <span>{isSaved ? 'Settings Saved!' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Network Edge State Toggle Card */}
      <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 text-white flex items-center justify-center shrink-0 shadow-md">
            <Server className="w-6 h-6 text-[#22D3A6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-base text-slate-100">
                Deployment Node Mode: <span className="uppercase text-[#2C7BE5]">{networkMode} NODE</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono-num uppercase ${
                networkMode === 'edge' ? 'bg-[#22D3A6]/15 text-[#22D3A6]' : 'bg-[#2C7BE5]/15 text-[#2C7BE5]'
              }`}>
                {networkMode === 'edge' ? 'Zero Latency Active' : 'Cloud Hybrid'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Switching to Edge Node processes computer vision YOLO models locally on raspberry pi / jetson edge hardware without cloud dependency.
            </p>
          </div>
        </div>

        <button
          onClick={onToggleNetworkMode}
          className={`px-5 py-2.5 rounded-xl font-heading font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
            networkMode === 'edge'
              ? 'bg-[#22D3A6] text-[#151726] hover:bg-[#1ebf95]'
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span>{networkMode === 'edge' ? 'Switch to Cloud API' : 'Enable Edge Compute'}</span>
        </button>
      </div>

      {/* Grid of Settings Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Computer Vision YOLO Model Settings */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#2C7BE5]" />
            <span>YOLO Vision Model Parameters</span>
          </h3>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-100">Person Detection Confidence Threshold</span>
              <span className="font-mono-num font-bold text-[#2C7BE5]">{yoloConfidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={yoloConfidenceThreshold}
              onChange={(e) => setYoloConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-[#2C7BE5] cursor-pointer"
            />
            <span className="text-[11px] text-slate-400">
              Higher threshold reduces false positives during dense festival crowd overlap.
            </span>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-100">Hardware Acceleration</span>
            <span className="font-mono-num text-[#22D3A6] font-bold">NVIDIA CUDA Enabled</span>
          </div>
        </div>

        {/* Offline Sync Daemon */}
        <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
          <h3 className="font-heading font-bold text-base text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-[#7C6CFF]" />
            <span>Offline Sync & Buffer Manager</span>
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-100">Auto-Sync Buffer Frequency</label>
            <select
              value={offlineSyncInterval}
              onChange={(e) => setOfflineSyncInterval(e.target.value)}
              className="p-2.5 rounded-xl border border-white/10 bg-[#151726] text-xs font-body text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#2C7BE5]"
            >
              <option value="1s">1 second (Real-Time Ultra Latency)</option>
              <option value="5s">5 seconds (Recommended Balanced)</option>
              <option value="15s">15 seconds (Low Bandwidth Mode)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-100">IndexedDB Buffer Usage</span>
            <span className="font-mono-num text-slate-100 font-bold">12.4 MB / 500 MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
