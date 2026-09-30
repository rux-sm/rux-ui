/* A trip's customer, linked as the scheduler links it: `customer_id` names
   the row in `customers` the Customer field names, and the booking contact
   takes that customer when they have none. The scheduler reads the customer
   for the trip's usual pickup and the quote's bill-to address, so a trip
   saved here with no link would lose them there.

   `client` is the Supabase client, handed in so this can be tested. */

const folded = (v) => String(v ?? "").trim().toLowerCase();
// A name as an ilike pattern that matches only itself.
const likeExact = (v) => String(v).trim().replace(/[\\%_]/g, (m) => `\\${m}`);

async function customerNamed(client, name) {
	const { data, error } = await client.from("customers").select("id,name").ilike("name", likeExact(name)).limit(1);
	if (error) throw error;
	return data?.[0] ?? null;
}

/* The customer of that name, else a new one made now. A second insert of the
   same name, made elsewhere since the lookup, is read back instead. */
async function addCustomer(client, name) {
	const { data, error } = await client.from("customers").insert({ name: name.trim() }).select("id,name").single();
	if (!error) return data;
	if (error.code === "23505") {
		const hit = await customerNamed(client, name);
		if (hit) return hit;
	}
	throw error;
}

/* The `customer_id` a save writes, or undefined when it keeps what it had.
   `name` is the Customer field, `opened` the trip as the form opened it, or
   null for a new trip. A customer is made only from a name typed in this
   edit, so an older trip saved for another reason never makes a second
   customer beside the cleaned one; an unlinked one still takes the customer
   of its exact name. */
export async function customerLink(client, name, opened) {
	const creating = !opened;
	const before = opened?.customer_id ?? null;
	const trimmed = String(name ?? "").trim();
	let id = null;
	if (trimmed) {
		const typedNow = creating || folded(trimmed) !== folded(opened?.customer);
		// A name left as it opened keeps the customer it was linked to.
		id = (!typedNow && before)
			|| (await customerNamed(client, trimmed))?.id
			|| (typedNow ? (await addCustomer(client, trimmed)).id : before);
	}
	return creating || id !== before ? id : undefined;
}

/* The booking contact takes the trip's customer when they have none, but
   only when the organization they carry is blank or already that customer's:
   an agency booking for a school keeps its own. Guarded, so a customer set
   elsewhere since is never replaced. True when the contact was linked. */
export async function fillContactCustomer(client, contactId, customerId) {
	if (!contactId || !customerId) return false;
	const { data: contact, error } = await client.from("contacts").select("id,customer_id,client").eq("id", contactId).maybeSingle();
	if (error) throw error;
	if (!contact || contact.customer_id) return false;
	const { data: customer, error: customerError } = await client.from("customers").select("name").eq("id", customerId).maybeSingle();
	if (customerError) throw customerError;
	const name = customer?.name ?? null;
	const theirs = String(contact.client ?? "").trim();
	if (theirs && folded(theirs) !== folded(name)) return false;
	let query = client.from("contacts").update({ customer_id: customerId, client: name }).eq("id", contactId).is("customer_id", null);
	query = theirs ? query.eq("client", contact.client) : query.or("client.is.null,client.eq.");
	const { error: linkError } = await query;
	if (linkError) throw linkError;
	return true;
}
