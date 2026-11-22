# AppQLKS – AppHotel

App dịch vụ phòng cho khách lưu trú (room service, dọn phòng) tích hợp chatbot AI,
dành cho khách sạn mini, homestay, khách sạn boutique.

## Cấu trúc monorepo

```
apps/
  api/         Node.js + Express – REST API, dữ liệu, chatbot tool calling   (cổng 4000)
  web-admin/   React + Vite – web cho lễ tân, bếp, buồng phòng               (cổng 5173)
  guest-app/   React PWA – app cho khách (đăng nhập bằng mã phòng)           (cổng 5174)
    android/   Project Android Studio (Capacitor) bọc chính guest-app
```

## Chạy dự án

Yêu cầu Node.js 20 trở lên.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # điền ANTHROPIC_API_KEY khi làm chatbot
npm run dev                              # chạy cả 3 app cùng lúc
```

Hoặc chạy riêng: `npm run dev:api`, `npm run dev:admin`, `npm run dev:guest`.
Hai frontend gọi `/api/...` và được Vite proxy sang `http://localhost:4000`.

## Chạy app khách trên Android (Android Studio)

App khách được đóng gói thành app Android bằng [Capacitor](https://capacitorjs.com) – vẫn là code React trong `apps/guest-app`,
project Android nằm ở `apps/guest-app/android`. Yêu cầu: Android Studio (kèm Android SDK 36), **Node.js 22 trở lên**.

1. Chạy API ở một terminal: `npm run dev:api`
2. Ở terminal khác, build giao diện và mở Android Studio:
   ```bash
   npm run android
   ```
   (= `vite build --mode android` → `cap sync android` → mở `apps/guest-app/android` trong Android Studio)
3. Trong Android Studio: đợi Gradle sync xong → chọn máy ảo (Device Manager) hoặc điện thoại → bấm **Run ▶**.
4. Đăng nhập bằng mã phòng `A8K-92P` như bản web.

**Địa chỉ API** lấy từ [apps/guest-app/.env.android](apps/guest-app/.env.android):
- Máy ảo: `http://10.0.2.2:4000` (mặc định – 10.0.2.2 là localhost của máy tính).
- Điện thoại thật: đổi thành IP máy tính cùng Wi-Fi (xem bằng `ipconfig`), ví dụ `http://192.168.1.10:4000`,
  cho phép Node.js qua Windows Firewall, rồi chạy lại `npm run android`.

Mỗi lần sửa code React, chạy lại `npm run android:build -w apps/guest-app` rồi Run lại trong Android Studio.
App đang cho phép gọi API `http://` để tiện phát triển; khi triển khai thật hãy dùng API `https://` và bỏ
`android:usesCleartextTraffic` trong `AndroidManifest.xml`.

## API hiện có

| Method | Endpoint | Trạng thái |
|---|---|---|
| GET | `/api/health` | ✅ |
| GET | `/api/rooms`, `/api/rooms/:number` | ✅ 🔒 nhân viên (mã cửa chỉ trả cho lễ tân/quản lý) |
| POST | `/api/rooms/:number/code` | ✅ 🔒 lễ tân/quản lý – đổi mã cửa, đăng xuất thiết bị khách của phòng |
| GET | `/api/menu?category=` | ✅ |
| GET | `/api/requests?department=&room=`, `/api/requests/:id` | ✅ 🔒 nhân viên |
| POST | `/api/requests/:id/claim` | ✅ 🔒 nhận việc, khoá ở server (người sau nhận 409); bếp/buồng phòng chỉ nhận việc bộ phận mình |
| POST | `/api/auth/staff` `{ login, password, department? }` | ✅ đăng nhập nhân viên → `token` (khoá 5 phút sau 5 lần sai) |
| GET / POST | `/api/auth/staff/me`, `/api/auth/staff/logout` | ✅ |
| POST | `/api/auth/guest` `{ code }` | ✅ đăng nhập bằng mã phòng → `token` (khoá 5 phút sau 5 lần sai) |
| POST | `/api/auth/guest/logout` | ✅ |
| GET | `/api/me`, `/api/me/requests`, `/api/me/folio` | ✅ cần `Authorization: Bearer <token>` |
| POST | `/api/me/requests` `{ type: "food", items: [{ menuId, qty }], note }` | ✅ đặt món (giá lấy từ thực đơn ở server) |
| POST | `/api/me/requests` `{ type: "housekeeping", service: "clean_now"|"scheduled"|null, slot, amenities, note }` | ✅ dọn phòng / hẹn giờ / xin tiện nghi (chặn đặt dọn trùng) |
| PATCH | `/api/requests/:id/status` `{ status: "completed"\|"pending"\|"cancelled", reason? }` | ✅ 🔒 hoàn thành / trả việc về hàng đợi / huỷ (lễ tân, quản lý; cần lý do) – ghi lịch sử |
| GET | `/api/requests/events` | ✅ 🔒 luồng realtime (SSE) mọi thay đổi yêu cầu cho nhân viên |
| GET | `/api/me/events` | ✅ luồng realtime (SSE) yêu cầu của phòng khách; tự đóng khi mã cửa bị đổi |
| GET / POST / DELETE | `/api/chat` | ✅ chatbot AI concierge của khách: lịch sử / gửi tin nhắn / cuộc trò chuyện mới |
| POST | `/api/chat/actions/:id/confirm`, `/dismiss` | ✅ khách xác nhận / bỏ thao tác do chatbot chuẩn bị |
| GET | `/api/hotel-info` | ✅ kiến thức khách sạn chatbot dùng (trang AI Knowledge Base) |
| GET / POST / DELETE | `/api/me/checkout` | ✅ khách xem tình trạng / xin trả phòng nhanh / huỷ yêu cầu |
| GET | `/api/checkout` | ✅ 🔒 lễ tân/quản lý – các phòng chờ duyệt trả phòng (kèm hoá đơn) |
| POST | `/api/checkout/:room/approve` | ✅ 🔒 lễ tân/quản lý – hoàn tất trả phòng: chốt hoá đơn, huỷ yêu cầu còn mở, thu hồi mã cửa, tạo việc dọn phòng |

Chạy test API: `npm test -w apps/api`.

## Chatbot AI concierge

- Dùng Claude (`claude-opus-5-5`) qua Anthropic SDK, vòng lặp tool calling nằm ở [apps/api/src/chatbot](apps/api/src/chatbot).
- Bật chatbot: tạo `apps/api/.env` từ `.env.example` và điền `ANTHROPIC_API_KEY=...` (lấy ở console.anthropic.com).
  Không có key thì app vẫn chạy, màn Concierge hiện trạng thái Offline.
- Tool: `get_hotel_info`, `get_menu`, `get_my_requests`, `get_folio` (đọc dữ liệu, chạy ngay) và `place_food_order`,
  `request_housekeeping`, `request_checkout` (chỉ chuẩn bị thao tác – khách bấm **Confirm** trên thẻ mới thực hiện).
- Kiến thức (giờ ăn sáng, dịch vụ, điểm tham quan) nằm trong [hotelInfo.js](apps/api/src/data/hotelInfo.js) – sửa cho đúng khách sạn thật.
- Gọi API Claude có tính phí theo token; prompt cố định được cache để giảm chi phí.

**Đăng nhập khách:** mã demo `A8K-92P` (phòng 305) hoặc `X7M-41Q` (phòng 204). QR trên thẻ phòng chỉ cần
mở link `http://<host>:5174/?code=A8K92P` để tự đăng nhập.

**Đăng nhập nhân viên (demo):** mật khẩu chung `shift2026` (đổi bằng biến môi trường `DEMO_STAFF_PASSWORD`).

| Mã | Tên | Bộ phận |
|---|---|---|
| `RC-01` | Maya Lin | Lễ tân |
| `KT-02` | Marco Rossi | Bếp |
| `HK-04` | Minh Anh | Buồng phòng |
| `HK-05` | Soraia Silva | Buồng phòng |
| `MG-01` | David Park | Quản lý |

Web admin: `http://localhost:5173/login` · Nhân viên trên mobile: `http://localhost:5174/staff/login`.

Các chỗ cần làm tiếp được đánh dấu `TODO(feature/...)` trong code.
Quy trình Git xem [CONTRIBUTING.md](CONTRIBUTING.md).
