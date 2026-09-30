/**
 * Locating and reading the shipped contract SDL.
 *
 * NODE / BUN ONLY. This module reads from the filesystem through `node:fs` and
 * resolves paths from `import.meta.url` — and `satisfiesContract` imports it
 * statically and calls it live whenever the `contractSdl` option is omitted,
 * so the whole package is Node/Bun only. There is no browser entry point: the
 * check belongs in provider gates and CI steps, which run server-side.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUILD_LAYOUT_PREFIX,
  SCHEMA_RELATIVE_PATH,
  SOURCE_LAYOUT_PREFIX,
} from "./constants.js";

/**
 * Resolve the contract schema file for whichever layout `here` — the directory
 * this module was loaded from — belongs to.
 *
 * Exported for tests, which probe the build and fallback layouts this module
 * cannot occupy at test time. Deliberately absent from the package barrel: a
 * consumer has the `./schema/contract.graphql` subpath export for the file and
 * {@link readContractSdl} for its contents, and neither pins this package's
 * on-disk shape into its public API.
 *
 * @note Impure: probes the filesystem with `existsSync`. The two layouts are
 * the source tree and the published build, and which one is live is not
 * knowable from the module's own text.
 */
export const resolveContractSchemaPath = (here: string): string => {
  const sourceCandidate = resolve(
    here,
    SOURCE_LAYOUT_PREFIX,
    SCHEMA_RELATIVE_PATH,
  );
  if (existsSync(sourceCandidate)) {
    return sourceCandidate;
  }
  const buildCandidate = resolve(
    here,
    BUILD_LAYOUT_PREFIX,
    SCHEMA_RELATIVE_PATH,
  );
  if (existsSync(buildCandidate)) {
    return buildCandidate;
  }
  // Neither exists. Returning either candidate would send the reader to a
  // directory chosen by which branch of a probe ran last, so name both and say
  // what their absence means: a published package missing its schema/.
  throw new Error(
    `@canonical/prism-contract: the contract SDL is missing. Looked for ${sourceCandidate} and ${buildCandidate}. An installed copy that reaches here is missing its schema/ directory.`,
  );
};

/**
 * Absolute path to the shipped contract SDL file. Module-internal, like
 * {@link resolveContractSchemaPath}: deliberately absent from the package
 * barrel so the package's on-disk shape stays out of its public API.
 *
 * @note Impure: resolved once at module load, which costs one or two
 * `existsSync` calls per process. Module-scope so the probe runs once rather
 * than per read.
 */
export const CONTRACT_SCHEMA_PATH: string = resolveContractSchemaPath(
  dirname(fileURLToPath(import.meta.url)),
);

/**
 * Read the shipped contract SDL as a string.
 *
 * The SDL is the artifact, not a GraphQLSchema: handing callers text keeps
 * every consumer free to build it with THEIR graphql instance. Two graphql
 * versions coexist in this repo (the app's v16, ke-graphql's pinned v17 RC)
 * and objects must never cross that boundary.
 *
 * @note Impure: reads the filesystem on every call.
 */
export const readContractSdl = (): string =>
  readFileSync(CONTRACT_SCHEMA_PATH, "utf8");
