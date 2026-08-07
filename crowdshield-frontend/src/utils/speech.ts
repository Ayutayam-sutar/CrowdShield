/**
 * Graceful fallback TTS for Bhashini multi-lingual announcements.
 * Uses the browser's native SpeechSynthesis API when Bhashini cloud APIs are unreachable.
 */

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
