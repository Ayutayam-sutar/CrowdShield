"""
WebSocket endpoint for real-time telemetry streaming.
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError

from app.core.websocket import ws_manager
from app.db.session import async_session
from app.models.venue import Zone
from app.core.config import settings
from app.core.security import ALGORITHM

router = APIRouter()

@router.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    """
    WebSocket Live Stream: Real-time channel for Admin Command Deck and Mobile App.
    Pushes current zone states on connect, then streams live telemetry broadcasts.
    """
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return
        
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(websocket)
    try:
        async with async_session() as db:
            result = await db.execute(select(Zone))
            zones = result.scalars().all()
            initial_state = {
                "event": "INITIAL_STATE",
                "zones": [
                    {
                        "id": z.id,
                        "density": z.density,
                        "risk_level": z.risk_level.value,
                        "headcount": z.current_headcount
                    } for z in zones
                ]
            }
        await ws_manager.send_personal(initial_state, websocket)

        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
