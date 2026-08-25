# Rux UI Foundations — Color

**Contract version: 3.5.1** · Stamped at the top so a downstream document can state the
version it conforms to. Authority without a version is only "whatever `main` says today,"
which is not control. See [`README.md`](README.md) §2.

**Status** · 29 steps: **29 done**
This document is canonical for colour in Rux UI. **Tier 0 is the catalog** (steps 2, 3) and
**Tier 1 reads it** (steps 4–6): every surface, border, list state, control overlay, text
level, status and accent role resolves to one scale step per theme. 164 catalog values
published, 31 roles repointed, ~30 light-theme overrides deleted as redundant. **Every text
colour this system publishes now clears AA in both themes** — the two headlines are D6
(light-theme status text, **1.19–1.85:1 → 5.09–5.34:1**) and D14 (text on a fill, **3.44 →
4.74–9.25**, step 9).

**Where to pick up.** **Nothing is open.** Eighteen steps, sixteen defects, all closed. Every
role that has a catalog step reads it; the four that do not are named under rule 1.1a with
their reason. Both gamuts ship, every published text and fill pairing clears AA in the worse
of them, and rules 2.1, 2.8, 2.9 and 2.11 are executable. The legacy Tier 0 is down to
`--rux-neutral`, `-black` and `-white`, which back the off-catalog roles and are the only
colour vocabulary here that is not the catalog's.

**Both gamuts ship.** The hue scales are published twice since step 11: an sRGB branch, and a
P3 branch behind `@media (color-gamut: p3)` that a wide-gamut display gets instead. Greys and
backgrounds have one value in both — they are achromatic. **The AA floor is evaluated in the
worse gamut**, so nothing passes only because a display is good.

**What is still not conformant, measured rather than assumed.** **D5**: 30 tokens in dark and
21 in light resolve outside sRGB — not one of them a role on a step. They are the legacy
Tier 0 (`--rux-white` at chroma 0.004, the eight hue bases) and the ~20 component tokens
behind it; closing it is the **Class C** removal those bases need. **D15**: a fill's hover and
active are `calc()` derivations rather than steps — step 9 fixed the direction, not the
mechanism, and the catalog has no 800-hover to adopt. **D9, D10, D12** likewise stay open.
§4 carries all of them.

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

**2.9 Every token resolves inside the gamut it is published for.** A value the browser has to
gamut-map is a value nobody chose. Since step 11 the hue scales are published **twice**: an
sRGB branch, which is the base declaration and the authority for any display that cannot do
better, and a P3 branch inside `@media (color-gamut: p3) { @supports (color: oklch(0% 0 0)) }`.
Each MUST be valid in its own gamut, and **every P3 value MUST have an sRGB value behind
it** — the wide branch raises a ceiling, it never introduces a colour.

*The nesting is not decoration.* `color-gamut` is a **media** feature, so `@supports` cannot
test it: `@supports (color-gamut: p3)` is an invalid condition that silently evaluates false.
That is how step 11 was first written, and the block simply never applied — caught by
measuring the rendered value in a browser, not by any test, since the CSS is well-formed
either way. The media query tests the *display*; the inner `@supports` tests the *syntax*.

*(D5's 30 out-of-gamut tokens are unaffected: they are the legacy hue bases at chroma 0.28,
which exceed P3 as well, and their fix is still the Class C removal.)*

**2.10 OKLCH is the expression; the catalog's sRGB is the value.** This system writes
every colour as `oklch()` so a hue can be retuned without re-deriving its lightness. The
catalog writes its sRGB branch as HSL. Adopting a step means converting its sRGB value to
OKLCH and **recording the measured HSL beside it**; the rendered colour is what conforms,
not the syntax, and the comment is what lets the next reader check the conversion instead
of trusting it. Enforced by `tests/color-scales.test.mjs`. **Since step 11 a hue step carries two published values** — the sRGB one, converted from the
catalog's HSL and recording it, and the P3 one, which the catalog authors in `oklch()` and
which is therefore measured rather than converted and cites no HSL. Greys, the alpha scale
and the backgrounds carry one value in both branches: they are achromatic and have no width
to gain. `tests/color-scales.test.mjs` checks provenance per branch for that reason.

**The sRGB conversion is lossless at 8-bit** — all 164 published steps were verified in a browser to rasterize to the same pixel
as the HSL they came from, which is what sets the precision at two decimals of `L` (at one,
four of them drift by a single code value). *(Q5, step 2.)*

**2.11 Text meets AA against the surface it is published for.** 4.5:1 for the 900 and
1000 steps of every scale against `background-100` and `-200`, both themes. The catalog's
neutrals measure 8.0:1 and 17.9:1 (dark) and 8.5:1 and 17.9:1 (light); its status 900s
measure 5.3–5.6:1 in light. *(D6, fixed at step 5, was Rux light-theme status text at
1.19–1.85:1.)*

**The floor also covers text on a fill, and that half is originated here** (Q8, step 9). The
catalog's foundation publishes no on-fill pairing, so this is Rux stating a rule rather than
adopting one — the second time this document set has done that, after `layout.md`'s
breakpoints.

**A published fill and its label MUST clear 4.5:1. The fill is the lightest step whose label
clears it; the label is `--rux-fg-on-fill` (pure white) or `--rux-fg-on-fill-inverse`
(near-black), whichever does.** Measured across every hue, which is what makes it a rule
rather than a preference:

| Scale | 700 + white | 800 + white | 800 + inverse | Published |
|---|---|---|---|---|
| `blue` | 4.44 ✗ | **5.73 ✓** | 3.46 | 800 + white |
| `red` | 3.91 ✗ | **4.74 ✓** | 4.17 | 800 + white |
| `amber` | 1.80 ✗ | 2.14 ✗ | **9.25 ✓** | 800 + inverse |
| `green` | 3.10 ✗ | 4.08 ✗ | **4.85 ✓** | 800 + inverse |
| `teal` | 3.07 ✗ | 4.15 ✗ | **4.77 ✓** | 800 + inverse |
| `purple` | 5.18 ✓ | 6.98 ✓ | — | 700 clears |
| `pink` | 3.81 ✗ | 4.52 ✓ | — | 800 + white |

**No fill clears at 700 except purple**, which is why rule 2.5's "fills are 700" holds for the
*step's meaning* and not for what a fill carrying a label may use. Both label colours are
theme-invariant literals because the 700/800 steps are: a label reading `background-100`
would look correct and flip to near-black on a dark blue button the moment the theme changed.

**The floor is evaluated in the WORSE gamut** (step 11). A pairing that clears in P3 but not
in sRGB is not published, because the sRGB branch is what a display without P3 renders and it
cannot be the one that fails. `blue-700` with a white label measures **5.04 in P3 and 4.44 in
sRGB** — it would pass on the machine most designers own and fail on a large share of the
machines the app runs on, which is exactly the asymmetry this clause exists to catch, and why
the fills sit at 800 rather than 700.

**This is also the rule Geist's own buttons follow**, which is corroboration and not the
source — its error button is `red-800` + white and its warning is `amber-800` + near-black,
exactly where the table says they must be. See the source note in §'s preamble for why a
component page cannot be cited as authority here even when it agrees.

**2.12 Accent is a scale selection.** `--rux-accent` is a chromatic scale's 700, its hover
that scale's 800, its tint that scale's 100, its ring the catalog's focus colour. Switching
the accent means switching which scale those four read — which is what `data-rux-accent`
exists for, and what its CSS has never done (D11). The catalog publishes no accent switch;
this is a Rux extension, and it is expressible only once Tier 0 is the catalog.


**2.13 A published band states one luminance.** When this system publishes a set of colours
meant to be *interchangeable* — any hue may appear in the same slot — every member states
one relative luminance, so that **contrast is a property of the band and not of the hue**. A
consumer then asks the contrast question once, for the band, instead of once per hue.

Measured, which is what makes this a rule rather than a preference: the catalog's own scales
are lightness-normalized at 100–400 (L spread **1.0–3.7** across the seven hues) and at 1000
(**1.1**), and are **not** in the fill band — **24.8 at 600, 26.3 at 700, 28.8 at 800**.
`amber-700` is L 81.7% where `purple-700` is L 55.5%. "700" names seven different lightnesses,
which is exactly why no single label serves them (D19). §5 step 24's band holds a spread of
**0.23**.

Chroma is reduced only as far as the sRGB gamut forces, never to make the arithmetic tidy. A
hue that cannot reach the band's luminance at usable chroma takes a **named exception** under
rule 1.1a and says why — amber is one, because a saturated amber cannot be dark.

**This governs the bands Rux publishes, not Tier 0.** §3.1 is the catalog *measured*, and the
catalog is not normalized; renormalizing it would replace a measurement with a computation.
That distinction is why step 24 built a band rather than re-tuning 700/800. *(Enforced by
`tests/fill-band-contract.test.mjs`.)*

**2.14 A role names one function, and a role used as a fill publishes its label.** Rule 2.2
partitions the vertical axis and forbids a **step** serving two purposes. That governs steps.
A role is one layer up, and colour serves **five functions**, each asking a different question
against a different floor:

| | Function | The question it asks | Floor |
|---|---|---|---|
| **F1** | fill carrying a label | does the label clear *on this fill*? | 4.5:1 |
| **F2** | mark on a fill | does the mark clear *on that fill*? | 3:1 |
| **F3** | text on a neutral surface | does it clear on the canvas? | 4.5:1 |
| **F4** | line, border, indicator | does it clear on its neighbour? | 3:1 |
| **F5** | tint behind content | does the content on it still clear? | inherited |

**The two axes are different**, which is why 2.2 cannot catch a failure here. 2.2's ten
purposes describe a *position on a lightness ladder*; a contrast floor depends on *what
surface the colour sits on*. `red-900` is unambiguously "secondary text and icons" on the
first axis, and that says nothing about whether white reads on it.

A role MUST name the function it is for. **A role used as F1 MUST publish its label beside
it**, so the pairing cannot be got wrong — `--rux-{hue}-fill` ships with `--rux-{hue}-on-fill`
for exactly this reason.

