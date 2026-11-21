import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import roomsRouter from './routes/rooms.js';
import menuRouter from './routes/menu.js';
import authRouter from './routes/auth.js';
import requestsRouter from './routes/requests.js';
import chatRouter from './routes/chat.js';
import checkoutRouter from './routes/checkout.js';
import meRouter from './routes/me.js';
import { notFound, errorHandler } from './middleware/errors.js';

export function createApp() {
  const app = express();
  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((o) => o.trim());

  app.use(cors({ origin: origins }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/rooms', roomsRouter);
  app.use('/api/menu', menuRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/me', meRouter);
  app.use('/api/requests', requestsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/checkout', checkoutRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
