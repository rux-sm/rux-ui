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
const ruxTokens = await readFile(
	new URL("../rux-ui/css/tokens.css", import.meta.url),
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
	const m = barCss.match(
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

const TIERS = ["xxs", "xs", "sm"];
const rowFont = (t) => pxFor(t, "--sched-trip-bar-row-font-size");
const rowLine = (t) => pxFor(t, "--sched-trip-bar-row-line-height");
const pillFont = (t) => pxFor(t, "--sched-trip-bar-bus-label-font-size");
const pillBox = (t) => pxFor(t, "--sched-trip-bar-bus-label-height");
const pillLine = (t) => pxFor(t, "--sched-trip-bar-bus-label-line-height");

test("the bus pill states rungs instead of deriving them", () => {
	// The regression this replaces: size, leading and box each came from a
	// separate clamp() over a different term, so none landed on the scale, two
	// resolved fractional (10.2px, 11.9px), and the box was computed from a
	// term the text never saw — so it clipped its own glyphs.
	for (const tier of TIERS) {
		for (const prop of [
			"--sched-trip-bar-bus-label-font-size",
			"--sched-trip-bar-bus-label-height",
			"--sched-trip-bar-bus-label-line-height",
		]) {
			const raw = valueOf(tier, prop);
			assert.doesNotMatch(
				raw,
				/clamp\(|calc\(/,
				`${tier}: ${prop} is derived ("${raw}"); it must name a rung`,
			);
		}
	}
});

test("the bus pill never grows the row it sits in", () => {
	// The collapsed bar height is row-line-height x visible-row-count, so a
	// pill taller than its own row would silently blow that budget. Equal is
	// allowed: at XXS the pill fills the row exactly, which is that tier's
	// stated cost for legible text.
	for (const tier of TIERS) {
		assert.ok(
			pillBox(tier) <= rowLine(tier),
			`${tier}: pill ${pillBox(tier)}px must fit a ${rowLine(tier)}px row`,
		);
	}
});

test("the bus pill's box fits its own leading", () => {
	// The box and the text used to come from different expressions. They do not
	// any more, and this is what keeps them together.
	for (const tier of TIERS) {
		assert.equal(
			pillBox(tier),
			pillLine(tier),
			`${tier}: pill box ${pillBox(tier)}px and leading ${pillLine(tier)}px must agree`,
		);
	}
});

test("the bus pill is never louder than the row text beside it", () => {
	// Where size cannot separate them — XXS has no room for two legible sizes —
	// weight does, per rule 2.3. What is forbidden is the pill being *bigger*.
	const pillWeight = schedTokens.match(
		/--sched-trip-bar-bus-label-weight:\s*var\((--rux-weight-\d+)\)/,
	);
	assert.ok(pillWeight, "the pill weight must name a --rux-weight-* rung");
	for (const tier of TIERS) {
		assert.ok(
			pillFont(tier) <= rowFont(tier),
			`${tier}: pill text ${pillFont(tier)}px must not exceed the ${rowFont(tier)}px row text`,
		);
		if (pillFont(tier) === rowFont(tier)) {
			assert.notEqual(
				pillWeight[1],
				"--rux-weight-400",
				`${tier}: pill matches the row size, so its weight must differ from the row's 400`,
			);
		}
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
		assert.ok(
			pillFont(tier) >= 12,
			`${tier}: ${pillFont(tier)}px pill text is below the 12px floor (rule 2.14)`,
		);
	}
});

test("the size settings still drive the row typography", () => {
	// Asserted as RESOLVED px, not as literal token names. The tiers named
	// primitives until step 43 pointed them at roles (rule 1.2); pinning the
	// spelling would have made a conformance step look like a regression.
	assert.equal(rowFont("sm"), 14, "SM renders 14px row text");
	assert.equal(rowFont("xs"), 12, "the default tier renders 12px row text");

	// XXS is deliberately equal to the default now, and that is Q11's answer
	// rather than a bug: no departures are allowed, 11px has no rung in the
	// catalog, and the catalog publishes exactly ONE leading at 12. There is no
	// catalog-legal way to keep a third tier apart on size or leading, so the
	// tier survives as a no-op class and its 25% density gain is gone.
	assert.equal(rowFont("xxs"), rowFont("xs"), "XXS collapsed into the default tier (Q11)");
	assert.equal(rowLine("xxs"), rowLine("xs"), "XXS collapsed into the default tier (Q11)");
});
