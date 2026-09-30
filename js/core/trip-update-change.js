/* The trip's updates, as the scheduler keeps them in `trip_updates`: what was
   said to or heard from the customer, one line each, stamped with who wrote it
   and when. Every save asks for one first, as the scheduler's Save does, so a
   change is told or skipped on purpose whichever app it was made in.

   `customerChange` names what a save changed that the customer would ask
   about -- the dates, the times or route, the destination, the customer or
   booking contact, the quote, the contract, a PO, an invoice or a payment --
   a phrase each, in the scheduler's words, so both apps write the same lines.
   The buses, the drivers and the bar's colour ask nothing, because they are
   the office's own arrangements. Its first phrase is the line the prompt comes
   filled with. */

export const UPDATE_REASONS = ["Follow-up email sent", "Called the customer", "Quote sent", "Waiting on a PO", "Customer confirmed"];

export const usd = (n) => `$${Math.round(n).toLocaleString("en-US")}`;

const localDay = (iso) => {
	const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
	return new Date(y, m - 1, d);
};
const day = (iso) => localDay(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/* `patch` is the trip columns the save writes and `before` the trip as it
   opened. `route` is true when the itinerary's stops changed. `pos`,
   `invoices` and `payments` are each list's planned writes, `{ inserts,
   updates, deletes }`, with each insert the new row's values. */
export function customerChange({ patch = {}, before = {}, route = false, pos = null, invoices = null, payments = null } = {}) {
	const said = [];
	const keys = [];
	const has = (...k) => k.some((x) => x in patch);
	const now = (k) => (k in patch ? patch[k] : before[k]);
	const say = (key, text) => { keys.push(key); said.push(text); };
	const work = (plan) => !!plan && (plan.inserts.length + plan.updates.length + plan.deletes.length) > 0;
	if (has("start_date", "end_date", "return_start_date", "return_end_date")) {
		const from = now("start_date");
		const to = now("end_date") || from;
		say("dates", from ? `Moved the dates to ${day(from)}${to && to !== from ? `–${day(to)}` : ""}` : "Changed the dates");
	}
	if (has("destination")) say("destination", patch.destination ? `Changed the destination to ${patch.destination}` : "Changed the destination");
	if (has("trip_type") || route) say("route", "Changed the times or route");
	if (has("customer")) say("customer", patch.customer ? `Changed the customer to ${patch.customer}` : "Changed the customer");
	if (has("booking_contact_id", "booking_contact_name", "booking_contact_phone", "booking_contact_email")) {
		say("contact", "booking_contact_name" in patch && patch.booking_contact_name
			? `Changed the booking contact to ${patch.booking_contact_name}` : "Changed the booking contact");
	}
	if (has("quoted_price")) say("quote", patch.quoted_price != null && patch.quoted_price !== "" ? `Quoted ${usd(Number(patch.quoted_price))}` : "Changed the quote");
	if (has("contract_status", "contract_note")) say("contract", patch.contract_status === "Signed" ? "Contract signed" : "Changed the contract");
	if (work(pos) || has("po_received", "po_ref", "po_amount")) {
		const added = pos?.inserts.find((r) => r.ref);
		say("po", added ? `Added PO ${added.ref}` : "Changed the PO");
	}
	if (work(invoices) || has("invoice_status", "invoiced", "invoice_number")) {
		const added = invoices?.inserts.find((r) => r.number);
		say("invoice", added ? `Added invoice ${added.number}` : "Changed the invoice");
	}
	if (work(payments)) {
		const added = payments.inserts.find((r) => Number(r.amount) > 0);
		say("payment", added ? `Recorded a payment of ${usd(Number(added.amount))}` : "Changed a payment");
	}
	return said.length ? { said, keys, line: said[0] } : null;
}

// The sentence over the prompt's box, naming what the save changed.
export function changeSentence(change, creating) {
	if (creating) return "You created the trip. Say what the customer has been sent.";
	if (!change) return "Say what changed, or save with no update.";
	const phrases = change.said.map((p) => p.charAt(0).toLowerCase() + p.slice(1));
	return `You ${phrases.length > 1 ? `${phrases.slice(0, -1).join(", ")} and ${phrases.at(-1)}` : phrases[0]}.`;
}

/* An update's stamp: when, who, and whether its words were changed. An
   `imported` row was copied out of the old notes, so it has a date and no
   time. */
export function updateStamp(u, today = new Date()) {
	const at = new Date(u.created_at);
	const opts = { month: "short", day: "numeric" };
	if (at.getFullYear() !== today.getFullYear()) opts.year = "numeric";
	const when = u.kind === "imported" ? at.toLocaleDateString(undefined, opts)
		: at.toLocaleString(undefined, { ...opts, hour: "numeric", minute: "2-digit" });
	return [when, u.actor_name || (u.kind === "imported" ? "From the old notes" : "Someone"),
		u.edited_at ? "edited" : null].filter(Boolean).join(" · ");
}

// A `nothing` row marks a skipped prompt and is never drawn.
export const shownUpdates = (rows) => (rows || []).filter((u) => u.kind !== "nothing");
