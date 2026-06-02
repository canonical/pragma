# Versioning and Conventional Commits

Pragma uses Conventional Commits to generate changelogs and determine version bumps automatically. All packages share a single version number managed by Lerna, currently 0.11.0. This guide explains how to write commit messages that communicate intent clearly and trigger the correct version changes.

## Commit Message Format

Every commit message follows the Conventional Commits specification. The format consists of a type, an optional scope, and a description, followed by an optional body and footer.

```
type(scope): description

[optional body]

[optional footer]
```

The first line should be concise, ideally under 72 characters. The body provides additional context when needed. The footer contains metadata like breaking change notices or issue references.

Examples from the Pragma repository:

```
feat(monorepo): Webarchitect consumption (#378)
fix(assets): Update SVG icons to use currentColor for fill attribute (#375)
chore(deps): update dependencies (#382)
docs(cicd): update npm token docs per recent npm security changes (#373)
```

## Commit Types

The type determines whether a commit triggers a version bump and what kind of bump occurs.

**feat** introduces a new feature or capability. Commits with this type trigger a minor version bump (e.g., 0.11.0 → 0.12.0). Use this when adding new components, new API methods, or new configuration options.

**fix** corrects a bug or unintended behaviour. Commits with this type trigger a patch version bump (e.g., 0.11.0 → 0.11.1). Use this when fixing rendering issues, correcting type definitions, or resolving edge cases.

**chore** covers maintenance tasks that do not affect the public API. These commits do not trigger version bumps. Use this for dependency updates, build configuration changes, or internal refactoring that consumers never see.

**docs** applies to documentation changes. These commits do not trigger version bumps. Use this for README updates, inline comment improvements, or guide additions.

**refactor** describes code changes that neither fix bugs nor add features. These commits do not trigger version bumps. Use this when restructuring code for clarity without changing behaviour.

**test** covers changes to test files. These commits do not trigger version bumps. Use this when adding test cases, fixing flaky tests, or improving test infrastructure.

**ci** applies to continuous integration configuration. These commits do not trigger version bumps. Use this for workflow changes, action updates, or CI environment configuration.

## Scopes

The scope identifies which part of the codebase the commit affects. Scopes are optional but recommended for clarity. Use lowercase with hyphens for multi-word scopes.

Package-based scopes reference specific packages:
- `assets` for @canonical/ds-assets
- `utils` for @canonical/utils
- `ds-types` for @canonical/ds-types
- `webarchitect` for @canonical/webarchitect
- `ds-global` for @canonical/react-ds-global

Area-based scopes reference broader concerns:
- `monorepo` for changes affecting the overall repository structure
- `deps` for dependency updates
- `cicd` for CI/CD configuration

Component-based scopes reference specific components:
- `Button` for button component changes
- `Card` for card component changes

When a commit affects multiple packages or areas, either omit the scope or use a general scope like `monorepo`.

## Breaking Changes

Breaking changes alter the public API in ways that require consumers to update their code. These changes trigger a major version bump (e.g., 0.11.0 → 1.0.0).

To indicate a breaking change, add `BREAKING CHANGE:` in the commit footer followed by a description of what changed and how to migrate:

```
feat(ds-global): rename Button appearance prop to emphasis

BREAKING CHANGE: The `appearance` prop on Button has been renamed to `emphasis`.
Update your code: <Button appearance="primary"> becomes <Button emphasis="primary">
```

Alternatively, append `!` after the type to indicate a breaking change:

```
feat!(ds-global): rename Button appearance prop to emphasis
```

During the pre-1.0.0 phase, the release workflow protects against unexpected major version bumps. If a breaking change is detected during a pre-release, the workflow will fail. This protection will be removed after the 1.0.0 stable release.

## Version Strategy

Pragma uses Lerna's fixed versioning mode. All packages share a single version number stored in `lerna.json`. When any package changes, all packages receive the same new version number.

This approach eliminates compatibility matrices. If you use version 0.11.0 of @canonical/react-ds-global, you know that @canonical/ds-types version 0.11.0 is compatible because they were released together. Internal dependencies between packages use caret ranges (e.g., `^0.11.0`) to accept patch and minor updates automatically.

The alternative, independent versioning, allows each package to have its own version. While this can reduce version churn for unchanged packages, it creates complexity when packages depend on each other. Teams must track which versions of which packages work together. Pragma prioritises simplicity over minimising version numbers.

## Release Process

Releases happen through a manual GitHub Actions workflow. Only maintainers with repository write access can trigger releases, and releases only run from the main branch.

To create a release:

1. Navigate to Actions → "Update package versions" workflow
2. Click "Run workflow"
3. Select the release type from the dropdown
4. Click "Run workflow" to start

The workflow performs these steps:

1. Validates that it is running on the main branch
2. Runs the full check suite (Biome, TypeScript, webarchitect)
3. Runs all tests
4. Analyses commits since the last release to determine version bump
5. Updates version numbers in all package.json files and lerna.json
6. Generates or updates CHANGELOG.md files
7. Commits the version changes
8. Creates a git tag (e.g., v0.12.0)
9. Pushes the commit and tag to the repository
10. Publishes all public packages to npm

If any step fails, the workflow stops and no packages are published. The commit and tag only happen after checks pass.

## Pre-release Types

Pre-releases allow testing new versions before declaring them stable. Each pre-release type indicates a different level of readiness.

**experimental** represents early development work. The API may change significantly between experimental releases. Use experimental releases for internal testing of major new features. Version numbers look like `0.12.0-experimental.0`, `0.12.0-experimental.1`.

**alpha** indicates the feature is complete enough for broader testing but the API is not yet stable. Alpha releases may have known issues and rough edges. Version numbers look like `0.12.0-alpha.0`.

**beta** signals that the feature set is frozen and the focus is on stabilisation. The API should not change unless critical issues are discovered. Version numbers look like `0.12.0-beta.0`.

**rc** (release candidate) represents the final testing phase before stable release. An rc release should be identical to the planned stable release unless blockers are found. Version numbers look like `0.12.0-rc.0`.

**stable** is the production-ready release. Stable releases follow semantic versioning strictly: patch releases for bug fixes, minor releases for new features, major releases for breaking changes.

Consumers can install pre-releases explicitly by specifying the full version or using npm's tag syntax:

```bash
bun add @canonical/react-ds-global@0.12.0-beta.0
bun add @canonical/react-ds-global@experimental
```

Pre-release versions are not installed by default when using caret or tilde ranges. A dependency on `^0.11.0` will not automatically update to `0.12.0-experimental.0`.
