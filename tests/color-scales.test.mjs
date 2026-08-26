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
/* One branch only. The P3 branch was removed (color.md §5 step 33), so the
   file declares each hue step exactly twice — once per theme — and these
   checks read the whole file rather than a slice of it. */
const SRGB = tokens;
const DARK_BLOCK = stripComments(SRGB.slice(0, LIGHT_AT));
const LIGHT_BLOCK = stripComments(SRGB.slice(LIGHT_AT));

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

test("the fill step is theme-invariant, with no exceptions", () => {
	/* THE INVARIANT STEP MOVED, AND SO DID THE REASON. Under Geist it was 700
	   and 800: those were the same colour in both themes in every hue while
	   100-600 and 900-1000 inverted around them, and it was a measurement of
	   the catalog rather than a rule — carried with one exception, red-800,
	   which differed by a single code value nobody could see.

	   Since color.md §5 step 34 the roles land on 200/400/900 and the fill is
	   400, and the invariance is now DERIVED rather than observed: every fill
	   carries `--rux-fg-on-fill`, a theme-invariant white literal, so a fill
	   that changed with the canvas would need two different labels and there
	   is only one. Both themes therefore declare L40 at the hue's own chroma,
	   and the measured contrast is identical either side — 9.58 danger, 9.56
	   info, 9.42 warning, 8.07 success.

	   No exception list. The old one existed because §3.1 recorded what the
	   catalog measured and flattening it would have been choosing; these
	   values ARE chosen, so an exception here would mean a mistake. */
	const differ = [];
	for (const scale of HUES) {
		const name = `--rux-${scale}-400`;
		if (declOf(LIGHT_BLOCK, name) !== declOf(DARK_BLOCK, name)) differ.push(name);
	}
	assert.deepEqual(
		differ,
		[],
		"The fill step gained a theme difference. Every fill shares one white " +
			"label, so a per-theme fill cannot be labelled — move the value back " +
			"or amend color.md rule 2.11 first.",
	);
});

