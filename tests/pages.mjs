/* The repository's HTML entrypoints, discovered rather than listed.
 *
 * Every contract test that sweeps "every page" used to carry its own hardcoded
 * array, and the comments in portability-boundary.test.mjs record what that
 * cost: a rename that "reached driver.html, maintenance.html, and request.html
 * when the entrypoints were consolidated and only index.html was updated", and
 * a dangling stylesheet link that "slipped through twice". Two lists in that
 * one file had already drifted apart from each other, and class-resolution's
 * list had silently stopped covering d.html and m.html.
 *
 * A hand-maintained list of what to check reads as coverage while quietly
 * losing it. Enumerating the directory makes a new page covered by
 * construction — the failure mode becomes a test that runs, not one that
 * doesn't. */

import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const htmlIn = (dir) =>
	readdirSync(fileURLToPath(dir))
		.filter((name) => name.endsWith(".html"))
		.sort();

export function htmlPages() {
	const pages = htmlIn(root);
	const examples = new URL("examples/", root);
	if (existsSync(fileURLToPath(examples))) {
		pages.push(...htmlIn(examples).map((name) => `examples/${name}`));
	}
	return pages;
}
