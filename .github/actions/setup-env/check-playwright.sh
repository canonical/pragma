#!/usr/bin/env bash
# Determines whether Playwright is required for the current CI run and sets
# PLAYWRIGHT_REQUIRED=true/false in $GITHUB_OUTPUT.
#
# PR workflows run `nx affected` and only need Playwright if an affected package
# carries the "playwright" project tag. Non-PR workflows (push, tag) run the full
# test suite, so every tagged project must be checked regardless of what changed.
#
# The nx query is treated as an OPTIMIZATION, never an authority: if it errors,
# or exits 0 with empty output while stderr shows it never really resolved the
# graph, skipping the install breaks every browser test in the run — so any
# outcome other than a clean, visible project list fails OPEN (install). The
# resolved list and nx's stderr are always echoed to the job log; this gate
# failing silently is exactly what a red main hid for days.
#
# Expected env vars (injected by the calling action step):
#   EVENT_NAME  — ${{ github.event_name }}
#   BASE_REF    — ${{ github.event.pull_request.base.ref }}
set -euo pipefail

NX_STDERR="$(mktemp)"
QUERY_FAILED=0

if [ "${EVENT_NAME}" = "pull_request" ]; then
  QUERY_DESC="affected ∩ tag:playwright (base origin/${BASE_REF})"
  PLAYWRIGHT_PACKAGES=$(bunx nx show projects --affected --projects tag:playwright --base="origin/${BASE_REF}" --head=HEAD 2>"$NX_STDERR") || QUERY_FAILED=$?
else
  QUERY_DESC="all tag:playwright"
  PLAYWRIGHT_PACKAGES=$(bunx nx show projects --projects tag:playwright 2>"$NX_STDERR") || QUERY_FAILED=$?
fi

echo "check-playwright: query = ${QUERY_DESC}"
echo "check-playwright: exit = ${QUERY_FAILED}, resolved projects = [${PLAYWRIGHT_PACKAGES//$'\n'/, }]"
if [ -s "$NX_STDERR" ]; then
  echo "check-playwright: nx stderr follows:"
  sed 's/^/  [nx] /' "$NX_STDERR"
fi

if [ "$QUERY_FAILED" -ne 0 ]; then
  echo "::warning::check-playwright: nx query failed (exit ${QUERY_FAILED}); failing OPEN — browsers will be installed."
  echo "PLAYWRIGHT_REQUIRED=true" >> "$GITHUB_OUTPUT"
elif [ -n "$PLAYWRIGHT_PACKAGES" ]; then
  echo "PLAYWRIGHT_REQUIRED=true" >> "$GITHUB_OUTPUT"
else
  # Cross-check before trusting an empty affected result: if the repo has
  # playwright-tagged projects at all, an empty *affected* intersection is a
  # legitimate skip; an empty *tag* universe here while tagged projects exist
  # in-tree means the graph never resolved — fail open.
  ALL_TAGGED=$(bunx nx show projects --projects tag:playwright 2>>"$NX_STDERR" || true)
  if [ "${EVENT_NAME}" = "pull_request" ] && [ -n "$ALL_TAGGED" ]; then
    echo "check-playwright: no tagged project affected (universe: [${ALL_TAGGED//$'\n'/, }]) — skipping browser install."
    echo "PLAYWRIGHT_REQUIRED=false" >> "$GITHUB_OUTPUT"
  elif [ -z "$ALL_TAGGED" ]; then
    echo "::warning::check-playwright: tag:playwright resolved EMPTY while tagged projects exist in-tree; graph resolution is suspect — failing OPEN."
    echo "PLAYWRIGHT_REQUIRED=true" >> "$GITHUB_OUTPUT"
  else
    echo "PLAYWRIGHT_REQUIRED=false" >> "$GITHUB_OUTPUT"
  fi
fi
