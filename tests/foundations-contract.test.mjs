import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

// The foundation documents state design rules AND carry the amendment log that
// authorizes changing them (CLAUDE.md § Foundation Work). Two things in each
// document are *derived* rather than authored — the Status block and the index
// row in README.md — and derived text drifts unless something checks it. That
// is all this suite does: it does not read the rules, only the bookkeeping.

const dir = new URL("../docs/foundations/", import.meta.url);
const files = (await readdir(dir)).filter(
	(f) => f.endsWith(".md") && f !== "README.md",
);
const docs = Object.fromEntries(
	await Promise.all(
		files.map(async (f) => [f, await readFile(new URL(f, dir), "utf8")]),
	),
);
const readme = await readFile(new URL("README.md", dir), "utf8");

/* `withdrawn` is not `done` and not `deferred`: the step will never be
   executed, and the log keeps it so the reasoning survives the decision. */
const STATES = ["done", "ready", "open", "deferred", "withdrawn"];

// A log row is `| n | step | status | notes |`. Only column 3 is the status —
// a note may well mention another state in prose (step 3 records that it was
// downgraded from [ready]), and counting those would make the test lie.
function tally(md) {
	const counts = Object.fromEntries(STATES.map((s) => [s, 0]));
	let total = 0;
	for (const line of md.split("\n")) {
		if (!/^\|\s*\d+\s*\|/.test(line)) continue;
		const status = line.split("|")[3] ?? "";
		const hit = STATES.find((s) => new RegExp(`\\b${s}\\b`, "i").test(status));
		assert.ok(hit, `log row has no recognizable status: ${line.slice(0, 60)}`);
		counts[hit]++;
		total++;
	}
	return { counts, total };
}

const fmt = ({ counts }) =>
	STATES.filter((s) => counts[s] > 0)
		.map((s) => `${counts[s]} ${s}`)
		.join(" · ");

test("every foundation document carries a contract version", () => {
	for (const [name, md] of Object.entries(docs)) {
		assert.match(
			md,
			/\*\*Contract version:\s*\d+\.\d+\.\d+\*\*/,
			`${name} has no contract version; precedence without one is only "whatever main says today"`,
		);
	}
});

test("the Status block agrees with the amendment log it summarizes", () => {
	for (const [name, md] of Object.entries(docs)) {
		const { counts, total } = tally(md);
		assert.ok(total > 0, `${name} has no amendment log rows`);

		const block = md.match(/\*\*Status\*\*[^\n]*\n?[^\n]*/)?.[0];
		assert.ok(block, `${name} has no Status block`);

		const declaredTotal = Number(block.match(/(\d+)\s+steps/)?.[1]);
		assert.equal(
			declaredTotal,
			total,
			`${name}: Status says ${declaredTotal} steps, the log has ${total}`,
		);

		for (const state of STATES) {
			const declared = Number(
				block.match(new RegExp(`(\\d+)\\s+${state}\\b`))?.[1] ?? 0,
			);
			assert.equal(
				declared,
				counts[state],
				`${name}: Status says ${declared} ${state}, the log has ${counts[state]}`,
			);
		}
	}
});

test("the README index agrees with each document it lists", () => {
	for (const [name, md] of Object.entries(docs)) {
		const row = readme
			.split("\n")
			.find((l) => l.startsWith("|") && l.includes(`(${name})`));
		assert.ok(row, `README index has no row for ${name}`);

		const cells = row.split("|").map((c) => c.trim());
		const version = md.match(/\*\*Contract version:\s*(\d+\.\d+\.\d+)\*\*/)[1];
		assert.equal(
			cells[2],
			version,
			`README lists ${name} at ${cells[2]}, the document says ${version}`,
		);
		assert.equal(
			cells[3],
			fmt(tally(md)),
			`README's status for ${name} disagrees with its log`,
		);
	}
});
