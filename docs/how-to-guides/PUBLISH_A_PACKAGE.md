# How to publish a package

This guide shows you how to publish a package from this repository to NPM.

## Prerequisites
- You have permission to push to the repository.
- You have publish access for the [@canonical](https://www.npmjs.com/org/canonical) NPM organization.
- Your changes have been merged to the `main` branch.
- You are familiar with [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

### Authentication: OIDC trusted publishing

The automated release workflow (`tag.yml`) publishes via [npm OIDC trusted publishing](https://docs.npmjs.com/trusted-publishers).
GitHub mints a short-lived npm token at publish time, so **no long-lived `NODE_AUTH_TOKEN` secret is required** for already-registered packages.

For OIDC to work, each package must have a trusted publisher configured once on npmjs.com:

> **The package must already exist on npm before you can do this.** The trusted-publisher settings live on the package's own settings page, which does not exist until the package has been published at least once. A brand-new package therefore needs a manual first publish (see [Publishing a new package](#publishing-a-new-package)) *before* OIDC can be configured — you cannot set it up in advance.

1. Go to the package page on npmjs.com → **Settings** → **Trusted Publisher**.
2. Select **GitHub Actions**.
3. Set organisation/repository to `canonical/pragma`.
4. Set the workflow file to `tag.yml`.
5. Leave the environment field blank (the publish job uses no GitHub environment).

The publish job in `tag.yml` grants `id-token: write` permission, which is what allows GitHub to mint the OIDC token.

#### Disallow tokens (recommended)

Once trusted publishing is configured, set the package's **Publishing access** to disallow long-lived tokens.
On the package page → **Settings** → **Publishing access**, select:

> **Require two-factor authentication and disallow tokens (recommended)**

This ensures the package can only be published via OIDC trusted publishing or an interactive 2FA login, eliminating long-lived token risk. Apply this to every `@canonical/*` package after its trusted publisher is set up.

#### Verifying provenance

To check which packages are actually publishing with provenance, run from the repository root:

```bash
bun run publish:status
```

The **Provenance** column reports the state of each package's latest published version:

- `provenance ✓` — the latest version carries an npm provenance attestation, so it was published through the OIDC workflow with a trusted publisher configured. Nothing to do.
- `none` — the latest published version has no attestation. This is expected for a package whose last release predates the OIDC workflow; it clears itself the next time the package publishes through `tag.yml`. If it persists after a release, the package is most likely **missing a trusted publisher** on npmjs.com — configure one as described above, then trigger a release.
- `—` — the package is private or has never been published, so provenance does not apply yet.

A package can also read `provenance ✓` on an old version while a newer local version has never shipped; check the **Status** column (`outdated`, `new`) alongside Provenance to see the full picture. Provenance on the latest version is the closest observable proxy for "a trusted publisher is configured" — npm exposes no direct way to query trusted-publisher configuration.

## Publishing a new package
Follow these steps if your package has never been published to NPM before (for example, it was just merged to `main`).

> **Note:** OIDC trusted publishing cannot be configured before a package's first publish, because the package settings page does not exist until the package is on npm. The first publish is therefore manual; configure the trusted publisher afterward so future releases are automated.
>
> **This is a manual human step — it cannot be automated or done by an AI agent.** It requires interactive npm authentication (2FA login) and access to the package's settings on npmjs.com. Beware when adding a new package: merging it to `main` does **not** make it releasable. Until a human runs the first publish and configures the trusted publisher, the automated `tag.yml` workflow will skip or fail to publish that package, and its version will silently lag the rest of the monorepo.

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

6. **Configure the trusted publisher and disallow tokens**
   - On the new package's npmjs.com page, add the trusted publisher and set publishing access to disallow tokens as described in [Authentication: OIDC trusted publishing](#authentication-oidc-trusted-publishing) above.
   - Without the trusted publisher, the automated workflow cannot publish future versions of the package.

7. **Verify**
   - Run `bun run publish:status` from the repository root. The new package should appear as `published`; its Provenance stays `none` until its first release *through* `tag.yml`, which is when the trusted publisher takes effect. See [Verifying provenance](#verifying-provenance).

After the first manual publish and trusted-publisher configuration, use the automated workflow for future releases.

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
