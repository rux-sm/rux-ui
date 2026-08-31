/* ==========================================================================
   RUX UI — DOCUMENT EXTRACTION
   --------------------------------------------------------------------------
   Hands a customer's document to Claude and gets a trip draft back.

   The call goes to the Worker (worker/index.js), never to Anthropic directly,
   and that is the whole point of the indirection: the Anthropic key lives on
   the Worker as a secret. A browser that held it would be shipping it in page
   source to anyone who opened the app, which is exactly what happened to the
   Supabase anon key and is tolerable only because that key is meant to be
   public. An API key that spends money is not.

   What the browser holds instead is a PASSPHRASE, and it holds it in
   localStorage rather than in the `settings` table — that table is read by the
   anon client, so anything in it is public. localStorage is per-device and
   travels only in this request's header. See passphraseAccepted() in the
   Worker for what that gate is and is not worth.

   API
   ---
   hasPassphrase()            → is this browser set up to extract?
   getPassphrase()            → the stored value, or ""
   setPassphrase(value)       → store or clear it
   extractDraft({ text, files, lane, signal }) → a trip draft object
   ========================================================================== */

import { SUPABASE_URL } from "./supabase.js";

const ENDPOINT = `${SUPABASE_URL}/ai/extract`;
const STORAGE_KEY = "rux-extract-passphrase";

/* Anthropic accepts these; the Worker rejects anything else with a message
   naming what it got, so this list only exists to fail earlier and cheaper —
   before a 12 MB body is base64'd and uploaded. */
export const ACCEPTED_TYPES = [
	"application/pdf",
	"image/png",
	"image/jpeg",
	"image/webp",
	"image/gif",
];
export const MAX_FILES = 8;

export function getPassphrase() {
	try {
		return localStorage.getItem(STORAGE_KEY) || "";
	} catch {
		// Private windows and locked-down browsers throw on access rather than
		// returning null. No passphrase is the correct answer there.
		return "";
	}
}

export function hasPassphrase() {
	return getPassphrase().length > 0;
}

export function setPassphrase(value) {
	const trimmed = String(value ?? "").trim();
	try {
		if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
		else localStorage.removeItem(STORAGE_KEY);
		return true;
	} catch {
		return false;
	}
}

/* A File to what the Anthropic API wants, without the data: prefix.

   readAsDataURL rather than a manual btoa over the bytes: btoa on a large
   binary string is both slower and easy to get wrong for anything non-Latin1,
   and the browser already has an encoder. */
export function fileToBase64(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error(`Could not read "${file.name}".`));
		reader.onload = () => {
			const result = String(reader.result || "");
			const comma = result.indexOf(",");
			if (comma === -1) return reject(new Error(`Could not read "${file.name}".`));
			resolve(result.slice(comma + 1));
		};
		reader.readAsDataURL(file);
	});
}

/* Turn a document into a trip draft.

   `lane` picks the contract the Worker uses: "itinerary" (Trip Draft v3, the
   Grid tab and the inbox) or "quote" (v2, intake.html). Defaults to itinerary,
   which is what the app calls.

   Throws with a message meant to be shown to a dispatcher — the Worker's own
   errors are already written that way, so they are passed through rather than
   replaced with something vaguer. */
export async function extractDraft({ text = "", files = [], lane = "itinerary", signal } = {}) {
	const passphrase = getPassphrase();
	if (!passphrase) {
		throw new Error("Add the extraction passphrase in Settings first.");
	}
	if (!String(text).trim() && !files.length) {
		throw new Error("Paste something or attach a file first.");
	}
	if (files.length > MAX_FILES) {
		throw new Error(`Attach at most ${MAX_FILES} files.`);
	}

	const encoded = [];
	for (const file of files) {
		encoded.push({
			name: file.name,
			media_type: file.type,
			data: await fileToBase64(file),
		});
	}

	const response = await fetch(ENDPOINT, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"X-Rux-Extract-Key": passphrase,
		},
		body: JSON.stringify({ text, files: encoded, lane }),
		signal,
	});

	let payload = null;
	try {
		payload = await response.json();
	} catch {
		// A non-JSON body means the Worker never got to run its own error path
		// — a gateway error, or the route not deployed at all.
	}

	/* A 404 is the Worker's catch-all proxy answering, not this route.
	   Everything on that origin except /ai/extract is forwarded to Supabase, so
	   an undeployed route reaches PostgREST and comes back "requested path is
	   invalid" — true, and useless to a dispatcher. Name the real cause: the
	   Worker in the repository is ahead of the one that is deployed. */
	if (response.status === 404) {
		throw new Error(
			"The extraction service is not deployed yet — run `wrangler deploy` "
			+ "from worker/.",
		);
	}
	if (!response.ok) {
		throw new Error(
			payload?.error
			|| `The extraction service answered ${response.status}.`,
		);
	}
	if (!payload?.draft) {
		throw new Error("The extraction service returned nothing usable.");
	}
	return { draft: payload.draft, usage: payload.usage ?? null };
}
