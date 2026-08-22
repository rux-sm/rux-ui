import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const base = new URL("../rux-ui/css/", import.meta.url);
const tokens = await readFile(new URL("tokens.css", base), "utf8");

const baseFiles = (await readdir(new URL("base/", base))).filter((f) =>
	f.endsWith(".css"),
);
const sheets = Object.fromEntries(
	await Promise.all(
		baseFiles.map(async (f) => [
			`base/${f}`,
			await readFile(new URL(`base/${f}`, base), "utf8"),
		]),
	),
);
sheets["colors_and_type.css"] = await readFile(
	new URL("colors_and_type.css", base),
	"utf8",
);

// The component-token tier is a real consumer: --rux-button-font-weight reading
// --rux-text-button-14-weight is how a component adopts a role, and it is the
// documented shape (§3.2). Without tokens.css here, a role adopted that way
// looks unread and both the used-check and the PENDING honesty test go blind —
// which is exactly what happened when step 41 adopted the Button family.
//
// Until step 33 this sliced out a superseded-alias block first: those aliases
// were themselves role reads (--rux-heading-page-size: var(--rux-text-heading-
// 40-size)), so leaving them in would have let a role satisfy the used-check
// through its own deprecated alias and nothing else. Step 33 deleted the block,
// so the whole file is the corpus and the slicing is gone with it.
sheets["tokens.css (component tier)"] = tokens;

// Every role carries the same axes; a call site should never have to drop to
// the raw scale for one of them.
const AXES = ["size", "weight", "line-height", "tracking", "color"];
const ROLES = [
	"--rux-text-heading-40",
	"--rux-text-heading-24",
	"--rux-text-heading-16",
	"--rux-text-copy-16",
	"--rux-text-copy-14",
	"--rux-text-label-12",
	"--rux-text-label-14",
	"--rux-text-button-14",
	"--rux-text-button-12",
];

// Roles published ahead of their consumers (typography.md §5 step 38). §2.1
// makes this legal — a Class A addition has "no downstream effect until a
// consumer opts in" — but the used-check below would fail them, because that
// check IS §7.3's named-consumer rule and it cannot tell a rung awaiting
// migration from a rung nobody wanted.
//
// So they are asserted from the other side: complete, and still unread. The
// second half is the honesty test. The moment a call site adopts one, this
// list fails and the role must move up into ROLES — which is what stops a
// pending role from sitting here unexamined after its migration lands.
//
// "Unread" here means unread BY THE PORTABLE LAYER, because `sheets` is
// rux-ui/css/base only — the same scope the used-check above runs against.
// A role the application layer has adopted stays in this list until a portable
// consumer appears, and --rux-text-label-18 is in exactly that state after
// step 39: .driver-share-header__label reads it from scheduler/css. Stated
// rather than left implicit, because a reader who assumes PENDING means
// "nothing uses it" would draw the wrong conclusion from that entry.
const PENDING = [
	// --rux-text-button-14 and -12 were promoted into ROLES by step 41, which
	// adopted them on .rux-button. --rux-text-label-18 stays: its only consumer
	// is .driver-share-header__label in scheduler/css, outside this corpus.
	"--rux-text-label-18",
];

// The intent-named roles step 31 replaced, kept published for one release so a
// vendored consumer has somewhere to go. Each forwards to its shape-named
// replacement, and nothing in this repository may read one — an alias with an
// internal consumer can never be removed, which is how D5 survived five
// releases. Removal is step 33.
// Step 33 deleted every one of them. The list survives as the ratchet: these
// names are retired and MUST NOT come back, which is the half still worth
// enforcing now that forwarding is moot.
const RETIRED = [
	"--rux-heading-page",
	"--rux-heading-section",
	"--rux-heading-panel",
	"--rux-text-lead",
	"--rux-text-body",
	"--rux-text-caption",
	"--rux-label-control",
	"--rux-label-eyebrow",
	"--rux-text-label-12-wide",
	"--rux-size-11",
	"--rux-size-xxs",
	"--rux-tracking-dense",
];

