#!/usr/bin/env node
/**
 * cleanupAllData.js
 * Xoá TOÀN BỘ data trong DB production (giữ lại schema)
 * ⚠️ KHÔNG THỂ ROLLBACK - chỉ chạy khi đã backup!
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Database from 'better-sqlite3';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Turso libSQL connection string từ env
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error('❌ Thiếu TURSO_DATABASE_URL hoặc TURSO_AUTH_TOKEN');
  process.exit(1);
}

console.log('🔗 Kết nối tới Turso DB...');
console.log(`   URL: ${TURSO_URL}`);

// Turso libSQL client (qua better-sqlite3-compatible wrapper)
const { createClient } = await import('@libsql/client');
const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

/**
 * Thứ tự xoá (từ child → parent để tránh foreign key constraint)
 * Dựa trên migrate.js version 1-27
 */
const TABLES_TO_CLEAN = [
  // Child tables (có FK tới parent)
  'password_reset_tokens',
  'newsletter_subscribers',
  'user_role_grants',
  
  // Community (child tables trước)
  'community_notifications',
  'community_dm_messages',
  'community_dm_threads',
  'community_announcement_messages',
  'community_post_bookmarks',
  'community_post_likes',
  'community_comments',
  'community_reports',
  'community_posts', // parent_post_id tự tham chiếu
  'community_room_messages',
  'community_user_follows',
  'community_topic_follows',
  'community_user_settings',
  
  // Training & health
  'patient_training_plans',
  'customer_health_profiles',
  
  // Profiles
  'customer_profiles',
  'expert_profiles',
  
  // BMI/mood/messages
  'bmi_entries',
  'mood_entries',
  'bot_messages',
  'live_messages',
  
  // Assignments
  'expert_customer_assignments',
  'assignments',
  
  // Audit log (không FK → có thể xoá bất cứ lúc)
  'audit_log',
  
  // Parent table cuối cùng
  'users',
];

async function cleanupAll() {
  console.log('\n🗑️  Bắt đầu xoá toàn bộ data...\n');
  
  let totalDeleted = 0;
  
  for (const table of TABLES_TO_CLEAN) {
    try {
      // Count trước khi xoá
      const countResult = await client.execute(`SELECT COUNT(*) as cnt FROM ${table}`);
      const count = countResult.rows[0]?.cnt || 0;
      
      if (count === 0) {
        console.log(`   ${table}: (trống)`);
        continue;
      }
      
      // Xoá
      await client.execute(`DELETE FROM ${table}`);
      totalDeleted += Number(count);
      
      console.log(`✅ ${table}: xoá ${count} rows`);
    } catch (err) {
      // Bảng không tồn tại (OK) hoặc lỗi khác
      if (err.message?.includes('no such table')) {
        console.log(`   ${table}: (không tồn tại)`);
      } else {
        console.error(`❌ ${table}: lỗi - ${err.message}`);
        throw err;
      }
    }
  }
  
  console.log(`\n✅ Xoá xong ${totalDeleted} rows tổng cộng`);
}

async function verify() {
  console.log('\n🔍 Verify lại DB...\n');
  
  const checks = [
    'users',
    'experts',
    'customer_profiles',
    'patient_training_plans',
    'community_posts',
  ];
  
  for (const table of checks) {
    try {
      const result = await client.execute(`SELECT COUNT(*) as cnt FROM ${table}`);
      const count = result.rows[0]?.cnt || 0;
      console.log(`   ${table}: ${count} rows`);
      
      if (count > 0) {
        console.warn(`⚠️  ${table} vẫn còn ${count} rows!`);
      }
    } catch (err) {
      if (!err.message?.includes('no such table')) {
        console.error(`❌ ${table}: ${err.message}`);
      }
    }
  }
}

// Main
(async () => {
  try {
    // Xác nhận cuối (nếu chạy interactive)
    if (process.stdin.isTTY) {
      console.log('⚠️  CẢNH BÁO: Script này sẽ xoá TOÀN BỘ data trong DB production!');
      console.log('   Không thể rollback. Chỉ tiếp tục nếu đã backup.');
      console.log('');
      console.log('   Nhấn Ctrl+C để huỷ, hoặc chạy với flag --confirm để tiếp tục.');
      
      if (!process.argv.includes('--confirm')) {
        process.exit(0);
      }
    }
    
    await cleanupAll();
    await verify();
    
    console.log('\n✅ Hoàn tất! DB đã sạch, sẵn sàng input data thật.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Lỗi:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
