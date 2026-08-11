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

export const STATUS_LABELS = {
	invited: "Invited",
	new: "New",
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

function ticketOptionsOf(options) {
	if (!Array.isArray(options)) return []
	return options
		.map((option) => {
			const label = text(option.label)
			const price = Number(option.price)
			if (!label || !Number.isFinite(price) || price < 0) return null
			return { label, price }
		})
		.filter(Boolean)
}

/* ── Normalizers (shared by the page and the window) ─────────────────────── */

export function normalizeBusCount(value) {
	const n = Math.round(Number(value))
	if (!Number.isFinite(n) || n < 1) return 1
	return Math.min(n, 20)
}

export function normalizePassengerCount(value) {
	if (value === "" || value === null || value === undefined) return null
	const n = Math.round(Number(value))
	if (!Number.isFinite(n) || n < 1) return null
	return Math.min(n, 200)
}

export function statusLabel(status) {
	return STATUS_LABELS[status] ?? String(status ?? "")
}

/* ── Draft builder ───────────────────────────────────────────────────────── */

/* values shape (collected by trip-request.js):
   {
     type, serviceType, client, destination,
     bookingContact: { name, phone, email },
     pickup: { date, time, name, address },
     returnDate,                              // round trips
     split: { date, time, name, address },    // split trips
     passengerCount, busCount,
     requirements: [], ticketOptions: [{ label, price }],
     tripContact: { name, phone }, contactNotNeeded, notes,
   }

   The output matches trip-import-schema-v2.json exactly — extra request
   data that has no draft field (passenger count) lives on the trip_requests
   row itself, not in the payload, so the sanitizer never sees a property
   it doesn't understand. */
export function buildDraft(values) {
	const type = TRIP_TYPES.includes(values.type) ? values.type : "round_trip"
	const serviceType = SERVICE_TYPES.includes(values.serviceType) ? values.serviceType : "charter"
	const pickupDate = text(values.pickup?.date)

	const trip = {
		type,
		service_type: serviceType,
		destination: text(values.destination),
	}

	const client = text(values.client)
	if (client) trip.client = client

	const booking = contactFields(values.bookingContact, { email: true })
	if (hasAny(booking)) trip.booking_contact = booking

	if (serviceType === "ticketed") {
		const options = ticketOptionsOf(values.ticketOptions)
		if (options.length) trip.ticket_options = options
	}

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

	const busCount = normalizeBusCount(values.busCount)

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
	if (!text(values.pickup?.name) && !text(values.pickup?.address)) {
		errors["pickup.name"] = "Enter the pickup location"
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

	if (values.serviceType === "ticketed" && Array.isArray(values.ticketOptions)) {
		values.ticketOptions.forEach((option, index) => {
			if (!text(option.label)) errors[`ticketOptions.${index}.label`] = "Enter a ticket name"
			const price = Number(option.price)
			if (Number.isFinite(price) && price >= 0) return
			if (!errors[`ticketOptions.${index}.price`]) {
				errors[`ticketOptions.${index}.price`] = "Enter a price"
			}
		})
	}

	return errors
}