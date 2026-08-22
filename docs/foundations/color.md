# Rux UI Foundations — Color

**Contract version: 1.2.1** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 10 steps: **7 done · 3 open**
This document is canonical for colour in Rux UI. **Tier 0 is the catalog** (steps 2, 3) and
**Tier 1 now reads it** (steps 4–6): every surface, border, list state, control overlay,
text level, status and accent role resolves to one scale step per theme. 164 catalog values
published, 31 roles repointed, ~30 light-theme overrides deleted as redundant. The headline
is **D6 — light-theme status text went from 1.19–1.85:1 to 5.09–5.34:1**, from three times
under AA to comfortably over it.

**Where to pick up.** One decision is open — **Q8**, whether the AA floor covers text on a
fill — and it gates **step 9**. Two more steps need no decision: **7** makes rules 2.1, 2.8,
2.9 and 2.11 executable — most of what it needs now exists, since steps 2–6 added seven
tests — and **8** consolidates `README.md`, the audit's R6, the skill and the component docs
into pointers. Both are Class A.

**What is still not conformant, measured rather than assumed.** **D5**: 30 tokens in dark
and 21 in light still resolve outside sRGB — but not one of them is a role on a step. They
are `--rux-white` (chroma 0.004 at L 100), the eight legacy hue bases, and the ~20 component
tokens derived from those; closing it is the **Class C** removal the bases need. **D14**:
text on a status or accent fill measures **3.44–4.43:1** — below AA. The pairing was step 5's
inference, not a measurement, and the catalog's foundation publishes none, so **Q8** decides
it. **D9, D10, D12** likewise stay open. §4 carries all of them.

Derived from §5; `tests/foundations-contract.test.mjs` fails if this line disagrees with
the log.

**Authority.** Per `CLAUDE.md` § Foundation Work, this document authorizes its own
amendments. A change to a colour token, a colour rule, or the theme mechanism is legal when
it is a numbered step in §5, and is otherwise prohibited. `README.md` § Backgrounds, § Color
and § Reference: Vercel Geist colors are the orientation summary; where they and this
document disagree, this document wins and README is corrected in the same step — and step 8
converts them to pointers.

**Precedence.** This document outranks every downstream specification that colours Rux UI,
in this repository or any other. Scoped the same way `typography.md` is:

- **This document owns the vocabulary and its behavior** — which scales and steps exist,
  what each step is for, how the two themes relate, and what a colour token may resolve to.
- **A downstream specification owns the mapping** — which of *its* objects takes which
  step. `guide-markup.md` decides a gap marker is amber; it does not decide what amber is.
- A downstream need the vocabulary cannot express is a defect **here**, fixed by an
  amendment in §5 — never by the downstream escaping the scale. (X2/X3 in
  `typography.md` §7.4 — a downstream spec needing an amber that did not exist — is
  exactly this, and the amber scale in §3.1 is its answer.)

