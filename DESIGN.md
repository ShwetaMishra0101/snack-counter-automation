# Snack Counter Automation — Design

Nov 16, 2026 · @Shweta Mishra

## 1. From "empty" to "reimbursed"

A refill passes through five states, and every waiting state has a deadline, so a box is never stuck on one person.

```
                 first to accept        receipt, budget OK      HR approves
   ┌──────┐      ┌─────────┐            ┌───────────┐           ┌────────────┐
   │ OPEN │ ───> │ CLAIMED │ ─────────> │ SUBMITTED │ ────────> │ REIMBURSED │
   └──────┘      └─────────┘            └───────────┘           └────────────┘
     │  ▲          │     ▲                    │ HR rejects
     │  │ released, or no receipt in 48 h     v
     │  └──────────┘                    ┌──────────┐
     │ no taker in 12 h                 │ REJECTED │
     v                                  └──────────┘
   ┌─────────┐  accepts ──> CLAIMED
   │ OFFERED │ ──┐
   └─────────┘   │ declined or 12 h silence: next volunteer (loops)
        ▲────────┘
```

The top row is the normal path; every other arrow is a fallback that hands an unfinished refill to someone else.

1. **Report (OPEN).** Anyone taps "Report empty box". The refill starts unassigned, and every volunteer in that office's pool gets a WhatsApp message: first to accept buys. Only one active refill per office can exist.
2. **Accept (CLAIMED).** The first volunteer to accept wins; the write is atomic, so a second acceptor is refused. The buyer then has 48 hours to submit a receipt.
3. **Fallback offer (OFFERED).** If nobody accepts within 12 hours, one volunteer is chosen by least-recently-assigned rotation. A decline, or 12 hours of silence, passes it to the next person.
4. **Submit (SUBMITTED).** The buyer uploads the receipt and amount and confirms their payroll currency. The system checks the office budget, converts the amount, and files the HR claim immediately.
5. **Decide (REIMBURSED or REJECTED).** HR decides within 1–10 days. The HR status update closes the refill and the buyer is notified.

A buyer who cannot finish can release the refill; a missed 48-hour deadline releases it automatically. Either way it reopens for everyone.

## 2. Main parts and the data each keeps

All rules live in one stateless refill service; state lives in five MongoDB collections, and the chat tool and HR system sit behind two small adapters.

| Part | Responsibility | Data it keeps |
| --- | --- | --- |
| Refill service | The state machine, choosing who buys, budget check, currency conversion | None (stateless) |
| Sweeper (every 60 s) | Escalates unanswered open calls, reassigns expired offers, releases abandoned claims | None |
| Office | Office master data | Name, currency, monthly budget |
| Employee | Volunteer pool and access | Home office, visiting office + end date, payroll currency, WhatsApp number, role, holiday flag, last-assigned time |
| Refill | One task per empty box | Status, assignee, deadline, amount in office currency, reimbursement amount + currency + FX rate, receipt, HR claim ID, audit history |
| MonthlyBudget | Spend control | Per office and month: limit, amount reserved |
| Notification | Message log | Recipient, text, type, delivered or failed |
| Chat adapter | Sends WhatsApp messages; simulated by default | None |
| HR adapter | Creates claims (amount, currency, description, receipt, employee ID); simulated | None |
| Web app | Report, accept, upload receipts, approve, monthly report | None (reads the API) |

Login is a JWT stand-in for the company login. Roles are EMPLOYEE, HR (approves claims) and ADMIN (assigns roles, can also approve).

## 3. How the listed problems are prevented

Each problem maps to one rule in the service, and every rule is enforced on the server, not only in the UI.

