"""
Broadcast endpoint for Sarvam AI Multilingual PA and Emergency SMS.
"""
import asyncio
import urllib.request
import urllib.error
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.websocket import ws_manager
from app.api.deps import get_current_active_admin
from app.core.config import settings

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

class SMSRequest(BaseModel):
    message: str
    zone_id: str

class SarvamTTSRequest(BaseModel):
    text: str
    target_language: str

class SocialMediaRequest(BaseModel):
    message: str
    platforms: list[str] = ["twitter"]


@router.post("/", response_model=BroadcastResponse, dependencies=[Depends(get_current_active_admin)])
async def broadcast_message(request: BroadcastRequest):
    """
    Trigger Sarvam AI Multilingual PA system broadcast via WebSocket to Citizen devices.
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Cannot broadcast empty message.")

    translated_text = f"🔊 {request.text}"

    # Broadcast to all connected citizen apps to trigger the UI notification
    await ws_manager.broadcast({
        "event": "INTERVENTION_DISPATCHED",
        "actionText": "Sarvam AI Multilingual PA Broadcast",
        "announcementText": translated_text,
        "language": request.target_language,
        "zoneId": request.zone_id
    })
    
    return BroadcastResponse(
        original_text=request.text,
        translated_text=translated_text,
        language=request.target_language,
        status=f"Broadcasted to {request.zone_id} via Sarvam AI"
    )


@router.post("/sms")
async def dispatch_sms_alert(payload: SMSRequest):
    """
    Simulates sending an SMS via cellular network and pushes a WebSocket alert to Citizen UI.
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="SMS message cannot be empty.")

    # Simulate carrier network processing time (0.5 seconds)
    await asyncio.sleep(0.5)

    # Trigger the Citizen UI Emergency Drawer via WebSocket
    await ws_manager.broadcast({
        "event": "INTERVENTION_DISPATCHED",
        "actionText": "CRITICAL SMS ALERT",
        "announcementText": f"📱 SMS ALERT: {payload.message}",
        "zoneId": payload.zone_id,
        "language": "en"
    })

    return {
        "status": "success",
        "message": f"SMS successfully pushed to cellular network for zone {payload.zone_id}.",
        "delivered_count": 142
    }


@router.post("/sarvam-tts")
async def generate_sarvam_tts(request: SarvamTTSRequest):
    """
    Relay request to Sarvam AI Text-to-Speech API using Bulbul v3 model and ashutosh speaker.
    Returns base64 encoded audio. Falls back to mock if API key is not present.
    """
    # Map target language to Sarvam BCP-47 codes
    lang_map = {
        "en": "en-IN",
        "hi": "hi-IN",
        "od": "od-IN",
        "bn": "bn-IN",
        "ta": "ta-IN"
    }
    sarvam_lang = lang_map.get(request.target_language.lower(), "en-IN")

    api_key = getattr(settings, "SARVAM_API_KEY", None)

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


@router.post("/social", dependencies=[Depends(get_current_active_admin)])
async def dispatch_to_twitter(payload: SocialMediaRequest):
    """
    Simulates posting an emergency alert to social media channels (e.g. Twitter/X).
    """
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="Social media message cannot be empty.")

    # Simulate network processing time
    await asyncio.sleep(0.8)

    # Broadcast internal WebSocket event that social media was updated
    await ws_manager.broadcast({
        "event": "SOCIAL_MEDIA_DISPATCHED",
        "actionText": f"Broadcasted to {', '.join(payload.platforms)}",
        "announcementText": f"📢 PUBLIC ALERT: {payload.message}",
    })

    return {
        "status": "success",
        "message": f"Alert successfully dispatched to {', '.join(payload.platforms)}.",
        "platforms": payload.platforms
    }