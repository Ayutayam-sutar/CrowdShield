"""
WebSocket ConnectionManager for real-time telemetry broadcasting.
Manages active WebSocket connections and broadcasts JSON payloads
to all connected Admin Dashboard and Citizen Mobile App clients.
"""
import json
import logging
from fastapi import WebSocket

logger = logging.getLogger("crowdshield.websocket")

class ConnectionManager:
    """
    In-memory WebSocket connection manager.
    Thread-safe for single-process async operation (standard uvicorn).
    """

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        """Accept a new WebSocket connection and register it."""
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(
            "WebSocket client connected. Total active: %d",
            len(self.active_connections),
        )

    def disconnect(self, websocket: WebSocket) -> None:
        """Remove a disconnected WebSocket client."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(
            "WebSocket client disconnected. Total active: %d",
            len(self.active_connections),
        )

    async def send_personal(self, message: dict, websocket: WebSocket) -> None:
        """Send a JSON message to a single connected client."""
        await websocket.send_json(message)

    async def broadcast(self, message: dict) -> None:
        """
        Broadcast a JSON message to ALL connected WebSocket clients.
        Silently removes clients that have disconnected mid-broadcast.
        """
        stale: list[WebSocket] = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)

        for ws in stale:
            self.disconnect(ws)

    @property
    def client_count(self) -> int:
        """Number of currently connected WebSocket clients."""
        return len(self.active_connections)

ws_manager = ConnectionManager()
