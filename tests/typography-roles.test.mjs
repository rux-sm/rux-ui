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
	"--rux-heading-page",
	"--rux-heading-panel",
	"--rux-text-body",
	"--rux-text-caption",
	"--rux-label-control",
	"--rux-label-eyebrow",
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
		[/\.rux-side-nav__link\s*\{[^}]*\}/, "--rux-label-control"],
		[/\.rux-suggestions__label\s*\{[^}]*\}/, "--rux-label-control"],
		[/\.rux-alert\s*\{[^}]*\}/, "--rux-text-body"],
		[/\.rux-toast\s*\{[^}]*\}/, "--rux-text-body"],
		[/\.rux-tooltip\s*\{[^}]*\}/, "--rux-text-caption"],
		[/\.rux-suggestions__sublabel\s*\{[^}]*\}/, "--rux-text-caption"],
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
