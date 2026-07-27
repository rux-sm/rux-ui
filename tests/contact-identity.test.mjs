import test from "node:test";
import assert from "node:assert/strict";
import { contactsShareIdentity } from "../js/core/contact-identity.js";

test("contact identity matches names without case or spacing sensitivity", () => {
	assert.equal(
		contactsShareIdentity(
			{ name: "  Maryiel   Garcia " },
			{ name: "maryiel garcia" },
		),
		true,
	);
});

test("contact identity matches normalized US phone numbers", () => {
	assert.equal(
		contactsShareIdentity(
			{ phone: "+1 (956) 657-5161" },
			{ phone: "956-657-5161" },
		),
		true,
	);
});

test("contact identity matches email without case sensitivity", () => {
	assert.equal(
		contactsShareIdentity(
			{ email: "Maryiel.Garcia@McAllenISD.net" },
			{ email: "maryiel.garcia@mcallenisd.net" },
		),
		true,
	);
});

test("a stale linked contact is not treated as the visible trip contact", () => {
	assert.equal(
		contactsShareIdentity(
			{
				name: "Arturo Castillo",
				email: "acastillo@cdob.org",
			},
			{
				name: "Maryiel Garcia",
				phone: "956-657-5161",
				email: "Maryiel.Garcia@mcallenisd.net",
			},
		),
		false,
	);
});

test("empty contact fields never establish identity", () => {
	assert.equal(contactsShareIdentity({}, {}), false);
});
