#!/usr/bin/env bash
# Lists the scopes a pull request title may carry.
#
# Run by the sibling `action.yml` from the repository root, after a checkout.
# Every `package.json` that the root `package.json` `workspaces` globs match
# contributes its `name` without the `@canonical/` prefix, so the list is read
# from the tree on every run and never committed: a pull request that adds a
# package may use the new name. Four scopes name no package and are appended:
# `deps`, `monorepo`, `constitution` and `ci`.
#
# `amannn/action-semantic-pull-request` treats each entry as a regex wrapped in
# `^ $`, so `ke` does not admit `ke-graphql`; a `.` is the only regex
# metacharacter an npm name may contain and is escaped so it matches only
# itself.
#
# The list goes to stdout, one scope per line, and to `$GITHUB_OUTPUT` as the
# multiline `scopes` value when that variable is set, so the script runs
# unchanged on a developer machine.
set -euo pipefail

names="$(
  jq -r '.workspaces[]' package.json |
    while IFS= read -r glob; do
      # The glob is meant to expand here; that is what a workspaces entry is.
      # shellcheck disable=SC2086
      for manifest in $glob/package.json; do
        if [ -f "$manifest" ]; then echo "$manifest"; fi
      done
    done |
    xargs -r jq -r '.name // empty' |
    sed -e 's#^@canonical/##' -e 's/\./\\./g' |
    sort -u
)"

if [ -z "$names" ]; then
  echo "::error::No workspace package names found; refusing to run the title lint without a scope list."
  exit 1
fi

scopes="$(printf '%s\n' "$names" deps monorepo constitution ci)"
echo "$scopes"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "scopes<<SCOPES"
    echo "$scopes"
    echo "SCOPES"
  } >>"$GITHUB_OUTPUT"
fi