test("every step records the measurement it came from", () => {
	/* color.md rule 2.10: the published value is OKLCH, the measured value is
	   the catalog's HSL, and the conversion is recorded beside it. Without the
	   comment the provenance is gone and the next reader cannot check the
	   conversion — which is how a measured system decays into a chosen one. */
	/* The sRGB branch only. Its values were CONVERTED from the catalog's HSL, so
	   the source has to travel with them or the conversion cannot be rechecked.
	   The P3 branch has no HSL to cite — the catalog authors those steps in
	   oklch and they were measured as oklch — so requiring a comment there
	   would be demanding provenance that does not exist. That branch gets its
	   own test below instead. */
	const undocumented = [];
	for (const scale of [...HUES, "gray"]) {
		for (const step of STEPS) {
			const line = SRGB.match(new RegExp(`--rux-${scale}-${step}:[^\\n]*`, "g"));
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
	// THE THREE-STEP MODEL (color.md §5 step 34). Every hue-derived role lands
	// on 200 (tint), 400 (fill) or 900 (ink) — measured on the even ramp, where
	// one lightness per step means contrast no longer depends on which hue.
	// 200 · tint: a wash on the canvas, 1.11-1.23, with its own ink at 7.4-12.6.
	"--rux-danger-subtle": "--rux-red-200",
	"--rux-warning-subtle": "--rux-amber-200",
	"--rux-success-subtle": "--rux-green-200",
	"--rux-info-subtle": "--rux-blue-200",
	// 400 · fill: white clears on all seven hues at 7.36-10.15. Was 800 until
	// step 34; 800 on the even ramp is L80% and carries no label at all.
	"--rux-danger-fill": "--rux-red-400",
	"--rux-warning-fill": "--rux-amber-400",
	"--rux-success-fill": "--rux-green-400",
	"--rux-info-fill": "--rux-blue-400",
	// 500 · fill-control: a fill carrying ONLY a label (color.md §5 step 37).
	// 400 is the last step holding BOTH of rule 2.14's floors — white at 4.5
	// (7.35 worst) and a 900 ink at 3.0 (3.36 worst, danger on teal). Drop the
	// mark and the label alone binds, so the ceiling rises one decade: white
	// clears at 500 (4.86 worst) and fails at L52 (4.49). Buttons and count
	// badges read this; trip bars, which carry both, stay on 400.
	"--rux-danger-fill-control": "--rux-red-500",
	"--rux-warning-fill-control": "--rux-amber-500",
	"--rux-success-fill-control": "--rux-green-500",
	"--rux-info-fill-control": "--rux-blue-500",
	// The accent publishes a mirror per step it is read at; 100/700/800/1000
	// stay published and unread, pending the Class C sweep.
	"--rux-accent-100": "--rux-blue-100",
	"--rux-accent-200": "--rux-blue-200",
	"--rux-accent-300": "--rux-blue-300",
	"--rux-accent-400": "--rux-blue-400",
	"--rux-accent-500": "--rux-blue-500",
	"--rux-accent-700": "--rux-blue-700",
	"--rux-accent-800": "--rux-blue-800",
	"--rux-accent-900": "--rux-blue-900",
	"--rux-accent-1000": "--rux-blue-1000",
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

test("every state pair actually moves (color.md §5 steps 41-43)", () => {
	/* The recurring defect in this component set is not a wrong value — it is
	   TWO STATE NAMES RESOLVING TO ONE VALUE, which renders as a control that
	   does not respond. It has now been found four times: the link hover
	   (step 43), the checkbox's three checked states (step 40), the driver
	   grid's busy+unavailable hover (step 41), and the owner's own
	   hover/pressed proposal (step 39). A value test cannot catch it; this
	   compares the pair. */
	const pairs = [
		["--rux-link-fg", "--rux-link-fg-hover"],
		["--rux-checkbox-checked-bg", "--rux-checkbox-checked-hover-bg"],
		["--rux-checkbox-checked-hover-bg", "--rux-checkbox-checked-active-bg"],
		["--rux-checkbox-checked-border", "--rux-checkbox-checked-hover-border"],
		["--rux-button-accent-background", "--rux-button-accent-hover-background"],
		["--rux-button-accent-hover-background", "--rux-button-accent-active-background"],
		["--rux-switch-checked-bg", "--rux-switch-checked-hover-bg"],
		["--rux-switch-checked-hover-bg", "--rux-switch-checked-active-bg"],
	];
	const collapsed = [];
	for (const [a, b] of pairs) {
		const va = declOf(DARK_BLOCK, a), vb = declOf(DARK_BLOCK, b);
		if (va && vb && va === vb) collapsed.push(`${a} and ${b} are both ${va}`);
	}
	assert.deepEqual(collapsed, [], "a state pair collapsed — that control gives no feedback");
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

test("every published fill reads the step its function needs (rule 2.14)", () => {
	/* TWO BANDS SINCE STEP 37, because rule 2.14's functions have different
	   floors and one rung cannot be the ceiling for both.

	     400  -fill          F1 + F2   white 7.35 worst, 900 ink 3.36 worst
	     500  -fill-control  F1 only   white 4.86 worst

	   Each is the LAST step that works for its function, which is what makes
	   this assertable rather than a preference: at L44 the ink is 2.84 and 400
	   is already the ceiling for a marked fill; at L52 the label is 4.49 and
	   500 is the ceiling for an unmarked one. Measured 2026-08-26, dark,
	   canvas-rasterised.

	   A CORRECTION THIS TEST CARRIED: the previous comment said "500 is the
	   first that does not (4.44 worst)". 500 measures 4.86 and clears. 4.44 is
	   Geist's blue-700 number, quoted throughout the pre-step-34 document and
	   left behind here when the scales stopped being Geist's — a stale figure
	   that would have blocked exactly this amendment. color.md §5 step 37.

	   Pinned 800 from step 9 to step 34. */
	for (const [role, step] of [
		["--rux-danger-fill", "--rux-red-400"],
		["--rux-warning-fill", "--rux-amber-400"],
		["--rux-success-fill", "--rux-green-400"],
		["--rux-info-fill", "--rux-blue-400"],
		["--rux-danger-fill-control", "--rux-red-500"],
		["--rux-warning-fill-control", "--rux-amber-500"],
		["--rux-success-fill-control", "--rux-green-500"],
		["--rux-info-fill-control", "--rux-blue-500"],
		// The categorical half of the same rung (step 38), named by hue rather
		// than by meaning. All seven, so a categorical consumer never has to
		// know which hues a status has already claimed.
		["--rux-blue-fill-control", "--rux-blue-500"],
		["--rux-red-fill-control", "--rux-red-500"],
		["--rux-amber-fill-control", "--rux-amber-500"],
		["--rux-green-fill-control", "--rux-green-500"],
		["--rux-teal-fill-control", "--rux-teal-500"],
		["--rux-purple-fill-control", "--rux-purple-500"],
		["--rux-pink-fill-control", "--rux-pink-500"],
		// The control ladder (step 39): rest 500 -> hover 400 -> pressed 300.
		// Darkening never costs label contrast, so these two states cannot fail
		// the floor; they are pinned so the LADDER cannot be broken — a hover
		// that stops darkening, or a pressed that lands on the hover rung and
		// gives no feedback, both fail here.
		["--rux-danger-fill-control-hover", "--rux-red-400"],
		["--rux-warning-fill-control-hover", "--rux-amber-400"],
		["--rux-success-fill-control-hover", "--rux-green-400"],
		["--rux-info-fill-control-hover", "--rux-blue-400"],
		["--rux-danger-fill-control-pressed", "--rux-red-300"],
		["--rux-warning-fill-control-pressed", "--rux-amber-300"],
		["--rux-success-fill-control-pressed", "--rux-green-300"],
		["--rux-info-fill-control-pressed", "--rux-blue-300"],
		// Every solid control on the same ladder (step 40). The checkbox is
		// pinned as a TRIPLE because its three states were one value before —
		// three names, one colour, no feedback. If they collapse again, here.
		["--rux-checkbox-checked-bg", "--rux-accent-500"],
		["--rux-checkbox-checked-hover-bg", "--rux-accent-400"],
		["--rux-checkbox-checked-active-bg", "--rux-accent-300"],
		// The border travels with the fill (step 42). Pinned because step 40
		// moved the fill and left the border behind, which is exactly the
		// failure this catches: an edge lighter than the thing it encloses.
		["--rux-checkbox-checked-border", "--rux-accent-500"],
		["--rux-checkbox-checked-hover-border", "--rux-accent-400"],
		["--rux-checkbox-checked-active-border", "--rux-accent-300"],
		// The unchecked hover border is the colour the box BECOMES when
		// checked, and the only candidate clearing F4's 3:1 against the box's
		// own fill (3.17; gray-500 gives 2.06, accent-400 2.07). It read
		// --rux-accent, the 900 ink, at 12.41 and in a 34°-clipped hue.
		["--rux-checkbox-hover-border", "--rux-accent-500"],
		// The whole form family on one rung (step 43), so the three cannot
		// drift apart again — they held the same wrong value for as long as
		// they have held the same right one.
		["--rux-input-hover", "--rux-accent-500"],
		["--rux-choicebox-hover-border", "--rux-accent-500"],
		["--rux-choicebox-checked-border", "--rux-accent-500"],
		// F1: text sits ON the selection, so it is a fill, not an ink.
		["--rux-selection-bg", "--rux-accent-500"],
		// A link is TEXT: 700 rest, 800 hover. Pinned as a PAIR because the
		// defect this replaced was the two collapsing onto one value.
		["--rux-link-fg", "--rux-accent-700"],
		["--rux-link-fg-hover", "--rux-accent-800"],
		// The focus ring (step 45). On a step, so the companion test
		// "a role on a step is not overridden per theme" now guards the light
		// override that was deleted with it — one declaration, both themes.
		["--rux-accent-ring", "--rux-accent-700"],
		["--rux-switch-checked-bg", "--rux-accent-500"],
		["--rux-slider-fill-bg", "--rux-accent-500"],
		["--rux-button-accent-background", "--rux-accent-500"],
	]) {
		assert.match(
			stripComments(SRGB),
			new RegExp(`${role}:\\s*var\\(${step}\\)`),
			`${role} must read ${step} — the step chosen by the worse gamut`,
		);
	}
});
