export class AnalyticsWebSocket {
  constructor(url) {
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const defaultHost = typeof window !== 'undefined' ? window.location.host : 'localhost:8000';
    const envWsUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) || null;
    
    this.url = url || envWsUrl || `${protocol}//${defaultHost}/api/ws/analytics`;
    this.ws = null;
    this.listeners = [];
    this.reconnectInterval = 3000;
    this.shouldReconnect = true;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected to CrowdVision AI backend analytics stream');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach((callback) => callback(data));
        } catch (err) {
          console.error('[WebSocket] Error parsing message payload:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.warn('[WebSocket] Error encountered:', error);
      };

      this.ws.onclose = () => {
        console.warn('[WebSocket] Connection closed.');
        if (this.shouldReconnect) {
          setTimeout(() => {
            console.log('[WebSocket] Reconnecting...');
            this.connect();
          }, this.reconnectInterval);
        }
      };
    } catch (err) {
      console.error('[WebSocket] Connection error:', err);
    }
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const analyticsWS = new AnalyticsWebSocket();
