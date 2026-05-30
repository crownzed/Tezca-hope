function tableHasColumn(db, table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some((c) => c.name === column);
}

function migrateV1Schema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'expert')),
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT 0
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
      sender_role TEXT NOT NULL CHECK (sender_role IN ('expert', 'patient')),
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
  `);
}

/**
 * @param {import('better-sqlite3').Database} db
 */
export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version),
  );

  const migrations = [
    { version: 1, name: 'initial_schema', up: () => migrateV1Schema(db) },
    {
      version: 2,
      name: 'users_created_at',
      up: () => {
        if (!tableHasColumn(db, 'users', 'created_at')) {
          db.exec(`ALTER TABLE users ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0`);
          db.prepare(`UPDATE users SET created_at = ? WHERE created_at = 0`).run(Date.now());
        }
      },
    },
    {
      version: 3,
      name: 'patient_training_plans',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS patient_training_plans (
            patient_id TEXT PRIMARY KEY,
            source_plan_md TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL CHECK (status IN ('pending_review', 'approved')) DEFAULT 'pending_review',
            exercises_json TEXT NOT NULL DEFAULT '[]',
            expert_note TEXT NOT NULL DEFAULT '',
            integrated_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            updated_by TEXT,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
          );
        `);
      },
    },
    {
      version: 4,
      name: 'training_daily_progress',
      up: () => {
        if (!tableHasColumn(db, 'patient_training_plans', 'daily_progress_json')) {
          db.exec(
            `ALTER TABLE patient_training_plans ADD COLUMN daily_progress_json TEXT NOT NULL DEFAULT '{}'`,
          );
        }
      },
    },
    {
      version: 5,
      name: 'training_plan_indexes_and_progress_ts',
      up: () => {
        if (!tableHasColumn(db, 'patient_training_plans', 'progress_updated_at')) {
          db.exec(
            `ALTER TABLE patient_training_plans ADD COLUMN progress_updated_at INTEGER NOT NULL DEFAULT 0`,
          );
          db.prepare(
            `UPDATE patient_training_plans SET progress_updated_at = updated_at WHERE progress_updated_at = 0`,
          ).run();
        }
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_training_plans_updated ON patient_training_plans(updated_at);
          CREATE INDEX IF NOT EXISTS idx_training_plans_progress ON patient_training_plans(progress_updated_at);
          CREATE INDEX IF NOT EXISTS idx_assignments_patient ON assignments(patient_id);
        `);
      },
    },
    {
      version: 6,
      name: 'password_reset_tokens',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            token_hash TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_reset_tokens_user ON password_reset_tokens(user_id);
          CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires ON password_reset_tokens(expires_at);
        `);
      },
    },
    {
      version: 7,
      name: 'live_messages_customer_sender_role',
      up: () => {
        const cols = db.prepare(`PRAGMA table_info(live_messages)`).all();
        if (cols.length === 0) return;
        db.exec(`
          CREATE TABLE live_messages_new (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            sender_user_id TEXT NOT NULL,
            sender_role TEXT NOT NULL CHECK (sender_role IN ('expert', 'customer')),
            content TEXT NOT NULL,
            ts INTEGER NOT NULL,
            FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE
          );
          INSERT INTO live_messages_new (id, patient_id, sender_user_id, sender_role, content, ts)
          SELECT id, patient_id, sender_user_id,
            CASE WHEN sender_role IN ('patient', 'user') THEN 'customer' ELSE sender_role END,
            content, ts
          FROM live_messages;
          DROP TABLE live_messages;
          ALTER TABLE live_messages_new RENAME TO live_messages;
          CREATE INDEX IF NOT EXISTS idx_live_patient ON live_messages(patient_id);
        `);
      },
    },
    {
      version: 8,
      name: 'newsletter_subscribers',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            email TEXT PRIMARY KEY COLLATE NOCASE,
            source TEXT NOT NULL DEFAULT 'landing',
            created_at INTEGER NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_newsletter_created ON newsletter_subscribers(created_at);
        `);
      },
    },
    {
      version: 9,
      name: 'users_google_id',
      up: () => {
        if (!tableHasColumn(db, 'users', 'google_id')) {
          db.exec(`ALTER TABLE users ADD COLUMN google_id TEXT`);
        }
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL`);
      },
    },
    {
      version: 10,
      name: 'users_admin_role',
      up: () => {
        db.exec(`
          CREATE TABLE users_new (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'expert', 'admin')),
            name TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT 0,
            google_id TEXT
          );
          INSERT INTO users_new (id, email, password_hash, role, name, created_at, google_id)
          SELECT id, email, password_hash, role, name, created_at, google_id
          FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
        `);
      },
    },
    {
      version: 11,
      name: 'user_profiles_split',
      up: () => {
        db.exec(`
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
        `);
        const now = Date.now();
        db.prepare(
          `INSERT OR IGNORE INTO customer_profiles (user_id, full_name, created_at, updated_at)
           SELECT id, name, ?, ? FROM users WHERE role = 'user'`,
        ).run(now, now);
        db.prepare(
          `INSERT OR IGNORE INTO expert_profiles (user_id, full_name, specialty, created_at, updated_at)
           SELECT id, name, 'General', ?, ? FROM users WHERE role = 'expert'`,
        ).run(now, now);
      },
    },
    {
      version: 12,
      name: 'customer_health_profiles',
      up: () => {
        db.exec(`
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
        `);
      },
    },
    {
      version: 13,
      name: 'expert_customer_assignments_v2',
      up: () => {
        db.exec(`
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
        `);
      },
    },
    {
      version: 14,
      name: 'backfill_assignments_v2_and_mood_text',
      up: () => {
        if (!tableHasColumn(db, 'mood_entries', 'free_text')) {
          db.exec(`ALTER TABLE mood_entries ADD COLUMN free_text TEXT NOT NULL DEFAULT ''`);
        }
        db.prepare(`UPDATE mood_entries SET free_text = note WHERE free_text = '' AND note <> ''`).run();
        const now = Date.now();
        db.prepare(
          `INSERT OR IGNORE INTO expert_customer_assignments
            (id, expert_id, customer_id, status, requested_by, created_at, updated_at)
           SELECT lower(hex(randomblob(16))), expert_id, patient_id, 'accepted', 'expert', ?, ?
           FROM assignments`,
        ).run(now, now);
      },
    },
    {
      version: 15,
      name: 'community_forum_and_rooms',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS community_posts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            topic TEXT NOT NULL CHECK (topic IN ('general', 'nutrition', 'psychology', 'musculoskeletal')),
            content TEXT NOT NULL,
            image_url TEXT NOT NULL DEFAULT '',
            likes_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'hidden')),
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
          CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id, created_at);
          CREATE INDEX IF NOT EXISTS idx_community_room_topic ON community_room_messages(topic, created_at);
          CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(status, created_at DESC);
        `);
      },
    },
    {
      version: 16,
      name: 'mood_emoji_column',
      up: () => {
        if (!tableHasColumn(db, 'mood_entries', 'mood_emoji')) {
          db.exec(`ALTER TABLE mood_entries ADD COLUMN mood_emoji TEXT NOT NULL DEFAULT ''`);
        }
      },
    },
    {
      version: 17,
      name: 'user_role_grants',
      up: () => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS user_role_grants (
            user_id TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('user', 'expert', 'admin')),
            created_at INTEGER NOT NULL,
            PRIMARY KEY (user_id, role),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
          CREATE INDEX IF NOT EXISTS idx_user_role_grants_role ON user_role_grants(role, created_at DESC);
        `);
      },
    },
    {
      version: 18,
      name: 'community_threads_feed_follows',
      up: () => {
        db.exec(`
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
          CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
        `);
      },
    },
    {
      version: 19,
      name: 'community_thread_replies',
      up: () => {
        if (!tableHasColumn(db, 'community_posts', 'parent_post_id')) {
          db.exec(`ALTER TABLE community_posts ADD COLUMN parent_post_id TEXT`);
          db.exec(`
            CREATE INDEX IF NOT EXISTS idx_community_posts_parent ON community_posts(parent_post_id, created_at ASC);
          `);
        }
      },
    },
    {
      version: 20,
      name: 'community_announcements_and_dm',
      up: () => {
        db.exec(`
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
        `);
      },
    },
  ];

  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    db.transaction(() => {
      m.up();
      db.prepare(
        `INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)`,
      ).run(m.version, m.name, Date.now());
    })();
  }
}
