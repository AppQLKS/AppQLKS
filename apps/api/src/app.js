import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import roomsRouter from './routes/rooms.js';
import menuRouter from './routes/menu.js';
import authRouter from './routes/auth.js';
import requestsRouter from './routes/requests.js';
import { chatRouter } from './routes/chat.js';
import { hotelInfo } from './data/hotelInfo.js';
import checkoutRouter from './routes/checkout.js';
import meRouter from './routes/me.js';
import { notFound, errorHandler } from './middleware/errors.js';

/**
 * @param {{ anthropic?: object | null }} [options] test truyền client Anthropic giả vào đây
 */
export function createApp(options = {}) {
  const app = express();
  const origins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    // App Android (Capacitor) chạy giao diện từ origin http://localhost (không có cổng)
    .concat(['http://localhost', 'capacitor://localhost']);

  app.use(cors({ origin: origins }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/menu', menuRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/chat', chatRouter({ anthropic: options.anthropic }));
  // Kiến thức khách sạn mà chatbot dùng (công khai, hiển thị ở trang AI Knowledge Base)
  app.get('/api/hotel-info', (req, res) => res.json(hotelInfo));
  app.use('/api/checkout', checkoutRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
