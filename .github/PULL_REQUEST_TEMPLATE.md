## Done

[List of work items including drive-bys]

Fixes [list issues/bugs if needed]

## QA

- [Add QA steps]

### PR readiness check

- [ ] PR should have one of the following labels:
  - `Feature 🎁`, `Breaking Change 💣`, `Bug 🐛`, `Documentation 📝`, `Maintenance 🔨`.
- [ ] PR title follows the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) format. 
- [ ] The code follows the appropriate [code standards](https://github.com/canonical/code-standards)
- [ ] All packages define the required scripts in `package.json`:
  - [ ] All packages: `check`, `check:fix`, and `test`.
  - [ ] Packages with build steps: `build` to build the package for development or distribution, `build:all` to build **all** artifacts. See [CONTRIBUTING.md](../old/CONTRIBUTING.md#24-full-artifact-builds-buildall) for details.
- [ ] If this PR introduces a **new package**: first-time publish has been done manually from inside the package directory using `npm publish --access public` (first-time publishing is not automated). Run `bun run publish:status` from the repo root to verify.
- [ ] If this PR does not require visual testing, add the `no visual change` label to skip Chromatic.

## Screenshots

[if relevant, include a screenshot or screen capture]
