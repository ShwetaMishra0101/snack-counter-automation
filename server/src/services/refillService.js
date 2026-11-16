import mongoose from 'mongoose';
import { Employee, Office, Refill, MonthlyBudget } from '../models/index.js';
import { config } from '../config.js';

const addHistory = (refill, action, employeeId = null, note = '') => {
  refill.history.push({ action, employeeId, note, at: new Date() });
};

export function createRefillService({ notifier, hrClient, now = () => new Date() }) {
  const poolFilter = officeId => ({
    active: true, onHoliday: false,
    $or: [
      { officeId },
      { temporaryOfficeId: officeId, temporaryOfficeUntil: { $gt: now() } }
    ]
  });

  async function selectVolunteer(officeId, exclude = []) {
    return Employee.findOne({ ...poolFilter(officeId), _id: { $nin: exclude } })
      .sort({ lastAssignedAt: 1, createdAt: 1 });
  }

  async function offerNext(refillId, exclude = []) {
    const refill = await Refill.findById(refillId);
    if (!refill || !['OPEN', 'OFFERED'].includes(refill.status)) return refill;
    const volunteer = await selectVolunteer(refill.officeId, exclude);
    if (!volunteer) return refill;

    const deadline = new Date(now().getTime() + config.offerTtlHours * 3600_000);
    // Conditional write: only one concurrent scheduler can offer an OPEN task.
    const updated = await Refill.findOneAndUpdate(
      { _id: refillId, status: { $in: ['OPEN', 'OFFERED'] } },
      { $set: { status: 'OFFERED', assignedTo: volunteer._id, offeredAt: now(), claimExpiresAt: deadline },
        $inc: { attempts: 1 } },
      { new: true }
    );
    if (!updated) return Refill.findById(refillId);
    updated.history.push({ action: 'OFFERED', employeeId: volunteer._id, at: now() });
    await updated.save();
    await notifier.send(volunteer.phone,
      `Hi ${volunteer.name}! 🍪 The snack box needs a refill. It's your turn — please accept or decline in the dashboard before ${deadline.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      { recipientName: volunteer.name, refillId: updated._id, kind: 'OFFER' });
    return updated;
  }

  async function reportEmpty({ officeId, reportedBy }) {
    const office = await Office.findById(officeId);
    if (!office) throw new Error('Office not found');
    // One active refill per office: prevents duplicate purchases when several
    // people report the same empty box.
    const active = await Refill.findOne({
      officeId, status: { $in: ['OPEN', 'OFFERED', 'CLAIMED'] }
    }).populate('assignedTo');
    if (active) {
      const who = active.assignedTo?.name ? ` (currently with ${active.assignedTo.name})` : '';
      throw new Error(`A refill for this office is already in progress${who}. It frees up automatically if the receipt isn't submitted in time.`);
    }
    // The refill starts UNASSIGNED: every eligible volunteer is notified and
    // the first to accept gets it. Only if nobody steps up before the deadline
    // does the poller assign it through the least-recently-assigned rotation.
    const refill = await Refill.create({
      officeId, reportedBy, status: 'OPEN', officeCurrency: office.currency,
      claimExpiresAt: new Date(now().getTime() + config.offerTtlHours * 3600_000),
      history: [{ action: 'REPORTED_EMPTY', employeeId: reportedBy, at: now() }]
    });
    const volunteers = await Employee.find(poolFilter(officeId));
    for (const v of volunteers) {
      await notifier.send(v.phone,
        `🍪 The snack box at ${office.name} is empty! First volunteer to accept in the dashboard gets the refill.`,
        { recipientName: v.name, refillId: refill._id, kind: 'OPEN_CALL' });
    }
    return refill;
  }

  async function accept(refillId, employeeId) {
    const refill = await Refill.findById(refillId);
    if (!refill) throw new Error('Refill not found');
    // Only volunteers in this office's pool (home or visiting) may accept.
    const eligible = await Employee.findOne({ ...poolFilter(refill.officeId), _id: employeeId });
    if (!eligible) throw new Error("You are not in this office's volunteer pool");
    // Atomic: an OPEN refill goes to the first acceptor; a directed OFFER only
    // to its assignee. Concurrent accepts can never both win.
    const updated = await Refill.findOneAndUpdate({
      _id: refillId,
      $or: [
        { status: 'OPEN' },
        { status: 'OFFERED', assignedTo: employeeId, claimExpiresAt: { $gt: now() } }
      ]
    }, { $set: {
      status: 'CLAIMED', assignedTo: employeeId,
      // Purchase deadline: if the receipt never comes, the claim is released
      // so the box doesn't stay blocked on one person.
      claimExpiresAt: new Date(now().getTime() + config.purchaseTtlHours * 3600_000)
    } }, { new: true });
    if (!updated) throw new Error('This refill was already taken by another volunteer');
    addHistory(updated, 'CLAIMED', employeeId);
    await updated.save();
    await Employee.updateOne({ _id: employeeId }, { $set: { lastAssignedAt: now() } });
    return updated;
  }

  async function decline(refillId, employeeId) {
    const current = await Refill.findOneAndUpdate(
      { _id: refillId, status: 'OFFERED', assignedTo: employeeId },
      { $set: { status: 'OPEN', assignedTo: null, offeredAt: null, claimExpiresAt: null } },
      { new: true }
    );
    if (!current) throw new Error('Offer is no longer assigned to this volunteer');
    addHistory(current, 'DECLINED', employeeId);
    await current.save();
    return offerNext(refillId, [employeeId]);
  }

  // Periodic sweep: escalates open calls nobody took, reassigns expired
  // directed offers, and releases claims whose receipt never arrived.
  async function reassignExpiredOffers() {
    const results = [];

    // 1. Directed offers that expired → next volunteer in the rotation.
    const expiredOffers = await Refill.find({ status: 'OFFERED', claimExpiresAt: { $lte: now() } });
    for (const item of expiredOffers) {
      const oldAssignee = item.assignedTo;
      const reset = await Refill.findOneAndUpdate(
        { _id: item._id, status: 'OFFERED', claimExpiresAt: { $lte: now() } },
        { $set: { status: 'OPEN', assignedTo: null, offeredAt: null, claimExpiresAt: null } },
        { new: true }
      );
      if (reset) {
        addHistory(reset, 'OFFER_EXPIRED', oldAssignee);
        await reset.save();
        results.push(await offerNext(item._id, oldAssignee ? [oldAssignee] : []));
      }
    }

    // 2. Open calls nobody accepted in time → directed offer via rotation.
    const staleOpen = await Refill.find({ status: 'OPEN', claimExpiresAt: { $lte: now() } });
    for (const item of staleOpen) {
      results.push(await offerNext(item._id));
    }

    // 3. Claimed refills whose purchase deadline passed → released back to open.
    const staleClaims = await Refill.find({ status: 'CLAIMED', claimExpiresAt: { $lte: now() } });
    for (const item of staleClaims) {
      const released = await releaseClaim(item._id, item.assignedTo, 'CLAIM_TIMEOUT');
      if (released) results.push(released);
    }
    return results;
  }

  // The assignee gives a claimed refill back (or the sweep times it out):
  // it reopens so any volunteer can take it.
  async function releaseClaim(refillId, employeeId, reason = 'CLAIM_RELEASED') {
    const updated = await Refill.findOneAndUpdate(
      { _id: refillId, status: 'CLAIMED', assignedTo: employeeId },
      { $set: {
        status: 'OPEN', assignedTo: null, offeredAt: null,
        claimExpiresAt: new Date(now().getTime() + config.offerTtlHours * 3600_000)
      } },
      { new: true }
    );
    if (!updated) {
      if (reason === 'CLAIM_TIMEOUT') return null;
      throw new Error('Only the assigned volunteer can release this refill');
    }
    addHistory(updated, reason, employeeId);
    await updated.save();
    const former = await Employee.findById(employeeId);
    await notifier.send(former?.phone,
      `Your snack refill was released${reason === 'CLAIM_TIMEOUT' ? ' (purchase deadline passed)' : ''} — another volunteer can now take it.`,
      { recipientName: former?.name || '', refillId: updated._id, kind: 'RELEASED' });
    return updated;
  }

  async function submitPurchase(refillId, employeeId, { amount, description, receiptUrl, payrollCurrency }) {
    const refill = await Refill.findOne({ _id: refillId, status: 'CLAIMED', assignedTo: employeeId });
    if (!refill) throw new Error('Only the assigned volunteer can submit this purchase');
    const employee = await Employee.findById(employeeId);
    const office = await Office.findById(refill.officeId);
    if (!employee || !office) throw new Error('Employee or office not found');
    // Payroll currency can change over time, so the volunteer confirms it on
    // each claim; the choice is saved back to their profile.
    if (payrollCurrency) {
      if (!['NOK', 'INR'].includes(payrollCurrency)) throw new Error('Payroll currency must be NOK or INR');
      if (payrollCurrency !== employee.payrollCurrency) {
        employee.payrollCurrency = payrollCurrency;
        await employee.save();
      }
    }
    if (!employee.payrollCurrency) throw new Error('Choose the payroll currency you are reimbursed in');
    amount = Number(amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Purchase amount must be greater than zero');
    if (!receiptUrl) throw new Error('Receipt image is required');

    const fxRate = office.currency === employee.payrollCurrency ? 1 :
      (office.currency === 'NOK' ? config.nokToInr : 1 / config.nokToInr);
    const reimbursementAmount = Math.round(amount * fxRate * 100) / 100;
    const date = now();
    const year = date.getFullYear(), month = date.getMonth() + 1;
    const budget = await MonthlyBudget.findOneAndUpdate(
      { officeId: office._id, year, month },
      { $setOnInsert: { currency: office.currency, limit: office.monthlyBudget }, $inc: { reserved: amount } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (budget.reserved > budget.limit) {
      await MonthlyBudget.updateOne({ _id: budget._id }, { $inc: { reserved: -amount } });
      throw new Error(`Monthly ${office.currency} budget exceeded. Remaining: ${(budget.limit - (budget.reserved - amount)).toFixed(2)}`);
    }

    try {
      const claim = await hrClient.createClaim({
        amount: reimbursementAmount, currency: employee.payrollCurrency,
        description: description || `Snack refill for ${office.name}`,
        receiptUrl, employeeId: String(employee._id)
      });
      const updated = await Refill.findOneAndUpdate(
        { _id: refillId, status: 'CLAIMED', assignedTo: employeeId },
        { $set: {
          status: 'SUBMITTED', description, amountOfficeCurrency: amount, officeCurrency: office.currency,
          reimbursementAmount, reimbursementCurrency: employee.payrollCurrency, fxRateToPayroll: fxRate,
          receiptUrl, hrClaimId: claim.claimId
        }, $push: { history: { action: 'SUBMITTED_TO_HR', employeeId, at: now(), note: claim.claimId } } },
        { new: true }
      );
      if (!updated) throw new Error('Refill state changed while submitting');
      await notifier.send(employee.phone,
        `✅ Thanks ${employee.name}! Your receipt of ${amount} ${office.currency} was submitted to HR as claim ${claim.claimId}. You'll be reimbursed ${reimbursementAmount} ${employee.payrollCurrency}.`,
        { recipientName: employee.name, refillId: refill._id, kind: 'SUBMITTED' });
      return updated;
    } catch (error) {
      await MonthlyBudget.updateOne({ _id: budget._id }, { $inc: { reserved: -amount } });
      throw error;
    }
  }

  async function updateHrStatus(refillId, status) {
    if (!['APPROVED', 'REJECTED'].includes(status)) throw new Error('Status must be APPROVED or REJECTED');
    const refill = await Refill.findOne({ _id: refillId, status: 'SUBMITTED' });
    if (!refill) throw new Error('Submitted refill not found');
    refill.hrStatus = status;
    refill.status = status === 'APPROVED' ? 'REIMBURSED' : 'REJECTED';
    refill.completedAt = now();
    addHistory(refill, refill.status, refill.assignedTo);
    await refill.save();
    const employee = await Employee.findById(refill.assignedTo);
    await notifier.send(employee?.phone,
      status === 'APPROVED'
        ? `💸 Good news ${employee?.name || ''}! HR approved claim ${refill.hrClaimId}. ${refill.reimbursementAmount} ${refill.reimbursementCurrency} is on its way to you.`
        : `❌ HR rejected claim ${refill.hrClaimId}. Please contact HR for details.`,
      { recipientName: employee?.name || '', refillId: refill._id, kind: status });
    return refill;
  }

  return { reportEmpty, accept, decline, releaseClaim, reassignExpiredOffers, submitPurchase, updateHrStatus, offerNext };
}
