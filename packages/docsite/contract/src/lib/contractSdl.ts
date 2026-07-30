// =============================================================================
// Locating and reading the shipped contract SDL.
//
// NODE / BUN ONLY. This module reads from the filesystem through node:fs and
// resolves paths from import.meta.url. It must never be pulled into a browser
// bundle — import satisfiesContract with an explicit `contractSdl` option (or
// inline the SDL at build time) if you need the check to run client-side.
// =============================================================================

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The schema directory sits at the package root, beside src/ and dist/. */
const SCHEMA_RELATIVE_PATH = "schema/contract.graphql";

/** From src/lib/ (vitest, ts-node) the package root is two levels up. */
const SOURCE_LAYOUT_PREFIX = "../..";

/** From dist/esm/lib/ (the published tsc build) it is three levels up. */
const BUILD_LAYOUT_PREFIX = "../../..";

/**
 * Resolve the contract schema file for whichever layout this module was
 * loaded from. Falls back to the source layout so a missing file produces an
 * error that names a real, expected path rather than an empty string.
 */
const resolveContractSchemaPath = (): string => {
  const here = dirname(fileURLToPath(import.meta.url));
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
  return sourceCandidate;
};

/** Absolute path to the shipped contract SDL file. */
export const CONTRACT_SCHEMA_PATH: string = resolveContractSchemaPath();

/**
 * Read the shipped contract SDL as a string.
 *
 * The SDL is the artifact, not a GraphQLSchema: handing callers text keeps
 * every consumer free to build it with THEIR graphql instance. Two graphql
 * versions coexist in this repo (the app's v16, ke-graphql's pinned v17 RC)
 * and objects must never cross that boundary.
 */
export const readContractSdl = (): string =>
  readFileSync(CONTRACT_SCHEMA_PATH, "utf8");
