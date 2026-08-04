import { BACKEND_URL } from './theme';
import { getToken } from './tokenStore';

export type WsEvent =
  | { type: 'welcome'; user_id: string; session_id: string; online: number }
  | { type: 'presence'; online: number }
  | { type: 'chat'; id: string; user_id: string; user_name: string; message: string; ts: string; session_id: string }
  | { type: 'hand_raise'; user_id: string; user_name: string; active: boolean; ts: string }
  | { type: 'poll_new'; poll: any }
  | { type: 'poll_update'; poll: any }
  | { type: 'poll_close'; poll: any }
  | { type: 'pong'; ts: string }
  | { type: 'error'; code: string; detail?: string };

export type ClassroomWs = {
  send: (msg: any) => void;
  close: () => void;
  isOpen: () => boolean;
};

/** Build a wss:// URL from the https://... backend URL. */
function wsUrl(sessionId: string, token: string): string {
  const base = BACKEND_URL.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  return `${base}/api/live-classroom/ws/${encodeURIComponent(sessionId)}?token=${encodeURIComponent(token)}`;
}

/** Connect to the classroom WebSocket. Handles token retrieval, auto-reconnect on drop. */
export async function connectClassroom(
  sessionId: string,
  handlers: {
    onEvent: (e: WsEvent) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (err: any) => void;
  },
): Promise<ClassroomWs | null> {
  const token = await getToken();
  if (!token) return null;

  let ws: WebSocket | null = new WebSocket(wsUrl(sessionId, token));
  let stopped = false;
  let heartbeat: any = null;
  let reconnectTimer: any = null;
  let backoff = 1500;

  const clearHeartbeat = () => {
    if (heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  };

  const attachSocket = (sock: WebSocket) => {
    sock.onopen = () => {
      backoff = 1500;
      handlers.onOpen?.();
      // Heartbeat every 25s to keep the connection alive
      heartbeat = setInterval(() => {
        try {
          sock.send(JSON.stringify({ type: 'ping' }));
        } catch {
          /* ignore */
        }
      }, 25000);
    };
    sock.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        handlers.onEvent(data);
      } catch {
        /* ignore */
      }
    };
    sock.onerror = (e) => {
      handlers.onError?.(e);
    };
    sock.onclose = () => {
      clearHeartbeat();
      handlers.onClose?.();
      if (!stopped) {
        reconnectTimer = setTimeout(async () => {
          const t2 = await getToken();
          if (!t2 || stopped) return;
          ws = new WebSocket(wsUrl(sessionId, t2));
          attachSocket(ws);
          backoff = Math.min(backoff * 1.5, 15000);
        }, backoff);
      }
    };
  };

  attachSocket(ws);

  return {
    send: (msg: any) => {
      try {
        ws?.send(JSON.stringify(msg));
      } catch {
        /* ignore */
      }
    },
    isOpen: () => ws?.readyState === WebSocket.OPEN,
    close: () => {
      stopped = true;
      clearHeartbeat();
      if (reconnectTimer) clearTimeout(reconnectTimer);
      try {
        ws?.close();
      } catch {
        /* ignore */
      }
      ws = null;
    },
  };
}
