---
name: rux-design
description: Use this skill to generate well-branded interfaces and assets for Rux UI, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

# Rux Design — Skill

Read `README.md` in this skill first; it has the full visual and content rules. Then explore:

- `tokens.css` — every design token, all `--rux-*`
- `colors_and_type.css` — webfonts + global element styles
- `components.css` — every component, BEM-style `.rux-*`
- `rux.js` — tiny JS helpers (toast, modal, copy)
- `demo.html` — live reference of every component composed together
- `ui_kits/showcase/index.html` — an example app screen
- `assets/` — logo + icon set

## What this brand is

Rux UI is a dark-only design system. Clean, minimalist, modern — the restraint of Apple, the density of Linear, the energy of Spotify. Near-black canvas, hairline borders, single blue accent, sentence-case copy, no emoji, no gradients, no glass.

## When you build with it

1. **Always** import the three CSS files in order: `tokens.css`, `colors_and_type.css`, `components.css`. Add `rux.js` if you need toasts/modals.
2. **Never hardcode** a color, radius, shadow, or spacing value. Use a `--rux-*` token. If a value is missing, that's a signal to add a token, not a one-off.
3. **Compose, don't redesign.** A new screen is almost always `.rux-card` + `.rux-button` + `.rux-input` arranged with `.rux-stack` and `.rux-cluster`. Resist inventing components.
4. **Match the copy voice.** Sentence case. No exclamation marks. No emoji. Verb-first button labels. Short error messages that say what happened and what to do.
5. **Icons are Lucide.** Inline SVG with `class="rux-icon"`. Never Material Symbols, never emoji.
6. **Optical radius nesting.** Nested elements step *down* one level in the radius scale. A 6px input inside a 16px card.

## When the user invokes this skill

If they ask for a Rux UI artifact (slide, mock, prototype, screen), build a static HTML file that links the three CSS files and uses `.rux-*` components. Copy assets from `assets/` into the artifact's folder so it works standalone. Show what you built.

If they're working on production code, point them to the relevant token names and component classes. Treat the README as the source of truth for rules — quote it back when relevant.

If invoked with no other guidance, ask:
- What are they building (slide, app screen, marketing page, prototype)?
- What's the core content (real copy, real data, or placeholder)?
- Do they need light mode? (Currently: **no light mode** — flag this if asked.)

Then design like an expert with this brand at their fingertips.
