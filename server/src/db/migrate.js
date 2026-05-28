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
