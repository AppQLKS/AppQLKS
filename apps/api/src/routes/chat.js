import { Router } from 'express';
import { requireGuest } from '../middleware/requireGuest.js';
import { MODEL, chatHistory, confirmAction, defaultClient, dismissAction, resetConversation, sendMessage } from '../chatbot/concierge.js';

/**
 * Chatbot AI concierge cho khách (cần phiên khách).
 * @param {{ anthropic?: object | null }} options  test truyền client giả vào đây
 */
export function chatRouter({ anthropic } = {}) {
  const router = Router();
  router.use(requireGuest);

  // Tạo client khi cần, để .env được đọc trước
  let client = anthropic;
  const getClient = () => (client === undefined ? (client = defaultClient()) : client);

  // GET /api/chat -> lịch sử hiển thị + trạng thái cấu hình
  router.get('/', (req, res) => res.json({ enabled: !!getClient(), model: MODEL, messages: chatHistory(req.stay) }));

  // POST /api/chat { message } -> { reply, actions[] }
  router.post('/', async (req, res, next) => {
    try {
      res.json(await sendMessage(getClient(), req.stay, req.body?.message));
    } catch (err) {
      next(err);
    }
  });

  // Khách bấm Confirm / Edit trên thẻ thao tác do chatbot chuẩn bị
  router.post('/actions/:id/confirm', (req, res) => res.json(confirmAction(req.stay, req.params.id)));
  router.post('/actions/:id/dismiss', (req, res) => res.json(dismissAction(req.stay, req.params.id)));

  // Bắt đầu cuộc trò chuyện mới
  router.delete('/', (req, res) => {
    resetConversation(req.stay);
    res.status(204).end();
  });

  return router;
}
