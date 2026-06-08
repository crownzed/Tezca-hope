# Setup Turso cho Tezca Hope (Vercel)

## Vấn đề
Vercel dùng serverless → SQLite ở `/tmp` bị xóa mỗi cold start.
→ Data mất, user phải seed lại liên tục.

## Giải pháp: Turso (hosted LibSQL)

### 1. Cài Turso CLI
```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
```

### 2. Tạo database
```bash
turso db create tezca-hope --location sgp1
turso db show tezca-hope --url
turso db tokens create tezca-hope
```

### 3. Set Vercel env vars
```bash
vercel env add TURSO_DATABASE_URL production  # paste URL từ bước 2
vercel env add TURSO_AUTH_TOKEN production    # paste token từ bước 2
```

Hoặc vào Vercel Dashboard → Settings → Environment Variables.

### 4. Redeploy
```bash
vercel --prod
```

### 5. Verify
App sẽ log: `[db] ✅ Turso connected: libsql://...`
Login với `patient@tezca.vn` / `Tezca@2025` sẽ hoạt động.

## Demo accounts (sau khi seed)
| Email | Password | Role |
|-------|----------|------|
| patient@tezca.vn | Tezca@2025 | user |
| expert@tezca.vn | Tezca@2025 | expert |
| admin@tezca.vn | Tezca@2025 | admin |
