# How to publish a package

This guide shows you how to publish a package from this repository to NPM.

## Prerequisites
- You have permission to push to the repository.
- You have publish access for the [@canonical](https://www.npmjs.com/org/canonical) NPM organization.
- Your changes have been merged to the `main` branch.
- You are familiar with [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
- A valid NPM publishing token has been added to the repo secrets as `NODE_AUTH_TOKEN`. The current token will expire on 22 Feb 2026. To generate/update the token:
  1. Go to the [Granular access tokens page](https://www.npmjs.com/settings/<NPM_USERNAME>/tokens/granular-access-tokens/new) (replace `<NPM_USERNAME>` with your NPM username).
  2. Set the expiration to 90 days.
  3. Set the package scopes to "Read and write" for the `@canonical` organisation.
  4. Set the token as the `NODE_AUTH_TOKEN` GitHub secret for this repository. 
  5. Select "Bypass two-factor authentication (2FA)".

## Publishing a new package
Follow these steps if your package has never been published to NPM before (for example, it was just merged to `main`).

1. **Log in to NPM**
   - Run `npm login` and enter your credentials for the [@canonical](https://www.npmjs.com/org/canonical) organization.

2. **Check out the main branch**
   - Run `git checkout main` to ensure you are on the main branch.
   - Run `git pull` to get the latest changes.

3. **Install and build all packages**
   - At the repository root, run `bun i` to install dependencies and build all packages.

4. **Navigate to the new package**
   - Change directory to your new package, e.g. `cd packages/react/ds-app-<your-package>`.

5. **Publish the package**
   - Run `npm publish --access public`. Note that the `--access public` flag is only required on first publish, subsequent invocations can omit it.
   - Confirm the package is now available on [NPM](https://npmjs.org).

After the first manual publish, you can use the automated workflow for future releases.

## Automated Publishing

1. **Open the Tag workflow**
   - Go to the [Tag workflow action](https://github.com/canonical/ds25/actions/workflows/tag.yml).
   - Click "Run workflow".

2. **Select release type**
   - Choose the appropriate release type (e.g., stable, rc, etc.).
     - Please do not choose `stable` until all maintainers agree that the repo as a whole is ready for 1.0.0. See [foo](../../old/PUBLISHING.md#v100) for more information on 1.0.0.
   - For pre-releases, specify the identifier (e.g., `experimental` for `0.0.1-experimental.1`).

3. **Trigger the workflow**
   - Confirm and run the workflow.
   - The workflow will:
     - Analyze which packages have changed.
     - Bump versions according to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
     - Commit version changes and tags.
     - Publish updated packages to NPM.

4. **Check the result**
   - Verify that your package appears on [NPM](https://npmjs.org).
   - Check the repository for updated changelogs.
