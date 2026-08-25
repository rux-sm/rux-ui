import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
const drawer = await readFile(
	new URL("../rux-ui/js/drawer.js", import.meta.url),
	"utf8",
);

// Every workspace-header control that opens a side panel.
const TOGGLES = [
	"calendar-app__panel-toggle",
	"fleet-tools-toggle-btn",
	"driver-tools-toggle-btn",
];

function buttonFor(marker) {
	const at = page.indexOf(marker);
	assert.notEqual(at, -1, `${marker} not found`);
	const start = page.lastIndexOf("<button", at);
	return page.slice(start, page.indexOf("</button>", at));
}

test("every panel toggle is the same ghost button", () => {
	// --lg was required here until 2026-08-24, when the owner settled that
	// every ghost outside the UI header takes the standard 32px so the
	// emphasis has one height. The point of this test is unchanged — the
	// three toggles must be the SAME button — so it now pins the standard
	// size by forbidding a size modifier rather than requiring one.
	for (const marker of TOGGLES) {
		const button = buttonFor(marker);
		for (const cls of ["rux-button--ghost", "rux-button--icon"]) {
			assert.match(button, new RegExp(cls), `${marker} is missing ${cls}`);
		}
		assert.doesNotMatch(
			button,
			/rux-button--(?:lg|sm)/,
			`${marker} must take the standard 32px height, not a size modifier`,
		);
	}
});

test("no panel toggle uses the filled selected treatment", () => {
	// .rux-button--toggle[aria-pressed="true"] paints
	// --rux-button-selected-background, which is the accent fill — a solid blue
	// block in a workspace header. Fleet and Drivers shipped that way while
	// Calendar did not; the open/closed cue is the swapped glyph instead.
	for (const marker of TOGGLES) {
		assert.doesNotMatch(
			buttonFor(marker),
			/rux-button--toggle/,
			`${marker} must not carry the filled toggle treatment`,
		);
		assert.doesNotMatch(
			buttonFor(marker),
			/rux-button--default|rux-button--accent/,
			`${marker} must not carry a filled variant`,
		);
	}
});

test("every panel toggle states open/closed the same way", () => {
	for (const marker of TOGGLES) {
		const button = buttonFor(marker);
		assert.match(
			button,
			/aria-expanded="(true|false)"/,
			`${marker} needs aria-expanded`,
		);
		assert.match(
			button,
			/data-panel-toggle-icon/,
			`${marker} needs the glyph RuxDrawer swaps`,
		);
		// Two icons swapped in CSS is the .rux-button--toggle pattern; these
		// carry one glyph whose text the drawer rewrites.
		assert.doesNotMatch(button, /icon-off|icon-on/, `${marker} has two icons`);
	}
});

test("the drawer owns the glyph swap for every toggle", () => {
	assert.match(drawer, /\[data-panel-toggle-icon\]/);
	assert.match(drawer, /\$\{edge\}_panel_\$\{open \? "close" : "open"\}/);
	assert.match(drawer, /syncToggle: syncToggleButton/);
	// Both return paths — a drawer without a resize handle still has a toggle.
	assert.equal(
		(drawer.match(/syncToggle: syncToggleButton/g) ?? []).length,
		2,
	);
});

test("state set outside open()/close() still syncs the toggle", () => {
	// applyDefaultPanelState() manipulates the drawer's classes directly, so
	// syncToggleButton never runs from it — the calendar toggle would keep a
	// stale glyph and aria-expanded on first layout without this.
	const block = page.slice(page.indexOf("function applyDefaultPanelState"));
	assert.match(block.slice(0, 2000), /rightDrawerHandle\.syncToggle\(false\)/);
	assert.match(block.slice(0, 2000), /rightDrawerHandle\.syncToggle\(true\)/);
});
