import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  Activity,
  AlertCircle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Heart,
  Loader2,
  MessageSquare,
  Scale,
  Bot,
} from 'lucide-react';
import { apiFetch } from '../../lib/api';
import { useExpertAuth } from '../../context/ExpertAuthContext';
import { ROUTES, expertPatientPath } from '../../routes';

type WeeklyReport = {
  period: { from: string; to: string; weekStart: string; label: string };
  summary: {
    patientCount: number;
    activePatients: number;
    liveMessagesTotal: number;
    liveFromPatients: number;
    liveFromExpert: number;
    bmiEntries: number;
    moodEntries: number;
    botMessages: number;
    needsReplyCount: number;
    lowMoodCount: number;
  };
  patients: {
    id: string;
    name: string;
    email: string;
    stats: {
      liveMessages: number;
      liveFromPatient: number;
      liveFromExpert: number;
      bmiEntries: number;
      moodEntries: number;
      botMessages: number;
      avgMoodScore: number | null;
    };
    needsReply: boolean;
    highlights: string[];
    lastActivity: string | null;
  }[];
};

function mondayOfWeek(ref = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftWeekStart(isoMonday: string, weeks: number) {
  const [y, m, d] = isoMonday.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + weeks * 7);
  return toIsoDate(dt);
}

function formatShortIso(iso: string) {
  const [, mm, dd] = iso.split('-');
  return `${dd}/${mm}`;
}

