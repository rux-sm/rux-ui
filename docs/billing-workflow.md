# Billing Workflow & Status System

## Overview

The billing system manages trip financial status through a configurable workflow. It derives a trip's billing status from contract, PO, and payment data, then determines whether the trip is "confirmed" based on configurable rules.

The system spans these files:

| File                   | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `js/billing-config.js` | Core status derivation, configuration, badge rendering |
| `js/trip-panel.js`     | Trip editor billing tab UI and real-time sync          |
| `js/trip-db.js`        | Persists billing data to Supabase                      |
| `js/settings-panel.js` | Settings UI for configuring the workflow               |
| `js/trip-bar.js`       | Trip bar uses billing status for confirmation display  |

---

## Statuses

There are **6 billing statuses**, derived from the trip's financial state:

| Status Key         | Label            | Icon             | Badge Color      | When                          |
| ------------------ | ---------------- | ---------------- | ---------------- | ----------------------------- |
| `pending`          | Pending          | `clock`          | Red (danger)     | No contract, no payment       |
| `contract_signed`  | Contract Signed  | `file-check`     | Orange (warning) | Contract signed               |
| `po_received`      | PO Received      | `file-text`      | Blue (info)      | PO received                   |
| `deposit_received` | Deposit Received | `banknote`       | Blue (info)      | Partial payment received      |
| `paid_full`        | Paid in Full     | `circle-check`   | Green (success)  | Fully paid                    |
| `overpaid`         | Overpaid         | `alert-triangle` | Orange (warning) | Paid more than contract value |

### Status Derivation Priority

Statuses are derived in this order (first match wins):

```
1. overpaid          — price > 0 AND balance < 0
2. paid_full         — price > 0, paid > 0, balance ≤ 0
3. deposit_received  — paid > 0, balance > 0
4. po_received       — PO received toggle is on
5. contract_signed   — contract signed toggle is on
6. pending           — fallback (nothing set)
```

**Key:** Each workflow step (`contractSigned`, `poReceived`) is only considered if its `active` flag is `true` in the settings config. Deactivating a step in Settings makes it invisible in the trip editor and excluded from status derivation.

---

## Workflow Steps

The trip editor billing tab has **3 workflow steps** (toggleable):

1. **Contract Signed** (`contractSigned`) — Toggle + contract amount input
2. **PO Received** (`poReceived`) — Toggle + PO number input
3. **Invoiced** (`invoiced`) — Toggle + invoice number input

These are **workflow toggles**, not statuses. The "Invoiced" step, for example, does NOT produce its own status — it's just a tracking toggle. The status is always derived from the financial state (payments vs. contract value).

Each step has:

- A **label** (customizable in Settings)
- An **active/inactive toggle** (hides the step from the trip editor when off)

---

## Confirmation Logic

A trip is "confirmed" when its derived status is in the `confirmWhen` list.

### Default `confirmWhen` list:

- `contract_signed`
- `po_received`
- `deposit_received`
- `paid_full`

This means a trip becomes confirmed as soon as the contract is signed (or any later status is reached). The `pending` status is never in `confirmWhen` — a trip with no progress is always unconfirmed.

### Settings UI

In **Settings → Billing Workflow → Confirmed when**, you can check/uncheck which statuses mark a trip confirmed. Each status appears as a colored badge with its icon.

---

## Confirmation Badge Behavior

The confirmation badge in the billing tab shows:

- **Confirmed** → Blue badge with text "Confirmed"
- **Unconfirmed** → Red badge showing the **next pending step's icon** + "Unconfirmed"

### Next Step Icons

The badge dynamically shows the icon of what needs to happen next:

| Current Status     | Next Step Icon          | Meaning             |
| ------------------ | ----------------------- | ------------------- |
| `pending`          | `file-check` (contract) | "Sign the contract" |
| `contract_signed`  | `file-text` (PO)        | "Get the PO"        |
| `po_received`      | `banknote` (deposit)    | "Collect deposit"   |
| `deposit_received` | `circle-check` (paid)   | "Pay in full"       |
| `paid_full`        | _(none — confirmed)_    | All done            |
| `overpaid`         | _(none — confirmed)_    | All done            |

This is implemented via `nextPendingStep()` and `renderConfirmBadge()` in `billing-config.js`.

---

## Financial Summary

The billing tab shows a **Financial Summary** card with:

- **Contract value** — The quoted/contract price
- **Total paid** — Sum of all payment rows
- **Balance due** — Price minus total paid (negative = overpaid)
- **Paid date** — Date of the last payment (shown only when fully paid)
- **Status badge** — Current billing status with icon
- **Confirmation badge** — Confirmed/unconfirmed with next-step icon

### Payment Rows

Payments are tracked as dynamic rows, each with:

- Amount ($)
- Date
- Method (Cash, Check, Card, ACH, Zelle, Other)
- Reference/note

