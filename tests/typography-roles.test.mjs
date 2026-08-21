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
	"--rux-text-label-12-wide",
];

// The intent-named roles step 31 replaced, kept published for one release so a
// vendored consumer has somewhere to go. Each forwards to its shape-named
// replacement, and nothing in this repository may read one — an alias with an
// internal consumer can never be removed, which is how D5 survived five
// releases. Removal is step 33.
const SUPERSEDED = {
	"--rux-heading-page": "--rux-text-heading-40",
	"--rux-heading-section": "--rux-text-heading-24",
	"--rux-heading-panel": "--rux-text-heading-16",
	"--rux-text-lead": "--rux-text-copy-16",
	"--rux-text-body": "--rux-text-copy-14",
	"--rux-text-caption": "--rux-text-label-12",
	"--rux-label-control": "--rux-text-label-14",
	"--rux-label-eyebrow": "--rux-text-label-12-wide",
};

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

test("every superseded role name still forwards to its replacement", () => {
	for (const [old, current] of Object.entries(SUPERSEDED)) {
		for (const axis of AXES) {
			assert.match(
				tokens,
				new RegExp(`\\${old}-${axis}:\\s*var\\(\\${current}-${axis}\\)`),
				`${old}-${axis} must forward to ${current}-${axis}`,
			);
		}
	}
});

test("nothing internal reads a superseded role name", () => {
	// What makes step 33 a deletion rather than a migration.
	const consumers = Object.values(sheets).join("\n");
	const offenders = Object.keys(SUPERSEDED).filter((old) =>
		new RegExp(`var\\(\\${old}-`).test(consumers),
	);
	assert.deepEqual(offenders, []);
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
