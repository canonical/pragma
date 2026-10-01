<!-- Copied from https://github.com/canonical/pragma-core/blob/main/.kb/commits.md; change it there first. -->
# Preface

How to write commits in this repository: the semantic subject, the size of a commit, and the changelog that is generated from them. Read this before committing.

The original of this file lives in canonical/pragma-core; canonical/pragma-web carries a copy that links to it. Change the original first, then the copy, in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Important

- **Commits are conventional (semantic) commits, in the form `type(scope): subject`**, for example `feat(pragma-cli): …`, `fix(react-ds-global): …`, `docs(design-tokens): …`, `chore(deps): …` or `refactor(styles): …`. The scope is the name of the workspace package the change touches, without `@canonical/`, or one of `deps`, `monorepo`, `constitution` and `ci`; several comma-separated scopes are allowed when each is valid.
- **The allowed types are `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci` and `revert`.** A breaking change is marked with `!` after the scope (`feat(pragma-cli)!: …`).
- **Keep commits atomic.** One logical change per commit, so that each diff is reviewable on its own and tells a single story. Bundling unrelated items into one commit or pull request is allowed but rare, and the pull request body calls it out in a "drive-by" line.
- **Write commit subjects for the changelog reader.** Lerna generates the release `CHANGELOG.md` from the commit history, so a subject is read by people who never saw the branch. The same stand-alone rule as for pull request bodies applies: a subject cites no internal planning document (`.kb/pull-requests.md`).
- **Tidy the history before the first push.** Reword `WIP` and `fix typo` commits into conventional subjects and squash noise, so each commit stays atomic and the changelog reads cleanly (`.kb/pre-push.md`).
