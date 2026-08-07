import React from 'react';
import { ShieldCheck, HardDrive, EyeOff, Lock } from 'lucide-react';

export const ComplianceFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[#FAFAF7] border-t border-[#E7E5DD] py-2.5 px-4 text-xs text-[#5B5F73] font-body">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-medium text-[#151726]">
          <ShieldCheck className="w-4 h-4 text-[#22D3A6]" />
          <span>CrowdShield Safety Engine v3.4</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-[#2C7BE5]" />
            DPDP Act 2023 Compliant
          </span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="flex items-center gap-1">
            <EyeOff className="w-3.5 h-3.5 text-[#7C6CFF]" />
            Anonymous Telemetry Only
          </span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FFB627]" />
            Zero Facial Recognition
          </span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span className="flex items-center gap-1 font-mono-num text-[11px] bg-[#E7E5DD]/50 px-2 py-0.5 rounded text-[#151726]">
            <HardDrive className="w-3 h-3 text-[#2C7BE5]" />
            Edge Processing Active
          </span>
        </div>
      </div>
    </footer>
  );
};
