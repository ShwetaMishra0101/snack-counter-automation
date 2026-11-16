import express from 'express';
import { Refill, Office } from './models/index.js';
import { config } from './config.js';

export const reportRouter = express.Router();
reportRouter.get('/monthly', async (req, res, next) => {
  try {
    const year = Number(req.query.year), month = Number(req.query.month);
    if (!year || month < 1 || month > 12) return res.status(400).json({ error: 'Provide valid year and month' });
    const start = new Date(year, month - 1, 1), end = new Date(year, month, 1);
    const offices = await Office.find();
    const rows = await Refill.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, status: { $in: ['SUBMITTED','REIMBURSED','REJECTED'] } } },
      { $group: { _id: '$officeCurrency', total: { $sum: '$amountOfficeCurrency' }, count: { $sum: 1 } } }
    ]);
    const totals = { NOK: 0, INR: 0 };
    rows.forEach(r => { if (r._id in totals) totals[r._id] = r.total || 0; });
    res.json({
      year, month, officeTotals: rows,
      totalINR: totals.INR + totals.NOK * config.nokToInr,
      reportingCurrency: 'INR',
      conversion: { NOK_TO_INR: config.nokToInr },
      budgets: offices.map(o => ({ office: o.name, currency: o.currency, monthlyBudget: o.monthlyBudget }))
    });
  } catch(e) { next(e); }
});
