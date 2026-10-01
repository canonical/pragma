<!-- Copied from https://github.com/canonical/pragma-core/blob/main/docs/contributing/releases.md; change it there first. -->
# Releases

Read this before a release, before merging while one may be running, and before adding a new package. Both repositories release the same way: the `tag.yml` workflow ("Update package versions") bumps the versions, commits, tags and pushes to `main`, then publishes every changed package to npm.

## Contents

- Who starts a release
- While a release runs
- The verdict
- Recovering
- Version numbers
- New packages

## Who starts a release

- **Never start a release, push a tag or publish a package without a maintainer's explicit go.** An agent does not dispatch the release workflow on its own.
- **A release runs from `main`**, dispatched by hand with a release type: `experimental`, `alpha`, `beta`, `rc` or `stable`.

## While a release runs

- **Nothing merges into the repository while its release runs.** The version job pushes the bump commit to `main`; when `main` has moved meanwhile, that push is rejected as non-fast-forward and the release fails.
- **The version bump runs `bun install` twice, with the pinned Bun**, for the reason in [dependencies.md](dependencies.md#regenerate-the-lockfile). The publish job checks that `bun.lock` is settled at the tag. A bump made by hand installs twice the same way.

## The verdict

- **The verdict is the exit code of `lerna publish … from-package`.** No step polls, waits for, verifies against or reconciles with the npm registry ([ci.md](ci.md#no-coding-against-remote-services)).
- **npm lags a minute or two behind a publish.** A package missing from npm just after its publish is not a failure, and is no reason to add a step that waits for it.
- **A red release run is not cosmetic.** Every step, the GitHub Release included, is green before anything proceeds, such as pragma-web re-pinning a pragma-core release.

## Recovering

- **Recover a partial publish by re-running the publish job.** `from-package` publishes only the versions npm lacks, and a re-run after a full publish does nothing. Do not delete or move the tag, reset `main` or force-push.
- **A re-run checks out the tag.** A fix to the release scripts made after the tag does not reach that release, so when its GitHub Release step fails, that GitHub Release is created by hand.
- **A version that was tagged but never published is skipped.** The next release takes the next number, and the old tag is not rewritten.

## Version numbers

- **Before 1.0, a breaking change bumps the minor version**, and the version script refuses a major bump ([commits.md](commits.md#the-subject)).
- **A pre-release publishes to a dist-tag named after its identifier**, for example `experimental`, and never moves `latest`.
- **Lerna publishes only the packages that changed, so a pre-release series can mix numbers**: some packages at `0.43.0-experimental.1`, others at `0.43.0-experimental.0`. A consumer pins each package to its own published version, looked up package by package.
- **Never cut an experimental release as a canary before a planned stable number.** It takes that number's pre-release line.

## New packages

- **Merging a new package does not make it releasable.** A human publishes it the first time, by hand, from inside the package directory with `npm publish --access public`, which needs npm two-factor authentication. `bun run publish:status` from the repository root checks it.
- **Then a human sets the package's trusted publisher on npm**: this repository, the `tag.yml` workflow, publishing access that disallows tokens, and both immediate and staged publishing allowed. Agents cannot do this step. It can be done from the command line with a one-time code from npm's two-factor authentication: `npm trust github <package> --file tag.yml --repository <owner>/<repo> --allow-publish --allow-stage-publish --otp <code>`. One code can be reused until npm rejects it.
- **`.kb/publishing.md` holds this repository's values** for these steps.
- **Every manifest's `repository` field names the repository that runs the release**, or npm's provenance check refuses the publish ([dependencies.md](dependencies.md#edit-the-manifests)).
