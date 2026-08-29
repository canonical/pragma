#!/bin/bash

# Refreshes the CLI's embedded pack so a release ships a graph snapshot current
# with its own tag, and SKIPS — loudly, without failing the release — when the
# pack sources cannot be reached.
#
# The three declared packs (design-system, anatomy-dsl, code-standards) are
# INTERNAL repositories cloned over HTTPS. This job checks pragma out with an
# SSH deploy key, which is scoped to pragma alone, so git has no credential for
# them and dies with `could not read Username for 'https://github.com'` — that
# blocked the whole 0.35.0 release, version bump and publish together, for an
# artifact that is already committed and already valid.
#
# So the refresh is now OPTIONAL and honest about which it did:
#
#   - with a token that can read the pack repositories, it refreshes and any
#     real failure still fails the release;
#   - without one, it skips and says so in the job summary, and the release
#     ships the committed snapshot.
#
# A skipped refresh is not a silent one — and since the parity gate landed it
# is not a free one either: the "Verify the embedded pack matches its declared
# sources" step that follows FAILS the release when the snapshot was not
# rebuilt, unless the dispatching human explicitly set
# accept_committed_snapshot. v0.36.0 shipped a snapshot two releases stale
# through exactly this skip; the skip stays honest here, and the gate is what
# makes it stop the release.
#
# INPUTS:
# $1: token (optional) - a token with read access to the pack repositories.

set -euo pipefail

token="${1:-}"
summary="${GITHUB_STEP_SUMMARY:-/dev/null}"

if [ -z "$token" ]; then
  echo "No pack-source token supplied — skipping the embedded-pack refresh."
  {
    echo "### Embedded pack: NOT refreshed"
    echo
    echo "No token with read access to the pack repositories was supplied. The"
    echo "parity gate that follows will FAIL this release unless it was"
    echo "dispatched with \`accept_committed_snapshot\`; either supply"
    echo "\`PACKS_READ_TOKEN\`, or refresh deliberately with \`bun run bundle\`"
    echo "in \`packages/cli/pragma\` and commit the result."
  } >> "$summary"
  exit 0
fi

# Route HTTPS clones of the pack repositories through the token. Global, because
# the bundler clones into its own throwaway directory where this repository's
# local git config does not apply.
git config --global \
  "url.https://x-access-token:${token}@github.com/.insteadOf" \
  "https://github.com/"

cd packages/cli/pragma
bun run bundle

{
  echo "### Embedded pack: refreshed"
  echo
  echo "Rebuilt from the declared pack sources. Writes nothing when the resolved"
  echo "upstream inputs are unchanged, so no diff here means no upstream movement."
} >> "$summary"
