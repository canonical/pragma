// =============================================================================
// The gate of record: this provider's SDL must subsume the authored contract.
//
// The contract half of that SDL is read live from @canonical/prism-contract on
// every run, so if the contract moves, this turns red on the next run. That is
// the mechanism working. Never vendor a copy of the contract to make it quiet.
// =============================================================================

import { satisfiesContract } from "@canonical/prism-contract";
import { describe, expect, it } from "vitest";
import {
  createExampleProvider,
  readProviderSdl,
} from "../../lib/provider/index.js";

describe("satisfiesContract(readProviderSdl())", () => {
  const result = satisfiesContract(readProviderSdl(), {
    providerName: "@canonical/prism-graph-example",
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

describe("the extension is a superset, not a redefinition", () => {
  it("keeps every contract root field reachable and adds none", () => {
    const { schema } = createExampleProvider();
    expect(
      Object.keys(schema.getQueryType()?.getFields() ?? {}).sort(),
    ).toEqual([
      "node",
      "ontologies",
      "ontology",
      "ontologyClass",
      "ontologyProperty",
    ]);
  });

  it("declares more Node implementers than the contract alone can", () => {
    const { schema } = createExampleProvider();
    const node = schema.getType("Node");
    expect(
      schema
        // biome-ignore lint/suspicious/noExplicitAny: narrowing an abstract type for a schema assertion
        .getPossibleTypes(node as any)
        .map((type) => type.name),
    ).toContain("Station");
  });
});
