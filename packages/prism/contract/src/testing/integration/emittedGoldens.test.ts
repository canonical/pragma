// =============================================================================
// The currency gate: the compiler's COMMITTED emissions still satisfy the
// contract as it stands right now.
//
// WHY THIS EXISTS. `src/__fixtures__/emitted*.sdl.txt` are frozen captures. If
// the contract gains a promise the compiler does not keep, or the compiler's
// emitted base loses something the contract requires, nothing above this file
// would notice: the fixtures would go on satisfying the fixture-era contract
// forever. This gate reads the compiler's OWN golden SDLs — the ones
// `@canonical/ke-graphql` regenerates and pins byte-for-byte against a live
// `compile()` in its `emittedSdl.test.ts` — and checks them against the
// contract as read live from `schema/`. Both halves therefore move on their
// own, and this turns red when they stop agreeing.
//
// WHY IT READS BY PATH RATHER THAN IMPORTING. Those goldens live in
// ke-graphql's `src/testing/`, which is excluded from that package's build and
// never published, so there is nothing to import. A path is the only handle.
// The reach is in the permitted direction — `packages/prism/*` may depend on
// the runtime packages, never the reverse — and the dependency is DECLARED as
// a devDependency rather than left implicit, so `nx affected` schedules this
// suite when the compiler's goldens change. Without that edge the gate would
// simply not run on the change it exists to catch, which is the same outcome
// as not having it.
//
// WHY IT THROWS RATHER THAN SKIPS. A gate that goes quiet when its subject
// disappears is worse than no gate: it would report success for a repository
// in which the compiler's goldens had been deleted or moved, which is exactly
// the state worth noticing.
// =============================================================================

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { satisfiesContract } from "../../lib/index.js";

/** From this file, five directories up is the repository root. */
const GOLDEN_DIRECTORY: string = fileURLToPath(
  new URL(
    "../../../../../../packages/runtime/ke-graphql/src/testing/integration/__fixtures__",
    import.meta.url,
  ),
);

const readGoldenNames = (): string[] => {
  if (!existsSync(GOLDEN_DIRECTORY)) {
    throw new Error(
      `no compiler goldens at ${GOLDEN_DIRECTORY}. This gate measures @canonical/ke-graphql's committed emissions against the contract; it cannot run without them, and it must not pass without them either.`,
    );
  }
  const names = readdirSync(GOLDEN_DIRECTORY)
    .filter((entry) => entry.endsWith(".sdl.txt"))
    .sort();
  if (names.length === 0) {
    throw new Error(`no *.sdl.txt goldens in ${GOLDEN_DIRECTORY}`);
  }
  return names;
};

describe("the compiler's committed emissions satisfy the contract", () => {
  const names = readGoldenNames();

  it("finds the whole corpus, not a subset that happens to pass", () => {
    // The set is whatever the directory holds — narrowing it to the entries
    // that pass is the failure mode this gate exists to prevent. The floor is
    // a deletion tripwire only: ke-graphql's own emittedSdl.test.ts pins the
    // corpus at eight entries, so fewer here means goldens went missing rather
    // than that the corpus shrank on purpose.
    expect(names.length).toBeGreaterThanOrEqual(8);
  });

  for (const name of names) {
    it(`${name.replace(".sdl.txt", "")} is a conformant superset`, () => {
      const sdl = readFileSync(join(GOLDEN_DIRECTORY, name), "utf8");
      const result = satisfiesContract(sdl);
      expect(
        result.violations.map(
          (violation) => `${violation.code}: ${violation.message}`,
        ),
      ).toEqual([]);
      expect(result.satisfied).toBe(true);
    });
  }
});