**Known violations, recorded rather than implied:** the four status roles and `--rux-accent`
are each spent on three functions (`--rux-danger` is read 27× as `color:`, 3× as
`border-color:`, 2× as `background:`), and none publishes a label — **D20**. Q13's narrow
branch is the step that fixes it. The inventory is `../color-consumption-audit.md`; the
per-function measurements are `../../color-function-specimen.html`.

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
| D1 | **Fixed (step 4).** ~~`--rux-surface-1` is **18** in dark where `background-100` is **14.6**. Every card, menu and dialog is 3.4 points lighter than the catalog's element surface.~~ | §3.3 |
| D2 | **Fixed (step 4).** ~~The light theme is stronger than the catalog everywhere it differs: borders **88 / 70 / 50** against **93.9 / 83.7 / 73.3**, text **14 / 38** against **20.4 / 41.8**, list states **88 / 84** against **93.9 / 92.3**. The `tokens.css` light block says it "mirrors the dark pair's 24-point gap from the opposite end" — a symmetry the catalog does not have; its light text pair is 21 points apart and its light borders are far softer than its dark ones.~~ | §3.3 |
| D3 | **Fixed (step 4).** ~~The list-item states `--rux-bg-hover` / `-active` are **32 / 36** in dark where `gray-200` / `-300` are **23.7 / 28.0** — a step and a half too bright, which is why the side-nav hover reads as a pale block.~~ | §3.3 |
| D4 | **Fixed (step 4), as the predicted side effect.** ~~Every repointed role went from chroma 0.004 to 0 in one move — visible in the migration diff as `oklch(0.94 0.004 255)` → `oklch(0.9466 0 0)` on 4,625 elements. `--rux-neutral` itself still carries the tint and still backs the four off-scale roles; retuning it is Class B and retiring it Class C. Original text: `--rux-neutral` carries chroma **0.004** at hue 255, so every grey the *roles* produce is faintly blue. The catalog's neutrals are `hsl(0 0% …)` — chroma 0 — in every step of both themes, and since step 2 the published `gray` scale is too. The defect is now precisely the gap between them: the scale is clean, the roles still derive from the tinted base. Closed by step 4, where it disappears as a side effect rather than as its own change.~~ | §3.1, §3.2 |
| D5 | **Closed (steps 12, 15, 17).** ~~Every out-of-gamut value that was not a P3 branch value is gone: the eight hue bases at chroma 0.28 were removed, the neutral base went achromatic, and no role reads a non-catalog colour. What remains outside sRGB is the P3 branch, which is outside it by design and is tested per-branch. *Original text, and the two wrong counts, follow.* **Narrowed twice, and the earlier counts were both wrong.** It first read "every chromatic token is outside sRGB"; step 1 replaced that with **30 in dark / 21 in light**, measured on `gallery.html` — which loads far fewer stylesheets than the application. On `index.html` the same probe reports **112 / 116**. And since step 11 that number is not the right question either: it counts the **P3 branch's own values**, which are outside sRGB *by design*. The honest test is per-branch — is a value inside the gamut it is published for — which is what `tests/color-contract` asserts and which **every scale step passes**. What is genuinely wrong is the **legacy Tier 0**: the eight hue bases at chroma 0.28, which no branch covers, and whatever derives from them. **Step 12 took the neutral half** (chroma 0.004 → 0, which brought `--rux-white` and six disabled foregrounds into gamut in one line). The chromatic half is the Class C removal in step 15.~~ | measured on `index.html`, both themes; `tests/color-contract` for the per-branch check |
| D6 | **Fixed (step 5) — the headline of this document.** ~~`--rux-danger` / `-warning` / `-success` / `-info` resolved to **L 92** on a 98 canvas: **1.85 / 1.30 / 1.19 / 1.37 : 1**, three times under AA, affecting every status line, badge and ghost-danger button in light theme. The `-strong` variants at L 60 measured 3.5-4.4, still under. On the `{scale}-900` steps they now measure **5.14 / 5.34 / 5.10 / 5.09** against the canvas and 5.31-5.58 on a card. The dark values were always fine (8.3-15.8:1), which is why nobody saw it.~~ | §3.2 contrast table, measured on `gallery.html` before and after |
| D7 | **Fixed (step 6).** ~~`--rux-accent-hover` is **lighter** than the accent (L 70 vs 60) where the catalog's 800 step is **darker** than its 700 (41% vs 48% HSL). Same for `--rux-accent-ring`, which reads 70 at chroma 0.28 where the focus colour is blue-900 at 0.165.~~ | §3.3 |
| D8 | **Fixed (step 5).** ~~The status roles are recipes on a hue, not steps on a scale: `--rux-danger` is "red at L 90, C 0.28", and each status carries four hand-tuned tiers (`-base`, `-strong`, `-subtle`, `-vivid`, plus `-fill` for danger only) that correspond to no step. Rule 2.7 cannot be stated in today's vocabulary.~~ | `tokens.css` status block |
| D9 | **Closed (steps 3, 5, 15, 16, 17).** ~~The names went with step 15. No role or palette reads a non-catalog hue any more: step 17 moved the trip colours onto teal/green/purple/amber/pink and step 16 retired orange. What is left is the *names* — six unread bases plus `--rux-purple` — which is step 15's Class C removal, not a hue problem. Original text: Step 16 retired `orange` outright — the trip palette carries five colours now. `yellow` and `cyan` remain, still on the legacy bases, and are step 15's. `amber` and `teal` are published and warning now reads the amber scale, so no *role* is off the catalog's hue set. The legacy bases remain: `orange`, `yellow` and `cyan` have no catalog counterpart and are still published for the trip-bar tone recipes and print. Retiring them is Class C. Original text: the hue set is not the catalog's. Rux publishes `red / orange / yellow / green / cyan / blue / purple / pink`; the catalog publishes `blue / red / amber / green / teal / purple / pink`. Warning reads `--rux-yellow` (H 85) where the catalog's amber sits at H 30–44; there is no teal; `orange` and `cyan` have no counterpart and, outside the trip bar's tone recipes, no consumer.~~ | `tokens.css` palette block, §3.1 |
| D10 | **Fixed (step 18).** ~~`--rux-gray` is L **50** in dark and **98** in light — a primitive named for a colour that flips per theme to serve as a surface. `--rux-tag-default` reads it. A primitive that is two colours is a role wearing a primitive's name.~~ | §3.2 |
| D11 | **Fixed (step 6).** ~~Verified live: `[data-rux-accent="violet"|"green"|"amber"]` each resolve the accent, hover and ring to their own scale. Original text: `Rux.setAccent()` sets `data-rux-accent` and persists it; **no CSS reads the attribute**, so switching the accent does nothing visible. Recorded in `README.md` and held as accepted debt by `tests/state-contract.test.mjs`. Rule 2.12 makes it expressible: an accent is a scale selection, and that needs the scales.~~ | `rux-ui/js/utilities.js`, `README.md` § Swappable accent |
| D12 | **Half addressed (step 4).** ~~A role on a step can no longer drift per theme — `tests/color-scales.test.mjs` fails a role that reads a step *and* carries a light override, which is what caught the ~30 now-redundant overrides. The original gap stands for the roles that are **not** on a step (rule 1.1a's four) and is step 7's. Original text: rule 2.1's second half — every absolute-lightness token has a light override — is enforced by nothing. The `tokens.css` light block itself records three cases found by eye ("without these overrides the dark 32%/36% leak into light theme … renders as a near-black block").~~ | `tests/tokens-contract.test.mjs` checks resolution only |
| D13 | **Found and fixed inside step 6.** ~~`a:hover` read `--rux-accent-hover`, which step 6 made the **800** step — and 800 is *darker* than 700 in both themes. A link therefore got dimmer on hover in dark theme, **4.73:1 → 3.67:1**, under AA. The token was behaving correctly for a *fill*; the link was inheriting a fill role for text. Links now read `--rux-link-fg` / `-hover`, the accent scale's **900 → 1000** text steps, which move the right way in both themes because the scale inverts around the fills: dark **8.40 → 19.16**, light **5.09 → 14.70**.~~ | measured on `gallery.html` during step 6's contrast pass |
| D14 | **Fixed (step 9).** ~~Text on a status or accent fill was below AA: `red-1000` on `red-700` measured **3.44:1** dark / 4.19:1 light, and white on `blue-700` **4.43:1**. Two causes, both this system's: the label was the **1000** step — a *tinted* near-white (`#feecee`) meant for coloured text on a neutral ground, inferred by step 5 from rule 2.2 — and the fill was **700**, which no hue except purple can carry a label on. Rule 2.11's second half now decides both by measurement. **After: danger 4.74 / 4.73, accent 5.73 both themes, warning 9.25, success 4.85, info 5.73**, and the accent's hover and active go *up* to 7.36 and 9.10 rather than down.~~ | measured on `gallery.html`, both themes, before and after |
| D16 | **Fixed (step 14) — and introduced by step 9.** ~~`--rux-*-bright` aliases `-on-vivid`, which step 9 repointed to `-on-fill` on the reasoning that they are "the same pairing under another name". They are not: `-on-fill` is a **label on a fill**, and all **13** `-bright` consumers use it as `color:` on the ordinary canvas — the itinerary, trip panel, driver share, scheduler app. So `--rux-danger-bright` became **pure white** and `--rux-warning-bright` / `-success-bright` became **near-black**, about **1.06:1** on the dark canvas: invisible. Step 9 checked `-on-vivid`'s own consumers (the trip bar) and never traced the alias one hop further. **Found by step 14's grep, not by any test** — the suite asserts token *references*, and every one of these still resolved to a real colour. Repointed to the base status role, where they were always meant to be: **6.75 / 9.43 / 9.56** dark and **5.11 / 5.34 / 5.03** light.~~ | measured on `index.html`, both themes |
| D15 | **Fixed (step 18), both sites, with nothing re-rendering.** ~~A fill's hover and active were `calc()` derivations, not steps. `--rux-button-accent-hover-background` is `oklch(from … calc(l - 0.06) c h)`, which puts the hover colour nowhere the scale names and violates rule 1.2's spirit (a component token reads a role; it does not do arithmetic on one). **The catalog cannot supply the answer**: it publishes 800 as *700's* hover and nothing as 800's, and step 9 moved the fills to 800 — so the four `--rux-*-fill-hover` roles now name the step they are the hover for and are degenerate. Step 9 fixed the *direction* (hover darkens, so contrast rises rather than falls) and left the mechanism. Needs either a published fill-hover overlay or an admission that fills hover by composite. **A second instance, found by step 8:** `.rux-card--elevated` and `--recessed` do `oklch(from var(--rux-card-body-bg) calc(l ± 6%) c h)` — the same arithmetic-instead-of-a-step, in the card tier, equally unable to name what it produces. One cause in two places, which is what makes this a defect rather than a quirk of the button.~~ | `tokens.css` button-accent block; the four `-fill-hover` roles; `base/card.css:55,59` |
| D17 | **No rule governs what a HUE means — only what a STEP means.** Rule 2.2 partitions the vertical axis (100 is a background, 400 a border, 900 text) and says *a step MUST NOT serve two purposes*. Nothing says the same of a hue, and in practice five of seven carry two or three assignments: **blue** is `--rux-accent` *and* `--rux-info` *and* the scheduler's confirmed status; **amber** is `--rux-warning` *and* `[data-rux-accent="amber"]` *and* a trip category; **green** is `--rux-success` *and* `[data-rux-accent="green"]` *and* a trip category; **red** is `--rux-danger` *and* unconfirmed; **purple** is `[data-rux-accent="violet"]` *and* a trip category. Only **teal** and **pink** carry one. The catalog governs one axis of a two-axis problem. | tokens.css role block; measured 2026-08-24 |
| D18 | **A live consequence of D17, inside one component.** The trip bar renders `--sched-trip-bar-warning-icon` (**amber**-900) and `-success-icon` (**green**-900) *on a bar that may itself be tagged amber or green*, and `-danger-icon` (**red**-900) on a bar whose unconfirmed state is already red. Category hue and status hue are the same colour, in the same element, at the same time. `js/core/trip-colors.js` states the palette's premise as *"the five catalog hues that are not spoken for — red is danger and blue is the accent"*; that is **false** — green, amber and purple are all spoken for. The palette was closed against a rule that does not exist. | `scheduler/css/tokens.css:15-17`; `js/core/trip-colors.js` |
| D19 | **The steps designated as labelled fills cannot carry one label.** Rule 2.2 calls 700 the high-contrast background and 800 its hover, and rule 2.11 already records that *"no fill clears at 700 except purple"* — but the same is true of 800 in the other direction: **amber, green and teal need a near-black label there while blue and purple need white**, so the pair of steps this document nominates for labelled fills admits **no uniform label across the seven hues**. Measured in the sRGB branch: at 700 white clears on purple alone (1.80–5.18); at 800 white clears on four and near-black on three. A consumer wanting one label per theme must leave 700/800 entirely — the scheduler's trip bar lands on **500**, which is rule 2.2's *hover border*.  **Measured against the catalog's own reference implementation, 2026-08-24 — it confirms the ceiling rather than escaping it.** Geist's Badge was read live in both themes from computed styles: every solid fill is an **exact** match to a catalog rung, and there are **five different rungs** across seven hues. Dark: `blue-800`, `red-800`, `amber-700`, `green-600`, `teal-600`, `pink-600`, `purple-500`. Light: `blue-800`, `amber-700`, and `red`/`green`/`teal`/`purple`/`pink` all at **900**. **Five of the seven switch rung between themes**, and the label is white on every hue except amber, which is pure black. So the reference implementation has no fill rung — it picks per hue per theme by measurement, which is rule 2.11 restated as practice. **It still ships two failures:** dark green and teal measure **3.96** and **3.64** with white in the sRGB branch (3.93 / 3.38 in P3). And note what those rungs are called here — 500, 600 and 900 are rule 2.2's *hover border*, *active border* and *secondary text* — so the component departs from the scale documentation that governs all ten scales, which is this defect seen from the other side. **Per §'s source note this observation cannot establish a rule:** it falsifies "a consumer must pick one rung" and corroborates 2.11's method; it does not license the rungs it happens to use.  **Answered on the Rux side, not the catalog's — §5 step 24 (2026-08-25).** The root cause is measurable and was not known when this defect was filed: the hue scales are lightness-normalized at 100-400 (spread 1.0-3.7) and 1000 (1.1), and are **not** in the fill band — **24.8 at 600, 26.3 at 700, 28.8 at 800**. `amber-700` is L 81.7% where `purple-700` is L 55.5%, so "700" names seven different lightnesses and no one label can serve them. **This defect stays open** because it is the catalog's and §3.1 records the catalog as measured; step 24 published `--rux-{hue}-fill` / `-on-fill` under rule 1.1a instead, where one luminance per theme makes contrast a property of the band. Enforced by `tests/fill-band-contract.test.mjs`. | measured 2026-08-24, `trip-bar-specimen.html`; reproduces §2.11's own table; Badge map read from computed styles at `vercel.com/geist/badge`, both themes |
| D20 | **Fixed (step 26).** ~~A role designated for text is spent as a labelled fill, and one instance fails.** Rule 2.2 partitions the vertical axis and forbids a *step* serving two purposes; nothing forbids a *role* serving two **functions**. `--rux-danger` is one (scale, step) — `red-900`, which 2.2 calls *secondary text and icons* — and it is read **27× as `color:`, 3× as `border-color:` and 2× as `background:`**. The two backgrounds are count badges, i.e. labelled fills. **Measured 2026-08-25, sRGB branch: the side-nav badge is `--rux-fg-on-accent` (white) on `--rux-danger` at 2.94:1 in dark** — below rule 2.11's 4.5 floor. The ui-header badge is the same token doing the same job and clears only because it happened to pick `--rux-surface-1`, a dark ink, instead of white. Same role, same function, two different guesses, one wrong — which is what a missing rule looks like. `--rux-warning` (21/1/2) and `--rux-accent` (17/6/8) have the same shape and are not yet measured. **The gap is not in 2.2**, which the step obeys; it is that no rule says a role names one function, nor that a role used as a fill MUST publish its label the way §5 step 24's band does. Inventory in `../color-consumption-audit.md`.~~ **Both badges now read `--rux-danger-fill` / `--rux-danger-on-fill`; 2.94 → 4.74 in dark.** | `rux-ui/css/base/side-nav.css:106`, `base/ui-header.css:237`; measured 2026-08-25 |
| D21 | **Fixed (step 28).** ~~**The accent measures under the text floor at 14 of its 17 `color:` sites.** Q13's fourth finding, verified 2026-08-25: `--rux-accent` is the **700 fill step**, and it measures **4.45 dark / 4.44 light** on `surface-1`, **4.26 light** on `surface-0` — under rule 2.11's 4.5 floor everywhere but the dark page ground (4.73). Whether any site was large text was the open question; the answer is none: **every text site is 12–14px regular** (probed live where rendered, read from the declarations where not). Of the 17 reads, **3 are non-text** — the two table sort arrows and the assignment-module icon, floor 3:1, passing — **12 are small text on a neutral surface**, and **2 are avatar initials on `--rux-accent-subtle`**, a pairing no table had measured: **3.86 dark / 4.27 light**. The document already states the pattern ("where the accent carries text it goes through `--rux-link-fg`, which is the 900 step" — §3.2); these sites predate it. D13 was this defect for the link's hover; this is the same fill-role-as-text one tier wider.~~ **The 14 text sites read `--rux-accent-text` (`accent-900`) since step 28: 8.40 / 5.09 on the surfaces, 6.88 / 4.95 on the tint.** | probed on `index.html` per site, 2026-08-25; the avatar-on-tint pairing measured via canvas in both themes |

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
| 9 | Put text on a fill over the AA floor (D14, Q8) | **done · Class B** | **Executed 2026-08-22 under branch (a).** Rule 2.11 gains its fill half — the first rule this document originates rather than adopts — and every published fill moves to the step that satisfies it. **Two label roles added**, both theme-invariant literals under rule 1.1a because no scale step is a true white or near-black (`gray-1000` is `#ededed` dark and `#171717` light): `--rux-fg-on-fill` `oklch(100% 0 0)` and `--rux-fg-on-fill-inverse` `oklch(14.57% 0 0)`. They are literals *on purpose* — a fill is the 700/800 step and so is the same colour in both themes, so a label reading `background-100` would flip to near-black on a dark blue button when the theme changed. **Before → after, resolved:** `danger-fill` `red-700` → `red-800` and its label `red-1000` → white, **3.44 → 4.74** dark / 4.19 → 4.73 light; `warning-fill` → `amber-800` + inverse **9.25**; `success-fill` → `green-800` + inverse **4.85**; `info-fill` → `blue-800` + white **5.73**; `--rux-button-accent-background` `--rux-accent` → `--rux-accent-800`, **4.43 → 5.73** both themes. `-on-vivid` follows `-on-fill` (same pairing, other name), which reaches the trip bar. **`--rux-accent` itself stays at 700** — it is the identity colour for borders, icons and focus, none of which carries a label, and links already go through the 900 text step. **`--rux-fg-on-accent` moved off `--rux-white`** to the true white: worth 0.01 of contrast, but it was one of D5's 30 out-of-gamut tokens and this was the step with reason to touch it. **The accent button's hover now darkens** (`calc(l - 0.06)`, was `l + 0.05`): a lighter hover on an 800 fill lands back at 700's contrast and drops the label under AA under the pointer, which is worse than failing at rest. Contrast now *rises* on interaction — 5.73 → 7.36 → 9.10. That leaves the mechanism wrong even though the direction is right, recorded as **D15**. **Solid badges were checked and not touched** — their own lightness arithmetic already clears (7.64 dark / 5.52 light). **Verified:** every fill measured in both themes on `gallery.html`; **eyeballed in both themes** on the live dev server, buttons/badges/alerts, which is the first visual check this document has managed — screenshots composite only at scroll 0, so the sections were hidden rather than scrolled past. `tests/color-scales.test.mjs` failed on the fill move and its expectation was updated, which is the ratchet working. 348/348. Contract 1.2.1 → **1.3.0**. |
| 11 | Publish the P3 branch (Q7, reversed) | **done · Class B** | **Executed 2026-08-22.** **140 declarations** — seven hue scales, ten steps, both themes — inside `@media (color-gamut: p3) { @supports (color: oklch(0% 0 0)) { … } }`, re-measured off vercel.com/geist/colors that day with the theme class flipped, on a P3 display. **Greys, the alpha scale and the two backgrounds are deliberately absent**: they are achromatic, gain nothing from a wider gamut, and the catalog publishes them as HSL in both branches too. That is 140 rather than 164 and the difference is the point. **Class B, not the Class A step 3 predicted** — on a P3 display every chromatic colour in the system re-renders; an sRGB display never matches the media query and is untouched. **Before → after on a P3 display:** `blue-700` `oklch(57.91% 0.2141 257.97)` → `oklch(57.61% 0.2321 258.23)`, and equivalently across all 140. Greys verified unchanged at `oklch(30.08% 0 0)`. **Rules amended:** 2.9 rewritten for two branches with the sRGB-fallback requirement; 2.10 records that a hue step now carries two values and that only the sRGB one has HSL provenance to cite; **2.11 gains the worse-gamut clause**, which is the substantive addition — a pairing that clears in P3 but not sRGB is not published. **The first attempt was silently broken and the browser is what caught it.** The block was written as `@supports (color-gamut: p3)`, which is an invalid condition — `color-gamut` is a *media* feature, `@supports` tests properties — so it evaluated false and never applied. The CSS was well-formed, the suite passed, and only reading `--rux-blue-700` off a live page showed it still resolving to the sRGB value. Recorded because no test would have caught it and the next branch-style block has the same trap. **Verified after the fix:** the branch is active (`blue-700` resolves to the P3 value), and **every published pairing clears AA in P3 in both themes** — danger button 4.67/4.70, accent 6.63/6.73, warning 9.21, success 4.94/4.88, info 6.63/6.73, status text 4.85–9.75, links 7.74/5.99, primary text 17.36/16.70. Contrast computed with **Display P3 primaries**, not sRGB's, on a `display-p3` canvas. **Eyeballed** on the dev server, buttons/badges/alerts, dark. `tests/color-scales.test.mjs` gains two tests: the branch covers every hue step in both themes and contains no achromatic scale, and it publishes steps only — never re-pointing a role, which is what would let a wide gamut quietly relax the floor. 350/350. Contract 1.3.0 → **1.4.0**. |
| 12 | Make the neutral base achromatic (D4's remnant, D5's neutral half) | **done · Class B** | **One line: `--rux-neutral` `oklch(50% 0.004 255)` → `oklch(50% 0 0)`.** Step 4 put every role that HAS a catalog step onto the scale, and the tint went with them; this is the other set — the roles rule 1.1a keeps off the scale, which all still derive from this base. **Before → after, 8-bit, measured on `index.html`:** dark moves 3 of 14 watched tokens, at most 3 code values (`--rux-white` 253,255,255 → 255,255,255; `--rux-gray`; `--rux-thumb-bg`). Light moves 11 of 14, at most 3 — **except `--rux-shadow-ambient-color`, which goes (10,10,20) → (10,10,10)**, a 10-value blue cast in the one channel a low-alpha shadow shows most. That is the single most visible thing in this step. **It also closes gamut for ten tokens free**, because `--rux-white` and the six disabled foregrounds are all `from var(--rux-neutral)`. **Deliberately not done:** removing the base — it has 22 readers and removal is Class C (step 15). **States to eyeball:** shadows under cards and floating panels in **light theme**, where the cast was largest. 356/356. Contract 1.5.0 → **1.6.0**. |
| 13 | Retire the four `-fill-hover` roles | **done · Class C** | **Executed 2026-08-22 under explicit authorization, batched with 14 and 15.** The free one: 0 reads anywhere before removal, 0 after. Four declarations gone, nothing repointed, nothing re-rendered. They named the step a fill hovers *to*, and step 9 moved the fills onto that step. |
| 14 | Retire the converged status and accent aliases | **done · Class C + Class B** | **Executed 2026-08-22. 15 declarations removed, ~29 reads repointed — and it was not the pure rename the proposal predicted.** `-strong` ×4 → the base (7 reads: the danger ghost hover, four badge tones, a trip-request state). `-vivid` ×3 → **split by what each consumer is**: the two trip-bar borders take `-fill`, but team-chat's three were `color:` and a `background:`, so the text went to `--rux-info` and the fill to `--rux-info-fill` — a text role reading a fill step was the bug underneath. `-bright` ×3 → the base, which is **D16**, a live regression step 9 introduced and this step found. `--rux-accent-fill` → **split four ways by role**: `--rux-calendar-now-line-color` to `accent-800` because it is a fill carrying a white label and rule 2.11's floor applies (white on 700 is 4.44; it now measures **5.75/5.77**); `--rux-calendar-today-fg` to `accent-900` because it is text on the canvas (4.73/4.26 → **8.31/5.13**); the switch track and slider fill to `--rux-accent`, since neither carries a label. **The proposal called this "~29 reads, each rendering identically". Three of the four groups did not** — `-bright` was broken, team-chat's text was on a fill step, and the now-line failed the AA floor. A rename that is only a rename is the exception, not the rule. |
| 15 | Retire the legacy hue bases (D5's chromatic half, D9) | **done · Class C** | **Executed 2026-08-22. All eight gone** — `--rux-red`, `-orange` (step 16), `-yellow`, `-green`, `-cyan`, `-blue`, `-purple`, `-pink`, 14 declarations across both themes. Six were already unread after step 17 moved the trip palette onto the catalog; `--rux-purple`'s four consumers were repointed first: `--rux-tag-purple` in both themes to `purple-900` (a marker is an icon, and 900 is the icon step) and the priority dot and driver priority colour to `purple-700`. `--rux-tag-default` went to `gray-900` in the same pass. **Post-edit grep: zero declarations matching `--rux-(red|orange|yellow|green|cyan|blue|purple|pink):` anywhere**, and 22 removed names verified undefined in a live browser — with the probe corrected, because `color` **inherits** and an invalid `var()` there falls back to the inherited colour rather than to nothing, which made the first check report all 22 as alive. `background-color` does not inherit and is the honest probe. **Deliberately not done: `--rux-gray` (D10) and `--rux-neutral` / `-white` / `-black`.** The neutral three back every rule-1.1a role and have 22, 16 and 5 readers. `--rux-gray` has one left — `.sched-driver-grid__cell.is-trip-range` — and choosing its replacement is a visual judgement about a scheduler marker, not a mechanical repoint: it resolves L50 on a dark canvas and L98 on a light one, which is D10's whole complaint, and no single step matches both. D10 stays open. |
| 16 | Retire orange from the trip palette (Q9) | **done · Class C + Class B** | **Executed 2026-08-22 under explicit authorization.** Removes `--rux-orange` (both themes) and `--sched-trip-color-orange`, the orange swatch from **both** colour pickers, and the four `[data-trip-bar-color="orange"]` rules — screen, maintenance share, and print, whose `--print-orange-line` / `-tint` go with it. **Class C for the two published token names; Class B because a trip that was orange now renders yellow.** **Nothing was migrated, deliberately.** Rows in Supabase still hold `"orange"`, and `js/core/trip-colors.js` maps it to yellow at read time. A write against live production data to rename a cosmetic label buys nothing, and `CLAUDE.md` treats that project as live; the mapping costs one lookup and a row keeps its own history. There is **no CHECK constraint** on `trip_bar_color` — verified in `supabase/` — so no schema change was implied either. **The palette existed in five places and that is why this needed a module.** The same six-name array literal sat in `js/components/trip-bar.js`, `js/data/trip-db.js`, `js/panels/print-schedule.js` and — as a name→token map — `js/core/avatar.js`, plus swatch markup in `index.html`. Removing one colour meant finding all five. `js/core/trip-colors.js` is now the one home, exporting `TRIP_COLORS` and `normalizeTripColor`; three of the four consumers import it. **The fourth cannot and says so:** `print-schedule.js` is a classic IIFE loaded with `defer`, not a module, so it carries the list by hand with a comment naming the canonical file — and `tests/trip-colors.test.mjs` asserts the two stay in step, which is the honest version of a duplicate. **`avatar.js` lost its map entirely**: the token name always followed the colour name, so the map was a second copy of the list wearing a different shape. **Both pickers, not just the trip editor.** The avatar picker shares this palette by explicit design — its own comment says so — so leaving orange there would have kept the token alive and defeated the removal. A profile still holding `"orange"` renders yellow, same as a trip. **Grep protocol, post-edit:** `--rux-orange` and `--sched-trip-color-orange` are **css 0 · js 0 · html 0 · tests 0 · docs 0**; `index.html` contains the string "orange" zero times. **Verified live on the dev server:** both pickers now offer cyan/green/purple/yellow/pink and no orange; both tokens resolve undefined; the normaliser returns `yellow` for `"orange"`, passes the five through, and drops anything unknown. And the other direction — a stray `data-trip-bar-color="orange"` now styles **nothing**, identical to no attribute at all, which is exactly why the mapping has to happen in JS and does. **One test needed repointing, not relaxing.** `tests/trip-bar-color.test.mjs` pinned the literal array, so it was a copy of the palette rather than a test of its rule; it now asserts the rule it was named for — a trip's colour never depends on confirmation status — and `tests/trip-colors.test.mjs` owns membership, including that orange still renders. Suite 356 → **361**. Contract 1.6.0 → **1.7.0**. |
| 17 | Move the trip palette onto the catalog's hues | **done · Class B** | **Executed 2026-08-22 under explicit authorization: cyan→teal, green→green, purple→purple, pink→pink, and — the one the owner had to supply — yellow→amber, which is free now that step 16 retired orange.** The five are exactly the catalog hues nothing else claims (red is danger, blue is the accent), so the set is **closed by the palette rather than chosen**. **Each takes the 700 step, and the reason is not the one it looks like.** The bar sets its own lightness and scales the source chroma — `oklch(from var(--_tone) var(--…-bg-lightness) calc(c * …) h)` — so it consumes a **hue**, not a step, and 600/700/900 of one scale land within a few code values of each other. 700 is therefore a convention, and the argument for it is consistency: `--rux-accent` is already `blue-700`, so for the first time the uncoloured default bar and every coloured one derive from the same step. Verified live: coloured bars resolve `teal-700`, uncoloured resolve `blue-700`. **Before → after, composited as the bar renders, 8-bit distance:** teal **37**, green **34**, purple **31**, pink **31**, amber **9**. Modest, and the hues stay recognisable. **The cost is separation, and it is inherent rather than incidental:** teal and green are the closest pair at **74** where the old bases sat **143** apart. No step choice fixes that — it is the catalog's hue set, and the palette has no freedom left once red and blue are spoken for. Named here so a complaint about two greenish trip colours finds its answer. **The labels were renamed too, not just the values.** `--sched-trip-color-cyan`/`-yellow` became `-teal`/`-amber`, along with the swatch values, the `[data-trip-bar-color]` selectors in three stylesheets, and the print copy. A token named `cyan` resolving to `var(--rux-teal-700)` is the kind of lie this repository has spent two documents removing. **Nothing was migrated, again.** `normalizeTripColor` gained `cyan → teal` and `yellow → amber` beside orange, and `orange → yellow` became `orange → amber` so a doubly-retired name still lands somewhere live. **Proof on real data:** two trips stored as `"cyan"` render **teal** on the board right now, and profiles stored as `"orange"` or `"yellow"` render amber in the picker. **Two traps avoided, both found by grepping rather than by assuming:** `trip-envelope.js`'s `"yellow"` is a **paper tint** with nothing to do with this palette, and several other `yellow` hits are billing-status comments. Only `trip-colors.js`, `print-schedule.js` and one demo value in `components-panel.js` were real. **It also unblocks step 15:** `--rux-cyan`, `-yellow`, `-red`, `-blue`, `-green` and `-pink` now have **zero readers** — six of the eight legacy bases became free removals. `--rux-purple` keeps 4 (the tag and two priority dots). **Two of my own tests needed updating**, both written for the orange-only state; they now assert the retired-name behaviour as a table rather than pinning one pair. Suite 361 → **362**. Contract 1.7.0 → **1.8.0**. |
| 18 | Close D10 and D15 | **done · Class B + Class C** | **Executed 2026-08-22.** **D10 — `--rux-gray` is gone.** Its last consumer, the driver grid's trip-range marker, now reads `--rux-bg-active`. The old token resolved **L50 on a dark canvas and L98 on a light one**: strong to the point of shouting in dark, and all but invisible in light against a 98.48 canvas — one name carrying two intentions, which is what D10 recorded. A persistent range marker is a *selected background*, and the scale publishes one. **Before → after: dark 50 → 28.01, light 98 → 92.34** — weaker in dark, and finally visible in light. Class C for the name; 0 readers after, verified. **D15 — the arithmetic is gone from both sites, and nothing re-renders.** The accent button's hover and active were `calc(l - 0.06)` / `calc(l - 0.11)` on a role, landing somewhere the scale could not name; they are now `color-mix(in oklab, var(--rux-black) var(--rux-fill-hover-mix), …)` with the amounts named — **12% and 22%**, chosen because they reproduce the previous values almost exactly (measured: hover L 0.4533 against 0.4551, active 0.4018 against 0.4051). `color-mix` is an established idiom here, 22 uses before this one. **Black rather than white, because the fill is chromatic**: darkening raises the contrast with a white label where lightening lowers it, and the mix is theme-invariant because the 800 step is. **The catalog cannot supply this step** — it publishes 800 as *700's* hover and nothing below 800 — so the amount is originated here and named, the way rule 2.11's floor is. **The card half took the opposite treatment**: `.rux-card--elevated` / `--recessed` now read `--rux-card-bg-elevated` / `-recessed`, named Rux roles under rule 1.1a that state a value per theme. Elevation by colour is not in the catalog at all — it publishes background-100 for elements and background-200 for the page, with nothing above or below either, because Materials carries elevation with shadow. **Verified identical, which is the point:** dark elevated **0.2057** and recessed **0.0857**, light elevated **1.0** and recessed **0.94** — exactly what the `calc()` resolved to. **It also made a silent no-op explicit:** in light theme `calc(l + 6%)` clamped at 100 and did nothing, so `.rux-card--elevated` has never carried colour there. It still does not — the shadow does the work — but the token says so now instead of the arithmetic hiding it. **The relativity was vestigial**, checked rather than assumed: one rule defines `--rux-card-body-bg` and nothing overrides it. `../cards.md` corrected in the same change, its code sample included. 362/362. Contract 2.0.0 → **3.0.0**. |
| 19 | Enforce rule 2.1's negative half | **done · Class A** | **Executed 2026-08-22.** The colour half of `tests/no-literals.test.mjs` (recorded in full as `typography.md` step 56, which shares the file). Rule 2.1 forbids a literal colour outside Tier 0, and until now nothing tested it — `color-contract` checks that tokens **resolve** and clear AA, `color-scales` checks scale shape; neither can see a hex that never reached for a token. The test walks all of `rux-ui/css` and `scheduler/css` and fails any declaration containing a colour function or hex with no `var(--` behind it, plus any bare named colour on a colour-ish property. **The audit it was written to settle came back clean:** outside the two `tokens.css` files and the two print surfaces, the tree holds **zero** raw colour literals. Every colour above Tier 0 already resolves through a token — `oklch(from var(--rux-*) …)` in 24 places, `color-mix(…, var(--rux-*) …)` in 13, plus `currentColor` and `transparent`. Derived colour is deliberately **not** treated as a literal: it moves when its token moves, which is what the rule exists to guarantee. The 13 apparent named-colour hits in an earlier grep were all **comments** — prose about white labels and near-black text — plus one `[data-rux-accent="green"]` attribute selector; the test strips comments and reads declarations only, so none of them trip it. **Deliberately not done:** no contract bump. This step publishes no token, renames nothing, and changes no resolved value — a downstream document conforming to 3.0.0 conforms to the same vocabulary after it. Enforcement makes an existing rule executable; it is not new vocabulary, and stamping a version for it would signal a migration that does not exist. Contract stays 3.0.0. |
| 7 | Enforce rules 2.1 (second half), 2.9 and 2.11 | **done · Class A** | **Executed 2026-08-22.** New `tests/color-contract.test.mjs`, six tests, and the first suite here that does colour *science* rather than string matching: OKLCH → OKLab → XYZ, then out to sRGB or Display P3 primaries depending on the branch. **Using XYZ's Y directly as relative luminance** is what makes the contrast checks gamut-independent — a colour's luminance does not depend on which primaries reproduce it — and that only holds while rule 2.9 holds, which is why the gamut test runs first. **What is now enforced:** every sRGB-branch step is inside sRGB; every P3 step is inside P3 **and has an sRGB value behind it** (rule 2.9's second half, so the wide branch can never introduce a colour); the 900/1000 steps of every scale clear 4.5:1 against both backgrounds in both themes; **every published fill clears AA against its own label**, evaluated in the worse gamut; and an absolute lightness in `:root` has a light value, is relative, or is on a named theme-invariant list — the **D12** check that was enforced by nothing. **The arithmetic is itself under test.** A fixture asserts the conversion reproduces four figures measured in a live browser (white on red-800 4.74, on blue-800 5.73, near-black on amber-800 9.25, primary text on the dark canvas 17.94). It earned its place immediately: the first run reported 17.17, because this suite computed the light-block offset on the raw file while slicing the comment-stripped copy — a bug in the test, caught by the test, before any rule was judged by it. **All four assertions verified to fail when violated**, each naming the offender: a fill back at 700 reports `3.92`, a step at chroma 0.40 is named out of gamut, a dropped light override surfaces as `gray-900 on --rux-background-100 (light) = 2.59`, and an orphan P3 step is listed. **Deliberately not enforced:** rule 2.3's surface model and 2.7's status-is-a-scale, which `color-scales.test.mjs` already covers structurally through the rule 1.1 map; and anything about the legacy Tier 0, which D5 retires rather than tests. Suite 350 → **356**. |
| 8 | **Consolidate** — strip duplicated colour rules; convert them to pointers | **done · patch** | **Executed 2026-08-22, the closing step.** `README.md`'s § Backgrounds, § Color and § Reference: Vercel Geist colors — a token table, a ten-step reference table and an alignment list — collapse into **one pointer** that names what is ruled and states no values, beside the § Typography pointer `typography.md` step 16 left. § Surface depth and the border half of § Borders & shadows likewise. **Two of them had already gone stale, which is the one-home failure observed rather than argued:** the alignment list still described the roles as "not yet audited against Geist's shape" after steps 4–6 had put every one of them on it, and § Swappable accent described a gap step 6 had closed. **`../audit/design-system-audit.md` R6 splits**, as its own status note committed it to: the colour half points here at rule 2.1 and names `tests/color-contract` as its enforcement; the duration/easing half stays until `motion.md` claims it. **The `rux-design` skill** stops routing colour questions through README and names this document. **The two component docs are treated differently, on purpose.** `cards.md` gains a pointer for which token is which surface and keeps its elevation arithmetic — that is the card's own. `trip-bar.md` gets a header note rather than a rewrite: its colour tables are the scheduler's mapping, which this document's precedence explicitly leaves to a downstream, **and they have already drifted** — the interactive overlay is documented at `0.2` where `trip-bar.css` renders `0.24`, and the notes and pending-icon values appear nowhere in the stylesheet. Named as presumed stale; repairing a feature's tables is the scheduler's work, not a consolidation pass's. **Every rule was checked to exist here before anything was stripped**, so nothing became the only statement of itself. 356/356. |
| 10 | Correct D14's framing and record what a component page is worth | **done** | Class A, and a **patch** — wording, evidence and a corrected citation; no token, rule or value moves. **What was wrong.** Step 5 recorded D14 as *"the catalog's own text-on-fill pairing, so changing it is a departure rather than a correction"*. The pairing was **step 5's own inference** from rule 2.2's "1000 = primary text", applied by analogy to a surface rule 2.2 never mentions. The catalog's foundation publishes no on-fill pairing at all, so there was nothing to depart from. **What was then wrong in the other direction.** Measuring `vercel.com/geist/button` produced a confident correction — "Geist's standard is 800 + white, D14 is my mapping error, no decision needed" — which overshot twice. **(1)** The blue fill cited as "Geist's primary at 4.50:1" is in that page's **Custom** section, which demonstrates `CustomButton` *overriding* the system's colours; the page states "primary, success, ghost, and violet are not valid type values". It was the one button there that is by construction not the standard. **(2)** Even the genuine specimens are a **component mapping**, which this document's own precedence rule reserves to a downstream — and `typography.md` already paid for that confusion: Q7 set the type floor at 11px on the Badge's authority and Q11 reversed it, at the cost of two releases and a Class C removal. **What survives, and it is the useful part:** the button page can *falsify* an inference without *establishing* a rule. It shows a white label rather than the 1000 step, which is enough to retire step 5's guess and not enough to replace it. **Recorded:** D14 rewritten; step 5's sentence corrected in place with the error left visible; rule 2.11 gains an explicit note that its floor stops at the two backgrounds and why; **Q8** opened to decide whether it should; **step 9** drafted against it; a source note added to §'s preamble stating that component pages are observations, never authority, with the Q7→Q11 precedent and the three Button measurements as evidence. `../README.md`'s source table corrected likewise. **Deliberately not done:** amending rule 2.11 — that is Q8's to decide and step 9's to execute; and touching any token, which is why the destructive button still measures 3.44:1 today. Contract 1.2.0 → **1.2.1**. |

| 20 | Record the hue-assignment gap and the labelled-fill ceiling (D17, D18, D19; Q10, Q11, Q12) | **done · Class A** | **Executed 2026-08-24. Rule text and defects only — no token, role or value moves, and nothing re-renders.** Found while the scheduler was choosing a surface step for its trip bar (`../trip-bar.md` step 4 and D13), which is the second time a downstream has surfaced a gap here by trying to conform to it. **What the search actually turned up**, in the order it mattered: (1) the trip bar's own contrast numbers had been measured on a **P3** display and were inflated — this document's rule 2.11 says the floor is the **worse** gamut, and re-measuring against the sRGB branch reproduced §2.11's published table to within 0.03 on all seven hues, which is what makes the rest of this trustworthy; (2) at that accuracy **no step in 600–800 carries a uniform label across seven hues**, which is D19; (3) chasing *why* led to the assignment map, which is D17, and to the trip palette's false premise, which is D18. **Deliberately did not** answer any of the three questions: Q10 moves a published status role, Q11 adopts an external source, and Q12 changes the shape of every fill token — each is Class B or C and each belongs to the owner, not to the step that found it. **Deliberately did not** touch `--sched-trip-color-*`: the palette is the scheduler's mapping and `../trip-bar.md` owns it (rule 1.3). **Deliberately did not** open a defect for `--rux-info` sharing blue with the accent, though D17 records it — two roles reading one hue is only a defect once Q10 says a hue may carry one meaning. |
| 21 | Defect bookkeeping repair — §4 was invisible to the rollup counter | **done · patch** | **Executed 2026-08-24, and it is `forms.md` step 4 happening a second time.** §4 marked its numbers `**D1**` where `tests/foundations-contract.test.mjs` matches plain `| D1 |`, so **all nineteen rows were skipped entirely** — not counted open, accepted *or* resolved. The published rollup read 0 open defects and was right by accident, which is the worst way to be right: step 20's three new defects would have rolled up as zero too, and the document would have gone on claiming *"nothing is open"* while listing three things that are. Unbolded all nineteen, and struck the sixteen the Status block already declared closed — the counter reads `~~` for resolved and would otherwise have called every *"Fixed (step 4)"* row open, turning one miscount into the opposite one. **Deliberately did not** touch D12, which says *"half addressed"*: this document's own Status calls all sixteen closed, and re-opening a defect is a judgement about colour, not about bookkeeping, so it stays as the Status has it and is flagged here instead. **Deliberately did not** repair `typography.md`, which has the identical bug across 22 rows and — unlike this document — is hiding **five genuinely open defects** (D8, D10, D17, D19, D22) behind a rollup that reads 0. That is a live miscount in another document and belongs to its own log, not to a drive-by here. **The counter should probably match both spellings** rather than requiring nine documents to remember which one it prefers; that is a third repair and is noted, not made. |
| 22 | Record what the catalog's own Badge actually does (D19) | **done · Class A** | **Executed 2026-08-24. Evidence only — no token, role, rule or value moved.** D19 gains the measured rung map from `vercel.com/geist/badge`, read from **computed styles in both themes** rather than from the page's prose or from a screenshot. **Why it was measured rather than read:** the proposal on the table was to take the rung off the rendered badges by eye, and **Q8's history records that eyeballing this exact site produced a confident wrong answer twice** — once by citing a swatch that turned out to be in the page's *Custom* section, which demonstrates overriding the system's colours. The eye answer this time was "they rest at 800": right for blue, wrong for the palette, since the map is five rungs across seven hues with five of them switching between themes. **What it changes here:** nothing resolves differently; D19's claim is strengthened from "no uniform label exists" to "the catalog's own component does not attempt one." **Deliberately did not** adopt the map. §'s source note is that component pages are observations and never authority, and `typography.md` Q7→Q11 is what ignoring that cost the last time — two releases and a Class C removal. **Deliberately did not** reopen Q10 or Q11: whether a hue may carry one meaning, and whether this system adopts a categorical source, are the owner's and a measurement of somebody else's component does not settle either. **Deliberately did not** revise `../trip-bar.md` step 15, whose Class C proposal rests partly on a premise this map contests; that note is recorded there, where the step lives, rather than decided here. Contract 3.1.0 → **3.1.1** — a patch, matching step 10's precedent for evidence and wording that moves no value. |
| 23 | Record the status-mark-on-fill sweep and the owner's light-mode decision (Q12) | **done · Class A** | **Executed 2026-08-24. Evidence and a recorded decision — no token, role, rule or value moves, and nothing re-renders.** Seven ink/fill pairings measured in the sRGB branch and rendered side-by-side as live samples for the owner's eye: 900 inks on 500/600/700 fills, 1000 inks on 600, 500 and 700 inks on their neighbours, and the dark branch's bright 900s transplanted onto light fills (1.06–2.06 — vividness is a property of the dark ground, not of the colour, and does not export). **The structural finding is in Q12's new paragraph:** the light branch has one dark-ink band, so only the 1000 steps clear on saturated fills, and no mid-on-mid pairing ever can. **The owner's decision, after seeing all seven rendered:** dark ships its bright 900s (already the case, 3.0–5.3 everywhere including own-hue fills); **light keeps 900 and accepts the 1.9–3.3 failure** rather than take the 1000s' desaturation — recorded as `../trip-bar.md` D19, an accepted defect with the owner's name on it, not a gap nobody noticed. **In the same sitting the owner declined `../trip-bar.md` step 15**: the five-hue override palette stays, so D17/D18's semantic collision is likewise accepted-and-recorded rather than resolved by deletion. **Deliberately did not** answer Q12 itself: the shape question (does a fill publish its mark-ink as a pair) stands, and the sweep's numbers are its input, not its answer. Contract 3.1.1 → **3.1.2**. |
| 24 | Publish a normalized category fill band as Tier 1 roles (D19; Q12's shape) | **done · Class A** | **Executed 2026-08-25. Additive only — 28 new tokens, `0 value(s) changed, 28 added, 0 removed` per `tests/token-value-contract.test.mjs`. Nothing existing re-renders and no consumer is affected until it opts in.** **The problem, restated:** D19 established that the steps rule 2.2 designates for labelled fills carry no uniform label — at 700 white clears on purple alone, at 800 on four of seven — so a downstream needing one label per theme has nowhere on the ladder to stand, and `../trip-bar.md` rule 2.12 bought uniformity by retreating to 500/600 and paying in category separation (33 against its own 40 floor, still open as its Q5). **The root cause, measured 2026-08-25 and new here:** the hue scales are lightness-normalized at 100-400 (L spread 1.0-3.7 across the seven) and at 1000 (1.1), and are **not** normalized in the fill band — spread **24.8 at 600, 26.3 at 700, 28.8 at 800**. `amber-700` is L 81.7% where `purple-700` is L 55.5%. "700" names seven different lightnesses, which is precisely why no single label serves them. **What was built:** `--rux-{hue}-fill` and `--rux-{hue}-on-fill` for all seven hues, declared once at `:root` and **deliberately not re-stated per theme**. Every hue is solved to one luminance so contrast is a property of the band, not the hue; chroma is reduced only as far as the sRGB gamut forces. Measured on the **87% tier**, the binding number wherever a fill carries a second text level: **5.01-5.23, spread 0.23, identical on both canvases**; primary label 6.34 (white) and 5.70 (amber, inverse). Fill-to-fill separation **58** against `../trip-bar.md`'s 40 floor — the rule-2.12 board measures 33 and fails it. Chroma retained: 100% for red, purple and pink; 97-99% green; 87-91% blue; **82% amber, 76% teal**. **Amber is a named exception and the gamut's, not a preference** — a saturated amber cannot be dark, so amber takes `--rux-fg-on-fill-inverse` while the other six take white. **Deliberately did NOT touch §3.1 or the 700/800 steps.** Those values are *measured* — §3.1 is "the catalog as vercel.com renders it" and `tests/color-scales.test.mjs` carries red-800's one-point saturation difference on the stated ground that "flattening the two to one number would be choosing, and the point of §3.1 is that nothing here was chosen." Renormalizing them would replace a measurement with a computation and make that exception incoherent; the defect is the catalog's and stays recorded as D19. This band is Rux's answer under rule 1.1a, which exists for exactly this — a role the catalog has no step for is named, not forced. **Also deliberately not done:** repointing `../trip-bar.md` rule 2.12 onto the band (that document owns its mapping under rule 1.3 and the move re-renders, so it is its own step); collapsing `--rux-success-on-fill` and `--rux-warning-on-fill` onto `--rux-fg-on-fill` (they ride 800, which this step did not move); and publishing a P3 branch — the band is gamut-fitted to sRGB by construction, so both branches render it identically. **Hue naming is deliberate:** a Tier 1 role is named by its purpose, but D17 records that no rule governs what a hue *means*, and step 20 left the purpose-to-hue mapping with `../trip-bar.md` (rule 1.3). The band names the hue because the hue is all it knows. **The band is theme-invariant, which was the owner's call after seeing both shapes rendered (2026-08-25).** A per-theme band was built first and measured slightly tighter in light (spread 0.08 against 0.23), and was **rejected** to keep one palette: it follows the catalog's own model for its high-contrast steps — *a high-contrast fill does not change with the canvas* — halves the band to seven values, and removes a whole class of per-canvas re-tuning. **Invariance is spelled as an EQUAL override, not an absent one** — the first attempt deleted the light block and `tests/color-scales.test.mjs` caught it: rule 2.1 requires any token stating an absolute lightness to carry a light-theme value. The catalog expresses its own 700/800 invariance the same way, by restating them, and an equality is checkable where an absence only proves nobody has typed one yet. `tests/fill-band-contract.test.mjs` asserts the two blocks agree. **Found while collapsing it:** `tests/token-value-contract.test.mjs` reported the dropped overrides as 14 **removals** — a false Class C, since the names still resolve from `:root`. The gate now distinguishes **rescoped** from removed by checking whether a name still resolves anywhere, which is the same split Carbon gets from keeping a separate name snapshot. **Needs an eyeball — nothing renders differently yet**, so the check is that nothing does: the board in `trip-bar-fill-band-specimen.html` at both themes confirms the values, and the first thing to actually re-render will be whatever step repoints a consumer. Contract 3.1.2 → **3.2.0** — minor, because the band is additive and no existing name or value moves. |
| 25 | Write the two rules the fill-band work proved were missing (2.13, 2.14; D19, D20; Q13's broad branch) | **done · Class A** | **Executed 2026-08-25 under the owner's standing authorization to rewrite rules where it improves the palette. Rule text only — no token, role or value moves and nothing re-renders.** **2.13 · a published band states one luminance.** Generalises what step 24 did once. The evidence is the spread measurement: the catalog's scales are normalized at 100-400 (1.0-3.7) and 1000 (1.1) and **not** in the fill band (24.8 / 26.3 / 28.8 at 600 / 700 / 800), which is the mechanical reason D19 exists — "700" names seven lightnesses, so no one label can serve it. Scoped **deliberately** to the bands Rux publishes and **not** to Tier 0: §3.1 is the catalog measured, and a normalization rule over it would require replacing measurements with computations, which is the thing step 24 refused. **2.14 · a role names one function, and an F1 role publishes its label.** Rule 2.2 forbids a *step* serving two purposes and governs steps; nothing governed roles, so the partition was undone one layer up. The five functions (F1 fill · F2 mark on a fill · F3 text · F4 line · F5 tint) are the axis a contrast floor actually depends on — *what surface the colour sits on* — which is not 2.2's lightness-ladder axis. Measured per role per function in `../../color-function-specimen.html`: **F3 clears everywhere** (the function these roles were designed for), **F1 fails for all four status roles in dark** (2.11-2.94), and **F2 fails universally** (1.14-1.93). **The rule ships with known violations, and says so** — D20 names them and Q13's narrow branch is the step that fixes them. Writing a MUST the codebase does not yet meet is deliberate: the alternative is a rule that describes only what already passes, which cannot drive anything. **Deliberately did NOT:** renumber or rewrite 2.2, which is correct about steps and is not the rule that failed; touch §3.1 or the 700/800 values; execute Q13's narrow branch, which changes what renders and is its own step; or propose retiring `--rux-danger` and friends — they are correct for F3, which is most of their use, and a published name is Class C. **A specimen bug found and fixed in the same sitting, recorded because the next reader will hit it:** `color-function-specimen.html` first resolved `--rux-accent` with a flat regex, which takes the LAST declaration and so read `:root[data-rux-accent="amber"]`'s override — reporting the blue accent at 10.98 / 1.80 and nearly filing a defect against a value that does not exist. The parser is selector-aware now and reproduces rule 2.11's published 4.44. **Needs an eyeball: nothing renders differently.** Contract 3.2.0 → **3.3.0**. |
| 26 | Close D20 — the count badges read the published F1 pair (Q13's narrow branch) | **done · Class B** | **Executed 2026-08-25. Two consumers repointed; no token, role or value moved — `tests/token-value-contract.test.mjs` reports `0 changed, 0 added, 0 removed`. It re-renders, which is what makes it Class B.** **Before → after, sRGB branch:** side-nav count badge, `--rux-fg-on-accent` (white) on `--rux-danger` (`red-900`) — **2.94 dark** / 5.37 light → `--rux-danger-on-fill` on `--rux-danger-fill` (`red-800`) — **4.74 / 4.72**. ui-header count badge, `--rux-surface-1` on `--rux-danger` — **6.73 / 5.37** → the same pair, **4.74 / 4.72**. **The ui-header badge loses headroom and that is deliberate:** it cleared only because someone paired a dark ink with red-900 by hand while the side-nav badge paired white with the identical fill and failed. **The same count badge rendering two different ways was the defect** — not either number — and rule 2.14 says a fill publishes its label so the pairing cannot be chosen per site. Both now read both halves. **Scope was checked rather than assumed.** Six sites use a status role as a `background`; only these two are **F1**. `.rux-priority-dot` (warning, info, success) is an 8px dot with no text — **F4**, floor 3:1, measuring 6.74-9.38 — and the driver-grid conflict cell carries no text either. Repointing those would have been a change with no defect behind it. **Deliberately did NOT** touch `--rux-danger` itself: it is correct for F3, which is 27 of its 32 reads, and a published name is Class C. **Deliberately did NOT** normalize the four status fills onto §5 step 24's band — rule 2.13 governs sets meant to be *interchangeable*, and a danger fill is always red; the slot is not open to seven hues, so the rule does not reach them. **Needs an eyeball:** the side-nav count badge and the ui-header notification badge, both themes — the side-nav one goes from unreadable to readable, the ui-header one from dark ink to white on a slightly darker red. Contract 3.3.0 → **3.4.0**. |
| 27 | Verify Q13's fourth finding and file it (D21) | **done · Class A** | **Executed 2026-08-25. Evidence only — no token, role, rule or value moves and nothing re-renders.** Q13 left one number unresolved: the accent at 4.44 as text, a defect only if the sites are small text. **Method:** the 17 `color:` reads enumerated from the consumption sweep; sizes probed live on the served `index.html` where the DOM renders them and read from the declarations where it does not (the data-dependent panels); the avatar-on-tint pairing measured in both themes via canvas because no published table covers text on a `-subtle` tint. **Found:** 3 non-text (pass at 3:1), 12 small text on neutral surfaces at 4.26–4.45 (fail), 2 avatar initials on `--rux-accent-subtle` at **3.86 / 4.27** (fail, and a pairing nobody had measured). Filed as **D21**. **Deliberately did not** fix in the same step — the fix re-renders 14 sites and is Class B, so it is step 28's, keeping evidence and change separable in the log the way steps 23/24 did. Contract 3.4.0 → **3.4.1**. |
| 28 | Close D21 — accent text reads a text step (`--rux-accent-text`) | **done · Class B** | **Executed 2026-08-25. One token added (`1 added, 0 changed, 0 removed` per the fourth gate); 14 consumers repointed; it re-renders, which is what makes it Class B.** **What was built:** `--rux-accent-text: var(--rux-accent-900)` — a Tier 1 role for accent-coloured text that is not a link, riding the same step `--rux-link-fg` rides, so it tracks `data-rux-accent` through the existing `--rux-accent-900` overrides. Rule 2.14 names the gap: the 14 sites were reading an F1 role for F3. **Before → after, sRGB branch, resolved lightness:** accent text goes `blue-700` (L 57.91) → `blue-900` (L 71.78 dark / 53.3 light); contrast **4.45 → 8.40 dark and 4.44 → 5.09 light** on `surface-1`, and the two avatars on the tint **3.86 → 6.88 dark, 4.27 → 4.95 light**. In dark the accent text gets visibly brighter; in light, slightly darker. **The 14:** the filtered table header, the driver/fleet ref numbers and trip-ids, the driver-share disclosure buttons, flip-seven's eyebrow/avatars/active scores/message names, both is-today day labels, and the trip-history action. **Deliberately did NOT** repoint the 3 non-text sites — the sort arrows and the assignment-module icon are marks at the 3:1 floor and pass on the 700 step; moving them would trade a passing fill-matched mark for a change with no defect behind it. **Deliberately did NOT** touch `--rux-accent` itself or `--rux-link-fg` — the fill role keeps its 13 F1 and 13 F4 reads, and links keep their own semantics (hover rides 1000, which plain accent text has no use for). **Needs an eyeball:** the driver-share disclosure and ref numbers on `driver.html` (dark), the maintenance calendar's today column, the scheduler grid's today label, and flip-seven's active-player states, both themes where the page has them. Contract 3.4.1 → **3.5.0**. |
| 29 | Record the status-mark treatment sweep (Q12's different-mark half) | **done · Class A** | **Executed 2026-08-25. Evidence and a specimen — no token, role, rule or value moves and nothing re-renders.** Q12 ended at "a different mark (a backed chip, an outlined glyph)" with nothing rendered. `status-mark-specimen.html` now renders four treatments on both boards in both themes, measuring in the sRGB branch off `tokens.css` source (the fill-band specimen's method): **A** bare status-900 ink (ships today), **B** the ink on a `surface-1` disc, **C** the ink with a `surface-1` ring, **D** the fill's published label. **Found:** on today's 500/600 board **no treatment fully clears** — A is 2.05–3.78 with failures in both themes, and B/C's disc fails the fill at 1.68–2.71 because the board's fills sit near `surface-1`'s lightness per theme; D loses the hue *and* fails light (1.68–2.62). On **step 24's band, B, C and D all clear both themes** — ink/disc 6.74 dark / 5.37 light with the status hue at full saturation, disc/fill 3.11–6.37 — because one theme-invariant luminance stays distant from `surface-1` on both canvases. **The coupling is the finding:** the legible saturated mark Q12 wants exists only over the normalized band, so the mark decision and `../trip-bar.md` rule 2.12's repoint are one decision, not two. **Deliberately did not** pick the mark — B against C against D changes what every pending bar looks like and is the owner's, per steps 23 and 24's precedent; and did not repoint rule 2.12, which is `../trip-bar.md`'s own step. Contract 3.5.0 → **3.5.1**. |
---

## 6. Open questions

These are design decisions, not engineering ones. Each blocks at least one §5 step. Answer
them **in this document** — an answer recorded anywhere else does not authorize anything.

**Q9 — Does the scheduler's trip palette move onto the catalog's hues? — ANSWERED (step 16): orange is retired.** By the owner, 2026-08-22, and it is **none of the three branches offered** — which is worth recording, because the branches were framed as ways to *keep* six colours and the owner's answer was that six was never the requirement. Orange goes, trips that had it render **yellow**, and the board carries five. *(a)* would have collapsed orange and yellow into one amber, losing the distinction while keeping both names; this drops the name and keeps the distinction the other way round. My recommendation was *(c)*, mapping orange to red — that would have kept six categories at the cost of a trip colour sharing a hue with the danger status, and the owner declined the trade. **The surviving five still read the legacy bases**, so step 15's remaining question is unchanged for `cyan`, `green`, `purple`, `yellow` and `pink`. Original text follows.

**Q9 — Does the scheduler's trip palette move onto the catalog's hues?** The trip board colour-codes trips with six named colours — `--sched-trip-color-{cyan,green,purple,yellow,orange,pink}` — and each reads one of the legacy hue bases, which are the last consumers keeping those bases alive (step 15). The catalog publishes seven hues, so five map cleanly: **cyan → teal, green → green, purple → purple, pink → pink**. **`yellow` and `orange` both land on `amber`** — the catalog has one warm hue where the scheduler uses two, so conforming costs the board a distinguishable trip colour. **Three branches.** *(a)* Collapse to five and accept that two trip colours become one, the way `typography.md` Q11 collapsed the density tiers. *(b)* Keep `orange` as a named Rux extension with a real ten-step scale of its own — honest, and 20 values nobody measured. *(c)* Map `orange` to a *different* catalog hue that is still distinguishable on a board — `red` is the obvious candidate, and the cost is that a trip colour and the danger status share a hue. **Recommendation: (c).** The trip colours are categorical labels, not semantics — the board already carries status separately — and six distinguishable categories is worth more to the user than hue purity. *(a)* is a real loss of product capability for a conformance gain nobody sees; *(b)* invents vocabulary the catalog does not have, which is what §7.3's rule exists to stop. **This is a product decision about a shipped feature**, so it is the owner's. *Blocks step 15.*

**Q8 — Does the AA floor cover text on a fill? — ANSWERED (step 9): yes, and it decides the
step.** Branch (a), by the owner, 2026-08-22. Rule 2.11 gains a second half: a published fill
and its label clear 4.5:1, the fill is the lightest step that manages it, and the label is
white or near-black by measurement. Every fill moved 700 → 800 and D14 closed.

**How the question got here is worth keeping, because two of its framings were wrong.** It
began as "correcting D14 is a departure from the catalog" — false; the 1000-step label was
step 5's inference and the catalog publishes no on-fill pairing at all. It was then briefly
recorded as "Geist's button page has the answer, no decision needed" — also false, for two
reasons: the blue fill cited there is in that page's **Custom** section, which demonstrates
overriding the system's colours, and component pages are not authority here regardless
(`typography.md` Q7→Q11). **The proposal that finally settled it was to copy the blue from
that Custom demo, and measuring killed it:** the demo renders `blue-700` — the step
`--rux-accent` already was — so copying it would have changed nothing, and `blue-700` with a
white label measures **4.44**, which fails. What the measurement did produce was the *rule*
above, which explains every Geist button without citing one. *Original text follows.*

**Q8 — Does the AA floor cover text on a fill?** Rule 2.11 puts a 4.5:1 floor under the 900
and 1000 steps against the two backgrounds. It says nothing about a label on a `700` or `800`
fill, and D14 is what lives in that silence: `red-1000` on `red-700` at **3.44:1**, white on
`blue-700` at **4.43:1**. **Three branches.** *(a)* Extend rule 2.11 to any text-on-fill
pairing this system publishes, then pick steps that satisfy it. *(b)* Scope the floor to large
text only on fills. *(c)* Record the fills as a named exception. **Recommendation: (a).**

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

**Q7 — Publish the P3 branch? — ANSWERED TWICE. (step 3): sRGB first. (step 11): both, and
the later step is Class B rather than Class A.** The owner set building for P3 as the goal on
2026-08-22 and step 11 published the wide branch. **Two things step 3's answer got wrong, both
worth keeping:** it filed the later step as **Class A**, on the reasoning that adding a branch
adds and does not change — but on a P3 display *every chromatic colour in the system
re-renders*, which is Class B by §2.1's own definition, and only sRGB displays are untouched.
And it framed the choice as sRGB *or* P3 when the real question was whether to keep the
fallback: **dual-branch** is what shipped, because a design system that gets vendored into
applications its authors do not control cannot assume the display. Original text follows.

**Q7 — Publish the P3 branch?** The catalog ships wide-gamut values under
`@supports (color-gamut: p3)`; on a P3 display vercel.com renders them, and they are what
§3.1 recorded for the 700s. **Recommendation: sRGB first, P3 as a later Class A step** —
the sRGB branch is what every display gets and what rule 2.9 can test, and publishing both
at once doubles the surface step 2–3 land. *Blocks step 3 on the branch question only.*

---

**Q10 — Does a hue carry one meaning?** D17 says nothing requires it and D18 shows what that
costs. If the answer is yes, something gives up a hue: `--rux-success` leaves green,
`--rux-warning` leaves amber, the accent variants lose purple/green/amber, or the categorical
palette shrinks to teal and pink. **None of those is cheap**, which is exactly why the
question has to be asked deliberately rather than settled by whoever edits next. Note the
asymmetry: a *status* role and a *categorical label* are not equally displaceable — a status
hue is load-bearing vocabulary a user learns once, while a category is an arbitrary tag whose
only requirement is being told apart.

**Q11 — Does this document adopt a gap source for categorical colour?** Geist publishes
scales and roles and **no categorical or data-visualisation palette**, so a consumer needing
*n* mutually-distinguishable colours has nothing to conform to — which is how the trip
palette came to be defined by subtraction. [`README.md`](README.md) already names
guidance-only gap sources for `shell.md`, `composition.md` and `motion.md` where Geist is
silent, and this is the same shape.
[**Cloudscape's data-vis colours**](https://cloudscape.design/foundation/visual-foundation/data-vis-colors/)
is the obvious candidate on that precedent: it publishes a generic categorical palette on
**five hues — blue, pink, teal, purple, orange** — *"ordered to be visually distinguishable
to each other when used together,"* and **green and red are absent from it**, which is D17's
answer arrived at independently. It also carries the rule that *"color should not be used as
the only method of communicating what the data represents."* **It is not a drop-in**: its set
includes blue, which is this system's accent. Adopt it as a source to measure against, the
way `typography.md` treats Geist — never as a palette to paste.

**Q12 — Does a fill publish its label, or does a consumer derive it?** Today a consumer asks
*which of white or near-black clears on this fill* and answers per hue — which is how the
scheduler shipped a 700 fill whose label fails (`../trip-bar.md` D13). **Material 3 packages
it the other way**: every `container` ships with its `on-container`, the pair is the unit, and
*"a dark surface color is algorithmically paired with a light text label color so the UI
automatically meets contrast requirements."* Adopting that shape here would publish
`--rux-{hue}-{step}` and its label together, and the question could not be asked wrong. Two
cautions: M3 guarantees **3:1**, not this document's 4.5:1, and its containers are for chips
and buttons rather than body text — so the shape is what is worth taking, not the number.

**The status-mark half of this question is now measured (step 23), and one of its two
halves is decided.** A status icon on a saturated category fill — the trip bar's pending and
driver marks — was swept across seven ink/fill pairings in both themes on 2026-08-24: 900
inks on 500/600/700 fills, 1000 inks, 500 and 700 inks, and the dark branch's bright 900s
transplanted onto light fills. The finding is structural: **the light branch holds exactly
one dark-ink band (900–1000); rungs 400–800 share one brightness band**, so no mid-on-mid
pairing can reach 3:1, and the only light-mode pairing that clears everywhere is the hue's
**1000** ink (5.0–9.8 on 500/600 fills). Dark mode needs no search — its bright 900s clear
3:1 on every fill including their own hue. **The owner decided the dark half ships as is
(it already does) and declined the light-half fix**: the 1000 inks read too desaturated,
and the icons' light-theme failure (1.9–3.3) is accepted and recorded as
`../trip-bar.md` D19 rather than papered over. What remains for Q12's eventual answer: a
light-mode status mark that is *both* saturated and legible is not a rung choice — it is a
different mark (a backed chip, an outlined glyph), which is exactly the container/on-container
shape this question already contemplates.

**The different-mark half is now measured (step 29), and the answer is coupled to the
band.** `../../status-mark-specimen.html` renders four treatments — today's bare 900 ink, a
`surface-1`-backed chip, a `surface-1`-ringed glyph, and the fill's own label — on both
boards, both themes. On **today's 500/600 board nothing fully clears**: even the chip's disc
fails the fill (1.68–2.71) because those fills sit near `surface-1`'s own lightness in each
theme. On **§5 step 24's band the chip and the ring clear everywhere** — ink on disc 6.74
dark / 5.37 light (the healthy F3 pairing, saturation intact), disc against fill 3.11–6.37
in both themes — *because* the band is one luminance held distant from `surface-1` on both
canvases. A saturated, legible status mark exists over the normalized band and does not
exist over the shipped board; which mark it is remains the owner's, but the precondition is
now a measurement rather than a hunch.

**Q13 — Does a role name one function, and MUST a role used as a fill publish its label?**
Rule 2.2 partitions the vertical axis and forbids a **step** serving two purposes. Nothing
forbids a **role** serving two **functions**, so the partition is undone one layer up:
`--rux-danger` is one (scale, step) — `red-900`, which 2.2 calls *secondary text and icons*
— and it is read **27× as `color:`, 3× as `border-color:` and 2× as `background:`**.
`--rux-warning` is 21/1/2 and `--rux-accent` is 17/6/8.

**The two axes are different, which is why 2.2 cannot catch this.** 2.2's ten purposes
describe a *position on a lightness ladder* — background, border, high-contrast background,
text. What a contrast floor actually depends on is *what surface the colour sits on*.
`red-900` is unambiguously "secondary text" on the first axis, and that says nothing about
whether white reads on it. `../color-consumption-audit.md` names five functions (F1 fill ·
F2 mark on a fill · F3 text · F4 line · F5 tint) and inventories every consumer.

**Measured 2026-08-25 in `../../color-function-specimen.html`**, one role per row, one
function per column, sRGB branch:

| role | F1 fill | F2 mark on a fill | F3 text | F4 line | F5 tint |
|---|---|---|---|---|---|
| `--rux-danger` | 2.94 ✗ / 5.37 | 1.18 ✗ | 6.74 / 5.37 | 6.74 / 5.37 | 14.9 / 16.2 |
| `--rux-warning` | 2.11 ✗ / 5.58 | 1.65 ✗ / 1.14 ✗ | 9.38 / 5.58 | 9.38 / 5.58 | 14.6 / 16.7 |
| `--rux-success` | 2.24 ✗ / 5.33 | 1.55 ✗ / 1.19 ✗ | 8.86 / 5.33 | 8.86 / 5.33 | 14.3 / 16.8 |
| `--rux-info` | 2.50 ✗ / 5.31 | 1.39 ✗ / 1.19 ✗ | 7.92 / 5.31 | 7.92 / 5.31 | 14.6 / 16.6 |
| `--rux-accent` | 4.44 ✗ | 1.28 ✗ | **4.44 ✗** | 4.44 | 14.6 / 16.6 |

*(dark / light; one figure where the value is theme-invariant. F1/F3/F5 floor 4.5, F2/F4
floor 3.0.)*

**Three findings fall out.** (1) **F3 is healthy** — the function these roles were designed
and measured for clears in both themes, which is rule 2.11's first half doing its job.
(2) **F1 fails for all four status roles in dark** (2.11–2.94), not just the one D20 caught;
D20 is an instance, not the defect. (3) **F2 fails universally** (1.14–1.93) — no status
role works as a mark on §5 step 24's band, which is D18 with numbers.

**A fourth, needing verification before it is called a defect:** `--rux-accent` measures
**4.44** as text on `surface-1` in both themes — 0.06 under the floor, and the same number
rule 2.11 publishes for blue-700 against white, since contrast is symmetric. Whether any of
its 17 `color:` reads is small text has not been checked; at 24px or larger the 3:1 floor
applies and it passes. **VERIFIED (step 27): it is a defect.** All 14 text sites are
12–14px regular — none reaches the large-text threshold — and two of them sit on the accent
tint at 3.86 dark. Filed as **D21**, fixed by step 28.

**Two branches.** **Narrow:** give the four status roles the `-fill` / `-on-fill` treatment
§5 step 24 built for the seven category hues, so a fill always ships its label and D20
cannot recur. Contained, additive, closes the live failure. **Broad:** add the function axis
to §2 as a companion rule to 2.2 — a role names one function; a role used as a fill MUST
publish its label — with F1–F5 as the vocabulary. That reaches every role, and would make
the audit's inventory the migration list.

**PARTLY ANSWERED (step 25): the broad branch is written.** The owner authorized rewriting
rules where it improves the palette, and §2 gained **2.13** (a published band states one
luminance) and **2.14** (a role names one function; an F1 role publishes its label) on
2026-08-25. The recommendation had been narrow-first; it was taken the other way because the
measurements were already in hand and a rule written against them is not written ahead of
experience. **What remains open is the narrow branch** — giving the four status roles the
`-fill` / `-on-fill` treatment so D20 closes. That step changes what renders and is not
authorized here. **Deliberately not proposed:** renaming or retiring
`--rux-danger` and friends — they are correct for F3, which is most of their use, and
removing a published name is Class C. *Blocks nothing; blocked by nothing.*

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
