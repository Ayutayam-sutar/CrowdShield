import React, { useState, useEffect } from 'react';
import { X, Terminal, Cpu, Loader2 } from 'lucide-react';
import api from '../../utils/api';
import { wsService } from '../../services/websocket';

interface SystemLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isScenarioActive: boolean;
}

interface LogEntry {
  time: string;
  level: 'CRITICAL' | 'WARN' | 'INFO' | 'CRITICAL_EVENT';
  msg: string;
}

export const SystemLogsModal: React.FC<SystemLogsModalProps> = ({ isOpen, onClose, isScenarioActive }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 1. Fetch live system logs from backend on modal open
  useEffect(() => {
    if (!isOpen) return;

    const fetchLiveLogs = async () => {
      setIsLoading(true);
      try {
        // Fetch recent system alerts/history from your backend
        const response = await api.get('/analytics/history');
        if (response.data && Array.isArray(response.data)) {
          const fetchedLogs: LogEntry[] = response.data.slice(-10).map((item: any) => ({
            time: item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
            level: item.risk_level === 'CRITICAL' || item.severity === 'HIGH' ? 'CRITICAL' : 'INFO',
            msg: item.message || item.description || `Telemetry update for zone ${item.zone_id || 'unknown'}`,
          }));
          setLogs(fetchedLogs.reverse());
        }
      } catch (err) {
        console.error('Failed to fetch backend logs, using live stream buffer:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLiveLogs();
  }, [isOpen]);

  // 2. Listen to real-time WebSockets to push live daemon logs instantly
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = wsService.subscribe((data: any) => {
      const newLogTime = new Date().toLocaleTimeString();
      let newEntry: LogEntry | null = null;

      if (data.event === 'TELEMETRY_UPDATE' || data.type === 'telemetry') {
        newEntry = {
          time: newLogTime,
          level: data.density > 3.5 ? 'WARN' : 'INFO',
          msg: `Live Edge Telemetry: Zone ${data.zone_id || 'Campus'} density at ${data.density || 0} p/m² (${data.headcount || 0} pax).`,
        };
      } else if (data.event === 'INTERVENTION_DISPATCHED' || data.event === 'PA_BROADCAST') {
        newEntry = {
          time: newLogTime,
          level: 'WARN',
          msg: `PA Broadcast Dispatched: "${data.announcementText || data.message || 'Emergency voice broadcast'}"`,
        };
      } else if (data.event === 'HAZARD_SUBMITTED' || data.event === 'STAMPEDE_ALERT') {
        newEntry = {
          time: newLogTime,
          level: 'CRITICAL',
          msg: `CRITICAL ALERT: High density or hazard flag reported in ${data.location || 'Zone'}!`,
        };
      }

      if (newEntry) {
        setLogs((prev) => [newEntry!, ...prev.slice(0, 19)]); // Keep last 20 logs
      }
    });

    return () => unsubscribe();
  }, [isOpen]);

  // 3. Inject scenario alert if active
  useEffect(() => {
    if (isScenarioActive && isOpen) {
      setLogs((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          level: 'CRITICAL_EVENT',
          msg: 'STAMPEDE SIMULATION INJECTED: Predictive surge spike detected across active campus zones.',
        },
        ...prev,
      ]);
    }
  }, [isScenarioActive, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden p-5 flex flex-col gap-4 text-slate-800">
        <div className="flex justify-between items-center border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2 text-sky-600 font-heading font-bold text-base">
            <Terminal className="w-5 h-5" />
            <span>Edge Daemon System Logs (Live Stream)</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-mono-num text-xs flex flex-col gap-2 max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
              <span>Connecting to live edge telemetry stream...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              No live daemon events recorded yet. Awaiting camera telemetry...
            </div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2 border-b border-slate-100 pb-1.5 last:border-0">
                <span className="text-slate-400 text-[11px] shrink-0">{log.time}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 text-white ${
                    log.level.includes('CRITICAL')
                      ? 'bg-rose-600'
                      : log.level === 'WARN'
                      ? 'bg-amber-500'
                      : 'bg-sky-600'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-slate-700 leading-snug">{log.msg}</span>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-num">
          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
            <Cpu className="w-3.5 h-3.5" /> Edge Engine: Active · Sync: WebSockets + Redis
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