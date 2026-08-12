import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const page = read("index.html");
const shellController = read("js/core/ui-shell.js");
const drawerController = read("js/core/drawer.js");
const headerStyles = read("rux-ui/css/base/ui-header.css");
const tokens = read("rux-ui/css/tokens.css");
const menuController = read("js/core/menu.js");
const notificationsController = read("js/panels/notifications-panel.js");
const chatController = read("js/panels/team-chat.js");
const themeController = read("js/core/theme.js");
const preferencesStyles = read("scheduler/css/features/preferences.css");

function openingTag(id) {
	return page.match(new RegExp(`<button[^>]*id="${id}"[^>]*>`))?.[0] ?? "";
}

test("the UI header routes product navigation through a side nav", () => {
	assert.match(page, /class="rux-ui-header"/);
	assert.match(page, /id="app-navigation-toggle"/);
	assert.match(page, /aria-controls="app-side-navigation"/);
	assert.match(page, /class="rux-side-nav scheduler-app__side-nav"/);
	assert.match(page, /<nav[\s\S]*?aria-label="Primary Navigation"[\s\S]*?<ul class="rux-side-nav__list">/);
	for (const label of ["Trips", "Drivers", "Fleet", "Customers", "Requests", "Samsara", "Options"]) {
		assert.match(page, new RegExp(`<span class="rux-side-nav__label">${label}</span>`));
	}
	assert.match(
		page,
		/<span class="rux-side-nav__label">Requests<\/span>[\s\S]*?<span class="rux-side-nav__label">Samsara<\/span>[\s\S]*?<span class="rux-side-nav__label">Options<\/span>/,
	);
	assert.match(
		page,
		/<a[^>]*class="rux-side-nav__link"[^>]*href="https:\/\/cloud\.samsara\.com\/[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
	);
});

