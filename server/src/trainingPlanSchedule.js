/** Lịch bài tập theo ngày (ISO) — dùng chung server + tích hợp AI. */

function weekIsoDates() {
  const today = new Date();
  const dow = today.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    out.push(`${y}-${m}-${day}`);
  }
  return out;
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function structureExerciseList(titles, idBase) {
  return titles.slice(0, 12).map((title, i) => ({
    id: idBase + i,
    title,
    sets: 1,
    reps: 'Theo kế hoạch',
    isPTLocked: true,
    completed: false,
    actualWeight: '',
  }));
}

function dayIndexFromHeader(line) {
  const trimmed = line.trim().replace(/^#+\s*/, '').replace(/\*\*/g, '');
  const ngay = trimmed.match(/^(?:ngày|ngay)\s*(\d{1,2})/i);
  if (ngay) {
    const n = Number(ngay[1]);
    if (n >= 1 && n <= 7) return n - 1;
  }
  const thu = trimmed.match(/^(?:thứ|thu)\s*([2-7]|hai|ba|tư|tu|năm|nam|sáu|sau|bảy|bay|cn|chủ nhật)/i);
  if (thu) {
    const map = {
      '2': 0,
      hai: 0,
      '3': 1,
      ba: 1,
      '4': 2,
      tư: 2,
      tu: 2,
      '5': 3,
      năm: 3,
      nam: 3,
      '6': 4,
      sáu: 4,
      sau: 4,
      '7': 5,
      bảy: 5,
      bay: 5,
      cn: 6,
      'chủ nhật': 6,
    };
    const key = thu[1].toLowerCase();
    if (key in map) return map[key];
  }
  const en = trimmed.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
  if (en) {
    const map = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6,
    };
    return map[en[1].toLowerCase()] ?? null;
  }
  return null;
}

function extractBulletTitle(line) {
  const trimmed = line.trim();
  const bullet = trimmed.match(/^[-*]\s+(.+)$/);
  if (!bullet) return null;
  let title = bullet[1].replace(/\*\*/g, '').trim();
  title = title.replace(/^\[[ x]\]\s*/i, '').trim();
  if (title.length < 4) return null;
  if (title.length > 140) title = `${title.slice(0, 137)}…`;
  return title;
}

/** @returns {{ mode: 'daily'|'shared', byDay: Record<string, object[]>, flat: object[] }} */
export function parseExercisesByDayFromPlanMarkdown(plan) {
  const lines = String(plan || '').split('\n');
  let inMotion = false;
  const buckets = Array.from({ length: 7 }, () => []);
  let currentDay = null;
  const seenGlobal = new Set();

  const pushTitle = (dayIdx, title) => {
    const key = normalizeTitle(title);
    if (seenGlobal.has(key)) return;
    seenGlobal.add(key);
    buckets[dayIdx].push(title);
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^###\s+/.test(trimmed)) {
      const heading = trimmed.replace(/^###\s+/, '').toLowerCase();
      inMotion = /vận động|van dong|tập luyện|tap luyen|hoạt động thể|exercise/.test(heading);
      const dayIdx = dayIndexFromHeader(trimmed);
      if (dayIdx != null) {
        inMotion = true;
        currentDay = dayIdx;
      }
      continue;
    }
    if (/^##\s+/.test(trimmed)) {
      const dayIdx = dayIndexFromHeader(trimmed);
      if (dayIdx != null) {
        inMotion = true;
        currentDay = dayIdx;
        continue;
      }
    }
    if (dayIndexFromHeader(trimmed) != null && /ngày|thứ|monday|tuesday|wednesday|thursday|friday|saturday|sunday/i.test(trimmed)) {
      inMotion = true;
      currentDay = dayIndexFromHeader(trimmed);
      continue;
    }
    if (!inMotion) continue;
    const title = extractBulletTitle(line);
    if (!title) continue;
    pushTitle(currentDay ?? 0, title);
  }

  const week = weekIsoDates();
  const idBase = Date.now();

  if (!buckets.some((b) => b.length)) {
    const flatTitles = [];
    for (const line of lines) {
      const title = extractBulletTitle(line);
      if (!title) continue;
      const raw = title.toLowerCase();
      if (
        !/(phút|phut|buổi|buoi|đi bộ|di bo|squat|cardio|tập|tap|zone|hiit|yoga|mobility|kháng|khang)/.test(
          raw,
        )
      ) {
        continue;
      }
      const key = normalizeTitle(title);
      if (seenGlobal.has(key)) continue;
      seenGlobal.add(key);
      flatTitles.push(title);
    }
    if (!flatTitles.length) {
      return { mode: 'shared', byDay: {}, flat: [] };
    }
    const byDay = {};
    flatTitles.forEach((title, i) => {
      const dayIdx = i % 7;
      const iso = week[dayIdx];
      if (!byDay[iso]) byDay[iso] = [];
      byDay[iso].push(
        structureExerciseList([title], idBase + dayIdx * 100 + byDay[iso].length)[0],
      );
    });
    return { mode: 'daily', byDay, flat: Object.values(byDay).flat() };
  }

  const byDay = {};
  buckets.forEach((titles, dayIdx) => {
    if (!titles.length) return;
    const iso = week[dayIdx];
    if (!iso) return;
    byDay[iso] = structureExerciseList(titles, idBase + dayIdx * 1000);
  });
  return { mode: 'daily', byDay, flat: Object.values(byDay).flat() };
}

export function parseExercisesFromPlanMarkdown(plan) {
  return parseExercisesByDayFromPlanMarkdown(plan).flat;
}

export function isScheduleV2(raw) {
  return raw && typeof raw === 'object' && !Array.isArray(raw) && raw.v === 2 && raw.byDay;
}

export function flattenScheduleExercises(raw) {
  if (Array.isArray(raw)) return raw;
  if (isScheduleV2(raw)) {
    return Object.values(raw.byDay || {}).flat();
  }
  return [];
}

export function exercisesForDateFromStored(raw, dateIso) {
  if (isScheduleV2(raw)) {
    const list = raw.byDay?.[dateIso];
    if (Array.isArray(list) && list.length) return list;
    return [];
  }
  if (Array.isArray(raw)) return raw;
  return [];
}

export function toScheduleV2Json(byDay) {
  const stripped = {};
  for (const [iso, list] of Object.entries(byDay || {})) {
    stripped[iso] = (list || []).map((ex) => ({
      id: ex.id,
      title: ex.title,
      sets: ex.sets,
      reps: ex.reps,
      isPTLocked: ex.isPTLocked !== false,
      actualWeight: '',
    }));
  }
  return { v: 2, byDay: stripped };
}
