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

function pxOf(name) {
	const raw = ruxTokens.match(new RegExp(`${name}:\\s*([\\d.]+)(rem|px)`));
	assert.ok(raw, `${name} not found in rux-ui/css/tokens.css`);
	return raw[2] === "rem" ? Number(raw[1]) * ROOT_FONT_PX : Number(raw[1]);
}

// What each "Trip bar size" setting resolves the two row drivers to. XS is the
// unmodified default in scheduler/css/tokens.css; XXS and SM are the two
// .sched-scheduler--trip-bar-size-* override blocks in trip-bar.css.
const TIERS = {
	xxs: { font: pxOf("--rux-size-xxs"), line: pxOf("--rux-line-height-xxs") },
	xs: { font: pxOf("--rux-size-xs"), line: pxOf("--rux-line-height-xs") },
	sm: { font: pxOf("--rux-size-sm"), line: pxOf("--rux-line-height-sm") },
};

// Pull a clamp(floor, calc(<driver> * k | <driver> - n), cap) token out of the
// stylesheet and turn it into a function of the tier.
function clampToken(name) {
	const body = barCss.match(
		new RegExp(`${name}:\\s*clamp\\(([\\s\\S]*?)\\);`),
	);
	assert.ok(body, `${name} is not a clamp() in trip-bar.css`);
	const [floor, preferred, cap] = body[1]
		.split(",")
		.map((part) => part.trim());

	const driver = preferred.includes("row-font-size") ? "font" : "line";
	const scale = preferred.match(/\*\s*([\d.]+)/);
	const offset = preferred.match(/-\s*([\d.]+)px/);

	return (tier) => {
		const base = TIERS[tier][driver];
		const value = scale
			? base * Number(scale[1])
			: base - Number(offset[1]);
		return Math.min(
			Math.max(value, Number.parseFloat(floor)),
			Number.parseFloat(cap),
		);
	};
}

const pillFont = clampToken("--sched-trip-bar-bus-label-font-size");
const pillHeight = clampToken("--sched-trip-bar-bus-label-height");

test("the bus pill changes size at every trip-bar size setting", () => {
	// The regression: the font tracked line-height x 0.625 with a 10px floor
	// and the height tracked line-height - 4px with a 12px floor, so XXS and
	// XS both resolved to a 12px-tall pill with 10px text — two of the three
	// settings produced an identical pill and the control looked broken.
	const fonts = ["xxs", "xs", "sm"].map(pillFont);
	const heights = ["xxs", "xs", "sm"].map(pillHeight);

	assert.equal(
		new Set(fonts).size,
		3,
		`pill font must differ per tier, got ${fonts.join(" / ")}px`,
	);
	assert.equal(
		new Set(heights).size,
		3,
		`pill height must differ per tier, got ${heights.join(" / ")}px`,
	);
	// And it has to move in the same direction as the text beside it.
	assert.ok(fonts[0] < fonts[1] && fonts[1] < fonts[2]);
	assert.ok(heights[0] < heights[1] && heights[1] < heights[2]);
});

test("the bus pill never grows the row it sits in", () => {
	// The collapsed bar height is row-line-height x visible-row-count, so a
	// pill taller than its own row would silently blow that budget.
	for (const tier of ["xxs", "xs", "sm"]) {
		assert.ok(
			pillHeight(tier) < TIERS[tier].line,
			`${tier}: pill ${pillHeight(tier)}px must fit a ${TIERS[tier].line}px row`,
		);
	}
});

test("the bus pill stays quieter than the row text beside it", () => {
	for (const tier of ["xxs", "xs", "sm"]) {
		assert.ok(
			pillFont(tier) < TIERS[tier].font,
			`${tier}: pill text ${pillFont(tier)}px must sit under the ${TIERS[tier].font}px row text`,
		);
	}
});

test("the size settings still drive the row typography", () => {
	assert.match(
		schedTokens,
		/--sched-trip-bar-row-font-size:\s*var\(--rux-size-xs\)/,
	);
	for (const [tier, size] of [
		["xxs", "xxs"],
		["sm", "sm"],
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
