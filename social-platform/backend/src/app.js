import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));
  app.use(apiLimiter);
  app.use('/uploads', express.static(path.resolve(env.uploadDir)));

  app.get('/health', (req, res) => res.json({ ok: true }));
  app.use('/api', routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

