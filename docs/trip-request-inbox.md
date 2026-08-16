# Trip Request Inbox

Customers submit trip requests through a public, no-login form; the
submissions land in a **Requests** floating window in the app where dispatch
turns them into trips.

## The two halves

**Public form — `request.html` + `js/pages/trip-request.js`.**
A customer-facing page that collects enough to open a trip request: contact,
trip type, destination, pickup, dates, passengers/buses, requirements, a
day-of contact, and notes. Values are assembled and validated by the pure
`js/core/trip-request-model.js`, which emits a **Trip Draft v2** payload
(`docs/trip-import-schema-v2.json`) so submissions flow into the same review
pipeline as emailed requests. The page honors `?r=REQ-XXXXXX` so an invited
customer's submission attaches to dispatch's invite row.

**Requests window — nav item + `js/panels/request-inbox.js`.**
A floating, draggable/resizable window (same shell as the Trip Finder). Lists
`trip_requests` rows with status chips, filters by status, drives the
badge on the Requests nav button (count of `new`), and creates invites:
"New request" → dispatch fills the customer's name/email → the app creates an
`invited` row and hands back `request.html?r=REQ-XXXXXX` (copy link / compose
email).

## Data model — `trip_requests` table

| Column | Notes |
|---|---|
| `reference` | `REQ-` + 6 random hex; the `?r=` handle. Opaque, not a secret |
| `status` | `invited` → `new` → `reviewed` / `linked` / `closed` |
| `source` | `invite` (dispatch link), `form` (public page), `email` (importer) |
| `client`, `passenger_count`, `contact` | denormalized for the inbox list |
| `payload` | the Trip Draft v2 object; passenger count intentionally lives here, not in the draft, because the schema has no field for it |
| `trip_id` | soft link to the trip an invite was sent for / a request was applied to |

Access follows the share pages: the table is `revoke all`'d from
anon/authenticated and every read/write goes through a **security definer**
function — so the public form can insert a submission without ever reading
other customers' rows, and the inbox is readable only from the app.

### Functions
- `create_trip_request(client, contact, trip_id, passenger_count, note)` → invite row, returns the reference
- `submit_trip_request(reference, client, contact, payload, passenger_count, note)` → attaches to an `invited` row when the reference matches, else inserts a fresh `form` row
- `list_trip_requests()` → inbox rows (destination/dates/type pulled out of the payload)
- `update_trip_request_status(id, status)` / `link_trip_request(id, trip_id)` / `delete_trip_request(id)` → dispatcher triage

## Workflow

1. Dispatch opens **Requests** → **New request** → enters the customer's name +
   email (optional client, phone, passengers, note).
2. The app creates the `invited` row and returns the link, ready to copy or
   email (Mailto with summary + link).
3. Customer opens the link (`?r=…` set), fills the form, submits.
4. The submission updates that row to `new` (contact/payload in place). A
   customer arriving at `request.html` directly creates a fresh `form` row.
5. The Requests badge increments in real time; the row shows the customer,
   destination, dates, passenger count, and status.
6. Dispatch marks it **Reviewed**, applies it to a trip, or **Closes** it.

## Files
- `request.html`, `js/pages/trip-request.js`, `css/features/trip-request.css`
- `js/core/trip-request-model.js` (pure; tested)
- `js/data/trip-request-db.js`
- `js/panels/request-inbox.js`, `css/features/request-inbox.css`
- `tests/trip-request-model.test.mjs`, `tests/request-inbox.test.mjs`

## Notes on scope
- Passenger count is stored on the `trip_requests` row, not in the Trip Draft
  v2 payload, because the draft schema is strict (`additionalProperties:
  false`) and has no passenger field — the sanitizer would reject it.
- The "Create draft trip / Apply to existing trip" editor prefill is the
  defined next step; this slice ships the inbox, invites, submissions, and
  status workflow that those actions will drive.
