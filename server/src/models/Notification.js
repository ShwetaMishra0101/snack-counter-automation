import mongoose from 'mongoose';

// Audit log of every outbound WhatsApp message; also feeds the dashboard's
// simulated WhatsApp panel.
const notificationSchema = new mongoose.Schema({
  channel: { type: String, default: 'whatsapp' },
  to: { type: String, default: '' },
  recipientName: { type: String, default: '' },
  body: { type: String, required: true },
  refillId: { type: mongoose.Schema.Types.ObjectId, ref: 'Refill', default: null },
  kind: { type: String, default: 'INFO' },
  delivered: { type: Boolean, default: true }
}, { timestamps: true });

export const Notification = mongoose.model('Notification', notificationSchema);
