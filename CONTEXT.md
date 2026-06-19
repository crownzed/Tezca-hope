# Domain Context

Tài liệu mô tả **ranh giới domain** và hành vi nghiệp vụ chính — không phải danh sách API/UI đầy đủ. Các khu khác (BMI, Tezca AI, đặt lại mật khẩu, báo cáo chuyên gia…) có route và handler riêng trong codebase.

## Phân quyền hệ thống

Hệ thống bắt buộc có 3 quyền tách biệt: `admin`, `expert`, `user` (UI hiển thị là Client/Khách hàng).

- `admin`: quản lý hồ sơ chuyên gia/khách hàng, đổi quyền tài khoản, can thiệp gán chuyên gia.
- `expert`: theo dõi khách hàng đã được duyệt gán, xử lý yêu cầu tư vấn, duyệt và chỉnh kế hoạch.
- `user` (Client): nhập dữ liệu sức khỏe, chọn chuyên gia, theo dõi tiến trình tư vấn.

## Mô hình hồ sơ tách bảng

`users` chỉ giữ dữ liệu tài khoản và quyền. Hồ sơ chi tiết được tách sang:

- `customer_profiles`: thông tin hồ sơ khách hàng (họ tên, giới tính, liên hệ...).
- `expert_profiles`: thông tin hồ sơ chuyên gia (chuyên ngành, mã chứng chỉ, mô tả...).
- `customer_health_profiles`: bệnh nền, tiền sử, dị ứng, thuốc đang dùng, chống chỉ định.

## Quan hệ chuyên gia - khách hàng

Quan hệ được quản lý theo lifecycle qua `expert_customer_assignments`:

- `requested`: khách hàng gửi yêu cầu chọn chuyên gia.
- `accepted`: chuyên gia hoặc admin duyệt.
- `rejected`: chuyên gia từ chối.
- `revoked`: expert/admin ngắt gán.

Chuyên gia chỉ truy cập hồ sơ khách khi quan hệ ở trạng thái `accepted`.

## Lộ trình tập luyện

Kế hoạch tập luyện của khách hàng, gồm giáo án được AI hoặc chuyên gia đề xuất, trạng thái duyệt, danh sách bài tập, tiến độ từng ngày, và quá trình đồng bộ giữa dữ liệu local và server.

Không bao gồm food log, mood journal, BMI, hoặc nutrition target. Những khái niệm này có lifecycle riêng và chỉ nên kết nối với lộ trình tập luyện khi cần hiển thị tổng quan sức khỏe.

Khách hàng chưa đăng nhập chỉ được sinh và xem preview kế hoạch. Hệ thống không lưu bài tập của khách chưa đăng nhập vào lộ trình tập luyện.

Preview kế hoạch không tự động trở thành lộ trình tập luyện sau khi đăng nhập. Khách hàng phải bấm hành động tích hợp rõ ràng; lúc đó server mới tạo lộ trình trạng thái `pending_review`.

Tiến độ bài tập dùng optimistic local update: UI và localStorage cập nhật ngay, sync server chạy nền. Nếu sync lỗi, không rollback checkbox; UI chỉ báo lỗi đồng bộ và thử lại trong lần thao tác hoặc tải lại sau.

## Nhật ký cảm xúc

Khách hàng chọn biểu cảm từ danh sách cố định (`mood_label`, `mood_score`, `mood_emoji`, `mood_key`). `mood_score` 1–5 phục vụ biểu đồ và cảnh báo chuyên gia. Ghi chú ngắn **tùy chọn** (`free_text`, giới hạn ký tự trên UI) — không bắt buộc.

## Cộng đồng

Khu sản phẩm riêng tại `/cong-dong` (đăng nhập khách hàng qua `CustomerAppGate`). API `/api/community/*` chấp nhận role `user`, `expert`, `admin`; UI cộng đồng hiện gắn session khách hàng.

**Đường dẫn:**

| Khu | URL |
|-----|-----|
| Diễn đàn (feed kiểu Threads) | `/cong-dong/dien-dan` |
| Phòng chat chủ đề | `/cong-dong/phong-chat` |
| Thông báo read-only | `/cong-dong/thong-bao` |
| Tin nhắn riêng (DM) | `/cong-dong/tin-nhan` |

### Diễn đàn

Bảng: `community_posts` (cột `parent_post_id` cho luồng), `community_comments`, `community_post_likes`, `community_reports`, `community_user_follows`, `community_topic_follows`.

- Chủ đề bài: `general`, `nutrition`, `psychology`, `musculoskeletal`.
- **Member (`user`)** đăng nhập khách hàng được đăng bài (`POST /api/community/posts`, có `imageUrl` tùy chọn), bình luận, thích, theo dõi, phản hồi luồng. Chỉ `#thong-bao` là read-only với member.
- Feed: `GET /api/community/feed` — `for_you` | `following` | `latest`, lọc topic, phân trang `before` + `nextCursor`.
- Feed chỉ hiển thị bài gốc; phản hồi luồng: `GET /api/community/posts/:id/replies`, `POST /api/community/posts/:id/reply`.
- Theo dõi: `GET /api/community/users/following`, `POST|DELETE .../users/:userId/follow`; `GET /api/community/topics/following`, `POST|DELETE .../topics/:topic/follow`.
- Thích (`POST .../like`), báo cáo (`POST .../report`), xóa bài của mình (`DELETE .../posts/:id`).
- Realtime (WebSocket kênh `forum`, khi client bật WS): bài mới, bình luận; polling/làm mới khi không có WS.

### Phòng chat chủ đề

Bảng: `community_room_messages`. Phòng: `nutrition`, `psychology`, `musculoskeletal`.

- REST: `GET/POST /api/community/rooms/:topic/messages`.
- WebSocket kênh `room:{topic}`: tin mới, presence (trực tuyến), typing, `@mention` (highlight + autocomplete qua `GET .../mention-candidates`).
- Fallback polling ~5s khi không dùng được WebSocket.

### #thong-bao

Bảng: `community_announcement_messages`.

- Mọi member đọc; chỉ `expert` / `admin` đăng (`POST /api/community/announcements/messages`).
- WebSocket kênh `announcements`.

### DM cộng đồng

Bảng: `community_dm_threads`, `community_dm_messages` (cặp user canonical `user_a` < `user_b`).

- Không thay chat chuyên gia y tế (`/app/ho-tro/chat-chuyen-gia`, `live_messages`).
- REST: `GET /api/community/dm/threads`, `POST /api/community/dm/threads` (mở với `otherUserId`), `GET|POST .../dm/threads/:id/messages`, tìm thành viên `GET /api/community/dm/members?q=`.
- WebSocket kênh `dm:{threadId}`: tin mới, typing (khi bật WS).

### Kiểm duyệt

- Admin: `/admin/quan-ly` + `/api/admin/community/*` — ẩn bài, xử lý `community_reports`.
- Expert (API): `/api/expert/community/*` — moderation bài/bình luận (không qua UI `/cong-dong` nếu chỉ đăng nhập portal chuyên gia).

Playbook vận hành: `docs/community-operations-playbook.md`.
