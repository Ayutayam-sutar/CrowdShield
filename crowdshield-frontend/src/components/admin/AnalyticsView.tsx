import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  AlertOctagon, 
  CheckCircle2, 
  FileSpreadsheet, 
  Calendar,
  Clock,
  Sparkles,
  X,
  Copy,
  Check,
  FileText
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  LineChart, 
  Line 
} from 'recharts';

export const AnalyticsView: React.FC = () => {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isLoadingSummary, setIsLoadingSummary] = useState<boolean>(false);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const api = (await import('../../utils/api')).default;
        const [historyRes, logsRes] = await Promise.all([
          api.get('/analytics/history'),
          api.get('/analytics/audit-logs')
        ]);
        
        setHistoricalData(historyRes.data);
        setAuditLogs(logsRes.data);
      } catch (err) {
        console.error("Failed to fetch analytics data", err);
      } finally {
        setIsLoading(false);
        setIsLoadingLogs(false);
      }
    };
    fetchData();
  }, []);

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Log ID,Timestamp,Zone,Peak Density,Intervention Applied,Resolution Time\n"
      + auditLogs.map(e => `"${e.id}","${e.timestamp}","${e.zone}","${e.peak_density}","${e.intervention}","${e.resolution_time}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "CrowdShield_Incident_Report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleGenerateSummary = async (alertId?: string) => {
    setIsAiModalOpen(true);
    setIsLoadingSummary(true);
    setAiSummary('');
    
    let targetId = alertId;
    if (!targetId || targetId === "LOG-4482") {
      // Find the real ID from the most recent audit log if "LOG-4482" dummy is passed
      targetId = auditLogs.length > 0 ? auditLogs[0].id.replace('#LOG-', '') : "dummy_id";
    }
    
    try {
      const api = (await import('../../utils/api')).default;
      const response = await api.post(`/analytics/summary/${targetId}`);
      setAiSummary(response.data.summary);
    } catch (err: any) {
      console.error("Failed to generate summary", err);
      setAiSummary(`Failed to generate AI summary. ${err.response?.data?.detail || "Please check API keys and connection."}`);
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleCopyAiSummary = () => {
    navigator.clipboard.writeText(aiSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 flex flex-col gap-6 font-body">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-[#151726] tracking-tight">
            Analytics & Historic Incident Intelligence
          </h1>
          <p className="text-xs text-[#5B5F73] mt-1">
            Aggregate footfall trends, bottleneck frequency logs, and downloadable compliance audit exports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleGenerateSummary()}
            className="px-4 py-2 bg-[#7C6CFF] hover:bg-[#6856FF] text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-md transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Generate AI Summary</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-[#2C7BE5] hover:bg-[#2066c6] text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {/* Grid of Analytics Charts */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64 bg-white border border-[#E7E5DD] rounded-2xl shadow-[0_2px_12px_rgba(21,23,38,0.04)]">
          <div className="flex flex-col items-center gap-3 text-[#7C6CFF]">
            <div className="w-8 h-8 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
            <span className="font-heading font-bold animate-pulse text-sm">Fetching telemetry history...</span>
          </div>
        </div>
      ) : historicalData.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-white border border-[#E7E5DD] rounded-2xl shadow-[0_2px_12px_rgba(21,23,38,0.04)]">
          <p className="text-[#5B5F73] text-sm font-heading">Awaiting sufficient telemetry data to generate reports.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Footfall Trend */}
          <div className="bg-white border border-[#E7E5DD] rounded-2xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-[#151726]">
                  Hourly Footfall Surge Pattern
                </h3>
                <p className="text-xs text-[#5B5F73]">
                  Aggregated entrance counts across all 12 venue turnstiles.
                </p>
              </div>
              <span className="font-mono-num text-xs font-bold text-[#2C7BE5]">
                Peak: {Math.max(0, ...historicalData.map(d => d.footfall)).toLocaleString()}
              </span>
            </div>
  
            <div className="h-64 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="footfallGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2C7BE5" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#2C7BE5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#5B5F73" fontSize={11} tickLine={false} />
                  <YAxis stroke="#5B5F73" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#151726', borderRadius: '10px', color: '#fff', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="footfall" stroke="#2C7BE5" strokeWidth={3} fillOpacity={1} fill="url(#footfallGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
  
          {/* Bottlenecks by Hour */}
          <div className="bg-white border border-[#E7E5DD] rounded-2xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-bold text-base text-[#151726]">
                  Bottleneck Frequency Incident Bar
                </h3>
                <p className="text-xs text-[#5B5F73]">
                  Number of detected crush risk warnings by hour.
                </p>
              </div>
              <span className="font-mono-num text-xs font-bold text-[#FF3B5C]">
                Max: {Math.max(0, ...historicalData.map(d => d.bottlenecks))} Bottlenecks
              </span>
            </div>
  
            <div className="h-64 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="hour" stroke="#5B5F73" fontSize={11} tickLine={false} />
                  <YAxis stroke="#5B5F73" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#151726', borderRadius: '10px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="bottlenecks" fill="#FF7A45" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-[#E7E5DD] rounded-2xl p-6 shadow-[0_2px_12px_rgba(21,23,38,0.04)] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-[#151726]">
            Past Incident & Dispatch Audit Log
          </h3>
          <span className="text-xs text-[#5B5F73] font-mono-num">Showing last 4 entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-body">
            <thead>
              <tr className="border-b border-[#E7E5DD] text-[#5B5F73] font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Log ID</th>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Zone</th>
                <th className="py-3 px-3">Peak Density</th>
                <th className="py-3 px-3">Intervention Applied</th>
                <th className="py-3 px-3">Resolution Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E5DD]">
              {isLoadingLogs ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#5B5F73]">Loading audit logs...</td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#5B5F73]">No past incidents found.</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAFAF7]">
                    <td className="py-3 px-3 font-mono-num font-bold">{log.id}</td>
                    <td className="py-3 px-3 font-mono-num">{log.timestamp}</td>
                    <td className="py-3 px-3 font-bold">{log.zone}</td>
                    <td className="py-3 px-3 font-mono-num text-[#FF3B5C] font-bold">{log.peak_density}</td>
                    <td className="py-3 px-3">{log.intervention}</td>
                    <td className="py-3 px-3 font-mono-num text-[#22D3A6] font-bold">{log.resolution_time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gen-AI Incident Summary Modal (Beacon Violet Styling) */}
      {isAiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
          <div className="bg-[#151726] border-2 border-[#7C6CFF] text-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col gap-4 p-6 relative">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#7C6CFF]/20 text-[#7C6CFF] rounded-xl border border-[#7C6CFF]/30">
                  <Sparkles className="w-5 h-5 animate-pulse text-amber-300" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-white tracking-wide">
                    Gen-AI Post-Incident Executive Summary
                  </h3>
                  <p className="text-[11px] text-white/60 font-mono-num">
                    Generated via Sentinel LLM Node · Ref: CG-8924
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body - Post-Incident Report */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-3 font-mono-num text-xs leading-relaxed text-gray-200">
              <div className="flex items-center justify-between text-[11px] border-b border-white/10 pb-2 text-white/70">
                <span className="flex items-center gap-1.5 text-[#22D3A6] font-bold">
                  <FileText className="w-3.5 h-3.5" /> Incident Report
                </span>
              </div>

              <div className="space-y-2 text-[#E2E8F0]">
                {isLoadingSummary ? (
                  <div className="flex items-center justify-center p-8 gap-3 text-[#7C6CFF]">
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-heading font-bold animate-pulse">Generating Summary via Sentinel LLM...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{aiSummary}</div>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleCopyAiSummary}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-heading font-bold text-xs flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-[#22D3A6]" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Summary!' : 'Copy Summary Text'}</span>
              </button>

              <button
                onClick={() => setIsAiModalOpen(false)}
                className="px-5 py-2 bg-[#7C6CFF] hover:bg-[#6856FF] text-white rounded-xl font-heading font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
