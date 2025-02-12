#!/bin/bash
# Lerna will not automatically create a major version update for a package that has not yet reached 1.0.0.
# We must manually create and publish version 1.0.0 for each package before future breaking changes will trigger major version updates.
# Per Semver, versions prior to 1.0.0 are considered unstable (each change is considered breaking).
# Lerna handles breaking change releases prior to 1.0.0 differently than it handles breaking changes after 1.0.0.
# Before 1.0.0, breaking changes will never cause a major version bump to 1.0.0.
# This is to give maintainers more control over when their packages are considered stable.
# This script automates the process of creating and publishing version 1.0.0 for each package in a monorepo.
# It only needs to be run once; just before the first stable release of a project.
# https://github.com/lerna/lerna/issues/2761
# https://semver.org/spec/v2.0.0.html

function cleanInstall() {
  # Clean dependencies and build artifacts
  bun run special:clean && rm -rf ./**/dist packages/generator-ds/generators

  # Clean-install and build/test
  bun install
  bun run check
  bun run test
}

function gitUpdate() {
  git add .
  git commit -m "chore(release): publish v1"
  git tag v1.0.0 -m v1.0.0
  git push && git push --tags
}

function applyVersioning() {
  # Set each package version to 1.0.0, and generate changelogs.
  bun run lerna version 1.0.0 --conventional-commits --no-push --no-git-tag-version --force-publish --yes
  # Apply formatting fixes to `package.json` files.
  bun run check:fix
}

cleanInstall
applyVersioning
gitUpdate
cleanInstall
bun run lerna publish --no-private from-package