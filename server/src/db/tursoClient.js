/**
 * Turso/LibSQL client wrapper — tương thích API better-sqlite3.
 *
 * better-sqlite3 API (synchronous):
 *   db.prepare(sql).all(...params)
 *   db.prepare(sql).get(...params)
 *   db.prepare(sql).run(...params) → { changes, lastInsertRowid }
 *   db.exec(sql)
 *   db.pragma(str)
 *   db.transaction(fn)() 
 *   db.close()
 *
 * @libsql/client (async) → wrapper này convert thành sync-like bằng cách
 * dùng synchronous mode của @libsql/client (local file hoặc remote).
 *
 * Env:
 *   TURSO_DATABASE_URL — VD: libsql://xxx.turso.io
 *   TURSO_AUTH_TOKEN — auth token từ Turso dashboard
 */

let createClientFn = null;

async function loadLibsql() {
  if (createClientFn) return createClientFn;
  try {
    const mod = await import('@libsql/client');
    createClientFn = mod.createClient;
    return createClientFn;
  } catch {
    throw new Error(
      '[db] @libsql/client chưa được cài. Chạy: cd server && npm i @libsql/client'
    );
  }
}

/**
 * Tạo Turso DB instance với API giống better-sqlite3 (sync-compatible).
 * @param {string} url — Turso database URL
 * @param {string} authToken — Turso auth token
 */
export function createTursoDb(url, authToken) {
  let client = null;

  function getClient() {
    if (client) return client;
    // createClient là sync, nhưng cần dynamic import trước
    if (!createClientFn) {
      throw new Error('[db] Turso client chưa được khởi tạo. Gọi initTursoClient() trước.');
    }
    client = createClientFn({ url, authToken });
    return client;
  }

  /**
   * Wrapper cho prepared statement.
   * Turso client dùng async, nhưng ta wrap thành object có .all(), .get(), .run()
   * trả về Promise — caller cần await.
   *
   * Vì better-sqlite3 là sync mà Turso là async, ta dùng pattern:
   * Mọi method trả về Promise, và db.transaction wrap trong async.
   */
  function prepare(sql) {
    return {
      all(...params) {
        const args = flattenParams(params);
        return getClient().execute({ sql, args }).then((r) => r.rows);
      },
      get(...params) {
        const args = flattenParams(params);
        return getClient().execute({ sql, args }).then((r) => r.rows[0] || null);
      },
      run(...params) {
        const args = flattenParams(params);
        return getClient().execute({ sql, args }).then((r) => ({
          changes: r.rowsAffected,
          lastInsertRowid: r.lastInsertRowid,
        }));
      },
    };
  }

  function exec(sql) {
    return getClient().executeMultiple(sql);
  }

  function pragma(str) {
    const sql = `PRAGMA ${str}`;
    return getClient().execute(sql).then((r) => r.rows[0] || null);
  }

  function transaction(fn) {
    return async function (...args) {
      const tx = await getClient().transaction('write');
      try {
        const txDb = createTxWrapper(tx);
        const result = await fn.call(null, ...args, txDb);
        await tx.commit();
        return result;
      } catch (err) {
        await tx.rollback();
        throw err;
      }
    };
  }

  function close() {
    if (client) {
      client.close();
      client = null;
    }
  }

  return { prepare, exec, pragma, transaction, close, getClient };
}

/** Transaction wrapper — cùng API prepare nhưng dùng tx object */
function createTxWrapper(tx) {
  return {
    prepare(sql) {
      return {
        all(...params) {
          const args = flattenParams(params);
          return tx.execute({ sql, args }).then((r) => r.rows);
        },
        get(...params) {
          const args = flattenParams(params);
          return tx.execute({ sql, args }).then((r) => r.rows[0] || null);
        },
        run(...params) {
          const args = flattenParams(params);
          return tx.execute({ sql, args }).then((r) => ({
            changes: r.rowsAffected,
            lastInsertRowid: r.lastInsertRowid,
          }));
        },
      };
    },
    exec(sql) {
      return tx.execute(sql);
    },
  };
}

/** Flatten params: better-sqlite3 nhận positional args, Turso nhận array */
function flattenParams(params) {
  if (params.length === 0) return [];
  if (params.length === 1 && Array.isArray(params[0])) return params[0];
  return params;
}

/** Khởi tạo — gọi 1 lần khi start */
export async function initTursoClient() {
  await loadLibsql();
}
