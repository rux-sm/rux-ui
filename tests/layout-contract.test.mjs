import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const shellCss = read("rux-ui/css/base/app-shell.css");
const headerCss = read("rux-ui/css/base/app-header.css");
const tokensCss = read("rux-ui/css/tokens.css");
const coreCss = read("rux-ui/css/rux-core.css");
const componentsCss = read("scheduler/css/components.css");
const exampleHtml = read("examples/app-layout.html");
const layoutDocs = read("docs/layout-composition.md");
const skillDocs = read("SKILL.md");

test("the reusable app shell keeps structural siblings attached", () => {
	const rulesOnly = shellCss.replace(/\/\*[\s\S]*?\*\//g, "");
	assert.match(shellCss, /\.rux-app-shell\s*\{[^}]*\bgap:\s*0;/s);
	assert.match(shellCss, /\.rux-app-shell__workspace\s*\{[^}]*flex:\s*1 1 auto;/s);
	assert.match(shellCss, /\.rux-app-shell__workspace\s*\{[^}]*min-width:\s*0;/s);
	assert.doesNotMatch(rulesOnly, /scheduler|drawer|rail|471px/);
});

test("both shared CSS entrypoints include the app shell", () => {
	assert.match(coreCss, /@import "\.\/base\/app-shell\.css";/);
	assert.match(componentsCss, /@import "\.\.\/rux-ui\/css\/base\/app-shell\.css\?v=\d+";/);
});

test("the app header uses a flexible 52px minimum-height contract", () => {
	assert.match(tokensCss, /--rux-app-header-height:\s+auto;/);
	assert.match(tokensCss, /--rux-app-header-min-height:\s+52px;/);
	assert.match(headerCss, /min-height:\s*var\(--rux-app-header-min-height\);/);
	assert.match(headerCss, /@media \(max-width: 500px\)[\s\S]*?\.rux-app-header\s*\{[^}]*min-height:\s*0;/);
});

test("the canonical example contains the required accessible composition", () => {
	assert.match(exampleHtml, /class="rux-app"/);
	assert.match(exampleHtml, /class="rux-app-shell"/);
	assert.match(exampleHtml, /class="rux-workspace rux-app-shell__workspace"/);
	assert.equal((exampleHtml.match(/rux-app-shell__panel/g) ?? []).length, 2);
	assert.match(exampleHtml, /aria-current="page"/);
	assert.match(exampleHtml, /aria-labelledby="editor-title"/);
	assert.match(exampleHtml, /aria-label="Calendar Tools"/);
	assert.doesNotMatch(exampleHtml, /role="dialog"/);
});

test("panel cards in the reference are composed through panel panes", () => {
	assert.equal((exampleHtml.match(/class="rux-panel__body"/g) ?? []).length, 2);
	assert.ok((exampleHtml.match(/class="rux-panel__pane"/g) ?? []).length >= 2);
	assert.doesNotMatch(exampleHtml, /class="rux-panel__body">\s*<(?:article|section) class="rux-card/);
});

test("human and agent guidance route to the canonical layout contract", () => {
	assert.match(layoutDocs, /A panel MUST have an identifiable purpose/);
	assert.match(layoutDocs, /App header to app shell \| `0`/);
	assert.match(skillDocs, /docs\/layout-composition\.md/);
});
