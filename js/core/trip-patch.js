/* What a save of an open trip writes to `trips`: only the columns the form
   changed from the trip it opened on, as the scheduler's editor writes them.
   Writing every column on every save set back anything the scheduler changed
   while this form was open, since the form's copy of it was the old one.

   Values are compared as the form and the loaded trip can each hold them: a
   blank is empty text, null or undefined alike; a flag is its truth; a number
   is its value whether it came as text or as a number; and the needs map is
   the set of needs it holds true, so an explicit false and a missing key are
   the same answer. */

const blank = (v) => v === undefined || v === null || v === "";

export const trueNeeds = (map) => (map && typeof map === "object"
	? Object.keys(map).filter((id) => map[id] === true).sort()
	: []);

export function sameTripValue(key, a, b) {
	if (key === "trip_reqs") return trueNeeds(a).join() === trueNeeds(b).join();
	if (blank(a) && blank(b)) return true;
	if (typeof a === "boolean" || typeof b === "boolean") return !!a === !!b;
	if (typeof a === "number" || typeof b === "number") {
		const x = Number(a);
		const y = Number(b);
		if (!blank(a) && !blank(b) && Number.isFinite(x) && Number.isFinite(y)) return x === y;
	}
	if ((a && typeof a === "object") || (b && typeof b === "object")) return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
	return String(a ?? "") === String(b ?? "");
}

// The columns of `next` that differ from `opened`, with their new values.
export function tripPatch(next, opened = {}) {
	const patch = {};
	for (const [key, value] of Object.entries(next)) {
		if (value === undefined) continue;
		if (!sameTripValue(key, value, opened[key])) patch[key] = value;
	}
	return patch;
}

/* The needs map a save writes: every answer the trip already held, needs the
   office has since switched off included, with the ones this form draws set
   to what it shows. */
export function mergedNeeds(held, drawn) {
	const out = held && typeof held === "object" ? { ...held } : {};
	for (const [id, on] of Object.entries(drawn)) out[id] = !!on;
	return out;
}
