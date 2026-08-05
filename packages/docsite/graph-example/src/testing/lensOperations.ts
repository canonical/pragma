// =============================================================================
// Harvesting the docsite's lens operations, at RUN time.
//
// The operation texts are NEVER snapshotted into this package. They are read
// out of the app's committed Relay artifacts on every run, so this gate always
// measures the operations as they are now — not as they were when someone last
// remembered to update a fixture.
//
// The operation SET is derived from the lens directory, never from a
// hand-maintained allowlist. Narrowing that set to the operations that happen
// to pass is exactly the "shape it until it goes green" failure mode this gate
// exists to prevent.
//
// That directory is the docsite's CORE LENS SET. It is not everything the
// docsite renders: `apps/react/pragma-docs/src/addons/**` holds openly
// pragma-specific add-ons, which are not scanned because they make no
// neutrality claim. See this gate's header for the rule that governs which
// tree a view belongs in — and for why "move it to addons" is not available to
// a core lens that has merely gone red.
//
// Test infrastructure: excluded from the build (tsconfig.build.json) and from
// coverage (vitest.config.ts).
// =============================================================================

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
 * The CORE lens components. The operation set is whatever is declared under
 * here — and nothing else. `src/addons/**` is deliberately outside it.
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
    return entry.isFile() && entry.name.endsWith(".tsx") ? [full] : [];
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
