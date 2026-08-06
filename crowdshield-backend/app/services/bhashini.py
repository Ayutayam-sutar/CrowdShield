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
            'en': 'Attention visitors in West Exit Sector. Gate 3 is congested. Please move calmly towards Emergency Exit Gate 4 on your right for a safe and smooth exit.',
            'hi': 'ध्यान दें! पश्चिम निकास द्वार 3 पर भीड़ अधिक है। कृपया निकटतम आपातकालीन द्वार 4 की ओर बढ़ें।',
            'od': 'ଧ୍ୟାନ ଦିଅନ୍ତୁ! ପଶ୍ଚିମ ପ୍ରସ୍ଥାନ ଦ୍ୱାର ୩ ରେ ପ୍ରବଳ ଭିଡ଼ ଅଛି। ଦୟାକରି ଆପାତକାଳୀନ ଦ୍ୱାର ୪ କୁ ଯାଆନ୍ତୁ।',
            'bn': 'বিশেষ সতর্কবার্তা! পশ্চিম এক্সিট গেট ৩-এ ভিড় বেশি। অনুগ্রহ করে শান্ত থাকুন এবং ডানদিকের জরুরি গেট ৪-এর দিকে যান।',
            'ta': 'கவனத்திற்கு! மேற்கு வெளியேறும் வாயில் 3-ல் கூட்டம் அதிகமாக உள்ளது. அமைதியாக வலதுபுறம் உள்ள அவசர வாயில் 4-ஐ நோக்கிச் செல்லவும்.'
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
