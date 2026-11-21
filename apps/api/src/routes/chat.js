import { Router } from 'express';
import { notImplemented } from '../middleware/errors.js';

const router = Router();
// TODO(feature/ai-chatbot): chatbot hướng dẫn viên ảo (giờ ăn sáng, dịch vụ, điểm tham quan)
// + tool calling: tạo đơn đồ ăn, yêu cầu dọn phòng, xem trạng thái, trả phòng nhanh.
router.post('/', notImplemented('feature/ai-chatbot'));
export default router;
