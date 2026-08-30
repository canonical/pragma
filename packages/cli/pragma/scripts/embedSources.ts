/**
 * The embed's build-environment source decisions, shared between the bundler
 * (`scripts/bundle.ts`) and the release parity gate
 * (the sibling `check-pack-parity.ts`).
 *
 * Extracted rather than duplicated: the gate judges the committed embed
 * against `pragma.conf.ts`, and a pack the bundler deliberately resolves from
 * somewhere other than its declared source (an npm tarball, this repository
 * itself) must be judged against THAT decision, not the declaration alone.
 * Two copies of this table would let the bundler and the gate disagree about
 * which provenance is legitimate — the exact disagreement the gate exists to
 * make impossible.
 */

import type { PackDeclaration } from "../src/kernel/config/types.js";

/**
 * Build-environment source overrides: a declared pack whose source is not
 * reachable from the machine that compiles the embed.
 *
 * `@canonical/anatomy-dsl` is unreachable here; the published npm package ships
 * the SAME `definitions/ontology.ttl` + `definitions/shapes.ttl`. The override
 * resolves it from `node_modules` (pinned in devDependencies) and the manifest's
 * `sourceRef` records `npm:<version>` rather than `git:<sha>`, so the artifact
 * never claims a provenance it does not have. `pragma.conf.ts` keeps its git
 * source, which is the correct ref for real users — a published package carries
 * no `node_modules`. Delete the entry once the remote is reachable from the
 * build.
 */
export const SOURCE_OVERRIDES: Readonly<Record<string, PackDeclaration>> = {
  "@canonical/anatomy-dsl": { name: "@canonical/anatomy-dsl" }, // no `source` ⇒ npm
};

/**
 * The pack this repository IS.
 *
 * `@canonical/ds-implementations` is COLLECTED FROM this monorepo into the root
 * `data/` directory, and `pragma.conf.ts` declares it as a git ref on `#main` —
 * the correct source for a real user, and the wrong one for the bundler at
 * release time. The version job regenerates that data with the new version and
 * its `versionedLink`s and THEN bundles, all BEFORE `git-commit.sh` makes the
 * commit and tag, so a clone of `#main` would embed the PREVIOUS release's
 * implementation graph into the artifact tagged for this one. The self-pack
 * therefore reads the working tree, which is exactly the tree that becomes the
 * tag, and records `self:v<version>` as its provenance.
 */
export const SELF_PACK = "@canonical/ds-implementations";
