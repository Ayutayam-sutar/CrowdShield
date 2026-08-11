import React, { useState, useEffect, useCallback } from 'react';
import {
  Download, AlertTriangle, CheckCircle2, Sparkles, X, Copy, Check, FileText, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import api from '../../utils/api';

interface HistoricalPoint { hour: string; footfall: number; bottlenecks: number; }
interface AuditLog {
  id: string;
  alertId: string;
  timestamp: string;
  zone: string;
  peak_density: string;
  intervention: string;
  resolution_time: string;
}

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

export const AnalyticsView: React.FC = () => {
  const [history, setHistory] = useState<FetchState<HistoricalPoint[]>>({ data: null, loading: true, error: null });
  const [logs, setLogs] = useState<FetchState<AuditLog[]>>({ data: null, loading: true, error: null });

  const [summaryModal, setSummaryModal] = useState<{ alertId: string; text: string; loading: boolean; error: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadHistory = useCallback(async () => {
    setHistory((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<HistoricalPoint[]>('/analytics/history');
      setHistory({ data: res.data, loading: false, error: null });
    } catch (err: any) {
      setHistory({ data: null, loading: false, error: err?.response?.data?.detail || 'Failed to load historical analytics.' });
    }
  }, []);

  const loadLogs = useCallback(async () => {
    setLogs((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<AuditLog[]>('/analytics/audit-logs');
      setLogs({ data: res.data, loading: false, error: null });
    } catch (err: any) {
      setLogs({ data: null, loading: false, error: err?.response?.data?.detail || 'Failed to load audit logs.' });
    }
  }, []);

  useEffect(() => { loadHistory(); loadLogs(); }, [loadHistory, loadLogs]);

  const handleExportCSV = () => {
    if (!logs.data || logs.data.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8,"
      + "Log ID,Timestamp,Zone,Peak Density,Intervention Applied,Resolution Time\n"
      + logs.data.map(e => `"${e.id}","${e.timestamp}","${e.zone}","${e.peak_density}","${e.intervention}","${e.resolution_time}"`).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `CrowdShield_Incident_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateSummary = async (log: AuditLog) => {
    setSummaryModal({ alertId: log.alertId, text: '', loading: true, error: null });
    try {
      const response = await api.post(`/analytics/generate-summary/${log.alertId}`);
      setSummaryModal({ alertId: log.alertId, text: response.data.summary, loading: false, error: null });
    } catch (err: any) {
      const detail = err?.response?.status === 401 || err?.response?.status === 403
        ? 'Admin authentication required to generate this summary.'
        : err?.response?.data?.detail || 'Summary generation failed. The AI backend may be unavailable.';
      setSummaryModal({ alertId: log.alertId, text: '', loading: false, error: detail });
    }
  };

  const handleCopySummary = () => {
    if (!summaryModal?.text) return;
    navigator.clipboard.writeText(summaryModal.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chartData = history.data ?? [];
  const peakFootfall = chartData.length ? Math.max(...chartData.map(d => d.footfall)) : 0;
  const maxBottlenecks = chartData.length ? Math.max(...chartData.map(d => d.bottlenecks)) : 0;

  return (
    <div className="p-6 flex flex-col gap-6 font-body text-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl tracking-tight text-slate-800">Analytics & Historic Incident Intelligence</h1>
          <p className="text-xs text-slate-500 mt-1">Live footfall trends, bottleneck frequency, and audit exports — last 24 hours.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadHistory(); loadLogs(); }}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-heading font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!logs.data || logs.data.length === 0}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer border-none"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Historical charts */}
      {history.loading ? (
        <div className="flex items-center justify-center h-64 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex flex-col items-center gap-3 text-indigo-600">
            <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
            <span className="font-heading font-bold animate-pulse text-sm">Fetching telemetry history...</span>
          </div>
        </div>
      ) : history.error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-center gap-3 text-rose-600 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{history.error}</span>
          <button onClick={loadHistory} className="ml-auto px-3 py-1.5 bg-rose-200 hover:bg-rose-300 border border-rose-300 text-rose-700 rounded-lg text-xs font-bold">Retry</button>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500">
          No telemetry recorded in the last 24 hours yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-800">Hourly Footfall Surge Pattern</h3>
                <p className="text-xs text-slate-500">Max headcount per hour, from live TelemetryLog.</p>
              </div>
              <span className="font-mono-num text-xs font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-100">Peak: {peakFootfall.toLocaleString()}</span>
            </div>
            <div className="h-64 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="footfallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="rgba(15,23,42,0.4)" fontSize={11} tickLine={false} />
                  <YAxis stroke="rgba(15,23,42,0.4)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="footfall" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#footfallGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-800">Bottleneck Frequency</h3>
                <p className="text-xs text-slate-500">Warning/critical alerts opened per hour.</p>
              </div>
              <span className="font-mono-num text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">Max: {maxBottlenecks}</span>
            </div>
            <div className="h-64 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" stroke="rgba(15,23,42,0.4)" fontSize={11} tickLine={false} />
                  <YAxis stroke="rgba(15,23,42,0.4)" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', color: '#1e293b', fontSize: '12px' }} />
                  <Bar dataKey="bottlenecks" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Audit log */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-slate-800">Past Incident & Dispatch Audit Log</h3>
          <span className="text-xs text-slate-500 font-mono-num">{logs.data ? `${logs.data.length} entries` : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body text-slate-700">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] bg-slate-50">
                <th className="py-3 px-3">Log ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Zone</th>
                <th className="py-3 px-3">Peak Density</th>
                <th className="py-3 px-3">Intervention Applied</th>
                <th className="py-3 px-3">Resolution Time</th>
                <th className="py-3 px-3 text-right">AI Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.loading ? (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400">Loading audit logs...</td></tr>
              ) : logs.error ? (
                <tr><td colSpan={7} className="py-6 text-center text-rose-600 font-semibold">
                  {logs.error} <button onClick={loadLogs} className="underline ml-2 hover:text-rose-700">Retry</button>
                </td></tr>
              ) : !logs.data || logs.data.length === 0 ? (
                <tr><td colSpan={7} className="py-6 text-center text-slate-400">No past incidents found.</td></tr>
              ) : (
                logs.data.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono-num font-bold text-slate-800">{log.id}</td>
                    <td className="py-3 px-3 font-mono-num text-slate-600">{log.timestamp}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{log.zone}</td>
                    <td className="py-3 px-3 font-mono-num text-rose-600 font-bold">{log.peak_density}</td>
                    <td className="py-3 px-3 text-slate-700">{log.intervention}</td>
                    <td className="py-3 px-3 font-mono-num text-emerald-600 font-bold">{log.resolution_time}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleGenerateSummary(log)}
                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-600 rounded-lg text-[11px] font-bold flex items-center gap-1 ml-auto cursor-pointer transition-all"
                      >
                        <Sparkles className="w-3 h-3" /> Summarize
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Summary Modal */}
      {summaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-800">Gen-AI Post-Incident Summary</h3>
                  <p className="text-[11px] text-slate-500 font-mono-num">Alert {summaryModal.alertId}</p>
                </div>
              </div>
              <button onClick={() => setSummaryModal(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-3 font-mono-num text-xs leading-relaxed text-slate-700 min-h-[120px]">
              <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[11px] border-b border-slate-200 pb-2">
                <FileText className="w-3.5 h-3.5" /> Incident Report
              </div>
              {summaryModal.loading ? (
                <div className="flex items-center justify-center p-8 gap-3 text-indigo-600">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="font-heading font-bold animate-pulse">Generating via Sentinel LLM...</span>
                </div>
              ) : summaryModal.error ? (
                <div className="flex items-start gap-2 text-[#FF3B5C] p-4">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{summaryModal.error}</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap">{summaryModal.text}</div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleCopySummary}
                disabled={!summaryModal.text}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl font-heading font-bold text-xs flex items-center gap-2 border border-slate-200 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Summary Text'}</span>
              </button>
              <button onClick={() => setSummaryModal(null)} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-heading font-bold text-xs border-none cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};