# Quy trình Git (Git Flow) – AppQLKS

| Nhánh | Mục đích | Ai được push |
|---|---|---|
| `main` | Code chạy production, gắn tag `v0.1`, `v1.0`… | **Chỉ admin (TienKoBjp)** – ruleset `protect-main` |
| `develop` | Tích hợp các feature | Chỉ qua Pull Request (1 approval) – ruleset `protect-develop` |
| `feature/*` | Mỗi chức năng một nhánh, tách từ `develop` | Thành viên |
| `release/vX.Y` | Chuẩn bị phát hành, tách từ `develop` → merge vào `main` + `develop` | Admin |
| `hotfix/*` | Sửa lỗi gấp, tách từ `main` → merge vào `main` + `develop` | Admin |

## Nhánh feature MVP
- `feature/backend-core` – API Node.js/Express, CSDL, model phòng/yêu cầu/đơn hàng
- `feature/guest-auth-room-code` – Đăng nhập bằng mã phòng động (A8K-92P)
- `feature/room-service-dining` – Gọi đồ ăn / room service
- `feature/housekeeping` – Yêu cầu dọn phòng, tiện nghi
- `feature/request-tracking` – Theo dõi trạng thái yêu cầu realtime
- `feature/staff-web-portal` – Web lễ tân, bếp, buồng phòng (nhận/claim task)
- `feature/ai-chatbot` – Chatbot hướng dẫn viên ảo + tool calling
- `feature/express-checkout` – Trả phòng nhanh

## Luồng làm việc
```bash
git checkout develop && git pull
git checkout feature/<ten-feature>
git merge develop          # cập nhật code mới nhất
# ... code & commit ...
git push origin feature/<ten-feature>
# Mở Pull Request: feature/<ten-feature> → develop
```

Commit message: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`.
