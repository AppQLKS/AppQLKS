# AppQLKS – AppHotel

App dịch vụ phòng cho khách lưu trú (room service, dọn phòng) tích hợp chatbot AI,
dành cho khách sạn mini, homestay, khách sạn boutique.

## Cấu trúc monorepo

```
apps/
  api/         Node.js + Express – REST API, dữ liệu, chatbot tool calling   (cổng 4000)
  web-admin/   React + Vite – web cho lễ tân, bếp, buồng phòng               (cổng 5173)
  guest-app/   React PWA – app cho khách (đăng nhập bằng mã phòng)           (cổng 5174)
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
| POST | `/api/chat` | 🚧 501 – `feature/ai-chatbot` |
| GET / POST / DELETE | `/api/me/checkout` | ✅ khách xem tình trạng / xin trả phòng nhanh / huỷ yêu cầu |
| GET | `/api/checkout` | ✅ 🔒 lễ tân/quản lý – các phòng chờ duyệt trả phòng (kèm hoá đơn) |
| POST | `/api/checkout/:room/approve` | ✅ 🔒 lễ tân/quản lý – hoàn tất trả phòng: chốt hoá đơn, huỷ yêu cầu còn mở, thu hồi mã cửa, tạo việc dọn phòng |

Chạy test API: `npm test -w apps/api`.

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
