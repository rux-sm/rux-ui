/* ==========================================================================
   RUX UI — TRIP REQUEST MODEL
   --------------------------------------------------------------------------
   Pure, side-effect-free logic for the customer trip-request form and the
   request inbox. Produces Trip Draft v2 payloads (docs/trip-import-schema-
   v2.json) so submissions flow into the same review pipeline as emailed
   requests, and validates whatever the public form collects.

   Nothing here touches the DOM or Supabase — see js/pages/trip-request.js
   (form wiring) and js/panels/request-inbox.js (inbox window).
   ========================================================================== */

export const TRIP_TYPES = ["round_trip", "one_way", "dropoff_pickup"]
export const SERVICE_TYPES = ["charter", "ticketed"]

export const REQUEST_STATUSES = ["invited", "new", "reviewed", "linked", "closed"]

/* Named from the dispatcher's side of the exchange, because that is the
   question the inbox answers at a glance: did we send this, or did the
   customer send something back? "Invited"/"New" described the row's
   lifecycle; "Sent"/"Received" describe who is waiting on whom. The status
   values themselves are unchanged — this is only what a human reads. */
export const STATUS_LABELS = {
	invited: "Sent",
	new: "Received",
	reviewed: "Reviewed",
	linked: "Linked",
	closed: "Closed",
}

