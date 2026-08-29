/**
 * Type-sync pin (PROTECTED): the CLI's `Scope`/`ScopeSelection` — declared
 * once, in the rendering vocabulary — must stay structurally EQUAL to the
 * `@canonical/harnesses` `ScopeBand`/`ScopeSelection` types.
 *
 * The CLI declares these in `kernel/render/vocabulary.ts` on purpose — so the
 * statically-reachable type modules never pull the harnesses runtime onto the
 * fast-path module graph (the lazy-dispatch invariant). That freedom is only
 * safe if the declaration does not DRIFT from the source of truth, which this
 * `expectTypeOf` pin enforces at `tsc` time. The NAMES differ deliberately:
 * "band" is the harnesses package's word (its published API), "scope" is
 * pragma's — the word its `--global`/`--local` flags, its rendered sentences
 * and, since the type-layer rename, its model all use.
 *
 * `doctor/types.ts` and `setup/types.ts` re-export the vocabulary's types, and
 * those re-exports are pinned too, so the one-definition property cannot
 * silently regress into a fresh local redeclaration that then drifts.
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
import type { Scope, ScopeSelection } from "../kernel/render/vocabulary.js";
import type { Scope as DoctorScope } from "./doctor/types.js";
import type {
  Scope as SetupScope,
  ScopeSelection as SetupScopeSelection,
} from "./setup/types.js";

describe("scope type-sync — the CLI vocabulary == @canonical/harnesses", () => {
  it("the vocabulary Scope equals the harnesses ScopeBand", () => {
    expectTypeOf<Scope>().toEqualTypeOf<HarnessScopeBand>();
  });

  it("the vocabulary ScopeSelection equals the harnesses ScopeSelection", () => {
    expectTypeOf<ScopeSelection>().toEqualTypeOf<HarnessScopeSelection>();
  });

  it("doctor and setup re-export the one vocabulary definition", () => {
    expectTypeOf<DoctorScope>().toEqualTypeOf<Scope>();
    expectTypeOf<SetupScope>().toEqualTypeOf<Scope>();
    expectTypeOf<SetupScopeSelection>().toEqualTypeOf<ScopeSelection>();
  });
});
