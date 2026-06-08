# Dạy 500+ tình huống cho Tezca AI

Hệ thống **phân loại trước** (rule, không gọi LLM để classify), rồi:
- **`instant`** — trả `reply` có sẵn (không Gemini)
- **`llm`** — gọi Gemini với `systemAddon` của tình huống

## Cấu trúc file

| File | Vai trò |
|------|---------|
| [`server/data/chat-scenarios.core.json`](../server/data/chat-scenarios.core.json) | **12 tình huống ưu tiên** (khẩn cấp, chào, ack, general…) |
| [`server/data/chat-scenario-seeds/instant-catalog.mjs`](../server/data/chat-scenario-seeds/instant-catalog.mjs) | **FAQ instant** — trả lời có sẵn, **không gọi Gemini** (nhanh) |
| [`server/data/chat-scenario-seeds/realworld-phrases.mjs`](../server/data/chat-scenario-seeds/realworld-phrases.mjs) | **Mẫu câu thực tế** (chat, không dấu, lo lắng app…) |
| [`server/data/chat-scenario-seeds/catalog.mjs`](../server/data/chat-scenario-seeds/catalog.mjs) | **Seed** sinh 500+ tình huống LLM (từ khóa, tổ hợp) |
| [`server/data/chat-scenarios.bundle.json`](../server/data/chat-scenarios.bundle.json) | **Output** sau build (runtime đọc file này) |
| [`server/data/chat-scenarios.json`](../server/data/chat-scenarios.json) | Manifest (trỏ tới bundle) |

## Quy trình (bắt buộc sau khi sửa seed)

```bash
cd server
npm run chat:scenarios:build    # sinh bundle ≥500 tình huống
npm run chat:scenarios:validate
npm run chat:scenarios:test
npm run chat:scenarios:quality   # golden set + false positive + hiệu năng
```

Restart API (`npm run dev:api`).

## Thêm tình huống

### A — Ưu tiên cao (core)

Sửa `chat-scenarios.core.json` (khẩn cấp, chào, xin chi tiết…). `weight` cao (vd: 100, 72).

### B — Hàng loạt (catalog)

Mở `catalog.mjs`:

1. **Một intent** — thêm vào mảng `SLEEP_ISSUES`, `CHRONIC`, v.v.
2. **Tổ hợp** — dùng `combine()` (bữa × mục tiêu, môn tập × trình độ…)
3. **Template LLM** — thêm key trong `LLM` rồi `scenario(..., 'ten_llm')`

Ví dụ:

```javascript
['vitamin_d', 'Thiếu vitamin D', ['vitamin d', 'nang nong', 'anh nang']],
// trong batch('sup', 55, 'nutrition', [...])
```

Chạy lại `npm run chat:scenarios:build`.

### C — Từ khóa

- Viết **không dấu**, chữ thường: `giam can`, `mat ngu`.
- `weight` cao hơn = thắng khi nhiều rule khớp.
- `none` loại trừ (vd BMI không “ăn” dinh dưỡng).

## Kiểu `match`

| `type` | Mô tả |
|--------|--------|
| `keywords` | `any` / `none` — có **index** (nhanh với 500+ rule) |
| `regex` | Pattern trên chuỗi đã bỏ dấu |
| `exact` | Cả câu (`ok`, `vang`) |
| `short` | Tin ≤ `maxChars` ký tự |
| `fallback` | Chỉ `general` |

## Hiệu năng (thuật toán)

`server/src/chatClassifier.js`:

1. **LRU cache** (2048 mục) — cùng câu hỏi → O(1)
2. **Early exit** — khẩn cấp / regex weight ≥ 100 → không quét index
3. **Inverted index theo token** — chỉ verify ứng viên có từ trùng, không quét ~1000+ keyword mỗi lần
4. **Cụm từ** — lọc theo tập từ rồi `includes` / rule đầy đủ

`planChatTurn` gọi **một lần** `resolveChatIntent` (trước đây classify 2 lần).

## API debug

```json
{
  "content": "...",
  "intent": "nut_bua_sang_giam",
  "source": "llm"
}
```

`source`: `classified` | `llm`.

## Lưu ý

- Bundle **phải được build** trước deploy (commit `chat-scenarios.bundle.json` hoặc chạy build trong CI).
- 500+ tình huống = **gợi ý phản hồi / prompt**, không thay thế khám bệnh.
- Mở rộng thêm: thêm mảng từ trong `catalog.mjs` → build lại.
