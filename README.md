# Snack Counter Automation

Automates the snack-box refill process for the Oslo and Bengaluru offices: reporting an empty
box, fairly choosing a volunteer, WhatsApp notifications, budget checks, HR reimbursement
claims, and a monthly management report.

See **[DESIGN.md](DESIGN.md)** for the design document (lifecycle, components, trade-offs).

## Stack

- **Server** — Node.js, Express, MongoDB (Mongoose). Simulated WhatsApp + HR adapters.
- **Client** — React (Vite) with **Tailwind CSS v4**, split into pages and components.
- **Tests** — `node:test` with `mongodb-memory-server` (no local MongoDB needed for tests).

## Project structure

```
server/
  src/
    index.js                 # app wiring + expired-offer poller
    config.js                # env config (budgets TTL, FX rate, ports)
    routes.js                # REST endpoints (+ receipt upload)
    reports.js               # monthly cross-office spending report
    models/                  # one file per Mongoose model
      Office.js  Employee.js  Refill.js  MonthlyBudget.js  Notification.js  index.js
    services/refillService.js# the refill state machine (all business rules)
    adapters/
      notifications.js       # WhatsApp (simulated; Twilio-ready via .env)
      hr.js                  # HR system (simulated)
  test/refill.test.js        # 6 tests proving the important rules
client/
  src/
    App.jsx                  # state + view routing
    api/client.js            # API wrapper
    utils/format.js          # money/date formatting
    pages/                   # Dashboard, Refills, WhatsApp feed, Reports
    components/              # Navbar, Toolbar, OfferBanner, PurchaseForm,
                             # StatsGrid, RefillTable, StatusPill, WhatsAppPanel,
                             # MonthlyReport, Notice
```

## Authentication & roles

Signup/login with JWT (`bcryptjs` + `jsonwebtoken`). Every refill action acts as the
logged-in user — the employee ID comes from the verified token, never from the request body.
Approving or rejecting claims requires the **HR role**, enforced server-side (a volunteer
calling the endpoint gets 403) and hidden in the UI for non-HR users.

Demo accounts (after `npm run seed`, password `password123` for all):

| Account | Role |
|---|---|
| `hr@example.com` | HR — the only account that can approve/reject claims |
| `olav@`, `nora@`, `erik@`, `maja@`, `lars@example.com` | Oslo volunteers (NOK payroll) |
| `asha@`, `rahul@`, `priya@`, `arjun@`, `meera@`, `kiran@example.com` | Bengaluru volunteers (INR payroll) |

At signup you choose your **home office and payroll currency**. Visiting the other office
for a week or two? The dashboard's "Visiting the other office?" card joins you to that
office's rotation until a date you pick — you buy in their currency and are reimbursed in
your own payroll currency.

## Run it

```bash
# 1. Server (needs MONGODB_URI in server/.env)
cd server
npm install
npm run seed      # creates both offices + demo volunteers
npm run dev       # API on http://localhost:4000

# 2. Client
cd client
npm install
npm run dev       # UI on http://localhost:5173
```

## Tests

```bash
cd server
npm test
```

Covers: only one volunteer can accept the same refill (concurrent accepts); an expired offer
is handed to another volunteer; a declined offer is reassigned with a WhatsApp notification;
purchases over the monthly budget are rejected before reaching HR; a visiting employee
volunteers at the other office and is reimbursed in their payroll currency; report totals are
correct across both currencies.


```
