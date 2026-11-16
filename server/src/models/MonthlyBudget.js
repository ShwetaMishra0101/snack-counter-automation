import mongoose from 'mongoose';

const monthlyBudgetSchema = new mongoose.Schema({
  officeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  currency: { type: String, required: true },
  limit: { type: Number, required: true },
  reserved: { type: Number, default: 0 }
}, { timestamps: true });

monthlyBudgetSchema.index({ officeId: 1, year: 1, month: 1 }, { unique: true });

export const MonthlyBudget = mongoose.model('MonthlyBudget', monthlyBudgetSchema);
