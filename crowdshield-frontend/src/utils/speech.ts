/**
 * Graceful fallback TTS for Bhashini multi-lingual announcements.
 * Uses the browser's native SpeechSynthesis API when Bhashini cloud APIs are unreachable.
 */

import api from './api';

const LANG_CODE_MAP: Record<string, string> = {
  'hi': 'hi-IN',
  'od': 'or-IN', // Some browsers map Odia to or-IN, others lack support
  'bn': 'bn-IN',
  'ta': 'ta-IN',
  'en': 'en-IN'
};

export const speakAnnouncement = (text: string, langCode: string) => {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech Synthesis not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel(); // Stop any ongoing speech

  const utterance = new SpeechSynthesisUtterance(text);
  
  // Set language to target locale
  const targetLocale = LANG_CODE_MAP[langCode] || 'en-IN';
  utterance.lang = targetLocale;
  
  // Try to find a matching voice
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find(voice => voice.lang.includes(targetLocale) || voice.lang.includes(langCode));
  
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  // Optimize for announcements
  utterance.rate = 0.9;
  utterance.pitch = 1.1;

  window.speechSynthesis.speak(utterance);
};

/**
 * Generate and play Text-to-Speech audio using the Sarvam AI integration.
 * Falls back to local SpeechSynthesis if the API key is not present or endpoint fails.
 */
export const speakSarvamTTS = (text: string, langCode: string): Promise<boolean> => {
  return new Promise(async (resolve) => {
    try {
      const response = await api.post('/broadcast/sarvam-tts', {
        text: text,
        target_language: langCode
      });

      if (response.data && response.data.status === 'SUCCESS' && response.data.audio_base64) {
        console.log("🔊 [Sarvam AI] Playing synthesized speech from Bulbul v3...");
        const audioUrl = `data:audio/wav;base64,${response.data.audio_base64}`;
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          resolve(true);
        };
        
        audio.onerror = () => {
          resolve(false);
        };

        await audio.play();
        return;
      } else if (response.data && response.data.status === 'MOCK') {
        console.warn("⚠️ [Sarvam AI] API key missing in .env. Falling back to local SpeechSynthesis.");
      }
    } catch (err) {
      console.error("🔴 [Sarvam AI] Error calling TTS backend relay:", err);
    }

    // Fallback to native Web Speech API synthesis
    speakAnnouncement(text, langCode);
    setTimeout(() => {
      resolve(false);
    }, Math.max(text.length * 75, 3000));
  });
};

