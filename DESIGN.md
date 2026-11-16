# Snack Counter Automation — Design Document

## 1. How a refill moves from "empty" to "reimbursed"

```
EMPTY BOX ──> OPEN ──> OFFERED ──> CLAIMED ──> SUBMITTED ──> REIMBURSED
                 ▲         │                                 (or REJECTED)
                 │ decline/expiry
                 └─────────┘   re-offered to the NEXT volunteer
```

1. **Report** — anyone notices the box is empty and taps "Report empty box" in the dashboard. A refill task is created in state `OPEN`.
2. **Offer** — the system picks **one** volunteer (see §3) and sends them a **WhatsApp message** with an accept-by deadline (default 12 h). State: `OFFERED`.
3. **Accept / decline / timeout** — the volunteer accepts (`CLAIMED`) or declines. A declined or expired offer returns to `OPEN` and is immediately re-offered to the next volunteer, excluding whoever already passed. A background poller sweeps expired offers every minute.
4. **Purchase & submit** — the volunteer buys snacks, enters the amount and uploads the receipt. The system checks the office's monthly budget, converts the amount to the volunteer's **payroll currency**, and calls the external HR API with the amount, currency, description, receipt image and employee ID. State: `SUBMITTED`.
5. **Reimburse** — HR approves within 1–10 days. The HR status update flips the task to `REIMBURSED` (or `REJECTED`) and the volunteer gets a WhatsApp confirmation. In the demo, a dashboard button simulates the HR webhook.

## 2. Main parts and the data each keeps

| Part | Responsibility | Data it keeps |
|---|---|---|
| **Refill service** (Node/Express, `services/refillService.js`) | The state machine above; all business rules | — (stateless; all state in MongoDB) |
| **models/Office** | Office master data | name, currency, monthly budget |
| **models/Employee** | Volunteer pool | home office, temporary office + until-date (for visitors), payroll currency, on-holiday flag, `lastAssignedAt` for fair rotation |
| **models/Refill** | One task per empty box | status, assignee, offer deadline, amount in office currency, reimbursement amount + FX rate, receipt URL, HR claim ID, full audit history |
| **models/MonthlyBudget** | Spend control | per office × month: limit and amount reserved |
| **models/Notification** | Audit of outbound messages | recipient, message body, delivered flag |
| **WhatsApp adapter** (`adapters/notifications.js`) | Notifications | stateless. Simulated by default; one env var (`WHATSAPP_PROVIDER=twilio`) switches to the real Twilio WhatsApp Business API |
| **HR adapter** (`adapters/hr.js`) | Reimbursement claims | stateless. Simulated; swap in the HR vendor's authenticated client |
| **React + Tailwind dashboard** (pages: Dashboard, Refills, WhatsApp, Reports) | Reporting a box, accepting offers, receipts, monthly report, live WhatsApp feed | none — reads the API |

## 3. How the listed problems are prevented

- **"The box sits empty for days"** — reporting is one tap, and the system *pushes* the task to one specific person with a deadline instead of broadcasting to everyone. Nobody can assume someone else will do it, and silence automatically escalates to the next volunteer.
- **"Two people buy on the same day"** — only one offer exists per refill, and accepting is an **atomic conditional database update** (`status = OFFERED AND assignedTo = me AND not expired`). A second accept, even concurrent, fails. A test proves this with two simultaneous accepts.
- **"A few people do most refills and wait weeks"** — volunteers are chosen by **least-recently-assigned rotation** (`lastAssignedAt`), and holidays/inactivity are respected. The HR claim is filed the moment the receipt is uploaded — nobody sits on paper receipts — and the dashboard shows which claims HR is still holding.
- **"Nobody knows the spend"** — every purchase is reserved against a per-office monthly budget atomically (and released if the HR call fails), and one management report totals both offices: native currencies per office plus one INR-equivalent figure.
- **Visitors** — an employee visiting the other office can join its volunteer pool until a set date. They buy in the office's currency but are reimbursed in their payroll currency; the FX rate used is stored on the claim for audit.

## 4. Trade-offs, and what I deliberately did not build

- **One volunteer at a time vs. broadcast**: serial offers are slower in the worst case than "first to click wins", but they eliminate duplicate purchases by construction and spread the work fairly. The 12 h TTL bounds the delay.
- **Budget reserved at submission, not at purchase**: a volunteer could still overspend in the shop and have the claim rejected; this is simpler than pre-approval, and typical purchases (≤ 20 % of a monthly budget) make it safe. The error message shows the remaining budget.
- **Fixed, configurable FX rate** (1 NOK = 8 INR): the authoritative rate belongs to finance/payroll; the rate used is stored on every claim. I would not build a live FX feed.
- **Simulated adapters behind tiny interfaces** (`send`, `createClaim`): the business logic never knows whether WhatsApp/HR are real. Tests inject fakes through the same seams.
- **Deliberately not built**: per-snack inventory tracking (sensors/barcodes are over-engineering — "which snacks get eaten" is answerable from receipt descriptions); SSO/user accounts (the company login exists; the demo uses an employee selector); purchase pre-approval (HR already approves claims); a durable job queue (a 60 s poller is enough at ~30 refills/month); a mobile app (WhatsApp *is* the mobile interface).
