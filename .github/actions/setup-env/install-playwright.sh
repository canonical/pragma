#!/usr/bin/env bash
# Installs the Playwright browsers the browser test suites actually launch,
# and verifies the install produced exactly those executables.
#
# Two hard-won rules from #901 (main red for three days):
#
# 1. NEVER `bunx playwright` — bun's isolated layout does not hoist playwright
#    to root node_modules, so bunx silently falls back to fetching the LATEST
#    playwright from the registry and installs that version's browser builds,
#    which the workspace's pinned playwright-core then cannot find (observed:
#    installed chromium 1234 / wanted 1228). The install must resolve through
#    a DECLARED CONSUMER: the svelte browser suites declare playwright
#    themselves, and bun's layout guarantees a declared dep exists in the
#    package's node_modules — so their resolution is correct by construction,
#    even while other packages pin a different playwright elsewhere in the
#    tree.
#
# 2. The decision is made HERE in shell, not in a step `if:` — composite-step
#    conditions mis-evaluated silently twice during #901, each time skipping
#    the install with nothing in the log. This script always runs, always
#    logs the received input, exits 0 when not requested, and fails the job
#    at the CAUSE (with the exact missing revision named) instead of 200
#    browser tests later.
#
# Expected env vars (injected by the calling workflow step):
#   INSTALL_PLAYWRIGHT — 'true' installs; anything else skips; empty errors.
#   pr.yml passes its warm-graph detection result; push.yml/tag.yml pass
#   'true' (the full suite always includes the browser suites).
set -euo pipefail

# The anchor package: a browser test suite that declares playwright directly.
ANCHOR="packages/svelte/ds-global"

echo "install-playwright input = '${INSTALL_PLAYWRIGHT}'"
if [ -z "${INSTALL_PLAYWRIGHT}" ]; then
  echo "::error::install-playwright arrived EMPTY — a real value always exists via the input default, so empty means input propagation into the composite failed"
  exit 1
fi
if [ "${INSTALL_PLAYWRIGHT}" != "true" ]; then
  echo "browser install not requested; skipping"
  exit 0
fi

PW_CLI="${ANCHOR}/node_modules/playwright/cli.js"
if [ ! -f "$PW_CLI" ]; then
  echo "::error::playwright not found at ${PW_CLI} (the browser suites' own resolution) — cannot install browsers deterministically"
  exit 1
fi
echo "suite playwright: $(bun "$PW_CLI" --version)"
bun "$PW_CLI" install --with-deps chromium firefox webkit
echo "ms-playwright contents after install:"
ls ~/.cache/ms-playwright/ || true

# Verify the EXACT revisions the anchor's playwright-core resolves — a
# version-mismatched install can never again pass setup silently. The
# browsers.json is found THROUGH the playwright package (bun keeps a
# package's deps beside it), never via a root hoist assumption.
BROWSERS_JSON="$(dirname "$(realpath "$PW_CLI")")/../playwright-core/browsers.json"
EXPECTED=$(jq -r '.browsers[] | select(.name=="chromium" or .name=="chromium-headless-shell" or .name=="firefox" or .name=="webkit") | (.name | gsub("-";"_")) + "-" + .revision' "$BROWSERS_JSON")
missing=0
for dir in $EXPECTED; do
  [ -d "$HOME/.cache/ms-playwright/$dir" ] || { echo "::error::expected ${dir} in ms-playwright (the suites' playwright-core revision)"; missing=1; }
done
exit "$missing"
