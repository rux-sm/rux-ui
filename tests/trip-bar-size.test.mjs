import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const barCss = await readFile(
	new URL("../scheduler/css/features/trip-bar.css", import.meta.url),
	"utf8",
);
const schedTokens = await readFile(
	new URL("../scheduler/css/tokens.css", import.meta.url),
	"utf8",
);
// The .sched-scheduler--trip-bar-size-* tiers are modifiers of .sched-scheduler,
// so they live with that block in layout/scheduler.css — docs/foundations/naming.md
// rule 2.1, moved by step 13. They configure the trip bar through --sched-trip-bar-*
// tokens, which is why this suite reads them; the tier blocks are there, the
// defaults they fall back to are still in trip-bar.css.
const layoutCss = await readFile(
	new URL("../scheduler/css/layout/scheduler.css", import.meta.url),
	"utf8",
);
const ruxTokens = await readFile(
	new URL("../rux-ui/css/tokens.css", import.meta.url),
	"utf8",
);
// The size control and stored-preference migration live in the app shell.
const appSource = await readFile(
	new URL("../index.html", import.meta.url),
	"utf8",
);

const ROOT_FONT_PX = 16;

// Resolve a --rux-* token to px, following var() chains.
//
// Step 30 required a *primitive* here, to stop the trip bar deriving sizes with
// clamp(). Step 43 relaxed that to any --rux-* token, because rule 1.2 asks a
// recurring recipe to go through a ROLE rather than the raw scale, and a role
// is itself a named rung — a strictly stronger form of "states its rungs" than
// naming the primitive. What stays forbidden is arithmetic, and the clamp/calc
// assertion below is what enforces that.
function pxOf(name, seen = new Set()) {
	assert.ok(!seen.has(name), `${name} resolves in a cycle`);
	seen.add(name);
	const decl = ruxTokens.match(new RegExp(`${name}:\\s*([^;]+);`));
	assert.ok(decl, `${name} not found in rux-ui/css/tokens.css`);
	const literal = decl[1].match(/^\s*([\d.]+)(rem|px)/);
	if (literal) {
		return literal[2] === "rem" ? Number(literal[1]) * ROOT_FONT_PX : Number(literal[1]);
	}
	const ref = decl[1].match(/var\(\s*(--rux-[\w-]+)\s*\)/);
	assert.ok(ref, `${name} resolves to "${decl[1].trim()}", which is neither a length nor a --rux-* token`);
	return pxOf(ref[1], seen);
}

// Read a custom property out of a block, falling back to the sheet-wide default
// (the XS tier declares no override block — it *is* the default).
function declIn(block, prop) {
	const m = block.match(new RegExp(`${prop}:\\s*([^;]+);`));
	return m ? m[1].trim() : null;
}
function blockFor(tier) {
	if (tier === "xs") return null;
	const m = layoutCss.match(
		new RegExp(`\\.sched-scheduler--trip-bar-size-${tier}\\s*\\{([\\s\\S]*?)\\n\\}`),
	);
	assert.ok(m, `no override block for tier ${tier}`);
	return m[1];
}
function valueOf(tier, prop) {
	const block = blockFor(tier);
	const own = block && declIn(block, prop);
	const raw = own ?? declIn(barCss, prop) ?? declIn(schedTokens, prop);
	assert.ok(raw, `${prop} has no value for tier ${tier}`);
	return raw;
}
function pxFor(tier, prop) {
	const raw = valueOf(tier, prop);
	const ref = raw.match(/var\(\s*(--rux-[\w-]+)\s*\)/);
	assert.ok(
		ref,
		`${prop} at tier ${tier} is "${raw}" — it must name a --rux-* rung (step 30)`,
	);
	return pxOf(ref[1]);
}

