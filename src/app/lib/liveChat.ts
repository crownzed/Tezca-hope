import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, canUseWebSocket, wsUrl } from './api';

export type LiveMessage = {
  id: string;
  customerId: string;
  senderUserId: string;
  senderRole: 'expert' | 'customer';
  content: string;
  ts: number;
};

export type LiveChatTransport = 'ws' | 'poll' | 'connecting';

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
  customerId: string | undefined;
  historyUrl: string;
  sendUrl: string;
  senderRole: 'customer' | 'expert';
  enabled?: boolean;
  onIncoming?: (message: LiveMessage) => void;
};

export function useLiveChat({
  token,
  customerId,
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
  const customerIdRef = useRef(customerId);
  customerIdRef.current = customerId;
  const onIncomingRef = useRef(onIncoming);
  onIncomingRef.current = onIncoming;

  const appendMessages = useCallback((incoming: LiveMessage[]) => {
    const activeCustomerId = customerIdRef.current;
    if (!activeCustomerId || !incoming.length) return;
    const forCustomer = incoming.filter((m) => m.customerId === activeCustomerId);
    if (!forCustomer.length) return;
    setMessages((prev) => {
      const base = prev.filter((m) => m.customerId === activeCustomerId);
      const next = mergeMessages(base, forCustomer);
      sinceRef.current = maxTs(next);
      return next;
    });
    for (const m of forCustomer) onIncomingRef.current?.(m);
  }, []);

  const loadHistory = useCallback(async () => {
    if (!token || !customerId || !enabled) return;
    const loadFor = customerId;
    setLoading(true);
    try {
      const r = await apiFetch<{ messages: LiveMessage[] }>(historyUrl, { token });
      if (customerIdRef.current !== loadFor) return;
      const list = (r.messages || []).filter((m) => m.customerId === loadFor);
      setMessages(list);
      sinceRef.current = maxTs(list);
      setSendError('');
    } catch {
      if (customerIdRef.current !== loadFor) return;
      setMessages([]);
      sinceRef.current = 0;
    } finally {
      if (customerIdRef.current === loadFor) setLoading(false);
    }
  }, [token, customerId, historyUrl, enabled]);

  useEffect(() => {
    if (!enabled || !token || !customerId) {
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
  }, [enabled, token, customerId, loadHistory]);

  /** Đổi phòng WS khi chuyên gia chọn khách hàng khác (không cần reconnect). */
  useEffect(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN && customerId) {
      ws.send(JSON.stringify({ type: 'join', customerId }));
    }
  }, [customerId]);

  const poll = useCallback(async () => {
    if (!token || !customerId || !enabled) return;
    const since = sinceRef.current;
    const url = since > 0 ? `${historyUrl}?since=${since}` : historyUrl;
    try {
      const r = await apiFetch<{ messages: LiveMessage[] }>(url, { token });
      appendMessages(r.messages || []);
    } catch {
      /* ignore transient poll errors */
    }
  }, [token, customerId, historyUrl, enabled, appendMessages]);

  useEffect(() => {
    if (!enabled || !token || !customerId) return;

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
        ws.send(JSON.stringify({ type: 'join', customerId }));
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
  }, [enabled, token, customerId, appendMessages]);

  useEffect(() => {
    if (!enabled || !token || !customerId) return;
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
  }, [enabled, token, customerId, transport, poll]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !token || !customerId || !enabled) return false;
      setSending(true);
      setSendError('');

      const optimisticId = `opt-${Date.now()}`;
      const optimistic: LiveMessage = {
        id: optimisticId,
        customerId,
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
        if (r.message.customerId !== customerIdRef.current) return true;
        setMessages((prev) => {
          const pid = customerIdRef.current;
          const withoutOpt = prev.filter((m) => m.id !== optimisticId && m.customerId === pid);
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
    [token, customerId, enabled, sendUrl, appendMessages],
  );

  const ready = Boolean(customerId && token && (transport === 'ws' || transport === 'poll') && !loading);

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
