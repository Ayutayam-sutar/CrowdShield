import React, { useState } from 'react';
import { HISTORICAL_FOOTFALL_DATA } from '../../data/mockData';
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

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Hour,Footfall,Bottlenecks\n"
      + HISTORICAL_FOOTFALL_DATA.map(e => `${e.hour},${e.footfall},${e.bottlenecks}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "CrowdShield_Incident_Report_Sector7G.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyAiSummary = () => {
    const text = `INSPECTION INCIDENT CG-8924 REPORT SUMMARY:
Surge detected at 18:42 at West Exit Gate 3.
Peak Density: 4.8 p/m² (Exceeded 4.0 safety threshold).
A* rerouting successfully diverted 1,200 pax to Aux Gate 4.
Multilingual Bhashini audio PA broadcast activated in Hindi and Odia.
Resolution Time: 14 mins. Zero injuries reported.`;
    navigator.clipboard.writeText(text);
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
            onClick={() => setIsAiModalOpen(true)}
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
            <span className="font-mono-num text-xs font-bold text-[#2C7BE5]">Peak: 18,500</span>
          </div>

          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HISTORICAL_FOOTFALL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
            <span className="font-mono-num text-xs font-bold text-[#FF3B5C]">Max: 5 Bottlenecks</span>
          </div>

          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={HISTORICAL_FOOTFALL_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="#5B5F73" fontSize={11} tickLine={false} />
                <YAxis stroke="#5B5F73" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#151726', borderRadius: '10px', color: '#fff', fontSize: '12px' }} />
                <Bar dataKey="bottlenecks" fill="#FF7A45" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
              <tr className="hover:bg-[#FAFAF7]">
                <td className="py-3 px-3 font-mono-num font-bold">#LOG-4482</td>
                <td className="py-3 px-3 font-mono-num">04:48:10</td>
                <td className="py-3 px-3 font-bold">West Exit Gate 3</td>
                <td className="py-3 px-3 font-mono-num text-[#FF3B5C] font-bold">4.8 p/m²</td>
                <td className="py-3 px-3">Aux Exit Gate 4 Unlocked + Bhashini PA</td>
                <td className="py-3 px-3 font-mono-num text-[#22D3A6] font-bold">2.4 mins</td>
              </tr>
              <tr className="hover:bg-[#FAFAF7]">
                <td className="py-3 px-3 font-mono-num font-bold">#LOG-4410</td>
                <td className="py-3 px-3 font-mono-num">04:30:15</td>
                <td className="py-3 px-3 font-bold">North Plaza Gate 1</td>
                <td className="py-3 px-3 font-mono-num text-[#FF7A45] font-bold">3.6 p/m²</td>
                <td className="py-3 px-3">Rerouted inflow to Sector Delta</td>
                <td className="py-3 px-3 font-mono-num text-[#22D3A6] font-bold">4.1 mins</td>
              </tr>
              <tr className="hover:bg-[#FAFAF7]">
                <td className="py-3 px-3 font-mono-num font-bold">#LOG-4390</td>
                <td className="py-3 px-3 font-mono-num">03:55:00</td>
                <td className="py-3 px-3 font-bold">South Concourse Hub</td>
                <td className="py-3 px-3 font-mono-num text-[#FFB627] font-bold">3.1 p/m²</td>
                <td className="py-3 px-3">Security Guard Squad Dispatched</td>
                <td className="py-3 px-3 font-mono-num text-[#22D3A6] font-bold">1.8 mins</td>
              </tr>
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
                  <FileText className="w-3.5 h-3.5" /> Incident CG-8924
                </span>
                <span>Severity: CRITICAL (LEVEL 4)</span>
              </div>

              <div className="space-y-2 text-[#E2E8F0]">
                <p>
                  <strong className="text-white">Summary:</strong> Surge detected at <span className="text-[#FF3B5C] font-bold">18:42</span> at West Exit Gate 3 corridor. Peak density reached <span className="text-[#FF3B5C] font-bold">4.8 p/m²</span>, exceeding safety threshold.
                </p>
                <p>
                  <strong className="text-white">Automated Countermeasures:</strong> Real-time A* dynamic rerouting successfully diverted <span className="text-[#22D3A6] font-bold">1,200 pax</span> towards Auxiliary Exit Gate 4.
                </p>
                <p>
                  <strong className="text-white">Multilingual Broadcasts:</strong> Bhashini AI engine executed voice PA instructions in Hindi & Odia, preventing bottleneck panic.
                </p>
                <p>
                  <strong className="text-white">Resolution Metrics:</strong> Total resolution time: <span className="text-[#22D3A6] font-bold">14 mins</span>. Zero injuries recorded. Operator intervention: <span className="text-[#7C6CFF] font-bold">OP_01 Remote Turnstile Unlock</span>.
                </p>
              </div>

              <div className="mt-2 p-2.5 rounded-lg bg-[#7C6CFF]/10 border border-[#7C6CFF]/30 text-[11px] text-[#A78BFA] font-sans">
                <strong>AI Compliance Recommendation:</strong> Permanently widen Auxiliary Corridor 4 during peak exit hours (18:00 - 20:00) to reduce future risk index by an estimated 38%.
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