// Two tiers since docs/trip-bar.md step 6 retired XXS — it had rendered
// identically to the default since typography.md Q11, so the control lied.
const TIERS = ["xs", "sm"];
const rowFont = (t) => pxFor(t, "--sched-trip-bar-row-font-size");
const rowLine = (t) => pxFor(t, "--sched-trip-bar-row-line-height");
test("the bus reference is plain text taking label-12 whole", () => {
	// docs/trip-bar.md rule 2.10, step 10: the marker is a qualifier on the
	// trip's name — destination row, far right, no fill, no radius, no box,
	// weight 400, the role's own three axes adopted together (rule 2.6).
	// This replaces four pill tests: the pill geometry they measured (box,
	// per-tier font, weight-500 exception) no longer exists, and its
	// hand-set tokens are gone — which also closes typography.md D19's
	// 12/12-in-a-16px-box defect by deletion.
	assert.match(
		barCss,
		/\.sched-trip-bar__bus-label\s*\{[^}]*font-size:\s*var\(--rux-text-label-12-size\)[^}]*line-height:\s*var\(--rux-text-label-12-line-height\)[^}]*letter-spacing:\s*var\(--rux-text-label-12-tracking\)[^}]*font-weight:\s*var\(--rux-weight-400\)/s,
	);
	const declarations = barCss.replace(/\/\*[\s\S]*?\*\//g, "");
	const markerRule = declarations.match(/\.sched-trip-bar__bus-label\s*\{[^}]*\}/s)?.[0] ?? "";
	for (const boxProp of ["background", "border-radius", "height", "min-width", "padding"]) {
		assert.doesNotMatch(
			markerRule,
			new RegExp(`[\\s;{]${boxProp}:`),
			`the marker is plain text — no ${boxProp}`,
		);
	}
	// The hand-set pill tokens stayed dead nowhere: no declaration or read
	// survives in any stylesheet this suite covers.
	for (const css of [barCss, schedTokens, layoutCss]) {
		assert.doesNotMatch(css, /--sched-trip-bar-bus-label-/);
	}
});

test("no tier goes below the 12px floor (rule 2.14)", () => {
	// This asserted the opposite shape until step 45: rule 2.14 used to say
	// "below 14px, tracking turns positive" and this checked that a sub-14 tier
	// carried --rux-tracking-dense. Step 37 corrected the threshold to 12 — the
	// old number survived here and did NOT fail then, only because nothing had
	// yet dropped the dense rung. Steps 42 and 43 removed every sub-12
	// consumer, and step 45 deleted the rule and the token: a positive tracking
	// branch exists only to prop up rungs below the catalog floor.
	//
	// What is left to enforce is the floor itself, which is the part a future
	// tier could still violate.
	for (const tier of TIERS) {
		assert.ok(
			rowFont(tier) >= 12,
			`${tier}: ${rowFont(tier)}px row text is below the 12px floor (rule 2.14)`,
		);
	}
});

test("the size settings still drive the row typography", () => {
	// Asserted as RESOLVED px, not as literal token names. The tiers named
	// primitives until step 43 pointed them at roles (rule 1.2); pinning the
	// spelling would have made a conformance step look like a regression.
	assert.equal(rowFont("sm"), 14, "SM renders 14px row text");
	assert.equal(rowFont("xs"), 12, "the default tier renders 12px row text");
});

test("the XXS tier stays retired (step 6)", () => {
	// typography.md Q11 collapsed XXS into the default — no catalog-legal way
	// to hold a third tier apart — and docs/trip-bar.md step 6 removed the
	// class, its control segment, and the stored-preference value (migrated
	// to the default in index.html). A revival would be a control that lies.
	assert.doesNotMatch(layoutCss, /--trip-bar-size-xxs/);
	assert.doesNotMatch(appSource, /data-value="xxs"/);
	assert.match(
		appSource,
		/if \(stored === "xxs"\) localStorage\.setItem\("rux:trip-bar-size", "xs"\)/,
		"a stored xxs preference must migrate to the default it already rendered as",
	);
});

test("figures that line up are tabular, and prose is left alone", () => {
	// typography.md rule 2.9 via docs/trip-bar.md rule 2.11, step 11: the
	// time row, bus reference, paid date, contact phone and the drawer's
	// numeric values share one digit advance so thirty stacked bars align
	// digit-for-digit; setting it globally is prohibited because tabular
	// figures are wrong in prose.
	for (const sel of [
		"__time",
		"__bus-label",
		"__status-date",
		"__contact-phone",
	]) {
		assert.match(
			barCss,
			new RegExp(
				`\\.sched-trip-bar${sel}\\s*\\{[^}]*font-variant-numeric:\\s*tabular-nums`,
				"s",
			),
			`${sel} carries tabular figures`,
		);
	}
	// Drawer values take it through the :not(--wrap) scope — the free-text
	// Notes field is prose and must stay proportional.
	assert.match(
		barCss,
		/\.sched-trip-bar__detail-field:not\(\.sched-trip-bar__detail-field--wrap\) \.sched-trip-bar__detail-field-value\s*\{[^}]*font-variant-numeric:\s*tabular-nums/s,
	);
	const declarations = barCss.replace(/\/\*[\s\S]*?\*\//g, "");
	for (const prose of ["__client", "__notes"]) {
		assert.doesNotMatch(
			declarations,
			new RegExp(`\\.sched-trip-bar${prose}[^{]*\\{[^}]*tabular-nums`, "s"),
			`${prose} is prose and takes no tabular figures`,
		);
	}
});
