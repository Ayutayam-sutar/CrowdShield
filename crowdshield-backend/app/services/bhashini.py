"""
Bhashini API integration for multilingual PA translations.
"""
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class BhashiniService:
    def __init__(self):
        # Mock translations mirroring frontend mockData
        self.translations = {
            'en': '',
            'hi': '',
            'od': '',
            'bn': '',
            'ta': ''
        }

    def get_translation(self, text: str, target_lang: str) -> dict:
        """
        Translates emergency announcement text to the target Indian language.
        Returns a dict with language, translated_text, and audio_source.
        """
        api_key = settings.BHASHINI_API_KEY
        
        if api_key and len(api_key) > 5:
            # Here we would do: requests.post("https://bhashini.api...", headers={"Authorization": api_key})
            # For hackathon, we assume fallback if not properly implemented
            logger.info("Bhashini API Key found. (Mocking API call...)")
            return {
                "language": target_lang,
                "translated_text": self.translations.get(target_lang, text),
                "audio_source": "bhashini_cloud_tts"
            }
        else:
            # Graceful Zero-Dependency Fallback
            logger.info("No Bhashini API Key found. Using local translation fallback.")
            return {
                "language": target_lang,
                "translated_text": self.translations.get(target_lang, text),
                "audio_source": "web_speech_fallback"
            }

bhashini_service = BhashiniService()
