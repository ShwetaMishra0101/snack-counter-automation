import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { Office, Employee, Refill, MonthlyBudget, Notification } from './models/index.js';

await mongoose.connect(config.mongoUri);
await Promise.all([
  Employee.deleteMany({}), Office.deleteMany({}),
  Refill.deleteMany({}), MonthlyBudget.deleteMany({}), Notification.deleteMany({})
]);

const oslo = await Office.create({ name: 'Oslo', code: 'OSLO', currency: 'NOK', monthlyBudget: 6000 });
const blr = await Office.create({ name: 'Bengaluru', code: 'BLR', currency: 'INR', monthlyBudget: 15000 });

// All demo accounts share the password below for easy demoing.
const DEMO_PASSWORD = 'password123';
const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

await Employee.insertMany([
  ...['Olav','Nora','Erik','Maja','Lars'].map((name, i) => ({
    name, email: `${name.toLowerCase()}@example.com`, passwordHash,
    phone: '+4790000000' + i, officeId: oslo._id, payrollCurrency: 'NOK'
  })),
  ...['Asha','Rahul','Priya','Arjun','Meera','Kiran'].map((name, i) => ({
    name, email: `${name.toLowerCase()}@example.com`, passwordHash,
    phone: '+9190000000' + i, officeId: blr._id, payrollCurrency: 'INR'
  })),
  { name: 'HR Approver', email: 'hr@example.com', passwordHash, role: 'HR',
    officeId: oslo._id, payrollCurrency: 'NOK' },
  { name: 'System Admin', email: 'admin@example.com', passwordHash, role: 'ADMIN',
    officeId: blr._id, payrollCurrency: 'INR' }
]);

console.log(`Seed complete. All demo accounts use the password "${DEMO_PASSWORD}".`);
console.log('HR account: hr@example.com (only the HR role can approve claims).');
console.log('Admin account: admin@example.com (assigns roles on the Team page).');
console.log('Volunteers: olav@…, nora@…, erik@…, maja@…, lars@… (Oslo) · asha@…, rahul@…, priya@…, arjun@…, meera@…, kiran@… (Bengaluru), all @example.com');
await mongoose.disconnect();
