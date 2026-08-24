#!/bin/bash
# Export Rux UI into a consuming application's vendored copy.
#
#   tools/vendor-into.sh --dest <dir> [--profile css-only|full] [--allow-dirty]
#
# This script is the single source of truth for WHAT leaves this repository and
# HOW the copy is verified. Consuming applications own only where the copy lands
# and how their own build is proven afterwards; they call this script rather
# than reimplementing the export set. The tier boundary it enforces is recorded
# in docs/portability-audit.md.
#
# Profiles:
#   full      css/ + js/ — plain-HTML applications that run the shared behaviors.
#   css-only  css/ alone — framework applications (React, Svelte, …) that own
#             their own DOM and reimplement the behaviors natively. Shipping
#             behavior JS such an application never loads is dead weight that
#             has to be re-reviewed on every sync.
#
# The copy is identified by `git describe`, so a dirty source tree is refused:
# an untraceable snapshot defeats the point of stamping it.

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DST=""
PROFILE="full"
ALLOW_DIRTY=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dest) DST="${2:-}"; shift 2 ;;
    --profile) PROFILE="${2:-}"; shift 2 ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    -h|--help) sed -n '2,20p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "ERROR: unknown argument: $1" >&2; exit 2 ;;
  esac
done

[ -n "$DST" ] || { echo "ERROR: --dest <dir> is required" >&2; exit 2; }
case "$PROFILE" in
  full|css-only) ;;
  *) echo "ERROR: --profile must be 'full' or 'css-only' (got '$PROFILE')" >&2; exit 2 ;;
esac

[ -d "$SRC/rux-ui/css" ] && [ -d "$SRC/rux-ui/js" ] \
  || { echo "ERROR: $SRC does not look like the Rux UI repo (no rux-ui/css + rux-ui/js)" >&2; exit 1; }

# ── Identify the snapshot ────────────────────────────────────────────────────
if ! git -C "$SRC" diff --quiet || ! git -C "$SRC" diff --cached --quiet; then
  if [ "$ALLOW_DIRTY" -eq 1 ]; then
    echo "WARNING: source tree is dirty; VENDORED.md will say so."
    DIRTY="-dirty"
  else
    echo "ERROR: source tree has uncommitted changes. Commit here first" >&2
    echo "       (the copy is identified by version), or pass --allow-dirty." >&2
    exit 1
  fi
else
  DIRTY=""
fi

# A tag if there is one, otherwise the nearest tag plus distance, otherwise a
# bare hash for a repository that has not been tagged yet.
VERSION="$(git -C "$SRC" describe --tags --always --dirty=- 2>/dev/null | sed 's/-$//')$DIRTY"
TODAY="$(date +%Y-%m-%d)"

echo "Vendoring Rux UI $VERSION (profile: $PROFILE) → $DST"
mkdir -p "$DST"

# ── 1. The stylesheet layer, always ──────────────────────────────────────────
rsync -a --delete --exclude .DS_Store "$SRC/rux-ui/css/" "$DST/css/"

# ── 2. The behavior layer, only for the full profile ─────────────────────────
if [ "$PROFILE" = "full" ]; then
  rsync -a --delete --exclude .DS_Store "$SRC/rux-ui/js/" "$DST/js/"
elif [ -d "$DST/js" ]; then
  echo "  removing js/ — not part of the css-only profile"
  rm -rf "$DST/js"
fi

# ── 3. README and the rux-design skill, so agents editing the consumer stay
#       on-system without reaching back into this repository ─────────────────
cp "$SRC/README.md" "$DST/README.md"
cp "$SRC/.claude/skills/rux-design/SKILL.md" "$DST/SKILL.md"
if [ -d "$SRC/.claude/skills/rux-design/references" ]; then
  rsync -a --delete --exclude .DS_Store "$SRC/.claude/skills/rux-design/references/" "$DST/references/"
fi

# ── 4. Documentation, classified here because it is knowledge about this
#       repository, not about any one consumer ──────────────────────────────
# Shipped: describes the portable system itself.
DOCS_SHIP=(buttons.md cards.md design-system-distribution.md layout-composition.md motion.md popovers.md portability-audit.md ui-header.md utilities.md)
# App-tier: describes the reference application. Never leaves.
DOCS_APP=(billing-workflow.md driver-assignment-card.md gem-itinerary-prompt.md project-brief.md trip-bar.md trip-import-schema-v2.json trip-request-inbox.md)
# Repo-internal: working material for this repository, useful to no consumer.
DOCS_INTERNAL_DIRS=(ai audit)
# Shipped wholesale: the design-rule documents a consumer's own specs must defer to.
# A directory rather than a file list on purpose — every file here is shared authority by
# definition, so a new section (spacing, colour) must travel without editing this script.
# That is the one place where skipping the §5 classification prompt is the correct default.
DOCS_SHIP_DIRS=(foundations)

