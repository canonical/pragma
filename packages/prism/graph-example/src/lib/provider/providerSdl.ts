/**
 * The provider's SDL = the authored contract, verbatim, plus this package's
 * extension types.
 *
 * The contract half is READ AT RUNTIME from @canonical/prism-contract. It is
 * never vendored, never copied, never pinned to a snapshot: the whole reason
 * this package is worth having is that it starts FROM the authored SDL, so it
 * cannot drift from it. If the contract changes, this provider's contract test
 * turns red on the next run — which is the mechanism working, not a break.
 *
 * NODE / BUN ONLY, for the same reason the contract package is: the extension
 * file is read through node:fs off import.meta.url.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readContractSdl } from "@canonical/prism-contract";

/** The schema directory sits at the package root, beside src/ and dist/. */
const SCHEMA_RELATIVE_PATH = "schema/extension.graphql";

/** From src/lib/provider/ (vitest) the package root is three levels up. */
const SOURCE_LAYOUT_PREFIX = "../../..";

/** From dist/esm/lib/provider/ (the tsc build) it is four levels up. */
const BUILD_LAYOUT_PREFIX = "../../../..";

/**
 * Resolve the extension SDL for whichever layout `here` — the directory this
 * module was loaded from — belongs to. Falls back to the source layout so a
 * missing file names a real, expected path. Exported for tests, which probe
 * the layouts this module cannot occupy at test time.
 *
 * @note Impure: probes the filesystem with `existsSync`. Which of the two
 * layouts (source tree or published build) is live is not knowable from this
 * module's own text.
 */
export const resolveExtensionSchemaPath = (here: string): string => {
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

/** Absolute path to this package's extension SDL file. */
export const EXTENSION_SCHEMA_PATH: string = resolveExtensionSchemaPath(
  dirname(fileURLToPath(import.meta.url)),
);

/** Read this package's extension SDL as a string. *
 * @note Impure: reads the filesystem on every call.
 */
export const readExtensionSdl = (): string =>
  readFileSync(EXTENSION_SCHEMA_PATH, "utf8");

/**
 * The full SDL this provider serves: the contract first, the extension after.
 * Handing callers text rather than a GraphQLSchema keeps every consumer free
 * to build it with THEIR graphql instance — two majors coexist in this repo.
 *
 * @note Impure: reads both this package's extension SDL and the contract's
 * own SDL from the filesystem, on every call.
 */
export const readProviderSdl = (): string =>
  [readContractSdl(), readExtensionSdl()].join("\n");
