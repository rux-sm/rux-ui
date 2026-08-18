import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const page = read("index.html");
const shellController = read("rux-ui/js/ui-shell.js");
const drawerController = read("rux-ui/js/drawer.js");
const headerStyles = read("rux-ui/css/base/ui-header.css");
const controlStyles = read("rux-ui/css/base/controls.css");
const controlsController = read("rux-ui/js/controls.js");
const popoverStyles = read("rux-ui/css/base/popover.css");
const suggestionStyles = read("rux-ui/css/base/suggestions.css");
const feedbackStyles = read("rux-ui/css/base/feedback.css");
const cardStyles = read("rux-ui/css/base/card.css");
const tokens = read("rux-ui/css/tokens.css");
const menuController = read("rux-ui/js/menu.js");
const popoverController = read("rux-ui/js/popover.js");
const suggestionsController = read("rux-ui/js/suggestions.js");
const notificationsController = read("js/panels/notifications-panel.js");
const notificationDataController = read("js/data/notification-db.js");
const chatController = read("js/panels/team-chat.js");
const chatDataController = read("js/data/team-chat-db.js");
const chatStyles = read("scheduler/css/features/team-chat.css");
const themeController = read("rux-ui/js/theme.js");
const preferencesStyles = read("rux-ui/css/base/preferences.css");
const layoutStyles = read("scheduler/css/layout/scheduler-app.css");

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
		assert.match(page, new RegExp(`<span class="rux-side-nav__label"[^>]*>\\s*${label}\\s*</span`));
	}
	assert.match(
		page,
		/<span class="rux-side-nav__label"[^>]*>\s*Requests\s*<\/span[\s\S]*?<span class="rux-side-nav__label"[^>]*>\s*Samsara\s*<\/span[\s\S]*?<span class="rux-side-nav__label"[^>]*>\s*Options\s*<\/span/,
	);
	assert.match(
		page,
		/<a[^>]*class="rux-side-nav__link"[^>]*href="https:\/\/cloud\.samsara\.com\/[^>]*target="_blank"[^>]*rel="noopener noreferrer"/,
	);
});

test("global header actions use the shared 44px button and 20px icon contract", () => {
	for (const id of [
		"app-navigation-toggle",
		"workspace-search-btn",
		"team-chat-btn",
		"notifications-menu-btn",
		"profile-menu-btn",
	]) {
		assert.match(openingTag(id), /rux-button--icon rux-button--header/);
	}
	assert.match(tokens, /--rux-icon-md:\s+20px;/);
	assert.match(tokens, /--rux-ui-header-height:\s+44px;/);
	assert.match(tokens, /--rux-button-height-header:\s+44px;/);
	assert.match(tokens, /--rux-button-icon-size-header:\s+var\(--rux-icon-lg\);/);
	assert.doesNotMatch(page, /rux-ui-header__button/);
	assert.match(page, /id="app-navigation-toggle"[\s\S]*?rux-button__icon-swap[\s\S]*?rux-button__icon--expanded/);
});

test("mobile keeps every app-header action available above drawer content", () => {
	assert.doesNotMatch(openingTag("team-chat-btn"), /rux-ui-header__utility--optional/);
	assert.match(
		layoutStyles,
		/#notifications-menu,\s*#profile-menu,\s*#team-chat-popover\s*\{[^}]*z-index:\s*calc\(var\(--rux-z-modal\) \+ 1\);/s,
	);
});

