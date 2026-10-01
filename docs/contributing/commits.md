<!-- Copied from https://github.com/canonical/pragma-core/blob/main/docs/contributing/commits.md; change it there first. -->
# Commits, syncing and pushing

Read this when committing, when bringing `main` into a branch, before every push, and when CI fails on a pull request.

## Contents

- The subject
- The commits
- Sync with main
- Push
- Watch the CI run

## The subject

- **Follow the code standards for the commit message and its scope** (`cs:git.commit.message`, `cs:git.commit.scope`).
- **Use only the types `feat`, `fix`, `docs`, `refactor`, `chore`, `test`, `ci` and `revert`.** `pr-lint.yml` rejects any other type in a pull request title. Branch names, pull request titles and issue labels use the same list.
- **The scope is the package**: its folder or its npm name, without `@canonical/`, for example `feat(pragma-cli): …` or `fix(code-standards): …`. The pull request title becomes the squash commit, which becomes the changelog line.
- **`!` marks only a change that breaks consumers** (`feat(router)!: …`). A development-dependency bump changes nothing for consumers and is not breaking.
- **Before 1.0, ask a maintainer before marking a commit `!`.** The release's version script refuses a pre-release that moves the major version.

## The commits

- **Keep commits atomic**: one logical change per commit.
- **Write for the changelog reader.** Lerna generates `CHANGELOG.md` from the history, so a subject is read by people who never saw the branch. It cites no internal planning document, just as a pull request body does not ([pull-requests.md](pull-requests.md)).
- **Tidy the history before the first push.** Reword `WIP` and `fix typo` commits into conventional subjects and squash noise. After the first push, the next section says what may still change.

## Sync with main

Run `git fetch origin main`. When the branch is behind, bring `main` in:

- **A branch not yet pushed** is rebased onto `origin/main`. Tidy its history in the same pass.
- **A branch that someone else builds on** — shared with another person, or part of a stack of pull requests — takes normal commits only: no amend, no rebase, no force-push. Bring `main` in as a merge commit. A stack of pull requests is linked as a GitHub stack (`gh stack`) and merged bottom-up; a branch higher in the stack picks up the one below it through a normal merge.
- **A pushed branch that nobody else builds on**: ask a maintainer before rebasing it. When they agree, push it with `git push --force-with-lease`, which refuses when someone else pushed to the branch meanwhile. Open: whether such a branch may be rebased without asking awaits a maintainer's decision.
- **Resolve a `bun.lock` conflict by regenerating it** with the pinned Bun ([dependencies.md](dependencies.md)).

Then run the root gate again ([toolchain.md](toolchain.md#run-the-root-gate)).

## Push

- Push with `git push -u origin <branch>`.
- Never push speculative "maybe this fixes CI" commits: fix the cause, run the gate, then push.
- Never use plain `--force`.

## Watch the CI run

Green locally is necessary, not sufficient. When a job fails, read its log with `gh run view <id> --log-failed`, fix the cause at its source, and run the root gate again before the next push.

Then open or update the pull request ([pull-requests.md](pull-requests.md)).
