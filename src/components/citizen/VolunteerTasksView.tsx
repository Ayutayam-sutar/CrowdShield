import React, { useState, useEffect } from 'react';
import { CrowdAlert } from '../../types';
import { ShieldAlert, CheckCircle2, UserCircle, MessageSquare } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

interface VolunteerTasksViewProps {
  alerts: CrowdAlert[];
}

export const VolunteerTasksView: React.FC<VolunteerTasksViewProps> = ({ alerts }) => {
  const { userId } = useAuth();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  const activeAlerts = alerts.filter(a => a.status === 'active');

  const handleResolve = async (alertId: string) => {
    setResolvingId(alertId);
    try {
      await api.patch(`/api/v1/alerts/${alertId}/status`, {
        status: 'RESOLVED',
        volunteer_id: userId || 'VOL-UNKNOWN',
        notes: notes || 'Resolved on-site by volunteer'
      });
      setNotes('');
    } catch (err) {
      console.error('Failed to resolve alert', err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4 font-body">
      <div className="bg-[#151726] p-4 rounded-2xl flex items-center justify-between text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#2C7BE5]/20 text-[#38BDF8] rounded-xl border border-[#2C7BE5]/40">
            <UserCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-heading font-bold text-sm tracking-wide">Volunteer Task Board</h2>
            <p className="text-[10px] text-white/60 font-mono-num">
              Active Escalations: {activeAlerts.length}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {activeAlerts.length === 0 ? (
          <div className="bg-white border border-[#E7E5DD] p-6 rounded-2xl text-center text-[#5B5F73] text-sm">
            No active incidents. You're all clear!
          </div>
        ) : (
          activeAlerts.map(alert => (
            <div key={alert.id} className="bg-white border border-[#FF3B5C]/30 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#FF3B5C]" />
                  <span className="font-heading font-bold text-sm text-[#151726]">{alert.title}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-[#FF3B5C]/15 text-[#FF3B5C] font-mono-num text-[10px] font-bold uppercase">
                  {alert.category}
                </span>
              </div>
              
              <div className="text-xs text-[#5B5F73] bg-[#FAFAF7] p-2 rounded-lg border border-[#E7E5DD]">
                <strong className="text-[#151726]">Location:</strong> {alert.zoneName} <br/>
                <strong className="text-[#151726]">Instructions:</strong> {alert.recommendedActions[0]?.actionText || alert.sentinelAnalysis}
              </div>

              <div className="flex flex-col gap-2 mt-2">
                <input 
                  type="text" 
                  placeholder="Resolution notes (e.g. Barricades re-aligned)..." 
                  className="w-full text-xs p-2 rounded-lg border border-[#E7E5DD] focus:outline-none focus:border-[#2C7BE5]"
                  value={resolvingId === alert.id ? notes : ''}
                  onChange={(e) => {
                    if (resolvingId !== alert.id) setResolvingId(alert.id);
                    setNotes(e.target.value);
                  }}
                />
                <button
                  onClick={() => handleResolve(alert.id)}
                  disabled={resolvingId === alert.id}
                  className="w-full py-2 bg-[#22D3A6] hover:bg-[#1eb992] text-[#151726] rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{resolvingId === alert.id ? 'Resolving...' : 'Mark Issue as Resolved'}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
