import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const tokens = read("rux-ui/css/tokens.css");
const menuStyles = read("rux-ui/css/base/menu.css");
const schedulerStyles = read("scheduler/css/layout/scheduler-app.css");
const manifestStyles = read("scheduler/css/features/trip-manifest.css");
const drawerController = read("rux-ui/js/drawer.js");
const reducedMotionStyles = read("rux-ui/css/base/utils.css");
const motionDocs = read("docs/motion.md");

test("productive motion foundations use the Rux token namespace", () => {
	assert.match(tokens, /--rux-motion-duration-fast-01:\s+70ms;/);
	assert.match(tokens, /--rux-motion-duration-fast-02:\s+110ms;/);
	assert.match(tokens, /--rux-motion-duration-moderate-01:\s+150ms;/);
	assert.match(tokens, /--rux-motion-duration-moderate-02:\s+240ms;/);
	assert.match(
		tokens,
		/--rux-motion-easing-standard-productive:\s+cubic-bezier\(0\.2, 0, 0\.38, 0\.9\);/,
	);
	assert.match(
		tokens,
		/--rux-motion-easing-entrance-productive:\s+cubic-bezier\(0, 0, 0\.38, 0\.9\);/,
	);
	assert.match(
		tokens,
		/--rux-motion-easing-exit-productive:\s+cubic-bezier\(0\.2, 0, 1, 0\.9\);/,
	);
	assert.doesNotMatch(tokens, /--cds-/);
});