The "Pay balance" button auto-fills the remaining balance into a new payment row with today's date.

---

## Data Flow

```
Settings Panel → save() → Supabase (settings table, key: billing-workflow-v1)
                              ↓
                    settings:billing event
                              ↓
              Trip Panel: applyToTripPanel() + sync()
                              ↓
              Status badge + confirmation badge updated
                              ↓
              On Save: collectTrip() → Supabase (trips table)
                              ↓
              On Load: populateTrip() → sync() → deriveStatus()
```

### Trip Editor → Database

When saving a trip (`trip-db.js` → `collectTrip()`):

| Form Field      | DB Column         | Notes                             |
| --------------- | ----------------- | --------------------------------- |
| Contract toggle | `contract_status` | "Signed" or "Pending"             |
| Contract amount | `quoted_price`    | Only saved if contract is signed  |
| PO toggle       | `po_received`     | Boolean                           |
| PO number       | `po_ref`          | Only saved if PO received         |
| Invoice toggle  | `invoiced`        | Boolean                           |
| Invoice number  | `invoice_number`  | Only saved if invoiced            |
| Payment rows    | `deposit_amount`  | Sum of all payments               |
| Date paid       | `date_paid`       | Latest payment date               |
| Balance paid    | `balance_paid`    | Computed from payments            |
| Confirmed       | `confirmed`       | Computed via `isStateConfirmed()` |

### Database → Trip Editor

When loading a trip (`trip-db.js` → `populateTrip()`):

- `contract_status === "Signed"` → contract toggle ON
- `po_received` or `po_ref` → PO toggle ON
- `invoiced` or `invoice_number` → invoice toggle ON
- `balance_paid` or `date_paid` → balance paid checkbox ON
- `deposit_amount` → hydrates legacy payment fields
- `payment_ref_1/2/3` → hydrates legacy payment references

---

## API Reference

### `window.RuxBilling`

The billing module is exposed globally as `window.RuxBilling`:

| Method                                         | Description                                   |
| ---------------------------------------------- | --------------------------------------------- |
| `deriveStatus(state)`                          | Derive status from normalized state object    |
| `deriveRecordStatus(trip)`                     | Derive status from raw DB trip record         |
| `normalizeRecord(trip)`                        | Map DB columns to normalized state shape      |
| `statusMeta(status)`                           | Get label, badgeClass, icon for a status      |
| `renderStatusBadge(el, statusKey)`             | Render status badge with icon into element    |
| `renderConfirmBadge(el, statusKey, confirmed)` | Render confirmation badge with next-step icon |
| `nextPendingStep(status)`                      | Get the next status key that needs to happen  |
| `isStatusConfirmed(status)`                    | Check if a status is in the confirmWhen list  |
| `isStateConfirmed(state)`                      | Derive status then check confirmation         |
| `isRecordConfirmed(trip)`                      | Check confirmation for a DB record            |
| `applyToTripPanel(root)`                       | Update workflow step labels/visibility in DOM |
| `load()`                                       | Load config from Supabase                     |
| `save(next)`                                   | Save config to Supabase and broadcast event   |
| `getConfig()`                                  | Get current config (cloned)                   |
| `normalizeConfig(value)`                       | Validate/merge config with defaults           |
| `STATUS_META`                                  | Static metadata for all statuses              |
| `STEP_ORDER`                                   | Ordered array of progression steps            |
| `KEY`                                          | Supabase settings key (`billing-workflow-v1`) |
| `DEFAULT_CONFIG`                               | Default configuration object                  |

### Config Object Shape

```js
{
  workflow: {
    contractSigned: { label: "Contract signed", active: true },
    poReceived: { label: "PO received", active: true },
    invoiced: { label: "Invoiced", active: true },
  },
  confirmWhen: ["contract_signed", "po_received", "deposit_received", "paid_full"],
}
```

### Normalized State Object

```js
{
  contractSigned: Boolean,  // Is contract signed?
  poReceived: Boolean,      // Is PO received?
  price: Number,            // Contract/quoted price
  paid: Number,             // Total amount paid
  balance: Number,          // Price - paid (computed if not provided)
}
```

---

## Settings Persistence

The billing workflow config is stored in Supabase's `settings` table under the key `billing-workflow-v1`. On load, it's normalized against defaults to handle missing fields or invalid values.

The `settings:billing` custom event is dispatched whenever the config changes, allowing the trip panel and scheduler to react to settings updates in real time.

---

## Legacy Compatibility

The system maintains backward compatibility with older trip records that may have:

- `confirmed: true` without `contract_status` (treated as contract signed)
- `deposit_amount` instead of payment rows
- `payment_ref_1/2/3` instead of structured payment data
- `invoice_status: "Invoiced"` instead of `invoiced: true`

The `normalizeRecord()` function handles all these fallbacks when deriving status from DB records.
