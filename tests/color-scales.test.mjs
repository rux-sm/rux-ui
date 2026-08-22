import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/* Tier 0 of docs/foundations/color.md: the Geist colour catalog, adopted whole
   by steps 2 and 3 under Q1's answer. Every value was measured off the rendered
   vercel.com/geist/colors page and converted to OKLCH; this suite asserts the
   shape of what landed, not the taste of it.

   The important test is the last one. These 164 tokens are published AHEAD of
   any consumer — legal under README.md §2.1's Class A contract ("no downstream
   effect until a consumer opts in"), and the same mechanism typography.md §5
   step 38 used for a role published before its migration. What makes that
   honest rather than hopeful is asserting the other half: they are complete,
   AND nothing reads them. The moment step 4 points a role at a step, the last
   test fails and the migration has to be recorded. */

const ROOTS = ["rux-ui/css", "scheduler/css"];
const cssFiles = (dir, out = []) => {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) cssFiles(path, out);
		else if (entry.endsWith(".css")) out.push(path);
	}
	return out;
};
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const FILES = ROOTS.flatMap((root) => cssFiles(root));
const sources = FILES.map((path) => ({ path, css: readFileSync(path, "utf8") }));
const tokens = readFileSync("rux-ui/css/tokens.css", "utf8");

const HUES = ["blue", "red", "amber", "green", "teal", "purple", "pink"];
const SCALES = ["gray", "gray-alpha", ...HUES];
const STEPS = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

/* The light theme re-declares every step inside :root[data-theme="light"].
   Splitting there is what lets "defined in both themes" be a real assertion
   rather than "defined at least once somewhere". */
const LIGHT_AT = tokens.indexOf(':root[data-theme="light"]');
const DARK_BLOCK = stripComments(tokens.slice(0, LIGHT_AT));
const LIGHT_BLOCK = stripComments(tokens.slice(LIGHT_AT));

const declOf = (block, name) =>
	block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim() ?? null;

test("every scale publishes all ten steps, in both themes", () => {
	assert.ok(LIGHT_AT > 0, "no light theme block");
	const missing = [];
	for (const scale of SCALES) {
		for (const step of STEPS) {
			const name = `--rux-${scale}-${step}`;
			if (!declOf(DARK_BLOCK, name)) missing.push(`${name} (dark)`);
			if (!declOf(LIGHT_BLOCK, name)) missing.push(`${name} (light)`);
		}
	}
	assert.deepEqual(missing, []);
});

test("both backgrounds are published in both themes", () => {
	for (const step of [100, 200]) {
		const name = `--rux-background-${step}`;
		assert.ok(declOf(DARK_BLOCK, name), `${name} missing in dark`);
		assert.ok(declOf(LIGHT_BLOCK, name), `${name} missing in light`);
	}
});

