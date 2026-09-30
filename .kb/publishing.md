# Preface

How a new package in this repository becomes releasable: a manual first publish and a trusted-publisher setup, both done by a human. Read this before adding a new package.

Read the top-level `.kb/agents.md` file before continuing below.

# Overview

The release workflow (`tag.yml`) publishes every package through npm OIDC trusted publishing, so no long-lived npm token exists. A trusted publisher can only be configured on a package's npm settings page, and that page exists only after the package's first publish. The full procedure is in [How to publish a package](../docs/how-to-guides/PUBLISH_A_PACKAGE.md#publishing-a-new-package).

# Important

- **Merging a new package does not make it releasable.** Its first publish is manual: `npm publish --access public` from inside the package directory, which needs npm two-factor authentication. Verify it with `bun run publish:status` from the repository root.
- **After the first publish, a human configures the package's trusted publisher on npmjs.com** (repository `canonical/pragma-web`, workflow `tag.yml`) and sets its publishing access to disallow tokens. Agents cannot do this step. Until it is done, the release workflow cannot publish future versions of the package.
