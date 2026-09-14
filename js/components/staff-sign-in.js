/* ==========================================================================
   RUX UI — STAFF SIGN-IN
   --------------------------------------------------------------------------
   The screen in front of the app until a staff account signs in. A staff
   account is a Supabase user linked to a row in `profiles`; the database
   returns that profile through my_staff_profile(), and anything else, no
   session or an account with no linked profile, sees this screen.

   Captcha protection is on for the project, so each sign-in carries a
   Cloudflare Turnstile token. A token works once, so a failed attempt resets
   the widget for the next one.
   ========================================================================== */

import { openDataGate, supabase } from "../data/supabase.js";
import { usernameToEmail } from "../core/staff-username.js";

const TURNSTILE_SITE_KEY = "0x4AAAAAAEmfPE09UcbC-aRI";
const NOT_STAFF = "This account isn't set up for this app. Log in with a staff account.";

let signingOut = false;

export async function fetchStaffProfile() {
	const { data, error } = await supabase.rpc("my_staff_profile");
	if (error) throw error;
	return data || null;
}

function waitFor(check, timeoutMs, stepMs = 200) {
	return new Promise((resolve) => {
		const started = Date.now();
		const poll = () => {
			const value = check();
			if (value) return resolve(value);
			if (Date.now() - started > timeoutMs) return resolve(null);
			setTimeout(poll, stepMs);
		};
		poll();
	});
}

function field(id, label, input) {
	const wrap = document.createElement("div");
	wrap.className = "rux-field";
	const labelEl = document.createElement("label");
	labelEl.className = "rux-field__label";
	labelEl.htmlFor = id;
	labelEl.textContent = label;
	input.id = id;
	input.className = "rux-input";
	wrap.append(labelEl, input);
	return wrap;
}

function buildScreen() {
	const screen = document.createElement("div");
	screen.className = "sched-sign-in";
	screen.setAttribute("role", "dialog");
	screen.setAttribute("aria-modal", "true");
	screen.setAttribute("aria-labelledby", "sched-sign-in-title");

	const card = document.createElement("div");
	card.className = "rux-card sched-sign-in__card";
	const body = document.createElement("div");
	body.className = "rux-card__body";

	const title = document.createElement("h1");
	title.className = "sched-sign-in__title";
	title.id = "sched-sign-in-title";
	title.textContent = "Log in";

	const form = document.createElement("form");
	form.className = "sched-sign-in__form";
	form.noValidate = true;

	const username = document.createElement("input");
	username.type = "text";
	username.name = "username";
	username.autocomplete = "username";
	username.setAttribute("autocapitalize", "none");
	username.spellcheck = false;

	const password = document.createElement("input");
	password.type = "password";
	password.name = "password";
	password.autocomplete = "current-password";

	const captcha = document.createElement("div");

	const message = document.createElement("p");
	message.className = "rux-field__error sched-sign-in__message";
	message.setAttribute("role", "alert");
	message.hidden = true;

	const submit = document.createElement("button");
	submit.type = "submit";
	submit.className = "rux-button rux-button--accent rux-button--block";
	submit.textContent = "Log in";

	form.append(
		field("sched-sign-in-username", "Username", username),
		field("sched-sign-in-password", "Password", password),
		captcha,
		message,
		submit,
	);
	body.append(title, form);
	card.append(body);
	screen.append(card);
	return { screen, form, username, password, captcha, message, submit };
}

// Shows the screen and resolves with the staff profile once someone signs in.
export function showSignIn({ notStaff = false } = {}) {
	return new Promise((resolve) => {
		const ui = buildScreen();
		document.body.append(ui.screen);
		// The loading splash waits for data that cannot load before sign-in.
		document.getElementById("splash")?.classList.add("rux-splash--hidden");
		let widgetId = null;
		let token = null;
		const say = (text) => {
			ui.message.textContent = text;
			ui.message.hidden = !text;
		};

		waitFor(() => window.turnstile, 10000).then((turnstile) => {
			if (!turnstile) {
				say("The security check could not load. Check the connection and reload.");
				return;
			}
			widgetId = turnstile.render(ui.captcha, {
				sitekey: TURNSTILE_SITE_KEY,
				appearance: "interaction-only",
				callback: (value) => { token = value; },
				"expired-callback": () => { token = null; },
				"error-callback": () => { token = null; },
			});
		});

		if (notStaff) say(NOT_STAFF);
		ui.username.focus();

		ui.form.addEventListener("submit", async (event) => {
			event.preventDefault();
			const email = usernameToEmail(ui.username.value);
			if (!email) {
				say("Type your username.");
				ui.username.focus();
				return;
			}
			if (!ui.password.value) {
				say("Type your password.");
				ui.password.focus();
				return;
			}
			ui.submit.disabled = true;
			say("");
			let signedIn = false;
			try {
				const captchaToken = await waitFor(() => token, 15000);
				if (!captchaToken) {
					say("The security check didn't finish. Try again.");
					return;
				}
				const { error } = await supabase.auth.signInWithPassword({
					email,
					password: ui.password.value,
					options: { captchaToken },
				});
				if (error) {
					say(/invalid login/i.test(error.message)
						? "That username and password don't match."
						: "Can't log in right now. Try again.");
					return;
				}
				const profile = await fetchStaffProfile();
				if (!profile) {
					signingOut = true;
					await supabase.auth.signOut();
					signingOut = false;
					say(NOT_STAFF);
					return;
				}
				signedIn = true;
				ui.screen.remove();
				resolve(profile);
			} catch (error) {
				console.error("Sign-in failed:", error);
				say("Can't log in right now. Try again.");
			} finally {
				if (!signedIn) {
					ui.password.value = "";
					ui.submit.disabled = false;
					token = null;
					if (widgetId !== null) window.turnstile?.reset(widgetId);
				}
			}
		});
	});
}

// Resolves with the signed-in staff profile, showing the screen first when
// there is no staff session, then lets data requests through. Every caller on
// the page shares one sign-in.
let staffSignIn = null;

async function resolveStaffProfile() {
	const { data } = await supabase.auth.getSession();
	const session = data.session;
	if (session && !session.user.is_anonymous) {
		try {
			const profile = await fetchStaffProfile();
			if (profile) return profile;
			return showSignIn({ notStaff: true });
		} catch (error) {
			console.warn("Could not read the staff profile:", error);
		}
	}
	return showSignIn();
}

export function requireStaffSignIn() {
	staffSignIn ??= resolveStaffProfile().then((profile) => {
		openDataGate();
		return profile;
	});
	return staffSignIn;
}

// A session that ends while the app is open (signed out elsewhere, or no
// longer valid) brings the screen back over the app rather than reloading,
// so unsaved work stays on the page. A different person signing in reloads.
export async function watchStaffSession() {
	const { data } = await supabase.auth.getSession();
	const userId = data.session?.user?.id ?? null;
	let showing = false;
	supabase.auth.onAuthStateChange((event) => {
		if (event !== "SIGNED_OUT" || signingOut || showing) return;
		showing = true;
		setTimeout(async () => {
			await showSignIn();
			showing = false;
			const { data: next } = await supabase.auth.getSession();
			if (String(next.session?.user?.id) !== String(userId)) window.location.reload();
		}, 0);
	});
}

export async function signOutStaff() {
	signingOut = true;
	await supabase.auth.signOut();
	window.location.reload();
}