test("global header actions share the 48px button and 20px icon contract", () => {
	for (const id of [
		"app-navigation-toggle",
		"workspace-search-btn",
		"team-chat-btn",
		"notifications-menu-btn",
		"profile-menu-btn",
	]) {
		assert.match(openingTag(id), /rux-ui-header__button/);
	}
	assert.match(tokens, /--rux-space-7:\s+3rem;\s+\/\* 48px \*\//);
	assert.match(tokens, /--rux-icon-sm:\s+20px;/);
	assert.match(tokens, /--rux-ui-header-height:\s+var\(--rux-space-7\);/);
	assert.match(tokens, /--rux-ui-header-button-size:\s+var\(--rux-ui-header-height\);/);
	assert.match(tokens, /--rux-ui-header-button-icon-size:\s+var\(--rux-icon-sm\);/);
	assert.match(headerStyles, /\.rux-ui-header__button\s*\{[^}]*--_h:\s*var\(--rux-ui-header-button-size\)/s);
	assert.match(headerStyles, /\.rux-ui-header__button > \.rux-icon\s*\{[^}]*--_icon-size:\s*var\(--rux-ui-header-button-icon-size\)/s);
	assert.match(page, /id="app-navigation-toggle"[\s\S]*?rux-ui-header__menu-icon--open[\s\S]*?rux-ui-header__menu-icon--close/);
});

test("profile and disclosure actions retain accessible menu behavior", () => {
	const profileButton = openingTag("profile-menu-btn");
	const chatButton = openingTag("team-chat-btn");
	assert.match(profileButton, /rux-ui-header__profile/);
	assert.match(profileButton, /aria-haspopup="menu"/);
	assert.match(profileButton, /aria-expanded="false"/);
	assert.match(headerStyles, /\.rux-ui-header__button\[aria-expanded="true"\]/);
	assert.match(menuController, /active\.trigger\?\.contains\(event\.target\)/);
	assert.match(menuController, /event\.key === "Escape"/);
	assert.match(chatButton, /aria-controls="team-chat-window"/);
	assert.match(chatButton, /aria-expanded="false"/);
	assert.match(chatController, /panelEl\.id = "team-chat-window"/);
	assert.match(chatController, /btn\.setAttribute\("aria-expanded", "true"\)/);
	assert.match(chatController, /btn\.setAttribute\("aria-expanded", "false"\)/);
	assert.match(notificationsController, /classList\.toggle\("has-unread", hasUnread\)/);
	assert.match(chatController, /classList\.toggle\("has-unread", hasUnread\)/);
});

test("the profile menu does not expose the internal Flip 7 destination", () => {
	const profileMenuStart = page.indexOf('id="profile-menu"');
	const profileMenuEnd = page.indexOf('id="notifications-menu"', profileMenuStart);
	const profileMenu = page.slice(profileMenuStart, profileMenuEnd);
	assert.doesNotMatch(profileMenu, /data-module="game"/);
	assert.doesNotMatch(profileMenu, />Flip 7</);
	assert.match(page, /class="scheduler-app__module" data-module="game" hidden/);
});

test("profile Preferences own the global theme control", () => {
	const headerStart = page.indexOf('<header class="rux-ui-header"');
	const headerEnd = page.indexOf("</header>", headerStart);
	const header = page.slice(headerStart, headerEnd);
	const preferencesStart = page.indexOf('id="preferences-modal"');
	const preferencesEnd = page.indexOf('id="notifications-menu"', preferencesStart);
	const preferences = page.slice(preferencesStart, preferencesEnd);

	assert.doesNotMatch(header, /id="theme-toggle"/);
	assert.match(page, /id="preferences-menu-btn"[\s\S]*?<span>Preferences…<\/span>/);
	assert.match(preferences, /role="dialog"/);
	assert.match(preferences, /aria-labelledby="preferences-title"/);
	assert.match(preferences, /id="theme-toggle"/);
	assert.equal(page.match(/id="theme-toggle"/g)?.length, 1);
	assert.match(themeController, /getElementById\("theme-toggle"\)/);
	assert.match(
		page,
		/preferencesMenuBtn\?\.addEventListener\("click"[\s\S]*?queueMicrotask\(\(\) => window\.Rux\?\.openModal\(preferencesModal\)\)/,
	);
	assert.match(preferencesStyles, /\.rux-preferences__row/);
});

test("side-nav disclosure behavior keeps accessibility state synchronized", () => {
	assert.match(shellController, /toggle\.setAttribute\("aria-expanded", String\(open\)\)/);
	assert.match(shellController, /nav\.setAttribute\("aria-hidden", String\(!open\)\)/);
	assert.match(shellController, /nav\.inert = !open/);
	assert.match(shellController, /event\.key === "Escape"/);
	assert.match(shellController, /restoreFocus: true/);
	assert.match(shellController, /\.rux-side-nav__link/);
});

test("the Calendar tools panel is workspace-controlled and fully hideable", () => {
	const drawerMarkup = page.match(
		/<div\s+class="[^"]*scheduler-app__drawer--right[^"]*"\s+id="right-panel-drawer"/,
	)?.[0] ?? "";
	assert.match(page, /class="rux-button rux-button--ghost calendar-app__panel-toggle"/);
	assert.match(page, /aria-expanded="true"[\s\S]*?aria-controls="right-panel-drawer"/);
	assert.match(drawerMarkup, /class="scheduler-app__drawer scheduler-app__drawer--right"/);
	assert.doesNotMatch(drawerMarkup, /scheduler-app__drawer--railable/);
	assert.match(page, /<aside[\s\S]*?class="rux-panel rux-panel--right rux-right-panel"[\s\S]*?aria-label="Calendar Tools"/);
	assert.doesNotMatch(page, /id="opt-hide-nav"/);
});

test("drawer toggles prefer disclosure semantics without breaking legacy toggles", () => {
	assert.match(drawerController, /hasAttribute\("aria-expanded"\)/);
	assert.match(drawerController, /\? "aria-expanded"\s*:\s*"aria-pressed"/);
});
