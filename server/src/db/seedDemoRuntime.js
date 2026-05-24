import { countDemoCustomers, seedAllDemo, shouldRunBulkDemoSeed } from './seedDemoData.js';

let bulkDemoSeedStarted = false;

/** Gọi sau initDb() — seed 100 KH + CG + công việc trên Vercel/local khi chưa đủ dữ liệu. */
export function maybeSeedDemoBulk() {
  if (bulkDemoSeedStarted || !shouldRunBulkDemoSeed()) return null;
  if (countDemoCustomers() >= 100) return null;

  bulkDemoSeedStarted = true;
  const started = Date.now();
  try {
    const result = seedAllDemo();
    console.info(
      `[tezca] demo bulk seed ok in ${Date.now() - started}ms`,
      JSON.stringify({
        customersCreated: result.customers.created,
        workTotal: result.expertsWork.workData?.totalRecords,
      }),
    );
    return result;
  } catch (err) {
    bulkDemoSeedStarted = false;
    console.error('[tezca] demo bulk seed failed', err);
    throw err;
  }
}
