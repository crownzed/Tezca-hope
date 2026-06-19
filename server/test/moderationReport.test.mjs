import { randomUUID } from 'node:crypto';
process.env.NODE_ENV = 'test';
process.env.DATA_DIR = '/tmp/tezca-moderation-report-test';
import fs from 'node:fs';
fs.rmSync(process.env.DATA_DIR, { recursive: true, force: true });

const R = new URL('../src/', import.meta.url).pathname;
const { getDb } = await import(R + 'db/connection.js');
const svc = await import(R + 'services/communityService.js');
const repo = await import(R + 'db/repositories/communityRepository.js');
const { pushAudit, listAuditLog } = await import(R + 'db.js');

const db = getDb();
let pass = 0;
let fail = 0;
const ck = (n, c) => {
  if (c) {
    pass++;
    console.log('✓ ' + n);
  } else {
    fail++;
    console.log('✗ ' + n);
  }
};

const now = Date.now();
db.prepare(
  "INSERT INTO users(id,email,password_hash,role,name,created_at) VALUES('U1','u@x.c','h','user','Người dùng',?)",
).run(now);
db.prepare(
  "INSERT INTO users(id,email,password_hash,role,name,created_at) VALUES('AD','a@x.c','h','admin','Quản trị',?)",
).run(now);

const mk = (content) => svc.createPost({ id: randomUUID(), userId: 'U1', content, topic: 'tap-luyen' });

// Migration v27 schema
const cols = db.prepare('PRAGMA table_info(community_reports)').all();
ck('community_reports có cột source', cols.some((c) => c.name === 'source'));
ck('community_reports có cột categories', cols.some((c) => c.name === 'categories'));
ck('reporter_id nullable', cols.find((c) => c.name === 'reporter_id').notnull === 0);

// Bài sạch → không report
const clean = mk('Hôm nay tập chân rất đã, mọi người cố lên!');
ck('bài sạch tạo ok', Boolean(clean && clean.id));
ck('bài sạch -> 0 report', repo.listCommunityReports().length === 0);

// Bài flag → vẫn lưu + auto-report
const flagged = mk('mày đúng là đồ ngu');
ck('bài flag vẫn lưu', Boolean(flagged && flagged.id));
const reps = repo.listCommunityReports();
ck('flag -> 1 auto-report', reps.length === 1);
ck('source = auto', reps[0] && reps[0].source === 'auto');
ck('reporterName = Bộ lọc tự động', reps[0] && reps[0].reporterName === 'Bộ lọc tự động');
ck('có categories', reps[0] && reps[0].categories.length > 0);
ck('target = post vừa tạo', reps[0] && reps[0].targetId === flagged.id);

// Chống trùng auto-report
ck('hasPendingAutoReport theo target', repo.hasPendingAutoReport('post', flagged.id) === true);

// Bài block → ném lỗi, không lưu
let blocked = false;
try {
  mk('ai cần phim sex inbox mình');
} catch (e) {
  blocked = e.code === 'CONTENT_VIOLATION';
}
ck('bài block -> ném CONTENT_VIOLATION', blocked);

// Filter pending
ck('filter pending thấy auto-report', repo.listCommunityReports({ status: 'pending' }).length === 1);

// Audit log đọc được
pushAudit({ actorId: 'AD', role: 'admin', action: 'hide_post', customerId: flagged.id });
const audit = listAuditLog({});
ck('audit log đọc được (có entry)', audit.length >= 1);
ck('audit mới nhất trước', audit[0].action === 'hide_post');
ck('audit actorName join', audit[0].actorName === 'Quản trị');
ck('audit filter action', listAuditLog({ action: 'content_flagged' }).every((e) => e.action === 'content_flagged'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
