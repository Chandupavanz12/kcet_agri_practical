import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import mongoose from 'mongoose';

import { authRouter } from './routes/auth.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { studentRouter } from './routes/student.routes.js';
import { razorpayWebhook } from './controllers/student.mysql.controller.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || process.cwd());
  const publicUploadsDir = path.join(uploadRoot, 'uploads');

  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );

  app.post('/api/webhooks/razorpay', express.raw({ type: 'application/json' }), razorpayWebhook);

  app.use(express.json({ limit: '2mb' }));
  app.use(morgan('dev'));

  app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database unavailable. Please try again.' });
    }
    return next();
  });

  app.use('/uploads', express.static(publicUploadsDir));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/student', studentRouter);

  app.use(errorHandler);

  return app;
}
