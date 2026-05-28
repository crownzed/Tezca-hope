/** Giới hạn kích thước JSON lưu SQLite — tránh payload quá lớn. */
export const JSON_LIMITS = {
  exercises: 120_000,
  dailyProgress: 200_000,
  sourcePlanMd: 32_000,
  expertNote: 4_000,
};

/**
 * @template T
 * @param {string | null | undefined} raw
 * @param {T} fallback
 * @param {(v: unknown) => v is T} guard
 */
export function parseJsonColumn(raw, fallback, guard) {
  try {
    const v = JSON.parse(raw || '');
    return guard(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function parseExercisesJson(raw) {
  return parseJsonColumn(
    raw,
    [],
    (v) => Array.isArray(v),
  );
}

export function parseDailyProgressJson(raw) {
  return parseJsonColumn(
    raw,
    {},
    (v) => v !== null && typeof v === 'object' && !Array.isArray(v),
  );
}

/**
 * @param {unknown} value
 * @param {number} maxBytes
 */
export function stringifyJsonColumn(value, maxBytes) {
  const json = JSON.stringify(value ?? (Array.isArray(value) ? [] : {}));
  if (Buffer.byteLength(json, 'utf8') > maxBytes) {
    throw new Error('JSON_PAYLOAD_TOO_LARGE');
  }
  return json;
}
