# Preface

How to open a pull request in this repository: the template, the semantic title, the labels, and a body that stands on its own. Read this before opening or editing a pull request.

This file is identical in canonical/pragma-core and canonical/pragma-web; change both in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Important

- **Every change lands through a pull request** from a feature branch based on an up-to-date `origin/main` (`.kb/branches-and-worktrees.md`).
- **Fill in `.github/PULL_REQUEST_TEMPLATE.md`**: Done, QA and the readiness checklist, ticked honestly.
- **The title is a semantic `type(scope): subject`, and CI enforces it.** `.github/workflows/pr-lint.yml` rejects a pull request whose title does not follow Conventional Commits with one of the allowed types (`.kb/commits.md`).
- **The type label is derived from the title by CI; never add it by hand.** Fix the title instead. A `!` in the title (`feat(router)!: …`) applies the `breaking` label. Every other label is a human judgement, described in [the labels reference](https://github.com/canonical/pragma-web/blob/main/docs/references/LABELS.md).
- **A pull request body stands on its own and cites no internal planning document**: no decision-record numbers, planning ledgers, private tracker keys, or paths into a repository the reader may not be able to open. Outside contributors and other teams review these pull requests, and sending them looking for a document they cannot read costs them time and tells them nothing. A citation is not a reason: state what the change does and why, in full, in the pull request itself. Commit subjects follow the same rule, because Lerna puts them in the changelog.
- **When merge order matters, name the pull request that must land first and say why in one line.** Name it by number within this repository, and by full reference in the other one, for example `canonical/pragma-core#123`.
- **If you believe a change needs a workflow change, say why in the body** and expect it to be challenged (`.kb/ci.md`).
