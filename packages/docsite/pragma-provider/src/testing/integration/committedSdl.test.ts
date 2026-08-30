// =============================================================================
// GATE G-2: the committed SDL against the authored contract.
//
// The subject is `apps/react/pragma-docs/src/relay/schema.graphql` — THIS
// PROVIDER'S OUTPUT, checked into the consumer's tree because relay-compiler
// reads it there. The contract half is read live from
// `@canonical/prism-contract` on every run, so if the contract moves this
// turns red on the next run. That is the mechanism working. Never vendor a
// copy of the contract to make it quiet.
//
// WHY IT LIVES IN THE PROVIDER PACKAGE RATHER THAN IN THE APP. `schema.graphql`
// is not something the app authors; it is something the app RECEIVES. Siting
// the gate here also keeps `@canonical/prism-contract` out of the docsite's
// dependency list, which matters now that the whole point of the previous
// commit is how short that list has become. Precedent: graph-example's
// acceptance gate already reaches into `apps/react/pragma-docs` by relative
// path and documents why.
//
// WHY IT THROWS RATHER THAN SKIPS WHEN THE FILE IS MISSING. Verbatim from the
// gate that established the rule (`graph-example/src/testing/lensOperations.ts`):
// "A gate that goes quiet when its subject disappears is worse than no gate."
// A missing schema means the app stopped committing its schema, which is
// exactly the state this gate exists to notice.
//
// 🔴 IT IS NOT POINTED AT `../__fixtures__/*.sdl.txt`. Those captures predate
// the converged base and carry 12 violations each; a gate aimed at them would
// be red by construction and would be silenced within a week. They pin a
// DIFFERENT property (additivity of the second source root, in
// `../sourceAdditivity.test.ts`) which survives their staleness. THIS gate is
// what closes the currency gap they leave: it measures the schema as it is
// now, on every run.
//
// SCHEDULING, and why it is not a dependency edge. `nx affected` sees no edge
// from this package to the app, so a PR touching only `schema.graphql` does not
// schedule this project's `test` target — and the edge cannot simply be
// declared, because the app already depends on this provider and an implicit
// dependency back would close a cycle. CI therefore runs this gate and
// graph-example's acceptance gate UNCONDITIONALLY, in `pr.yml`'s "Gates" step,
// outside `affected`. If that step is ever removed, this comment is a lie and
// the gate is asleep: it is cheap (~2s for both) precisely so that nobody has
// a reason to remove it.
// =============================================================================

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { satisfiesContract } from "@canonical/prism-contract";
import { describe, expect, it } from "vitest";

/** From `src/testing/integration/` the repo root is six levels up. */
const APP_RELATIVE_PATH = "../../../../../../apps/react/pragma-docs";

const APP_ROOT: string = resolve(
  dirname(fileURLToPath(import.meta.url)),
  APP_RELATIVE_PATH,
);

/** The provider's emitted artifact, as committed. */
const COMMITTED_SDL_PATH: string = join(APP_ROOT, "src/relay/schema.graphql");

const readCommittedSdl = (): string => {
  if (!existsSync(COMMITTED_SDL_PATH)) {
    throw new Error(
      `gate G-2 has no subject: ${COMMITTED_SDL_PATH} does not exist. The docsite commits its emitted schema because relay-compiler reads it; if that stopped being true, this gate needs rewriting, not deleting.`,
    );
  }
  return readFileSync(COMMITTED_SDL_PATH, "utf-8");
};

describe("satisfiesContract(the committed schema.graphql)", () => {
  const result = satisfiesContract(readCommittedSdl(), {
    providerName: "@canonical/prism-pragma-provider",
  });

  it("reports zero violations", () => {
    // Mapped to strings so a failure prints what is actually wrong rather
    // than "[Object]". Asserting emptiness, not prose.
    expect(
      result.violations.map(
        (violation) => `${violation.code}: ${violation.message}`,
      ),
    ).toEqual([]);
  });

  it("is satisfied", () => {
    expect(result.satisfied).toBe(true);
  });
});
