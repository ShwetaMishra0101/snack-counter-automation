import express from 'express';
import multer from 'multer';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import { Employee, Office, Refill, Notification, Receipt } from './models/index.js';
import { hrOnly, adminOnly, passwordIssue, isValidPhone, cleanPhone } from './auth.js';

export function buildRouter(service) {
  const router = express.Router();

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => {
    cb(null, ['image/jpeg','image/png','image/webp','application/pdf'].includes(file.mimetype));
  }});

  router.get('/offices', async (_req, res, next) => { try { res.json(await Office.find()); } catch(e) { next(e); } });
  router.get('/employees', async (_req, res, next) => {
    try { res.json(await Employee.find({}, '-passwordHash').populate('officeId')); } catch(e) { next(e); }
  });

  // Admin assigns roles. Whoever holds the HR role can then approve claims.
  router.post('/employees/:id/role', adminOnly, async (req, res, next) => {
    try {
      const { role } = req.body;
      if (!['EMPLOYEE', 'HR', 'ADMIN'].includes(role)) {
        return res.status(400).json({ error: 'Role must be EMPLOYEE, HR or ADMIN' });
      }
      if (req.params.id === req.user.id) {
        return res.status(400).json({ error: 'You cannot change your own role' });
      }
      const employee = await Employee.findByIdAndUpdate(req.params.id,
        { $set: { role } }, { new: true, select: '-passwordHash' }).populate('officeId');
      if (!employee) return res.status(404).json({ error: 'Employee not found' });
      res.json(employee);
    } catch(e) { next(e); }
  });

  // The logged-in employee's profile (fresh from the DB, includes visit status).
  router.get('/me', async (req, res, next) => {
    try {
      const me = await Employee.findById(req.user.id, '-passwordHash').populate('officeId temporaryOfficeId');
      if (!me) return res.status(404).json({ error: 'Account not found' });
      res.json(me);
    } catch(e) { next(e); }
  });

  // Office, payroll currency, WhatsApp number and password all change over
  // time — update them anytime, with the same validation as signup.
  router.post('/me/profile', async (req, res, next) => {
    try {
      const { officeId, payrollCurrency, phone, newPassword } = req.body;
      if (!officeId || !['NOK', 'INR'].includes(payrollCurrency)) {
        return res.status(400).json({ error: 'Provide your office and payroll currency (NOK or INR)' });
      }
      if (!(await Office.findById(officeId))) return res.status(400).json({ error: 'Office not found' });
      const update = { officeId, payrollCurrency };
      if (phone !== undefined) {
        if (phone && !isValidPhone(phone)) {
          return res.status(400).json({ error: 'WhatsApp number must be a valid international number, e.g. +919876543210' });
        }
        update.phone = phone ? cleanPhone(phone) : '';
      }
      if (newPassword) {
        const pwIssue = passwordIssue(newPassword);
        if (pwIssue) return res.status(400).json({ error: pwIssue });
        update.passwordHash = await bcrypt.hash(newPassword, 10);
      }
      const employee = await Employee.findByIdAndUpdate(req.user.id,
        { $set: update }, { new: true, select: '-passwordHash' }).populate('officeId temporaryOfficeId');
      res.json(employee);
    } catch(e) { next(e); }
  });

  // Visiting the other office for a week or two: join its volunteer pool until
  // a given date. Reimbursement stays in the employee's own payroll currency.
  router.post('/me/visit', async (req, res, next) => {
    try {
      const { officeId, until } = req.body;
      const expiry = new Date(until);
      if (!officeId || Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
        return res.status(400).json({ error: 'Provide officeId and a future until date' });
      }
      const employee = await Employee.findByIdAndUpdate(req.user.id,
        { $set: { temporaryOfficeId: officeId, temporaryOfficeUntil: expiry } }, { new: true, select: '-passwordHash' });
      res.json(employee);
    } catch(e) { next(e); }
  });
  router.post('/me/end-visit', async (req, res, next) => {
    try {
      const employee = await Employee.findByIdAndUpdate(req.user.id,
        { $set: { temporaryOfficeId: null, temporaryOfficeUntil: null } }, { new: true, select: '-passwordHash' });
      res.json(employee);
    } catch(e) { next(e); }
  });

  // WhatsApp notification feed (simulated channel) consumed by the dashboard.
  router.get('/notifications', async (req, res, next) => {
    try {
      const filter = req.query.to ? { to: req.query.to } : {};
      res.json(await Notification.find(filter).sort({ createdAt: -1 }).limit(100));
    } catch(e) { next(e); }
  });
  router.get('/refills', async (req, res, next) => {
    try {
      const filter = req.query.officeId ? { officeId: req.query.officeId } : {};
      res.json(await Refill.find(filter).sort({ createdAt: -1 }).populate('officeId assignedTo reportedBy'));
    } catch(e) { next(e); }
  });

  // All refill actions act as the logged-in user — the employee ID comes from
  // the verified token, never from the request body.
  router.post('/refills', async (req, res, next) => {
    try { res.status(201).json(await service.reportEmpty({ officeId: req.body.officeId, reportedBy: req.user.id })); } catch(e) { next(e); }
  });
  router.post('/refills/:id/accept', async (req, res, next) => {
    try { res.json(await service.accept(req.params.id, req.user.id)); } catch(e) { next(e); }
  });
  router.post('/refills/:id/decline', async (req, res, next) => {
    try { res.json(await service.decline(req.params.id, req.user.id)); } catch(e) { next(e); }
  });
  // The assignee can give a claimed refill back if they can't complete it.
  router.post('/refills/:id/release', async (req, res, next) => {
    try { res.json(await service.releaseClaim(req.params.id, req.user.id)); } catch(e) { next(e); }
  });
  router.post('/refills/:id/purchase', upload.single('receipt'), async (req, res, next) => {
    try {
      if (!req.file) throw new Error('Receipt file is required');
      const receipt = await Receipt.create({
        data: req.file.buffer,
        contentType: req.file.mimetype,
        filename: req.file.originalname || 'receipt',
        uploadedBy: req.user.id
      });
      // The extension in the URL lets the browser preview instead of download.
      const receiptUrl = `/api/receipts/${receipt._id}${path.extname(req.file.originalname || '').toLowerCase()}`;
      res.json(await service.submitPurchase(req.params.id, req.user.id, {
        amount: req.body.amount, description: req.body.description, receiptUrl,
        payrollCurrency: req.body.payrollCurrency
      }));
    } catch(e) { next(e); }
  });
  // Stands in for the HR vendor's webhook. Only HR accounts may call it.
  router.post('/refills/:id/simulate-hr-status', hrOnly, async (req, res, next) => {
    try { res.json(await service.updateHrStatus(req.params.id, req.body.status)); } catch(e) { next(e); }
  });
  return router;
}
