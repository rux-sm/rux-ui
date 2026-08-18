import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* The token layer is the fastest-moving surface in this repository, and a
   custom property that never resolves fails silently: the whole declaration
   is invalid at computed-value time, so the rule simply does not render.
   These tests make that class of breakage loud. */

const ROOTS = ["rux-ui/css", "scheduler/css"];

function cssFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) cssFiles(path, out);
		else if (entry.endsWith(".css")) out.push(path);
	}
	return out;
}

const FILES = ROOTS.flatMap((root) => cssFiles(root));
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const sources = FILES.map((path) => ({ path, css: stripComments(readFileSync(path, "utf8")) }));
const allCss = sources.map((s) => s.css).join("\n");

/* A token counts as defined if any stylesheet declares it in any scope —
   including a feature file setting a hook that the portable layer reads. */
const defined = new Set([...allCss.matchAll(/(--rux-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));

test("every --rux-* custom property read without a fallback is defined somewhere", () => {
	const offenders = [];
	for (const { path, css } of sources) {
		/* var(--x) with no comma — a var(--x, fallback) degrades safely and is
		   the documented way to expose an optional override hook. */
		for (const m of css.matchAll(/var\(\s*(--rux-[a-z0-9-]+)\s*\)/g)) {
			if (!defined.has(m[1])) {
				const line = css.slice(0, m.index).split("\n").length;
				offenders.push(`${path}:${line} → ${m[1]}`);
			}
		}
	}
	assert.deepEqual(offenders, [], `unresolved custom properties:\n${offenders.join("\n")}`);
});

test("every light-theme override corresponds to a base :root token", () => {
	const tokens = readFileSync("rux-ui/css/tokens.css", "utf8");
	const clean = stripComments(tokens);
	const scope = (pattern) => {
		const start = clean.search(pattern);
		if (start === -1) return new Set();
		let i = clean.indexOf("{", start) + 1;
		let depth = 1;
		const from = i;
		while (i < clean.length && depth) {
			if (clean[i] === "{") depth += 1;
			else if (clean[i] === "}") depth -= 1;
			i += 1;
		}
		return new Set([...clean.slice(from, i).matchAll(/^\s*(--rux-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]));
	};
	const base = scope(/:root\s*\{/);
	const light = scope(/:root\[data-theme="light"\]\s*\{/);
	const orphans = [...light].filter((t) => !base.has(t)).sort();
	assert.deepEqual(orphans, [], `light overrides with no :root default:\n${orphans.join("\n")}`);
});

test("the space scale exposes no half-step below --rux-space-1-5", () => {
	/* --rux-space-0-5 has never existed; the scale is px, 1, 1-5, 2, 3, …
	   Guard the name so it cannot be reintroduced by muscle memory. */
	const used = [...allCss.matchAll(/var\(\s*(--rux-space-0-5)[\s,)]/g)];
	assert.equal(used.length, 0, "--rux-space-0-5 is not part of the scale — use --rux-space-px or --rux-space-1");
});

test("the spacing scale holds its 4px grid contract", () => {
	/* Every --rux-space-<N> is N × 4px expressed in rem, including the half
	   step (1-5 → 1.5 × 4px = 6px). --rux-space-px is the one documented
	   exception. Asserting the rule rather than a value table means new steps
	   are covered automatically, a step cannot drift off the grid, and a
	   deletion fails here instead of silently invalidating every declaration
	   that reads it. */
	const tokens = stripComments(readFileSync("rux-ui/css/tokens.css", "utf8"));
	const found = new Map(
		[...tokens.matchAll(/^\s*--rux-space-([a-z0-9-]+):\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]),
	);

	assert.ok(found.size > 0, "no --rux-space-* tokens found");
	assert.equal(found.get("px"), "1px", "--rux-space-px is the hairline step and must stay 1px");
	assert.equal(found.get("0"), "0px", "--rux-space-0 must be 0px");

	const offGrid = [];
	for (const [name, value] of found) {
		if (name === "px" || name === "0") continue;
		const step = Number(name.replace("-", "."));
		assert.ok(Number.isFinite(step), `--rux-space-${name} is not a numeric step`);
		const expected = `${step * 0.25}rem`;
		if (value !== expected) offGrid.push(`--rux-space-${name}: ${value} (expected ${expected} = ${step * 4}px)`);
	}
	assert.deepEqual(offGrid, [], `spacing steps off the 4px grid:\n${offGrid.join("\n")}`);

	/* The scale must stay contiguous at the low end, where dense UI lives. */
	for (const step of ["1", "2", "3", "4", "5", "6"]) {
		assert.ok(found.has(step), `--rux-space-${step} is missing from the scale`);
	}
});
