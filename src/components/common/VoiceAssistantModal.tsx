import React, { useState } from 'react';
import { Mic, X, Sparkles, Volume2, ArrowRight } from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCommand: (command: string) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onExecuteCommand,
}) => {
  const [isListening, setIsListening] = useState(true);
  const [spokenText, setSpokenText] = useState('');
  const [responseMsg, setResponseMsg] = useState('');

  if (!isOpen) return null;

  const sampleCommands = [
    'Show density for Gate 3',
    'Trigger emergency evacuation in Hindi',
    'Switch to Edge Mode',
    'Show CCTV CAM-01',
    'What is venue headcount?'
  ];

  const handleSelectCommand = (cmd: string) => {
    setSpokenText(cmd);
    setIsListening(false);
    setResponseMsg(`Bhashini Engine processing: "${cmd}"...`);

    setTimeout(() => {
      onExecuteCommand(cmd);
      setResponseMsg(`Executed command successfully.`);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
      <div className="bg-white border border-[#E7E5DD] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 flex flex-col items-center text-center gap-5">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#7C6CFF] text-xs font-bold font-heading">
            <Sparkles className="w-4 h-4" />
            <span>BHASHINI AI VOICE COMMANDER</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5B5F73] hover:text-[#151726] hover:bg-[#FAFAF7] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mic Pulse Icon */}
        <div className="relative my-2">
          <div className="w-20 h-20 rounded-full bg-[#7C6CFF]/10 flex items-center justify-center text-[#7C6CFF] relative z-10">
            <Mic className="w-8 h-8 animate-bounce" />
          </div>
          <div className="absolute inset-0 rounded-full bg-[#7C6CFF]/20 animate-ping" />
        </div>

        <div>
          <h3 className="font-heading font-bold text-lg text-[#151726]">
            {isListening ? 'Listening for Operator Voice...' : 'Processing Command'}
          </h3>
          <p className="text-xs text-[#5B5F73] mt-1">
            Speak natural voice instructions in English, Hindi, Odia, Bengali, or Tamil.
          </p>
        </div>

        {spokenText && (
          <div className="bg-[#FAFAF7] border border-[#7C6CFF]/30 p-3 rounded-xl w-full text-xs font-mono-num text-[#151726]">
            <span className="text-[#7C6CFF] font-bold block mb-1">Recognized Speech:</span>
            "{spokenText}"
          </div>
        )}

        {responseMsg && (
          <div className="bg-[#7C6CFF]/10 text-[#7C6CFF] p-2.5 rounded-xl w-full text-xs font-semibold flex items-center justify-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span>{responseMsg}</span>
          </div>
        )}

        {/* Quick Sample Voice Command Pills */}
        <div className="w-full text-left">
          <span className="text-[11px] font-bold text-[#5B5F73] uppercase tracking-wider block mb-2">
            Quick Sample Commands:
          </span>
          <div className="flex flex-col gap-1.5">
            {sampleCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectCommand(cmd)}
                className="w-full text-left bg-[#FAFAF7] hover:bg-[#7C6CFF]/10 hover:text-[#7C6CFF] border border-[#E7E5DD] px-3 py-2 rounded-xl text-xs font-medium text-[#151726] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>"{cmd}"</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#5B5F73]" />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-[#FAFAF7] border border-[#E7E5DD] text-[#5B5F73] font-semibold text-xs rounded-xl hover:bg-[#E7E5DD] transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
