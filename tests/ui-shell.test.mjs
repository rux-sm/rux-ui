import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const page = read("index.html");
const shellController = read("rux-ui/js/ui-shell.js");
const drawerController = read("rux-ui/js/drawer.js");
const drawerStyles = read("rux-ui/css/base/drawer.css");
const headerStyles = read("rux-ui/css/base/ui-header.css");
const controlStyles = read("rux-ui/css/base/controls.css");
const controlsController = read("rux-ui/js/controls.js");
const popoverStyles = read("rux-ui/css/base/popover.css");
const suggestionStyles = read("rux-ui/css/base/suggestions.css");
const feedbackStyles = read("rux-ui/css/base/feedback.css");
const cardStyles = read("rux-ui/css/base/card.css");
const panelStyles = read("rux-ui/css/base/panel.css");
const tokens = read("rux-ui/css/tokens.css");
const menuController = read("rux-ui/js/menu.js");
const overlayController = read("rux-ui/js/overlay.js");
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
	assert.match(page, /class="rux-side-nav rux-side-nav--overlay"/);
	assert.match(page, /<nav[\s\S]*?aria-label="Primary Navigation"[\s\S]*?<ul class="rux-side-nav__list">/);
	// "Schedule", not "Trips": the destination names the bus-by-day board,
	// while "Trips" remains the word for the records on it (tasks filter,
	// editor tabs, customer trip history).
	for (const label of ["Schedule", "Drivers", "Fleet", "Customers", "Requests", "Samsara", "Options"]) {
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
		assert.match(openingTag(id), /rux-button--icon rux-button--lg/);
	}
	assert.match(tokens, /--rux-icon-md:\s+20px;/);
	assert.match(tokens, /--rux-ui-header-height:\s+44px;/);
	assert.match(tokens, /--rux-button-height-header:\s+44px;/);
	assert.match(tokens, /--rux-button-icon-size-header:\s+var\(--rux-icon-lg\);/);
	assert.doesNotMatch(page, /rux-ui-header__button/);
	assert.match(page, /id="app-navigation-toggle"[\s\S]*?rux-button__icon-swap[\s\S]*?rux-button__icon--expanded/);
});

test("mobile keeps every app-header action available above drawer content", () => {
	assert.doesNotMatch(openingTag("team-chat-btn"), /rux-ui-header__utility--responsive/);
	assert.match(
		layoutStyles,
		/#notifications-menu,\s*#profile-menu,\s*#team-chat-popover\s*\{[^}]*z-index:\s*calc\(var\(--rux-z-modal\) \+ 1\);/s,
	);
});

