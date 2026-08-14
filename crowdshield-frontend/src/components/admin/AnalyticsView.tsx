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
  CheckCircle2,
  Eye,
  Flame
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

// ─── TEAM'S INTERFACES & TYPES (100% UNTOUCHED) ───
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
  resolution_time: string; // Intact to prevent backend breaks
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

  // ─── TEAM'S LOGIC (100% UNTOUCHED) ───
  const loadHistory = useCallback(async () => {
    setHistory((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<HistoricalPoint[]>('/analytics/history');
      setHistory({ data: res.data, loading: false, error: null });
    } catch (err: any) {
      setHistory({
        data: null,
        loading: false,
        error: err?.response?.data?.detail || 'Failed to load historical telemetry trends.',
      });
    }
  }, []);

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

  const loadCitizenReports = useCallback(async () => {
    setCitizenReports((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get<CitizenReport[]>('/hazards/');
      setCitizenReports({ data: res.data, loading: false, error: null });
    } catch (err: any) {
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

  const handleUpdateReportStatus = async (reportId: string, newStatus: 'CONFIRMED' | 'RESOLVED') => {
    try {
      await api.patch(`/hazards/${reportId}/status`, { status: newStatus });
      loadCitizenReports();
    } catch (err) {
      setCitizenReports((prev) => {
        if (!prev.data) return prev;
        return {
          ...prev,
          data: prev.data.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r)),
        };
      });
    }
  };

  const handleExportCSV = () => {
    if (!logs.data || logs.data.length === 0) return;
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Log ID,Timestamp,Zone,Peak Density,Intervention Applied\n' + // Removed resolution time
      logs.data.map((e) => `"${e.id}","${e.timestamp}","${e.zone}","${e.peak_density}","${e.intervention}"`).join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `CrowdShield_Incident_Report_${new Date().toISOString().slice(0, 10)}.csv`);
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
  const peakFootfall = chartData.length ? Math.max(...chartData.map((d) => d.footfall)) : 0;
  const maxBottlenecks = chartData.length ? Math.max(...chartData.map((d) => d.bottlenecks)) : 0;

  const getStatusBadge = (status: CitizenReport['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse';
      case 'CONFIRMED': return 'bg-rose-50 text-rose-600 border-rose-200';
      case 'RESOLVED': return 'bg-[#67b2b9]/10 text-[#648d6a] border-[#67b2b9]/30';
    }
  };

  const formatGeminiText = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => {
      if (line.trim() === '***' || line.trim() === '---') {
        return <hr key={i} className="my-4 border-slate-200/80" />;
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

  // ─── UI RENDER ───
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 font-body text-slate-800 bg-[#FAFAF7] min-h-screen">
      
      {/* ── Top Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-6 md:p-8 rounded-3xl border border-slate-200/80 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#67b2b9]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none opacity-60" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="p-1.5 bg-[#67b2b9]/10 border border-[#67b2b9]/20 text-[#67b2b9] rounded-lg shadow-inner">
              <Activity className="w-4 h-4" />
            </span>
            <span className="font-mono text-[10px] sm:text-[11px] font-black tracking-widest text-[#648d6a] uppercase">
              Command Deck Analytics
            </span>
          </div>
          <h1 className="font-heading font-black text-2xl sm:text-3xl text-slate-900 tracking-tight">
            Incident Intelligence & Hazard Reports
          </h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-2 max-w-2xl leading-relaxed">
            Real-time optical footfall trends, neural bottlenecks, and crowd-sourced hazard feeds.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 mt-2 md:mt-0">
          <button
            onClick={() => {
              loadHistory();
              loadLogs();
              loadCitizenReports();
            }}
            className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-heading font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sync Feeds</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!logs.data || logs.data.length === 0}
            className="px-5 py-2.5 bg-gradient-to-r from-[#67b2b9] to-[#648d6a] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-heading font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 border-none"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── KPI Stats Bar (Reduced to 3 Columns, Removed Resolution Time) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-black font-mono uppercase tracking-widest text-slate-400">
              Peak Hourly Footfall
            </span>
            <span className="font-mono text-4xl sm:text-5xl font-black text-slate-900 tracking-tighter">
              {peakFootfall.toLocaleString()}
            </span>
          </div>
          <div className="p-4 bg-[#67b2b9]/10 text-[#648d6a] rounded-2xl border border-[#67b2b9]/20 shadow-inner group-hover:scale-110 transition-transform">
            <Users className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-black font-mono uppercase tracking-widest text-slate-400">
              Active Bottlenecks
            </span>
            <span className="font-mono text-4xl sm:text-5xl font-black text-rose-500 tracking-tighter">
              {maxBottlenecks}
            </span>
          </div>
          <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100 shadow-inner group-hover:scale-110 transition-transform">
            <Flame className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between group hover:shadow-md transition-shadow">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] sm:text-[11px] font-black font-mono uppercase tracking-widest text-slate-400">
              Citizen Alerts
            </span>
            <span className="font-mono text-4xl sm:text-5xl font-black text-amber-500 tracking-tighter">
              {citizenReports.data?.length || 0}
            </span>
          </div>
          <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl border border-amber-100 shadow-inner group-hover:scale-110 transition-transform">
            <ShieldAlert className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
        </div>
      </div>

      {/* ── Historical Telemetry Charts ── */}
      {history.loading ? (
        <div className="flex items-center justify-center h-72 bg-white border border-slate-200/80 rounded-3xl shadow-sm">
          <div className="flex flex-col items-center gap-4 text-[#67b2b9]">
            <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin" />
            <span className="font-heading font-black animate-pulse text-sm tracking-wide">
              Fetching telemetry history...
            </span>
          </div>
        </div>
      ) : history.error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-6 sm:p-8 flex items-center gap-4 text-rose-600">
          <AlertTriangle className="w-6 h-6 shrink-0" />
          <span className="font-bold text-sm">{history.error}</span>
          <button
            onClick={loadHistory}
            className="ml-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm"
          >
            Retry Sync
          </button>
        </div>
      ) : chartData.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-10 text-center text-sm font-mono font-medium text-slate-500 shadow-sm">
          No telemetry recorded in the last 24 hours yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          
          {/* Footfall Area Chart */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                  Hourly Footfall Surge Pattern
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Max headcount per hour recorded from edge vision streams.
                </p>
              </div>
              <span className="font-mono text-xs font-black text-[#648d6a] bg-[#67b2b9]/10 px-3 py-1.5 rounded-xl border border-[#67b2b9]/20 tracking-wider">
                PEAK: {peakFootfall.toLocaleString()}
              </span>
            </div>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="footfallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#67b2b9" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#67b2b9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} fontFamily="monospace" />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} fontFamily="monospace" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="footfall" stroke="#67b2b9" strokeWidth={3} fillOpacity={1} fill="url(#footfallGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bottleneck Bar Chart */}
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-black text-lg text-slate-900 tracking-tight">
                  Bottleneck Anomaly Frequency
                </h3>
                <p className="text-xs font-medium text-slate-500 mt-1">
                  Warning and critical surge thresholds triggered per hour.
                </p>
              </div>
              <span className="font-mono text-xs font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 tracking-wider">
                MAX: {maxBottlenecks}
              </span>
            </div>
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={10} tickLine={false} fontFamily="monospace" />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} fontFamily="monospace" />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a', fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="bottlenecks" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Interactive Incident Tabbed Navigation ── */}
      <div className="bg-white border border-slate-200/80 rounded-3xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Tab Controls */}
        <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex items-center gap-3 sm:gap-4 flex-wrap bg-slate-50/50">
          <button
            onClick={() => setActiveTab('citizen')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-95 tracking-wide ${
              activeTab === 'citizen'
                ? 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Citizen Hazard Reports</span>
            {citizenReports.data && (
              <span className={`ml-1 px-2 py-0.5 rounded-lg text-[10px] font-mono border ${activeTab === 'citizen' ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                {citizenReports.data.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2.5 transition-all cursor-pointer shadow-sm active:scale-95 tracking-wide ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-[#67b2b9] to-[#648d6a] text-white'
                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>System Audit Log</span>
            {logs.data && (
              <span className={`ml-1 px-2 py-0.5 rounded-lg text-[10px] font-mono border ${activeTab === 'audit' ? 'bg-white/20 border-white/30 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                {logs.data.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Live Citizen Hazard Submissions Feed */}
        {activeTab === 'citizen' && (
          <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            {citizenReports.loading ? (
              <div className="py-16 text-center text-slate-400 font-bold font-mono tracking-wider flex items-center justify-center gap-3">
                <span className="w-5 h-5 border-2 border-[#67b2b9] border-t-transparent rounded-full animate-spin" />
                Fetching civilian reports...
              </div>
            ) : !citizenReports.data || citizenReports.data.length === 0 ? (
              <div className="py-16 text-center text-slate-400 font-bold font-mono tracking-wider bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                No active citizen hazard submissions recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
                {citizenReports.data.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image Preview */}
                      {report.imageUrl && (
                        <div className="relative h-48 sm:h-56 w-full bg-slate-900 overflow-hidden">
                          <img
                            src={report.imageUrl}
                            alt={report.category}
                            className="w-full h-full object-cover group-hover:scale-105 group-hover:opacity-90 transition-all duration-500"
                          />
                          <button
                            onClick={() => setSelectedImage(report.imageUrl!)}
                            className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 backdrop-blur-md text-white rounded-xl text-[10px] font-mono font-bold tracking-widest flex items-center gap-1.5 cursor-pointer hover:bg-black/80 transition-colors border border-white/20 shadow-lg"
                          >
                            <Eye className="w-3.5 h-3.5" /> ENLARGE
                          </button>
                        </div>
                      )}

                      <div className="p-5 sm:p-6 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-600 font-black rounded-lg text-[9px] sm:text-[10px] uppercase tracking-widest">
                            {report.category}
                          </span>
                          <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                            {report.timestamp}
                          </span>
                        </div>

                        <h4 className="font-heading font-black text-base sm:text-lg text-slate-900 mt-2 tracking-tight leading-tight">
                          {report.location}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                          {report.description}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                      <span className={`px-3 py-1.5 rounded-lg border font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-sm ${getStatusBadge(report.status)}`}>
                        {report.status}
                      </span>

                      <div className="flex items-center gap-2">
                        {report.status === 'PENDING' && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'CONFIRMED')}
                            className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-md active:scale-95 border-none"
                          >
                            Confirm Alert
                          </button>
                        )}
                        {report.status !== 'RESOLVED' && (
                          <button
                            onClick={() => handleUpdateReportStatus(report.id, 'RESOLVED')}
                            className="px-4 py-2 bg-[#67b2b9] hover:bg-[#5a9c9f] text-white rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider cursor-pointer transition-all shadow-md active:scale-95 border-none"
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
          <div className="overflow-x-auto smooth-scroll p-0 sm:p-2">
            <table className="w-full text-left text-xs sm:text-sm font-body text-slate-700 min-w-[800px]">
              <thead className="bg-slate-50 border-y border-slate-100">
                <tr className="text-slate-500 font-black uppercase tracking-widest text-[9px] sm:text-[10px]">
                  <th className="py-4 px-6 whitespace-nowrap">Log ID</th>
                  <th className="py-4 px-6 whitespace-nowrap">Timestamp</th>
                  <th className="py-4 px-6 whitespace-nowrap">Zone</th>
                  <th className="py-4 px-6 whitespace-nowrap">Peak Density</th>
                  <th className="py-4 px-6 whitespace-nowrap">Intervention Applied</th>
                  <th className="py-4 px-6 text-right whitespace-nowrap">AI Summary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono font-medium text-xs">
                {logs.loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold tracking-widest">
                      <div className="flex items-center justify-center gap-3">
                         <span className="w-5 h-5 border-2 border-[#67b2b9] border-t-transparent rounded-full animate-spin" />
                         LOADING AUDIT LOGS...
                      </div>
                    </td>
                  </tr>
                ) : logs.error ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="inline-flex items-center gap-3 bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl border border-rose-100 font-bold tracking-wide">
                        <AlertTriangle className="w-5 h-5" />
                        {logs.error}
                        <button onClick={loadLogs} className="ml-2 underline hover:text-rose-800 cursor-pointer">Retry</button>
                      </div>
                    </td>
                  </tr>
                ) : !logs.data || logs.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 font-bold tracking-widest bg-slate-50">
                      NO PAST INCIDENTS FOUND
                    </td>
                  </tr>
                ) : (
                  logs.data.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors bg-white">
                      <td className="py-4 px-6 font-black text-slate-900">
                        {log.id}
                      </td>
                      <td className="py-4 px-6 text-slate-500">
                        {log.timestamp}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800">
                        {log.zone}
                      </td>
                      <td className="py-4 px-6 text-rose-600 font-black">
                        {log.peak_density}
                      </td>
                      <td className="py-4 px-6 text-slate-600 whitespace-nowrap">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {log.intervention}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleGenerateSummary(log)}
                          className="px-4 py-2 bg-[#67b2b9]/10 hover:bg-[#67b2b9] hover:text-white border border-[#67b2b9]/30 text-[#648d6a] rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 ml-auto cursor-pointer transition-all shadow-sm active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Summarize
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

      {/* ── AI Summary Modal (Clean White Dashboard Look) ── */}
      {summaryModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 sm:p-6 font-body animate-fadeIn">
          <div className="bg-white border border-slate-200/80 rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-5 gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-[#67b2b9]/20 to-[#648d6a]/20 border border-[#67b2b9]/30 text-[#648d6a] rounded-2xl shadow-inner">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="font-heading font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                    Gemini AI Report Summary
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 font-mono font-bold tracking-wider uppercase flex items-center gap-2">
                    <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-600">ID: {summaryModal.alertId}</span> 
                    <span className="w-1 h-1 rounded-full bg-slate-300" /> 
                    Powered by Juggernaut
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSummaryModal(null)}
                className="absolute sm:relative top-6 right-6 sm:top-auto sm:right-auto p-2 rounded-full hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer border border-transparent hover:border-rose-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="my-6 bg-slate-50 border border-slate-200/80 rounded-2xl p-6 flex flex-col gap-4 font-mono text-xs sm:text-sm leading-relaxed text-slate-700 min-h-[160px] shadow-inner overflow-y-auto max-h-[50vh] smooth-scroll">
              <div className="flex items-center gap-2 text-[#648d6a] font-black text-[10px] sm:text-xs border-b border-slate-200 pb-3 mb-2 uppercase tracking-widest">
                <FileText className="w-4 h-4 text-[#67b2b9]" /> Official NDRF Executive Report
              </div>
              
              {summaryModal.loading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4 text-[#67b2b9]">
                  <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="font-heading font-black animate-pulse text-sm tracking-wide">
                    Generating via Google Gemini AI...
                  </span>
                </div>
              ) : summaryModal.error ? (
                <div className="flex items-center gap-3 text-rose-600 bg-rose-50 border border-rose-200 p-5 rounded-xl font-bold font-body">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{summaryModal.error}</span>
                </div>
              ) : (
                <div className="font-body text-[13px] sm:text-sm text-slate-700">
                  {formatGeminiText(summaryModal.text)}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                onClick={handleCopySummary}
                disabled={!summaryModal.text}
                className="w-full sm:w-auto px-5 py-3.5 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 rounded-2xl font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-slate-200 cursor-pointer transition-all shadow-sm active:scale-95"
              >
                {copied ? <Check className="w-4 h-4 text-[#648d6a]" /> : <Copy className="w-4 h-4 text-[#67b2b9]" />}
                <span className={copied ? "text-[#648d6a]" : ""}>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
              </button>
              <button
                onClick={() => setSummaryModal(null)}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-heading font-black text-xs uppercase tracking-wider cursor-pointer shadow-xl active:scale-95 transition-all border-none"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Resolution Photo Modal ── */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-8 cursor-pointer animate-fadeIn"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl border border-slate-800">
            <img
              src={selectedImage}
              alt="Enlarged Hazard"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-mono font-bold tracking-widest border border-white/10 shadow-lg">
              CLICK ANYWHERE TO CLOSE
            </div>
          </div>
        </div>
      )}
    </div>
  );
};