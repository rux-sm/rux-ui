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
const drawerCss = read("rux-ui/css/base/drawer.css");
const exampleHtml = read("examples/app-layout.html");
// Promoted 2026-08-23 (composition.md step 8); the old path is a stub.
const layoutDocs = read("docs/foundations/shell.md");
const layoutFoundation = read("docs/foundations/layout.md");
const skillDocs = read(".claude/skills/rux-design/SKILL.md");

test("the reusable app shell keeps structural siblings attached", () => {
	const rulesOnly = shellCss.replace(/\/\*[\s\S]*?\*\//g, "");
	assert.match(shellCss, /\.rux-app__body\s*\{[^}]*\bgap:\s*0;/s);
	assert.match(shellCss, /\.rux-app__body\s*\{[^}]*overflow:\s*hidden;/s);
	assert.match(shellCss, /\.rux-app-view\s*\{[^}]*flex:\s*1;/s);
	assert.match(shellCss, /\.rux-app-view\s*\{[^}]*overflow:\s*hidden;/s);
	assert.match(shellCss, /\.rux-app-view\[hidden\]\s*\{[^}]*display:\s*none;/s);
	// .rux-app-shell/__workspace/__panel were removed 2026-08-22 — see
	// docs/portability-audit.md entry 23. The successors are asserted above,
	// so these assertions were deleted rather than repointed. The name must
	// not come back by accident:
	assert.doesNotMatch(shellCss, /\.rux-app-shell\b/);
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

test("the header separates its navigation trigger from its identity block", () => {
	// The left run is [menu] [logo] [title] — navigation, then identity and
	// context. Without a divider the trigger reads as the first icon in a row
	// rather than as the control that opens the module switcher.
	assert.match(
		tokensCss,
		/--rux-ui-header-brand-border-start:\s*var\(--rux-ui-header-border\)/,
		"the divider should reuse the header's own hairline, not its own value",
	);
	assert.match(
		headerCss,
		/\.rux-ui-header__brand\s*\{[^}]*border-inline-start:\s*var\(--rux-ui-header-brand-border-start\)/s,
	);
	// It must not live on the trigger: .rux-button--ghost:hover sets the
	// `border` shorthand to none at (0,4,0) and would erase it on hover.
	assert.doesNotMatch(
		headerCss,
		/\.rux-ui-header__menu\s*\{[^}]*border/s,
	);
	// Narrow screens already drop the brand's other border; this one goes too.
	const narrow = headerCss.match(
		/@media \(max-width: 620px\)\s*\{[\s\S]*?\n\}/,
	)[0];
	assert.match(narrow, /border-inline-start:\s*0/);
});

test("the header's two end sections are framed symmetrically", () => {
	// Menu trigger bounded on its right, profile bounded on its left, wide
	// middle between them. Both rules must be the same hairline, or the two
	// ends of one bar are drawn with different weights.
	for (const token of [
		"--rux-ui-header-brand-border-start",
		"--rux-ui-header-actions-divider",
	]) {
		assert.match(
			tokensCss,
			new RegExp(`${token}:\\s*var\\(--rux-ui-header-border\\)`),
			`${token} should reuse the header's own hairline`,
		);
	}
	// Both ends draw the same edge: the section that follows the line owns it,
	// so the two rules are mirror images rather than two different mechanisms.
	assert.match(
		headerCss,
		/\.rux-ui-header__action-group:last-child\s*\{[^}]*border-inline-start:\s*var\(--rux-ui-header-actions-divider\)/s,
	);
	// :last-child, not :not(:last-child) — the profile keeps exactly one line
	// before it however many groups precede it. Presence was added between the
	// utilities and the profile and must not have introduced a second.
	assert.doesNotMatch(headerCss, /:not\(:last-child\)\s*\{[^}]*border-inline/s);

	// Both drop together on narrow screens — one surviving would be lopsided.
	const narrow = headerCss.match(
		/@media \(max-width: 620px\)\s*\{[\s\S]*?\n\}/,
	)[0];
	assert.equal(
		(narrow.match(/border-inline-start:\s*0/g) ?? []).length,
		2,
		"the brand divider and the profile divider must both drop at 620px",
	);
});

test("a tab-tip popover draws no edge that something else already draws", () => {
	const popoverCss = read("rux-ui/css/base/popover.css");

	// Top: the header's own bottom border sits a pixel above where this
	// surface begins, so drawing a second one is the doubled edge. Erasing it
	// with an overlaid strip cannot work — .rux-popover--surface sets
	// overflow: hidden, which clips any ::before back to the padding box
	// before it can reach the border row.
	assert.match(
		popoverCss,
		/\[data-placement\^="bottom"\]\s*\{[^}]*border-block-start:\s*0/s,
	);
	assert.doesNotMatch(popoverCss, /tab-tip\[data-placement[^\]]*\]::before/);
	assert.match(popoverCss, /overflow:\s*hidden/);

	// Trailing: opt-in, because placement cannot tell you this. Every header
	// popover is bottom-end; only the one anchored to the last control is
	// flush with the viewport and has nothing beyond that border.
	assert.match(
		popoverCss,
		/\.rux-popover--surface\.rux-popover--flush-end\s*\{[^}]*border-inline-end:\s*0/s,
	);
	assert.doesNotMatch(
		popoverCss,
		/\[data-placement="bottom-(end|start)"\]\s*\{[^}]*border-inline/s,
	);
	// Exactly one popover claims it — the flush one.
	const markup = read("index.html");
	assert.equal((markup.match(/rux-popover--flush-end/g) ?? []).length, 1);

	// The surface sits below the header's border, never on it: overlapping
	// would paint over that line across the popover's whole width.
	assert.equal(
		tokensCss.match(/--rux-popover-tab-tip-offset:\s*([^;]+);/)[1].trim(),
		"var(--rux-space-0)",
	);
	// And it must be free to reach a flush-edge trigger, or the seam that
	// trigger's own background opens will not line up with the surface below.
	assert.match(
		popoverCss,
		/\.rux-popover--tab-tip\s*\{[^}]*--rux-popover-viewport-padding:\s*var\(--rux-space-0\)/s,
	);
});

test("a popover surface outlines what it contains", () => {
	// It was `none`, which silently cancelled the border of anything composed
	// inside it: .rux-menu declares --rux-menu-border, but
	// .rux-popover.rux-popover--surface deliberately outranks it to own the
	// container's look — so every menu rendered in a popover had no outline.
	const popoverCss = read("rux-ui/css/base/popover.css");
	assert.doesNotMatch(tokensCss, /--rux-popover-surface-border:\s*none/);
	assert.match(
		tokensCss,
		/--rux-popover-surface-border:\s*1px solid var\(--rux-card-border\)/,
	);
	assert.match(
		popoverCss,
		/border:\s*var\(--rux-popover-surface-border\)/,
	);
	// border-box, or the outline would grow every popover by 2px.
	assert.match(
		popoverCss,
		/\.rux-popover\.rux-popover--surface\s*\{[^}]*box-sizing:\s*border-box/s,
	);
	// A bottom-placed tab-tip omits its top edge instead, so the outline never
	// doubles with the header's own bottom border. See the tab-tip test above.
});

test("an action group with nothing visible in it claims no space", () => {
	// Presence is hidden until someone else joins; without this its group
	// still takes the row's flex gap and leaves a hole beside the profile.
	assert.match(
		headerCss,
		/\.rux-ui-header__action-group:not\(:has\(> :not\(\[hidden\]\)\)\)\s*\{[^}]*display:\s*none/s,
	);
});

test("the UI header owns one canonical fixed height", () => {
	const headerTokenSection = tokensCss.match(
		/COMPONENT · UI header[\s\S]*?COMPONENT · side navigation/,
	)?.[0] ?? "";
	// A fixed px, not min-content — the shell reserves this row and the app
	// body sizes against it. The *value* is a design decision that may move
	// (it has: 40px → 64px, following Geist's taller header bar), so pinning
	// the number here only ever produced a failure that had to be rewritten.
	assert.match(tokensCss, /--rux-ui-header-height:\s+\d+px;/);
	assert.match(
		tokensCss,
		/--rux-ui-header-min-height:\s+var\(--rux-ui-header-height\);/,
	);
	assert.match(tokensCss, /--rux-shell-ui-header-gap:/);
	assert.match(headerCss, /height:\s*var\(--rux-ui-header-height\);/);
	assert.match(headerCss, /min-height:\s*var\(--rux-ui-header-min-height\);/);
	assert.match(headerCss, /\.rux-ui-header::after\s*\{[^}]*border-bottom:\s*var\(--rux-ui-header-border\);/s);
	/* No rival header *block* may live in this file. A modifier such as
	   .rux-button--lg is another block varying itself for header context,
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
	/* The cache-busting ?v= suffix is optional here: the point is that the
	   entrypoint pulls the canonical header stylesheet, not a rival one, and
	   several sibling imports in the same file already carry a version. */
	assert.match(ruxCss, /@import "\.\/base\/ui-header\.css(?:\?v=\d+)?";/);
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
	// The overlay placement recipe is portable now — .rux-side-nav--overlay
	// in rux-ui/css/base/side-nav.css. The app keeps only the mobile width.
	const sideNavMotionRules = sideNavCss.match(
		/\/\* ── Overlay placement \(opt-in\)[\s\S]*$/,
	)?.[0] ?? "";

	assert.match(tokensCss, /--rux-motion-duration-moderate-02:\s+240ms;/);
	assert.match(tokensCss, /--rux-motion-duration-moderate-01:\s+150ms;/);
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
	assert.match(sideNavMotionRules, /\.rux-side-nav--overlay\.is-open\s*\{[^}]*clip-path:\s*inset\(0\);/s);
	assert.doesNotMatch(sideNavMotionRules, /translateX/);
	// All three scrims now paint --rux-overlay-scrim; opacity is the fade
	// mechanism only, so the fully-shown value is 1.
	assert.match(tokensCss, /--rux-side-nav-scrim-bg:\s+var\(--rux-overlay-scrim\);/);
	assert.match(tokensCss, /--rux-side-nav-scrim-opacity:\s+1;/);
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
	assert.doesNotMatch(sideNavMotionRules, /\.rux-side-nav-scrim\s*\{[^}]*display:\s*none;/s);
	assert.match(
		layoutDocs,
		/Header-triggered navigation SHOULD overlay the application body without\s+resizing the active workspace/,
	);
	assert.match(
		sideNavCss,
		/@media \(prefers-reduced-motion: reduce\)[\s\S]*?transition-duration:\s*1ms;/,
	);
});

test("every view shares one frame, configured on the application shell", () => {
	// The frame lives on the portable component and is configured once by the
	// app — no view may re-declare padding or radius for itself.
	assert.match(
		shellCss,
		/\.rux-app-view\s*\{[^}]*padding:\s*var\(--rux-app-view-padding\);[^}]*border-radius:\s*var\(--rux-app-view-radius\);/s,
	);
	assert.match(tokensCss, /--rux-app-view-padding:\s*var\(--rux-space-0\);/);
	assert.match(tokensCss, /--rux-app-view-radius:\s*var\(--rux-radius-0\);/);
	assert.match(
		schedulerLayoutCss,
		/\.sched-app\s*\{[\s\S]*?--rux-app-view-padding:\s*var\(--rux-space-0\) var\(--rux-space-5\);/,
	);
	assert.match(
		schedulerLayoutCss,
		/\.sched-app\s*\{[\s\S]*?--rux-app-view-radius:\s*var\(--rux-radius-0\);/,
	);
	// An open right drawer already reaches the view boundary; the outer
	// gutter on that side collapses so it doesn't double as empty canvas
	// between the drawer and the screen edge. The left gutter (side-nav
	// edge) is unaffected — only right drawers exist today.
	assert.match(
		schedulerLayoutCss,
		/\.rux-app-view:has\(> \.rux-drawer--right\.is-open\)\s*\{\s*padding-right:\s*0;\s*\}/,
	);
	// No per-view frame overrides, and none of the retired calendar-specific
	// frame tokens survive anywhere.
	assert.doesNotMatch(
		schedulerLayoutCss,
		/\.rux-app-view\[data-view=[^\]]+\]\s*\{[^}]*\b(padding|border-radius)\s*:/s,
	);
	assert.doesNotMatch(schedulerLayoutCss, /--calendar-workspace-/);
	assert.doesNotMatch(tokensCss, /--calendar-workspace-/);
	// The workspace-facing seam on the Calendar tools panel stays.
	assert.match(
		schedulerLayoutCss,
		/\.rux-app-view\[data-view="calendar"\] \.sched-scope-right-panel\s*\{[^}]*border-inline-start:\s*var\(--rux-panel-right-border\);/s,
	);
	// Mobile releases the frame for every view through the same two tokens.
	assert.match(
		schedulerLayoutCss,
		/@media \(max-width: 500px\)[\s\S]*?\.rux-app-view\s*\{\s*--rux-app-view-padding:\s*0;\s*--rux-app-view-radius:\s*0;/,
	);
	assert.match(
		layoutDocs,
		/every view MUST use the\s+shared one/,
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

/* The reference composition, asserted at composition level rather than at
   substring level.

   Until 2026-08-26 this block read `assert.match(exampleHtml, /class="rux-app"/)`
   and eleven more of the same shape. Each proved a string was present in the
   file and nothing whatever about what it was doing, and five rules the example
   exists to demonstrate had drifted out of it under a green suite: the shared
   view frame (.rux-app-view was absent entirely, so § Right Panel's "every view
   MUST use the shared one" had nothing to show), the panel's disclosure trigger,
   the toolbar's group nesting, the resize boundary, and working tabs — the tab
   strip was dead markup, because the page never loaded controls.js.

   A reference composition that only has to contain the right words is not a
   reference. Every assertion below names the rule it enforces. */

function tagAttrs(tag) {
	const out = {};
	for (const match of tag.matchAll(/([a-z][\w:-]*)(?:="([^"]*)")?/gi)) {
		out[match[1]] = match[2] ?? "";
	}
	return out;
}

/* Attribute values are quoted throughout and `[^>]` spans newlines, so this
   reads the example's multi-line tags without a parser. */
const exampleTags = [...exampleHtml.matchAll(/<[a-z][\w-]*[^>]*>/gi)].map((match) => ({
	name: match[0].match(/^<([a-z][\w-]*)/i)[1].toLowerCase(),
	attrs: tagAttrs(match[0]),
}));

const exampleStyles = exampleHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
const toolbarRegion = exampleHtml.slice(
	exampleHtml.indexOf('class="rux-workspace__toolbar"'),
	exampleHtml.indexOf("</header>", exampleHtml.indexOf('class="rux-workspace__toolbar"')),
);
const drawerId = exampleTags.find((t) => t.attrs.class === "rux-drawer rux-drawer--right")?.attrs.id;

test("the reference composition carries the shared view frame", () => {
	assert.match(exampleHtml, /class="rux-app"/);
	assert.match(exampleHtml, /class="rux-app__body"/);
	assert.match(exampleHtml, /class="rux-workspace"/);
	assert.match(exampleHtml, /class="rux-ui-header"/);

	/* shell.md § Application Anatomy — the panels + workspace row sits directly
	   in the body or in one .rux-app-view. The frame belongs to the view
	   (§ Right Panel), so a composition that skips the view has no frame to
	   share and cannot demonstrate the rule at all. */
	const views = exampleTags.filter((t) => t.attrs.class === "rux-app-view");
	assert.equal(views.length, 1, "the reference row is wrapped in exactly one .rux-app-view");

	/* "configured once on the application shell, never per view, so no view can
	   drift from the others" — the tokens are declared on .rux-app, and the view
	   carries no inline geometry of its own. */
	assert.match(exampleStyles, /\.rux-app\s*\{[^}]*--rux-app-view-padding:/s);
	assert.doesNotMatch(exampleStyles, /\.rux-app-view\s*\{[^}]*--rux-app-view-padding:/s);
	assert.ok(!("style" in views[0].attrs), ".rux-app-view carries no inline frame");

	assert.match(exampleHtml, /aria-current="page"/);
	// shell.md D1 (fixed by its step 2): the example must carry the page h1
	// in the UI header — the composition it exists to demonstrate.
	assert.match(exampleHtml, /<h1[^>]*class="rux-ui-header__title"/);
	assert.match(exampleHtml, /class="rux-side-nav rux-side-nav--overlay"/);
	assert.match(exampleHtml, /aria-label="Primary Navigation"/);
	assert.match(exampleHtml, /data-rux-side-nav-toggle/);
	assert.match(exampleHtml, /data-rux-side-nav-scrim/);
	// The overlay recipe is Tier 1 (portability-audit entry 11); the example
	// must not hand-roll it again.
	assert.doesNotMatch(exampleStyles, /margin-inline-end:\s*calc\(-1 \* var\(--rux-side-nav-width\)\)/);
});

test("a disclosed panel in the reference is controlled from its workspace header", () => {
	/* shell.md § Right Panel: "A view-specific panel … SHOULD be controlled from
	   that view's workspace header" and "The trigger MUST expose aria-controls
	   and aria-expanded." A panel with no trigger passed the old name-presence
	   assertions without complaint. */
	assert.ok(drawerId, "the tools panel is a right drawer carrying an id");
	assert.match(exampleHtml, /aria-label="Calendar Tools"/);

	const triggers = exampleTags.filter(
		(t) => t.name === "button" && t.attrs["aria-controls"] === drawerId,
	);
	assert.equal(triggers.length, 1, `exactly one control discloses #${drawerId}`);
	assert.ok(
		"aria-expanded" in triggers[0].attrs,
		"the panel trigger exposes aria-expanded",
	);
	assert.ok(
		toolbarRegion.includes(`aria-controls="${drawerId}"`),
		"the trigger sits in the view's own workspace toolbar, not the UI header",
	);

	// Persistent attached panels MUST NOT use role="dialog" (§ Right Panel).
	assert.doesNotMatch(exampleHtml, /role="dialog"/);
});

test("the reference workspace/panel boundary is a separator, not an invented gap", () => {
	/* shell.md § Application Anatomy: panels and the workspace attach with no
	   decorative gutter, but "a separator or resize hit target MAY occupy their
	   shared boundary". The shared mechanism is .rux-drawer-gutter +
	   .rux-resize-gutter (portability-audit entry 11) — the page must use it
	   rather than restate the geometry. */
	const gutter = exampleTags.find((t) => t.attrs.class === "rux-drawer-gutter rux-resize-gutter");
	assert.ok(gutter, "the boundary carries the shared gutter pair");
	assert.equal(gutter.attrs.role, "separator");
	assert.equal(gutter.attrs["aria-orientation"], "vertical");
	assert.equal(gutter.attrs["aria-controls"], drawerId);
	assert.equal(gutter.attrs.tabindex, "0");
	assert.ok(gutter.attrs["aria-label"], "the separator is named");

	// The shell MUST NOT define product drawer widths; the page does, and only
	// on the shell element.
	assert.match(exampleStyles, /\.rux-app\s*\{[^}]*--rux-drawer-right-default-width:/s);
	// Drawer position/animation belongs to rux-ui/css/base/drawer.css.
	assert.doesNotMatch(exampleStyles, /\.rux-drawer[^{]*\{[^}]*position:\s*fixed/s);
});

test("the reference toolbar demonstrates group nesting", () => {
	/* shell.md § Workspace, step 6: the toolbar separates GROUPS with
	   --rux-button-group-gap; controls within one group sit flush, "nested in a
	   single child". Two loose buttons in a toolbar is the ambiguous case the
	   rule exists to settle, and is what this example used to show. */
	assert.match(toolbarRegion, /role="group"/);

	const nested = [...toolbarRegion.matchAll(/<div class="([\w-]+)"\s*>/g)];
	assert.ok(nested.length >= 1, "the toolbar nests at least one flush group");

	// Buttons contain no divs, so the first </div> after a group's open tag is
	// that group's close.
	const [, groupClass] = nested[0];
	const openIndex = toolbarRegion.indexOf(nested[0][0]);
	const groupInner = toolbarRegion.slice(openIndex, toolbarRegion.indexOf("</div>", openIndex));
	assert.ok(
		(groupInner.match(/<button/g) ?? []).length >= 2,
		"a flush group holds more than one control",
	);
	assert.match(
		exampleStyles,
		new RegExp(`\\.${groupClass}\\s*\\{[^}]*gap:\\s*0`, "s"),
		"the nested group is what makes its controls flush",
	);
});

test("the reference panel tabs are wired and labelled in both directions", () => {
	/* The tab strip carried aria-controls but the page loaded only ui-shell.js,
	   so clicking a tab did nothing: aria-selected never moved and no pane
	   changed. data-rux-tabs + controls.js is the shared single-select
	   behaviour. */
	assert.match(exampleHtml, /<script src="\.\.\/rux-ui\/js\/controls\.js"><\/script>/);
	const tablist = exampleTags.find((t) => t.attrs.role === "tablist");
	assert.ok(tablist, "the panel's top region is a tablist");
	assert.ok("data-rux-tabs" in tablist.attrs, "the tablist opts into the shared controller");
	assert.ok(tablist.attrs["aria-label"], "the tablist is named");

	const tabs = exampleTags.filter((t) => t.attrs.role === "tab");
	const panes = exampleTags.filter((t) => t.attrs.role === "tabpanel");
	assert.ok(tabs.length >= 2 && tabs.length === panes.length);

	for (const tab of tabs) {
		assert.ok(tab.attrs.id, "every tab has an id for its pane to point back at");
		const pane = panes.find((p) => p.attrs.id === tab.attrs["aria-controls"]);
		assert.ok(pane, `tab #${tab.attrs.id} controls a real pane`);
		assert.equal(
			pane.attrs["aria-labelledby"],
			tab.attrs.id,
			"the pane names the tab that labels it",
		);
	}
});

test("panel cards in the reference are composed through panel panes", () => {
	assert.equal((exampleHtml.match(/class="rux-panel__body"/g) ?? []).length, 1);
	assert.ok((exampleHtml.match(/class="rux-panel__pane"/g) ?? []).length >= 1);
	assert.doesNotMatch(exampleHtml, /class="rux-panel__body">\s*<(?:article|section) class="rux-card/);
});

test("human and agent guidance route to the canonical layout contract", () => {
	assert.match(layoutDocs, /A panel MUST have an identifiable purpose/);
	assert.match(skillDocs, /docs\/foundations\/shell\.md/);

	/* The spacing rhythm moved to the foundation in layout.md step 6 — it stated
	   values and a MUST outside a foundation document (D3). Assert BOTH halves
	   of the one-home rule: the canonical statement is in layout.md §9.1, and
	   what is left behind is a pointer that states no values. A pointer that
	   quietly re-grew a table is the drift the rule exists to catch. */
	assert.match(layoutFoundation, /UI header to app shell \| `0`/);
	assert.doesNotMatch(layoutDocs, /UI header to app shell/);
	assert.match(layoutDocs, /## Spacing[\s\S]{0,400}?\]\(layout\.md\)/);
});

/* Rule §11.3 — stacking order. Enforces docs/foundations/layout.md §11.3.1,
 * written by its step 14 once the rule had a line a checker could hold.
 *
 * §11.3 splits stacking in two: a rule that stacks against ANOTHER component
 * uses the --rux-z-* scale, and a small integer ordering one component's own
 * children does not. A checker cannot tell those apart — that needs to know
 * which stacking context a selector renders inside, which no regex reads.
 *
 * So this asserts the part that IS decidable, and the line comes from the scale
 * rather than from the shape of today's data: the published rungs are 1, 100,
 * 200, 300, 400 and 500, so a literal at or above 100 sits in the same numeric
 * space as the global layers and will interleave with them whether its author
 * meant it or not. Below 100 a literal cannot collide with any rung but base.
 *
 * This is deliberately WEAKER than §11.3.1's prose, and saying so is the point:
 * it is a floor that catches the unambiguous case, not the whole rule made
 * executable. .rux-resize-gutter's z-index: 10 stays legal under it and is a
 * judgement §11.3.2 leaves to the author. */
const stackingFiles = [
	...["content", "drawer", "panel", "popover", "menu", "side-nav", "navigation", "feedback", "table", "app-shell"]
		.map((n) => `rux-ui/css/base/${n}.css`),
	"scheduler/css/layout/scheduler.css",
	"scheduler/css/layout/scheduler-app.css",
	"scheduler/css/features/maintenance-share.css",
	"scheduler/css/features/trip-bar.css",
];

test("no literal z-index reaches the global scale (§11.3.1)", () => {
	const offenders = [];
	for (const path of stackingFiles) {
		const css = readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
			.replace(/\/\*[\s\S]*?\*\//g, " ");
		for (const match of css.matchAll(/z-index:\s*(-?\d+)/g)) {
			const value = Number(match[1]);
			if (value >= 100) offenders.push(`${path}: z-index: ${value} — use a --rux-z-* token`);
		}
	}
	assert.deepEqual(
		offenders,
		[],
		`literal z-index values inside the published scale's range. The scale runs\n` +
			`1 / 100 / 200 / 300 / 400 / 500; a literal at or above 100 interleaves with\n` +
			`it unpredictably. See layout.md §11:\n\n${offenders.join("\n")}`,
	);
});