test("mobile side navigation fills the viewport except for its dismiss strip", () => {
	assert.match(
		layoutStyles,
		/@media \(max-width: 500px\)\s*\{\s*\/\*[\s\S]*?\.sched-app \.rux-app__body\s*\{\s*--rux-side-nav-width:\s*calc\(100% - 150px\);/,
	);
	assert.doesNotMatch(
		layoutStyles,
		/\.rux-side-nav--overlay\s*\{\s*width:\s*min\(var\(--rux-side-nav-width\),\s*calc\(100% - var\(--rux-space-12\)\)\);/,
	);
});

test("the calendar header contains no Trip Editor panel opener", () => {
	assert.doesNotMatch(page, /data-opens="trip-editor-dialog"|aria-label="Open trip editor"/);
	assert.doesNotMatch(layoutStyles, /data-view="calendar"[^\n{]*\.sched-app__mobile-panel-btn--left/);
	// Exactly three tracks — New Trip, the week range, the view controls — and
	// the track count is still what proves no fourth control (a Trip Editor
	// opener) came back. Equal minmax(0, 1fr) flanks are what put the middle
	// one at the header's true center.
	assert.match(
		layoutStyles,
		/data-view="calendar"[^\n{]*> \.rux-workspace > \.rux-workspace__header\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto minmax\(0, 1fr\);/s,
	);
	// The header is specified to stay one row. Explicit placement on both
	// flanks is what enforces it: without them a third child auto-flows onto a
	// second row, which is exactly how this regressed once already.
	assert.match(
		layoutStyles,
		/> \.rux-workspace__header > \.sched-workspace-nav\s*\{\s*grid-column:\s*1;/s,
	);
	assert.match(
		layoutStyles,
		/> \.rux-workspace__header > \.rux-workspace__toolbar\s*\{\s*grid-column:\s*3;/s,
	);
});

test("mobile removes the drawer gutter and releases the shared view frame", () => {
	assert.match(
		drawerStyles,
		/\.rux-drawer-gutter\s*\{\s*display:\s*none !important;/,
	);
	// One release for every view, through the same tokens the desktop frame
	// uses — not a per-view override.
	assert.match(
		layoutStyles,
		/\.rux-app-view\s*\{\s*--rux-app-view-padding:\s*0;\s*--rux-app-view-radius:\s*0;\s*\}/,
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
	assert.match(headerStyles, /\.rux-ui-header \.rux-button--lg\[aria-expanded="true"\]/);
	assert.match(
		headerStyles,
		/:is\(\.rux-ui-header__disclosure, \.rux-ui-header__menu\)\[aria-expanded="true"\][^}]*background:\s*var\(--_header-disclosure-bg\)/s,
	);
	assert.match(headerStyles, /\.rux-ui-header__menu\s*\{[^}]*--_header-disclosure-bg:\s*var\(--rux-side-nav-bg\)/s);
	assert.match(tokens, /--rux-side-nav-shadow:\s+none;/);
	// Outside-press and Escape moved out of menu.js into the overlay kernel;
	// a menu registers its trigger as the anchor and the kernel does the rest.
	assert.match(menuController, /window\.RuxOverlay\.register\(\{[\s\S]*?anchor: trigger,/);
	assert.match(overlayController, /record\.anchor\?\.contains\?\.\(target\)/);
	assert.match(overlayController, /event\.key !== "Escape"/);
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
	// Composition, not an exact string — the profile menu also opts into
	// .rux-popover--flush-end, being the one header popover flush with the
	// viewport edge.
	assert.match(page, /class="rux-menu rux-popover rux-popover--surface rux-popover--tab-tip[^"]*"\s+id="profile-menu"/);
	assert.match(page, /class="rux-menu rux-popover rux-popover--surface rux-popover--tab-tip rux-notifications"/);
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
	// A disclosure closes on Escape by registering with the kernel, which owns
	// the single Escape policy for every overlay.
	assert.match(popoverController, /registration = window\.RuxOverlay\.register\(/);
	assert.match(overlayController, /event\.key !== "Escape"/);
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
		/\.sched-team-chat__body\s*\{[^}]*display:\s*flex;[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s,
	);
	assert.match(
		chatStyles,
		/\.sched-team-chat__messages\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow-y:\s*auto;/s,
	);
	assert.match(
		chatController,
		/<div class="sched-team-chat__body rux-card__body">[\s\S]*?<footer class="sched-team-chat__footer rux-card__footer">/,
	);
	assert.doesNotMatch(chatController, /data-team-chat-close/);
});

test("Team Chat distinguishes the current user's messages with a trailing avatar", () => {
	assert.match(chatController, /const isOwnMessage = Boolean\(/);
	assert.match(chatController, /sched-team-chat__message--own/);
	assert.match(chatController, /sched-team-chat__avatar-slot[^`]*\$\{isGrouped \? "" : avatar\.outerHTML\}/);
	assert.match(
		chatStyles,
		/--sched-team-chat-message-max-width:\s*70%;[\s\S]*?--sched-team-chat-message-bg:\s*var\(--rux-surface-1\);[\s\S]*?--sched-team-chat-own-message-bg:\s*oklch\(from var\(--rux-surface-1\) calc\(l \+ 6%\) c h\);/,
	);
	assert.match(chatStyles, /\.sched-team-chat__message--own\s*\{[^}]*justify-content:\s*flex-end;/s);
	assert.match(chatStyles, /\.sched-team-chat__message--own \.sched-team-chat__avatar-slot\s*\{[^}]*order:\s*3;/s);
	assert.match(
		chatStyles,
		/\.sched-team-chat__message-text\s*\{[^}]*padding:\s*var\(--rux-space-2\) var\(--rux-space-3\);[^}]*background:\s*var\(--sched-team-chat-message-bg\);[^}]*border-radius:\s*var\(--sched-team-chat-message-radius\);/s,
	);
	assert.match(chatController, /function renderMessageContent\(value, currentProfileId = ""\)/);
	assert.match(chatController, /sched-team-chat__message-emoji/);
	assert.doesNotMatch(chatController, /isEmojiOnlyMessage|message-text--jumbo/);
	assert.match(
		chatStyles,
		/\.sched-team-chat__message-emoji\s*\{[^}]*font-size:\s*var\(--rux-size-20\);[^}]*line-height:\s*1;/s,
	);
	assert.doesNotMatch(chatStyles, /message-text--jumbo/);
});

test("Team Chat groups conversations without sacrificing actions or status", () => {
	assert.match(chatController, /const MESSAGE_GROUP_WINDOW_MS = 5 \* 60 \* 1000;/);
	assert.match(chatController, /function continuesMessageGroup\(message, previousMessage\)/);
	assert.match(chatController, /sched-team-chat__message--grouped/);
	assert.match(chatController, /\$\{isGrouped \? "" : avatar\.outerHTML\}/);
	assert.match(chatController, /\$\{!isOwnMessage && !isGrouped \? `<span class="sched-team-chat__message-name/);
	assert.match(chatController, /sched-team-chat__message-line[\s\S]*?sched-team-chat__message-text[\s\S]*?sched-team-chat__message-time/);
	assert.match(
		chatStyles,
		/\.sched-team-chat__message \+ \.sched-team-chat__message--grouped\s*\{[^}]*margin-block-start:\s*var\(--rux-space-1\);/s,
	);
	assert.match(
		chatStyles,
		/\.sched-team-chat__message-actions\s*\{[^}]*position:\s*absolute;[^}]*opacity:\s*0;[^}]*pointer-events:\s*none;/s,
	);
	assert.match(
		chatStyles,
		/\.sched-team-chat__message-line\s*\{[^}]*display:\s*flex;[^}]*align-items:\s*flex-end;[^}]*gap:\s*var\(--rux-space-2\);/s,
	);
	assert.match(chatStyles, /\.sched-team-chat__message--own \.sched-team-chat__message-line\s*\{[^}]*flex-direction:\s*row-reverse;/s);
	assert.match(chatStyles, /\.sched-team-chat__message-time\s*\{[^}]*opacity:\s*0;[^}]*visibility:\s*hidden;/s);
	assert.match(chatStyles, /\.sched-team-chat__message:hover \.sched-team-chat__message-time,[\s\S]*?opacity:\s*1;[^}]*visibility:\s*visible;/s);
	assert.match(chatStyles, /@media \(hover: none\)[\s\S]*?\.sched-team-chat__message-time\s*\{[^}]*opacity:\s*1;[^}]*visibility:\s*visible;/s);
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
	assert.match(chatController, /sched-team-chat__mention--current-user/);
	assert.match(chatController, /badge\.textContent = unreadMentions\.length \? "@"/);
	assert.match(chatController, /scrollIntoView\(\{ block: "center" \}\)/);
	assert.match(chatStyles, /\.sched-team-chat__mention-menu\s*\{[^}]*z-index:\s*calc\(var\(--rux-z-modal\) \+ 1\);/s);
	assert.match(chatStyles, /\.sched-team-chat__mention--current-user\s*\{[^}]*background:\s*var\(--rux-info-subtle\);/s);
});

test("menus opened inside modals are promoted above the modal layer", () => {
	assert.match(page, /id="tp-payment-add-btn"[^>]*aria-haspopup="menu"/s);
	assert.match(popoverController, /window\.RuxOverlay\.promoteLayer\(popover, anchor\)/);
	// The host list lives in the kernel now — one copy, three consumers.
	assert.match(
		overlayController,
		/MODAL_LAYER_HOSTS = "\.rux-modal-scrim, \.rux-panel--floating"/,
	);
	assert.match(
		overlayController,
		/toggleAttribute\([\s\S]*?"data-rux-modal-layer",[\s\S]*?anchor\?\.closest\?\.\(MODAL_LAYER_HOSTS\)/,
	);
	assert.match(
		popoverStyles,
		/\.rux-popover\[data-rux-modal-layer\]\s*\{[^}]*z-index:\s*calc\(var\(--rux-z-modal\) \+ 1\);/s,
	);
});

test("autofill suggestions opened from windows are promoted above their surface", () => {
	assert.match(suggestionsController, /window\.RuxOverlay\.promoteLayer\(panelEl, input\)/);
	assert.match(
		suggestionStyles,
		/\.rux-suggestions\[data-rux-modal-layer\]\s*\{[^}]*z-index:\s*calc\(var\(--rux-z-modal\) \+ 1\);/s,
	);
});

test("the profile menu does not expose the internal Flip 7 destination", () => {
	const profileMenuStart = page.indexOf('id="profile-menu"');
	const profileMenuEnd = page.indexOf('id="notifications-menu"', profileMenuStart);
	const profileMenu = page.slice(profileMenuStart, profileMenuEnd);
	assert.doesNotMatch(profileMenu, /data-view="game"/);
	assert.doesNotMatch(profileMenu, />Flip 7</);
	// Reachable only by hash. It carries data-view-title because it is the one
	// view with no navigation control to read a name from — see
	// tests/module-title.test.mjs.
	assert.match(page, /class="rux-app-view" data-view="game"[^>]*\shidden/);
});

test("profile Preferences own the global theme control", () => {
	const headerStart = page.indexOf('<header class="rux-ui-header"');
	const headerEnd = page.indexOf("</header>", headerStart);
	const header = page.slice(headerStart, headerEnd);
	const preferencesStart = page.indexOf('id="preferences-modal"');
	const preferencesEnd = page.indexOf('id="notifications-menu"', preferencesStart);
	const preferences = page.slice(preferencesStart, preferencesEnd);

	assert.doesNotMatch(header, /data-rux-theme-toggle/);
	assert.match(page, /id="preferences-menu-btn"[\s\S]*?<span>Preferences…<\/span>/);
	assert.match(preferences, /role="dialog"/);
	assert.match(preferences, /aria-labelledby="preferences-title"/);
	assert.match(preferences, /data-rux-theme-toggle/);
	assert.equal(page.match(/data-rux-theme-toggle/g)?.length, 1);
	// One markup contract: the attribute. No ID coupling.
	assert.match(themeController, /querySelectorAll\("\[data-rux-theme-toggle\]"\)/);
	assert.doesNotMatch(themeController, /#theme-toggle/);
	assert.match(
		page,
		/preferencesMenuBtn\?\.addEventListener\("click"[\s\S]*?queueMicrotask\(\(\) => window\.Rux\?\.openModal\(preferencesModal\)\)/,
	);
	assert.match(preferencesStyles, /\.rux-preferences__row/);
});

test("side-nav disclosure behavior keeps accessibility state synchronized", () => {
	assert.match(shellController, /toggle\.setAttribute\("aria-expanded", String\(open\)\)/);
	// inert alone hides the nav from the accessibility tree; aria-hidden is redundant.
	assert.doesNotMatch(shellController, /nav\.setAttribute\("aria-hidden"/);
	assert.match(shellController, /nav\.inert = !open/);
	// Escape is the overlay kernel's; the nav registers while it is open and
	// opts out of outside-press, since the scrim is its own dismiss surface.
	assert.match(shellController, /window\.RuxOverlay\?\.register\(/);
	assert.match(shellController, /dismissOn: \{ outside: false \}/);
	assert.match(shellController, /restoreFocus: true/);
	assert.match(shellController, /\.rux-side-nav__link/);
});

test("the Calendar tools panel is workspace-controlled and fully hideable", () => {
	const drawerMarkup = page.match(
		/<div\s+class="[^"]*rux-drawer--right[^"]*"\s+id="right-panel-drawer"/,
	)?.[0] ?? "";
	// Standard 32px since 2026-08-24, like every ghost outside the UI header;
	// the --lg mechanism assertions below still hold because the header
	// itself still uses that size role.
	assert.match(page, /class="rux-button rux-button--ghost rux-button--icon calendar-app__panel-toggle"/);
	assert.doesNotMatch(page, /calendar-app__panel-toggle"[\s\S]{0,500}<span class="rux-button__label">Tools<\/span>/);
	assert.match(tokens, /--rux-button-height-standard:\s+32px;/);
	assert.match(tokens, /--rux-button-height-header:\s+44px;/);
	assert.match(tokens, /--rux-button-icon-size-header:\s+var\(--rux-icon-lg\);/);
	assert.match(controlStyles, /\.rux-button--lg\s*\{[^}]*--_h:\s*var\(--rux-button-height-header\);/s);
	assert.match(controlStyles, /\.rux-button--lg\.rux-button--icon\s*\{[^}]*font-size:\s*var\(--rux-button-icon-size-header\);/s);
	assert.match(controlStyles, /\.rux-button--lg > \.rux-icon\s*\{[^}]*--_icon-size:\s*var\(--rux-button-icon-size-header\);/s);
	assert.match(page, /aria-expanded="true"[\s\S]*?aria-controls="right-panel-drawer"/);
	assert.match(drawerMarkup, /class="rux-drawer rux-drawer--right"/);
	assert.match(page, /<aside[\s\S]*?class="rux-panel rux-panel--attached sched-scope-right-panel"[\s\S]*?aria-label="Calendar Tools"/);
	assert.doesNotMatch(page, /id="opt-hide-nav"/);
});

test("button emphasis is limited to the approved variants and size roles", () => {
	assert.doesNotMatch(page, /rux-button--outline|rux-button--on-accent/);
	assert.doesNotMatch(controlStyles, /\.rux-button--outline|\.rux-button--on-accent/);
	assert.doesNotMatch(tokens, /--rux-button-(?:outline|on-accent)-/);
	assert.doesNotMatch(page, /rux-button--(?:accent|default)[^"\n]*rux-button--danger/);
	assert.doesNotMatch(page, /Danger Outline/);
	assert.doesNotMatch(controlStyles, /\.rux-button--icon-lg/);
	// Size roles are --sm (24px) / unmodified (32px) / --lg (40px), matching
	// --rux-icon-sm|md|lg and .rux-avatar--sm|--lg. One size vocabulary, so the
	// old blanket ban on --sm is replaced by asserting both rungs resolve.
	assert.match(controlStyles, /\.rux-button--sm\s*\{[^}]*--_h:\s*var\(--rux-button-height-compact\);/s);
	assert.match(controlStyles, /\.rux-button--lg\s*\{[^}]*--_h:\s*var\(--rux-button-height-header\);/s);
	assert.doesNotMatch(tokens, /--rux-button-danger-outline-/);
	assert.match(tokens, /--rux-button-height-compact:\s+24px;/);
	assert.match(tokens, /--rux-button-icon-size-compact:\s+var\(--rux-icon-sm\);/);
});

test("button labels use the shared BEM anatomy", () => {
	assert.match(page, /rux-button__label/);
	assert.doesNotMatch(page, /rux-btn-label/);
	assert.doesNotMatch(controlStyles, /rux-btn-label/);
});

/* "the Components button page documents only the finalized contract" stood here
   until the in-app components demo was removed. It read that demo's
   data-component-page="button" section, which no longer exists — the gallery is
   the contract surface now (audit R9). The test was deleted rather than
   repointed: it asserted the demo page's own headings and prose, not a rule. */

test("toggle buttons use aria-pressed as their selection source of truth", () => {
	assert.doesNotMatch(page, /class="[^"]*rux-button[^"]*is-active/);
	assert.doesNotMatch(controlStyles, /rux-button[^\n{]*is-active/);
	assert.doesNotMatch(tokens, /--rux-button-active-overlay/);
	/* This asserted a PRESSED specimen — `aria-pressed="true"` — which only the
	   components demo carried. That is a specimen check, not a contract check,
	   and it went with the demo. What the test is named for is stronger and true
	   of live markup: every toggle button carries aria-pressed at all, so the
	   attribute is the state of record rather than an afterthought on the one
	   that happened to be shown pressed. state.md rule 2.1. */
	const toggles = page.match(/<button[^>]*rux-button--toggle[^>]*>/gs) ?? [];
	assert.ok(toggles.length >= 8, `expected the shell's toggle buttons, found ${toggles.length}`);
	assert.deepEqual(
		toggles.filter((t) => !/aria-pressed=/.test(t)),
		[],
		"a toggle button without aria-pressed has no state of record",
	);
});

test("Today remains a text-only header action at every breakpoint", () => {
	const today = page.match(/<button[^>]*id="today-btn"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
	assert.match(today, /<span class="rux-button__label"\s*>\s*Today\s*<\/span\s*>/);
	assert.doesNotMatch(today, /class="rux-icon"/);
	assert.doesNotMatch(layoutStyles, /#today-btn\s*>\s*\.rux-icon/);
});

test("mini calendar navigation uses the shared standard icon button", () => {
	// Was "shared 44px header icon buttons" and required --lg, which resolved
	// to 40px desktop / 44px under the 500px touch block. The owner moved
	// every non-header ghost to the standard 32px on 2026-08-24 for one
	// consistent emphasis height; --rux-button-height-standard has no touch
	// step, so these two arrows are 32px on a phone as well. Recorded rather
	// than quietly dropped: the shared-button half of this contract is what
	// still matters, and it is what this now asserts.
	for (const id of ["mini-cal-prev", "mini-cal-next"]) {
		assert.match(openingTag(id), /rux-button--ghost/);
		assert.match(openingTag(id), /rux-button--icon/);
		assert.doesNotMatch(openingTag(id), /rux-button--(?:lg|sm)/);
	}
});

test("the mini calendar uses the card shell, header, and body", () => {
	const calendar = page.match(
		/<section\s+class="rux-card sched-mini-cal"[\s\S]*?<\/section>/,
	)?.[0];
	assert.ok(calendar);
	assert.doesNotMatch(calendar, /rux-card__sentinel/);
	assert.match(calendar, /class="rux-card__header sched-mini-cal__header"/);
	assert.match(calendar, /class="rux-card__body sched-mini-cal__body"/);
});

test("the mini calendar grows columns to fill the panel with fixed row height", () => {
	assert.match(layoutStyles, /--sched-mini-cal-cell-size:\s*\d+px;/);
	assert.match(layoutStyles, /--sched-mini-cal-cell-gap:\s*var\(--rux-space-2\);/);
	assert.match(
		layoutStyles,
		/\.sched-mini-cal__day-names,\s*\.sched-mini-cal__dates\s*\{[^}]*grid-template-columns:\s*repeat\(7, 1fr\);[^}]*grid-auto-rows:\s*var\(--sched-mini-cal-cell-size\);/s,
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

test("a card header grows for a subtitle instead of spilling past the shell", () => {
	// --rux-card-header-height is a floor. A fixed height plus align-items:
	// center made a stacked title + subtitle (48px) overflow a 40px header at
	// both ends: the title clipped away by the shell's overflow:clip, the
	// subtitle painting across the divider into the body.
	assert.match(
		cardStyles,
		/\.rux-card__header\s*\{[^}]*min-height:\s*var\(--rux-card-header-height\);/s,
	);
	assert.doesNotMatch(
		cardStyles,
		/\.rux-card__header\s*\{[^}]*[^-]height:\s*var\(--rux-card-header-height\);/s,
	);

	// The block inset is scoped to the subtitle case on purpose. The floor is a
	// border-box floor, so the 1px divider spends part of it and a header
	// carrying a 32px icon button has only 7px of block room; putting this in
	// --rux-card-header-padding would push every such header past 40px.
	assert.match(
		cardStyles,
		/\.rux-card__header:has\(\.rux-card__subtitle\)\s*\{[^}]*padding-block:\s*var\(--rux-space-2\);/s,
	);
	// Block inset must stay 0 here for the reason above; the inline inset is
	// --rux-space-4 on BOTH sides so a header's actions share the body's frame
	// rather than sitting flush to the card edge. It was 0 on the right until
	// layout.md step 19, which was invisible only while the header had a
	// background band of its own.
	assert.match(
		tokens,
		/--rux-card-header-padding:\s*var\(--rux-space-0\)\s+var\(--rux-space-5\);/,
	);

	// The header owns the inline inset for every child it holds, so the title's
	// own standalone padding — still load-bearing where .rux-card__title is
	// borrowed by headerless floating-window and modal title bars — is
	// cancelled inside a header rather than summing to 32px.
	assert.match(
		cardStyles,
		/\.rux-card__header\s+\.rux-card__title\s*\{[^}]*padding-left:\s*0;/s,
	);
});

test("a panel header contains its controls instead of spilling them into the body", () => {
	// Same floor-not-cage contract as .rux-card__header. A fixed height plus
	// align-items:center centred the overflow rather than containing it, so the
	// --attached close button (a 44px tap target in a 44px header) hung 8px
	// into the panel body.
	assert.match(
		panelStyles,
		/\.rux-panel__header\s*\{[^}]*min-height:\s*var\(--rux-panel-header-height\);/s,
	);
	assert.doesNotMatch(
		panelStyles,
		/\.rux-panel__header\s*\{[^}]*[^-]height:\s*var\(--rux-panel-header-height\);/s,
	);

	// Symmetric block inset. The old 16px-top / 0-bottom value fit a 24px title
	// in the 40px band exactly and left nothing for a taller trailing control.
	// The inline half must reference --rux-panel-header-padding, not a literal
	// step: this rule sets the `padding` shorthand, which overrides the base
	// header's `padding-inline`, so a literal forks the inline inset for
	// attached panels and misaligns the header against its own body.
	// docs/foundations/layout.md step 21.
	assert.match(
		tokens,
		/--rux-panel-attached-header-padding:\s*var\(--rux-space-2\)\s+var\(--rux-panel-header-padding\);/,
	);
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
	assert.match(driversPane, /class="rux-panel__pane sched-driver-availability"/);
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
		/border-left:\s*var\(--rux-side-nav-selected-width\) solid\s*var\(--sched-driver-priority-color\)/s,
	);
	assert.match(
		layoutStyles,
		/\.sched-driver-grid__row\.is-selected \.sched-driver-grid__name\s*\{[^}]*background:\s*oklch\(\s*from var\(--sched-driver-priority-color\) l c h \/ 0\.14\s*\)/s,
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
	// The container is the portable default now; the app names nothing.
	assert.match(drawerController, /container:\s*"\.rux-app-view"/);
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
