import React from 'react';
import { X, Phone, Mail, FileCode, ShieldAlert, LifeBuoy } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
      <div className="bg-white border border-[#E7E5DD] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 flex flex-col gap-5">
        <div className="flex justify-between items-center border-b border-[#E7E5DD] pb-3">
          <div className="flex items-center gap-2 text-[#2C7BE5] font-heading font-bold text-base">
            <LifeBuoy className="w-5 h-5" />
            <span>Command Desk Support & Protocols</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#FAFAF7] text-[#5B5F73]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 text-xs text-[#151726]">
          <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-3 rounded-xl flex items-start gap-3">
            <Phone className="w-4 h-4 text-[#2C7BE5] mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block">Hotline Hotline Dispatch</span>
              <span className="font-mono-num text-gray-600">+91 1800-CROWD-911 (24x7 Priority)</span>
            </div>
          </div>

          <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-3 rounded-xl flex items-start gap-3">
            <Mail className="w-4 h-4 text-[#7C6CFF] mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block">Sentinel AI Technical Escalations</span>
              <span className="font-mono-num text-gray-600">command-support@crowdshield.gov.in</span>
            </div>
          </div>

          <div className="bg-[#FAFAF7] border border-[#E7E5DD] p-3 rounded-xl flex items-start gap-3">
            <FileCode className="w-4 h-4 text-[#22D3A6] mt-0.5 shrink-0" />
            <div>
              <span className="font-bold block">Edge Node Diagnostics</span>
              <span className="text-gray-600">Local daemon running SQLite + Redis sync on port 6379</span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-[#2C7BE5] text-white font-semibold text-xs rounded-xl hover:bg-[#2066c6] transition-colors cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
};
