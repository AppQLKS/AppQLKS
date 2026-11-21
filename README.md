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
| GET | `/api/menu?category=` | ✅ |
| GET | `/api/requests` | ✅ |
| POST | `/api/auth/guest`, `/api/auth/staff` | 🚧 501 – `feature/guest-auth-room-code`, `feature/staff-web-portal` |
| POST | `/api/requests`, `/:id/claim`, PATCH `/:id/status` | 🚧 501 – các nhánh dịch vụ |
| POST | `/api/chat` | 🚧 501 – `feature/ai-chatbot` |
| * | `/api/checkout/:room/...` | 🚧 501 – `feature/express-checkout` |

Các chỗ cần làm tiếp được đánh dấu `TODO(feature/...)` trong code.
Quy trình Git xem [CONTRIBUTING.md](CONTRIBUTING.md).
