import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, wsUrl } from './api';

export type LiveMessage = {
  id: string;
  patientId: string;
  senderUserId: string;
  senderRole: 'expert' | 'patient';
  content: string;
  ts: number;
};

export type LiveChatTransport = 'ws' | 'poll' | 'connecting';

function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1';
}

/** Vercel/serverless không có WebSocket — dùng HTTP + polling. */
export function canUseWebSocket(): boolean {
  if (typeof window === 'undefined') return false;
  return isLocalDevHost() || import.meta.env.DEV;
}

function mergeMessages(prev: LiveMessage[], incoming: LiveMessage[]): LiveMessage[] {
  if (!incoming.length) return prev;
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort((a, b) => a.ts - b.ts);
}

function maxTs(msgs: LiveMessage[]): number {
  return msgs.reduce((max, m) => (m.ts > max ? m.ts : max), 0);
}

type UseLiveChatOptions = {
  token: string | null;
  patientId: string | undefined;
  historyUrl: string;
  sendUrl: string;
  senderRole: 'patient' | 'expert';
  enabled?: boolean;
  onIncoming?: (message: LiveMessage) => void;
};

export function useLiveChat({
  token,
  patientId,
  historyUrl,
  sendUrl,
  senderRole,
  enabled = true,
  onIncoming,
}: UseLiveChatOptions) {
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [transport, setTransport] = useState<LiveChatTransport>('connecting');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const sinceRef = useRef(0);
  const patientIdRef = useRef(patientId);
  patientIdRef.current = patientId;
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;

  const appendMessages = useCallback((incoming: LiveMessage[]) => {
    const activePatientId = patientIdRef.current;
    if (!activePatientId || !incoming.length) return;
    const forPatient = incoming.filter((m) => m.patientId === activePatientId);
    if (!forPatient.length) return;
    setMessages((prev) => {
      const base = prev.filter((m) => m.patientId === activePatientId);
      const next = mergeMessages(base, forPatient);
      sinceRef.current = maxTs(next);
      return next;
    });
    for (const m of forPatient) onIncomingRef.current?.(m);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!token || !patientId || !enabled) return;
    const loadFor = patientId;
    setLoading(true);
    try {
      const r = await apiFetch<{ messages: LiveMessage[] }>(historyUrl, { token });
      if (patientIdRef.current !== loadFor) return;
      const list = (r.messages || []).filter((m) => m.patientId === loadFor);
      setMessages(list);
      sinceRef.current = maxTs(list);
      setSendError('');
    } catch {
      if (patientIdRef.current !== loadFor) return;
      setMessages([]);
      sinceRef.current = 0;
    } finally {
      if (patientIdRef.current === loadFor) setLoading(false);
    }
  }, [token, patientId, historyUrl, enabled]);

  useEffect(() => {
    if (!enabled || !token || !patientId) {
      setMessages([]);
      sinceRef.current = 0;
      setLoading(false);
      setTransport('connecting');
      return;
    }
    setMessages([]);
    sinceRef.current = 0;
    setSendError('');
    setLoading(true);
    loadHistory();
  }, [enabled, token, patientId, loadHistory]);

  /** Đổi phòng WS khi chuyên gia chọn bệnh nhân khác (không cần reconnect). */
  useEffect(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN && patientId) {
      ws.send(JSON.stringify({ type: 'join', patientId }));
    }
  }, [patientId]);

  const poll = useCallback(async () => {
    if (!token || !patientId || !enabled) return;
    const since = sinceRef.current;
    const url = since > 0 ? `${historyUrl}?since=${since}` : historyUrl;
    try {
      const r = await apiFetch<{ messages: LiveMessage[] }>(url, { token });
      appendMessages(r.messages || []);
    } catch {
      /* ignore transient poll errors */
    }
  }, [token, patientId, historyUrl, enabled, appendMessages]);

  useEffect(() => {
    if (!enabled || !token || !patientId) return;

    if (!canUseWebSocket()) {
      setTransport('poll');
      return;
    }

    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;

    const connect = () => {
      if (closed) return;
      setTransport('connecting');
      const ws = new WebSocket(wsUrl(token));
      wsRef.current = ws;

      const connectTimeout = window.setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          setTransport('poll');
        }
      }, 4000);

      ws.onopen = () => {
        window.clearTimeout(connectTimeout);
        attempts = 0;
        setTransport('ws');
        ws.send(JSON.stringify({ type: 'join', patientId }));
      };

      ws.onmessage = (ev) => {
        try {
          const d = JSON.parse(ev.data as string) as { type: string; message?: LiveMessage };
          if (d.type === 'live_message' && d.message) {
            appendMessages([d.message]);
          }
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        window.clearTimeout(connectTimeout);
        wsRef.current = null;
        if (closed) return;
        setTransport('poll');
        if (attempts < 6) {
          attempts += 1;
          const delay = Math.min(1000 * 2 ** attempts, 20000);
          reconnectTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        window.clearTimeout(connectTimeout);
      };
    };

    connect();

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, token, patientId, appendMessages]);

  useEffect(() => {
    if (!enabled || !token || !patientId) return;
    if (transport !== 'poll' && transport !== 'ws') return;

    const intervalMs = transport === 'poll' ? 3000 : 12000;

    const tick = () => {
      if (document.visibilityState === 'hidden') return;
      poll();
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, token, patientId, transport, poll]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !token || !patientId || !enabled) return false;
      setSending(true);
      setSendError('');

      const optimisticId = `opt-${Date.now()}`;
      const optimistic: LiveMessage = {
        id: optimisticId,
        patientId,
        senderUserId: '',
        senderRole,
        content: trimmed,
        ts: Date.now(),
      };
      appendMessages([optimistic]);

      try {
        const r = await apiFetch<{ message: LiveMessage }>(sendUrl, {
          method: 'POST',
          token,
          body: JSON.stringify({ text: trimmed }),
        });
        if (r.message.patientId !== patientIdRef.current) return true;
        setMessages((prev) => {
          const pid = patientIdRef.current;
          const withoutOpt = prev.filter((m) => m.id !== optimisticId && m.patientId === pid);
          return mergeMessages(withoutOpt, [r.message]);
        });
        sinceRef.current = Math.max(sinceRef.current, r.message.ts);
        return true;
      } catch (e) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        setSendError(e instanceof Error ? e.message : 'Không gửi được tin nhắn');
        return false;
      } finally {
        setSending(false);
      }
    },
    [token, patientId, enabled, sendUrl, appendMessages],
  );

  const ready = Boolean(patientId && token && (transport === 'ws' || transport === 'poll') && !loading);

  const transportLabel =
    transport === 'ws'
      ? 'Thời gian thực (WebSocket)'
      : transport === 'poll'
        ? 'Đồng bộ định kỳ (HTTP)'
        : 'Đang kết nối…';

  return {
    messages,
    loading,
    transport,
    transportLabel,
    ready,
    sending,
    sendError,
    send,
    refresh: loadHistory,
  };
}
