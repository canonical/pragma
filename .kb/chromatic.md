# Preface

How visual changes are reviewed in this repository with Chromatic, and when a pull request skips it. Read this before opening a pull request, and before adding a Storybook package.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

Chromatic captures a screenshot of every Storybook story and compares it with an approved baseline. Each Storybook package has its own `chromatic.*.yml` workflow, which runs only when that package's paths change and calls the shared reusable workflow `chromatic._template.yml`. The Chromatic workflows check appearance only; correctness stays with `pr.yml` on pull requests and `push.yml` on `main`. The workflows and their secrets are described in [`docs/CI.md`](../docs/CI.md).

# Important

- **A green root gate does not cover visual review.** Passing `bun run check` and `bun run test` locally predicts the `pr.yml` result, not Chromatic's; a visual change still needs its Chromatic build reviewed and accepted.
- **Add the `Chromatic: skip` label to a pull request that cannot change rendered UI**, such as a documentation, CI or toolchain change. `chromatic._template.yml` skips the build when the label is present, as it does on a draft pull request, which saves snapshot credits.
