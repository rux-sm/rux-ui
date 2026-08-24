import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// A trip ref is the only trip identifier several surfaces show the user — the
// driver panel's and fleet panel's per-trip lists render it with no id beside
// it — so two trips sharing one ref render as indistinguishable rows. The ref
// must therefore be unique in practice without a database constraint to make
// it so. Deriving the suffix from a count of the trips on the date does not
// achieve that, because that count can go back down; deriving it from the
// numbers already issued for the date does, because those only go up.

const tripDb = await readFile(
	new URL("../js/data/trip-db.js", import.meta.url),
	"utf8",
);

// trip-db.js imports the live Supabase client at module scope, so the pure
// helpers are read out of source rather than imported. Everything under test
// here is self-contained arithmetic over strings.
function loadHelpers(source) {
	const start = source.indexOf("function tripRefStem");
	assert.notEqual(start, -1, "trip-db.js must define tripRefStem");
	const end = source.indexOf("async function generateTripRef", start);
	assert.ok(end > start, "tripRefStem must precede generateTripRef");
	const block = source.slice(start, end).replace(/\bexport\s+function\b/g, "function");
	return new Function(`${block}; return { tripRefStem, nextTripRef };`)();
}

const { tripRefStem, nextTripRef } = loadHelpers(tripDb);

test("the stem encodes the trip's own start date", () => {
	assert.equal(tripRefStem("2027-06-01"), "TRP270601");
	assert.equal(tripRefStem("2026-09-19"), "TRP260919");
	// Single-digit month and day stay zero-padded, or the stem stops being
	// a fixed width and two different dates can produce one stem.
	assert.equal(tripRefStem("2026-03-07"), "TRP260307");
});

test("the first ref for a date is -001", () => {
	assert.equal(nextTripRef("TRP270601", []), "TRP270601-001");
});

test("a ref continues the highest number already issued", () => {
	assert.equal(
		nextTripRef("TRP270601", ["TRP270601-001", "TRP270601-002"]),
		"TRP270601-003",
	);
});

// The bug this fix exists for. Both cases leave the date holding fewer trips
// than it has issued refs; a count-based suffix reissues a live ref, a
// highest-issued suffix cannot.
test("rescheduling a trip off its date does not free its number", () => {
	// TRP270601-001 was minted here, then moved to 2027-06-02. It still holds
	// the number, so the next trip booked on 2027-06-01 must not get -001.
	assert.equal(nextTripRef("TRP270601", ["TRP270601-001"]), "TRP270601-002");
});

test("a gap left by a hard-deleted trip is not refilled", () => {
	// The live table's 2026-08-07: one trip, ref -002, and -001 gone entirely.
	assert.equal(nextTripRef("TRP260807", ["TRP260807-002"]), "TRP260807-003");
	// The live table's 2026-03-19 legacy block, imported with -0001 twice.
	assert.equal(
		nextTripRef("TRP260319", ["TRP260319-001", "TRP260319-005", "TRP260319-007"]),
		"TRP260319-008",
	);
});

test("a cancelled trip keeps its number", () => {
	// generateTripRef does not filter cancelled_at, so a cancelled trip's ref
	// reaches this helper and must still cap the sequence — reissuing it would
	// collide with a record that is still readable in trip history.
	assert.equal(nextTripRef("TRP260827", ["TRP260827-002"]), "TRP260827-003");
});

test("only this stem's refs count toward its sequence", () => {
	assert.equal(
		nextTripRef("TRP270601", [
			"TRP270602-009",          // neighbouring date
			"TRIP-20260304-0001",     // legacy import format
			"LEGACY-MAY26-3054F416",  // legacy import format
			null,
			"",
		]),
		"TRP270601-001",
	);
});

test("a non-numeric tail does not cap the sequence", () => {
	// "-001-B" is not a number this generator issued. Treating its tail as one
	// would either throw off the maximum or, via NaN, silently reset it to 1.
	assert.equal(
		nextTripRef("TRP270601", ["TRP270601-001-B", "TRP270601-002"]),
		"TRP270601-003",
	);
});

test("the suffix keeps three-digit padding and grows past it", () => {
	assert.equal(nextTripRef("TRP270601", ["TRP270601-008"]), "TRP270601-009");
	assert.equal(nextTripRef("TRP270601", ["TRP270601-099"]), "TRP270601-100");
	// Above 999 the ref widens rather than wrapping back onto a used number.
	assert.equal(nextTripRef("TRP270601", ["TRP270601-999"]), "TRP270601-1000");
});

// Regression guard: the shape of the query matters as much as the arithmetic.
// A count of rows on the date is the defect, whatever the suffix maths does
// with it afterwards.
test("generateTripRef reads issued refs, never a row count", () => {
	const start = tripDb.indexOf("async function generateTripRef");
	assert.notEqual(start, -1, "trip-db.js must define generateTripRef");
	const end = tripDb.indexOf("/* ──", start);
	assert.ok(end > start, "generateTripRef must be followed by a section break");
	const block = tripDb.slice(start, end);

	assert.match(block, /\.select\("trip_ref"\)/);
	assert.match(block, /\.like\("trip_ref", `\$\{stem\}-%`\)/);
	assert.match(block, /nextTripRef\(stem,/);
	// The two forms of the original defect.
	assert.doesNotMatch(block, /count: "exact"/);
	assert.doesNotMatch(block, /\.eq\("start_date"/);
});
