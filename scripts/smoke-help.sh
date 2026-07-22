#!/usr/bin/env bash
# Smoke test: help must render without login (specs/help-without-login.md).
#
# Runs the CLI in an isolated HOME (no credentials, empty feature-flag cache)
# and asserts that help invocations exit 0, render help output, and never
# emit an interactive login prompt.
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d lib ]; then
  echo "lib/ not found — building..."
  yarn build || exit 1
fi

FAKE_HOME="$(mktemp -d)"
trap 'rm -rf "$FAKE_HOME"' EXIT

# On a fresh build the init hook autofixes the node_modules/vtex symlink and
# exits asking for a re-run. Prime it so it doesn't interfere with the cases.
HOME="$FAKE_HOME" node bin/run --version < /dev/null > /dev/null 2>&1 || true

FAILURES=0

run_case() {
  local description="$1"
  shift
  local output
  local status

  # Isolated HOME/XDG dirs => no session token, empty feature-flag cache.
  output="$(HOME="$FAKE_HOME" XDG_CONFIG_HOME="$FAKE_HOME/.config" XDG_CACHE_HOME="$FAKE_HOME/.cache" \
    node bin/run "$@" < /dev/null 2>&1)"
  status=$?

  if [ $status -ne 0 ]; then
    echo "FAIL [$description]: exited with status $status"
    echo "$output" | head -30
    FAILURES=$((FAILURES + 1))
    return
  fi

  if ! echo "$output" | grep -qi "usage"; then
    echo "FAIL [$description]: output does not look like help (no 'Usage' section)"
    echo "$output" | head -30
    FAILURES=$((FAILURES + 1))
    return
  fi

  if echo "$output" | grep -qiE "Account:|previous login|previous account"; then
    echo "FAIL [$description]: interactive login prompt detected"
    echo "$output" | head -30
    FAILURES=$((FAILURES + 1))
    return
  fi

  echo "PASS [$description]"
}

run_case "vtex help" help
run_case "vtex help <command>" help link
run_case "vtex <command> --help" link --help
run_case "vtex <command> -h" link -h
run_case "vtex --help" --help

if [ $FAILURES -gt 0 ]; then
  echo "$FAILURES smoke test case(s) failed"
  exit 1
fi

echo "All help smoke tests passed"
