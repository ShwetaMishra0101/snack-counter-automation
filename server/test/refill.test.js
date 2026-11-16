import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Employee, Office, Refill, MonthlyBudget } from '../src/models/index.js';
import { createRefillService } from '../src/services/refillService.js';

let mongod, office, e1, e2, service, clock;
const notifications = [];
const hrClaims = [];
const notifier = { async send(to, message, meta) { notifications.push({ to, message, meta }); } };
const hrClient = { async createClaim(data) { hrClaims.push(data); return { claimId: `HR-${hrClaims.length}` }; } };

const HOUR = 3600 * 1000;
const advance = hours => { clock = new Date(clock.getTime() + hours * HOUR); };

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
after(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => {
  await Promise.all([Employee.deleteMany({}), Office.deleteMany({}), Refill.deleteMany({}), MonthlyBudget.deleteMany({})]);
  notifications.length = 0; hrClaims.length = 0;
  clock = new Date('2026-11-16T10:00:00Z');
  service = createRefillService({ notifier, hrClient, now: () => new Date(clock) });
  office = await Office.create({ name:'Bengaluru', code:'BLR', currency:'INR', monthlyBudget:15000 });
  e1 = await Employee.create({ name:'Asha', email:'asha@test.com', officeId:office._id, payrollCurrency:'INR' });
  e2 = await Employee.create({ name:'Rahul', email:'rahul@test.com', officeId:office._id, payrollCurrency:'INR' });
});

test('a reported box starts unassigned and all pool volunteers are notified', async () => {
  const refill = await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  assert.equal(refill.status, 'OPEN');
  assert.equal(refill.assignedTo, null);
  assert.equal(notifications.length, 2); // open call broadcast to Asha and Rahul
  assert.match(notifications[0].message, /first volunteer to accept/i);
});

test('two volunteers cannot both take the same open refill', async () => {
  const refill = await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  const results = await Promise.allSettled([
    service.accept(refill._id, e1._id),
    service.accept(refill._id, e2._id)
  ]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await Refill.findById(refill._id)).status, 'CLAIMED');
});

test('an outsider cannot accept a refill for an office they do not belong to', async () => {
  const oslo = await Office.create({ name:'Oslo', code:'OSLO', currency:'NOK', monthlyBudget:6000 });
  const refill = await service.reportEmpty({ officeId: oslo._id, reportedBy: e1._id });
  await assert.rejects(service.accept(refill._id, e1._id), /volunteer pool/);
});

test('an open call nobody takes is escalated to a directed offer via the rotation', async () => {
  const refill = await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  advance(13); // past the 12h open window
  await service.reassignExpiredOffers();
  const updated = await Refill.findById(refill._id);
  assert.equal(updated.status, 'OFFERED');
  assert.ok(updated.assignedTo); // least-recently-assigned volunteer
  assert.equal(updated.attempts, 1);
});

test('an expired directed offer is handed to another volunteer', async () => {
  const refill = await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  advance(13);
  await service.reassignExpiredOffers(); // escalate to first volunteer
  const first = String((await Refill.findById(refill._id)).assignedTo);
  advance(13); // directed offer expires too
  await service.reassignExpiredOffers();
  const updated = await Refill.findById(refill._id);
  assert.equal(updated.status, 'OFFERED');
  assert.notEqual(String(updated.assignedTo), first);
  assert.equal(updated.attempts, 2);
});

test('a declined directed offer goes to the next volunteer with a WhatsApp notification', async () => {
  const refill = await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  advance(13);
  await service.reassignExpiredOffers();
  const first = String((await Refill.findById(refill._id)).assignedTo);
  const reassigned = await service.decline(refill._id, first);
  assert.equal(reassigned.status, 'OFFERED');
  assert.notEqual(String(reassigned.assignedTo), first);
  assert.match(notifications.at(-1).message, /refill/i);
});

