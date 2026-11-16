import mongoose from 'mongoose';

const receiptSchema = new mongoose.Schema({
  data: { type: Buffer, required: true },
  contentType: { type: String, required: true },
  filename: { type: String, default: 'receipt' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null }
}, { timestamps: true });

export const Receipt = mongoose.model('Receipt', receiptSchema);
