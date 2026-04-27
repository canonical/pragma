# Code ownership

This document describes how code ownership works in this monorepo: who owns
what, how to claim or share ownership, and how ownership-related changes are
reviewed.


## How ownership works

Ownership is tracked in `.github/CODEOWNERS`. That file drives GitHub's
automatic review requests and, together with branch protection rulesets,
gates merges on the right teams signing off.

Code ownership is expressed by line per path in `.github/CODEOWNERS`:

```
/packages/svelte/ds-app-launchpad/   @canonical/launchpad-ui
/packages/svelte/ssr-test/           @canonical/launchpad-ui  @canonical/workplace-engineering-ui
```

- A single team on a line means that team is the required reviewer for the
  path.
- Multiple teams on a line means the path is **shared**
- A path with no line is **unowned**

Teams should **do their best** to perform a PR review in a timely manner

## Unowned folders

An unowned folder has no required team reviewer. Normal review applies:
anyone with write access can approve and merge under the standard branch
protection rules.

This is intentional. Teams claim ownership when they feel that they must
know about any file change in that folder. This comes with a responsibility
of honoring Github notifications and **providing quick reviews**.

Leaving a folder unowned is an honest signal that no team
has taken that responsibility yet.

If you find yourself repeatedly shepherding changes through an unowned area,
that is the cue to claim it.

## Claiming an unclaimed folder

Default path, use this whenever the folder has no current owner:

1. Open a PR that adds a line to `.github/CODEOWNERS` mapping the folder to
   your team.
2. `@advl` (or `@canonical/design-system` if created) is auto-requested via
   the CODEOWNERS ruleses.
3. Discuss, get approval, merge.

No discussion outside the of PR is required for unclaimed folders.

## Claiming an already-claimed folder

Needs a conversation before any PR is opened. Decide with the current owning
team whether this is a transfer or a move to **shared** ownership. The
discussion happens outside the PR (most likely mattermost or meeting). 
The PR is paperwork for the outcome.

### Transfer

Manually include previous team as a reviewer. Acceptance of the PR is a signal
that the change was facilitated before.

### Shared ownership

Both teams become required reviewers for the path.

1. Agree the share out of band.
2. Open a PR that appends the new team to the existing line in
   `.github/CODEOWNERS`.
3. **Create a branch protection ruleset via the GitHub UI** that requires
   review from both teams on that path. This step is not optional.

## Shared ownership

GitHub's CODEOWNERS treats multiple teams on one line as "any one of these
teams can satisfy the review requirement." That is not what shared ownership
means here. To force _both_ teams to review, a matching branch protection
ruleset must be configured through the GitHub UI, mirroring the one already
in place for the shared `configs/typescript-svelte/` path.

If the ruleset is missing, the CODEOWNERS entry is misleading: it looks
shared but only one team's approval is actually required. Treat the
CODEOWNERS line and the ruleset as a pair. Neither alone is sufficient.

## Making changes that involve multiple teams

Examples: patching a shared dependency, rolling out a lint rule, updating a
TypeScript config that lives under multiple owned paths.

The policy is deliberately simple: **open one broad PR that touches all
affected paths**. CODEOWNERS will auto-request every affected team, so no
one wokes up to a surprise in their codebase.
Each team reviews their own slice.

If a change is truly trivial (e.g. a lockfile bump with no behavioural
impact), the owning teams can approve quickly.

On other hand a non-trivial change that triggers discussions and slows
down the merge is **the best proof of why this process was introduced**.

## How it alligns with possible monorepo split

It is mostly orthogonal to the idea of the split.
The purphose of CODEOWNERS is to make our lives better while working in 
a monorepo setup. The need of it may or may not dissapear after the split.

CODEOWNERS boundaries may still be used: 
 - Unclaimed path/package should stay in a monorepo
 - Path/package owned cleanly by one team is a candidate for a split.
 - Each shared package requires close attention

It is also possible that having CODEOWNERS will reduce the need of splitting
a monorepo by adressing the issue of unexpected changes.