test("structural panels use 150ms entrance and exit contracts", () => {
	assert.match(
		tokens,
		/--rux-panel-motion-duration:\s+var\(--rux-motion-duration-moderate-01\);/,
	);
	assert.match(
		schedulerStyles,
		/width var\(--rux-panel-motion-duration\) var\(--rux-panel-enter-easing\)/,
	);
	assert.match(
		schedulerStyles,
		/width var\(--rux-panel-motion-duration\) var\(--rux-panel-exit-easing\)/,
	);
	assert.match(
		schedulerStyles,
		/scheduler-mobile-drawer-in[\s\S]*?var\(--rux-panel-enter-easing\)/,
	);
	assert.match(
		schedulerStyles,
		/scheduler-mobile-drawer-out[\s\S]*?var\(--rux-panel-exit-easing\)/,
	);
	assert.match(
		manifestStyles,
		/\.rux-scope-manifest__passenger-panel\.is-open[\s\S]*?var\(--rux-panel-enter-easing\)/,
	);
	assert.match(
		drawerController,
		/if \(!isMobile\) \{\s*drawer\.classList\.add\("is-collapsing"\);/,
	);
});

test("drawer closing always releases interaction and settles its state", () => {
	const page = read("index.html");
	assert.match(
		schedulerStyles,
		/\.scheduler-app__drawer\.is-closing\s*\{[^}]*pointer-events:\s*none;/s,
	);
	assert.match(drawerController, /function completeAfterMotion\(/);
	assert.match(drawerController, /const cancelEvent = type \+ "cancel";/);
	assert.match(drawerController, /motionCompletionMs\(target, type, expectedName\)/);
	assert.match(drawerController, /Math\.ceil\(completionMs\) \+ MOTION_COMPLETION_BUFFER_MS/);
	assert.match(drawerController, /cancelPendingClose\?\.\(\);/);
	// The awaited animation name is configured by the application now; the
	// portable module only guarantees it waits for whichever name it is given.
	assert.match(
		drawerController,
		/env\.closeAnimation,\s*\(\) => drawer\.classList\.remove\("is-closing"\)/,
	);
	assert.match(page, /closeAnimation:\s*"scheduler-mobile-drawer-out"/);
});

test("panel splitters resize directly without inherited motion", () => {
	assert.match(
		schedulerStyles,
		/\.scheduler-app__drawer\.is-open\.is-resizing,[\s\S]*?transition:\s*none;/,
	);
	assert.match(drawerController, /addEventListener\("pointerdown"/);
	assert.match(drawerController, /setPointerCapture\(e\.pointerId\)/);
	assert.match(drawerController, /getBoundingClientRect\(\)\.width/);
	assert.doesNotMatch(drawerController, /HANDLE_DRAG_THRESHOLD|addEventListener\("mousedown"/);
	assert.doesNotMatch(drawerController, /closeThreshold/);
	assert.match(
		schedulerStyles,
		/\.scheduler-app__resize-gutter\s*\{[^}]*display:\s*none;/s,
	);
	assert.match(
		schedulerStyles,
		/\.scheduler-app__drawer\.is-open:not\(\.is-collapsing\) \+ \.scheduler-app__resize-gutter,[\s\S]*?display:\s*block;/,
	);
	assert.match(
		motionDocs,
		/Pointer\s+movement updates the panel width one-to-one with no transition/,
	);
	assert.match(motionDocs, /separator is present only while its panel is open/);
});

test("button disclosures use an immediate state-driven close icon swap", () => {
	const controlStyles = read("rux-ui/css/base/controls.css");
	const shellController = read("rux-ui/js/ui-shell.js");
	const page = read("index.html");

	assert.match(
		tokens,
		/--rux-button-icon-swap-duration:\s+0ms;/,
	);
	assert.match(
		tokens,
		/--rux-button-icon-swap-easing:\s+var\(--rux-motion-easing-standard-productive\);/,
	);
	assert.match(controlStyles, /\.rux-button__icon-swap > \*\s*\{[\s\S]*?opacity var\(--rux-button-icon-swap-duration\)/);
	assert.match(
		controlStyles,
		/\.rux-button\[aria-expanded="true"\] \.rux-button__icon--expanded/,
	);
	assert.match(page, /class="rux-button__icon-swap"/);
	assert.match(page, /rux-button__icon--expanded/);
	assert.match(controlStyles, /\.rux-button__icon-swap\s*\{[^}]*width:\s*var\(--_icon-size\);[^}]*height:\s*var\(--_icon-size\);/s);
	assert.match(shellController, /const legacyIcon = toggle\.querySelector\(":scope > \.rux-icon"\)/);
});

test("the UI-shell side navigation uses a fixed-coordinate 110ms reveal", () => {
	assert.match(
		tokens,
		/--rux-side-nav-motion-duration:\s+var\(--rux-motion-duration-fast-02\);/,
	);
	assert.match(
		tokens,
		/--rux-side-nav-enter-easing:\s+var\(--rux-motion-easing-exit-productive\);/,
	);
	assert.match(schedulerStyles, /clip-path:\s*inset\(0 100% 0 0\);/);
	assert.match(schedulerStyles, /\.scheduler-app__side-nav\.is-open\s*\{[^}]*clip-path:\s*inset\(0\);/s);
	assert.match(schedulerStyles, /inset-inline-start:\s*min\(var\(--rux-side-nav-width\), 100%\);/);
	assert.doesNotMatch(schedulerStyles, /margin-inline-end:\s*calc\(-1 \* var\(--rux-side-nav-width\)\)/);
	assert.match(motionDocs, /panel remains an overlay at every viewport/);
	assert.match(
		schedulerStyles,
		/opacity var\(--rux-side-nav-scrim-enter-duration\)[\s\S]*?var\(--rux-side-nav-scrim-enter-delay\)/,
	);
	assert.match(motionDocs, /remains at its final coordinates and full opacity/);
	assert.match(motionDocs, /disappears\s+immediately when closing begins/);
});

test("menus use the fast productive contract with directional placement", () => {
	assert.match(
		tokens,
		/--rux-menu-motion-duration:\s+var\(--rux-motion-duration-fast-02\);/,
	);
	assert.match(
		menuStyles,
		/opacity var\(--rux-menu-motion-duration\) var\(--rux-menu-enter-easing\)/,
	);
	assert.match(
		menuStyles,
		/opacity var\(--rux-menu-motion-duration\) var\(--rux-menu-exit-easing\)/,
	);
	assert.match(menuStyles, /display var\(--rux-menu-motion-duration\) allow-discrete/);
	assert.match(menuStyles, /@starting-style/);
	for (const placement of ["top", "left", "right"]) {
		assert.match(menuStyles, new RegExp(`data-placement\\^="${placement}"`));
	}
});

test("motion remains optional for accessibility and documented centrally", () => {
	assert.match(reducedMotionStyles, /@media \(prefers-reduced-motion: reduce\)/);
	assert.match(reducedMotionStyles, /animation-duration:\s*0\.001ms !important;/);
	assert.match(reducedMotionStyles, /transition-duration:\s*0\.001ms !important;/);
	assert.match(motionDocs, /# Productive Motion/);
	assert.match(motionDocs, /Opening uses the entrance curve/);
	assert.match(motionDocs, /Repeated toggling cannot leave stale open/);
});
