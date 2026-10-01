<!-- Copied from https://github.com/canonical/pragma-core/blob/main/docs/contributing/pull-requests.md; change it there first. -->
# Pull requests

Read this when opening, updating, reviewing or landing a pull request. The branch is already push-ready ([commits.md](commits.md)).

## Contents

- Checklist
- Keep to one concern
- Write the title
- Fill the body
- Merge order across the two repositories
- Review threads
- Merge

## Checklist

```
- [ ] 1. Keep to one concern
- [ ] 2. Write the title
- [ ] 3. Fill the body from the template, so it stands on its own
- [ ] 4. Apply this repository's pull-request steps in .kb/this-repository.md
- [ ] 5. Answer and resolve every review thread
- [ ] 6. Merge
```

## Keep to one concern

A pull request carries one concern, with no scope creep. A review finding about behaviour that is already on `main` is not fixed in it: say in the body that it is known and left unchanged. An unrelated item bundled in is rare, and the body calls it out as a drive-by. The body names what was deliberately left out. A pull request that does more than one thing is asked to split.

## Write the title

- **The title is a conventional-commit `type(scope): subject`**, written like a commit subject ([commits.md](commits.md)), following the pull-request standard (`cs:git.pr.template`). `pr-lint.yml` rejects any other form and any type outside the allowed list.
- **CI derives the type label from the title.** Never add it by hand: fix the title instead. A `!` in the title applies the `breaking` label. Every other label is a human judgement, described in [the labels reference](https://github.com/canonical/pragma-web/blob/main/docs/references/LABELS.md).

## Fill the body

- **Fill in `.github/PULL_REQUEST_TEMPLATE.md`**: Done, QA and the readiness checklist, ticked honestly.
- **The body stands on its own.** It cites no internal planning document: no decision-record numbers, planning ledgers, private tracker keys, or paths into a repository the reader may not be able to open. Outside contributors and other teams review these pull requests. State what the change does and why, in full, in the body itself.
- **A new package** carries the first-publish steps ([releases.md](releases.md#new-packages)).

## Merge order across the two repositories

- **When merge order matters, name the pull request that must land first and say why in one line.** Name it by number in this repository, and in full in the other one, for example `canonical/pragma-core#123`.
- **The two halves of a change that spans both repositories name each other** this way, and the pragma-core one lands first. Open: whether the rule becomes "the half the other depends on lands first", as a breaking pragma-core change has needed, awaits a maintainer's decision.

## Review threads

Answer and resolve every review thread, including those from automated reviewers such as Copilot, before the pull request merges.

## Merge

- **The pull request is squash-merged.** In pragma-core the squash commit takes the pull request title, with a blank body. In pragma-web it takes the commit's subject when the pull request has one commit, and the pull request title otherwise, with the commit messages as its body.
- **For a large or breaking change, edit the squash message** so it reads for consumers.
- **Do not merge while a release of the repository runs** ([releases.md](releases.md)).
