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

