"""
Broadcast endpoint for Bhashini Multilingual PA and Emergency SMS.
"""
from fastapi import APIRouter
from pydantic import BaseModel

from app.services.bhashini import bhashini_service
from app.services.audio_service import audio_service
from app.api.deps import get_current_active_admin
from fastapi import Depends

router = APIRouter()

class BroadcastRequest(BaseModel):
    text: str
    target_language: str
    zone_id: str

class BroadcastResponse(BaseModel):
    original_text: str
    translated_text: str
    language: str
    status: str

@router.post("/", response_model=BroadcastResponse, dependencies=[Depends(get_current_active_admin)])
async def broadcast_message(request: BroadcastRequest):
    """
    Translate text using Bhashini and trigger PA system/SMS broadcast.
    """
    translation_result = bhashini_service.get_translation(request.text, request.target_language)
    
    # In a real system, we would then publish to MQTT/Twilio here
    
    return BroadcastResponse(
        original_text=request.text,
        translated_text=translation_result["translated_text"],
        language=translation_result["language"],
        status=f"Broadcasted to {request.zone_id} via {translation_result['audio_source']}"
    )

class BhashiniBroadcastRequest(BaseModel):
    text: str
    target_language: str

@router.post("/bhashini", dependencies=[Depends(get_current_active_admin)])
async def broadcast_bhashini_audio(request: BhashiniBroadcastRequest):
    """
    Simulate generating and dispatching multilingual Bhashini TTS audio.
    """
    result = audio_service.generate_bhashini_audio(request.text, request.target_language)
    return result


class SarvamTTSRequest(BaseModel):
    text: str
    target_language: str


@router.post("/sarvam-tts")
async def generate_sarvam_tts(request: SarvamTTSRequest):
    """
    Relay request to Sarvam AI Text-to-Speech API using Bulbul v3 model and ashutosh speaker.
    Returns base64 encoded audio. Falls back to mock if API key is not present.
    """
    import urllib.request
    import urllib.error
    import json
    from fastapi import HTTPException
    from app.core.config import settings

    # Map target language to Sarvam BCP-47 codes
    lang_map = {
        "en": "en-IN",
        "hi": "hi-IN",
        "od": "od-IN",
        "bn": "bn-IN",
        "ta": "ta-IN"
    }
    sarvam_lang = lang_map.get(request.target_language.lower(), "en-IN")

    api_key = settings.SARVAM_API_KEY

    # Guard: Return MOCK warning if key is unset so frontend knows to execute local fallback
    if not api_key or len(api_key.strip()) < 5:
        return {
            "status": "MOCK",
            "message": "Sarvam API Key not found. Please set SARVAM_API_KEY in .env.",
            "audio_base64": ""
        }

    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "text": request.text,
        "language_code": sarvam_lang,
        "speaker": "ashutosh",
        "model": "bulbul:v3"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        # Request audio bytes from Sarvam AI REST API
        with urllib.request.urlopen(req, timeout=15) as response:
            res_body = response.read().decode("utf-8")
            data = json.loads(res_body)
            audios = data.get("audios", [])
            if not audios:
                raise HTTPException(status_code=500, detail="Sarvam AI returned empty audio array.")
            
            return {
                "status": "SUCCESS",
                "audio_base64": audios[0]
            }
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8") if e.fp else e.reason
        raise HTTPException(status_code=e.code, detail=f"Sarvam AI API error: {err_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Request to Sarvam AI failed: {str(e)}")


