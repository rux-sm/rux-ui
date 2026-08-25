# Colour consumption audit

**Measured 2026-08-25.** An inventory, not a rule. `docs/foundations/color.md` is canonical
for colour; this document states **no values and no MUSTs** — it records what reads colour
today, grouped by the job each read is doing, so that a decision about one band can be made
knowing what else is standing on it. Its output belongs in `color.md` §6 as question input.

Counts are `var()` reads across `rux-ui/css`, `scheduler/css`, `js/` and `index.html`.

---

## 1. The finding

**Colour serves five distinct functions here, and a role serves several of them at once.**

`--rux-danger` is read **27× as `color:`, 3× as `border-color:`, and 2× as `background:`**.
`--rux-warning` is 21 / 1 / 2. `--rux-accent` is 17 / 6 / 8. One value is being asked to be
text on a neutral surface, a line, *and* a surface carrying a label — three different
contrast problems with three different floors.

`color.md` rule 2.2 says **a step MUST NOT serve two purposes** and partitions the vertical
axis to enforce it. That rule governs *steps*. Nothing governs **roles**, so the partition
is undone one layer up: `--rux-danger` resolves to one step (`red-900`) and is then spent on
three jobs that step was never measured for.

This is D17 seen from the other side. D17 records that no rule governs what a *hue* means;
this records that no rule governs what a *role is for*. Both are the same missing axis.

## 2. The five functions

| # | Function | The contrast question it asks | Floor |
|---|---|---|---|
| **F1** | **Fill** — a surface carrying a label | does the label clear *on this fill*? | 4.5:1 (2.11) |
| **F2** | **Mark** — an icon or dot **on a fill** | does the mark clear *on that fill*? | 3:1 (non-text) |
| **F3** | **Text** — coloured text on a neutral surface | does it clear on `background-100/200`? | 4.5:1 (2.11) |
| **F4** | **Line** — border, rule, indicator | does it clear on its neighbour? | 3:1 (non-text) |
| **F5** | **Tint** — a subtle wash behind content | does the content on it still clear? | inherited |

**Only F1 is normalized today** — `--rux-{hue}-fill` / `-on-fill`, `color.md` §5 step 24.
F2 is the one that is failing, and it fails *because* F1 moved without it.

## 3. The map

### F1 · Fills

| Role | Step | Consumers | Normalized? |
|---|---|---|---|
| `--rux-{hue}-fill` (×7) | *(named band)* | 0 — published, unused | **yes** (step 24) |
| `--rux-accent-800` | `blue-800` | accent button bg (3) | no |
| `--rux-accent` *as background* | `blue-700` | 8 | no |
| `--rux-danger-fill` | `red-800` | danger button bg | no |
| `--rux-info-fill` | `blue-800` | 1 | no |
| `--rux-success-fill` | `green-800` | **0** | no |
| `--sched-trip-color-*` (×5) | hue `500`/`600` | trip bar background | no |
| `--sched-trip-bar-{confirmed,unconfirmed}-tone` | `blue-500` / `red-500` | trip bar background | no |

### F2 · Marks on a fill — the failing band

| Role | Step | Sits on | Measured |
|---|---|---|---|
| `--sched-trip-bar-danger-icon` | `red-900` | any category fill | fails 3:1 on most |
| `--sched-trip-bar-warning-icon` | `amber-900` | any category fill | fails |
| `--sched-trip-bar-success-icon` | `green-900` | any category fill | fails |

Measured against the step-24 band: **dark 15 of 21 pairings below 3:1, light 21 of 21.**
Against today's shipped `500`/`600` fills, `color.md` §5 step 23 recorded dark at 3.0–5.3
and light accepted as failing. **No band exists for F2.** This is D18 with numbers.

### F3 · Text on a neutral surface

| Role | Step | `color:` reads |
|---|---|---|
| `--rux-danger` | `red-900` | 27 |
| `--rux-warning` | `amber-900` | 21 |
| `--rux-accent` | `blue-700` | 17 |
| `--rux-success` | `green-900` | 11 |
| `--rux-info` | `blue-900` | 6 |
| `--sched-trip-bar-notes-fg` | `amber-900` | 1 |
| `--rux-tag-purple` | `purple-900` | 1 |

Covered by rule 2.11's first half and measured there (status 900s at 5.3–5.6 in light).
**This band is healthy** and is the one not to disturb.

### F4 · Lines

`--rux-accent` as `border-color` (6) · `--rux-danger` as `border-color` (3) ·
`--sched-trip-bar-{danger,warning}-border` (`red-800`/`amber-800`) ·
`--sched-calendar-now-line-color` (`accent-800`) · `--sched-driver-priority-color`
(`purple-700`) · priority dots (`purple-700`).

### F5 · Tints

`--rux-{danger,warning,success,info}-subtle` (hue `100`) ·
`--sched-driver-doc-warning-{bg,border,hover-bg}` (`color-mix` off `--rux-warning`).

## 4. What this implies

1. **F2 has no band and needs one.** Every other function either has a normalized band
   (F1), is measured and healthy (F3), or runs at the looser non-text floor against
   neutrals (F4, F5). F2 is the only function whose surface is *itself* a variable colour.
2. **A role should declare its function.** `--rux-danger` spending one value on F1, F3 and
   F4 is why "is danger legible" has no single answer. Splitting by function is the
   generalisation of what step 24 did for one band.
3. **`--rux-success-fill` has zero consumers** and `--rux-warning-fill` is used only as a
   *border*, not a fill — the F1 group is partly fictional and should be checked before
   anything is built on it.
4. **Sequencing.** F2's band depends on F1's luminance, so F1 must settle first. Step 24
   settled it; whether it is per-theme or theme-invariant changes F2's arithmetic, so that
   shape decision blocks the F2 work.

## 5. Deliberately not done

No token, role or rule was changed. No band is proposed here — proposing one is a
`color.md` amendment and belongs in its log, not in an inventory. The F2 options measured
so far (a second normalized band, the fill's own label, a backed chip) are recorded in this
session's specimen and in `color.md` §6, not here.
