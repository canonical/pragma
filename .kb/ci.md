# Preface

The rules for CI workflows in this repository: they are global, and they never code against a remote service. Read this before adding or changing anything under `.github/`, or before adding a check for a package.

This file is identical in canonical/pragma-core and canonical/pragma-web; change both in paired pull requests.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

The CI domain is global, always, without exception. If one package-scoped concern can earn a workflow step, every package can, and with dozens of packages that becomes unbearable: the cost of one job is not one job, it is the precedent.

# Important

- **Shared workflows (`pr.yml` and the others) are global infrastructure.** Do not add a job or step for a single package's concern. This is not a style preference: a new required check applies to every pull request in the repository, including other teams' and outside contributors'.
- **A package-scoped check rides the package's own `check` and `test` targets.** Root `check` is `lerna run check`, which fans out to every package, and the build matrix already runs it, so a package target is covered everywhere and runs only when Nx says the package is affected. That is cheaper and more correctly scoped than a dedicated job.
- **The bar for a shared job is a genuine repository-wide invariant**, not merely something that happens to run from the root. `scripts/check-workspace-ranges.ts` earns its shared step because it asserts something true of every workspace sibling. One package's data provenance does not, however important that package is.
- **If you believe you need a workflow change, say why in the pull request body** and expect it to be challenged.
- **CI never codes against a remote service.** A workflow does not poll, wait for, retry against or reconcile with a remote service such as the npm registry. The tool's own exit code is the verdict, and the recovery from a failed run is re-running it. Prevent a problem where it is authored rather than adding steps that detect and repair it afterwards.
