/** Trích mục vận động từ Markdown kế hoạch AI → bài tập cho Chiến dịch tập luyện.
 * Hỗ trợ tách theo từng ngày (Ngày 1..7) để khớp lịch tuần.
 */

/** Nhận diện tiêu đề ngày: "#### Ngày 1", "### Ngày 2: Push", "**Ngày 3**", "Ngày 4 -" ... */
function detectDayNumber(line) {
  const m = line.match(/ng[àa]y\s*(\d{1,2})/i);
  if (!m) return null;
  const n = Number(m[1]);
  if (n >= 1 && n <= 7) return n;
  return null;
}

/** Nhận diện heading section "vận động/tập luyện" (fallback khi không có ngày). */
function isMotionHeading(trimmed) {
  if (!/^#{2,4}\s+/.test(trimmed)) return false;
  const heading = trimmed.replace(/^#{2,4}\s+/, '').toLowerCase();
  return /vận động|van dong|tập luyện|tap luyen|hoạt động thể|exercise|lịch tập|lich tap|danh sách bài/.test(
    heading,
  );
}

function cleanTitle(raw) {
  let title = raw.replace(/\*\*/g, '').trim();
  title = title.replace(/^\[[ x]\]\s*/i, '').trim();
  return title;
}

/**
 * @param {string} plan
 * @returns {Array<{id:number,title:string,sets:number,reps:string,day:number|null,isPTLocked:boolean,completed:boolean,actualWeight:string}>}
 */
export function parseExercisesFromPlanMarkdown(plan) {
  const lines = String(plan || '').split('\n');
  let currentDay = null;
  let inMotion = false;
  const collected = []; // { title, day }

  for (const line of lines) {
    const trimmed = line.trim();

    // Tiêu đề ngày (mọi cấp heading hoặc dòng in đậm)
    if (/^#{1,6}\s+/.test(trimmed) || /^\*\*.*\*\*$/.test(trimmed)) {
      const day = detectDayNumber(trimmed);
      if (day) {
        currentDay = day;
        inMotion = true;
        continue;
      }
      // heading khác: cập nhật trạng thái motion-section
      inMotion = isMotionHeading(trimmed);
      // Heading mới không phải "ngày" → rời khỏi ngày hiện tại nếu là heading cấp cao (## / ###)
      if (/^#{2,3}\s+/.test(trimmed) && !isMotionHeading(trimmed)) {
        currentDay = null;
      }
      continue;
    }

    if (!inMotion && currentDay == null) continue;

    const bullet = trimmed.match(/^[-*]\s+(.+)$/) || trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (!bullet) continue;
    const title = cleanTitle(bullet[1]);
    if (title.length < 4) continue;
    collected.push({ title: title.length > 140 ? `${title.slice(0, 137)}…` : title, day: currentDay });
  }

  // Fallback: không tìm thấy gì theo cấu trúc → quét bullet có từ khóa vận động
  if (collected.length === 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (!bullet) continue;
      const raw = bullet[1].toLowerCase();
      if (
        !/(phút|phut|buổi|buoi|đi bộ|di bo|squat|cardio|tập|tap|zone|hiit|yoga|mobility|kháng|khang|hiệp|hiep|rep|set)/.test(
          raw,
        )
      ) {
        continue;
      }
      const title = cleanTitle(bullet[1]);
      if (title.length < 4 || title.length > 140) continue;
      collected.push({ title, day: null });
    }
  }

  const baseId = Date.now();
  return collected.slice(0, 60).map((item, i) => ({
    id: baseId + i,
    title: item.title,
    sets: 1,
    reps: 'Theo kế hoạch',
    day: item.day,
    isPTLocked: true,
    completed: false,
    actualWeight: '',
  }));
}
