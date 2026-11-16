import mongoose from 'mongoose';

const refillSchema = new mongoose.Schema({
  officeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', required: true },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  status: {
    type: String,
    enum: ['OPEN', 'OFFERED', 'CLAIMED', 'PURCHASED', 'SUBMITTED', 'REIMBURSED', 'REJECTED'],
    default: 'OPEN'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
  offeredAt: Date,
  claimExpiresAt: Date,
  completedAt: Date,
  description: String,
  amountOfficeCurrency: Number,
  officeCurrency: String,
  reimbursementAmount: Number,
  reimbursementCurrency: String,
  fxRateToPayroll: Number,
  receiptUrl: String,
  hrClaimId: String,
  hrStatus: String,
  attempts: { type: Number, default: 0 },
  history: [{
    action: String,
    employeeId: mongoose.Schema.Types.ObjectId,
    at: { type: Date, default: Date.now },
    note: String
  }]
}, { timestamps: true });

export const Refill = mongoose.model('Refill', refillSchema);
