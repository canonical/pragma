/**
 * Type-sync pin (PROTECTED): the CLI's redeclared `ScopeBand`/`ScopeSelection`
 * mirrors must stay structurally EQUAL to the `@canonical/harnesses` types.
 *
 * The CLI redeclares these in `doctor/types.ts` and `setup/types.ts` on purpose
 * — so those statically-reachable type modules never pull the harnesses runtime
 * onto the fast-path module graph (the lazy-dispatch invariant). That freedom is
 * only safe if the mirrors do not DRIFT from the source of truth, which this
 * `expectTypeOf` pin enforces at `tsc` time.
 *
 * Every harnesses import here is `import type` (type-only, erased at emit), so
 * this file loads no harnesses runtime — the `lazy.test` no-runtime-import guard
 * stays green (it also never reaches this test file: it walks the graph from
 * `capabilities/index`, which imports no test).
 */

import type {
  ScopeBand as HarnessScopeBand,
  ScopeSelection as HarnessScopeSelection,
} from "@canonical/harnesses";
import { describe, expectTypeOf, it } from "vitest";
import type { ScopeBand as DoctorScopeBand } from "./doctor/types.js";
import type {
  ScopeBand as SetupScopeBand,
  ScopeSelection as SetupScopeSelection,
} from "./setup/types.js";

describe("scope type-sync — CLI mirrors == @canonical/harnesses", () => {
  it("both ScopeBand mirrors equal the harnesses ScopeBand", () => {
    expectTypeOf<DoctorScopeBand>().toEqualTypeOf<HarnessScopeBand>();
    expectTypeOf<SetupScopeBand>().toEqualTypeOf<HarnessScopeBand>();
  });

  it("the setup ScopeSelection mirror equals the harnesses ScopeSelection", () => {
    expectTypeOf<SetupScopeSelection>().toEqualTypeOf<HarnessScopeSelection>();
  });
});