| Problem | Prevention |
| --- | --- |
| Box sits empty because everyone assumes someone else will act | Reporting takes one tap. If the open call goes unanswered for 12 hours, a named person is asked, and silence moves it on again. |
| Two people buy on the same day | Only one active refill per office. Accepting is a single conditional database write, so exactly one person can hold a refill. |
| A few people do most refills | The fallback rotation picks whoever was assigned longest ago. People on holiday or inactive are skipped. |
| Volunteers wait weeks for money | The HR claim is filed the moment the receipt is uploaded. The claims table shows what is still waiting on HR. |
| Nobody knows monthly spend | Every purchase is reserved against its office's monthly budget; an over-budget purchase is refused before it reaches HR. One monthly report gives both offices' totals in NOK and INR, plus a combined INR figure. |
| Which snacks get eaten | Partly addressed: each claim carries a description and receipt image. Item-level tracking is out of scope (section 4). |
| Employees visiting the other office | A visitor joins that office's pool until a chosen date. They buy in that office's currency and are reimbursed in their own payroll currency; the FX rate is stored on the claim. |

## 4. Trade-offs, and what I deliberately did not build

The design favours a box that always has an owner over perfect fairness or precision.

**Trade-offs made**

- **Open call first, rotation second.** Volunteers are hybrid, so whoever is in the office today is best placed to buy. The cost: keen volunteers may take most open calls; the rotation only balances the fallback.
- **Budget checked at submission, not before purchase.** A volunteer can overspend in the shop and have the claim refused. Pre-approval would add a step to every refill; typical purchases are 5–20% of the monthly budget.
- **One fixed FX rate (1 NOK = 8 INR).** Finance owns real rates. The rate is configurable and stored on every claim, so each conversion can be audited.
- **A 60-second poller instead of a job queue.** At roughly 5–10 refills a month per office, a durable queue adds operations work with no benefit.
- **Broadcast messages.** Each empty box sends up to 20 WhatsApp messages. That is acceptable at this volume, and cheaper than an empty box.
- **Known gap.** A rejected claim still counts against the budget and in the report; releasing it on rejection is a small fix.

**Deliberately not built**

- Item-level snack tracking (sensors, barcodes, receipt OCR): costly to run for a few boxes.
- A live exchange-rate feed: payroll's rate is the one that matters.
- Purchase pre-approval: HR already approves every claim.
- Our own identity system or mobile app: the company login and the chat tool already exist.

## 5. Core logic and the tests that prove it

The core logic is Node.js in `server/src/services/refillService.js`; 12 automated tests run it against an in-memory MongoDB with a controllable clock, and all 12 pass.

The tests use fake chat and HR stand-ins that record every message and claim. Run them with `cd server && npm test`.

**Demo accounts** (all use the password `password123`):

| Role | Login email | Can do |
| --- | --- | --- |
| ADMIN | admin@example.com | Assign roles on /admin, approve/reject claims |
| HR | hr@example.com | Approve or reject submitted claims |
| Volunteer (Oslo) | olav@example.com (also nora@, erik@, maja@, lars@) | Report, accept, buy, submit receipts |
| Volunteer (Bengaluru) | asha@example.com (also rahul@, priya@, arjun@, meera@, kiran@) | Report, accept, buy, submit receipts |

| Rule | Tests that prove it |
| --- | --- |
| Two people cannot both commit to the same refill | Two simultaneous accepts: exactly one succeeds. A second report for an office with an active refill is refused. A volunteer outside the office's pool cannot accept. |
| A refill nobody completes is handed to someone else | An open call unanswered for 12 hours becomes a directed offer. An expired offer moves to a different volunteer. A declined offer moves on, with a WhatsApp message. A claim with no receipt after 48 hours reopens, and another volunteer can take it. |
| Budgets and totals are correct across both currencies | A purchase over the monthly budget is refused before reaching HR. A visitor buying 100 NOK is reimbursed 800 INR. A payroll switch at claim time turns 100 INR into 12.5 NOK. 1,000 INR plus 100 NOK reports as 1,800 INR combined. |
| Every volunteer hears about an empty box | A new refill starts unassigned and all volunteers in the pool are notified. |


 6 — admin@example.com (assigns roles at /admin, can approve), hr@example.com (approves), and the volunteer accounts, all with password password123. The login screen shows the same hint.