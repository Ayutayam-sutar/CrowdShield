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
    { time: '04:40:02', level: 'INFO', msg: 'Bhashini Audio Synthesizer initialized Hindi & Odia voice buffers.' },
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
      <div className="bg-[#151726] border border-white/20 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden p-5 flex flex-col gap-4 text-white">
        <div className="flex justify-between items-center border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-[#22D3A6] font-heading font-bold text-base">
            <Terminal className="w-5 h-5" />
            <span>Edge Daemon System Logs (Live Stream)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-black/50 border border-white/10 p-3 rounded-xl font-mono-num text-xs flex flex-col gap-2 max-h-72 overflow-y-auto">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2 border-b border-white/5 pb-1.5 last:border-0">
              <span className="text-gray-500 text-[11px] shrink-0">{log.time}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                log.level.includes('CRITICAL') ? 'bg-[#FF3B5C] text-white' : log.level === 'WARN' ? 'bg-[#FFB627] text-[#151726]' : 'bg-[#2C7BE5] text-white'
              }`}>
                {log.level}
              </span>
              <span className="text-gray-200">{log.msg}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono-num">
          <span className="flex items-center gap-1 text-[#22D3A6]">
            <Cpu className="w-3.5 h-3.5" /> Edge CPU: 14% · RAM: 1.2GB / 8GB
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
