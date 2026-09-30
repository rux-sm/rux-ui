import test from "node:test";
import assert from "node:assert/strict";

import { customerLink, fillContactCustomer } from "../js/core/customer-link.js";

/* Enough of the query builder for the linking: select with eq, ilike (an
   exact pattern, matched without case), is, or and limit; insert and update. */
function fakeClient(tables) {
	let next = 1;
	return {
		tables,
		from(table) {
			const rows = tables[table];
			const filters = [];
			let action = "select";
			let payload = null;
			let one = false;
			const b = {
				select() { return b; },
				insert(p) { action = "insert"; payload = p; return b; },
				update(p) { action = "update"; payload = p; return b; },
				eq(k, v) { filters.push((r) => String(r[k]) === String(v)); return b; },
				is(k, v) { filters.push((r) => (r[k] ?? null) === v); return b; },
				ilike(k, v) { filters.push((r) => String(r[k]).toLowerCase() === v.replace(/\\(.)/g, "$1").toLowerCase()); return b; },
				or() { filters.push((r) => !r.client); return b; },
				limit() { return b; },
				single() { one = true; return b; },
				maybeSingle() { one = true; return b; },
				then(resolve) {
					const hit = rows.filter((r) => filters.every((f) => f(r)));
					if (action === "insert") {
						const row = { id: `c${next++}`, ...payload };
						rows.push(row);
						return resolve({ data: row, error: null });
					}
					if (action === "update") hit.forEach((r) => Object.assign(r, payload));
					return resolve({ data: one ? hit[0] ?? null : hit, error: null });
				},
			};
			return b;
		},
	};
}

test("a new trip takes the customer of its name, whatever the case", async () => {
	const client = fakeClient({ customers: [{ id: "k1", name: "Invented ISD" }] });
	assert.equal(await customerLink(client, "invented isd ", null), "k1");
	assert.equal(client.tables.customers.length, 1);
});

test("a name typed now that no customer has makes one", async () => {
	const client = fakeClient({ customers: [] });
	const id = await customerLink(client, "New Band Boosters", { customer: "Old name", customer_id: null });
	assert.equal(client.tables.customers[0].name, "New Band Boosters");
	assert.equal(id, client.tables.customers[0].id);
});

test("an older trip saved for another reason keeps its link and makes no customer", async () => {
	const client = fakeClient({ customers: [] });
	assert.equal(await customerLink(client, "School - Band", { customer: "School - Band", customer_id: null }), undefined);
	assert.equal(await customerLink(client, "School - Band", { customer: "School - Band", customer_id: "k9" }), undefined);
	assert.equal(client.tables.customers.length, 0);
});

test("a name left as it opened keeps its link, even beside a customer of that name", async () => {
	const client = fakeClient({ customers: [{ id: "k2", name: "School - Band" }] });
	assert.equal(await customerLink(client, "School - Band", { customer: "School - Band", customer_id: "k1" }), undefined);
	assert.equal(await customerLink(client, "School - Band", { customer: "School - Band", customer_id: null }), "k2");
});

test("a cleared Customer field unlinks the trip", async () => {
	const client = fakeClient({ customers: [] });
	assert.equal(await customerLink(client, "", { customer: "Invented ISD", customer_id: "k1" }), null);
});

test("the booking contact takes the customer only when their organization is blank or the same", async () => {
	const client = fakeClient({
		customers: [{ id: "k1", name: "Invented ISD" }],
		contacts: [
			{ id: "p1", customer_id: null, client: null },
			{ id: "p2", customer_id: null, client: "invented isd" },
			{ id: "p3", customer_id: null, client: "Invented Travel Agency" },
			{ id: "p4", customer_id: "k7", client: null },
		],
	});
	assert.equal(await fillContactCustomer(client, "p1", "k1"), true);
	assert.equal(await fillContactCustomer(client, "p2", "k1"), true);
	assert.equal(await fillContactCustomer(client, "p3", "k1"), false);
	assert.equal(await fillContactCustomer(client, "p4", "k1"), false);
	assert.deepEqual(client.tables.contacts.map((c) => c.customer_id), ["k1", "k1", null, "k7"]);
	assert.equal(client.tables.contacts[0].client, "Invented ISD");
});
