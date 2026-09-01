# Labels

One rule decides how a label is named and who owns it:

> **A bare lowercase label is derived from the PR title. A `Namespace: value` label is a human judgement.**

Everything below follows from that. The type of a change is already stated in the
title — `pr-lint.yml` validates it against a closed vocabulary — so restating it as a
label by hand is a step that can only be forgotten, and was: **a third of merged PRs
carried no type label at all**. The `pr-lint` workflow now derives it instead.

## Derived from the title

Applied and removed automatically by `.github/workflows/pr-lint.yml`. Never add these
by hand on a PR; fix the title instead. All share one colour (`#b3c5d7`) because they
are an index for filtering, not a signal that needs attention.

| Label | Comes from |
| --- | --- |
| `feat` | `feat(scope): …` |
| `fix` | `fix(scope): …` |
| `docs` | `docs(scope): …` |
| `refactor` | `refactor(scope): …` |
| `chore` | `chore(scope): …` |
| `test` | `test(scope): …` |
| `ci` | `ci(scope): …` |
| `revert` | `revert(scope): …` |
| `breaking` | the `!` marker, e.g. `feat(router)!: …` — sits alongside the type |

This list is the same one pinned as the `types:` input of
`amannn/action-semantic-pull-request`. **The two must be kept in step**: a type the
lint accepts but the label set does not know is exactly the gap this replaces.

Issues have no conventional-commit title, so on an **issue** the same vocabulary is
applied by hand as a triage act. `.github/.jira_sync_config.yaml` maps `feat` to a Jira
Story.

## Human judgements

| Label | Colour | Meaning |
| --- | --- | --- |
| `Chromatic: skip` | `#bfdadc` | CI directive: this PR cannot change rendered UI, so `chromatic._template.yml` skips the build. Renamed from `no visual change`. |
| `Review: code needed` … | `#cdcdcd` | A named discipline still owes this PR a look: `code`, `QA`, `design`, `a11y`, `UX`, `Chromatic`. |
| `Review: code +1` … | `#0e8a16` | That discipline has signed off. Same six disciplines. |
| `Status: blocked` | `#b60205` | Waiting on something outside this PR. |
| `Status: do not merge` | `#b60205` | Deliberately not for merging yet. |
| `Status: question` | `#cdcdcd` | Needs more information before it can move. |
| `Priority: low` / `medium` / `high` | sand → amber → orange | Triage order. |
| `Topic: design tokens` | `#8250df` | Part of a migration train that spans many PRs. Add a sibling `Topic:` label per train rather than a bespoke label each time. |
| `good first issue` | `#7057ff` | **Deliberate exception to the naming rule** — GitHub treats this exact name specially for repository discovery, so it is not namespaced. |

Values are lowercase, except acronyms and proper nouns (`QA`, `UX`, `a11y`,
`Chromatic`).

## Colour means something

| Colour | Meaning |
| --- | --- |
| slate `#b3c5d7` | derived from the title — informational |
| grey `#cdcdcd` | waiting on a human |
| green `#0e8a16` | approved |
| red `#b60205` | stop: breaking, blocked, do not merge |
| amber ramp | priority |
| purple `#8250df` | migration train |
| pale teal `#bfdadc` | CI directive |

## What was removed, and why

| Removed | Replaced by | Evidence |
| --- | --- | --- |
| `Feature 🎁` `Bug 🐛` `Documentation 📝` | `feat` `fix` `docs` | Renamed to match the vocabulary already enforced on titles. |
| `Maintenance 🔨` | `chore` `refactor` `test` `ci` | One bucket held four types (23% of all merged work). `refactor` in particular had no home: of 32 merged refactors, 10 were unlabelled and 7 carried only `Breaking Change 💣`. |
| `Breaking Change 💣` | `breaking` | Was used *instead of* a type rather than alongside it, so a breaking PR lost its type. It is a modifier, exactly like `!`. |
| `Review: * -1` (all six) | GitHub's "Request changes" | Zero uses across ~800 PRs and issues. |
| `Review: Code +1 (with changes)` | — | Zero uses; the only label of its shape on one axis. |
| `Don't merge` | `Status: do not merge` | Zero uses; a duplicate of `do not merge` with a different colour. |
| `Dependencies` | `chore` | Zero uses; Renovate titles its PRs `chore(deps): …`. |
| `enhancement` | `feat` | A GitHub default that duplicated `Feature 🎁`. |
| `question` | `Status: question` | Namespaced. |

Renaming a label preserves it on every PR and issue that already carries it, so
history stays intact.
