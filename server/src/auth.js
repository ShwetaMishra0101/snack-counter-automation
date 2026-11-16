import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Employee, Office } from './models/index.js';
import { config } from './config.js';

const PUBLIC_USER = e => ({
  _id: e._id, name: e.name, email: e.email, role: e.role, phone: e.phone,
  officeId: e.officeId, payrollCurrency: e.payrollCurrency,
  temporaryOfficeId: e.temporaryOfficeId, temporaryOfficeUntil: e.temporaryOfficeUntil
});

const sign = e => jwt.sign({ id: String(e._id), role: e.role, name: e.name }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

// Shared validation rules (also enforced client-side for instant feedback).
export function passwordIssue(password) {
  if (!password || password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Za-z]/.test(password)) return 'Password must contain at least one letter';
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  return '';
}

// E.164-style WhatsApp number: +, country code, 8–15 digits in total.
export function cleanPhone(phone) {
  return String(phone || '').replace(/[\s()-]/g, '');
}
export function isValidPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(cleanPhone(phone));
}

export const authRouter = express.Router();

// Offices are public so the signup form can offer the office/currency choice.
authRouter.get('/offices', async (_req, res, next) => {
  try { res.json(await Office.find()); } catch (e) { next(e); }
});

authRouter.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, officeId, payrollCurrency, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const pwIssue = passwordIssue(password);
    if (pwIssue) return res.status(400).json({ error: pwIssue });
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({ error: 'WhatsApp number must be a valid international number, e.g. +919876543210' });
    }
    // Office and payroll currency are optional here: they change over time and
    // are set from the dashboard (and confirmed on each claim).
    if (payrollCurrency && !['NOK', 'INR'].includes(payrollCurrency)) {
      return res.status(400).json({ error: 'Payroll currency must be NOK or INR' });
    }
    if (officeId && !(await Office.findById(officeId))) {
      return res.status(400).json({ error: 'Office not found' });
    }
    if (await Employee.findOne({ email: email.toLowerCase() })) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const employee = await Employee.create({
      name, email: email.toLowerCase(), phone: phone ? cleanPhone(phone) : '',
      passwordHash: await bcrypt.hash(password, 10),
      officeId: officeId || null, payrollCurrency: payrollCurrency || null, role: 'EMPLOYEE'
    });
    res.status(201).json({ token: sign(employee), user: PUBLIC_USER(employee) });
  } catch (e) { next(e); }
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const employee = await Employee.findOne({ email: (email || '').toLowerCase() });
    if (!employee || !employee.passwordHash || !(await bcrypt.compare(password || '', employee.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    res.json({ token: sign(employee), user: PUBLIC_USER(employee) });
  } catch (e) { next(e); }
});

export function authRequired(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Please log in' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    res.status(401).json({ error: 'Session expired — please log in again' });
  }
}

// Role checks read the CURRENT role from the database rather than trusting the
// token, so a role change by the admin takes effect without re-login.
function requireRole(roles, message) {
  return async (req, res, next) => {
    try {
      const employee = await Employee.findById(req.user.id, 'role');
      if (!employee || !roles.includes(employee.role)) {
        return res.status(403).json({ error: message });
      }
      req.user.role = employee.role;
      next();
    } catch (e) { next(e); }
  };
}

export const hrOnly = requireRole(['HR', 'ADMIN'], 'Only HR or an admin can approve or reject claims');
export const adminOnly = requireRole(['ADMIN'], 'Only the admin can manage roles');
