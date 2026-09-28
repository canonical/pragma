#!/bin/bash

# Updates bun.lock after a version bump and proves it is stable: the lockfile
# is accepted only once a further `bun install` leaves it byte-for-byte
# unchanged. That is exactly what the publish job's setup-env checks at the
# tag (`bun install --ignore-scripts && git diff --exit-code bun.lock`), so a
# lockfile that passes here passes there.
#
# Why one install is not enough: when an install sees workspace versions AND
# workspace dependency ranges change together — which is what every bump does,
# because `lerna version` moves each package's version and its siblings'
# ranges in one edit — Bun records the new workspace versions in bun.lock but
# keeps the old dependency ranges. Only the next install, which sees the
# versions already recorded, rewrites the ranges. Reproduced with Bun 1.4.2 on
# a two-package workspace (a@0.1.0, b depends on "a": "^0.1.0", both bumped to
# 0.2.0 / "^0.2.0"): the first install writes only the two "version" lines,
# the second writes the range. No ordering of the steps in this action avoids
# it, since the versions and the ranges change in the same `lerna version`.
#
# Bounded: at most MAX_INSTALLS installs. A lockfile still moving after that is
# not the two-step behaviour above but something new, and the release stops
# with the diff rather than tagging a lockfile the publish job will reject.

set -euo pipefail

MAX_INSTALLS=3
previous="$(mktemp)"
trap 'rm -f "$previous"' EXIT

bun install --ignore-scripts

for ((install = 2; install <= MAX_INSTALLS; install++)); do
  cp bun.lock "$previous"
  bun install --ignore-scripts
  if cmp -s "$previous" bun.lock; then
    echo "bun.lock converged: install $install left it unchanged."
    exit 0
  fi
  echo "bun.lock changed on install $install."
done

echo "Error: bun.lock is still changing after $MAX_INSTALLS installs. The last install changed:"
git --no-pager diff --no-index "$previous" bun.lock || true
exit 1
