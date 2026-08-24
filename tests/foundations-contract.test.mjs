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

		/* `steps?` so a founding document can say "1 step" without being made
		   to write "1 steps" to satisfy the parser. Surfaced by forms.md,
		   the first document added since this test was written. */
		const declaredTotal = Number(block.match(/(\d+)\s+steps?\b/)?.[1]);
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

/* ── open-work rollup ────────────────────────────────────────────────────────
   README.md's rollup is derived text, like the Status blocks above, so it gets
   the same treatment: the counters live here and the table is checked against
   them. Hand-maintained counts across nine documents drift within a week.

   Counting is scoped to the open-questions section and keyed by NUMBER, not by
   occurrence, because two conventions would otherwise inflate it. An answered
   question keeps its original text below the answer, so its number appears
   twice on purpose — that is the reasoning surviving the decision, not a
   duplicate. And a Status block may summarise a question by number long before
   §6 states it. Both were live in these documents when this was written.

   A question counts as answered when any of its occurrences says so, and the
   set writes that in three placements, all of which count: `— ANSWERED` inside
   the heading (typography Q10–Q12); an `**Answered …**` run on the same line,
   straight after the heading's closing `**` (forms.md Q3); and the same run in
   a blockquote BENEATH the question text, which is what typography.md does for
   Q1–Q9. Matching is scoped to the question's own block — its mark to the next
   question's mark — so a resolution counts for the question it sits under and
   for no other.

   The third placement is the fix for a miscount this counter shipped with. It
   originally required the run to be adjacent to the heading, which caught
   forms.md and nothing else, so typography.md's eight settled questions all
   counted as open and its rollup read 9 open when 1 is.

   The run MUST BEGIN its line, behind optional `>` and space, and that is
   load-bearing rather than tidy. typography.md Q6 opens its blockquote **The
   mechanism is answered; the mapping is not.** and is genuinely open — it still
   blocks step 7. Searching the block for the word anywhere would close it. The
   convention these documents keep is that `**Answered` in the LEADING position
   means settled; prose about what is answered is not that marker.

   A defect is RESOLVED when its row is struck through. That is not a guess:
   across all nine documents every resolved defect carries `~~` and no live one
   does. Live defects then split by whether the row records a decision to live
   with them — accepted debt is not a to-do, and rolling it up as one would
   make the backlog cry wolf.

   Acceptance is detected by PHRASE, and that is this counter's weak point,
   recorded rather than hidden: the first version matched "accepted debt" and
   missed state.md's D4, which says "accepted as debt", so a row that states
   its own acceptance was rolled up as a to-do. Phrases are matched loosely
   now, but the real fix — an explicit marker column, the way the amendment log
   carries its status — would touch every defect row in nine documents and is
   not worth a drive-by. If this misclassifies again, that is the change to
   make. Note the distinction the phrases encode: naming.md D4 says resolving
   it "belongs in ../portability-audit.md" and stays OPEN, because routing a
   defect elsewhere is not the same as declining it. */
function questionSection(md) {
	const m = md.match(/\n##\s*(?:\d+\.\s*)?Open questions\s*\n/i);
	return m ? md.slice(m.index) : "";
}

function questions(md) {
	const section = questionSection(md);
	const state = new Map();
	const marks = [...section.matchAll(/\*\*Q(\d+)\b([\s\S]{0,400}?)\*\*/g)];
	marks.forEach((m, i) => {
		const [, num, heading] = m;
		/* A question owns the text from its own mark to the next one, so a
		   resolution written beneath it is found wherever in that run it sits,
		   and one written beneath the NEXT question never counts for this one. */
		const rest = section
			.slice(m.index, marks[i + 1]?.index ?? section.length)
			.slice(m[0].length);
		const answered =
			/ANSWERED/i.test(heading) || /(?:^|\n)[ \t>]*\*\*Answered\b/i.test(rest);
		state.set(num, (state.get(num) ?? false) || answered);
	});
	let open = 0, answered = 0;
	for (const isAnswered of state.values()) isAnswered ? answered++ : open++;
	return { open, answered, numbers: state.size };
}

function defects(md) {
	let open = 0, accepted = 0, resolved = 0;
	for (const line of md.split("\n")) {
		if (!/^\|\s*D\d+\s*\|/.test(line)) continue;
		if (line.includes("~~")) resolved++;
		else if (/accepted\s+(?:as\s+)?debt|downgraded by step|measured and declined/i.test(line)) accepted++;
		else open++;
	}
	return { open, accepted, resolved };
}

test("every foundation document has an open-questions section to roll up", () => {
	for (const [name, md] of Object.entries(docs)) {
		assert.ok(questionSection(md), `${name} has no "Open questions" section`);
	}
});

test("README's open-work rollup agrees with the documents", () => {
	const rows = new Map();
	for (const line of readme.split("\n")) {
		const m = line.match(/^\|\s*\[`([a-z-]+\.md)`\][^|]*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*$/);
		if (m) rows.set(m[1], { open: +m[2], defects: +m[3], accepted: +m[4] });
	}
	assert.ok(rows.size > 0, "no rollup rows found in README.md — is the table still there?");
	for (const [name, md] of Object.entries(docs)) {
		const q = questions(md), d = defects(md);
		const row = rows.get(name);
		assert.ok(row, `${name} is missing from the open-work rollup`);
		assert.equal(row.open, q.open, `${name}: rollup says ${row.open} open questions, the document has ${q.open}`);
		assert.equal(row.defects, d.open, `${name}: rollup says ${row.defects} open defects, the document has ${d.open}`);
		assert.equal(row.accepted, d.accepted, `${name}: rollup says ${row.accepted} accepted, the document has ${d.accepted}`);
	}
	assert.equal(rows.size, Object.keys(docs).length, "the rollup lists a document that no longer exists, or omits one");
});
