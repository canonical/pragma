# Publishing Packages

This guide explains how to publish packages in the Canonical Design System using Lerna. For detailed information about Lerna's versioning and publishing features, refer to the [Lerna documentation](https://lerna.js.org/docs/features/version-and-publish).

## Prerequisites

1. Ensure you have read-write access to the [@canonical](https://www.npmjs.com/org/canonical) NPM organization
2. Have a valid NPM token with appropriate permissions
3. Understand [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/)

## Publishing Process

### 1. Prepare Your Changes

1. Ensure all changes are committed with conventional commit messages
2. For breaking changes, include "BREAKING CHANGE:" in the commit body
3. Create a pull request with a conventional commit message as the title

### 2. Trigger the Release

1. Go to the [Tag workflow action](https://github.com/canonical/ds25/actions/workflows/tag.yml)
2. Click "Run workflow"
3. Select the release type:
   - `stable`: For stable releases (1.0.0 and above)
   - `rc`: For release candidates
   - `experimental`: For experimental features
   - `alpha`: For alpha releases
   - `beta`: For beta releases

### 3. Verify the Release

1. Check the GitHub Actions workflow run:
   - Version bumps are applied correctly
   - Changelogs are generated
   - Packages are published to NPM

2. Verify the published packages:
   - Check NPM for the new versions
   - Verify the changelog entries
   - Test the published packages in a clean environment

### 4. Post-Release Tasks

1. Notify relevant teams about the release
2. Monitor for any issues with the published packages

## Version Management

### Pre-1.0.0

Before version 1.0.0, all changes are considered potentially breaking. Version bumps follow these rules:

1. Breaking changes trigger a minor version bump
2. All packages are bumped to the same version
3. Dependencies are automatically bumped when their dependencies change

### Post-1.0.0

After version 1.0.0, versioning follows standard semantic versioning:

1. Breaking changes trigger a major version bump
2. New features trigger a minor version bump
3. Bug fixes trigger a patch version bump

## Troubleshooting

### Common Issues

1. **Linting Failures**: If the release fails due to formatting issues, run `bun run check:fix` and retry
2. **Version Conflicts**: Ensure all packages are at compatible versions
3. **Publishing Errors**: Verify NPM token permissions and expiration

### Getting Help

If you encounter issues:
1. Check the [Lerna documentation](https://lerna.js.org/docs/features/version-and-publish)
2. Review the [conventional commits specification](https://www.conventionalcommits.org/en/v1.0.0/)
3. Contact the team for assistance

## Best Practices

1. Always use conventional commit messages
2. Test changes before publishing
3. Keep dependencies up to date
4. Document breaking changes clearly
5. Verify published packages after release 