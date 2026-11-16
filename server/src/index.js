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

await mongoose.connect(config.mongoUri);
const app = express();
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve('uploads')));
const service = createRefillService({ notifier: createNotifier(), hrClient: createHrClient() });
app.use('/api/auth', authRouter);
app.use('/api/reports', authRequired, reportRouter);
app.use('/api', authRequired, buildRouter(service));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(400).json({ error: err.message || 'Unexpected error' });
});
app.listen(config.port, () => console.log(`API listening on ${config.port}`));

// Lightweight expiry poller. Use a durable job queue for production deployments.
setInterval(() => service.reassignExpiredOffers().catch(console.error), 60_000);
