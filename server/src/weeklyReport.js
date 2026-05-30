import {
  findUserById,
  getCustomerIdsForExpert,
  listBmiForUser,
  listMoodsForUser,
  listBotMessagesForUser,
  listLiveMessagesForCustomer,
} from './db.js';

function parseIsoDate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Thứ Hai đầu tuần (local) */
export function mondayOfWeek(ref = new Date()) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function weekRangeFromStart(weekStartIso) {
  const start = parseIsoDate(weekStartIso) || mondayOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const from = toIsoDate(start);
  const to = toIsoDate(end);
  const startTs = start.getTime();
  const endTs = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999).getTime();
  return { from, to, startTs, endTs };
}

function formatPeriodLabel(from, to) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [, tm, td] = to.split('-').map(Number);
  return `${fd}/${fm} – ${td}/${tm}/${fy}`;
}

function inDateRange(isoDate, from, to) {
  return isoDate >= from && isoDate <= to;
}

function inTsRange(ts, startTs, endTs) {
  return ts >= startTs && ts <= endTs;
}

function isCustomerSenderRole(role) {
  return role === 'customer' || role === 'patient';
}

export function buildWeeklyReport(expertId, weekStartIso) {
  const { from, to, startTs, endTs } = weekRangeFromStart(weekStartIso);
  const customerIds = getCustomerIdsForExpert(expertId);

  let liveMessagesTotal = 0;
  let liveFromCustomers = 0;
  let liveFromExpert = 0;
  let bmiEntries = 0;
  let moodEntries = 0;
  let botMessages = 0;
  let needsReplyCount = 0;
  let lowMoodCount = 0;
  let activeCustomers = 0;

  const customers = customerIds.map((cid) => {
    const u = findUserById(cid);
    const live = listLiveMessagesForCustomer(cid).filter((m) => inTsRange(m.ts, startTs, endTs));
    const bmi = listBmiForUser(cid).filter((e) => inDateRange(e.date, from, to));
    const moods = listMoodsForUser(cid).filter((e) => inDateRange(e.date, from, to));
    const bot = listBotMessagesForUser(cid).filter((m) => inTsRange(m.ts, startTs, endTs));

    const liveCustomer = live.filter((m) => isCustomerSenderRole(m.senderRole)).length;
    const liveExpert = live.filter((m) => m.senderRole === 'expert').length;

    liveMessagesTotal += live.length;
    liveFromCustomers += liveCustomer;
    liveFromExpert += liveExpert;
    bmiEntries += bmi.length;
    moodEntries += moods.length;
    botMessages += bot.length;

    const avgMood =
      moods.length > 0
        ? Math.round((moods.reduce((s, m) => s + m.moodScore, 0) / moods.length) * 10) / 10
        : null;

    const weekMoodLow = moods.some((m) => m.moodScore <= 2);
    if (weekMoodLow) lowMoodCount += 1;

    const lastLive = live.length ? live[live.length - 1] : null;
    const needsReply = lastLive ? isCustomerSenderRole(lastLive.senderRole) : false;
    if (needsReply) needsReplyCount += 1;

    const active = live.length + bmi.length + moods.length + bot.length > 0;
    if (active) activeCustomers += 1;

    const highlights = [];
    if (needsReply) highlights.push('Cần phản hồi chat');
    if (weekMoodLow) highlights.push('Có ngày tâm trạng thấp (≤2/5)');
    if (!active) highlights.push('Chưa có hoạt động trong tuần');

    const activityDates = [
      ...bmi.map((e) => e.date),
      ...moods.map((e) => e.date),
      ...live.map((m) => toIsoDate(new Date(m.ts))),
    ].sort();
    const lastActivity = activityDates.length ? activityDates[activityDates.length - 1] : null;

    return {
      id: cid,
      name: u?.name || '—',
      email: u?.email || '',
      stats: {
        liveMessages: live.length,
        liveFromCustomer: liveCustomer,
        liveFromExpert: liveExpert,
        bmiEntries: bmi.length,
        moodEntries: moods.length,
        botMessages: bot.length,
        avgMoodScore: avgMood,
      },
      needsReply,
      highlights,
      lastActivity,
    };
  });

  customers.sort((a, b) => {
    if (a.needsReply !== b.needsReply) return a.needsReply ? -1 : 1;
    const ta = a.lastActivity || '';
    const tb = b.lastActivity || '';
    if (tb !== ta) return tb.localeCompare(ta);
    return (a.name || '').localeCompare(b.name || '', 'vi');
  });

  return {
    period: {
      from,
      to,
      weekStart: from,
      label: formatPeriodLabel(from, to),
    },
    summary: {
      customerCount: customerIds.length,
      activeCustomers,
      liveMessagesTotal,
      liveFromCustomers,
      liveFromExpert,
      bmiEntries,
      moodEntries,
      botMessages,
      needsReplyCount,
      lowMoodCount,
    },
    customers,
  };
}
