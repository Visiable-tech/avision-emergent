import { API } from './theme';
import { getToken } from './tokenStore';

/**
 * Streams AI reply tokens from the SSE endpoint.
 * Works on Expo Web (fetch streaming supported). On native RN we fall back
 * to the non-streaming REST endpoint via `sendMessage` in api.ts.
 */
export async function streamAiDoubt(
  threadId: string,
  message: string,
  imageBase64: string | null,
  onDelta: (token: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
): Promise<() => void> {
  const token = await getToken();
  if (!token) {
    onError('Not authenticated');
    return () => {};
  }
  const p = new URLSearchParams({ message });
  if (imageBase64) p.set('image_base64', imageBase64);
  const url = `${API}/ai-doubt/threads/${encodeURIComponent(threadId)}/stream?${p.toString()}`;

  const controller = new AbortController();
  (async () => {
    try {
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!resp.ok || !resp.body) {
        onError(`HTTP ${resp.status}`);
        return;
      }
      const reader = (resp.body as any).getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // Parse SSE events separated by \n\n
        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx).trim();
          buffer = buffer.slice(idx + 2);
          if (!raw.startsWith('data:')) continue;
          try {
            const json = JSON.parse(raw.slice(5).trim());
            if (json.delta) onDelta(json.delta);
            else if (json.done) onDone();
            else if (json.error) onError(json.error);
          } catch {
            /* ignore malformed */
          }
        }
      }
      onDone();
    } catch (e: any) {
      if (e?.name !== 'AbortError') onError(e?.message || String(e));
    }
  })();
  return () => controller.abort();
}
