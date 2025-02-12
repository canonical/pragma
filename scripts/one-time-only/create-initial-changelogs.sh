#!/bin/bash
# This script generates retroactive changelogs for a monorepo with Lerna and Conventional Commits.
# It allows projects that are not currently using Conventional Commits to generate changelogs for their existing commit history.
# This script is intended to be run once, just before the first release after adopting Conventional Commits versioning.
# Follows https://github.com/lerna/lerna/tree/c3e601bee1bd6416e8b067ec8121abd996163d86/libs/commands/version#generating-initial-changelogs

# Clean dependencies and build artifacts
bun run special:clean && rm -rf ./**/dist packages/generator-ds/generators

# Clean-install and test before generating changelogs
# These instructions are specific to the DS-25 project and can be removed or modified as needed.
bun install --ignore-scripts
bun run check
bun run test

# Lerna does not actually use conventional-changelog-cli, so you need to install it temporarily
bun add -D conventional-changelog-cli --ignore-scripts

# Create root-level changelog
bun run conventional-changelog  `# Create root-level changelog` \
  --preset angular              `# Use Angular commit convention https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines Lerna uses it; we need these initial changelogs to be consistent with the automated ones that'll be generated in the future` \
  --release-count 0             `# Generate changelogs for the entire commit history` \
  --outfile ./CHANGELOG.md      `# Where to place the generated changelog` \
  --verbose                     `# Enables verbose logging output for debugging`

# Create package-level changelogs
bun run lerna exec `# Run command in each package` \
  --concurrency 1 `# Limit concurrency to 1 to avoid conflicts` \
  --stream `# Stream output from all packages as they are processed` \
  -- 'conventional-changelog `# Run conventional-changelog-cli for each package` \
    --preset angular `# Use the Angular commit message convention` \
    --release-count 0 `# Generate changelogs for the entire commit history` \
    --commit-path $PWD `# Path to package directory` \
    --pkg $PWD/package.json `# Path to package.json inside the package directory` \
    --outfile $PWD/CHANGELOG.md `# Path to the generated changelog for this package` \
    --verbose `# Enable verbose output`'


# Remove temporary dependency
bun remove conventional-changelog-cli --ignore-scripts
