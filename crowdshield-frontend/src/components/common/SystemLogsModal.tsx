import React from 'react';
import { X, Terminal, Cpu, CheckCircle2, AlertTriangle } from 'lucide-react';

interface SystemLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isScenarioActive: boolean;
}

export const SystemLogsModal: React.FC<SystemLogsModalProps> = ({ isOpen, onClose, isScenarioActive }) => {
  if (!isOpen) return null;

  const logs = [
    { time: '04:48:12', level: 'CRITICAL', msg: 'Zone Z-03 density threshold exceeded (4.8 p/m² > 4.0 p/m²).' },
    { time: '04:47:50', level: 'INFO', msg: 'YOLO11 Edge Model v11.4 processed 120 FPS across 4 CCTV channels.' },
    { time: '04:45:10', level: 'WARN', msg: 'South Concourse flow rate degraded to 22 p/min.' },
    { time: '04:40:02', level: 'INFO', msg: 'Sarvam Audio Synthesizer initialized Hindi & Odia voice buffers.' },
    { time: '04:35:00', level: 'INFO', msg: 'Local SQLite DB synced 420 telemetry records with Redis buffer.' },
  ];

  if (isScenarioActive) {
    logs.unshift({
      time: new Date().toLocaleTimeString(),
      level: 'CRITICAL_EVENT',
      msg: 'STAMPEDE SIMULATION INJECTED: Predictive surge spike in Zone Z-03 (92% Risk Score).'
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden p-5 flex flex-col gap-4 text-slate-800">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-sky-600 font-heading font-bold text-base">
            <Terminal className="w-5 h-5" />
            <span>Edge Daemon System Logs (Live Stream)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono-num text-xs flex flex-col gap-2 max-h-72 overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2 border-b border-slate-100 pb-1.5 last:border-0">
              <span className="text-slate-400 text-[11px] shrink-0">{log.time}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-white ${
                log.level.includes('CRITICAL') ? 'bg-rose-600' : log.level === 'WARN' ? 'bg-amber-500' : 'bg-sky-600'
              }`}>
                {log.level}
              </span>
              <span className="text-slate-700">{log.msg}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-num">
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <Cpu className="w-3.5 h-3.5" /> Edge CPU: 14% · RAM: 1.2GB / 8GB
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
