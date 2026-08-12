/**
 * Text-to-Speech Utility for Sarvam AI multi-lingual announcements.
 * Uses Sarvam AI's Bulbul v3 model via the backend relay.
 * Falls back to the browser's native SpeechSynthesis API if Sarvam is unreachable.
 */

import api from './api';

const LANG_CODE_MAP: Record<string, string> = {
  'hi': 'hi-IN',
  'od': 'or-IN', // Some browsers map Odia to or-IN, others lack support
  'bn': 'bn-IN',
  'ta': 'ta-IN',
  'en': 'en-IN'
};

// Internal fallback function (Native Browser TTS)
const fallbackBrowserSpeech = (text: string, langCode: string) => {
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
 * Main export used across the app to play audio.
 * Attempts Sarvam AI first, falls back to browser TTS seamlessly.
 */
export const speakAnnouncement = async (text: string, langCode: string): Promise<boolean> => {
  try {
    const response = await api.post('/broadcast/sarvam-tts', {
      text: text,
      target_language: langCode
    });

    if (response.data && response.data.status === 'SUCCESS' && response.data.audio_base64) {
      console.log("🔊 [Sarvam AI] Playing synthesized speech from Bulbul v3...");
      const audioUrl = `data:audio/wav;base64,${response.data.audio_base64}`;
      const audio = new Audio(audioUrl);
      
      return new Promise((resolve) => {
        audio.onended = () => resolve(true);
        audio.onerror = () => {
          console.warn("⚠️ [Sarvam AI] Audio playback failed. Using browser fallback.");
          fallbackBrowserSpeech(text, langCode);
          resolve(false);
        };
        // Catch browser autoplay blocks
        audio.play().catch(e => {
          console.warn("⚠️ [Sarvam AI] Playback blocked by browser:", e);
          fallbackBrowserSpeech(text, langCode);
          resolve(false);
        });
      });
    } else if (response.data && response.data.status === 'MOCK') {
      console.warn("⚠️ [Sarvam AI] API key missing in .env. Falling back to local SpeechSynthesis.");
    }
  } catch (err) {
    console.error("🔴 [Sarvam AI] Error calling TTS backend relay:", err);
  }

  // If we reach here, Sarvam failed or returned MOCK. Use the browser fallback.
  fallbackBrowserSpeech(text, langCode);
  
  return new Promise((resolve) => {
     setTimeout(() => resolve(false), Math.max(text.length * 75, 3000));
  });
};