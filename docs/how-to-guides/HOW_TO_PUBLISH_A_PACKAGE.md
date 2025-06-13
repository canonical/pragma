# Publishing Packages

This guide explains how to publish packages in the Canonical Design System using Lerna. For detailed information about Lerna's versioning and publishing features, refer to the [Lerna documentation](https://lerna.js.org/docs/features/version-and-publish).

## Prerequisites

1. Ensure you have read-write access to the [@canonical](https://www.npmjs.com/org/canonical) NPM organization
2. Have a valid NPM token with appropriate permissions set to the repo secret `NODE_AUTH_TOKEN`. The tokens last for 1 year. The current token will expire on 3 November 2025.
   1. To generate a new publishing token:
   2. Make sure you have read-write access to the [@canonical](https://www.npmjs.com/org/canonical) NPM organisation.
   3. Go to the [Granular access tokens page](https://www.npmjs.com/settings/<NPM_USERNAME>/tokens/granular-access-tokens/new). Replace `<NPM_USERNAME>` in this URL with your NPM username.
   4. Set the expiration to 1 year.
   5. Set the package scopes to "Read and write" for the `@canonical` organization.
   6. Copy the generated token and add it to the repository secrets as `NODE_AUTH_TOKEN`.
3. Understand [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/). Versions are not bumped manually; they are [determined by commit messages since the last tag](https://github.com/lerna/lerna/tree/9205c2b7ac86840e8c9bc8ac628ca711a3ae0bcc/libs/commands/version#--conventional-commits).
4. Have a valid [SSH deploy key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) set to the repo secret `DEPLOY_KEY`. The CD job uses this to push version bumps and new tags to the repo. The deploy key should have read/write access to the repository.


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