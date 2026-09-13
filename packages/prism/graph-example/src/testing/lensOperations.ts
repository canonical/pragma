/**
 * Harvesting the docsite's lens operations, at RUN time.
 *
 * The operation texts are NEVER snapshotted into this package. They are read
 * out of the app's committed Relay artifacts on every run, so this gate always
 * measures the operations as they are now — not as they were when someone last
 * remembered to update a fixture.
 *
 * Within its scan root the operation SET is derived from the tree, never from
 * a hand-maintained allowlist. Narrowing that set to the operations that
 * happen to pass is exactly the "shape it until it goes green" failure mode
 * this gate exists to prevent.
 *
 * 🔴 WHAT THE SCAN ROOT IS, AND WHAT IT IS NOT. The root is
 * `src/domains/lenses`, and that is FOUR of the docsite's ten shipped query
 * operations. The other six do not execute against this provider, and it
 * would be dishonest to let the scan root imply otherwise, so they are named
 * here with the reason:
 *
 *   src/domains/components   CatalogListPaginationQuery, ComponentsCatalogQuery,
 *                            ComponentEntityQuery
 *   src/domains/marketing    LobbyQuery  (the home page)
 *   src/domains/playground   ComponentProbeQuery
 *   src/addons/journeys      JourneysExplorerQuery
 *
 * The first five select `Component` or `Query.component` and the last selects
 * `jobs` — pragma-ontology terms this provider's dataset has no class for, so
 * they fail with "Unknown type" or "Cannot query field". The honest statement
 * of what this gate proves is therefore narrow, and worth stating narrowly:
 * the four operations under `src/domains/lenses` are provider-neutral. It does
 * NOT establish that the docsite as a whole runs against any conformant
 * provider — five mounted routes, the home page among them, currently do not.
 *
 * Widening the root to `src/domains` is the intended direction and would turn
 * this gate red today. That red would be a to-do list rather than a defect in
 * the gate; a silent gate implying coverage it does not have is the worse of
 * the two, which is why the exclusions are enumerated here rather than left
 * implicit in one path constant.
 *
 * 🔴 SCHEDULING. The reach into the app is a filesystem path, not a manifest
 * dependency, and the app depends on nothing here — so `nx affected` does not
 * schedule this project when a lens changes. The gate runs on every full
 * `bun run test` and post-merge, not on a PR that touches only a lens.
 *
 * Test infrastructure: excluded from the build (tsconfig.build.json) and from
 * coverage (vitest.config.ts).
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** From src/testing/ the repo root is five levels up. */
const APP_RELATIVE_PATH = "../../../../../apps/react/pragma-docs";

/** The docsite app this provider is measured against. */
export const APP_ROOT: string = resolve(
  dirname(fileURLToPath(import.meta.url)),
  APP_RELATIVE_PATH,
);

/**
 * The scan root: the CORE lens components. The operation set is whatever is
 * declared under here — and nothing else. See this module's header for the
 * six operations that live outside it, and why.
 */
export const LENS_DIRECTORY: string = join(APP_ROOT, "src/domains/lenses");

/** Relay's committed artifacts, which carry the full operation text. */
export const ARTIFACT_DIRECTORY: string = join(
  APP_ROOT,
  "src/relay/__generated__",
);

const tsxFilesUnder = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = join(directory, entry.name);
    if (entry.isDirectory()) {
      return tsxFilesUnder(full);
    }
    // `.ts` as well as `.tsx`: the lens tree already carries *Query.ts
    // modules by convention, and a `graphql` tag in one of them would otherwise
    // be invisible to a gate whose whole claim is that the set is derived
    // from the tree.
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [full] : [];
  });

/**
 * Every query operation declared under the lens directory, sorted.
 *
 * Template bodies are captured FIRST and operation names read out of those
 * bodies, never out of the raw file text: these components carry extensive
 * TSDoc prose, and matching `query X(` against it would invent operations
 * that do not exist.
 *
 * Throws — never returns empty, never skips — when the app is missing. A gate
 * that goes quiet when its subject disappears is worse than no gate.
 */
export const discoverLensOperationNames = (): string[] => {
  if (!existsSync(LENS_DIRECTORY)) {
    throw new Error(
      `Lens directory not found at ${LENS_DIRECTORY}. This gate measures the ` +
        "docsite's own lens operations against this provider; it cannot run " +
        "without the app, and it must not pass without it either.",
    );
  }

  const names = new Set<string>();
  for (const file of tsxFilesUnder(LENS_DIRECTORY)) {
    const text = readFileSync(file, "utf8");
    for (const [, body] of text.matchAll(/graphql`([\s\S]*?)`/g)) {
      for (const [, name] of (body ?? "").matchAll(
        /\bquery\s+([A-Za-z_]\w*)\s*[({]/g,
      )) {
        names.add(name as string);
      }
      for (const [, name] of (body ?? "").matchAll(
        /@refetchable\(\s*queryName:\s*"([^"]+)"/g,
      )) {
        names.add(name as string);
      }
    }
  }
  return [...names].sort();
};

/**
 * The full operation text of a committed Relay artifact.
 *
 * Read as TEXT and parsed out of the `params.text` literal rather than
 * imported: the artifact modules open with a value-position import of
 * `relay-runtime`, a package this one does not and should not depend on.
 *
 * A null `text` means the app switched to persisted queries, and the operation
 * text no longer lives in the repo. That must fail loudly rather than quietly
 * testing nothing.
 */
export const readOperationText = (name: string): string => {
  const artifact = join(ARTIFACT_DIRECTORY, `${name}.graphql.ts`);
  if (!existsSync(artifact)) {
    throw new Error(
      `No Relay artifact for the lens operation "${name}" at ${artifact}. ` +
        "Either the operation was renamed without regenerating artifacts, or " +
        "relay-compiler has not been run.",
    );
  }
  const source = readFileSync(artifact, "utf8");
  const match = /"text":\s*("(?:[^"\\]|\\.)*")/.exec(source);
  if (match?.[1] === undefined) {
    throw new Error(
      `The Relay artifact for "${name}" carries no operation text (${artifact}). ` +
        "This is what persisted queries look like — the text is no longer in " +
        "the repo, so this gate cannot execute it.",
    );
  }
  return JSON.parse(match[1]) as string;
};
