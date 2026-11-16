import dotenv from 'dotenv';
dotenv.config();
export const config = {
  port: Number(process.env.PORT || 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/snack_refill',
  offerTtlHours: Number(process.env.OFFER_TTL_HOURS || 12),
  purchaseTtlHours: Number(process.env.PURCHASE_TTL_HOURS || 48),
  nokToInr: Number(process.env.NOK_TO_INR || 8),
  // Comma-separated list, e.g. "http://localhost:5173,https://snack-refill.netlify.app"
  frontendOrigin: (process.env.FRONTEND_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim()),
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
};
