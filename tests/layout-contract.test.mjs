import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const shellCss = read("rux-ui/css/base/app-shell.css");
const headerCss = read("rux-ui/css/base/ui-header.css");
const sideNavCss = read("rux-ui/css/base/side-nav.css");
const tokensCss = read("rux-ui/css/tokens.css");
const ruxCss = read("rux-ui/css/rux.css");
const coreCss = read("rux-ui/css/rux-core.css");
const componentsCss = read("scheduler/css/components.css");
const schedulerLayoutCss = read("scheduler/css/layout/scheduler-app.css");
const exampleHtml = read("examples/app-layout.html");
const layoutDocs = read("docs/layout-composition.md");
const skillDocs = read(".claude/skills/rux-design/SKILL.md");

test("the reusable app shell keeps structural siblings attached", () => {
	const rulesOnly = shellCss.replace(/\/\*[\s\S]*?\*\//g, "");
	assert.match(shellCss, /\.rux-app__body\s*\{[^}]*\bgap:\s*0;/s);
	assert.match(shellCss, /\.rux-app__body\s*\{[^}]*overflow:\s*hidden;/s);
	assert.match(shellCss, /\.rux-app-view\s*\{[^}]*flex:\s*1;/s);
	assert.match(shellCss, /\.rux-app-view\s*\{[^}]*overflow:\s*hidden;/s);
	assert.match(shellCss, /\.rux-app-view\[hidden\]\s*\{[^}]*display:\s*none;/s);
	// Deprecated pre-rename names stay published until vendored consumers
	// migrate (see the DEPRECATED block in app-shell.css).
	assert.match(shellCss, /\.rux-app-shell\s*\{[^}]*\bgap:\s*0;/s);
	assert.match(shellCss, /\.rux-app-shell__workspace\s*\{[^}]*flex:\s*1 1 auto;/s);
	assert.match(shellCss, /\.rux-app-shell__workspace\s*\{[^}]*min-width:\s*0;/s);
	assert.doesNotMatch(rulesOnly, /scheduler|drawer|rail|471px/);
});

test("the design-system entrypoint owns the app shell for every consumer", () => {
	// rux.css is the single entrypoint: it, and only it, imports the base
	// layer. rux-core.css stays a working name by forwarding to it, and the
	// scheduler bundle must not re-import the base files on top (that
	// duplicate list is what this consolidation removed).
	assert.match(ruxCss, /@import "\.\/base\/app-shell\.css(\?v=\d+)?";/);
	assert.match(coreCss, /@import "\.\/rux\.css";/);
	assert.doesNotMatch(componentsCss, /@import "\.\.\/\.\.\/rux-ui\/css\/base\//);
});

test("the UI header owns the canonical fixed 40px contract", () => {
	const headerTokenSection = tokensCss.match(
		/COMPONENT · UI header[\s\S]*?COMPONENT · side navigation/,
	)?.[0] ?? "";
	assert.match(tokensCss, /--rux-ui-header-height:\s+40px;/);
	assert.match(
		tokensCss,
		/--rux-ui-header-min-height:\s+var\(--rux-ui-header-height\);/,
	);
	assert.match(tokensCss, /--rux-shell-ui-header-gap:/);
	assert.match(headerCss, /height:\s*var\(--rux-ui-header-height\);/);
	assert.match(headerCss, /min-height:\s*var\(--rux-ui-header-min-height\);/);
	assert.match(headerCss, /\.rux-ui-header::after\s*\{[^}]*border-bottom:\s*var\(--rux-ui-header-border\);/s);
	/* No rival header *block* may live in this file. A modifier such as
	   .rux-button--header is another block varying itself for header context,
	   not a competing header component, so it is allowed. */
	const rivalHeaderBlocks = [...headerCss.matchAll(/\.rux-[\w-]*header[\w-]*/g)]
		.map(([selector]) => selector)
		.filter((selector) => !selector.startsWith(".rux-ui-header") && !selector.includes("--"));
	assert.deepEqual(rivalHeaderBlocks, [], `rival header blocks in ui-header.css:\n${rivalHeaderBlocks.join("\n")}`);
	assert.ok(
		[...headerTokenSection.matchAll(/^\s*(--rux-[\w-]+):/gm)].every(
			([, token]) => token.startsWith("--rux-ui-header"),
		),
	);
});

test("the design-system entrypoint uses the canonical UI-header stylesheet", () => {
	assert.match(ruxCss, /@import "\.\/base\/ui-header\.css";/);
	assert.match(coreCss, /@import "\.\/rux\.css";/);
});

test("side navigation remains a reusable product-navigation primitive", () => {
	const rootRule = sideNavCss.match(/\.rux-side-nav\s*\{[^}]*\}/s)?.[0] ?? "";
	assert.match(sideNavCss, /\.rux-side-nav\s*\{/);
	assert.match(sideNavCss, /\.rux-side-nav__link\[aria-current="page"\]/);
	assert.doesNotMatch(sideNavCss, /scheduler|500px/);
	assert.doesNotMatch(rootRule, /position:\s*(?:fixed|absolute)/);
});

test("side navigation uses productive non-persistent overlay motion", () => {
	const sideNavMotionRules = schedulerLayoutCss.match(
		/\/\* — Product side navigation — \*\/[\s\S]*?@media \(max-width: 500px\)/,
	)?.[0] ?? "";

	assert.match(tokensCss, /--rux-motion-duration-moderate-02:\s+240ms;/);
	assert.match(tokensCss, /--rux-motion-duration-moderate-01:\s+150ms;/);
	assert.match(
		tokensCss,
		/--rux-duration-productive:\s+var\(--rux-motion-duration-moderate-01\);/,
	);
	assert.match(
		tokensCss,
		/--rux-side-nav-motion-duration:\s+var\(--rux-motion-duration-fast-02\);/,
	);
	assert.match(
		tokensCss,
		/--rux-motion-easing-entrance-productive:\s+cubic-bezier\(0, 0, 0\.38, 0\.9\);/,
	);
	assert.match(
		tokensCss,
		/--rux-motion-easing-exit-productive:\s+cubic-bezier\(0\.2, 0, 1, 0\.9\);/,
	);
	assert.match(
		tokensCss,
		/--rux-side-nav-enter-easing:\s+var\(--rux-motion-easing-exit-productive\);/,
	);
	assert.match(
		sideNavMotionRules,
		/clip-path var\(--rux-side-nav-motion-duration\) var\(--rux-side-nav-enter-easing\)/,
	);
	assert.match(
		sideNavMotionRules,
		/clip-path var\(--rux-side-nav-motion-duration\) var\(--rux-side-nav-exit-easing\)/,
	);
	assert.match(sideNavMotionRules, /clip-path:\s*inset\(0 100% 0 0\);/);
	assert.match(sideNavMotionRules, /\.scheduler-app__side-nav\.is-open\s*\{[^}]*clip-path:\s*inset\(0\);/s);
	assert.doesNotMatch(sideNavMotionRules, /translateX/);
	assert.match(tokensCss, /--rux-side-nav-scrim-opacity:\s+0\.65;/);
	assert.match(tokensCss, /--rux-side-nav-scrim-enter-duration:\s+200ms;/);
	assert.match(
		tokensCss,
		/--rux-side-nav-scrim-enter-delay:\s+var\(--rux-motion-duration-fast-01\);/,
	);
	assert.match(tokensCss, /--rux-side-nav-scrim-exit-duration:\s+0ms;/);
	assert.match(
		sideNavMotionRules,
		/opacity var\(--rux-side-nav-scrim-enter-duration\)[\s\S]*?var\(--rux-side-nav-scrim-enter-delay\)/,
	);
	assert.doesNotMatch(sideNavMotionRules, /margin-inline-end|flex:\s*0 0 var\(--rux-side-nav-width\)/);
	assert.doesNotMatch(sideNavMotionRules, /\.scheduler-app__side-nav-scrim\s*\{[^}]*display:\s*none;/s);
	assert.match(
		layoutDocs,
		/Header-triggered navigation SHOULD overlay the application body without\s+resizing the active workspace/,
	);
	assert.match(
		schedulerLayoutCss,
		/@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*1ms;/,
	);
});

test("Calendar workspace is inset while tools remain full-bleed", () => {
	assert.match(
		schedulerLayoutCss,
		/--calendar-workspace-frame-inset-block:\s+0 var\(--rux-space-5\);/,
	);
	assert.match(
		schedulerLayoutCss,
		/--calendar-workspace-frame-inset-inline:\s+var\(--rux-space-5\);/,
	);
	assert.match(
		schedulerLayoutCss,
		/\.rux-app-view\[data-view="calendar"\]\s*\{[^}]*border:\s*var\(--calendar-workspace-frame-border\);[^}]*padding:\s*var\(--calendar-workspace-padding\);/s,
	);
	assert.match(
		schedulerLayoutCss,
		/\.rux-app-view\[data-view="calendar"\] > \.rux-workspace\s*\{[^}]*margin-block:\s*var\(--calendar-workspace-frame-inset-block\);[^}]*margin-inline-start:\s*var\(--calendar-workspace-frame-inset-inline\);[^}]*margin-inline-end:\s*0;/s,
	);
	assert.match(
		schedulerLayoutCss,
		/:not\(\s*:has\(> #right-panel-drawer\.is-open:not\(\.is-collapsing\)\)\s*\) > \.rux-workspace\s*\{[^}]*margin-inline-end:\s*var\(--calendar-workspace-frame-inset-inline\);/s,
	);
	assert.match(
		schedulerLayoutCss,
		/\.rux-app-view\[data-view="calendar"\] \.sched-scope-right-panel\s*\{[^}]*border-inline-start:\s*var\(--rux-panel-right-border\);/s,
	);
	assert.match(
		schedulerLayoutCss,
		/@media \(max-width: 500px\)[\s\S]*?\.rux-app-view\[data-view="calendar"\] > \.rux-workspace\s*\{[^}]*margin:\s*0;/,
	);
	assert.match(
		layoutDocs,
		/resize channel owns the single visual gutter\s+between them/,
	);
});

test("mobile Calendar reserves the fixed toolbar's full rendered height", () => {
	assert.match(
		schedulerLayoutCss,
		/--_mobile-toolbar-height:\s*calc\([\s\S]*?var\(--rux-button-height-header\)[\s\S]*?var\(--rux-space-4\)[\s\S]*?var\(--rux-space-2\)[\s\S]*?var\(--rux-border-width\)[\s\S]*?env\(safe-area-inset-bottom, 0px\)[\s\S]*?\);/,
	);
	assert.match(
		schedulerLayoutCss,
		/\.rux-app-view\[data-view="calendar"\] \.rux-workspace__toolbar\s*\{[^}]*min-height:\s*var\(--_mobile-toolbar-height\);/s,
	);
	assert.match(
		schedulerLayoutCss,
		/\.rux-app-view\[data-view="calendar"\] \.calendar-app__viewport\s*\{[^}]*padding-bottom:\s*var\(--_mobile-toolbar-height\);/s,
	);
});

test("the canonical example contains the required accessible composition", () => {
	assert.match(exampleHtml, /class="rux-app"/);
	assert.match(exampleHtml, /class="rux-app__body"/);
	assert.match(exampleHtml, /class="rux-workspace"/);
	assert.equal((exampleHtml.match(/class="rux-panel example-panel"/g) ?? []).length, 1);
	assert.match(exampleHtml, /aria-current="page"/);
	assert.match(exampleHtml, /class="rux-ui-header"/);
	assert.match(exampleHtml, /class="rux-side-nav example-navigation"/);
	assert.match(exampleHtml, /aria-label="Primary Navigation"/);
	assert.match(exampleHtml, /data-rux-side-nav-toggle/);
	assert.match(exampleHtml, /data-rux-side-nav-scrim/);
	assert.doesNotMatch(exampleHtml, /margin-inline-end:\s*calc\(-1 \* var\(--rux-side-nav-width\)\)/);
	assert.match(exampleHtml, /aria-label="Calendar Tools"/);
	assert.doesNotMatch(exampleHtml, /role="dialog"/);
});

test("panel cards in the reference are composed through panel panes", () => {
	assert.equal((exampleHtml.match(/class="rux-panel__body"/g) ?? []).length, 1);
	assert.ok((exampleHtml.match(/class="rux-panel__pane"/g) ?? []).length >= 1);
	assert.doesNotMatch(exampleHtml, /class="rux-panel__body">\s*<(?:article|section) class="rux-card/);
});

test("human and agent guidance route to the canonical layout contract", () => {
	assert.match(layoutDocs, /A panel MUST have an identifiable purpose/);
	assert.match(layoutDocs, /UI header to app shell \| `0`/);
	assert.match(skillDocs, /docs\/layout-composition\.md/);
});
