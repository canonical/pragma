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
// dependency list.
//
// WHY IT THROWS RATHER THAN SKIPS WHEN THE FILE IS MISSING. A gate that goes
// quiet when its subject disappears is worse than no gate: a missing schema
// means the app stopped committing its schema, which is exactly the state this
// gate exists to notice, and a skip would report that as success.
//
// 🔴 IT IS NOT POINTED AT `../__fixtures__/*.sdl.txt`. Those captures predate
// the converged base and carry 12 violations each; a gate aimed at them would
// be red by construction and would be silenced within a week. They pin a
// DIFFERENT property (additivity of the second source root, in
// `./sourceAdditivity.test.ts`) which survives their staleness. THIS gate is
// what measures the schema THE APP ACTUALLY SHIPS. Note the limit precisely:
// the subject is the committed artifact, not a live emission, so this gate
// catches the committed file drifting from the CONTRACT and cannot catch it
// drifting from what `createPragmaProvider` would emit today. Closing that
// second gap needs a boot, which is the app's job and not a unit test's.
//
// 🔴 SCHEDULING — READ THIS BEFORE TRUSTING THE GATE. `nx affected` propagates
// from a changed project to its DEPENDENTS. The app depends on this package,
// not the reverse, so a pull request that touches only `schema.graphql` marks
// the app affected and leaves this project's `test` target unscheduled. The
// edge cannot simply be declared either: an implicit dependency back onto the
// app would close a cycle, which nx rejects.
//
// So this gate runs on every full `bun run test` and on the post-merge
// workflow, and NOT on a pull request that changes only its subject. That is a
// real hole, stated rather than papered over. The fix available is to site the
// gate in the app instead, where nx schedules it — at the cost of putting
// `@canonical/prism-contract` in the app's dependency list. Nothing here should
// be read as claiming a CI step exists that closes it.
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

describe("the committed schema.graphql is this provider's output", () => {
  // NON-VACUITY FLOOR, and the reason it is here. The contract names only the
  // structural base — Node, PageInfo, the TBox roots — and nothing this
  // provider contributes. So the conformance check below is satisfied by the
  // CONTRACT ITSELF, by a stub, and by an emission with every ontology-derived
  // field stripped out: measured, all three pass. A gate that accepts its own
  // yardstick as a subject is measuring nothing.
  //
  // These assertions are the floor that makes the check mean something: the
  // subject has to actually be a pragma emission before conformance is worth
  // asserting of it. They name the provider's own signature — the anatomy
  // mapping CUSTOM_MAPPINGS exists for, an ontology-derived type the contract
  // knows nothing about, and a size no stub reaches.
  const sdl = readCommittedSdl();

  it("carries the anatomy mapping this provider configures", () => {
    expect(sdl).toContain("anatomyUri");
  });

  it("carries ontology-derived types the contract never names", () => {
    expect(sdl).toContain("type Component");
    expect(sdl).toContain("type Job");
  });

  it("is a whole emission, not a stub", () => {
    // The contract is ~7KB; a real emission is two orders of magnitude larger.
    // A generous floor: this fails on a substituted or collapsed schema and
    // never on an ordinary edit.
    expect(sdl.length).toBeGreaterThan(50_000);
  });
});

describe("satisfiesContract(the committed schema.graphql)", () => {
  // No `providerName`: `satisfiesContract` does not take one — it names the
  // provider in a THROWN message, and this gate asserts on the result instead.
  // It was passed here until now, and only survived because `check:ts`
  // excludes test files; under a config that saw this file it is a type error.
  const result = satisfiesContract(readCommittedSdl());

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
