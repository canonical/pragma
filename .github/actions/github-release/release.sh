#!/bin/bash
set -euo pipefail

# Creates the GitHub Release for a tag and attaches the release artifacts.
# Currently attaches the implementations Turtle dataset (a concatenation of the
# root data/ TTL files) for knowledge-graph ingestion.
#
# INPUTS:
# $1: version (required) - The released version number, without tag prefix.
# $2: tag_prefix (optional) - Prefix for the git tag. Default is "v".
#
# Requires: GH_TOKEN with contents:write, gh CLI, the tag to exist.

if [ -z "${1:-}" ]; then
  echo "Error: version argument is required."
  exit 1
fi

version="$1"
tag_prefix="${2:-v}"
tag="${tag_prefix}${version}"

artifact="pragma-implementations.${tag}.ttl"

# Concatenate the implementation graph into a single artifact, in sorted order
# so the output is deterministic.
: > "$artifact"
find data -name '*.ttl' | LC_ALL=C sort | while read -r ttl; do
  {
    echo "# --- ${ttl}"
    cat "$ttl"
    echo
  } >> "$artifact"
done

if [ ! -s "$artifact" ]; then
  echo "Error: no .ttl files found under data/; refusing to create an empty artifact."
  exit 1
fi

# Create the release for the tag, or upload to it if it already exists
# (idempotent for publish-job re-runs).
if gh release view "$tag" > /dev/null 2>&1; then
  echo "Release $tag already exists; uploading artifacts."
  gh release upload "$tag" "$artifact" --clobber
else
  gh release create "$tag" --verify-tag --generate-notes "$artifact"
fi
