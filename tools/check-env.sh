#!/bin/bash
# Verify this machine can actually build and test this repository.
#
#   tools/check-env.sh [--warn]
#
# Pure bash on purpose. The thing most likely to be missing is Node itself, so
# a check written in Node or run through npm cannot report its own absence —
# it just dies with "command not found" and leaves you guessing.
#
# Default is strict: a problem exits non-zero, so tooling that needs Node stops
# with an explanation instead of a cryptic failure three steps later. --warn
# reports and exits 0, for the post-merge hook, which runs after the pull has
# already happened and has nothing left to block.

set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REQUIRED_NODE="22.13.0"   # keep in step with package.json engines.node
MODE="strict"
[ "${1:-}" = "--warn" ] && MODE="warn"

PROBLEMS=0
note() { echo "  $*"; }
fail() { echo "✗ $1"; shift; for l in "$@"; do note "$l"; done; PROBLEMS=$((PROBLEMS + 1)); }

# Compare dotted versions numerically. No `sort -V`: BSD and GNU disagree about
# whether it exists, and this file has to run on both.
version_lt() {
  local a b i x y
  IFS=. read -r -a a <<< "${1%%-*}"
  IFS=. read -r -a b <<< "${2%%-*}"
  for i in 0 1 2; do
    x=$((10#${a[i]:-0})); y=$((10#${b[i]:-0}))
    [ "$x" -lt "$y" ] && return 0
    [ "$x" -gt "$y" ] && return 1
  done
  return 1
}

# ── Node ─────────────────────────────────────────────────────────────────────
if ! command -v node > /dev/null 2>&1; then
  # "Missing" and "installed but not on PATH" need different fixes, and the
  # second is the common one: Homebrew writes its shellenv line to ~/.zprofile,
  # which bash does not read. Look where brew actually puts things before
  # telling anyone to install something they already have.
  FOUND=""
  for candidate in /opt/homebrew/bin/node /usr/local/bin/node; do
    [ -x "$candidate" ] && { FOUND="$candidate"; break; }
  done
  if [ -n "$FOUND" ]; then
    fail "Node is installed at $FOUND but is not on PATH in this shell." \
         "Its version: $("$FOUND" -v 2>/dev/null)" \
         "For zsh:   echo 'eval \"\$($(dirname "$FOUND")/brew shellenv)\"' >> ~/.zprofile" \
         "For bash:  echo 'eval \"\$($(dirname "$FOUND")/brew shellenv)\"' >> ~/.bash_profile" \
         "Right now: export PATH=\"$(dirname "$FOUND"):\$PATH\""
  else
    BREW_HINT="brew install node"
    command -v brew > /dev/null 2>&1 || [ -x /opt/homebrew/bin/brew ] \
      || BREW_HINT='/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"  then: brew install node'
    fail "Node is not installed on this machine — tests and builds cannot run." \
         "Install it:  $BREW_HINT"
  fi
else
  NODE_VERSION="$(node -v 2>/dev/null)"; NODE_VERSION="${NODE_VERSION#v}"
  if version_lt "$NODE_VERSION" "$REQUIRED_NODE"; then
    fail "Node $NODE_VERSION is older than the required $REQUIRED_NODE." \
         "Upgrade:  brew upgrade node"
  else
    note "✓ Node $NODE_VERSION (>= $REQUIRED_NODE)"
  fi
  command -v npm > /dev/null 2>&1 \
    && note "✓ npm $(npm -v 2>/dev/null)" \
    || fail "node is present but npm is not — the Node install is incomplete." "Reinstall:  brew reinstall node"
fi

# ── Git hooks ────────────────────────────────────────────────────────────────
# Hooks live in .git/hooks, which is not versioned, so a fresh clone silently
# has none. Pointing core.hooksPath at the versioned directory fixes that, but
# it is one command per clone that is easy to forget — so it is checked here.
HOOKS_PATH="$(git -C "$REPO" config core.hooksPath 2>/dev/null || true)"
if [ -n "${CI:-}" ]; then
  # A CI checkout is not a working clone: it never commits or merges, so hooks
  # are irrelevant there and reporting them as a problem is just noise.
  note "✓ CI run — git hooks not applicable"
elif [ "$HOOKS_PATH" != ".githooks" ]; then
  fail "Versioned git hooks are not enabled in this clone." \
       "Enable:  git -C \"$REPO\" config core.hooksPath .githooks"
else
  note "✓ git hooks → .githooks"
fi

# ── Result ───────────────────────────────────────────────────────────────────
if [ "$PROBLEMS" -eq 0 ]; then
  echo "Environment OK."
  exit 0
fi
echo
if [ "$MODE" = "warn" ]; then
  echo "$PROBLEMS problem(s). Fix before running tests or a build."
  exit 0   # a post-merge hook must never fail the pull it follows
fi
echo "$PROBLEMS problem(s). Stopping."
exit 1
