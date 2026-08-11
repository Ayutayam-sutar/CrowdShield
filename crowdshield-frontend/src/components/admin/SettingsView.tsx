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
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="p-6 flex flex-col gap-6 font-body text-slate-800">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-600" />
            <span>Edge Node Computing & System Settings</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure local AI processing nodes, offline queue synchronization daemon, and Bhashini API engines.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer border-none"
          >
            {isSaved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <RefreshCcw className="w-4 h-4" />}
            <span>{isSaved ? 'Settings Saved!' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      {/* Network Edge State Toggle Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center shrink-0 shadow-xs">
            <Server className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-bold text-base text-slate-800">
                Deployment Node Mode: <span className="uppercase text-sky-600">{networkMode} NODE</span>
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono-num uppercase border ${
                networkMode === 'edge' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-sky-50 text-sky-600 border-sky-100'
              }`}>
                {networkMode === 'edge' ? 'Zero Latency Active' : 'Cloud Hybrid'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Switching to Edge Node processes computer vision YOLO models locally on raspberry pi / jetson edge hardware without cloud dependency.
            </p>
          </div>
        </div>

        <button
          onClick={onToggleNetworkMode}
          className={`px-5 py-2.5 rounded-xl font-heading font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs border ${
            networkMode === 'edge'
              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
          }`}
        >
          <Wifi className="w-4 h-4" />
          <span>{networkMode === 'edge' ? 'Switch to Cloud API' : 'Enable Edge Compute'}</span>
        </button>
      </div>

      {/* Grid of Settings Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Computer Vision YOLO Model Settings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
          <h3 className="font-heading font-bold text-base text-slate-800 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-600" />
            <span>YOLO Vision Model Parameters</span>
          </h3>

          <div className="flex flex-col gap-3 mt-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-800">Person Detection Confidence Threshold</span>
              <span className="font-mono-num font-bold text-sky-600">{yoloConfidenceThreshold}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="95"
              value={yoloConfidenceThreshold}
              onChange={(e) => setYoloConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <span className="text-[11px] text-slate-500">
              Higher threshold reduces false positives during dense festival crowd overlap.
            </span>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-800">Hardware Acceleration</span>
            <span className="font-mono-num text-emerald-600 font-bold">NVIDIA CUDA Enabled</span>
          </div>
        </div>

        {/* Offline Sync Daemon */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
          <h3 className="font-heading font-bold text-base text-slate-800 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-600" />
            <span>Offline Sync & Buffer Manager</span>
          </h3>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-800">Auto-Sync Buffer Frequency</label>
            <select
              value={offlineSyncInterval}
              onChange={(e) => setOfflineSyncInterval(e.target.value)}
              className="p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-body text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              <option value="1s">1 second (Real-Time Ultra Latency)</option>
              <option value="5s">5 seconds (Recommended Balanced)</option>
              <option value="15s">15 seconds (Low Bandwidth Mode)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-800">IndexedDB Buffer Usage</span>
            <span className="font-mono-num text-slate-700 font-bold">12.4 MB / 500 MB</span>
          </div>
        </div>
      </div>
    </div>
  );
};