export function ExpertWeeklyReportPage() {
  const { token } = useExpertAuth();
  const [weekStart, setWeekStart] = useState(() => toIsoDate(mondayOfWeek()));
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const isCurrentWeek = useMemo(() => weekStart === toIsoDate(mondayOfWeek()), [weekStart]);

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    apiFetch<WeeklyReport>(`/api/expert/reports/weekly?weekStart=${encodeURIComponent(weekStart)}`, { token })
      .then((r) => {
        setReport(r);
        setError('');
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Không tải được báo cáo'))
      .finally(() => setLoading(false));
  }, [token, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const copySummary = async () => {
    if (!report) return;
    const s = report.summary;
    const lines = [
      `Báo cáo tuần Tezca — ${report.period.label}`,
      `Bệnh nhân gán: ${s.patientCount} · Hoạt động: ${s.activePatients}`,
      `Chat live: ${s.liveMessagesTotal} (BN ${s.liveFromPatients} / CG ${s.liveFromExpert})`,
      `BMI: ${s.bmiEntries} · Nhật ký cảm xúc: ${s.moodEntries} · Tezca AI: ${s.botMessages}`,
      `Cần phản hồi: ${s.needsReplyCount} · Tâm trạng thấp: ${s.lowMoodCount}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white m-0 flex items-center gap-2">
              <CalendarRange className="text-teal-400" size={26} />
              Báo cáo theo tuần
            </h1>
            <p className="text-sm text-slate-400 mt-2 m-0 max-w-xl">
              Tổng hợp hoạt động bệnh nhân được gán trong tuần (Thứ Hai – Chủ Nhật): chat, BMI, nhật ký cảm xúc và Tezca AI.
              Dùng để theo dõi đồng hành — không thay cho khám trực tiếp.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to={ROUTES.expert.doctorDesk}
              className="text-sm font-medium rounded-xl px-4 py-2.5 text-teal-300 border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20"
            >
              Doctor Desk
            </Link>
            <button
              type="button"
              onClick={copySummary}
              disabled={!report}
              className="text-sm font-medium rounded-xl px-4 py-2.5 text-slate-300 border border-slate-600 hover:bg-slate-800 disabled:opacity-40"
            >
              {copied ? 'Đã sao chép' : 'Sao chép tóm tắt'}
            </button>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3"
          role="navigation"
          aria-label="Chọn tuần"
        >
          <button
            type="button"
            onClick={() => setWeekStart((w) => shiftWeekStart(w, -1))}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-300 border border-slate-700 hover:bg-slate-800"
          >
            <ChevronLeft size={18} />
            Tuần trước
          </button>
          <div className="text-center min-w-[180px]">
            <p className="text-sm font-semibold text-white m-0">
              {loading && !report ? 'Đang tải…' : report?.period.label ?? '—'}
            </p>
            {report && (
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                {formatShortIso(report.period.from)} – {formatShortIso(report.period.to)}
                {isCurrentWeek && <span className="text-teal-400/90"> · Tuần này</span>}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setWeekStart((w) => shiftWeekStart(w, 1))}
            disabled={isCurrentWeek}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-slate-300 border border-slate-700 hover:bg-slate-800 disabled:opacity-40"
          >
            Tuần sau
            <ChevronRight size={18} />
          </button>
        </div>
      </header>

      {error && (
        <p className="text-sm text-rose-400 bg-rose-950/40 border border-rose-900/50 rounded-xl px-4 py-3 m-0">{error}</p>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-slate-400">
          <Loader2 className="animate-spin" size={22} />
          <span className="text-sm">Đang tạo báo cáo…</span>
        </div>
      )}

      {!loading && report && (
        <>
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <SummaryCard icon={Activity} label="BN hoạt động" value={`${report.summary.activePatients}/${report.summary.patientCount}`} />
            <SummaryCard icon={MessageSquare} label="Tin chat live" value={String(report.summary.liveMessagesTotal)} sub={`BN ${report.summary.liveFromPatients} · CG ${report.summary.liveFromExpert}`} />
            <SummaryCard icon={Scale} label="Ghi BMI" value={String(report.summary.bmiEntries)} />
            <SummaryCard icon={Heart} label="Nhật ký cảm xúc" value={String(report.summary.moodEntries)} />
            <SummaryCard icon={Bot} label="Tin Tezca AI" value={String(report.summary.botMessages)} />
            <SummaryCard icon={AlertCircle} label="Cần phản hồi" value={String(report.summary.needsReplyCount)} accent={report.summary.needsReplyCount > 0} />
            <SummaryCard icon={Heart} label="Tâm trạng thấp" value={String(report.summary.lowMoodCount)} accent={report.summary.lowMoodCount > 0} />
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-teal-400" />
              <h2 className="text-sm font-semibold text-white m-0">Chi tiết theo bệnh nhân</h2>
            </div>
            {report.patients.length === 0 ? (
              <p className="text-sm text-slate-500 px-4 py-8 m-0 text-center">Chưa có bệnh nhân được gán.</p>
            ) : (
              <ul className="divide-y divide-slate-800 list-none m-0 p-0">
                {report.patients.map((p) => (
                  <li key={p.id} className="px-4 py-4 hover:bg-slate-800/40 transition-colors">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <Link to={expertPatientPath(p.id)} className="font-semibold text-white hover:text-teal-400">
                            {p.name}
                          </Link>
                          <p className="text-xs text-slate-500 m-0 mt-0.5">{p.email}</p>
                          {p.stats.avgMoodScore != null && (
                            <p className="text-xs text-slate-400 m-0 mt-1">Điểm cảm xúc TB: {p.stats.avgMoodScore}/5</p>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs shrink-0 max-w-[220px]">
                          <StatPill label="Chat" value={p.stats.liveMessages} />
                          <StatPill label="BMI" value={p.stats.bmiEntries} />
                          <StatPill label="Cảm xúc" value={p.stats.moodEntries} />
                          <StatPill label="AI" value={p.stats.botMessages} />
                        </div>
                      </div>
                      {p.highlights.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5 list-none p-0 m-0">
                          {p.highlights.map((h) => (
                            <li
                              key={h}
                              className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                h.includes('phản hồi')
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : h.includes('thấp')
                                    ? 'bg-rose-500/20 text-rose-300'
                                    : 'bg-slate-700 text-slate-400'
                              }`}
                            >
                              {h}
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <Link
                          to={`${ROUTES.expert.doctorDesk}/${encodeURIComponent(p.id)}`}
                          className="font-medium text-teal-400 hover:underline"
                        >
                          Mở Doctor Desk
                        </Link>
                        {p.lastActivity && (
                          <span className="text-slate-500">Hoạt động cuối: {formatShortIso(p.lastActivity)}</span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        accent ? 'border-amber-500/40 bg-amber-500/10' : 'border-slate-800 bg-slate-900/80'
      }`}
    >
      <Icon size={16} className={accent ? 'text-amber-400' : 'text-teal-400'} />
      <p className="text-lg font-bold text-white mt-2 m-0">{value}</p>
      <p className="text-[11px] text-slate-500 m-0 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-600 m-0 mt-1">{sub}</p>}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-950/80 border border-slate-800 px-2 py-1.5 text-center">
      <p className="text-slate-500 m-0 text-[10px]">{label}</p>
      <p className="text-white font-semibold m-0">{value}</p>
    </div>
  );
}