mkdir -p "$DST/docs"
find "$DST/docs" -type f -delete
for doc in "${DOCS_SHIP[@]}"; do
  if [ -f "$SRC/docs/$doc" ]; then
    cp "$SRC/docs/$doc" "$DST/docs/$doc"
  else
    echo "WARNING: shipped doc missing upstream: docs/$doc"
  fi
done
for dir in "${DOCS_SHIP_DIRS[@]}"; do
  if [ -d "$SRC/docs/$dir" ]; then
    mkdir -p "$DST/docs/$dir"
    rsync -a --delete "$SRC/docs/$dir/" "$DST/docs/$dir/"
  else
    echo "WARNING: shipped doc directory missing upstream: docs/$dir"
  fi
done

# ── 5. Drift check. Walks docs/ recursively: a new subdirectory is exactly the
#       kind of thing that otherwise slips out of the classification silently. ─
while IFS= read -r rel; do
  top="${rel%%/*}"
  if [ "$top" != "$rel" ]; then
    for d in "${DOCS_INTERNAL_DIRS[@]}" "${DOCS_SHIP_DIRS[@]}"; do
      [ "$top" = "$d" ] && continue 2
    done
    echo "REVIEW: new upstream doc directory not classified: docs/$rel"
    echo "        → add '$top' to DOCS_INTERNAL_DIRS, or ship the file explicitly."
    continue
  fi
  case " ${DOCS_SHIP[*]} ${DOCS_APP[*]} " in
    *" $rel "*) ;;
    *) echo "REVIEW: new upstream doc not classified: docs/$rel — ship it (DOCS_SHIP) or mark it app-tier (DOCS_APP)" ;;
  esac
done < <(cd "$SRC/docs" && find . -type f ! -name .DS_Store | sed 's|^\./||' | sort)

# ── 6. Normalize import specifiers ───────────────────────────────────────────
# This repository serves files raw and cache-busts @import lines with ?v=N. A
# bundler resolves that as a literal filename and fails, and it inlines the
# imports anyway. Mechanical, recorded below; the only edit the copy receives.
# No `sed -i`: BSD wants `-i ''` and GNU wants `-i` with the suffix attached,
# and the two are mutually unparseable. Writing through a temp file needs no
# in-place support at all, so this runs the same on a developer's Mac and on a
# Linux CI runner. (It failed in CI exactly once, before this note existed.)
for f in "$DST"/css/*.css; do
  sed -E 's/(@import "[^"?]+)\?v=[0-9]+(")/\1\2/g' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done

# ── 7. Junk sweep ────────────────────────────────────────────────────────────
find "$DST" -name .DS_Store -delete

# ── 8. Verify the entrypoint is whole ────────────────────────────────────────
MISSING=0
while IFS= read -r rel; do
  if [ ! -f "$DST/css/$rel" ]; then
    echo "ERROR: css/rux.css imports $rel but it was not vendored" >&2
    MISSING=1
  fi
done < <(grep -oE '@import "\./[^"]+"' "$DST/css/rux.css" | sed 's/@import "\.\///; s/"$//; s/?.*$//')
[ "$MISSING" -eq 0 ] || exit 1

# ── 9. Stamp the copy ────────────────────────────────────────────────────────
if [ "$PROFILE" = "full" ]; then
  PROFILE_NOTE="Both layers are vendored: load \`css/rux.css\`, then the modules
under \`js/\` that this application uses — \`overlay.js\` first, since the other
behaviors delegate outside-press and Escape to it."
else
  PROFILE_NOTE="Stylesheets only. This application owns its own DOM and
reimplements the shared behaviors natively, so \`js/\` is deliberately not
vendored — see the behavior modules in the source repository when mirroring a
contract, and keep the reimplementation in step with them."
fi

cat > "$DST/VENDORED.md" << EOF
# Vendored copy of Rux UI

- **Source**: https://github.com/rux-sm/rux-ui
- **Version**: \`$VERSION\` (vendored $TODAY)
- **Profile**: \`$PROFILE\`
- **Vendored by**: \`tools/vendor-into.sh\` in the source repository.
- **Entrypoint**: \`css/rux.css\` (single entry point; \`css/rux-core.css\` is a
  compatibility alias only).

$PROFILE_NOTE

Treat every file in this folder as read-only. Make shared changes in the Rux UI
source repository, then re-run this application's sync script — never edit here.
The export replaces this folder as a unit and rewrites this stamp.
Application-specific styling belongs in the application's own stylesheet under
its own prefix — never new names in the \`rux-\` namespace.

One mechanical transform is applied at vendor time: \`?v=N\` cache-buster
suffixes are stripped from \`@import\` lines, because a bundler resolves them as
literal filenames and inlines imports anyway.
EOF

echo "Vendored: $(find "$DST" -type f | wc -l | tr -d ' ') files @ $VERSION"
