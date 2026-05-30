import { Link } from 'react-router';
import { Search, UserPlus } from 'lucide-react';
import { ROUTES, expertCustomerPath } from '../../routes';

export type ExpertCustomerInboxRow = {
  id: string;
  email: string;
  name: string;
  lastBmi: { date: string; bmi: number } | null;
  lastMood: { date: string; moodLabel: string; moodScore?: number } | null;
  lastLiveMessage?: {
    id: string;
    content: string;
    ts: number;
    senderRole: 'expert' | 'customer';
  } | null;
  needsReply?: boolean;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

function previewText(row: ExpertCustomerInboxRow) {
  const m = row.lastLiveMessage;
  if (!m) return 'Chưa có tin nhắn';
  const prefix = m.senderRole === 'expert' ? 'Bạn: ' : '';
  const text = m.content.length > 56 ? `${m.content.slice(0, 56)}…` : m.content;
  return prefix + text;
}

type Props = {
  customers: ExpertCustomerInboxRow[];
  activeCustomerId?: string;
  search: string;
  onSearchChange: (q: string) => void;
  loading?: boolean;
  className?: string;
};

export function ExpertCustomerList({
  customers,
  activeCustomerId,
  search,
  onSearchChange,
  loading,
  className = '',
}: Props) {
  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    : customers;

  return (
    <aside
      className={`flex flex-col min-h-0 bg-white border-r border-slate-200 ${className}`}
      aria-label="Danh sách khách hàng"
    >
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-slate-100">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-slate-800 m-0">Khách hàng</h2>
          <span className="text-[11px] text-slate-500 tabular-nums">{customers.length}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Lọc tên, email…"
            className="w-full h-9 pl-9 pr-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
            aria-label="Lọc khách hàng"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading && (
          <p className="text-xs text-slate-500 px-3 py-4 m-0">Đang tải danh sách…</p>
        )}
        {!loading && filtered.length === 0 && (
          <div className="px-3 py-6 text-center">
            <p className="text-sm text-slate-500 m-0 mb-3">
              {q ? 'Không khớp khách hàng.' : 'Chưa có khách hàng được gán.'}
            </p>
            {!q && (
              <Link
                to={ROUTES.expert.customers.root}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Gán khách hàng
              </Link>
            )}
          </div>
        )}
        <ul className="p-2 space-y-0.5 m-0 list-none">
          {filtered.map((p) => {
            const active = p.id === activeCustomerId;
            const urgent = (p.lastMood?.moodScore ?? 99) <= 2;
            return (
              <li key={p.id}>
                <Link
                  to={expertCustomerPath(p.id)}
                  className={`block rounded-xl px-3 py-2.5 transition-colors no-underline ${
                    active ? 'bg-teal-50 ring-1 ring-teal-200/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex gap-3 items-start">
                    <div
                      className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                        active ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {initials(p.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-sm font-semibold truncate m-0 ${active ? 'text-teal-900' : 'text-slate-800'}`}>
                          {p.name}
                        </span>
                      </div>
                      <p className={`text-xs truncate m-0 mt-1 ${p.needsReply ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                        {previewText(p)}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {p.needsReply && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            Chờ trả lời
                          </span>
                        )}
                        {urgent && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                            Cảm xúc thấp
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
