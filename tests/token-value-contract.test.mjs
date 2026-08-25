import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/* The fourth gate.

   `docs/design-system-distribution.md` §4 names this gate as the fourth, and
   `docs/foundations/README.md` §2.2 states why it exists. The other three are
   name-based — the consumer name check is recorded there as blind to "how it
   looks" — so a token whose *value* moves while its name holds still reaches a
   vendored consumer having tripped none of them. That is the Class B amendment
   in `CLAUDE.md` § Foundation Work, the one the log requires before/after
   resolved values for.

   This file pins the value of every custom property the CSS declares, per
   declaring context, in a committed snapshot. A Class B edit fails here until
   the snapshot is regenerated, and the regenerated diff *is* the before/after
   record the amendment step has to carry.

   Regenerate deliberately, never reflexively:

       UPDATE_TOKEN_SNAPSHOT=1 node --test tests/token-value-contract.test.mjs

   Borrowed from @carbon/motion, which pins resolved values the same way and
   keeps a separate snapshot of token *names* to catch Class A and C. */

const ROOTS = ["rux-ui/css", "scheduler/css"];
const SNAPSHOT = new URL("./token-values.snapshot.txt", import.meta.url);

function cssFiles(dir, out = []) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) cssFiles(path, out);
		else if (entry.endsWith(".css")) out.push(path);
	}
	return out;
}

/* A custom property's value is opaque to CSS until it is substituted, so the
   declared text is what has to be pinned: a retarget from var(--rux-blue-700)
   to var(--rux-blue-800) is a value change even though nothing resolves here.
   Tokens referenced through it are pinned at their own declaration. */
function declarations(css, file) {
	const out = [];
	const stack = [];
	let buf = "";

	const flush = () => {
		const text = buf.trim();
		buf = "";
		if (!text.startsWith("--")) return;
		const split = text.indexOf(":");
		if (split === -1) return;
		const name = text.slice(0, split).trim();
		if (!/^--[a-z0-9-]+$/i.test(name)) return;
		const value = text.slice(split + 1).trim().replace(/\s+/g, " ");
		out.push(`${file} :: ${stack.join(" > ")} :: ${name}: ${value}`);
	};

	for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
		if (ch === "{") {
			stack.push(buf.trim().replace(/\s+/g, " "));
			buf = "";
		} else if (ch === "}") {
			flush();
			stack.pop();
		} else if (ch === ";") {
			flush();
		} else {
			buf += ch;
		}
	}
	return out;
}

const current = ROOTS.flatMap((root) => cssFiles(root))
	.sort()
	.flatMap((file) => declarations(readFileSync(file, "utf8"), file))
	.sort();

if (process.env.UPDATE_TOKEN_SNAPSHOT) {
	writeFileSync(SNAPSHOT, `${current.join("\n")}\n`);
}

test("every declared token value matches the committed snapshot", () => {
	assert.ok(
		existsSync(SNAPSHOT),
		"No snapshot. Create it with UPDATE_TOKEN_SNAPSHOT=1 node --test tests/token-value-contract.test.mjs",
	);

	const recorded = readFileSync(SNAPSHOT, "utf8").trimEnd().split("\n");
	if (recorded.join("\n") === current.join("\n")) return;

	/* Report by token identity rather than by line, so a changed value reads as
	   one before/after pair instead of an unrelated deletion and addition. */
	const key = (line) => line.slice(0, line.lastIndexOf(": "));
	const was = new Map(recorded.map((l) => [key(l), l]));
	const now = new Map(current.map((l) => [key(l), l]));

	/* A name is Class C only when it stops resolving ANYWHERE. Dropping a
	   theme override moves a token from two contexts to one — the name still
	   resolves, from :root — and keying by context alone reports that as a
	   removal. Carbon keeps a separate name snapshot for exactly this reason;
	   this is the same distinction, made inline. */
	const nameOf = (line) => line.slice(line.lastIndexOf(" :: ") + 4, line.lastIndexOf(": "));
	const liveNames = new Set(current.map(nameOf));

	const changed = [];
	const removed = [];
	const rescoped = [];
	const added = [];
	for (const [k, line] of was) {
		if (!now.has(k)) (liveNames.has(nameOf(line)) ? rescoped : removed).push(line);
		else if (now.get(k) !== line) changed.push(`  - ${line}\n  + ${now.get(k)}`);
	}
	for (const [k, line] of now) if (!was.has(k)) added.push(line);

	const report = [
		`${changed.length} value(s) changed, ${added.length} added, ${removed.length} removed`
			+ (rescoped.length ? `, ${rescoped.length} rescoped` : "") + ".",
		rescoped.length ? `\nRESCOPED (still resolves — a context was dropped, not the name):\n${rescoped.map((l) => `  ~ ${l}`).join("\n")}` : "",
		changed.length ? `\nCHANGED (Class B — record before/after in the amendment log):\n${changed.join("\n")}` : "",
		added.length ? `\nADDED (Class A):\n${added.map((l) => `  + ${l}`).join("\n")}` : "",
		removed.length ? `\nREMOVED (Class C — stop and propose):\n${removed.map((l) => `  - ${l}`).join("\n")}` : "",
		"\nIf every change above is intended and recorded, regenerate:",
		"  UPDATE_TOKEN_SNAPSHOT=1 node --test tests/token-value-contract.test.mjs",
	].filter(Boolean).join("\n");

	assert.fail(report);
});
