import assert from "node:assert/strict";
import test from "node:test";

import { STAFF_EMAIL_DOMAIN, usernameToEmail } from "../js/core/staff-username.js";

test("a username becomes that name on the staff domain", () => {
	assert.equal(usernameToEmail("ashley"), `ashley@${STAFF_EMAIL_DOMAIN}`);
});

test("case and surrounding spaces do not matter", () => {
	assert.equal(usernameToEmail("  Hector "), `hector@${STAFF_EMAIL_DOMAIN}`);
});

test("a full email address is used as typed, lowercased", () => {
	assert.equal(usernameToEmail("Rux.Dev@pm.me"), "rux.dev@pm.me");
});

test("an empty or malformed entry gives nothing to sign in with", () => {
	assert.equal(usernameToEmail(""), null);
	assert.equal(usernameToEmail("   "), null);
	assert.equal(usernameToEmail("two words"), null);
	assert.equal(usernameToEmail("name@nowhere"), null);
});
