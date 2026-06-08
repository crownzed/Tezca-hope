import {
  countDemoCustomers,
  seedAllDemo,
  seedDemoHealthHistory30Days,
  shouldRunBulkDemoSeed,
} from './seedDemoData.js';
import { getDb } from '../db.js';

let bulkDemoSeedStarted = false;

function demoMoodRowsLast30Days() {
  const today = new Date().toISOString().slice(0, 10);
  const start = new Date(`${today}T12:00:00`);
  start.setDate(start.getDate() - 29);
  const startIso = start.toISOString().slice(0, 10);
  return getDb()
    .prepare(
      `SELECT COUNT(*) AS c FROM mood_entries m
       INNER JOIN users u ON u.id = m.user_id
       WHERE u.email LIKE 'kh-demo-%' AND m.date >= ? AND m.date <= ?`,
    )
    .get(startIso, today).c;
}

/** Gọi sau initDb() — seed 100 KH + 30 ngày BMI/mood + CG + công việc khi thiếu dữ liệu. */
export function maybeSeedDemoBulk() {
  if (!shouldRunBulkDemoSeed()) return null;

  const demoCustomers = countDemoCustomers();
  const moodRows30 = demoMoodRowsLast30Days();
  const needFullSeed = demoCustomers < 100;
  const needHealth30 = demoCustomers >= 1 && moodRows30 < demoCustomers * 25;

  if (!needFullSeed && !needHealth30) return null;
  if (bulkDemoSeedStarted) return null;

  bulkDemoSeedStarted = true;
  const started = Date.now();
  try {
    const result = needFullSeed ? seedAllDemo() : { health30d: seedDemoHealthHistory30Days() };
    console.info(
      `[tezca] demo bulk seed ok in ${Date.now() - started}ms`,
      JSON.stringify(
        needFullSeed
          ? {
              customersCreated: result.customers?.created,
              health30d: result.health30d,
              workTotal: result.expertsWork?.workData?.totalRecords,
            }
          : { health30d: result.health30d },
      ),
    );
    return result;
  } catch (err) {
    bulkDemoSeedStarted = false;
    console.error('[tezca] demo bulk seed failed', err);
    return null;
  }
}
