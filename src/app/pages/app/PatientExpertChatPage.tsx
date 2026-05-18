import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { ROUTES } from '../../routes';
import { Send, Stethoscope } from 'lucide-react';
import { apiFetch, wsUrl } from '../../lib/api';
import { usePatientAuth } from '../../context/PatientAuthContext';

type LiveMessage = {
  id: string;
  patientId: string;
  senderUserId: string;
  senderRole: 'expert' | 'patient';
  content: string;
  ts: number;
};

type CareExpert = { id: string; name: string; email: string };

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function PatientExpertChatPage() {
  const { token, user } = usePatientAuth();
  const [liveMsgs, setLiveMsgs] = useState<LiveMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [wsReady, setWsReady] = useState(false);
  const [experts, setExperts] = useState<CareExpert[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    apiFetch<{ experts: CareExpert[] }>('/api/me/care-team', { token })
      .then((r) => setExperts(r.experts || []))
      .catch(() => setExperts([]));
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;
    setLoadingHistory(true);
    apiFetch<{ messages: LiveMessage[] }>('/api/me/live-messages', { token })
      .then((r) => setLiveMsgs(r.messages || []))
      .catch(() => setLiveMsgs([]))
      .finally(() => setLoadingHistory(false));
  }, [token, user]);

  useEffect(() => {
    if (!token || !user) return;
    const pid = user.id;
    const ws = new WebSocket(wsUrl(token));
    wsRef.current = ws;
    ws.onopen = () => {
      setWsReady(true);
      ws.send(JSON.stringify({ type: 'join', patientId: pid }));
    };
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data as string) as { type: string; message?: LiveMessage };
        if (d.type === 'live_message' && d.message) {
          setLiveMsgs((prev) => (prev.some((m) => m.id === d.message!.id) ? prev : [...prev, d.message!]));
        }
      } catch {
        /* ignore */
      }
    };
    ws.onclose = () => setWsReady(false);
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [token, user]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMsgs.length]);

  const send = () => {
    const text = draft.trim();
    if (!text || !user || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', patientId: user.id, text }));
    setDraft('');
  };

  if (!user || !token) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center space-y-4">
        <p className="opacity-80" style={{ color: '#1A202C' }}>
          Đăng nhập để trò chuyện với chuyên gia qua server.
        </p>
        <Link
          to={ROUTES.app.login}
          className="inline-block rounded-full px-8 py-3 font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <div className="mb-4">
        <h1 className="text-3xl font-bold" style={{ color: '#1A202C' }}>
          Chat chuyên gia
        </h1>
        <p className="text-sm opacity-70 mt-1" style={{ color: '#1A202C' }}>
          Tin nhắn thời gian thực (WebSocket). Trạng thái:{' '}
          {wsReady ? <span style={{ color: '#0F766E' }}>đã kết nối</span> : 'đang kết nối…'} — kênh hỗ trợ đồng hành,
          không thay cho khám trực tiếp.
        </p>
      </div>

      {experts.length > 0 ? (
        <div
          className="mb-3 rounded-xl border px-3 py-2.5 text-xs flex gap-2 items-start"
          style={{ borderColor: 'rgba(45, 212, 191, 0.35)', backgroundColor: 'rgba(45, 212, 191, 0.08)', color: '#1A202C' }}
        >
          <Stethoscope size={16} className="shrink-0 text-teal-700 mt-0.5" />
          <span>
            <strong>Chuyên gia đồng hành:</strong>{' '}
            {experts.map((e) => e.name).join(', ')}. Tin nhắn tới đây họ có thể xem trên Doctor Desk.
          </span>
        </div>
      ) : (
        <div
          className="mb-3 rounded-xl border px-3 py-2.5 text-xs"
          style={{ borderColor: 'rgba(251, 191, 36, 0.5)', backgroundColor: 'rgba(254, 243, 199, 0.5)', color: '#78350f' }}
        >
          Bạn <strong>chưa được chuyên gia nào gán</strong> trên Tezca. Hãy gửi email đăng ký cho họ — họ thêm bạn trong
          mục &quot;Bệnh nhân được gán&quot; sau khi đăng nhập dashboard chuyên gia.
        </div>
      )}

      <div
        className="flex-1 rounded-2xl border p-4 overflow-y-auto space-y-3 mb-4 min-h-[280px] max-h-[50vh]"
        style={{ backgroundColor: 'white', borderColor: 'rgba(26, 32, 44, 0.08)' }}
      >
        {loadingHistory && (
          <p className="text-sm text-center opacity-50 m-0 py-8" style={{ color: '#1A202C' }}>
            Đang tải lịch sử chat…
          </p>
        )}
        {!loadingHistory && liveMsgs.length === 0 && (
          <p className="text-sm text-center opacity-60 m-0 py-8" style={{ color: '#1A202C' }}>
            Chưa có tin nhắn. Hãy chào chuyên gia — họ sẽ phản hồi trên Doctor Desk.
          </p>
        )}
        {liveMsgs.map((m) => {
          const mine = m.senderRole === 'patient';
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] rounded-2xl px-4 py-2 text-sm"
                style={
                  mine
                    ? { background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)', color: 'white' }
                    : { backgroundColor: 'rgba(26, 32, 44, 0.06)', color: '#1A202C' }
                }
              >
                <p className="m-0 leading-relaxed">{m.content}</p>
                <p className={`text-[10px] mt-1 m-0 ${mine ? 'text-white/70' : 'opacity-50'}`}>{formatClock(m.ts)}</p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={!wsReady}
          className="flex-1 rounded-full border px-5 py-3 text-sm disabled:opacity-50"
          style={{ borderColor: 'rgba(26, 32, 44, 0.12)' }}
          placeholder={wsReady ? 'Nhắn cho chuyên gia…' : 'Đang kết nối…'}
        />
        <button
          type="button"
          onClick={send}
          disabled={!wsReady || !draft.trim()}
          className="rounded-full px-5 py-3 text-white disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%)' }}
          aria-label="Gửi"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
