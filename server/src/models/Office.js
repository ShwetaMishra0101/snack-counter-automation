import mongoose from 'mongoose';

const officeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, enum: ['OSLO', 'BLR'], unique: true },
  currency: { type: String, enum: ['NOK', 'INR'], required: true },
  monthlyBudget: { type: Number, required: true }
}, { timestamps: true });

export const Office = mongoose.model('Office', officeSchema);
