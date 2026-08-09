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
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: MessageCallback[] = [];

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const token = localStorage.getItem('token') || '';
    
    // FIX: Explicitly force 127.0.0.1 instead of localhost to bypass IPv6 routing delays
    const wsBaseUrl = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace('http', 'ws').replace('localhost', '127.0.0.1')
      : 'ws://127.0.0.1:8000';
      
    const wsUrl = `${wsBaseUrl}/api/v1/ws/telemetry?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🟢 [WebSocket] Connected to Telemetry Engine via IPv4');
        this.reconnectAttempts = 0;
        window.dispatchEvent(new CustomEvent('network_status', { detail: { status: 'online' } }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data: TelemetryEvent = JSON.parse(event.data);
          
          // Debug log so we can prove data is reaching the frontend
          if (data.event === 'TELEMETRY_UPDATE') {
            console.log(`⚡ [WebSocket] Inbound Packet -> Zone: ${data.zone?.id} | Density: ${data.zone?.density}`);
          }
          
          this.listeners.forEach(listener => listener(data));
        } catch (err) {
          console.error('🔴 [WebSocket] Error parsing message payload:', err);
        }
      };

      this.ws.onclose = () => {
        console.warn('🟠 [WebSocket] Disconnected from server');
        window.dispatchEvent(new CustomEvent('network_status', { detail: { status: 'offline' } }));
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('🔴 [WebSocket] Network Error:', error);
      };
    } catch (err) {
      console.error('🔴 [WebSocket] Connection initialization failed:', err);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 8000);
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
        console.log(`[WebSocket] Sent explicit subscription for zone: ${zoneId}`);
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