test("every typography role is complete", () => {
	for (const role of ROLES) {
		for (const axis of AXES) {
			assert.match(
				tokens,
				new RegExp(`${role}-${axis}:`),
				`${role}-${axis} is missing`,
			);
		}
	}
});

test("a role introduces meaning, never a new number", () => {
	// Roles alias the scale. A literal here would fork the type system.
	for (const role of ROLES) {
		for (const axis of AXES) {
			const value = tokens.match(
				new RegExp(`${role}-${axis}:\\s*([^;]+);`),
			)?.[1];
			if (!value) continue;
			assert.match(
				value.trim(),
				/^var\(--rux-[\w-]+\)$/,
				`${role}-${axis} is ${value.trim()}, not an alias of the scale`,
			);
		}
	}
});

test("a retired name is neither defined nor read", () => {
	// This asserted the opposite until step 33: that every superseded name still
	// FORWARDED to its replacement, which is what an alias window is for. Step 48
	// took consumers out of scope, step 33 deleted all 52 declarations, and what
	// is left to enforce is that none of them comes back — by definition or by
	// read. An alias with an internal consumer can never be removed, which is how
	// D5 survived five releases; this is the guard against a repeat.
	const consumers = Object.values(sheets).join("\n");
	const defined = RETIRED.filter((n) => new RegExp(`\\${n}[-:]`).test(tokens));
	const read = RETIRED.filter((n) => new RegExp(`var\\(\\s*\\${n}[-)]`).test(consumers));
	assert.deepEqual(defined, [], "retired names must not be redefined");
	assert.deepEqual(read, [], "retired names must not be read");
});

test("no role is defined but unused", () => {
	const consumers = Object.values(sheets).join("\n");
	for (const role of ROLES) {
		assert.match(
			consumers,
			new RegExp(`var\\(${role}-`),
			`${role} is defined but nothing reads it`,
		);
	}
});

test("a pending role is complete, exactly like a published one", () => {
	for (const role of PENDING) {
		for (const axis of AXES) {
			assert.match(
				tokens,
				new RegExp(`${role}-${axis}:`),
				`${role} is missing its ${axis} axis (rule 1.1)`,
			);
		}
	}
});

test("a pending role that gained a consumer is promoted, not left pending", () => {
	const consumers = Object.values(sheets).join("\n");
	for (const role of PENDING) {
		assert.doesNotMatch(
			consumers,
			new RegExp(`var\\(${role}-`),
			`${role} is read by a stylesheet — move it from PENDING into ROLES ` +
				`and record the migration step (typography.md §5)`,
		);
	}
});

test("recurring type recipes go through a role, not the raw scale", () => {
	// The audit's finding: a size+line-height pair repeated across unrelated
	// components is a role that has not been named yet. One-offs are fine —
	// they belong to their component — so this only guards the known set.
	const ROLE_OWNED = [
		[/\.rux-side-nav__link\s*\{[^}]*\}/, "--rux-text-label-14"],
		[/\.rux-suggestions__label\s*\{[^}]*\}/, "--rux-text-label-14"],
		[/\.rux-alert\s*\{[^}]*\}/, "--rux-text-copy-14"],
		[/\.rux-toast\s*\{[^}]*\}/, "--rux-text-copy-14"],
		[/\.rux-tooltip\s*\{[^}]*\}/, "--rux-text-label-12"],
		[/\.rux-suggestions__sublabel\s*\{[^}]*\}/, "--rux-text-label-12"],
	];
	const all = Object.values(sheets).join("\n");
	for (const [pattern, role] of ROLE_OWNED) {
		const rule = all.match(pattern);
		assert.ok(rule, `rule for ${role} not found: ${pattern}`);
		assert.match(
			rule[0],
			new RegExp(`var\\(${role}-`),
			`${pattern} should read ${role}-*`,
		);
	}
});
