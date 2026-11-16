import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, default: '' },
  // EMPLOYEE volunteers; HR approves/rejects claims; ADMIN assigns roles.
  role: { type: String, enum: ['EMPLOYEE', 'HR', 'ADMIN'], default: 'EMPLOYEE' },
  phone: { type: String, default: '' },
  // Office and payroll currency can change anytime (transfers, relocations),
  // so they are set/updated from the dashboard and confirmed at claim time,
  // not fixed at signup.
  officeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', default: null },
  // A visiting employee can temporarily join another office's volunteer pool.
  temporaryOfficeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', default: null },
  temporaryOfficeUntil: { type: Date, default: null },
  payrollCurrency: { type: String, enum: ['NOK', 'INR'], default: null },
  active: { type: Boolean, default: true },
  onHoliday: { type: Boolean, default: false },
  // Drives the least-recently-assigned rotation so refills are shared fairly.
  lastAssignedAt: { type: Date, default: new Date(0) }
}, { timestamps: true });

export const Employee = mongoose.model('Employee', employeeSchema);