test('a claimed refill whose receipt never arrives is released for others', async () => {
  const refill = await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  await service.accept(refill._id, e1._id);
  advance(49); // past the 48h purchase deadline
  await service.reassignExpiredOffers();
  const released = await Refill.findById(refill._id);
  assert.equal(released.status, 'OPEN');
  assert.equal(released.assignedTo, null);
  // Another volunteer can now take it.
  const taken = await service.accept(refill._id, e2._id);
  assert.equal(taken.status, 'CLAIMED');
  assert.equal(String(taken.assignedTo), String(e2._id));
});

test('reporting the same office again while a refill is active is rejected', async () => {
  await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  await assert.rejects(
    service.reportEmpty({ officeId: office._id, reportedBy: e1._id }),
    /already in progress/
  );
  assert.equal(await Refill.countDocuments({ officeId: office._id }), 1);
});

test('purchase is rejected when it exceeds office monthly budget', async () => {
  const refill = await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  await service.accept(refill._id, e1._id);
  await assert.rejects(
    service.submitPurchase(refill._id, e1._id, { amount: 15001, description: 'Snacks', receiptUrl: '/receipt.png' }),
    /budget exceeded/
  );
  assert.equal(hrClaims.length, 0);
});

test('a visiting employee can take the other office refill and is reimbursed in payroll currency', async () => {
  const oslo = await Office.create({ name:'Oslo', code:'OSLO', currency:'NOK', monthlyBudget:6000 });
  const visitor = await Employee.create({
    name:'Visiting teammate', email:'visitor@test.com', officeId:office._id,
    temporaryOfficeId:oslo._id, temporaryOfficeUntil:new Date('2026-12-01T00:00:00Z'),
    payrollCurrency:'INR'
  });
  const refill = await service.reportEmpty({ officeId:oslo._id, reportedBy:visitor._id });
  const taken = await service.accept(refill._id, visitor._id);
  assert.equal(String(taken.assignedTo), String(visitor._id));
  const submitted = await service.submitPurchase(refill._id, visitor._id, {
    amount:100, description:'Oslo snacks', receiptUrl:'/receipt.png'
  });
  assert.equal(submitted.officeCurrency, 'NOK');
  assert.equal(submitted.reimbursementCurrency, 'INR');
  assert.equal(submitted.reimbursementAmount, 800);
  assert.equal(hrClaims[0].currency, 'INR');
});

test('payroll currency can be changed at claim time and is saved to the profile', async () => {
  const refill = await service.reportEmpty({ officeId: office._id, reportedBy: e2._id });
  await service.accept(refill._id, e1._id);
  const submitted = await service.submitPurchase(refill._id, e1._id, {
    amount: 100, description: 'Snacks', receiptUrl: '/receipt.png', payrollCurrency: 'NOK'
  });
  assert.equal(submitted.officeCurrency, 'INR');
  assert.equal(submitted.reimbursementCurrency, 'NOK');
  assert.equal(submitted.reimbursementAmount, 12.5); // 100 INR / 8
  assert.equal((await Employee.findById(e1._id)).payrollCurrency, 'NOK');
});

test('report totals preserve both currencies and normalize to INR', async () => {
  const oslo = await Office.create({ name:'Oslo', code:'OSLO', currency:'NOK', monthlyBudget:6000 });
  await Refill.create({ officeId: office._id, status:'REIMBURSED', officeCurrency:'INR', amountOfficeCurrency:1000, createdAt:clock });
  await Refill.create({ officeId: oslo._id, status:'SUBMITTED', officeCurrency:'NOK', amountOfficeCurrency:100, createdAt:clock });
  const agg = await Refill.aggregate([
    { $match: { createdAt: { $gte: new Date('2026-11-01'), $lt: new Date('2026-12-01') }, status: { $in:['SUBMITTED','REIMBURSED','REJECTED'] } } },
    { $group: { _id:'$officeCurrency', total:{ $sum:'$amountOfficeCurrency' } } }
  ]);
  const totals = Object.fromEntries(agg.map(x => [x._id, x.total]));
  assert.equal(totals.INR, 1000);
  assert.equal(totals.NOK, 100);
  assert.equal(totals.INR + totals.NOK * 8, 1800);
});
