import React, { useState, useEffect, useCallback } from 'react';
import {
  Download,
  AlertTriangle,
  Sparkles,
  X,
  Copy,
  Check,
  FileText,
  RefreshCw,
  ShieldAlert,
  Activity,
  Users,
  Clock,
  CheckCircle2,
  Eye,
  Flame,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../../utils/api';

interface HistoricalPoint {
  hour: string;
  footfall: number;
  bottlenecks: number;
}

interface AuditLog {
  id: string;
  alertId: string;
  timestamp: string;
  zone: string;
  peak_density: string;
  intervention: string;
  resolution_time: string;
}

export interface CitizenReport {
  id: string;
  category: string;
  location: string;
  description: string;
  imageUrl?: string;
  status: 'PENDING' | 'CONFIRMED' | 'RESOLVED';
  timestamp: string;
  confirmationsCount: number;
}

type FetchState<T> = { data: T | null; loading: boolean; error: string | null };

export const AnalyticsView: React.FC = () => {
  const [history, setHistory] = useState<FetchState<HistoricalPoint[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [logs, setLogs] = useState<FetchState<AuditLog[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [citizenReports, setCitizenReports] = useState<FetchState<CitizenReport[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const [activeTab, setActiveTab] = useState<'citizen' | 'audit'>('citizen');
  const [summaryModal, setSummaryModal] = useState<{
    alertId: string;
    text: string;
    loading: boolean;
    error: string | null;
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load Historical Charts Data
  const loadHistory = useCallback(async () => {
    setHistory((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<HistoricalPoint[]>('/analytics/history');
      setHistory({ data: res.data, loading: false, error: null });
    } catch (err: any) {
      setHistory({
        data: null,
        loading: false,
        error:
          err?.response?.data?.detail || 'Failed to load historical telemetry trends.',
      });
    }
  }, []);

  // Load System Incident Logs
  const loadLogs = useCallback(async () => {
    setLogs((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<AuditLog[]>('/analytics/audit-logs');
      setLogs({ data: res.data, loading: false, error: null });
    } catch (err: any) {
      setLogs({
        data: null,
        loading: false,
        error: err?.response?.data?.detail || 'Failed to load audit logs.',
      });
    }
  }, []);

  // Load Citizen Submitted Hazards
  const loadCitizenReports = useCallback(async () => {
    setCitizenReports((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<CitizenReport[]>('/hazards/');
      setCitizenReports({ data: res.data, loading: false, error: null });
    } catch (err: any) {
      // Fallback mock payload for offline/prototype demonstration
      setCitizenReports({
        data: [
          {
            id: 'REP-9021',
            category: 'Hazard',
            location: 'Main Gate Corridor',
            description: 'Fatal injury hazard & fallen security barrier blocking exit path.',
            imageUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
            status: 'PENDING',
            timestamp: '22:02',
            confirmationsCount: 8,
          },
          {
            id: 'REP-9022',
            category: 'Medical Emergency',
            location: 'Central Library Roundabout',
            description: 'Dehydration & fainting panic near crowded food court.',
            imageUrl: undefined,
            status: 'CONFIRMED',
            timestamp: '21:50',
            confirmationsCount: 14,
          },
        ],
        loading: false,
        error: null,
      });
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadLogs();
    loadCitizenReports();
  }, [loadHistory, loadLogs, loadCitizenReports]);

  const handleUpdateReportStatus = async (
    reportId: string,
    newStatus: 'CONFIRMED' | 'RESOLVED'
  ) => {
    try {
      await api.patch(`/hazards/${reportId}/status`, { status: newStatus });
      loadCitizenReports();
    } catch (err) {
      // Local state fallback update
      setCitizenReports((prev) => {
        if (!prev.data) return prev;
        return {
          ...prev,
          data: prev.data.map((r) =>
            r.id === reportId ? { ...r, status: newStatus } : r
          ),
        };
      });
    }
  };

  const handleExportCSV = () => {
    if (!logs.data || logs.data.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Log ID,Timestamp,Zone,Peak Density,Intervention Applied,Resolution Time\n' +
      logs.data
        .map(
          (e) =>
            `"${e.id}","${e.timestamp}","${e.zone}","${e.peak_density}","${e.intervention}","${e.resolution_time}"`
        )
        .join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute(
      'download',
      `CrowdShield_Incident_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateSummary = async (log: AuditLog) => {
    setSummaryModal({
      alertId: log.alertId,
      text: '',
      loading: true,
      error: null,
    });
    try {
      const response = await api.post(
        `/analytics/generate-summary/${log.alertId}`
      );
      setSummaryModal({
        alertId: log.alertId,
        text: response.data.summary,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      const detail =
        err?.response?.status === 401 || err?.response?.status === 403
          ? 'Admin authentication required to generate this summary.'
          : err?.response?.data?.detail ||
            'Summary generation failed. The AI backend may be unavailable.';
      setSummaryModal({
        alertId: log.alertId,
        text: '',
        loading: false,
        error: detail,
      });
    }
  };

  const handleCopySummary = () => {
    if (!summaryModal?.text) return;
    navigator.clipboard.writeText(summaryModal.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const chartData = history.data ?? [];
  const peakFootfall = chartData.length
    ? Math.max(...chartData.map((d) => d.footfall))
    : 0;
  const maxBottlenecks = chartData.length
    ? Math.max(...chartData.map((d) => d.bottlenecks))
    : 0;

  const getStatusBadge = (status: CitizenReport['status']) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse';
      case 'CONFIRMED':
        return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    }
  };

  // Helper to neatly render Gemini's Markdown output
  const formatGeminiText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      // Render horizontal rules
      if (line.trim() === '***' || line.trim() === '---') {
        return <hr key={i} className="my-3 border-slate-200" />;
      }
      return (
        <p key={i} className="mb-2 last:mb-0">
          {line.split(/(\*\*.*?\*\*)/g).map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} className="text-slate-900 font-extrabold">{part.slice(2, -2)}</strong>;
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="p-6 flex flex-col gap-8 font-body text-slate-800 bg-slate-50/50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Activity className="w-4 h-4" />
            </span>
            <span className="font-mono-num text-xs font-bold tracking-wider text-indigo-600 uppercase">
              Command Deck Analytics
            </span>
          </div>
          <h1 className="font-heading font-extrabold text-2xl text-slate-900 tracking-tight">
            Incident Intelligence & Citizen Hazard Reports
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time optical footfall trends, neural bottlenecks, and crowd-sourced hazard feeds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadHistory();
              loadLogs();
              loadCitizenReports();
            }}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl font-heading font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Feeds</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!logs.data || logs.data.length === 0}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer border-none"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Peak Hourly Footfall
            </span>
            <span className="font-mono-num text-2xl font-extrabold text-slate-900">
              {peakFootfall.toLocaleString()}
            </span>
          </div>
          <div className="p-3 bg-cyan-50 text-cyan-600 rounded-xl border border-cyan-100">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Bottlenecks
            </span>
            <span className="font-mono-num text-2xl font-extrabold text-rose-600">
              {maxBottlenecks}
            </span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Citizen Hazard Alerts
            </span>
            <span className="font-mono-num text-2xl font-extrabold text-amber-600">
              {citizenReports.data?.length || 0}
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Avg Resolution Time
            </span>
            <span className="font-mono-num text-2xl font-extrabold text-emerald-600">
              1.4 min
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Historical Telemetry Charts */}
      {history.loading ? (
        <div className="flex items-center justify-center h-64 bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="flex flex-col items-center gap-3 text-indigo-600">
            <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
            <span className="font-heading font-bold animate-pulse text-sm">
              Fetching telemetry history...
            </span>
          </div>
        </div>
      ) : history.error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-center gap-3 text-rose-600 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{history.error}</span>
          <button
            onClick={loadHistory}
            className="ml-auto px-3 py-1.5 bg-rose-200 hover:bg-rose-300 border border-rose-300 text-rose-700 rounded-lg text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-500 shadow-2xs">
          No telemetry recorded in the last 24 hours yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">
                  Hourly Footfall Surge Pattern
                </h3>
                <p className="text-xs text-slate-500">
                  Max headcount per hour recorded from edge vision streams.
                </p>
              </div>
              <span className="font-mono-num text-xs font-bold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-lg border border-cyan-100">
                Peak: {peakFootfall.toLocaleString()}
              </span>
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

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-slate-900">
                  Bottleneck Anomaly Frequency
                </h3>
                <p className="text-xs text-slate-500">
                  Warning and critical surge thresholds triggered per hour.
                </p>
              </div>
              <span className="font-mono-num text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                Max: {maxBottlenecks}
              </span>
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

      {/* Interactive Incident Tabbed Navigation */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4 bg-white">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('citizen')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'citizen'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Live Citizen Hazard Reports</span>
              {citizenReports.data && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-white font-mono">
                  {citizenReports.data.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>System Incident Audit Log</span>
              {logs.data && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono">
                  {logs.data.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab 1: Live Citizen Hazard Submissions Feed */}
        {activeTab === 'citizen' && (
          <div className="p-6 flex flex-col gap-4 bg-slate-50/50">
            {citizenReports.loading ? (
              <div className="py-12 text-center text-slate-400 font-bold">
                Loading citizen hazard reports...
              </div>
            ) : !citizenReports.data || citizenReports.data.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-bold">
                No active citizen hazard submissions recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {citizenReports.data.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Preview */}
                      {report.imageUrl && (
                        <div className="relative h-44 w-full bg-slate-900 group overflow-hidden">
                          <img
                            src={report.imageUrl}
                            alt={report.category}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            onClick={() => setSelectedImage(report.imageUrl!)}
                            className="absolute bottom-2 right-2 px-3 py-1 bg-black/70 backdrop-blur-xs text-white rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Enlarge
                          </button>
                        </div>
                      )}

                      <div className="p-5 flex flex-col gap-2.5">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold rounded-lg text-[10px] uppercase">
                            {report.category}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {report.timestamp}
                          </span>
                        </div>

                        <h4 className="font-heading font-bold text-sm text-slate-900 mt-1">
                          {report.location}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {report.description}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span
                        className={`px-2.5 py-1 rounded-full border font-bold text-[10px] uppercase tracking-wider ${getStatusBadge(
                          report.status
                        )}`}
                      >
                        {report.status}
                      </span>

                      <div className="flex items-center gap-2">
                        {report.status === 'PENDING' && (
                          <button
                            onClick={() =>
                              handleUpdateReportStatus(report.id, 'CONFIRMED')
                            }
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs border-none"
                          >
                            Confirm Alert
                          </button>
                        )}
                        {report.status !== 'RESOLVED' && (
                          <button
                            onClick={() =>
                              handleUpdateReportStatus(report.id, 'RESOLVED')
                            }
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs border-none"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: System Incident Audit Log Table */}
        {activeTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-body text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px] bg-slate-50">
                  <th className="py-3.5 px-4">Log ID</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Zone</th>
                  <th className="py-3.5 px-4">Peak Density</th>
                  <th className="py-3.5 px-4">Intervention Applied</th>
                  <th className="py-3.5 px-4">Resolution Time</th>
                  <th className="py-3.5 px-4 text-right">AI Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : logs.error ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-rose-600 font-semibold"
                    >
                      {logs.error}{' '}
                      <button
                        onClick={loadLogs}
                        className="underline ml-2 hover:text-rose-700 cursor-pointer"
                      >
                        Retry
                      </button>
                    </td>
                  </tr>
                ) : !logs.data || logs.data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No past incidents found.
                    </td>
                  </tr>
                ) : (
                  logs.data.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono-num font-bold text-slate-900">
                        {log.id}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-slate-600">
                        {log.timestamp}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {log.zone}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-rose-600 font-bold">
                        {log.peak_density}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {log.intervention}
                      </td>
                      <td className="py-3.5 px-4 font-mono-num text-emerald-600 font-bold">
                        {log.resolution_time}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleGenerateSummary(log)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-600 rounded-lg text-xs font-bold flex items-center gap-1.5 ml-auto cursor-pointer transition-all shadow-2xs"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Summarize
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* AI Summary Modal */}
      {summaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-body">
          <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-200">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-slate-900 flex items-center gap-2">
                    Gemini AI Post-Incident Summary
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono-num flex items-center gap-1">
                    Alert ID: {summaryModal.alertId} <span className="text-slate-300">•</span> Powered by Juggernaut
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSummaryModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 border-none bg-transparent cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 flex flex-col gap-3 font-mono text-[13px] leading-relaxed text-slate-700 min-h-[120px] shadow-inner">
              <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[11px] border-b border-slate-200 pb-2 mb-1 uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" /> Official NDRF Executive Report
              </div>
              
              {summaryModal.loading ? (
                <div className="flex items-center justify-center p-8 gap-3 text-indigo-600">
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="font-heading font-bold animate-pulse text-sm">
                    Generating via Google Gemini AI...
                  </span>
                </div>
              ) : summaryModal.error ? (
                <div className="flex items-start gap-2 text-rose-600 p-4 font-body">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{summaryModal.error}</span>
                </div>
              ) : (
                <div className="font-body text-[13px]">
                  {formatGeminiText(summaryModal.text)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleCopySummary}
                disabled={!summaryModal.text}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl font-heading font-bold text-xs flex items-center gap-2 border border-slate-200 cursor-pointer transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Summary Text'}</span>
              </button>
              <button
                onClick={() => setSummaryModal(null)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-heading font-bold text-xs border-none cursor-pointer shadow-md"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Resolution Photo Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4 cursor-pointer"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl">
            <img
              src={selectedImage}
              alt="Enlarged Hazard"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};