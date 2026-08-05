// =============================================================================
// Gate G-1: the LIVE emitted SDL satisfies the Prism data contract.
//
// @canonical/prism-contract checks SEMANTIC SUBSUMPTION — findBreakingChanges
// with the contract as `old` and this compiler's emission as `new` — so every
// fixture's emission, a strict superset, must produce zero violations.
//
// The SDL crosses the package boundary as a STRING. The contract package
// builds both schemas with its own graphql instance (v16 today, v17 accepted
// as a peer), so the two-graphql-instances hazard this package documents
// (it pins the v17 RC) never materializes: no schema object crosses.
//
// Assertions match on violation `code` plus the schema coordinate inside the
// message, never on whole prose — codes are stable across graphql majors,
// messages are not.
// =============================================================================

import { createTestStore } from "@canonical/ke/testing";
import {
  assertSatisfiesContract,
  satisfiesContract,
} from "@canonical/prism-contract";
import { afterEach, describe, expect, it } from "vitest";
import { compile, createStoreQueryFn } from "../../lib/compiler/index.js";
import {
  BLANK_NODES_TTL,
  DOMAINLESS_TTL,
  DS_REALISTIC_TTL,
  EDGE_CASES_TTL,
  INHERITANCE_TTL,
  INVERSE_TTL,
  MINIMAL_TTL,
  PREFIXES,
  SHACL_TTL,
} from "../index.js";

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

afterEach(() => {
  for (const cleanup of cleanups) {
    cleanup();
  }
  cleanups = [];
});

const emitSdl = async (
  ttl: string,
  options: Parameters<typeof compile>[2] = {},
): Promise<string> => {
  const { store, cleanup } = await createTestStore({ ttl, prefixes: PREFIXES });
  cleanups.push(cleanup);
  const result = await compile(createStoreQueryFn(store), PREFIXES, options);
  return result.sdl;
};

/** Every fixture in the corpus — the contract must hold for all of them. */
const FIXTURES: Record<string, string> = {
  minimal: MINIMAL_TTL,
  inheritance: INHERITANCE_TTL,
  inverse: INVERSE_TTL,
  "blank-nodes": BLANK_NODES_TTL,
  domainless: DOMAINLESS_TTL,
  "edge-cases": EDGE_CASES_TTL,
  shacl: SHACL_TTL,
  "ds-realistic": DS_REALISTIC_TTL,
};

describe("gate G-1: the live emission satisfies the Prism data contract", () => {
  for (const [name, ttl] of Object.entries(FIXTURES)) {
    it(`the ${name} emission is a conformant superset`, async () => {
      const sdl = await emitSdl(ttl);
      expect(() =>
        assertSatisfiesContract(sdl, { providerName: `ke-graphql (${name})` }),
      ).not.toThrow();
    });
  }

  it('prefixing: "all" cannot affect conformance — the contract names no ontology terms', async () => {
    // The knob renames every GENERATED field (ds:name → dsName). The
    // contract's surface is purely structural, so the ruling that the
    // contract is prefixing-independent is measured here, not assumed.
    const sdl = await emitSdl(DS_REALISTIC_TTL, { prefixing: "all" });
    expect(satisfiesContract(sdl)).toEqual({ satisfied: true, violations: [] });
  });

  it("relay: false fails by exactly the field relay wiring adds", async () => {
    // The teeth control. Without Pass 6 the TBox (which still references
    // Node through OntologyClass and the instances connection) survives, so
    // the ONLY gap against the contract is Query.node — one violation, no
    // more, no less. A gate that cannot flag this emission has no teeth; a
    // gate that flags anything else is measuring the wrong thing.
    const sdl = await emitSdl(MINIMAL_TTL, { relay: false });
    const result = satisfiesContract(sdl);
    expect(result.satisfied).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe("FIELD_REMOVED");
    expect(result.violations[0]?.message).toContain("Query.node");
  });
});
