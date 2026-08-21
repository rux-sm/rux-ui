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
	for (const role of ["--rux-text-primary", "--rux-text-secondary"]) {
		assert.match(
			tokens,
			new RegExp(`${role}:\\s*oklch\\(`),
			`${role} must be a real value, not an alias`,
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

test("both themes define the pair with the same separation", () => {
	// Perceptual distance, not contrast ratio — OKLCH lightness is uniform, so
	// an equal gap reads as an equal step from either end of the scale.
	const level = (block, name) =>
		Number(block.match(new RegExp(`${name}:\\s*oklch\\(from [^)]+\\) (\\d+)%`))?.[1]);
	const cut = tokens.indexOf(':root[data-theme="light"]');
	const dark = tokens.slice(0, cut);
	const light = tokens.slice(cut);

	const darkGap = level(dark, "--rux-text-primary") - level(dark, "--rux-text-secondary");
	const lightGap = level(light, "--rux-text-secondary") - level(light, "--rux-text-primary");
	assert.ok(darkGap > 0, "dark primary must sit above secondary");
	assert.ok(lightGap > 0, "light primary must sit below secondary");
	assert.equal(darkGap, lightGap, "the two themes must separate the pair equally");
});