test("mobile side navigation fills the viewport except for its dismiss strip", () => {
	assert.match(
		layoutStyles,
		/@media \(max-width: 500px\)\s*\{\s*\/\*[\s\S]*?\.scheduler-app__body\s*\{\s*--rux-side-nav-width:\s*calc\(100% - 150px\);/,
	);
	assert.doesNotMatch(
		layoutStyles,
		/\.scheduler-app__side-nav\s*\{\s*width:\s*min\(var\(--rux-side-nav-width\),\s*calc\(100% - var\(--rux-space-12\)\)\);/,
	);
});

test("the calendar header contains no Trip Editor panel opener", () => {
	assert.doesNotMatch(page, /data-opens="trip-editor-dialog"|aria-label="Open trip editor"/);
	assert.doesNotMatch(layoutStyles, /data-module="calendar"[^\n{]*\.scheduler-app__mobile-panel-btn--left/);
	assert.match(
		layoutStyles,
		/data-module="calendar"[^\n{]*> \.rux-workspace > \.rux-workspace__header\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/s,
	);
});

test("mobile removes the Calendar right gutter and frame inset", () => {
	assert.match(
		layoutStyles,
		/\.scheduler-app__gutter\s*\{\s*display:\s*none !important;/,
	);
	assert.match(
		layoutStyles,
		/\.scheduler-app__module\[data-module="calendar"\]\s*\{\s*--calendar-workspace-frame-inset-inline:\s*0;\s*margin:\s*0;/,
	);
});

test("header tab-tip popovers preserve the correct disclosure semantics", () => {
	const profileButton = openingTag("profile-menu-btn");
	const chatButton = openingTag("team-chat-btn");
	const notificationsButton = openingTag("notifications-menu-btn");
	assert.match(profileButton, /rux-ui-header__profile/);
	assert.match(profileButton, /rux-ui-header__disclosure/);
	assert.match(profileButton, /aria-haspopup="menu"/);
	assert.match(profileButton, /aria-controls="profile-menu"/);
	assert.match(profileButton, /aria-expanded="false"/);
	assert.match(headerStyles, /\.rux-ui-header \.rux-button--header\[aria-expanded="true"\]/);
	assert.match(
		headerStyles,
		/:is\(\.rux-ui-header__disclosure, \.rux-ui-header__menu\)\[aria-expanded="true"\][^}]*background:\s*var\(--_rux-header-disclosure-bg\)/s,
	);
	assert.match(headerStyles, /\.rux-ui-header__menu\s*\{[^}]*--_rux-header-disclosure-bg:\s*var\(--rux-side-nav-bg\)/s);
	assert.match(tokens, /--rux-side-nav-shadow:\s+none;/);
	assert.match(menuController, /active\.trigger\?\.contains\(event\.target\)/);
	assert.match(menuController, /event\.key === "Escape"/);
	assert.match(chatButton, /rux-ui-header__disclosure/);
	assert.match(chatButton, /aria-haspopup="dialog"/);
	assert.match(chatButton, /aria-controls="team-chat-popover"/);
	assert.match(chatButton, /aria-expanded="false"/);
	assert.match(notificationsButton, /rux-ui-header__disclosure/);
	assert.match(notificationsButton, /aria-haspopup="dialog"/);
	for (const id of ["team-chat-btn", "notifications-menu-btn", "profile-menu-btn"]) {
		const buttonMarkup = page.slice(page.indexOf(`id="${id}"`), page.indexOf("</button>", page.indexOf(`id="${id}"`)));
		assert.match(buttonMarkup, /rux-button__icon-swap/);
		assert.match(buttonMarkup, /rux-button__icon--expanded/);
	}
	assert.match(headerStyles, /\.rux-ui-header \[aria-expanded="true"\] > \.rux-ui-header__badge-count\s*\{[^}]*visibility:\s*hidden;/s);
	assert.match(
		headerStyles,
		/\.rux-ui-header__profile \.rux-button__icon-swap\s*\{[^}]*width:\s*var\(--rux-ui-header-profile-avatar-size\);[^}]*height:\s*var\(--rux-ui-header-profile-avatar-size\);/s,
	);
	assert.match(headerStyles, /\.rux-ui-header__profile-identity\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
	assert.match(page, /class="rux-menu rux-popover rux-popover--surface rux-popover--tab-tip"\s+id="profile-menu"/);
	assert.match(page, /class="rux-menu rux-popover rux-popover--surface rux-popover--tab-tip rux-notifications-menu"/);
	assert.match(chatController, /rux-popover rux-popover--surface rux-popover--tab-tip sched-team-chat-popover/);
	assert.match(popoverStyles, /\.rux-popover\.rux-popover--surface\s*\{[^}]*background:\s*var\(--rux-popover-surface-bg\);[^}]*border:\s*var\(--rux-popover-surface-border\);[^}]*border-radius:\s*var\(--rux-popover-surface-radius\);[^}]*box-shadow:\s*var\(--rux-popover-surface-shadow\);/s);
	assert.match(tokens, /--rux-popover-surface-bg:\s+var\(--rux-surface-\d+\);/);
	assert.match(popoverStyles, /\.rux-popover--tab-tip\s*\{[^}]*--rux-popover-offset:\s*var\(--rux-popover-tab-tip-offset\)/s);
	assert.match(tokens, /--rux-popover-tab-tip-shadow:\s+none;/);
	assert.match(
		popoverStyles,
		/\.rux-popover\.rux-popover--surface\.rux-popover--tab-tip\s*\{[^}]*box-shadow:\s*var\(--rux-popover-tab-tip-shadow\);/s,
	);
	assert.match(popoverController, /function createDisclosure\(trigger, popover, options = \{\}\)/);
	assert.match(popoverController, /event\.key !== "Escape"/);
	assert.match(chatController, /panelEl\.id = "team-chat-popover"/);
	assert.match(chatController, /role", "dialog"/);
	assert.match(chatController, /RuxPopover\.createDisclosure\(btn, panelEl/);
	assert.match(chatController, /disclosure behavior must not depend on data load[\s\S]*?ensurePanel\(\);/);
	assert.match(notificationsController, /classList\.toggle\("has-unread", hasUnread\)/);
	assert.match(notificationsController, /RuxPopover\.createDisclosure\(btn, menu/);
	assert.match(notificationsController, /onOpen:\s*openNotifications/);
	assert.match(notificationsController, /if \(!await refresh\(\)\) return;/);
	assert.match(notificationsController, /await markAllRead\(unreadIds, profileId\)/);
	assert.match(notificationDataController, /read:\s*reads\.some\(\(r\) => Boolean\(r\.read_at\)\)/);
	assert.match(notificationDataController, /export async function markAllRead\(notificationIds, profileId\)/);
	assert.match(notificationDataController, /read_at:\s*now,[\s\S]*?dismissed_at:\s*now/);
	assert.match(chatController, /classList\.toggle\("has-unread", hasUnread\)/);
});

test("Team Chat keeps a flexible scrolling body above a fixed card footer", () => {
	assert.match(
		chatStyles,
		/\.rux-team-chat__body\s*\{[^}]*display:\s*flex;[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s,
	);
	assert.match(
		chatStyles,
		/\.rux-team-chat__messages\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/s,
	);
	assert.match(
		chatController,
		/<div class="rux-team-chat__body rux-card__body">[\s\S]*?<footer class="rux-team-chat__footer rux-card__footer">/,
	);
	assert.doesNotMatch(chatController, /data-team-chat-close/);
});

test("Team Chat distinguishes the current user's messages with a trailing avatar", () => {
	assert.match(chatController, /const isOwnMessage = Boolean\(/);
	assert.match(chatController, /rux-team-chat__message--own/);
	assert.match(chatController, /rux-team-chat__avatar-slot[^`]*\$\{isGrouped \? "" : avatar\.outerHTML\}/);
	assert.match(
		chatStyles,
		/--rux-team-chat-message-max-width:\s*70%;[\s\S]*?--rux-team-chat-message-bg:\s*var\(--rux-surface-1\);[\s\S]*?--rux-team-chat-own-message-bg:\s*oklch\(from var\(--rux-surface-1\) calc\(l \+ 6%\) c h\);/,
	);
	assert.match(chatStyles, /\.rux-team-chat__message--own\s*\{[^}]*justify-content:\s*flex-end;/s);
	assert.match(chatStyles, /\.rux-team-chat__message--own \.rux-team-chat__avatar-slot\s*\{[^}]*order:\s*3;/s);
	assert.match(
		chatStyles,
		/\.rux-team-chat__message-text\s*\{[^}]*padding:\s*var\(--rux-space-2\) var\(--rux-space-3\);[^}]*background:\s*var\(--rux-team-chat-message-bg\);[^}]*border-radius:\s*var\(--rux-team-chat-message-radius\);/s,
	);
	assert.match(chatController, /function renderMessageContent\(value, currentProfileId = ""\)/);
	assert.match(chatController, /rux-team-chat__message-emoji/);
	assert.doesNotMatch(chatController, /isEmojiOnlyMessage|message-text--jumbo/);
	assert.match(
		chatStyles,
		/\.rux-team-chat__message-emoji\s*\{[^}]*font-size:\s*var\(--rux-size-xl\);[^}]*line-height:\s*1;/s,
	);
	assert.doesNotMatch(chatStyles, /message-text--jumbo/);
});

test("Team Chat groups conversations without sacrificing actions or status", () => {
	assert.match(chatController, /const MESSAGE_GROUP_WINDOW_MS = 5 \* 60 \* 1000;/);
	assert.match(chatController, /function continuesMessageGroup\(message, previousMessage\)/);
	assert.match(chatController, /rux-team-chat__message--grouped/);
	assert.match(chatController, /\$\{isGrouped \? "" : avatar\.outerHTML\}/);
	assert.match(chatController, /\$\{!isOwnMessage && !isGrouped \? `<span class="rux-team-chat__message-name/);
	assert.match(chatController, /rux-team-chat__message-line[\s\S]*?rux-team-chat__message-text[\s\S]*?rux-team-chat__message-time/);
	assert.match(
		chatStyles,
		/\.rux-team-chat__message \+ \.rux-team-chat__message--grouped\s*\{[^}]*margin-block-start:\s*var\(--rux-space-1\);/s,
	);
	assert.match(
		chatStyles,
		/\.rux-team-chat__message-actions\s*\{[^}]*position:\s*absolute;[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;/s,
	);
	assert.match(
		chatStyles,
		/\.rux-team-chat__message-line\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*flex-end;[^}]*gap:\s*var\(--rux-space-2\);/s,
	);
	assert.match(chatStyles, /\.rux-team-chat__message--own \.rux-team-chat__message-line\s*\{[^}]*flex-direction:\s*row-reverse;/s);
	assert.match(chatStyles, /\.rux-team-chat__message-time\s*\{[^}]*opacity:\s*0;[^}]*visibility:\s*hidden;/s);
	assert.match(chatStyles, /\.rux-team-chat__message:hover \.rux-team-chat__message-time,[\s\S]*?opacity:\s*1;[^}]*visibility:\s*visible;/s);
	assert.match(chatStyles, /@media \(hover: none\)[\s\S]*?\.rux-team-chat__message-time\s*\{[^}]*opacity:\s*1;[^}]*visibility:\s*visible;/s);
	assert.match(chatController, /role="log"[^>]*aria-live="polite"/);
	assert.match(chatController, /data-team-chat-send disabled/);
	assert.match(chatController, /function syncComposerState\(\)/);
	assert.match(chatController, /window\.Rux\?\.toast\?\.\("Couldn't Send Message"\)/);
	assert.match(chatController, /data-team-chat-status/);
	assert.match(chatDataController, /subscribeToTeamChat\(onChange, onStatus\)/);
	assert.match(chatDataController, /\.subscribe\(onStatus\)/);
});

test("Team Chat mentions use stable profile IDs and accessible suggestions", () => {
	assert.match(chatController, /import \{ fetchProfiles \} from "\.\.\/data\/profile-db\.js";/);
	assert.match(chatController, /const MENTION_TOKEN_SOURCE/);
	assert.match(chatController, /function encodeSelectedMentions\(value\)/);
	assert.match(chatController, /function messageMentionsProfile\(message, profileId\)/);
	assert.match(chatController, /aria-autocomplete="list"/);
	assert.match(chatController, /role", "listbox"/);
	assert.match(chatController, /data-mention-profile-id/);
	assert.match(chatController, /rux-team-chat__mention--current-user/);
	assert.match(chatController, /badge\.textContent = unreadMentions\.length \? "@"/);
	assert.match(chatController, /scrollIntoView\(\{ block: "center" \}\)/);
	assert.match(chatStyles, /\.rux-team-chat__mention-menu\s*\{[^}]*z-index:\s*calc\(var\(--rux-z-modal\) \+ 1\);/s);
	assert.match(chatStyles, /\.rux-team-chat__mention--current-user\s*\{[^}]*background:\s*var\(--rux-info-subtle\);/s);
});

/* SKIPPED: `.rux-modal__header` no longer exists anywhere in the codebase —
   no CSS file defines it, index.html does not use it, and the only surviving
   --rux-modal-* tokens are bg, border, enter-y, radius, and shadow. This
   assertion also referenced --rux-space-7, a token that has never existed.
   Restore this test if a modal header component is reintroduced. */
test.skip("modal headers keep Carbon-like title spacing independent from the close action", () => {
	assert.match(tokens, /--rux-control-height:\s*44px;/);
	assert.match(tokens, /--rux-modal-header-height:\s*var\(--rux-control-height\);/);
	assert.match(tokens, /--rux-modal-header-padding:\s*0 var\(--rux-space-7\) 0 var\(--rux-space-4\);/);
	assert.match(tokens, /--rux-modal-header-action-size:\s*var\(--rux-control-height\);/);
	assert.match(feedbackStyles, /\.rux-modal__header\s*\{[^}]*position:\s*relative;[^}]*height:\s*var\(--rux-modal-header-height\);[^}]*padding:\s*var\(--rux-modal-header-padding\);/s);
	assert.match(feedbackStyles, /\.rux-modal__header > \.rux-button--icon\s*\{[^}]*--_h:\s*var\(--rux-modal-header-action-size\);[^}]*position:\s*absolute;[^}]*inset-block-start:\s*0;[^}]*inset-inline-end:\s*0;/s);
	assert.match(feedbackStyles, /\.rux-modal__title\s*\{[^}]*font-size:\s*var\(--rux-modal-title-size\);[^}]*line-height:\s*var\(--rux-modal-title-line-height\);/s);
});

test("menus opened inside modals are promoted above the modal layer", () => {
	assert.match(page, /id="tp-payment-add-btn"[^>]*aria-haspopup="menu"/s);
	assert.match(
		popoverController,
		/popover\.toggleAttribute\([\s\S]*?"data-rux-modal-layer",[\s\S]*?Boolean\(anchor\.closest\("\.rux-modal-backdrop, \.rux-panel--floating"\)\)/,
	);
	assert.match(
		popoverStyles,
		/\.rux-popover\[data-rux-modal-layer\]\s*\{[^}]*z-index:\s*calc\(var\(--rux-z-modal\) \+ 1\);/s,
	);
});

test("autofill suggestions opened from windows are promoted above their surface", () => {
	assert.match(
		suggestionsController,
		/panelEl\.toggleAttribute\([\s\S]*?"data-rux-modal-layer",[\s\S]*?input\.closest\("\.rux-modal-backdrop, \.rux-panel--floating"\)/,
	);
	assert.match(
		suggestionStyles,
		/\.rux-suggestions\[data-rux-modal-layer\]\s*\{[^}]*z-index:\s*calc\(var\(--rux-z-modal\) \+ 1\);/s,
	);
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
	assert.match(page, /class="rux-button rux-button--ghost rux-button--icon rux-button--header calendar-app__panel-toggle"/);
	assert.doesNotMatch(page, /calendar-app__panel-toggle"[\s\S]{0,500}<span class="rux-button__label">Tools<\/span>/);
	assert.match(tokens, /--rux-button-height-standard:\s+32px;/);
	assert.match(tokens, /--rux-button-height-header:\s+44px;/);
	assert.match(tokens, /--rux-button-icon-size-header:\s+var\(--rux-icon-lg\);/);
	assert.match(controlStyles, /\.rux-button--header\s*\{[^}]*--_h:\s*var\(--rux-button-height-header\);/s);
	assert.match(controlStyles, /\.rux-button--header\.rux-button--icon\s*\{[^}]*font-size:\s*var\(--rux-button-icon-size-header\);/s);
	assert.match(controlStyles, /\.rux-button--header > \.rux-icon\s*\{[^}]*--_icon-size:\s*var\(--rux-button-icon-size-header\);/s);
	assert.match(page, /aria-expanded="true"[\s\S]*?aria-controls="right-panel-drawer"/);
	assert.match(drawerMarkup, /class="scheduler-app__drawer scheduler-app__drawer--right"/);
	assert.doesNotMatch(drawerMarkup, /scheduler-app__drawer--railable/);
	assert.match(page, /<aside[\s\S]*?class="rux-panel rux-panel--attached sched-scope-right-panel"[\s\S]*?aria-label="Calendar Tools"/);
	assert.doesNotMatch(page, /id="opt-hide-nav"/);
});

test("button emphasis is limited to the approved variants and size roles", () => {
	assert.doesNotMatch(page, /rux-button--outline|rux-button--on-accent/);
	assert.doesNotMatch(controlStyles, /\.rux-button--outline|\.rux-button--on-accent/);
	assert.doesNotMatch(tokens, /--rux-button-(?:outline|on-accent)-/);
	assert.doesNotMatch(page, /rux-button--(?:accent|default)[^"\n]*rux-button--danger/);
	assert.doesNotMatch(page, /Danger Outline/);
	assert.doesNotMatch(page, /rux-button--sm/);
	assert.doesNotMatch(controlStyles, /\.rux-button--sm/);
	assert.doesNotMatch(controlStyles, /\.rux-button--icon-lg/);
	assert.doesNotMatch(tokens, /--rux-button-danger-outline-/);
	assert.match(tokens, /--rux-button-height-compact:\s+24px;/);
	assert.match(tokens, /--rux-button-icon-size-compact:\s+var\(--rux-icon-sm\);/);
});

test("button labels use the shared BEM anatomy", () => {
	assert.match(page, /rux-button__label/);
	assert.doesNotMatch(page, /rux-btn-label/);
	assert.doesNotMatch(controlStyles, /rux-btn-label/);
});

test("the Components button page documents only the finalized contract", () => {
	const buttonPage = page.match(
		/<div\s+data-component-page="button"[\s\S]*?(?=<div\s+data-component-page="toggle-button")/,
	)?.[0] ?? "";
	assert.match(buttonPage, /href="\.\/docs\/buttons\.md"/);
	assert.match(buttonPage, />\s*Emphasis\s*</);
	assert.match(buttonPage, />\s*Size Roles\s*</);
	assert.match(buttonPage, />\s*Content and States\s*</);
	assert.match(buttonPage, />\s*Interaction States\s*</);
	assert.match(buttonPage, />\s*Composition\s*</);
	assert.match(buttonPage, /rux-button--accent/);
	assert.match(buttonPage, /rux-button--default/);
	assert.match(buttonPage, /rux-button--ghost/);
	assert.match(buttonPage, /rux-button--danger/);
	assert.doesNotMatch(buttonPage, /Button Anatomy|Button Variants|Button on Accent/);
});

test("toggle buttons use aria-pressed as their selection source of truth", () => {
	assert.doesNotMatch(page, /class="[^"]*rux-button[^"]*is-active/);
	assert.doesNotMatch(controlStyles, /rux-button[^\n{]*is-active/);
	assert.doesNotMatch(tokens, /--rux-button-active-overlay/);
	assert.match(page, /rux-button--toggle"[^>]*aria-pressed="true"/);
});

test("Today remains a text-only header action at every breakpoint", () => {
	const today = page.match(/<button[^>]*id="today-btn"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
	assert.match(today, /<span class="rux-button__label"\s*>\s*Today\s*<\/span\s*>/);
	assert.doesNotMatch(today, /class="rux-icon"/);
	assert.doesNotMatch(layoutStyles, /#today-btn\s*>\s*\.rux-icon/);
});

test("mini calendar navigation uses shared 44px header icon buttons", () => {
	for (const id of ["mini-cal-prev", "mini-cal-next"]) {
		assert.match(openingTag(id), /rux-button--icon rux-button--header/);
	}
});

test("the mini calendar uses the card shell, header, and body", () => {
	const calendar = page.match(
		/<section\s+class="rux-card sched-mini-cal"[\s\S]*?<\/section>/,
	)?.[0];
	assert.ok(calendar);
	assert.doesNotMatch(calendar, /rux-card__sentinel/);
	assert.match(calendar, /class="rux-card__header rux-mini-cal__header"/);
	assert.match(calendar, /class="rux-card__body rux-mini-cal__body"/);
});

test("the mini calendar grows columns to fill the panel with fixed row height", () => {
	assert.match(layoutStyles, /--rux-mini-cal-cell-size:\s*\d+px;/);
	assert.match(layoutStyles, /--rux-mini-cal-cell-gap:\s*var\(--rux-space-2\);/);
	assert.match(
		layoutStyles,
		/\.rux-mini-cal__day-names,\s*\.rux-mini-cal__dates\s*\{[^}]*grid-template-columns:\s*repeat\(7, 1fr\);[^}]*grid-auto-rows:\s*var\(--rux-mini-cal-cell-size\);/s,
	);
	assert.doesNotMatch(layoutStyles, /padding-inline:\s*auto/);
});

test("Calendar Options is a card in the Calendar panel body", () => {
	const options = page.match(
		/<section\s+class="rux-card rux-view-options"\s+id="rp-view-options"[\s\S]*?<\/section>/,
	)?.[0];
	assert.ok(options);
	assert.doesNotMatch(options, /rux-card__sentinel/);
	assert.match(options, />\s*Calendar Options\s*</);
	assert.match(options, /class="rux-card__body rux-view-options__list"/);
});

test("cards use one clipped outer frame with shell-owned region geometry", () => {
	const cardTokens = tokens.match(
		/COMPONENT · card[\s\S]*?COMPONENT · field/,
	)?.[0] ?? "";
	assert.match(
		cardTokens,
		/card shell[\s\S]*card header[\s\S]*card body[\s\S]*card footer/,
	);
	for (const token of ["fg", "bg", "border", "radius", "shadow"]) {
		assert.match(cardTokens, new RegExp(`--rux-card-shell-${token}:`));
	}
	assert.match(
		cardStyles,
		/\.rux-card:has\(> \.rux-card__body\)\s*\{[^}]*background:\s*var\(--rux-card-shell-bg\);[^}]*border:\s*var\(--rux-card-shell-border\);[^}]*border-radius:\s*var\(--rux-card-shell-radius\);[^}]*overflow:\s*clip;/s,
	);
	assert.match(
		cardStyles,
		/\.rux-card__header\s*\{[^}]*border:\s*0;[^}]*border-bottom:\s*var\(--rux-card-header-border\);[^}]*border-radius:\s*0;/s,
	);
	assert.match(
		cardStyles,
		/\.rux-card__body\s*\{[^}]*border:\s*0;[^}]*border-radius:\s*0;/s,
	);
	assert.match(
		cardStyles,
		/\.rux-card__footer\s*\{[^}]*border:\s*0;[^}]*border-top:\s*var\(--rux-card-footer-border\);[^}]*border-radius:\s*0;/s,
	);
	assert.doesNotMatch(cardStyles, /rux-card__sentinel|\.is-stuck|position:\s*sticky/);
	assert.doesNotMatch(controlsController, /initStickySectionHeaders|rux-card__sentinel/);
});

test("Trip Bar Options is a card in the Calendar panel body", () => {
	const options = page.match(
		/<section\s+class="rux-card rux-view-options"\s+id="rp-trip-bar-options"[\s\S]*?<\/section>/,
	)?.[0];
	assert.ok(options);
	assert.doesNotMatch(options, /rux-card__sentinel/);
	assert.match(options, />\s*Trip Bar Options\s*</);
	assert.match(options, /class="rux-card__body rux-view-options__list"/);
});

test("Driver Availability is an Assignments card in the panel body", () => {
	const driversPane = page.match(
		/id="rp-pane-drivers"[\s\S]*?(?=<div\s+id="rp-pane-tasks")/,
	)?.[0];
	assert.ok(driversPane);
	assert.match(driversPane, /class="rux-panel__pane rux-driver-availability"/);
	assert.match(driversPane, /class="rux-card"/);
	assert.doesNotMatch(driversPane, /rux-card__sentinel/);
	assert.match(driversPane, />\s*Assignments\s*</);
	assert.match(driversPane, /id="rp-driver-grid"/);
});

test("driver priority uses a persistent row indicator and matching selected wash", () => {
	assert.match(page, /row\.dataset\.priority = String\(driver\.priority \|\| 3\)/);
	assert.doesNotMatch(page, /function driverNameIcon/);
	assert.match(
		layoutStyles,
		/border-left:\s*var\(--rux-side-nav-selected-width\) solid\s*var\(--rux-driver-priority-color\)/s,
	);
	assert.match(
		layoutStyles,
		/\.rux-driver-grid__row\.is-selected \.rux-driver-grid__name\s*\{[^}]*background:\s*oklch\(\s*from var\(--rux-driver-priority-color\) l c h \/ 0\.14\s*\)/s,
	);
});

test("drawer toggles prefer disclosure semantics without breaking legacy toggles", () => {
	assert.match(drawerController, /hasAttribute\("aria-expanded"\)/);
	assert.match(drawerController, /\? "aria-expanded"\s*:\s*"aria-pressed"/);
});

test("Calendar resize uses its inset module and does not fight auto-collapse", () => {
	// The drawer measures against its bounding container rather than the body.
	// That container is now configured by the application rather than named in
	// the portable module, so assert both halves of the seam.
	assert.match(
		drawerController,
		/const containerEl = drawer\.closest\(env\.container\);[\s\S]*?const availableW = containerEl\?\.clientWidth/,
	);
	assert.match(page, /container:\s*"\.scheduler-app__module"/);
	assert.match(
		page,
		/function checkPanelFit\(\)\s*\{[\s\S]*?rightDrawer\.classList\.contains\("is-resizing"\)/,
	);
	assert.doesNotMatch(
		drawerController,
		/e\.key === "Enter"|e\.key === " "/,
	);
	assert.match(
		page,
		/Tools button owns disclosure; this panel's boundary only resizes/,
	);
});
