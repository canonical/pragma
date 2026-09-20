#!/bin/bash

# Brings bun.lock to the state a clean install produces, and REFUSES to let the
# release continue while it is still moving.
#
# `lerna version` rewrites every manifest, so the root lockfile has to be
# rewritten with them. A single `bun install` does not finish that job here: the
# v0.38.0 bump (d96431adb) and the v0.39.0 bump (a63019de1) each committed a
# lockfile in which the packages' own `version` fields had moved to the new
# minor while every workspace sibling RANGE still named the previous one — 379
# of them at 0.39.0. A second install writes those ranges.
#
# The cost of shipping the half-written file is total, because every job starts
# with `bun install --ignore-scripts && git diff --exit-code bun.lock`: the
# tagged commit fails that gate, so the publish job dies before it can publish
# and the tag ends up with no packages behind it (v0.39.0 published none of its
# 58 public packages), while main is red for everyone until someone commits the
# missing half by hand (#1309 after 0.38.0, #1338 after 0.39.0).
#
# So this installs until the lockfile stops changing — a fixed point is the only
# honest definition of "what a clean install produces" — and fails the release
# if it has not settled within MAX_PASSES. It runs BEFORE anything is committed
# or tagged, where a failure is still free.

set -euo pipefail

# Two passes are what the observed non-convergence needs; the third exists to
# distinguish "settled" from "still moving" without guessing.
MAX_PASSES=3

lock_digest() {
  sha256sum bun.lock | cut -d' ' -f1
}

main() {
  if [ ! -f bun.lock ]; then
    echo "Error: bun.lock not found in $(pwd). Refusing to release without a lockfile."
    return 1
  fi

  local pass digest_before digest_after
  digest_before=$(lock_digest)

  for ((pass = 1; pass <= MAX_PASSES; pass++)); do
    bun install --ignore-scripts
    digest_after=$(lock_digest)

    if [ "$digest_after" == "$digest_before" ]; then
      echo "Lockfile settled after $pass install pass(es): bun install no longer changes bun.lock."
      return 0
    fi

    echo "Install pass $pass changed bun.lock; installing again to confirm it has settled."
    digest_before="$digest_after"
  done

  echo "Error: bun.lock is still changing after $MAX_PASSES install passes, so this bump would commit a lockfile that no clean install reproduces. Every job — including the publish — starts by checking that file against a fresh install, so the release is being stopped here instead. Investigate with 'bun install --ignore-scripts' locally on the bumped tree."
  git --no-pager diff --stat bun.lock || true
  return 1
}

# Only run when executed directly; sourcing the file (e.g. in tests) exposes
# the helpers without running an install.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
