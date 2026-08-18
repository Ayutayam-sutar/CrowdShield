import React from 'react';
import { ToastNotification } from '../../types';
import { ShieldAlert, AlertTriangle, Info, X, ArrowRight } from 'lucide-react';
interface ToastContainerProps {
  toasts: ToastNotification[];
  onDismiss: (id: string) => void;
  onInspectAlert?: (zoneId?: string) => void;
  userRole?: 'admin' | 'citizen'; 
}
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  onInspectAlert,
  userRole = 'admin',
}) => {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed top-16 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 z-[100] flex flex-col gap-3 sm:max-w-[380px] w-auto font-body pointer-events-none">
      {toasts.map((toast) => {
        let borderClass = 'border-l-[#2C7BE5]';
        let iconBg = 'bg-[#2C7BE5]/10';
        let icon = <Info className="w-5 h-5 text-[#2C7BE5]" />;
        let badgeTextClass = 'text-[#2C7BE5]';
        if (toast.type === 'critical') {
          borderClass = 'border-l-[#FF3B5C]';
          iconBg = 'bg-[#FF3B5C]/15';
          icon = <ShieldAlert className="w-5 h-5 text-[#FF3B5C] animate-pulse" />;
          badgeTextClass = 'text-[#FF3B5C]';
        } else if (toast.type === 'warning') {
          borderClass = 'border-l-[#FF7A45]';
          iconBg = 'bg-[#FF7A45]/15';
          icon = <AlertTriangle className="w-5 h-5 text-[#FF7A45]" />;
          badgeTextClass = 'text-[#FF7A45]';
        }
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto bg-white/95 backdrop-blur-md rounded-2xl border border-[#E7E5DD] border-l-4 shadow-xl flex flex-col gap-2 p-4 transition-all duration-300 animate-in slide-in-from-right-5 sm:slide-in-from-top-2 ${borderClass}`}
          >
            {/* Header Layout */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {/* Icon Box */}
                <div className={`p-2 rounded-xl shrink-0 ${iconBg}`}>
                  {icon}
                </div>
                
                {/* Title & Badge */}
                <div className="flex flex-col mt-0.5">
                  <span className={`text-[10px] font-mono-num font-bold uppercase tracking-wider ${badgeTextClass}`}>
                    {toast.type === 'critical' ? '⚠ CRITICAL THRESHOLD' : toast.type}
                  </span>
                  <h4 className="font-heading font-bold text-sm text-[#151726] leading-tight mt-0.5">
                    {toast.title}
                  </h4>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => onDismiss(toast.id)}
                className="p-1.5 rounded-xl text-[#5B5F73] hover:text-[#151726] hover:bg-[#FAFAF7] transition-colors cursor-pointer shrink-0 active:scale-95"
                title="Dismiss Alert"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Message */}
            <div className="pl-12 pr-2">
              <p className="text-xs text-[#5B5F73] leading-relaxed">
                {toast.message}
              </p>
            </div>
            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 mt-1.5 border-t border-[#E7E5DD]/70 pl-12">
              <span className="text-[10px] text-[#5B5F73] font-mono-num font-medium">
                {toast.timestamp}
              </span>
      
              {/* Render Inspect Button ONLY if role is Admin */}
              {onInspectAlert && userRole !== 'citizen' && (
                <button
                  onClick={() => {
                    onInspectAlert(toast.zoneId);
                    onDismiss(toast.id);
                  }}
                  className="px-3 py-1.5 bg-[#151726] hover:bg-[#25283e] text-white font-heading font-bold text-[11px] rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
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