import cors from 'cors';
import express from 'express';
import fs from 'fs';
import mongoose from 'mongoose';
import morgan from 'morgan';
import path from 'path';

import { razorpayWebhook } from './controllers/student.mysql.controller.js';
import { errorHandler } from './middleware/errorHandler.js';
import { adminRouter } from './routes/admin.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { counselingRouter } from './routes/counseling.routes.js';
import { doubtRouter } from './routes/doubt.routes.js';
import { studentRouter } from './routes/student.routes.js';

export function createApp() {
  const app = express();

  const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || process.cwd());
  const publicUploadsDir = path.join(uploadRoot, 'uploads');


  app.post('/api/webhooks/razorpay', express.raw({ type: '*/*' }), razorpayWebhook);
  app.use(express.urlencoded({ extended: true }));

  // Public image endpoint for mock test question images (avoids sending base64 in startTest)
  // Placed BEFORE cors() middleware to ensure simple image loading without CORS credential conflicts
  app.get('/api/mock-question-image/:questionId', async (req, res) => {
    try {
      const qId = Number(req.params.questionId);
      if (isNaN(qId)) return res.status(400).send('Invalid question id');

      const { getMockTestQuestionModel, connectMockTestDb } = await import('./config/mockTestDb.js');
      await connectMockTestDb();
      const MockQuestion = await getMockTestQuestionModel();
      const q = await MockQuestion.findOne({ id: qId }).lean();

      if (!q || !q.image_url) {
        console.warn(`[image-proxy] Image not found for Q#${qId}`);
        return res.status(404).send('Image not found');
      }

      const imgData = q.image_url;

      // Explicitly allow any origin to read the image (simple CORS for images)
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      // DO NOT set Access-Control-Allow-Credentials to true when Origin is *

      if (imgData.startsWith('data:')) {
        const [header, base64] = imgData.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        const buffer = Buffer.from(base64, 'base64');
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Length', buffer.length); // explicitly set size
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.end(buffer);
      }

      // It's a URL path – redirect
      return res.redirect(imgData);
    } catch (err) {
      console.error('[image-proxy] Error:', err);
      res.status(500).send('Error serving image');
    }
  });
  // (moved cors here, after the proxy)
  const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',').map(o => o.trim()).filter(Boolean);
  app.use(
    cors({
      origin: (origin, cb) => {
        // Allow requests with no origin (curl, mobile apps, server-to-server)
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(new Error(`CORS: origin ${origin} not allowed`), false);
      },
      credentials: true,
    })
  );

  app.post('/api/webhooks/razorpay-redirect', async (req, res, next) => {
    const { verifyPaymentRedirect } = await import('./controllers/student.mysql.controller.js');
    return verifyPaymentRedirect(req, res, next);
  });

  app.use(express.json({ limit: '100mb' }));
  app.use(morgan('dev'));

  // (Removed image route from here)

  app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ message: 'Database unavailable. Please try again.' });
    }
    return next();
  });

  // In-memory cache for high-concurrency image serving (1000+ students)
  const imageCache = new Map();
  app.use('/uploads', (req, res, next) => {
    if (req.method !== 'GET') return next();

    try {
      const cleanPath = decodeURIComponent(req.path);
      if (cleanPath.includes('..')) return next();

      const filePath = path.join(publicUploadsDir, cleanPath);

      if (imageCache.has(filePath)) {
        res.type(path.extname(filePath)); // Natively set correct MIME
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        return res.end(imageCache.get(filePath)); // Safest binary send
      }

      fs.readFile(filePath, (err, data) => {
        if (err) return next();
        if (imageCache.size < 5000) {
          imageCache.set(filePath, data);
        }
        res.type(path.extname(filePath));
        res.set('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(data);
      });
    } catch {
      next();
    }
  });

  app.use('/uploads', express.static(publicUploadsDir, { maxAge: '365d', immutable: true }));

  app.get('/api/health', (req, res) => {
    res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'up' : 'down' });
  });

  // Lightweight ping – point an uptime monitor (e.g. UptimeRobot) at this
  // endpoint every 5 minutes so the server and MongoDB connection stay warm.
  // This eliminates the "first request" cold-start delay entirely.
  app.get('/api/ping', (req, res) => {
    res.json({ pong: true, version: '2.0.0-verified', ts: Date.now() });
  });

  app.get('/api/public/gridfs/:id', async (req, res, next) => {
    try {
      const gridId = String(req.params.id || '').trim();
      const filesDb = (await import('./config/db.js')).getFilesDb();
      if (!filesDb) return res.status(503).send('Database unavailable');
      const objId = new mongoose.Types.ObjectId(gridId);

      const cacheDir = path.join(process.cwd(), 'uploads', 'gridfs_cache');
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
      const cachePath = path.join(cacheDir, `${gridId}.pdf`);
      const tmpPath = `${cachePath}.tmp`;

      if (fs.existsSync(cachePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.sendFile(cachePath, {
          headers: { 'Content-Disposition': 'inline', 'Content-Type': 'application/pdf' }
        });
      }

      let bucket = new mongoose.mongo.GridFSBucket(filesDb, { bucketName: 'uploads' });
      let files = await bucket.find({ _id: objId }).toArray();

      if ((!files || files.length === 0) && filesDb !== mongoose.connection.db) {
        const fallbackBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
        const fallbackFiles = await fallbackBucket.find({ _id: objId }).toArray();
        if (fallbackFiles && fallbackFiles.length > 0) {
          bucket = fallbackBucket;
          files = fallbackFiles;
        }
      }

      if (!files || files.length === 0) return res.status(404).send('File not found');

      res.setHeader('Content-Type', files[0].contentType || 'application/pdf');
      res.setHeader('Content-Length', files[0].length);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

      const readStream = bucket.openDownloadStream(objId);
      readStream.on('error', (e) => {
        console.error('Public GridFS read error:', e);
        if (!res.headersSent) res.status(500).send('Error streaming from database');
      });
      readStream.pipe(res);

      res.on('finish', () => {
        if (fs.existsSync(cachePath) || fs.existsSync(tmpPath)) return;
        try {
          const cacheStream = bucket.openDownloadStream(objId);
          const writeStream = fs.createWriteStream(tmpPath);
          cacheStream.pipe(writeStream);
          writeStream.on('finish', () => {
            try { fs.renameSync(tmpPath, cachePath); } catch (_) { }
          });
          writeStream.on('error', () => { try { fs.unlinkSync(tmpPath); } catch (_) { } });
        } catch (_) { }
      });
    } catch (err) {
      if (err.name === 'BSONError' || String(err.message).includes('hex')) {
        return res.status(404).send('Invalid file id');
      }
      next(err);
    }
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/student', studentRouter);
  app.use('/api/counseling', counselingRouter);
  app.use('/api/doubts', doubtRouter);

  app.use(errorHandler);

  return app;
}
