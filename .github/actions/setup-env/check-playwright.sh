#!/usr/bin/env bash
# Determines whether Playwright is required for the current CI run and sets
# PLAYWRIGHT_REQUIRED=true/false in $GITHUB_OUTPUT.
#
# PR workflows run `nx affected` and only need Playwright if an affected package
# carries the "playwright" project tag. Non-PR workflows (push, tag) run the full
# test suite, so every tagged project must be checked regardless of what changed.
#
# Expected env vars (injected by the calling action step):
#   EVENT_NAME  — ${{ github.event_name }}
#   BASE_REF    — ${{ github.event.pull_request.base.ref }}
set -euo pipefail

if [ "${EVENT_NAME}" = "pull_request" ]; then
  PLAYWRIGHT_PACKAGES=$(bunx nx show projects --affected --projects tag:playwright --base="origin/${BASE_REF}" --head=HEAD)
else
  PLAYWRIGHT_PACKAGES=$(bunx nx show projects --projects tag:playwright)
fi

if [ -n "$PLAYWRIGHT_PACKAGES" ]; then
  echo "PLAYWRIGHT_REQUIRED=true" >> "$GITHUB_OUTPUT"
else
  echo "PLAYWRIGHT_REQUIRED=false" >> "$GITHUB_OUTPUT"
fi
