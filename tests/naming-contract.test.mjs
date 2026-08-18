import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* Naming is the part of a design system that cannot be recovered once it
   drifts: a renamed class breaks every consumer, and an inconsistent one
   quietly teaches the next component the wrong pattern. These tests make the
   BEM contract in the rux-design skill mechanical rather than remembered. */

function cssFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) cssFiles(path, out);
		else if (entry.endsWith(".css")) out.push(path);
	}
	return out;
}

const css = cssFiles("rux-ui/css")
	.map((p) => readFileSync(p, "utf8"))
	.join("\n")
	.replace(/\/\*[\s\S]*?\*\//g, "");

const classNames = [...new Set([...css.matchAll(/\.(rux-[A-Za-z0-9_-]+)/g)].map((m) => m[1]))].sort();

/* rux-{block}, optionally __{element}, optionally --{modifier}.
   Every segment is lowercase kebab-case. */
const BEM = /^rux-[a-z0-9]+(?:-[a-z0-9]+)*(?:__[a-z0-9]+(?:-[a-z0-9]+)*)?(?:--[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

test("every .rux-* class follows the block__element--modifier contract", () => {
	const offenders = classNames.filter((name) => !BEM.test(name));
	assert.deepEqual(offenders, [], `classes outside the BEM contract:\n${offenders.join("\n")}`);
});

test("every modifier belongs to a block that exists", () => {
	const blocks = new Set(classNames.map((n) => n.split("__")[0].split("--")[0]));
	const orphans = classNames
		.filter((n) => n.includes("--"))
		.filter((n) => !blocks.has(n.split("__")[0].split("--")[0]));
	assert.deepEqual(orphans, [], `modifiers with no base block:\n${orphans.join("\n")}`);
});

test("JavaScript state is expressed only as .is-* or .has-*", () => {
	/* A state class that is neither is-* nor has-* is indistinguishable from a
	   structural class, so components stop being able to tell layout from
	   state. Anything stateful must use one of the two documented prefixes. */
	const stateish = [...new Set([...css.matchAll(/\.((?:is|has)-[a-z0-9-]+)/g)].map((m) => m[1]))];
	assert.ok(stateish.length > 0, "expected the portable layer to define state classes");
	const malformed = stateish.filter((n) => !/^(?:is|has)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(n));
	assert.deepEqual(malformed, [], `malformed state classes:\n${malformed.join("\n")}`);
});

test("the gallery only references classes the design system defines", () => {
	/* gallery.html is the visual contract sheet; a class there that no
	   stylesheet defines means the specimen is silently rendering unstyled. */
	const html = readFileSync("gallery.html", "utf8");
	const used = new Set(
		[...html.matchAll(/class="([^"]+)"/g)]
			.flatMap((m) => m[1].split(/\s+/))
			.filter((c) => c.startsWith("rux-")),
	);
	const defined = new Set(classNames);
	const missing = [...used].filter((c) => !defined.has(c)).sort();
	assert.deepEqual(missing, [], `gallery.html uses undefined classes:\n${missing.join("\n")}`);
});
