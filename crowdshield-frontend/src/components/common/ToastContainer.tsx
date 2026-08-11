import React from 'react';
import { ToastNotification } from '../../types';
import { ShieldAlert, AlertTriangle, Info, X, ArrowRight } from 'lucide-react';

interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onInspectAlert?: (zoneId?: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onInspectAlert,
}) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm w-full font-body pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-[#FF3B5C] bg-white';
        let icon = <ShieldAlert className="w-5 h-5 text-[#FF3B5C] animate-pulse" />;
        let badgeBg = 'bg-[#FF3B5C]/10 text-[#FF3B5C] border-[#FF3B5C]/30';

        if (toast.type === 'warning') {
          borderClass = 'border-[#FF7A45] bg-white';
          icon = <AlertTriangle className="w-5 h-5 text-[#FF7A45]" />;
          badgeBg = 'bg-[#FF7A45]/10 text-[#FF7A45] border-[#FF7A45]/30';
        } else if (toast.type === 'info') {
          borderClass = 'border-[#2C7BE5] bg-white';
          icon = <Info className="w-5 h-5 text-[#2C7BE5]" />;
          badgeBg = 'bg-[#2C7BE5]/10 text-[#2C7BE5] border-[#2C7BE5]/30';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl border-2 shadow-2xl flex flex-col gap-2.5 transition-all duration-300 animate-in slide-in-from-right-5 ${borderClass}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {icon}
                <span className={`text-[10px] font-mono-num font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${badgeBg}`}>
                  {toast.type === 'critical' ? 'THRESHOLD EXCEEDED (>85%)' : toast.type.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-lg text-[#5B5F73] hover:text-[#151726] hover:bg-[#FAFAF7] transition-colors cursor-pointer"
                title="Dismiss Toast"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Body */}
            <div>
              <h4 className="font-heading font-bold text-xs text-[#151726] leading-snug">
                {toast.title}
              </h4>
              <p className="text-[11px] text-[#5B5F73] mt-1 leading-relaxed">
                {toast.message}
              </p>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-[#E7E5DD] mt-1 text-[10px] text-[#5B5F73] font-mono-num">
              <span>{toast.timestamp}</span>
              {onInspectAlert && (
                <button
                  onClick={() => {
                    onInspectAlert(toast.zoneId);
                    onDismiss(toast.id);
                  }}
                  className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white font-heading font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>Inspect Alert</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