export const REQUIREMENT_OPTIONS = [
	{ id: "sleeper", label: "Sleeper coach" },
	{ id: "pax56", label: "56-passenger capacity" },
	{ id: "adaLift", label: "ADA/wheelchair lift" },
	{ id: "hotel", label: "Driver hotel needed" },
	{ id: "fuelCard", label: "Driver fuel card" },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function text(value) {
	return typeof value === "string" ? value.trim() : ""
}

function contactFields(contact = {}, { email = false } = {}) {
	const out = {}
	const name = text(contact.name)
	const phone = text(contact.phone)
	const mail = text(contact.email)
	if (name) out.name = name
	if (phone) out.phone = phone
	if (email && mail) out.email = mail
	return out
}

function hasAny(object) {
	return Object.keys(object).length > 0
}

function unique(list) {
	return [...new Set(list)]
}

function isRequirement(code) {
	return REQUIREMENT_OPTIONS.some((option) => option.id === code)
}

/* A customer-facing pickup becomes the editor's scheduling anchor. The form
   never produces operational times (spot vs. departure, drive time, mileage)
   — dispatch computes those, matching the import pipeline's "never invent"
   rule. spot_time is the natural customer answer: when the bus needs to be
   there and ready. */
function pickupStop(pickup = {}) {
	const stop = { type: "pickup" }
	const name = text(pickup.name)
	const address = text(pickup.address)
	const time = text(pickup.time)
	if (name) stop.name = name
	if (address) stop.address = address
	if (time) stop.spot_time = time
	return stop
}

/* ── Normalizers (shared by the page and the window) ─────────────────────── */

export function normalizePassengerCount(value) {
	if (value === "" || value === null || value === undefined) return null
	const n = Math.round(Number(value))
	if (!Number.isFinite(n) || n < 1) return null
	return Math.min(n, 200)
}

export function statusLabel(status) {
	return STATUS_LABELS[status] ?? String(status ?? "")
}

/* The advertised seat count, which is deliberately not the largest coach in
   the fleet. Some buses seat 56 — see the pax56 requirement above — but those
   are assigned by dispatch rather than offered to customers, so a public
   estimate must never plan around one. Quoting 52 rounds the bus count up
   where the two differ, which is the safe direction for an estimate: the
   customer is never told a trip needs fewer buses than it does.

   Do not "reconcile" this with pax56. They are different numbers on purpose.

   Everything downstream stays an estimate — the form shows the result as a
   hint and the draft carries it as bus_count, and dispatch sets the real
   number when it assigns actual buses, exactly like every other value this
   form contributes. */
export const SEATS_PER_BUS = 52

/* Capped at the schema's own bus_count maximum (20) so a draft can never be
   built that the import sanitizer would reject. */
export function recommendedBusCount(passengerCount) {
	const passengers = normalizePassengerCount(passengerCount)
	if (!passengers) return 1
	return Math.min(Math.ceil(passengers / SEATS_PER_BUS), 20)
}

/* ── Attachments ─────────────────────────────────────────────────────────── */

/* Customers usually already have their itinerary written down — a Word doc, a
   PDF, a spreadsheet of passengers. These limits mirror the bucket's own
   file_size_limit and allowed_mime_types in supabase/trip_request_documents.sql
   so the browser refuses a file for the same reasons storage would, with a
   sentence the customer can act on instead of a failed request. Changing one
   side means changing the other. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024
export const MAX_DOCUMENTS = 5

export const DOCUMENT_EXTENSIONS = [
	".pdf",
	".doc",
	".docx",
	".xls",
	".xlsx",
	".csv",
	".txt",
	".png",
	".jpg",
	".jpeg",
	".heic",
]

function extensionOf(fileName) {
	const name = text(fileName).toLowerCase()
	const dot = name.lastIndexOf(".")
	return dot === -1 ? "" : name.slice(dot)
}

/* Takes { name, size } rather than a File so it stays pure and testable.
   Returns a customer-facing message, or "" when the file is fine. */
export function documentError(file = {}) {
	const name = text(file.name)
	if (!name) return "That file could not be read"
	if (!DOCUMENT_EXTENSIONS.includes(extensionOf(name))) {
		return "Attach a PDF, Word, Excel, text, or image file"
	}
	if (Number(file.size) > MAX_DOCUMENT_BYTES) {
		return `Files need to be under ${MAX_DOCUMENT_BYTES / 1024 / 1024} MB`
	}
	return ""
}

export function formatFileSize(bytes) {
	const size = Number(bytes)
	if (!Number.isFinite(size) || size <= 0) return ""
	if (size < 1024) return `${size} B`
	if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
	return `${(size / 1024 / 1024).toFixed(1)} MB`
}

/* ── Draft builder ───────────────────────────────────────────────────────── */

/* values shape (collected by trip-request.js):
   {
     type, client, destination,
     bookingContact: { name, phone, email },
     pickup: { date, time, address },
     returnDate,                              // round trips
     split: { date, time, name, address },    // split trips
     passengerCount,
     requirements: [],
     tripContact: { name, phone }, contactNotNeeded, notes,
   }

   The output matches trip-import-schema-v2.json exactly — extra request
   data that has no draft field (passenger count) lives on the trip_requests
   row itself, not in the payload, so the sanitizer never sees a property
   it doesn't understand. */
export function buildDraft(values) {
	const type = TRIP_TYPES.includes(values.type) ? values.type : "round_trip"
	const pickupDate = text(values.pickup?.date)

	const trip = {
		type,
		service_type: "charter",
		destination: text(values.destination),
	}

	const client = text(values.client)
	if (client) trip.client = client

	const booking = contactFields(values.bookingContact, { email: true })
	if (hasAny(booking)) trip.booking_contact = booking

	const requirements = unique(values.requirements ?? []).filter(isRequirement)
	if (requirements.length) trip.requirements = requirements

	if (values.contactNotNeeded) {
		trip.contact_not_needed = true
	} else {
		const dayOf = contactFields(values.tripContact)
		if (hasAny(dayOf)) trip.trip_contacts = [dayOf]
	}

	const notes = text(values.notes)
	if (notes) trip.notes = notes

	const busCount = recommendedBusCount(values.passengerCount)

	const legs = {
		outbound: {
			start_date: pickupDate,
			end_date:
				type === "round_trip" && text(values.returnDate)
					? text(values.returnDate)
					: pickupDate,
			bus_count: busCount,
			stops: [pickupStop(values.pickup)],
		},
	}

	// A split trip is two independently scheduled legs; each leg carries its
	// own pickup. The second leg's dates are the second pickup, not the
	// destination return — dispatch completes the itinerary either way.
	if (type === "dropoff_pickup") {
		const splitDate = text(values.split?.date) || pickupDate
		legs.return = {
			start_date: splitDate,
			end_date: splitDate,
			bus_count: busCount,
			stops: [pickupStop(values.split)],
		}
	}

	trip.legs = legs

	return { schema_version: 2, trip }
}

/* ── Validation ──────────────────────────────────────────────────────────── */

/* Returns a { fieldKey: message } map. Keys match the data-validate
   attributes in request.html so the page can place each message under its
   control without remapping. An empty object means the draft is ready. */
export function validateDraft(values) {
	const errors = {}
	const type = TRIP_TYPES.includes(values.type) ? values.type : "round_trip"

	const bookingName = text(values.bookingContact?.name)
	const bookingEmail = text(values.bookingContact?.email)
	if (!bookingName) errors["booking.name"] = "Enter a name we can reach you at"
	if (!bookingEmail) errors["booking.email"] = "Enter an email for your quote"
	else if (!EMAIL_RE.test(bookingEmail)) errors["booking.email"] = "Enter a valid email"

	if (!text(values.destination)) errors.destination = "Enter the destination"

	const pickupDate = text(values.pickup?.date)
	if (!DATE_RE.test(pickupDate)) errors["pickup.date"] = "Choose a pickup date"
	if (!text(values.pickup?.address)) {
		errors["pickup.address"] = "Enter the pickup address or venue"
	}

	if (type === "round_trip" && text(values.returnDate)) {
		if (!DATE_RE.test(text(values.returnDate))) {
			errors.returnDate = "Choose a return date"
		} else if (values.returnDate < pickupDate) {
			errors.returnDate = "Return date can't be before pickup date"
		}
	}

	if (type === "dropoff_pickup" && !DATE_RE.test(text(values.split?.date))) {
		errors["split.date"] = "Enter the return pickup date"
	}

	return errors
}