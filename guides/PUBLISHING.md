## Publishing Packages

This repository is currently configured to publish packages to [NPMJS](https://npmjs.org).
[Lerna](https://lerna.js.org) is used to version and publish packages.

### GitHub Actions Workflow

This repository houses numerous packages, and controls multiple release artefacts.
The versioning workflow does the following:

- Analyses each package to see if it has been updated since its last publish.
- Increments each updated package by a semver level chosen according to
  the [conventional commits spec](https://www.conventionalcommits.org/en/v1.0.0/)
    - If a package has a dependency that is updated, it will also be incremented by the same semver level.
- Commits the version changes to the `main` branch
- Commits a new tag
- Publishes the affected packages

#### Running the workflow

Open the [Tag workflow action](https://github.com/canonical/ds25/actions/workflows/tag.yml).
Click the "Run workflow" button to open a workflow triggering window.

- Release type: The level of stability of this release. If a prerelease (anything that is not "stable") is chosen for
  update type, this is used as the prerelease identifier (e.g., 0.0.1-rc.1 for release type "rc").
    - Please note that all versions prior to 1.0.0 are considered breaking changes. There is no need to specify a
      breaking change release type for versions prior to 1.0.0.
    - To update to 1.0.0, see the [V1.0.0](#v100) section below.
        - If you choose a pre-release release type and there are breaking changes, the publish action will fail until the
          version is manually bumped to 1.0.0 to prevent creating v1+ prerelease versions.

#### Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) to determine the version bump for each
package.
`lerna version` [accepts a
`--conventional-commits` flag](https://github.com/lerna/lerna/tree/c3e601bee1bd6416e8b067ec8121abd996163d86/libs/commands/version#--conventional-commits)
that enables this behavior.

##### Change levels

When packages are versioned, the new version is determined by the
highest level of semantic change for that package since the last release.

Level of change is determined by examining commit messages since the last release.
These levels of change are standardized by the [Angular commit message guidelines](https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#-commit-message-guidelines).
The following table shows the level of change for each commit type:

| Commit Type                                                                                        | Level of Change |
|----------------------------------------------------------------------------------------------------|-----------------|
| fix                                                                                                | patch           |
| feat                                                                                               | minor           |
| BREAKING CHANGE (in commit body/description) (**This should not be used until we graduate to v1**) | major           |
| other (such as chore)                                                                              | none            |

We use
Lerna's [fixed versioning strategy](https://lerna.js.org/docs/features/version-and-publish#fixedlocked-mode-default),
so all packages that are updated will be bumped to the same version.
Note that **this does not mean that all packages will always have the same version**.
Packages that are versioned at the same time are always bumped to the same version,
but packages that are not updated will not be bumped.
There are two exceptions to this rule:

1. If any of a package's internal dependencies are bumped, the package will be bumped to the same version as the
   dependency.
2. If any package has a breaking change, all packages will be bumped to the next major version.

##### PR Titles / Commit Messages

In order to enforce semantic commits, we apply
a [PR title check](https://github.com/amannn/action-semantic-pull-request)
that ensures PR titles follow the conventional commits spec.
This way, when a PR is squash-merged, the commit message will be formatted correctly.

It is the responsibility of the upstream maintainer to ensure that PR titles are formatted correctly at merge time,
and to add "BREAKING CHANGE:" to the squash-merge commit body if necessary.

##### Changelogs

Lerna generates `CHANGELOG.MD` files for each package that is updated, and the repository root.
Each version includes a list of commits that are included in the release.

Here is an example of a changelog entry:

```markdown
## <small>0.3.1-experimental.0 (2024-12-04)</small>

* Add baseline grid toggle to Storybook ([cbbcecc](https://github.com/canonical/ds25/commit/cbbcecc))
* Add negative button, move variants to global intents ([78fe56c](https://github.com/canonical/ds25/commit/78fe56c))
* Added basic heading styles ([f5848d2](https://github.com/canonical/ds25/commit/f5848d2))
* Update intent definitions to include neutral and improve style inheritance and
  overriding ([cb56369](https://github.com/canonical/ds25/commit/cb56369))
```

##### V1.0.0

Lerna follows the [SemVer spec](https://semver.org/spec/v2.0.0.html) for versioning.
This means that the first stable release of a package should be `1.0.0`.
All updates before 1.0.0 are considered potentially breaking.

Before the release of 1.0.0, breaking changes result in a patch or minor level update to all packages.
The choice of patch or minor depends on the lowest level of change required to bump all packages to the same version at
the same time.

For example, consider this scenario where three packages A,B, and C are versioned, and package C has a breaking change:

| Package | Version              | Change   | New Version          |
|---------|----------------------|----------|----------------------|
| A       | 0.1.0-experimental.0 | None     | 0.2.0-experimental.0 |
| B       | 0.1.0-experimental.1 | None     | 0.2.0-experimental.0 |
| C       | 0.1.0-experimental.0 | Breaking | 0.2.0-experimental.0 |

All packages will be bumped to the same version.
Package B has already been updated to `0.1.0-experimental.1` due to a prepatch release that only affected it.
Thus, a prepatch level change cannot be applied to all packages, as `experimental-1` is already published for package B.
In this case, a preminor level change will be applied to all packages.

Packages will be bumped with a prepatch level change if a breaking change is released while all packages are at the same
version.
For example:

| Package | Version              | Change   | New Version          |
|---------|----------------------|----------|----------------------|
| A       | 0.1.0-experimental.0 | any      | 0.1.0-experimental.1 |
| B       | 0.1.0-experimental.0 | any      | 0.1.0-experimental.1 |
| C       | 0.1.0-experimental.0 | Breaking | 0.1.0-experimental.1 |

BREAKING CHANGE commits will not cause a MAJOR bump until version 1.0.0 is released, marking the first stable release.
For more information on this protection against releasing 1.0.0 before stability is reached, see
this [Lerna issue](https://github.com/lerna/lerna/issues/2761).

To update to 1.0.0, run [`./scripts/one-time-only/create-v1.sh`](../scripts/one-time-only/create-v1.sh) and follow the prompts.

After 1.0.0 is released, breaking changes will cause major bumps to be automatically applied to all packages. 
For example:

| Package | Version | Change   | New Version |
|---------|---------|----------|-------------|
| A       | 1.0.0   | any      | 2.0.0       |
| B       | 1.2.3   | Breaking | 2.0.0       |
| C       | 1.0.0   | any      | 2.0.0       |
| D       | 1.1.0   | any      | 2.0.0       |

#### NPM Token

The `NODE_AUTH_TOKEN` GitHub secret is used to publish to NPM.

To generate a new publishing token:

1. Make sure you have read-write access to the [@canonical](https://www.npmjs.com/org/canonical) NPM organisation.
2. Go to
   the [Granular access tokens page](https://www.npmjs.com/settings/<NPM_USERNAME>/tokens/granular-access-tokens/new).
   Replace `<NPM_USERNAME>` in this URL with your NPM username.
3. Set the expiration to 1 year.
4. Set the package scopes to "Read and write" for the `@canonical` organisation.

The tokens last for 1 year. The current token will expire on 3 November 2025.

#### Formatting

`lerna version` currently applies some JSON formatting to `package.json`.
Without intervention, this casues Biome's linting to fail due to formatting errors.

To resolve this, we execute `bun run check:fix` after writing package updates
and before committing the new tag to avoid pushing a tag that will fail linting.

This has been filed as a bug with Lerna [here](https://github.com/lerna/lerna/issues/4117).
The issue includes an example for issue reproduction.
