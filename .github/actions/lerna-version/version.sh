#!/bin/bash

# Bumps the versions of packages and generates changelogs in a monorepo according to the Conventional Commits specification.
# It is intended to be run as part of a GitHub Actions workflow.
# INPUTS:
# $1: release_type (required) - The type of release to perform. Can be "stable" or a pre-release identifier (alpha, beta, rc, etc.,)
#   If "stable" is provided, the script will publish current pre-release versions as stable versions.
#   If a pre-release identifier is provided, updates will be applied s as pre-release versions (e.g., 0.0.1-alpha.0 -> 0.0.1-alpha.1), and will include the pre-release identifier in the tag.
# $2: tag_prefix (optional, default "v") - Prefix of the release git tag, used to check for tag collisions.
# OUTPUTS:
# $GITHUB_OUTPUT: The highest version number among all packages after the update is completed is written to "VERSION" in the $GITHUB_OUTPUT environment.
#
# Before the new version is accepted, the following release guards must pass:
# - Pre-releases must not bump the major version (temporary guard until 1.0.0).
# - The new version must be strictly greater than the current version in lerna.json.
# - The release git tag must not already exist locally or on origin.
# - The new version must be strictly greater than the highest version any public package has ever published to npm.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Succeeds when version $1 is strictly greater than version $2 (SemVer 2.0.0 precedence).
semver_gt() {
  node "$SCRIPT_DIR/semver.cjs" gt "$1" "$2"
}

# Lists the names of all public (publishable) workspace packages, one per line.
list_public_packages() {
  bun run --silent lerna list --no-private --json | jq -r '.[].name'
}

# Protect against unexpected major version bumps during project initialization
# TODO this should be removed after 1.0.0 is released, so that we can release pre-releases of major versions like 2.0.0-rc-0.
guard_no_unexpected_major_bump() {
  local release_type="$1" old_version="$2" new_version="$3"
  local old_major new_major
  if [ "$release_type" != "stable" ]; then
    old_major=$(echo "$old_version" | cut -d. -f1)
    new_major=$(echo "$new_version" | cut -d. -f1)
    if [ "$new_major" -ne "$old_major" ]; then
      echo "Error: unexpected major version bump detected ($old_version -> $new_version). Pre-releases must not change the major version before 1.0.0."
      return 1
    fi
  fi
}

# Ensures versions only ever move forward: the new version must be strictly
# greater than the version we started from.
guard_version_is_newer() {
  local new_version="$1" old_version="$2"
  if ! semver_gt "$new_version" "$old_version"; then
    echo "Error: new version $new_version is not strictly greater than the current version $old_version (from lerna.json). Versions must be monotonically increasing; refusing to release."
    return 1
  fi
  echo "Monotonicity check passed: $new_version > $old_version."
}

# Ensures the release git tag does not already exist, locally or on origin.
guard_tag_available() {
  local tag="$1"
  local remote_match
  if git rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    echo "Error: git tag $tag already exists locally. This version appears to have been released already; refusing to overwrite it."
    return 1
  fi
  if ! remote_match=$(git ls-remote --tags origin "refs/tags/$tag"); then
    echo "Error: could not query origin for existing tags. Refusing to release without confirming that tag $tag is unused."
    return 1
  fi
  if [ -n "$remote_match" ]; then
    echo "Error: git tag $tag already exists on origin. This version appears to have been released already; refusing to overwrite it."
    return 1
  fi
  echo "Tag check passed: $tag does not exist locally or on origin."
}

# Ensures the new version is strictly greater than the highest version already
# published to npm across all public workspace packages, so a release can never
# re-publish an existing version or move the registry backwards.
guard_registry_not_ahead() {
  local new_version="$1"
  local pkg published_versions registry_max
  local all_versions=""

  while IFS= read -r pkg; do
    if ! published_versions=$(npm view "$pkg" versions --json 2>/dev/null); then
      # `npm view --json` reports failures as {"error": {"code": ...}} on stdout.
      if [ "$(jq -r '.error.code // empty' <<<"$published_versions" 2>/dev/null)" == "E404" ]; then
        echo "Registry check: $pkg has never been published; skipping it."
        continue
      fi
      echo "Error: failed to query the npm registry for $pkg. Refusing to release without confirming published versions."
      return 1
    fi
    all_versions+="$(jq -r 'if type == "array" then .[] else . end' <<<"$published_versions")"$'\n'
  done < <(list_public_packages)

  if [ -z "${all_versions//[[:space:]]/}" ]; then
    echo "Registry check: no public package has ever been published; skipping registry comparison."
    return 0
  fi

  registry_max=$(printf '%s' "$all_versions" | node "$SCRIPT_DIR/semver.cjs" max)
  if ! semver_gt "$new_version" "$registry_max"; then
    echo "Error: new version $new_version is not strictly greater than the highest version already published to npm ($registry_max). Refusing to release a version that is already taken or would move the registry backwards."
    return 1
  fi
  echo "Registry check passed: $new_version > $registry_max (highest version on npm)."
}

main() {
  # Check if release_type argument is provided
  if [ -z "$1" ]; then
    echo "Error: release_type argument is required."
    exit 1
  fi

  local release_type="$1"
  local tag_prefix="${2:-v}"

  local OLD_VERSION NEW_VERSION VERSION_ARGS

  OLD_VERSION=$(jq -r '.version' lerna.json)

  # If a stable prerelease identifier is given, graduate the version to stable
  if [ "$release_type" == "stable" ]; then
    VERSION_ARGS="--conventional-graduate"
  # Add the prerelease identifier and signal lerna to bump pre-release version instead of the main version
  # For example, if release_type is "experimental" and cur version is 0.0.1-experimental.0, bump to 0.0.1-experimental.1 instead of 0.0.1
  else
    VERSION_ARGS="--preid $release_type --conventional-prerelease"
  fi

  # Run lerna version with the specified arguments
  # Do not commit or tag as we need to re-format the package files before committing
  # shellcheck disable=SC2086 # VERSION_ARGS is intentionally word-split into multiple flags
  bun run lerna version --conventional-commits $VERSION_ARGS --no-git-tag-version --no-push --yes

  NEW_VERSION=$(jq -r '.version' lerna.json)

  if [ "$OLD_VERSION" == "$NEW_VERSION" ]; then
    echo "No version changes detected. Exiting."
    exit 1
  fi

  # Release guards: abort before anything is committed, tagged, or published.
  guard_no_unexpected_major_bump "$release_type" "$OLD_VERSION" "$NEW_VERSION" || exit 1
  guard_version_is_newer "$NEW_VERSION" "$OLD_VERSION" || exit 1
  guard_tag_available "${tag_prefix}${NEW_VERSION}" || exit 1
  guard_registry_not_ahead "$NEW_VERSION" || exit 1

  echo "VERSION=$NEW_VERSION" >> "$GITHUB_OUTPUT"
}

# Only run when executed directly; sourcing the file (e.g. in tests) exposes
# the guard functions without triggering a release.
if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
