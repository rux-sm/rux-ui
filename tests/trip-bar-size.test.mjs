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

// Resolve a --rux-* primitive to px. Only primitives are resolved: the point of
// step 30 is that the trip bar states rungs, so anything else is a failure.
function pxOf(name) {
	const raw = ruxTokens.match(new RegExp(`${name}:\\s*([\\d.]+)(rem|px)`));
	assert.ok(raw, `${name} not found in rux-ui/css/tokens.css`);
	return raw[2] === "rem" ? Number(raw[1]) * ROOT_FONT_PX : Number(raw[1]);
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

test("type below 14px carries the dense tracking rung (rule 2.14)", () => {
	for (const tier of TIERS) {
		if (rowFont(tier) >= 14) continue;
		const raw = valueOf(tier, "--sched-trip-bar-row-tracking");
		assert.match(
			raw,
			/--rux-tracking-dense/,
			`${tier}: ${rowFont(tier)}px row text must carry --rux-tracking-dense`,
		);
	}
});

test("the size settings still drive the row typography", () => {
	assert.match(
		schedTokens,
		/--sched-trip-bar-row-font-size:\s*var\(--rux-size-12\)/,
	);
	// The tier is the scheduler's own modifier name and keeps its t-shirt
	// label — step 31 renamed the rux- vocabulary, not a consumer's namespace.
	for (const [tier, size] of [
		["xxs", "11"],
		["sm", "14"],
	]) {
		assert.match(
			barCss,
			new RegExp(
				`\\.sched-scheduler--trip-bar-size-${tier}\\s*\\{[^}]*--sched-trip-bar-row-font-size:\\s*var\\(--rux-size-${size}\\)`,
				"s",
			),
		);
	}
});
