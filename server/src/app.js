import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import path from 'node:path';
import { config } from './config.js';
import { createNotifier } from './adapters/notifications.js';
import { createHrClient } from './adapters/hr.js';
import { createRefillService } from './services/refillService.js';
import { buildRouter } from './routes.js';
import { reportRouter } from './reports.js';
import { authRouter, authRequired } from './auth.js';
import { Receipt } from './models/index.js';

// One cached connection: serverless hosts reuse it across invocations.
// A FAILED attempt must not stay cached, or a warm instance would replay the
// old error forever (e.g. after the Atlas IP allowlist is fixed).
let connecting = null;
export function connectDb() {
  if (!connecting) {
    connecting = mongoose
      .connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 })
      .catch(error => {
        connecting = null;
        throw error;
      });
  }
  return connecting;
}

export const service = createRefillService({ notifier: createNotifier(), hrClient: createHrClient() });

// On serverless hosts there is no background timer, so the sweep (escalate
// open calls, reassign expired offers, release abandoned claims) piggybacks
// on API traffic, at most once every 30 s.
let lastSweep = 0;
async function sweepIfDue() {
  const now = Date.now();
  if (now - lastSweep < 30_000) return;
  lastSweep = now;
  try { await service.reassignExpiredOffers(); } catch (error) { console.error('sweep failed:', error); }
}

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.frontendOrigin }));
  app.use(express.json());
  app.use((_req, _res, next) => { connectDb().then(() => next(), next); });

  // Legacy receipts uploaded to local disk before the move to MongoDB.
  app.use('/uploads', express.static(path.resolve('uploads')));
  // Receipts served from MongoDB. The trailing filename part only carries the
  // extension so browsers preview instead of downloading.
  app.get('/api/receipts/:file', async (req, res, next) => {
    try {
      const id = req.params.file.split('.')[0];
      if (!mongoose.isValidObjectId(id)) return res.status(404).json({ error: 'Receipt not found' });
      const receipt = await Receipt.findById(id);
      if (!receipt) return res.status(404).json({ error: 'Receipt not found' });
      res.set('Content-Type', receipt.contentType);
      res.set('Content-Disposition', 'inline');
      res.send(receipt.data);
    } catch (e) { next(e); }
  });

  app.use('/api', (_req, _res, next) => { sweepIfDue().then(() => next(), () => next()); });
  app.use('/api/auth', authRouter);
  app.use('/api/reports', authRequired, reportRouter);
  app.use('/api', authRequired, buildRouter(service));
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(400).json({ error: err.message || 'Unexpected error' });
  });
  return app;
}
