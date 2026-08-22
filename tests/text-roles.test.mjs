import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";

const base = new URL("../rux-ui/css/", import.meta.url);
const tokens = await readFile(new URL("tokens.css", base), "utf8");

const files = [];
const collect = async (dir, prefix) => {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) await collect(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`);
		else if (entry.name.endsWith(".css"))
			files.push([`${prefix}${entry.name}`, await readFile(new URL(entry.name, dir), "utf8")]);
	}
};
await collect(base, "rux-ui/css/");
await collect(new URL("../scheduler/css/", import.meta.url), "scheduler/css/");

const DEPRECATED = [
	"--rux-text-default",
	"--rux-text-heading",
];

// Retired outright by typography.md §5 step 9 (D5) rather than kept as
// aliases like the pair above. Both resolved to --rux-text-secondary in both
// themes and no rule consumed either, so there was nothing to forward.
const RETIRED = [
	"--rux-text-muted",
	"--rux-text-faint",
];

test("text carries two emphasis levels, following Geist", () => {
	// Geist's neutral scale reserves exactly two steps for text: 900 secondary,
	// 1000 primary. This was five, which README's Geist reference already
	// called "a finer-grained analog" of that pair.
	//
	// Until color.md §5 step 4 this asserted each was a literal oklch() — "a
	// real value, not an alias" — which was the right guard while the pair was
	// hand-tuned and the risk was one level quietly aliasing the other. Now the
	// levels ARE the catalog's two text steps, so the stronger assertion is
	// that each names its step: an alias is exactly what is wanted, provided it
	// is an alias of the right thing.
	for (const [role, step] of [
		["--rux-text-primary", "--rux-gray-1000"],
		["--rux-text-secondary", "--rux-gray-900"],
	]) {
		assert.match(
			tokens,
			new RegExp(`${role}:\\s*var\\(${step}\\)`),
			`${role} must read ${step}, the catalog's step for it`,
		);
	}
});

test("disabled stays outside the emphasis pair", () => {
	// Not a level — a state. Geist's scale has no disabled-text step, so
	// collapsing it into secondary would make a dead control read as a caption.
	assert.match(tokens, /--rux-text-disabled:\s*oklch\(/);
	assert.doesNotMatch(tokens, /--rux-text-disabled:\s*var\(--rux-text-(primary|secondary)\)/);
});

test("nothing internal still reads a superseded level", () => {
	const offenders = [];
	for (const [name, css] of files) {
		if (name.endsWith("tokens.css")) continue;
		for (const token of [...DEPRECATED, ...RETIRED]) {
			if (css.includes(`var(${token})`)) offenders.push(`${name} → ${token}`);
		}
	}
	assert.deepEqual([...new Set(offenders)].sort(), []);
});

test("the superseded names stay published for the vendored consumers", () => {
	// They read 73 --rux-* tokens; removing a published name breaks them. Each
	// forwards to whichever of the two levels absorbed it.
	for (const token of DEPRECATED) {
		assert.match(
			tokens,
			new RegExp(`${token}:\\s*var\\(--rux-text-(primary|secondary)\\)`),
			`${token} must remain published as an alias`,
		);
	}
});

test("the retired third tier is gone, not published as an alias", () => {
	// Enforces typography.md §5 step 9. Keeping these as aliases is what let
	// the gap persist: the system documented three emphasis tiers and shipped
	// two, and an alias resolving to secondary made that invisible. A consumer
	// still reading one should now fail its vendor name check rather than
	// silently render the tier it thought it had opted out of.
	for (const token of RETIRED) {
		assert.doesNotMatch(
			tokens,
			new RegExp(`^\\s*${token}:`, "m"),
			`${token} was retired and must not be defined again`,
		);
	}
});

test("each theme separates the pair in the right direction", () => {
	// Perceptual distance, not contrast ratio — OKLCH lightness is uniform, so
	// a gap reads as the same step from either end of the scale.
	//
	// This asserted the two gaps were EQUAL until color.md §5 step 4. That
	// symmetry was this system's, not the catalog's: the light block's own
	// comment described "mirroring the dark pair's 24-point gap from the
	// opposite end", and color.md D2 recorded it as a departure — the catalog's
	// light pair is 21.4 points apart where its dark pair is 23.9. Adopting the
	// steps means adopting the asymmetry, so what is left to enforce is the
	// direction: primary is always further from the canvas than secondary.
	const cut = tokens.indexOf(':root[data-theme="light"]');
	const dark = tokens.slice(0, cut);
	const light = tokens.slice(cut);

	// A role names its step once, in the dark block; each theme block then
	// gives that step its own value.
	const stepOf = (role) =>
		dark.match(new RegExp(`${role}:\\s*var\\((--rux-gray-\\d+)\\)`))?.[1];
	const level = (block, role) =>
		Number(block.match(new RegExp(`${stepOf(role)}:\\s*oklch\\(([\\d.]+)%`))?.[1]);

	const darkGap = level(dark, "--rux-text-primary") - level(dark, "--rux-text-secondary");
	const lightGap = level(light, "--rux-text-secondary") - level(light, "--rux-text-primary");
	assert.ok(darkGap > 0, `dark primary must sit above secondary (gap ${darkGap})`);
	assert.ok(lightGap > 0, `light primary must sit below secondary (gap ${lightGap})`);
});
