import { randomUUID } from 'node:crypto';

// Replace this adapter with the HR vendor's authenticated API client.
// Contract: amount, currency, description, receipt image URL and employee ID.
export function createHrClient() {
  return {
    async createClaim({ amount, currency, description, receiptUrl, employeeId }) {
      const claim = { claimId: `DEMO-${randomUUID()}`, amount, currency, description, receiptUrl, employeeId };
      console.log('[HR simulation] claim created', claim);
      return claim;
    }
  };
}