**Its source is Geist**, measured not read. [vercel.com/geist/colors](https://vercel.com/geist/colors)
publishes the *model* — ten scales, ten steps, one purpose per step — and no values. Every
number in §3.1 was read off the page's custom properties in a browser on 2026-08-21: the
sRGB branch (`--ds-*-value` HSL triplets) in both themes, and the P3 branch (`oklch()`
under `@supports (color-gamut: p3)`) in both themes. The page carries two generations of
its own token sheet; the values here are the ones that render.

**A component page is not this document's source, and the distinction has already cost this
repository once.** `vercel.com/geist/colors` is the foundation and is what §3.1 measures.
The component pages — Button, Badge, Note — show Geist's own *mapping* of its roles onto
that vocabulary, which is exactly what `color.md`'s precedence rule reserves to a downstream.
`typography.md` learned this the expensive way: **Q7 set the type floor at 11px because the
Badge component renders 11px, and Q11 reversed it** — "11 was Geist's floor only once its
*components* were counted rather than its type catalog." Two releases and a Class C removal
came out of that.

So a component page may **falsify** an inference — it did for D14, where Geist's error button
shows a white label rather than the 1000 step this document had guessed — but it may not
**establish** a rule here. Rux is entitled to a different mapping, and where the two differ
the reason has to be Rux's own, stated in §2.

**Two things measured on the Button page on 2026-08-21, recorded as observations rather than
authority.** Geist's fill buttons are `red-800` + white (4.79:1) and `amber-800` + near-black
(8.89:1); its default button is a `gray-1000` fill. And it publishes **no accent-coloured fill
button at all** — the page states "primary, success, ghost, and violet are not valid type
values", so `.rux-button--accent` is a Rux extension with no counterpart to copy. A blue fill
does appear on that page and is **not** evidence of anything: it sits in the *Custom* section,
which demonstrates `CustomButton` overriding the system's colours. It was briefly cited here as
Geist's standard, which is the failure mode this whole note exists to prevent.

**This document moves no code.** Execution runs against §5.

**Enforcement.** `tests/color-scales.test.mjs` is this document's own suite, eight tests:
every scale publishes ten steps in both themes; a step states a literal and never a
reference; the neutral scale is achromatic (rule 2.8); the high-contrast steps stay
theme-invariant but for the one measured exception; every step records the measurement it
came from (rule 2.10); **every role with a catalog step reads that step** (rule 1.1); a role
on a step is **not** also overridden per theme; and the accent is a scale selection
(rule 2.12). The sixth of those replaced a published-but-unread assertion at step 4 — that
assertion's whole job was to fail when a role adopted a step, which is what forced the
migration to be recorded rather than absorbed.

Four suites predate this document and three were repointed by steps 4–6:
`tests/text-roles.test.mjs` (rule 2.6 — now asserts each level *names* its step, and that
each theme separates the pair in the right direction rather than equally),
`tests/tokens-contract.test.mjs` (rule 2.1's first half — every `var()` resolves),
`tests/focus-contract.test.mjs` (rule 2.5 — every interactive file keys `:focus-visible`
to `--rux-accent-ring`), `tests/ghost-button-hover.test.mjs` (the overlay arithmetic, now
resolving through `gray-alpha` and reading the surface off `background-100`).
`tests/state-contract.test.mjs` **no longer** carries `data-rux-accent` as accepted debt —
step 6 published the rules it was holding a place for. Rule 2.9 (in-gamut) and rule 2.11
(the AA floor) still have **no test** — step 7.

The terms **MUST**, **SHOULD**, **MAY**, and **MUST NOT** describe required, preferred,
optional, and prohibited behavior.

---

## 1. The three tiers

| Tier | What it is | Named by | Lives in |
|---|---|---|---|
| **0 · Scales** | the catalog's ten-step scales — `gray`, `gray-alpha`, `blue`, `red`, `amber`, `green`, `teal`, `purple`, `pink` — and the two `background` steps, **both themes** | scale and **step** (`gray-400`, `blue-700`) | `rux-ui/css/tokens.css` |
| **1 · Roles** | `--rux-surface-0`, `--rux-card-border-hover`, `--rux-text-secondary`, `--rux-danger`, `--rux-accent` — one purpose, aliasing one step per theme | its **purpose** | `rux-ui/css/tokens.css` |
| **2 · Component tokens** | `--rux-button-ghost-text`, `--rux-field-label-fg`, `--rux-badge-*` — a component's own mapping onto roles | the component | `rux-ui/css/tokens.css` component blocks |

**Tier 0 is the catalog** (steps 2, 3) and **Tier 1 reads it** (steps 4–6). Every role that
the catalog has a step for now names that step, in one place, and the step carries a value
per theme — which is why the light-theme block lost about thirty overrides in the process:
a role reading `var(--rux-gray-400)` is correct in both themes by construction.

Until step 4 every role was instead a *recipe* on `--rux-neutral` (OKLCH L 50 C 0.004
H 255) or on one of eight hue bases (`--rux-red` … `--rux-pink`, chroma 0.28), with the
light block re-stating each recipe from the other end. That shape had a real virtue —
retheming was one number — and one real cost: no role named a step, so "is this the hover
border" was answered by reading a lightness and remembering the catalog's table. Q1 traded
the first for the second. **The bases are still published**, because roles outside the
catalog's ten purposes still derive from them and removing a published name is Class C.

**Rule 1.1** — A role MUST resolve to one step of one scale per theme. A role that
interpolates between steps, or derives from another role's value, is not on the catalog.
Enforced by `tests/color-scales.test.mjs`.

**Rule 1.1a — a role the catalog has no step for is named, not forced.** Four are, and each
records why in `tokens.css`: `--rux-text-disabled` (rule 2.6 — the ten purposes contain no
disabled text, and a state is not an emphasis level), `--rux-thumb-bg` (no raised opaque
fill), `--rux-overlay-scrim` (the catalog carries its backdrop under Materials, which this
document has not measured), and the legacy Tier 0 that still backs them. Forcing one onto
the nearest step by value would make that step serve two purposes, which rule 2.2 forbids —
the wrong kind of conformance.

**Rule 1.2** — A component token MUST read a role, never a scale step directly and never a
literal. The step a component's hover border takes is the *hover border* role's to decide.

**Rule 1.3** — A colour used by exactly one component is that component's token, not a
role (`typography.md` rule 1.2 applied to colour).

---

## 2. Rules

**2.1 Tokens only, both themes.** No literal colour in any rule outside `tokens.css`;
print stylesheets excepted behind a namespaced palette. Every token stating an absolute
lightness MUST have a light-theme override or a relative (`from var()`) definition. *(This
is `../audit/design-system-audit.md` §5 R6's colour half, which that document committed
to move here; the first sentence is enforced by `tests/tokens-contract.test.mjs`, the
second by nothing — D12, step 7.)*

**2.2 Ten steps, one purpose each.** The catalog's model, and this document's vocabulary:

| Step | Purpose | Rux role today |
|---|---|---|
| `100` | Default background | `--rux-surface-2` |
| `200` | Hover background | `--rux-bg-hover` |
| `300` | Active background | `--rux-bg-active` |
| `400` | Default border | `--rux-card-border` |
| `500` | Hover border | `--rux-card-border-hover` |
| `600` | Active border | `--rux-card-border-active` |
| `700` | High-contrast background | `--rux-accent` (blue), `--rux-danger-fill` (red) |
| `800` | Hover high-contrast background | — (D7) |
| `900` | Secondary text and icons | `--rux-text-secondary`; status text (D6) |
| `1000` | Primary text and icons | `--rux-text-primary` |

Plus two **backgrounds** outside the scale: `background-100` (element backgrounds —
`--rux-surface-1`) and `background-200` (the page — `--rux-surface-0`). A role MUST name
which step it is; a step MUST NOT serve two purposes.

**2.3 Two surfaces, and a three-step band above them.** The canvas is `background-200`;
everything raised off it — cards, menus, dialogs — is `background-100`. A *component's own*
background (a button, an input, a tag) is the scale's 100, hovering to 200 and pressing to
300. Nothing else is a background. *(`README.md` § Backgrounds states this today; step 8
makes it a pointer.)*

**2.4 Borders are 400 / 500 / 600, default / hover / active.** One family for the whole
system. A grid line is a border at rest.

**2.5 High-contrast fills are 700, hovering to 800, and 800 is darker.** The accent button,
the danger button, a solid badge. The catalog's 800 step is *darker* than its 700 in both
themes (blue 48% → 41% HSL lightness); a hover that lightens is off the model (D7). Focus
rings are the catalog's `focus-color` — blue-900 in dark, blue-700 in light — and every
interactive element's `:focus-visible` reads `--rux-accent-ring` (enforced).

**2.6 Two text levels, 900 and 1000.** Secondary and primary; nothing between, nothing
beyond. Disabled is a **state**, not a level, and stays outside the pair. *(Enforced by
`tests/text-roles.test.mjs`; this was five levels until `typography.md` step 9.)*

**2.7 A status is a scale, not a colour.** Danger is the red scale, warning amber, success
green, info blue. A status role names the scale and takes **the step its purpose needs** —
text at 900, a solid fill at 700, a tint at 100, a tinted border at 400 — exactly as the
neutral roles do. A status token that is one hue at a hand-picked lightness is a recipe,
not a role (D6, D8).

**2.8 Neutral is neutral.** The gray scale has chroma **0**. A tinted gray is a ninth hue
scale, and the catalog has none. *(True of the scale since step 2, and enforced. Still
false of the roles, which read `--rux-neutral` at C 0.004 — D4, closed by step 4.)*

**2.9 Every token resolves inside sRGB.** A value the browser has to gamut-map is a value
nobody chose. The catalog's P3 branch is a separate, opt-in declaration under
`@supports (color-gamut: p3)`, and a token MUST NOT depend on it. *(Today every chromatic
Rux token is outside sRGB — D5.)*

**2.10 OKLCH is the expression; the catalog's sRGB is the value.** This system writes
every colour as `oklch()` so a hue can be retuned without re-deriving its lightness. The
catalog writes its sRGB branch as HSL. Adopting a step means converting its sRGB value to
OKLCH and **recording the measured HSL beside it**; the rendered colour is what conforms,
not the syntax, and the comment is what lets the next reader check the conversion instead
of trusting it. Enforced by `tests/color-scales.test.mjs`. **The conversion is lossless at
8-bit** — all 164 published steps were verified in a browser to rasterize to the same pixel
as the HSL they came from, which is what sets the precision at two decimals of `L` (at one,
four of them drift by a single code value). *(Q5, step 2.)*

**2.11 Text meets AA against the surface it is published for.** 4.5:1 for the 900 and
1000 steps of every scale against `background-100` and `-200`, both themes. The catalog's
neutrals measure 8.0:1 and 17.9:1 (dark) and 8.5:1 and 17.9:1 (light); its status 900s
measure 5.3–5.6:1 in light. *(D6, fixed at step 5, was Rux light-theme status text at
1.19–1.85:1.)*

**This rule does not cover text on a fill, and that gap is deliberate until Q8 settles it.**
The floor above is stated against the two *backgrounds*, because those are the pairings the
catalog's foundation actually publishes. A label on a `700` fill is a pairing it does not
publish, so extending the floor there would be this system originating a rule rather than
adopting one — which it may well decide to do (D14 is the reason), but as an amendment with
its own step, not as a reading of this sentence.

**2.12 Accent is a scale selection.** `--rux-accent` is a chromatic scale's 700, its hover
that scale's 800, its tint that scale's 100, its ring the catalog's focus colour. Switching
the accent means switching which scale those four read — which is what `data-rux-accent`
exists for, and what its CSS has never done (D11). The catalog publishes no accent switch;
this is a Rux extension, and it is expressible only once Tier 0 is the catalog.

---

## 3. Current state

Measured 2026-08-21. §3.1 is the catalog as vercel.com renders it; §3.2 is Rux as
`index.html` and `gallery.html` resolve it; §3.3 sets them side by side.

### 3.1 The catalog, measured

**Neutrals and backgrounds.** The sRGB branch, as HSL lightness, with the OKLCH lightness
each converts to (greys: `L = ∛(linear)`, rounded to 0.1) so the Rux column in §3.3 reads
in the same unit.

| Step | Purpose | Dark HSL L | Dark OKLCH L | Light HSL L | Light OKLCH L |
|---|---|---|---|---|---|
| `background-200` | page | 0% | **0.0** | 98% | **98.5** |
| `background-100` | elements | 4% | **14.6** | 100% | **100** |
| `gray-100` | default bg | 10% | 21.6 | 95% | 96.2 |
| `gray-200` | hover bg | 12% | 23.7 | 92% | 93.9 |
| `gray-300` | active bg | 16% | 28.0 | 90% | 92.3 |
| `gray-400` | default border | 18% | **30.1** | 92% | 93.9 |
| `gray-500` | hover border | 27% | **39.0** | 79% | 83.7 |
| `gray-600` | active border | 53% | **62.4** | 66% | 73.3 |
| `gray-700` | high-contrast bg | 56% | 64.9 | 56% | 64.9 |
| `gray-800` | hover high-contrast | 49% | 59.0 | 49% | 59.0 |
| `gray-900` | secondary text | 63% | **70.8** | 30% | 41.8 |
| `gray-1000` | primary text | 93% | **94.7** | 9% | 20.4 |

Two things the table shows that the prose does not: in light theme `gray-400` (default
border) and `gray-200` (hover background) are the **same** value, 92%; and `gray-800` is
darker than `gray-700` in both themes — the hover on a high-contrast fill *deepens*.

**`gray-alpha`** — the same ten purposes as translucent white (dark) or black (light):

| Step | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000 |
|---|---|---|---|---|---|---|---|---|---|---|
| Dark, white at | 6% | 9% | 13% | 14% | 24% | 51% | 54% | 47% | 61% | 92% |
| Light, black at | 5% | 8% | 10% | 8% | 21% | 34% | 44% | 51% | 70% | 91% |

**The seven hue scales**, sRGB branch, HSL `h s% l%`. Dark theme:

| Step | blue | red | amber | green | teal | purple | pink |
|---|---|---|---|---|---|---|---|
| `100` | 216 50 12 | 357 37 12 | 35 100 8 | 136 50 9 | 169 78 7 | 283 30 12 | 335 32 12 |
| `200` | 214 59 15 | 357 46 16 | 32 100 10 | 137 50 12 | 170 74 9 | 281 38 16 | 335 43 16 |
| `300` | 213 71 20 | 356 54 22 | 33 100 15 | 136 50 14 | 171 75 13 | 279 44 23 | 335 47 21 |
| `400` | 212 78 23 | 357 55 26 | 35 100 17 | 135 70 16 | 171 85 13 | 277 46 28 | 335 51 22 |
| `500` | 211 86 27 | 357 60 32 | 35 91 22 | 135 70 23 | 172 85 20 | 274 49 35 | 335 57 27 |
| `600` | 206 100 50 | 358 75 59 | 39 85 49 | 135 70 34 | 172 85 32 | 272 51 54 | 336 75 40 |
| `700` | **212 100 48** | 358 75 59 | 39 100 57 | 131 41 46 | 173 80 36 | 272 51 54 | 336 80 58 |
| `800` | 212 100 41 | 358 69 52 | 35 100 52 | 132 43 39 | 173 83 30 | 272 47 45 | 336 74 51 |
| `900` | 210 100 66 | 358 100 69 | 39 90 50 | 131 43 57 | 174 90 41 | 275 80 71 | 341 90 67 |
| `1000` | 206 100 96 | 353 90 96 | 40 94 93 | 136 73 94 | 166 71 93 | 281 73 96 | 333 90 96 |

Light theme:

| Step | blue | red | amber | green | teal | purple | pink |
|---|---|---|---|---|---|---|---|
| `100` | 212 100 97 | 0 100 97 | 39 100 95 | 120 60 96 | 169 70 96 | 276 100 97 | 330 100 96 |
| `200` | 210 100 96 | 0 100 96 | 44 100 92 | 120 60 95 | 167 70 94 | 277 87 97 | 340 90 96 |
| `300` | 210 100 94 | 0 100 95 | 43 96 90 | 120 60 91 | 168 70 90 | 274 78 95 | 340 82 94 |
| `400` | 209 100 90 | 0 90 92 | 42 100 78 | 122 60 86 | 170 70 85 | 276 71 92 | 341 76 91 |
| `500` | 209 100 80 | 0 82 85 | 38 100 71 | 124 60 75 | 170 70 72 | 274 70 82 | 340 75 84 |
| `600` | 208 100 66 | 359 90 71 | 36 90 62 | 125 60 64 | 170 70 57 | 273 72 73 | 341 75 73 |
| `700` | **212 100 48** | 358 75 59 | 39 100 57 | 131 41 46 | 173 80 36 | 272 51 54 | 336 80 58 |
| `800` | 212 100 41 | 358 70 52 | 35 100 52 | 132 43 39 | 173 83 30 | 272 47 45 | 336 74 51 |
| `900` | 211 100 42 | 358 66 48 | 30 100 32 | 133 50 32 | 174 91 25 | 274 71 43 | 336 65 45 |
| `1000` | 211 100 15 | 355 49 15 | 20 79 17 | 128 29 15 | 171 80 13 | 276 100 15 | 333 74 15 |

**The 700 and 800 steps are theme-invariant** — the high-contrast fill is the same colour
on both canvases — and the 100–600 band and 900–1000 pair invert around them. That is the
catalog's whole theming model in one observation, and the Rux light block that re-states
every recipe is the long way of saying it.

**With one exception, which is the catalog's and not this system's:** `red-800` measures
`358 69% 52%` dark and `358 70% 52%` light — one percentage point of saturation, one code
value in the red channel (217 vs 218), invisible. It is carried rather than smoothed,
because §3.1 is a measurement and flattening two numbers into one would be a choice. Found
by `tests/color-scales.test.mjs` when that test was first written asserting invariance
across all fourteen pairs; the sentence above had claimed it without checking.

**The P3 branch** restates every hue step as `oklch()` under `@supports (color-gamut:
p3)` and the greys as-is. Read and recorded for the 700s, the step the accent and the
fills take: blue `57.61% .2321 258.23` (dark) / `57.61% .2508 258.23` (light); red `62.56%
.2234 23.03` / `.2524`; amber `81.87% .1969 76.46` both; green `64.58% .199 147.27` /
`.1746`; teal `64.92% .1403 181.95` / `.1572`; purple `55.5% .2186 306.12` / `.3008`; pink
`63.52% .2346 1.01` / `.238`. Chroma peaks at **0.30** (purple-700, light, P3) and is
otherwise ≤ 0.25. **Focus colour:** blue-900 in dark (`71.7% .1648 250.794`), blue-700 in
light; the ring is `0 0 0 2px background-100, 0 0 0 4px focus-color` — a 2px gap, then 2px
of colour.

### 3.2 Rux, resolved

Every colour role below was resolved on the running app through a probe element, dark then
light, after steps 4–6. **A role with a catalog step names that step and nothing else.**

| Role | Step | Dark | Light |
|---|---|---|---|
| `--rux-surface-0` | `background-200` | 0 | 98.48 |
| `--rux-surface-1` | `background-100` | 14.57 | 100 |
| `--rux-surface-2`, `--rux-input-bg-disabled` | `gray-100` | 21.56 | 96.19 |
| `--rux-bg-hover` | `gray-200` | 23.76 | 93.89 |
| `--rux-bg-active` | `gray-300` | 28.01 | 92.34 |
| `--rux-grid-guide`, `--rux-card-border` | `gray-400` | 30.08 | 93.89 |
| `--rux-card-border-hover` | `gray-500` | 38.99 | 83.73 |
| `--rux-card-border-active` | `gray-600` | 62.39 | 73.26 |
| `--rux-text-secondary` | `gray-900` | 70.79 | 41.84 |
| `--rux-text-primary` | `gray-1000` | 94.66 | 20.44 |
| `--rux-state-hover-overlay` | `gray-alpha-200` | white 9.02% | black 7.84% |
| `--rux-state-active-overlay` | `gray-alpha-300` | white 12.94% | black 10.2% |
| `--rux-danger` / `-warning` / `-success` / `-info` | `{scale}-900` | 69.83 / 77.24 / 73.22 / 71.78 | 54.99 / 52.75 / 51.57 / 53.3 |
| `--rux-*-subtle` | `{scale}-100` | 22.12 / 22.53 / 22.94 / 22.34 | 96.63 / 97.59 / 97.54 / 97.26 |
| `--rux-*-fill` | `{scale}-700` | 62.54 / 81.73 / 64.65 / 57.91 | same — 700 is theme-invariant |
| `--rux-*-fill-hover` | `{scale}-800` | 58.04 / 77.21 / 57.82 / 51.64 | same, but for `red-800` (§3.1) |
| `--rux-danger-on-fill`, `-on-vivid` | `{scale}-1000` | 95.71 | 24.91 |
| `--rux-accent` | `accent-700` → `blue-700` | 57.91 | 57.91 |
| `--rux-accent-hover` | `accent-800` | 51.64 | 51.64 |
| `--rux-accent-subtle` | `accent-100` | 22.34 | 97.26 |
| `--rux-accent-ring` | `accent-900` dark, `accent-700` light | 71.78 | 57.91 |
| `--rux-link-fg` / `-hover` | `accent-900` / `accent-1000` | 71.78 / 96.76 | 53.3 / 26.58 |

**Converged, and kept published only because removing a name is Class C:** `-strong`
resolves to the base, `-vivid` to the fill, `--rux-accent-fill` to the accent. Each existed
to paper over a value the scale now supplies directly.

**Not on the scale, by decision (rule 1.1a):** `--rux-text-disabled` (dark white 28%, light
L 58), `--rux-thumb-bg` (90 / 25), `--rux-overlay-scrim` (black 60%), and the legacy
`--rux-neutral` / `-black` / `-white` / `-gray` and eight hue bases behind them.

**Contrast, measured** on `gallery.html` after the batch, against `--rux-surface-0` /
`--rux-surface-1`:

| Token | Dark | Light |
|---|---|---|
| `text-primary` | 17.94 / 16.91 | 17.18 / 17.93 |
| `text-secondary` | 8.13 / 7.66 | 8.13 / 8.48 |
| `danger` | 7.15 / 6.74 | **5.14 / 5.37** |
| `warning` | 9.95 / 9.38 | **5.34 / 5.58** |
| `success` | 9.39 / 8.86 | **5.10 / 5.33** |
| `info` | 8.40 / 7.92 | **5.09 / 5.31** |
| `link-fg` → `-hover` | 8.40 → 19.16 | 5.09 → 14.70 |
| `accent` | 4.73 / 4.45 | 4.26 / 4.44 |
| white on `accent` | 4.43 | 4.43 |
| `danger-on-fill` on `danger-fill` | **3.44** | **4.19** |

The four bold light-theme rows are D6, fixed. The two bold bottom rows are **D14**, open.
`accent` at 4.26–4.73 is a **background** step (700) and is not held to the text floor;
where the accent carries text it goes through `--rux-link-fg`, which is the 900 step.

### 3.3 What the migration moved

Replaced the pre-step-4 side-by-side table, whose Δ column is now zero by construction for
every role in §3.2. The before/after each step produced is recorded in its §5 row; the
measurement method is there too, and it is worth stating once here because the first attempt
at it was wrong: **flipping `data-theme` and reading computed styles immediately samples
elements mid-transition**, which returned interpolated `oklab()` values and, on
`.rux-input`, an apparent white-on-white 1.12:1 that did not exist. The figures in §3.2 and
in §5 were taken with transitions disabled and the previous cascade **replayed at matched
specificity** — the technique `typography.md` step 27 had to learn for the same reason.
---

## 4. Known defects

Each is measured, not reasoned. Rows marked **Fixed** were closed by the step named; the rest are open and
resolved by a step in §5.

| # | Defect | Evidence |
|---|---|---|
| **D1** | **Fixed (step 4).** `--rux-surface-1` is **18** in dark where `background-100` is **14.6**. Every card, menu and dialog is 3.4 points lighter than the catalog's element surface. | §3.3 |
| **D2** | **Fixed (step 4).** The light theme is stronger than the catalog everywhere it differs: borders **88 / 70 / 50** against **93.9 / 83.7 / 73.3**, text **14 / 38** against **20.4 / 41.8**, list states **88 / 84** against **93.9 / 92.3**. The `tokens.css` light block says it "mirrors the dark pair's 24-point gap from the opposite end" — a symmetry the catalog does not have; its light text pair is 21 points apart and its light borders are far softer than its dark ones. | §3.3 |
| **D3** | **Fixed (step 4).** The list-item states `--rux-bg-hover` / `-active` are **32 / 36** in dark where `gray-200` / `-300` are **23.7 / 28.0** — a step and a half too bright, which is why the side-nav hover reads as a pale block. | §3.3 |
| **D4** | **Fixed (step 4), as the predicted side effect.** Every repointed role went from chroma 0.004 to 0 in one move — visible in the migration diff as `oklch(0.94 0.004 255)` → `oklch(0.9466 0 0)` on 4,625 elements. `--rux-neutral` itself still carries the tint and still backs the four off-scale roles; retuning it is Class B and retiring it Class C. Original text: `--rux-neutral` carries chroma **0.004** at hue 255, so every grey the *roles* produce is faintly blue. The catalog's neutrals are `hsl(0 0% …)` — chroma 0 — in every step of both themes, and since step 2 the published `gray` scale is too. The defect is now precisely the gap between them: the scale is clean, the roles still derive from the tinted base. Closed by step 4, where it disappears as a side effect rather than as its own change. | §3.1, §3.2 |
| **D5** | **Narrowed and quantified (steps 4-6), not closed.** Every role on a catalog step is now in gamut, because the steps were converted from the catalog's own sRGB. What remains was measured across all **974** published `--rux-*` tokens on the running app: **30 resolve outside sRGB in dark, 21 in light**, and every one is either the legacy Tier 0 — `--rux-white` (chroma 0.004 at L 100) and the eight hue bases at chroma 0.28 — or one of ~20 component tokens deriving from them (`--rux-fg-on-accent`, `--rux-selection-fg`, `--rux-checkbox-mark-color`, the disabled foregrounds, `--rux-tag-purple`). Closing it is the **Class C** removal of the bases, once their last consumers move. *Original text: **every chromatic token is outside sRGB** — the eight hue bases sit at chroma 0.28, and the status, accent and vivid recipes keep 0.20-0.28, where the catalog's sRGB branch never exceeds what HSL can say.* | measured on `gallery.html`, 974 tokens, both themes |
| **D6** | **Fixed (step 5) — the headline of this document.** `--rux-danger` / `-warning` / `-success` / `-info` resolved to **L 92** on a 98 canvas: **1.85 / 1.30 / 1.19 / 1.37 : 1**, three times under AA, affecting every status line, badge and ghost-danger button in light theme. The `-strong` variants at L 60 measured 3.5-4.4, still under. On the `{scale}-900` steps they now measure **5.14 / 5.34 / 5.10 / 5.09** against the canvas and 5.31-5.58 on a card. The dark values were always fine (8.3-15.8:1), which is why nobody saw it. | §3.2 contrast table, measured on `gallery.html` before and after |
| **D7** | **Fixed (step 6).** `--rux-accent-hover` is **lighter** than the accent (L 70 vs 60) where the catalog's 800 step is **darker** than its 700 (41% vs 48% HSL). Same for `--rux-accent-ring`, which reads 70 at chroma 0.28 where the focus colour is blue-900 at 0.165. | §3.3 |
| **D8** | **Fixed (step 5).** The status roles are recipes on a hue, not steps on a scale: `--rux-danger` is "red at L 90, C 0.28", and each status carries four hand-tuned tiers (`-base`, `-strong`, `-subtle`, `-vivid`, plus `-fill` for danger only) that correspond to no step. Rule 2.7 cannot be stated in today's vocabulary. | `tokens.css` status block |
| **D9** | **Half fixed (steps 3, 5).** `amber` and `teal` are published and warning now reads the amber scale, so no *role* is off the catalog's hue set. The legacy bases remain: `orange`, `yellow` and `cyan` have no catalog counterpart and are still published for the trip-bar tone recipes and print. Retiring them is Class C. Original text: the hue set is not the catalog's. Rux publishes `red / orange / yellow / green / cyan / blue / purple / pink`; the catalog publishes `blue / red / amber / green / teal / purple / pink`. Warning reads `--rux-yellow` (H 85) where the catalog's amber sits at H 30–44; there is no teal; `orange` and `cyan` have no counterpart and, outside the trip bar's tone recipes, no consumer. | `tokens.css` palette block, §3.1 |
| **D10** | `--rux-gray` is L **50** in dark and **98** in light — a primitive named for a colour that flips per theme to serve as a surface. `--rux-tag-default` reads it. A primitive that is two colours is a role wearing a primitive's name. | §3.2 |
| **D11** | **Fixed (step 6).** Verified live: `[data-rux-accent="violet"|"green"|"amber"]` each resolve the accent, hover and ring to their own scale. Original text: `Rux.setAccent()` sets `data-rux-accent` and persists it; **no CSS reads the attribute**, so switching the accent does nothing visible. Recorded in `README.md` and held as accepted debt by `tests/state-contract.test.mjs`. Rule 2.12 makes it expressible: an accent is a scale selection, and that needs the scales. | `rux-ui/js/utilities.js`, `README.md` § Swappable accent |
| **D12** | **Half addressed (step 4).** A role on a step can no longer drift per theme — `tests/color-scales.test.mjs` fails a role that reads a step *and* carries a light override, which is what caught the ~30 now-redundant overrides. The original gap stands for the roles that are **not** on a step (rule 1.1a's four) and is step 7's. Original text: rule 2.1's second half — every absolute-lightness token has a light override — is enforced by nothing. The `tokens.css` light block itself records three cases found by eye ("without these overrides the dark 32%/36% leak into light theme … renders as a near-black block"). | `tests/tokens-contract.test.mjs` checks resolution only |
| **D13** | **Found and fixed inside step 6.** `a:hover` read `--rux-accent-hover`, which step 6 made the **800** step — and 800 is *darker* than 700 in both themes. A link therefore got dimmer on hover in dark theme, **4.73:1 → 3.67:1**, under AA. The token was behaving correctly for a *fill*; the link was inheriting a fill role for text. Links now read `--rux-link-fg` / `-hover`, the accent scale's **900 → 1000** text steps, which move the right way in both themes because the scale inverts around the fills: dark **8.40 → 19.16**, light **5.09 → 14.70**. | measured on `gallery.html` during step 6's contrast pass |
| **D14** | **Text on a status or accent fill is below AA.** `--rux-danger-on-fill` (`red-1000`) on `--rux-danger-fill` (`red-700`) measures **3.44:1 in dark and 4.19:1 in light**; white on `--rux-accent` (`blue-700`) measures **4.43:1** in both. The destructive button and the primary button are the visible cases. **The 1000 step was step 5's inference, not the catalog's instruction** — rule 2.2 calls 1000 "primary text and icons", and step 5 read that as covering text on a fill. It does not: `red-1000` is a *tinted* near-white (`#ffeaed`) for coloured text on a neutral or tinted ground, and the tint is what costs the contrast. **What the catalog's foundation says about on-fill text: nothing.** The colors page publishes no pairing for it, which is why this needs a decision rather than a lookup — see **Q8**. Rule 2.11 does not currently catch it either: it scopes the AA floor to the 900/1000 steps against the two **backgrounds**, not against fills. | measured on `gallery.html` after step 5; before the step it was ~3.95:1, so the batch moved it slightly worse |

---

## 5. Amendment log

Ordered by dependency. Every step records what it deliberately did **not** do.

Steps marked **[open]** are not yet authorized — they turn on a §6 question and MUST NOT
be executed until that question is answered here. Steps marked **[ready]** are additive or
reversible and execute under standing authority.

| # | Step | Status | Notes |
|---|---|---|---|
| 1 | Establish this document; measure both systems; state rules, current state, defects | **done** | Founding entry. **Measured, not read:** the catalog's ten scales in both themes and both gamut branches — 82 sRGB HSL triplets and 94 P3/alpha values per theme, read off vercel.com's `--ds-*` custom properties with the page's theme class flipped by script — and 70 Rux colour tokens resolved through a probe element on `index.html` in both `data-theme`s, with WCAG contrast computed for every text, status and accent token. **Found:** the dark neutral anchors (canvas, three borders, two text levels) are on the catalog to within a point and nothing else is; the light theme is uniformly harder than the catalog's; light status text is at 1.2–1.9:1; every hue is outside sRGB; the accent hover inverts the catalog's direction. Twelve defects recorded. **Rule R6's colour half moves here** as rule 2.1, per the audit document's own commitment. **Deliberately did not** fix D6 in passing, though it is the worst defect in the set and a one-line change: the fix that lasts is the 900 step of the red, amber, green and blue scales, which do not exist yet, and an interim lightness picked today would be a fourth hand-tuned tier. It is the first thing step 5 does. **Deliberately did not** answer Q1 — it is the owner's, as typography's Q12 was. **Not measured:** Geist's `gray-alpha` against Rux's state overlays in rendered result (only their declared alphas); the scheduler's trip-bar tone recipes (`scheduler/css`), which are the application's mapping; print. Contract **1.0.0**. |
| 2 | Publish the neutral scale, the backgrounds and the alpha scale as Tier 0 | **done · Class A** | **Q1 answered yes by the owner on 2026-08-21; Q3 and Q5 taken as recommended and executed the same day, with 3.** **Adds, both themes:** `--rux-gray-100` … `-1000`, `--rux-gray-alpha-100` … `-1000`, `--rux-background-100` / `-200` — 44 declarations, each the §3.1 measurement converted per rule 2.10 with its HSL beside it. **Q3: the scale is chroma 0.** **`--rux-neutral` was deliberately NOT touched**, and the distinction matters: retuning it is Class B — every role derives from it and the whole app would re-render — where publishing a clean scale beside it is Class A. The tint disappears at step 4, when the roles stop reading it, and D4 is rewritten to say exactly that. This row originally read *"chroma is 0 and `--rux-neutral` becomes what the light/dark blocks switch"*, which conflated the two; corrected here rather than silently. **Q5: OKLCH, converted, HSL in the comment** — and the conversion was **verified rather than assumed**. All 164 steps (this row's 44 and step 3's 120) were rasterized in a browser from both their HSL source and their published OKLCH: **164/164 land on the identical 8-bit pixel.** That check set the precision — at one decimal of `L` four values drift by one code value and five round marginally out of gamut, at two decimals none do. A local Node model had predicted nine mismatches at two decimals; the browser is the authority and disagreed, which is why the check was run there. **Enforcement:** new `tests/color-scales.test.mjs`, 7 tests. **Deliberately not done:** moving any role (steps 4–6); retiring `--rux-black` / `-gray` / `-white` (Class C, and D10 is step 4's). Contract 1.0.0 → **1.1.0**, shared with step 3. |
| 3 | Publish the seven hue scales as Tier 0 | **done · Class A** | **120 declarations** — `--rux-blue-100` … `--rux-pink-1000`, both themes, from §3.1's sRGB tables. **Q2 taken as recommended:** the names are the catalog's, so **`amber` and `teal` arrive**. `orange`, `yellow` and `cyan` are untouched and still published as bases — they have consumers (the trip bar's tone recipes, print), and retiring them is Class C for whenever those move. Warning moving from `--rux-yellow` (H 85) to the amber scale (H 30–44) is step 5's, not this one's. **Q7 taken as recommended: sRGB only.** The catalog's P3 branch is recorded in §3.1 and not published; adding it is a later Class A step under `@supports (color-gamut: p3)`, and doing it now would double the surface before a single role reads the first branch. **The eight hue bases stay published and unchanged** — a role cannot be left reading a name that no longer resolves. **Verified: nothing re-renders, and it is proved rather than argued.** The grep-based test says no rule *mentions* a step; the browser was asked directly. All **92** published names were overridden to `magenta` at `:root` and every element re-measured on background, colour, border, outline, box-shadow, fill and background-image, in **both themes**: **0 of 5,288 elements moved on `index.html`, 0 of 312 on `gallery.html`**, and removing the override restored every value exactly. A token no rule reads cannot change a computed value, and that is now a measurement instead of a deduction. **This check exists because the weaker one was not enough:** the A/B snapshot carried over from the typography steps records type properties and `color` but **not** background or border, so it could not have seen a colour regression at all — it reported the expected 43 and 22 signature changes on the two pages and would have reported them either way. Fourteen spot checks (7 steps × 2 themes) rasterize to the same pixel as the catalog's own HSL; no scale token resolves undefined; page overflow 0. **A finding, from this document's own test:** `red-800` is **not** theme-invariant — 69% vs 70% saturation, one code value — where §3.1 had claimed all fourteen 700/800 pairs were. The claim was written from reading the pattern, not from checking it; §3.1 now names the exception and the test carries it. Contract 1.0.0 → **1.1.0**, shared with step 2. |
| 4 | Map the neutral roles onto the scale (D1, D2, D3, D4, D10) | **done · Class B** | **Executed 2026-08-21, batched with 5 and 6 per §2.3.4.** **Repointed:** `surface-0` → `background-200`, `surface-1` → `background-100`, `surface-2` → `gray-100`, `input-bg-disabled` → `surface-2` (rule 1.2 — one consumer, no purpose of its own), `bg-hover` / `-active` → `gray-200` / `-300`, `grid-guide` and `card-border` → `gray-400`, `-hover` → `gray-500`, `-active` → `gray-600`, `text-secondary` → `gray-900`, `text-primary` → `gray-1000`, `state-hover-overlay` / `-active` → `gray-alpha-200` / `-300`. **Before → after, OKLCH L, dark then light:** surface-1 **18 → 14.57** / 100 → 100; surface-2 24 → 21.56 / 94 → 96.19; bg-hover **32 → 23.76** / 88 → 93.89; bg-active **36 → 28.01** / 84 → 92.34; grid-guide **24 → 30.08** / 88 → 93.89 (a grid line is a border at rest, so the step it was lighter by is the distinction that goes); card-border 30 → 30.08 / **88 → 93.89**; -hover 39 → 38.99 / **70 → 83.73**; -active 62 → 62.39 / **50 → 73.26**; text-primary 94 → 94.66 / **14 → 20.44**; text-secondary 70 → 70.79 / **38 → 41.84**; hover overlay white 10% → 9.02% / black 9% → 7.84%; active overlay **white 20% → 12.94%** / **black 16% → 10.2%**. **The dark neutrals barely moved and the light ones moved a lot**, which is exactly what §3.3 predicted: someone had measured the dark anchors against the catalog once and derived light by mirroring, and the catalog is not symmetric. **D4 closed as a side effect**, visible in the diff as chroma `0.004 → 0` on every repointed role. **The press state is meaningfully weaker** — 20% → 12.94% white is the largest single perceptual change in this batch and the one most worth an eyeball. **~30 light-theme overrides deleted**, not edited: a role reading a step is correct in both themes by construction, and leaving the override would have given it two sources of truth with the light one silently winning. A new test fails exactly that. **Deliberately not done:** `--rux-text-disabled`, `--rux-thumb-bg` and `--rux-overlay-scrim` stay off the scale and are recorded in `tokens.css` with the reason (rule 1.1a) — the catalog has no step for any of them, and the nearest by value means something else; forcing them would make a step serve two purposes. `--rux-gray` (**D10**) and the legacy bases are untouched — Class C. Contract 1.1.0 → **1.2.0**, shared with 5 and 6. |
| 5 | Map the status roles onto the hue scales; close D6 | **done · Class B** | **Rule 2.7 made real, and D6 with it.** **Text → `{scale}-900`:** danger red, warning **amber** (moved off `--rux-yellow` at hue 85 to the hue the catalog calls warning, 30–44), success green, info blue. **Before → after contrast, light theme, against the canvas: 1.85 / 1.30 / 1.19 / 1.37 → 5.14 / 5.34 / 5.10 / 5.09.** Three times under AA to comfortably over, which is the single most valuable thing in this document. Dark went the other way and stayed fine: 8.27 / 13.86 / 15.80 / 12.69 → 7.15 / 9.95 / 9.39 / 8.40 — less contrast, and on the catalog. **Tint → `{scale}-100`, and now opaque** (it was the base at 14% alpha, which rendered differently over a card than over the canvas; a tint is a background, so it composites once). **Fill → 700, fill-hover → 800, on-fill → 1000**, and published for all four statuses rather than danger alone — the other three were missing only because nobody had hand-tuned them. **Two tiers converged and are kept published:** `-strong` now resolves to the base (it existed to be readable where the base was not, which was D6) and `-vivid` to the fill (same purpose — a solid colour carrying a label). Both are Class C to retire and are recorded as candidates. **The trip bar's own tone recipes are untouched** (rule 1.3 — the application owns its mapping). **Found, not fixed — D14:** `red-1000` on `red-700` measures **3.44:1** dark, 4.19:1 light, below AA. It was ~3.95:1 before, so this step moved it slightly worse. **This row first recorded the pairing as "the catalog's own", which was wrong — it was this step's inference from rule 2.2's "1000 = primary text", and the catalog's foundation publishes no on-fill pairing at all.** The correction is left visible rather than rewritten, because the mistake is instructive: a step number applied by analogy is not a measurement. What the right pairing is turns on **Q8**. Contract shared. |
| 6 | Accent as a scale selection; focus ring onto the catalog (D7, D11, D13) | **done · Class B** | **`--rux-accent` is now a selection of four steps**, not a colour: `accent-100/700/800/900/1000` name which scale is the accent, and `accent`, `-hover`, `-subtle`, `-ring` read those. **Before → after:** accent L 60 C 0.28 → **57.91 C 0.2141** (`blue-700`); hover **70 → 51.64** (`blue-800`) — the hover now *darkens*, which is D7 and is the most visible single change for buttons, links and active tabs; subtle 14% alpha → opaque `blue-100`; ring 70 C 0.28 → **71.78 C 0.1521** dark and **57.91** light, the catalog's focus colour, which is the one accent role that is not theme-invariant and so keeps a one-line light override that every accent inherits. `accent-fill` converges on the accent and is a Class C candidate. **D11 closed:** `[data-rux-accent="violet"|"green"|"amber"]` published, four lines each, repointing the same steps; verified live that all three resolve their accent, hover and ring to their own scale. `tests/state-contract.test.mjs` no longer carries the attribute as accepted debt. The gap was never really CSS — an accent cannot be *switched* while it is a hand-tuned recipe, because there is no second palette to switch to. **D13, found by this step's own contrast pass and fixed in it:** `a:hover` read `--rux-accent-hover`, so when that became the 800 step a link got **dimmer** on hover in dark theme, 4.73:1 → **3.67:1**, under AA. A fill role behaving correctly, inherited by text. Links now read `--rux-link-fg` / `-hover` = the accent scale's **900 → 1000** text steps, which move the right way in both themes because the scale inverts around the fills: dark **8.40 → 19.16**, light **5.09 → 14.70**. **Verification for the whole batch.** The first attempt was wrong and is recorded because the error is instructive: flipping `data-theme` and reading computed styles immediately samples elements **mid-transition**, returning interpolated `oklab()` values — it reported `.rux-input` at white-on-white 1.12:1, which does not exist. Redone with transitions disabled and the previous cascade **replayed at matched specificity** (the technique `typography.md` step 27 had to learn): on `gallery.html`, **310 of 312 elements move in each theme, 106 distinct changes**, every one matching the intended mapping; on `index.html`, 4,625 of 5,288. Page overflow 0. **Eyeballed:** `gallery.html` dark at 1280, top of page only — screenshots after scrolling returned blank frames because the Browser pane was not compositing, so the rest of the gallery and **all of light theme are measured but not seen**. That is the largest gap in this batch. Also unseen: every interaction-gated surface, and the trip bar, whose tone recipes read status roles that moved. Contract shared. |
| 9 | Put text on a fill over the AA floor (D14) | **[open]** | **Turns on Q8.** Class B, small: four `-on-fill` tokens, `--rux-fg-on-accent`, and the fill steps they sit on. **Under branch (a)** the shape is a `800` fill with a **true white** label for the dark hues and a near-black label for amber — measured on Geist's own error button at 4.79:1, though as an observation rather than a citation (see §'s source note). **Before → after, expected:** `danger-fill` `red-700` → `red-800`, `danger-on-fill` `red-1000` → white, contrast **3.44 → ~4.79**; `--rux-fg-on-accent` currently reads `--rux-white`, which is `oklch(1 0.004 255)` — tinted, out of gamut, and clipping to a hair off pure white, which is why Rux measures 4.43 where the same `blue-700` fill measures 4.50 under a true white. **So this step also takes a bite out of D5** and needs a genuinely achromatic white, which the `gray` scale does not contain (its 1000 is `#ededed`). Whether that is a new named token or `background-100` read theme-invariantly is the executor's call, and it must be recorded — a fill is theme-invariant, so its label must be too, and a label reading a theme-dependent token would flip to black on red in dark mode. **States to eyeball:** the destructive button, the accent button, solid badges, both themes. **Deliberately not in scope:** the trip bar's tone recipes (rule 1.3). Contract bump: minor. |
| 7 | Enforce rules 2.1 (second half), 2.8, 2.9, 2.11 | **[open]** | **After steps 2–6**, because the checks fail today and a test that fails on the state it was written in is a todo, not a ratchet. Extends `tests/tokens-contract.test.mjs` or adds `tests/color-contract.test.mjs`: every absolute-lightness token in `:root` has a light override (D12); the gray scale has chroma 0; every token parses to an in-gamut sRGB value; the 900/1000 steps of every scale meet 4.5:1 against both backgrounds in both themes. Class A. |
| 8 | **Consolidate** — strip duplicated colour rules elsewhere; convert them to pointers | **[open]** | The closing step, last by construction (`CLAUDE.md` § One home per rule). **In scope:** `README.md` § Backgrounds (the two-surface rule and token table), § Color (the accent sentence, the `oklch` sentence), § Reference: Vercel Geist colors (the step table — now §2.2 — and the alignment list — now §3.3), § Swappable accent (D11's record); `../audit/design-system-audit.md` §5 R6, which keeps its duration/easing half for `motion.md` and points here for colour; the `rux-design` skill's colour paragraph; the literal `oklch()` values in `../trip-bar.md` and `../cards.md`, which become token names or are recorded as the trip bar's own tokens. **Before stripping anything,** each rule is checked to exist here first. Contract bump: patch. |
| 10 | Correct D14's framing and record what a component page is worth | **done** | Class A, and a **patch** — wording, evidence and a corrected citation; no token, rule or value moves. **What was wrong.** Step 5 recorded D14 as *"the catalog's own text-on-fill pairing, so changing it is a departure rather than a correction"*. The pairing was **step 5's own inference** from rule 2.2's "1000 = primary text", applied by analogy to a surface rule 2.2 never mentions. The catalog's foundation publishes no on-fill pairing at all, so there was nothing to depart from. **What was then wrong in the other direction.** Measuring `vercel.com/geist/button` produced a confident correction — "Geist's standard is 800 + white, D14 is my mapping error, no decision needed" — which overshot twice. **(1)** The blue fill cited as "Geist's primary at 4.50:1" is in that page's **Custom** section, which demonstrates `CustomButton` *overriding* the system's colours; the page states "primary, success, ghost, and violet are not valid type values". It was the one button there that is by construction not the standard. **(2)** Even the genuine specimens are a **component mapping**, which this document's own precedence rule reserves to a downstream — and `typography.md` already paid for that confusion: Q7 set the type floor at 11px on the Badge's authority and Q11 reversed it, at the cost of two releases and a Class C removal. **What survives, and it is the useful part:** the button page can *falsify* an inference without *establishing* a rule. It shows a white label rather than the 1000 step, which is enough to retire step 5's guess and not enough to replace it. **Recorded:** D14 rewritten; step 5's sentence corrected in place with the error left visible; rule 2.11 gains an explicit note that its floor stops at the two backgrounds and why; **Q8** opened to decide whether it should; **step 9** drafted against it; a source note added to §'s preamble stating that component pages are observations, never authority, with the Q7→Q11 precedent and the three Button measurements as evidence. `../README.md`'s source table corrected likewise. **Deliberately not done:** amending rule 2.11 — that is Q8's to decide and step 9's to execute; and touching any token, which is why the destructive button still measures 3.44:1 today. Contract 1.2.0 → **1.2.1**. |

---

## 6. Open questions

These are design decisions, not engineering ones. Each blocks at least one §5 step. Answer
them **in this document** — an answer recorded anywhere else does not authorize anything.

**Q8 — Does the AA floor cover text on a fill?** Rule 2.11 puts a 4.5:1 floor under the 900
and 1000 steps against the two backgrounds. It says nothing about a label on a `700` or `800`
fill, and D14 is what lives in that silence: `red-1000` on `red-700` at **3.44:1**, white on
`blue-700` at **4.43:1**. **The catalog cannot answer this** — its foundation publishes no
on-fill pairing, and its Button component's choices are a mapping this document does not
inherit (see the source note above). So it is Rux's rule to make or decline.

**Three branches.** *(a)* **Extend rule 2.11 to any text-on-fill pairing this system
publishes**, then pick steps that satisfy it — mechanically, a darker fill (`800`) with a true
white label clears 4.5:1, which is also what Geist's error button happens to do. *(b)* **Scope
the floor to large text only** on fills — WCAG allows 3:1 at 18.66px/bold, which most button
labels are not, so this mostly declines the problem. *(c)* **Record the fills as a named
exception** and leave them, on the grounds that a button label is a control rather than
content. **Recommendation: (a).** A destructive button is the one control where being read
correctly matters most, and the change is four tokens. The cost is honest and worth stating:
it makes this system's fills *not* the catalog's, and §2 gains its first originated rule —
which is exactly what `layout.md` already does for breakpoints, so there is precedent for the
shape. *Blocks step 9.*

**Q1 — Adopt the catalog's ten-step scales as Tier 0, literally? — ANSWERED (steps 2, 3):
yes.** By the owner, 2026-08-21. 164 values published, both themes, nothing reading them
yet. Original text follows.

**Q1 — Adopt the catalog's ten-step scales as Tier 0, literally?** Today Tier 0 is one
neutral and eight hue *bases*, and every role is a recipe on one of them. The catalog is
ten explicit steps per scale per theme — 82 neutral and background values, 140 hue values,
20 alpha values. Adopting them means roughly **240 declarations** whose only readers are
the roles that alias them. **The alternative** is to keep recipes and tune each one to land
on the catalog's value — which reproduces the catalog without naming it, so a role can
drift off a step and nothing says so. **Recommendation: adopt.** `typography.md` Q12
answered the same question the same way: the adopted catalog is itself the named consumer,
and a system that claims to be Geist under a prefix should let a reader find `gray-400`.
What recipes bought — retheming from one number — the light/dark blocks already give up,
since the light block re-states every recipe anyway. *Blocks steps 2–8.*

**Q2 — Which hue scales? — ANSWERED (step 3): the catalog's seven.** Taken as recommended
when the owner authorized steps 2 and 3; `amber` and `teal` are published. The retirement
half is **not** done — `orange`, `yellow` and `cyan` still have consumers and are Class C.
Original text follows.

**Q2 — Which hue scales?** The catalog publishes seven: `blue`, `red`, `amber`, `green`,
`teal`, `purple`, `pink`. Rux publishes eight bases: `red`, `orange`, `yellow`, `green`,
`cyan`, `blue`, `purple`, `pink`. Three branches: adopt the seven and retire the three
without a counterpart (`orange`, `yellow`, `cyan`) once nothing reads them — Class C,
stops and proposes; keep the three as Rux extensions *with* ten measured steps each, which
means inventing 60 values the catalog never published; or keep them as bases only, outside
the scale model, named as the print/trip-bar vocabulary they are. **Recommendation: the
first.** Warning moves to amber, which is what the catalog's warning *is*; the trip bar's
tone recipes are the application's mapping and can read whichever scale they choose.
*Blocks step 3.*

**Q3 — Is neutral neutral? — ANSWERED (step 2): yes, chroma 0.** Taken as recommended. The
published `gray` and `gray-alpha` scales are achromatic and a test enforces it;
`--rux-neutral` keeps its tint until step 4 stops the roles reading it, because changing it
now would be Class B. Original text follows.

**Q3 — Is neutral neutral?** `--rux-neutral` carries chroma 0.004 at hue 255 — a cool tint
a reader cannot name but a side-by-side shows. The catalog's greys are chroma 0 at every
step. **Recommendation: 0.** "Exactly" means the grey is the catalog's grey, and the tint
was never a decision anyone recorded. *Blocks step 2.*

**Q4 — Does the accent switch stay?** The catalog has no accent switching; every scale is
always present and a component picks one. Rux shipped `Rux.setAccent()` and
`data-rux-accent` with no CSS behind them (D11). Two branches: finish it — `[data-rux-accent]`
repoints the accent roles at another scale's 700/800/100/focus, which the scales make a
four-line rule per accent — or retire the JS and the attribute. **Recommendation: finish
it**, as a recorded Rux extension, because the scales make it nearly free and the
mechanism already has a test holding the gap open. *Blocks step 6.*

**Q5 — OKLCH or the catalog's syntax? — ANSWERED (step 2): OKLCH, with the HSL recorded
beside each step.** Taken as recommended, and the objection it rested on turned out not to
apply: the conversion is **lossless at 8-bit**, verified on all 164 values in a browser, so
"every published value is a rounding of the catalog's" is true of the notation and false of
the rendered pixel. Original text follows.

**Q5 — OKLCH or the catalog's syntax?** The catalog's sRGB branch is HSL; this system has
written every colour as `oklch()` since before any foundation document, and `README.md`
states it as a rule. Converting means every published value is a rounding of the
catalog's, and the rendered colour can differ by a code value. **Recommendation: OKLCH,
converted, with the HSL source in the comment beside each step** — rule 2.10 as drafted.
The alternative, HSL for greys and OKLCH for hues as the catalog does, puts two syntaxes
in one ladder. *Blocks steps 2, 3.*

**Q6 — Accept the softer light theme?** Conforming exactly makes the light theme *less*
contrasty than it is today on every neutral role: text 14 → 20.4 and 38 → 41.8, borders
up to 23 points lighter. Every figure stays above AA (the catalog's light text measures
17.9:1 and 8.5:1). **Recommendation: accept** — the current light values were tuned to
mirror the dark theme's symmetry, which the catalog does not have, and "harder than Geist"
is not a decision anyone made. *Blocks step 4.*

**Q7 — Publish the P3 branch? — ANSWERED (step 3): sRGB first; P3 is a later Class A
step.** Taken as recommended. The §3.1 P3 measurements stand as the record for whenever
that step runs. Original text follows.

**Q7 — Publish the P3 branch?** The catalog ships wide-gamut values under
`@supports (color-gamut: p3)`; on a P3 display vercel.com renders them, and they are what
§3.1 recorded for the 700s. **Recommendation: sRGB first, P3 as a later Class A step** —
the sRGB branch is what every display gets and what rule 2.9 can test, and publishing both
at once doubles the surface step 2–3 land. *Blocks step 3 on the branch question only.*

---

## 7. Controlled evolution

The amendment classes, the Class B protocol, the conformance line, and the versioning
rules are shared by every foundation document and live in [`README.md`](README.md) §2.
This document follows them without exception.

**Class B is the whole of steps 4–6**, and the §2.3 batching rule applies: they SHOULD
land together so a consumer reviews the rendering once. The before/after values are
already in §3.3; each step restates the ones it moves.

---

## Known drift

- `README.md` § Backgrounds, § Color and § Reference: Vercel Geist colors state the
  two-surface rule, the step table and the alignment list with values. They are accurate
  today and become pointers at step 8.
- `../audit/design-system-audit.md` §5 R6 states rule 2.1 with its enforcement mapping; its
  colour half now lives here and its motion half waits on `motion.md`.
- `../trip-bar.md` and `../cards.md` carry literal `oklch()` values — a tone recipe and two
  relative lightness steps. Rule 1.3 says a colour one component uses is that component's
  token; step 8 decides which become tokens and which are recorded as application mapping.
