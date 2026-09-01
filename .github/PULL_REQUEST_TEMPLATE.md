## Done

[List of work items including drive-bys]

Fixes [list issues/bugs if needed]

## QA

- [Add QA steps]

### PR readiness check

- [ ] PR title follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format, using one of the allowed types: `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci`, `revert`.
  - The matching type label is applied automatically from the title — there is no type label to add by hand.
  - Breaking changes are marked with `!` in the title (e.g. `feat(router)!: …`), which adds the `breaking` label.
- [ ] The code follows the appropriate [code standards](https://github.com/canonical/web-code-standards)
- [ ] All packages define the required scripts in `package.json`:
  - [ ] All packages: `check`, `check:fix`, and `test`.
  - [ ] Packages with build steps: `build` to build the package for development or distribution, `build:all` to build **all** artifacts. See [CONTRIBUTING.md](../old/CONTRIBUTING.md#24-full-artifact-builds-buildall) for details.
- [ ] If this PR introduces a **new package**: first-time publish has been done manually from inside the package directory using `npm publish --access public` (first-time publishing is not automated). Run `bun run publish:status` from the repo root to verify. Then configure an OIDC [trusted publisher](https://docs.npmjs.com/trusted-publishers) for the package on npmjs.com (repo `canonical/pragma`, workflow `tag.yml`) and set publishing access to disallow tokens, so the automated release workflow can publish future versions.
- [ ] If this PR does not require visual testing, add the `Chromatic: skip` label to skip Chromatic.

## Screenshots

[if relevant, include a screenshot or screen capture]
