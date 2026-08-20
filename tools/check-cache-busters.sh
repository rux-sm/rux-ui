#!/bin/bash
# Keep the ?v= cache-busters in the reference pages honest.
#
#   tools/check-cache-busters.sh            audit the whole history for drift
#   tools/check-cache-busters.sh --fix      bump every stale reference
#   tools/check-cache-busters.sh --staged   pre-commit mode (see below)
#
# The pages load shared assets as `rux-ui/js/thing.js?v=7`. The number is the
# only thing telling a browser its cached copy is out of date, and nothing
# checks it, so it drifts: an asset changes, the number does not, and a warm
# cache keeps serving the old file against new HTML. That failure is invisible
# on a hard refresh, which is how it survives.
#
# Consumers are not affected — the vendor exporter strips ?v= entirely — so
# this is about the reference pages in this repository.
#
# Audit mode compares each asset's last commit against the last commit that
# touched its ?v, so it answers "would a returning browser get a stale file"
# for the committed state — which is the state that actually ships. A bump that
# is only in the working tree does not clear it; commit and re-run. Staged mode
# is the one that prevents recurrence: if an asset is staged, the ?v referencing
# it must be changing in the same commit.

set -uo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

MODE="audit"
case "${1:-}" in
  --fix) MODE="fix" ;;
  --staged) MODE="staged" ;;
  "") ;;
  *) echo "ERROR: unknown argument: $1" >&2; exit 2 ;;
esac

# Any locally-served asset carrying a version, not just the design system's.
# The application's own scripts are cached by the same browsers under the same
# rules — js/panels/trip-envelope.js?v=14 goes stale exactly like rux.css does.
refs_in() { grep -oE '[A-Za-z0-9_./-]+\.(js|css)\?v=[0-9]+' "$1" 2>/dev/null | sed 's|^\./||' | sort -u; }

# ── Staged mode: the guard ───────────────────────────────────────────────────
if [ "$MODE" = "staged" ]; then
  STAGED_ASSETS="$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|css)$' | grep -vE '^(tests|tools)/' || true)"
  [ -n "$STAGED_ASSETS" ] || exit 0
  PROBLEMS=0
  for asset in $STAGED_ASSETS; do
    base="$(basename "$asset")"
    for page in *.html; do
      grep -q "$base?v=" "$page" 2>/dev/null || continue
      # The page must be staged too, and its version for THIS asset must differ
      # from the committed one.
      # Compare HEAD against the INDEX, not the working tree. A bump sitting
      # unstaged in the working tree would otherwise satisfy this while the
      # commit shipped the asset without the page that versions it.
      old="$(git show "HEAD:$page" 2>/dev/null | grep -oE "$base\?v=[0-9]+" | head -1)"
      new="$(git show ":$page" 2>/dev/null | grep -oE "$base\?v=[0-9]+" | head -1)"
      if [ "$old" = "$new" ]; then
        echo "✗ $asset changed but $page still says ${new:-<none>}"
        PROBLEMS=$((PROBLEMS + 1))
      fi
    done
  done
  if [ "$PROBLEMS" -gt 0 ]; then
    echo
    echo "A browser with the old file cached will keep using it against the new" >&2
    echo "HTML. Bump the versions:" >&2
    echo "    tools/check-cache-busters.sh --fix" >&2
    echo "then stage the pages. To commit anyway: git commit --no-verify" >&2
    exit 1
  fi
  exit 0
fi

# ── Audit / fix ──────────────────────────────────────────────────────────────
STALE=0
FIXED=0
for page in *.html; do
  for ref in $(refs_in "$page"); do
    file="${ref%%\?*}"
    version="${ref##*=}"
    base="$(basename "$file")"
    [ -f "$file" ] || continue
    file_at="$(git log -1 --format=%ct -- "$file" 2>/dev/null)"
    # -G, not -S. -S counts occurrences of a string, and bumping v4 to v5
    # leaves the count of "thing.js?v=" unchanged, so -S never sees a bump and
    # the audit would stay red forever. -G matches changed lines instead.
    base_re="$(printf '%s' "$base" | sed 's/[.[\*^$()+?{}|]/\\&/g')"
    ver_at="$(git log -1 --format=%ct -G"$base_re\?v=" -- "$page" 2>/dev/null)"
    [ -n "$file_at" ] || continue
    [ -n "$ver_at" ] || ver_at=0
    [ "$file_at" -le "$ver_at" ] && continue
    STALE=$((STALE + 1))
    if [ "$MODE" = "fix" ]; then
      next=$((version + 1))
      # Only this asset's reference on this page; other ?v= values are theirs.
      tmp="$page.tmp"
      sed "s|$base?v=$version|$base?v=$next|g" "$page" > "$tmp" && mv "$tmp" "$page"
      echo "  bumped $page: $base v$version → v$next"
      FIXED=$((FIXED + 1))
    else
      echo "  STALE  $page: $base is newer than its v$version"
    fi
  done
done

if [ "$MODE" = "fix" ]; then
  if [ "$FIXED" -eq 0 ]; then
    echo "Nothing to bump."
  else
    echo "Bumped $FIXED reference(s). Commit them — the audit reads committed"
    echo "history, so it will keep reporting these until they land."
  fi
  exit 0
fi
DIRTY_PAGES="$(git diff --name-only -- '*.html' 2>/dev/null | tr '\n' ' ')"
if [ "$STALE" -gt 0 ]; then
  echo
  if [ -n "$DIRTY_PAGES" ]; then
    echo "Note: uncommitted changes in ${DIRTY_PAGES}— if you have already run"
    echo "--fix, commit it and re-run; the audit reads committed history."
  fi
  echo "$STALE stale reference(s). Fix with: tools/check-cache-busters.sh --fix"
  exit 1
fi
echo "OK — every ?v= is at least as new as the asset it references."
