/**
 * Script chạy migrations + seed vào Turso.
 * Chạy: node scripts/turso-init.mjs
 */
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';

const TURSO_URL = 'libsql://tezca-hope-crownzed.aws-ap-northeast-1.turso.io';
import { readFileSync } from 'fs';

function getToken() {
  if (process.env.TURSO_AUTH_TOKEN) return process.env.TURSO_AUTH_TOKEN;
  try {
    const env = readFileSync(new URL('../../.env', import.meta.url), 'utf8');
    const m = env.match(/TURSO_AUTH_TOKEN=(.+)/);
    return m?.[1]?.trim();
  } catch { return ''; }
}
const TURSO_TOKEN = getToken();

const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function run() {
  console.log('🔗 Connecting to Turso...');
  await client.execute('SELECT 1');
  console.log('✅ Connected!');

  // Schema migrations tracking
  await client.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    )
  `);

  const applied = new Set(
    (await client.execute('SELECT version FROM schema_migrations')).rows.map(r => r.version)
  );

  const migrations = [
    { version: 1, name: 'initial_schema', sql: `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'expert', 'admin')),
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT 0,
        google_id TEXT
      );
      CREATE TABLE IF NOT EXISTS assignments (
        expert_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        PRIMARY KEY (expert_id, patient_id),
        FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS bmi_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        height_cm REAL NOT NULL,
        weight_kg REAL NOT NULL,
        bmi REAL NOT NULL,
        UNIQUE (user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS mood_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        mood_label TEXT NOT NULL,
        mood_score INTEGER NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        free_text TEXT NOT NULL DEFAULT '',
        mood_emoji TEXT NOT NULL DEFAULT '',
        UNIQUE (user_id, date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS bot_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        ts INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS live_messages (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        sender_user_id TEXT NOT NULL,
        sender_role TEXT NOT NULL CHECK (sender_role IN ('expert', 'customer')),
        content TEXT NOT NULL,
        ts INTEGER NOT NULL,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        ts INTEGER NOT NULL,
        actor_id TEXT NOT NULL,
        role TEXT NOT NULL,
        action TEXT NOT NULL,
        patient_id TEXT,
        meta TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_bmi_user ON bmi_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_mood_user ON mood_entries(user_id);
      CREATE INDEX IF NOT EXISTS idx_bot_user ON bot_messages(user_id);
      CREATE INDEX IF NOT EXISTS idx_live_patient ON live_messages(patient_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_log(ts);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
    `},
    { version: 3, name: 'patient_training_plans', sql: `
      CREATE TABLE IF NOT EXISTS patient_training_plans (
        patient_id TEXT PRIMARY KEY,
        source_plan_md TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved')) DEFAULT 'pending_review',
        exercises_json TEXT NOT NULL DEFAULT '[]',
        expert_note TEXT NOT NULL DEFAULT '',
        integrated_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        updated_by TEXT,
        daily_progress_json TEXT NOT NULL DEFAULT '{}',
        progress_updated_at INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_training_plans_updated ON patient_training_plans(updated_at);
      CREATE INDEX IF NOT EXISTS idx_training_plans_progress ON patient_training_plans(progress_updated_at);
      CREATE INDEX IF NOT EXISTS idx_assignments_patient ON assignments(patient_id);
    `},
    { version: 6, name: 'password_reset_tokens', sql: `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);
    `},
    { version: 8, name: 'newsletter_subscribers', sql: `
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        email TEXT PRIMARY KEY COLLATE NOCASE,
        source TEXT NOT NULL DEFAULT 'landing',
        created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_newsletter_created ON newsletter_subscribers(created_at);
    `},
    { version: 11, name: 'user_profiles_split', sql: `
      CREATE TABLE IF NOT EXISTS customer_profiles (
        user_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL DEFAULT '',
        gender TEXT NOT NULL DEFAULT '',
        dob TEXT NOT NULL DEFAULT '',
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_customer_profiles_updated ON customer_profiles(updated_at);
      CREATE TABLE IF NOT EXISTS expert_profiles (
        user_id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL DEFAULT '',
        gender TEXT NOT NULL DEFAULT '',
        specialty TEXT NOT NULL DEFAULT '',
        license_no TEXT NOT NULL DEFAULT '',
        bio TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_expert_profiles_active ON expert_profiles(is_active);
    `},
    { version: 12, name: 'customer_health_profiles', sql: `
      CREATE TABLE IF NOT EXISTS customer_health_profiles (
        user_id TEXT PRIMARY KEY,
        current_conditions TEXT NOT NULL DEFAULT '',
        medical_history TEXT NOT NULL DEFAULT '',
        allergies TEXT NOT NULL DEFAULT '',
        medications TEXT NOT NULL DEFAULT '',
        contraindications TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_health_profiles_updated ON customer_health_profiles(updated_at);
    `},
    { version: 13, name: 'expert_customer_assignments_v2', sql: `
      CREATE TABLE IF NOT EXISTS expert_customer_assignments (
        id TEXT PRIMARY KEY,
        expert_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'rejected', 'revoked')),
        requested_by TEXT NOT NULL CHECK (requested_by IN ('customer', 'expert', 'admin')),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE (expert_id, customer_id),
        FOREIGN KEY (expert_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_assignments_v2_expert ON expert_customer_assignments(expert_id, status);
      CREATE INDEX IF NOT EXISTS idx_assignments_v2_customer ON expert_customer_assignments(customer_id, status);
    `},
    { version: 15, name: 'community_forum_and_rooms', sql: `
      CREATE TABLE IF NOT EXISTS community_posts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL CHECK (topic IN ('general', 'nutrition', 'psychology', 'musculoskeletal')),
        content TEXT NOT NULL,
        image_url TEXT NOT NULL DEFAULT '',
        likes_count INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
        parent_post_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS community_comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
        created_at INTEGER NOT NULL,
        FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS community_post_likes (
        post_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (post_id, user_id),
        FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS community_reports (
        id TEXT PRIMARY KEY,
        target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
        target_id TEXT NOT NULL,
        reporter_id TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
        created_at INTEGER NOT NULL,
        FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS community_room_messages (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL CHECK (topic IN ('nutrition', 'psychology', 'musculoskeletal')),
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_community_posts_topic ON community_posts(topic, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_community_posts_parent ON community_posts(parent_post_id, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_community_room_topic ON community_room_messages(topic, created_at);
      CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status, created_at DESC);
    `},
    { version: 17, name: 'user_role_grants', sql: `
      CREATE TABLE IF NOT EXISTS user_role_grants (
        user_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'expert', 'admin')),
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, role),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_role_grants_role ON user_role_grants(role, created_at DESC);
    `},
    { version: 18, name: 'community_threads_feed_follows', sql: `
      CREATE TABLE IF NOT EXISTS community_user_follows (
        follower_id TEXT NOT NULL,
        following_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (follower_id, following_id),
        FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE TABLE IF NOT EXISTS community_topic_follows (
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL CHECK (topic IN ('general', 'nutrition', 'psychology', 'musculoskeletal')),
        created_at INTEGER NOT NULL,
        PRIMARY KEY (user_id, topic),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `},
    { version: 20, name: 'community_announcements_and_dm', sql: `
      CREATE TABLE IF NOT EXISTS community_announcement_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_community_announcements_created
        ON community_announcement_messages(created_at ASC);
      CREATE TABLE IF NOT EXISTS community_dm_threads (
        id TEXT PRIMARY KEY,
        user_a TEXT NOT NULL,
        user_b TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        UNIQUE(user_a, user_b),
        FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_community_dm_threads_updated
        ON community_dm_threads(updated_at DESC);
      CREATE TABLE IF NOT EXISTS community_dm_messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT NOT NULL,
        sender_id TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
        created_at INTEGER NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES community_dm_threads(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_community_dm_messages_thread
        ON community_dm_messages(thread_id, created_at ASC);
    `},
  ];

  for (const m of migrations) {
    if (applied.has(m.version)) {
      console.log(`⏭️  Skip: v${m.version} ${m.name}`);
      continue;
    }
    try {
      await client.executeMultiple(m.sql);
      await client.execute({
        sql: 'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        args: [m.version, m.name, Date.now()],
      });
      console.log(`✅ Applied: v${m.version} ${m.name}`);
    } catch (e) {
      console.error(`❌ Failed: v${m.version} ${m.name}:`, e.message);
      break;
    }
  }

  // Seed demo users
  console.log('\n📦 Seeding demo users...');
  const DEMO_PASSWORD = 'Tezca@2025';
  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const now = Date.now();

  const existingUsers = await client.execute('SELECT COUNT(*) AS c FROM users');
  if (existingUsers.rows[0].c === 0) {
    const demoUsers = [
      ['tezca-demo-expert-0001', 'expert@tezca.vn', 'expert', 'BS. Minh Anh'],
      ['tezca-demo-patient-0001', 'patient@tezca.vn', 'user', 'Nguyễn Minh Khang'],
      ['tezca-demo-admin-0001', 'admin@tezca.vn', 'admin', 'Quản trị Tezca'],
    ];

    for (const [id, email, role, name] of demoUsers) {
      await client.execute({
        sql: 'INSERT OR IGNORE INTO users (id, email, password_hash, role, name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        args: [id, email, hash, role, name, now],
      });
      console.log(`  ✅ ${email} (${role})`);
    }

    // Assignment
    await client.execute({
      sql: 'INSERT OR IGNORE INTO assignments (expert_id, patient_id) VALUES (?, ?)',
      args: ['tezca-demo-expert-0001', 'tezca-demo-patient-0001'],
    });
    console.log('  ✅ Assignment expert → patient');

    // Profiles
    await client.execute({
      sql: 'INSERT OR IGNORE INTO customer_profiles (user_id, full_name, created_at, updated_at) VALUES (?, ?, ?, ?)',
      args: ['tezca-demo-patient-0001', 'Nguyễn Minh Khang', now, now],
    });
    await client.execute({
      sql: 'INSERT OR IGNORE INTO expert_profiles (user_id, full_name, specialty, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)',
      args: ['tezca-demo-expert-0001', 'BS. Minh Anh', 'General', now, now],
    });
    console.log('  ✅ Profiles created');

    // Role grants
    await client.execute({
      sql: 'INSERT OR IGNORE INTO user_role_grants (user_id, role, created_at) VALUES (?, ?, ?)',
      args: ['tezca-demo-admin-0001', 'admin', now],
    });
    console.log('  ✅ Admin role grant');
  } else {
    console.log(`  ⏭️  Users already exist (${existingUsers.rows[0].c} rows)`);
  }

  // Verify
  console.log('\n🔍 Verifying...');
  const users = await client.execute('SELECT id, email, role, name FROM users');
  for (const u of users.rows) {
    console.log(`  👤 ${u.email} | role=${u.role} | name=${u.name}`);
  }

  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log(`\n📊 Tables: ${tables.rows.map(r => r.name).join(', ')}`);

  client.close();
  console.log('\n🎉 Done!');
}

run().catch(e => { console.error(e); process.exit(1); });