test("a step states a literal colour, never a reference", () => {
	/* Tier 0 is where values live. A step aliasing another token would make the
	   scale a set of pointers and put the real value somewhere unnamed. */
	for (const block of [DARK_BLOCK, LIGHT_BLOCK]) {
		for (const scale of SCALES) {
			for (const step of STEPS) {
				const v = declOf(block, `--rux-${scale}-${step}`);
				if (!v) continue;
				assert.match(v, /^oklch\(/, `--rux-${scale}-${step} is ${v}`);
				assert.doesNotMatch(v, /var\(/, `--rux-${scale}-${step} reads another token`);
			}
		}
	}
});

test("the neutral scale is neutral (rule 2.8, Q3)", () => {
	/* The catalog's greys are hsl(0 0% n) — chroma 0 at every step of both
	   themes. --rux-neutral's 0.004 tint is this system's, and is not one of
	   them; roles still reading it are what steps 4-6 move. */
	for (const block of [DARK_BLOCK, LIGHT_BLOCK]) {
		for (const step of STEPS) {
			for (const scale of ["gray", "gray-alpha"]) {
				const v = declOf(block, `--rux-${scale}-${step}`);
				assert.match(
					v,
					/^oklch\((?:[\d.]+%|0)\s+0\s+0(?:\s*\/\s*[\d.]+%)?\)$/,
					`--rux-${scale}-${step} is ${v}, not an achromatic OKLCH`,
				);
			}
		}
	}
});

test("the high-contrast steps are theme-invariant, but for one measured exception", () => {
	/* Measured on the catalog and recorded in color.md §3.1: 700 and 800 are
	   the same colour in both themes in every hue scale — a high-contrast fill
	   does not change with the canvas — while 100-600 and 900-1000 invert
	   around them. This is the catalog's whole theming model, so it is worth a
	   ratchet: a light-theme override on a 700 means someone re-tuned a fill.

	   THE EXCEPTION IS RED-800, and it is the catalog's, not this system's.
	   It measures hsl(358 69% 52%) dark and hsl(358 70% 52%) light — one
	   percentage point of saturation, which is one code value in the red
	   channel (217 vs 218) and nothing a reader can see. It is carried rather
	   than smoothed away because these values are a measurement: flattening the
	   two to one number would be choosing, and the point of §3.1 is that
	   nothing here was chosen. Found by this test when it was first written
	   asserting invariance across all fourteen pairs. */
	const EXCEPTIONS = new Set(["--rux-red-800"]);
	const differ = [];
	for (const scale of HUES) {
		for (const step of [700, 800]) {
			const name = `--rux-${scale}-${step}`;
			if (declOf(LIGHT_BLOCK, name) !== declOf(DARK_BLOCK, name)) differ.push(name);
		}
	}
	assert.deepEqual(
		differ,
		[...EXCEPTIONS],
		"A high-contrast step gained or lost a theme difference. If the catalog " +
			"really differs there, measure it and name it here; otherwise it is a re-tune.",
	);
});

test("every step records the measurement it came from", () => {
	/* color.md rule 2.10: the published value is OKLCH, the measured value is
	   the catalog's HSL, and the conversion is recorded beside it. Without the
	   comment the provenance is gone and the next reader cannot check the
	   conversion — which is how a measured system decays into a chosen one. */
	const undocumented = [];
	for (const scale of [...HUES, "gray"]) {
		for (const step of STEPS) {
			const line = tokens.match(
				new RegExp(`--rux-${scale}-${step}:[^\\n]*`, "g"),
			);
			for (const l of line ?? []) {
				if (!/\/\* hsl\(/.test(l)) undocumented.push(l.trim().slice(0, 60));
			}
		}
	}
	assert.deepEqual(undocumented, []);
});

/* Rule 1.1: a role resolves to ONE step of one scale per theme. This replaced
   the published-but-unread honesty test at steps 4-6, which was that test doing
   its job — it failed the moment a role adopted a step, which is what forced
   the migration to be recorded rather than absorbed.

   Only roles the catalog HAS a step for are listed. Four deliberately are not,
   and their absence is the point (color.md §5 step 4): --rux-text-disabled,
   --rux-thumb-bg and --rux-overlay-scrim have no step among the ten purposes,
   and --rux-neutral / -black / -white / -gray are the pre-catalog Tier 0 that
   still backs them. Adding one of those here would be claiming a conformance
   this system does not have. */
const ON_A_STEP = {
	"--rux-surface-0": "--rux-background-200",
	"--rux-surface-1": "--rux-background-100",
	"--rux-surface-2": "--rux-gray-100",
	"--rux-bg-hover": "--rux-gray-200",
	"--rux-bg-active": "--rux-gray-300",
	"--rux-grid-guide": "--rux-gray-400",
	"--rux-card-border": "--rux-gray-400",
	"--rux-card-border-hover": "--rux-gray-500",
	"--rux-card-border-active": "--rux-gray-600",
	"--rux-text-secondary": "--rux-gray-900",
	"--rux-text-primary": "--rux-gray-1000",
	"--rux-state-hover-overlay": "--rux-gray-alpha-200",
	"--rux-state-active-overlay": "--rux-gray-alpha-300",
	"--rux-danger-base": "--rux-red-900",
	"--rux-warning-base": "--rux-amber-900",
	"--rux-success-base": "--rux-green-900",
	"--rux-info-base": "--rux-blue-900",
	"--rux-danger-subtle": "--rux-red-100",
	"--rux-warning-subtle": "--rux-amber-100",
	"--rux-success-subtle": "--rux-green-100",
	"--rux-info-subtle": "--rux-blue-100",
	"--rux-danger-fill": "--rux-red-700",
	"--rux-warning-fill": "--rux-amber-700",
	"--rux-success-fill": "--rux-green-700",
	"--rux-info-fill": "--rux-blue-700",
	"--rux-danger-on-fill": "--rux-red-1000",
	"--rux-accent-700": "--rux-blue-700",
	"--rux-accent-800": "--rux-blue-800",
	"--rux-accent-900": "--rux-blue-900",
	"--rux-accent-1000": "--rux-blue-1000",
	"--rux-accent-100": "--rux-blue-100",
};

test("every role with a catalog step reads that step (rule 1.1)", () => {
	const wrong = [];
	for (const [role, step] of Object.entries(ON_A_STEP)) {
		const v = declOf(DARK_BLOCK, role);
		if (v !== `var(${step})`) wrong.push(`${role} is ${v}, expected var(${step})`);
	}
	assert.deepEqual(wrong, []);
});

test("a role on a step is not overridden per theme", () => {
	/* The point of a step is that it already carries a value per theme. A role
	   that reads one AND re-states itself in the light block has two sources of
	   truth, and the light block's is the one that silently wins. Removing ~30
	   such overrides is most of what step 4 did. */
	const redundant = Object.keys(ON_A_STEP).filter((r) => declOf(LIGHT_BLOCK, r));
	assert.deepEqual(redundant, []);
});

test("the accent is a scale selection, not a colour (rule 2.12)", () => {
	/* Q4/D11: Rux.setAccent() has written [data-rux-accent] since long before
	   any stylesheet read it. Each accent repoints the same four steps, so
	   every downstream accent role follows without knowing a switch happened. */
	for (const [accent, scale] of [
		["violet", "purple"],
		["green", "green"],
		["amber", "amber"],
	]) {
		const block = tokens.match(
			new RegExp(`:root\\[data-rux-accent="${accent}"\\]\\s*\\{([^}]*)\\}`),
		);
		assert.ok(block, `no rule for [data-rux-accent="${accent}"]`);
		for (const step of [100, 700, 800, 900, 1000]) {
			assert.match(
				block[1],
				new RegExp(`--rux-accent-${step}:\\s*var\\(--rux-${scale}-${step}\\)`),
				`[data-rux-accent="${accent}"] must point --rux-accent-${step} at ${scale}`,
			);
		}
	}
});
