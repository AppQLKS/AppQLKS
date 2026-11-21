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
| GET | `/api/rooms`, `/api/rooms/:number` | ✅ (dữ liệu mẫu in-memory) |
| POST | `/api/rooms/:number/code` | ✅ đổi mã cửa, đăng xuất thiết bị khách của phòng |
| GET | `/api/menu?category=` | ✅ |
| GET | `/api/requests?department=&room=`, `/api/requests/:id` | ✅ |
| POST | `/api/auth/guest` `{ code }` | ✅ đăng nhập bằng mã phòng → `token` (khoá 5 phút sau 5 lần sai) |
| POST | `/api/auth/guest/logout` | ✅ |
| GET | `/api/me`, `/api/me/requests`, `/api/me/folio` | ✅ cần `Authorization: Bearer <token>` |
| POST | `/api/me/requests` `{ type: "food", items: [{ menuId, qty }], note }` | ✅ đặt món (giá lấy từ thực đơn ở server) |
| POST | `/api/me/requests` `{ type: "housekeeping", service: "clean_now"|"scheduled"|null, slot, amenities, note }` | ✅ dọn phòng / hẹn giờ / xin tiện nghi (chặn đặt dọn trùng) |
| POST | `/api/auth/staff` | 🚧 501 – `feature/staff-web-portal` |
| POST | `/api/requests/:id/claim`, PATCH `/:id/status` | 🚧 501 – `feature/staff-web-portal`, `feature/request-tracking` |
| POST | `/api/chat` | 🚧 501 – `feature/ai-chatbot` |
| * | `/api/checkout/:room/...` | 🚧 501 – `feature/express-checkout` |

Chạy test API: `npm test -w apps/api`.

**Đăng nhập khách:** mã demo `A8K-92P` (phòng 305) hoặc `X7M-41Q` (phòng 204). QR trên thẻ phòng chỉ cần
mở link `http://<host>:5174/?code=A8K92P` để tự đăng nhập.

Các chỗ cần làm tiếp được đánh dấu `TODO(feature/...)` trong code.
Quy trình Git xem [CONTRIBUTING.md](CONTRIBUTING.md).
