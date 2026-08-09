/**
 * WebSocket manager for connecting to the FastAPI Real-Time Engine.
 */
import { VenueZone, CrowdAlert } from '../types';

export interface TelemetryEvent {
  event: 'TELEMETRY_UPDATE' | 'RESOLVED_BY_VOLUNTEER';
  zone?: VenueZone;
  alert?: CrowdAlert;
  alert_id?: string;
  resolved_by?: string;
  zone_id?: string;
}

type MessageCallback = (data: TelemetryEvent) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private url = 'ws://localhost:8000/ws/telemetry';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: MessageCallback[] = [];

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.ws) return;
    const token = localStorage.getItem('token') || '';
    const wsBaseUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('http', 'ws') 
      : 'ws://localhost:8000';
    const wsUrl = `${wsBaseUrl}/api/v1/ws/telemetry?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to Telemetry Engine');
        this.reconnectAttempts = 0;
        window.dispatchEvent(new CustomEvent('network_status', { detail: { status: 'online' } }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data: TelemetryEvent = JSON.parse(event.data);
          if (data.event === 'TELEMETRY_UPDATE') {
            this.listeners.forEach(listener => listener(data));
          }
        } catch (err) {
          console.error('[WebSocket] Error parsing message', err);
        }
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        window.dispatchEvent(new CustomEvent('network_status', { detail: { status: 'offline' } }));
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error', error);
      };
    } catch (err) {
      console.error('[WebSocket] Connection failed', err);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000); // 1s, 2s, 4s, 8s
      this.reconnectAttempts++;
      console.log(`[WebSocket] Reconnecting in ${timeout}ms (Attempt ${this.reconnectAttempts})`);
      setTimeout(() => this.connect(), timeout);
    }
  }

  subscribe(callback: MessageCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  subscribeToZone(zoneId: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ action: 'subscribe_zone', zone_id: zoneId }));
        console.log(`[WebSocket] Subscribed to telemetry for zone: ${zoneId}`);
      } catch (err) {
        console.error('[WebSocket] Error subscribing to zone', err);
      }
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();
