import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Sparkles, Volume2, ArrowRight, Radio, Send, Loader2 } from 'lucide-react';
import api from '../../utils/api';

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
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [responseMsg, setResponseMsg] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const recognitionRef = useRef<any>(null);

  const sampleCommands = [
    'Attention everyone, please move calmly towards Gate 3',
    'Trigger emergency evacuation in Main Corridor',
    'Switch system to Edge Isolated Mode',
    'Show CCTV CAM-01',
    'What is venue headcount?'
  ];

  // Initialize Real-Time Microphone Recognition
  useEffect(() => {
    if (!isOpen) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN'; // Optimized for Indian accents

      recognition.onstart = () => {
        setIsListening(true);
        setSpokenText('');
        setResponseMsg('');
      };

      recognition.onresult = (event: any) => {
        const currentTranscript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        setSpokenText(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error("Microphone error:", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start(); // Auto-start mic when modal opens
    } else {
      setResponseMsg("Browser does not support real-time voice recognition. Please use manual inputs.");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isOpen]);

  // Execute internal admin UI command
  const handleProcessCommand = (cmd: string) => {
    setIsListening(false);
    if (recognitionRef.current) recognitionRef.current.stop();
    
    setResponseMsg(`Sarvam AI Engine processing command: "${cmd}"...`);

    setTimeout(() => {
      onExecuteCommand(cmd);
      setResponseMsg(`Executed command successfully.`);
    }, 1000);
  };

  // Broadcast spoken text live to Citizen Portal via WebSocket & Sarvam TTS
// Broadcast spoken text live to Citizen Portal via WebSocket & Sarvam TTS
  const handleBroadcastToCitizens = async () => {
    if (!spokenText.trim()) return;
    setIsBroadcasting(true);
    setResponseMsg('Transmitting live voice announcement to Citizen Portal...');

    try {
      await api.post('/broadcast/', {
        text: spokenText,
        target_language: 'en',
        zone_id: 'global', // 🚨 ADD THIS LINE! (or use 'gate_1' if your backend strictly validates zone IDs)
      });
      setResponseMsg('📢 Live voice announcement dispatched to all connected Citizens!');
    } catch (err: any) {
      console.error('Failed to broadcast voice announcement:', err);
      setResponseMsg('🔴 Failed to broadcast. Please check backend network connection.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleSelectMockCommand = (cmd: string) => {
    setSpokenText(cmd);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 font-body animate-fadeIn">
      <div className="bg-white border border-[#E7E5DD] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 flex flex-col items-center text-center gap-5">
        <div className="w-full flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#7C6CFF] text-xs font-bold font-heading">
            <Sparkles className="w-4 h-4" />
            <span>SARVAM AI VOICE COMMANDER</span>
          </div>
          <button
            onClick={() => {
              if (recognitionRef.current) recognitionRef.current.stop();
              onClose();
            }}
            className="p-1 rounded-lg text-[#5B5F73] hover:text-[#151726] hover:bg-[#FAFAF7] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-Time Mic Pulse Button */}
        <div className="relative my-1 cursor-pointer" onClick={() => {
          if (!isListening && recognitionRef.current) recognitionRef.current.start();
        }}>
          <div className={`w-20 h-20 rounded-full flex items-center justify-center relative z-10 transition-colors ${isListening ? 'bg-[#7C6CFF]/10 text-[#7C6CFF]' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
            {isListening ? <Mic className="w-8 h-8 animate-bounce text-[#7C6CFF]" /> : <MicOff className="w-8 h-8" />}
          </div>
          {isListening && <div className="absolute inset-0 rounded-full bg-[#7C6CFF]/20 animate-ping" />}
        </div>

        <div>
          <h3 className="font-heading font-bold text-lg text-[#151726]">
            {isListening ? 'Listening live...' : spokenText ? 'Voice Captured' : 'Microphone Paused'}
          </h3>
          <p className="text-xs text-[#5B5F73] mt-1">
            {isListening ? 'Speak naturally into your microphone.' : 'Click mic above to re-record or choose an action below.'}
          </p>
        </div>

        {/* Live Transcription Display */}
        {spokenText && (
          <div className="bg-[#FAFAF7] border border-[#7C6CFF]/30 p-3 rounded-xl w-full text-xs font-mono-num text-[#151726] text-left">
            <span className="text-[#7C6CFF] font-bold block mb-1 flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Speech Transcription:
            </span>
            "{spokenText}"
          </div>
        )}

        {/* Action Buttons for Captured Speech */}
        {spokenText && (
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <button
              onClick={() => handleProcessCommand(spokenText)}
              className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-slate-200"
            >
              <Send className="w-3.5 h-3.5" /> Execute Command
            </button>
            <button
              onClick={handleBroadcastToCitizens}
              disabled={isBroadcasting}
              className="flex-1 py-2.5 px-3 bg-[#FF3B5C] hover:bg-[#e02e4d] text-white rounded-xl font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-500/20 disabled:opacity-50"
            >
              {isBroadcasting ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Broadcasting...</>
              ) : (
                <><Volume2 className="w-3.5 h-3.5" /> Broadcast Live PA</>
              )}
            </button>
          </div>
        )}

        {responseMsg && (
          <div className="bg-[#7C6CFF]/10 text-[#7C6CFF] p-2.5 rounded-xl w-full text-xs font-semibold flex items-center justify-center gap-2">
            <Volume2 className="w-4 h-4 shrink-0" />
            <span>{responseMsg}</span>
          </div>
        )}

        {/* Sample Command Shortcuts */}
        <div className="w-full text-left">
          <span className="text-[11px] font-bold text-[#5B5F73] uppercase tracking-wider block mb-2">
            Sample Speech Inputs:
          </span>
          <div className="flex flex-col gap-1.5">
            {sampleCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectMockCommand(cmd)}
                className="w-full text-left bg-[#FAFAF7] hover:bg-[#7C6CFF]/10 hover:text-[#7C6CFF] border border-[#E7E5DD] px-3 py-2 rounded-xl text-xs font-medium text-[#151726] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="truncate">"{cmd}"</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#5B5F73] shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            if (recognitionRef.current) recognitionRef.current.stop();
            onClose();
          }}
          className="w-full py-2 bg-[#FAFAF7] border border-[#E7E5DD] text-[#5B5F73] font-semibold text-xs rounded-xl hover:bg-[#E7E5DD] transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};