// Local / long-running entry point (dev, Render, Railway…).
// Vercel uses api/index.js instead, where the sweep rides on API traffic.
import { config } from './config.js';
import { connectDb, createApp, service } from './app.js';

await connectDb();
const app = createApp();
app.listen(config.port, () => console.log(`API listening on ${config.port}`));

// Lightweight expiry poller. Use a durable job queue for production deployments.
setInterval(() => service.reassignExpiredOffers().catch(console.error), 60_000);
