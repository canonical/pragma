// =============================================================================
// The gate of record: this provider's SDL must subsume the authored contract,
// AND its runtime views must actually answer what that SDL promises.
//
// The contract half of the SDL is read live from @canonical/prism-contract on
// every run. Never vendor a copy of the contract to make it quiet.
//
// WHY SUBSUMPTION ALONE IS NOT ENOUGH, which is easy to get wrong here.
// `readProviderSdl()` PREPENDS the very contract that `satisfiesContract` uses
// as its baseline, so the schema half of this gate compares the contract with
// itself and can only ever fail on the extension. A field added to the
// contract tomorrow is in this provider's schema the moment it is published —
// with nothing behind it. If it is nullable the provider serves null and no
// test notices; if it is non-null it is a runtime error on a query nobody
// here runs.
//
// So the second gate below EXECUTES. It builds its selection set from the
// live schema rather than from a list, asks a real entity for every field of
// `EntityMeta` and `ClassProperty` that can be asked without arguments, and
// asserts the execution reports no errors. That is the pairing that makes the
// opening claim true: subsumption says the shape is there, execution says
// something answers.
// =============================================================================

import { satisfiesContract } from "@canonical/prism-contract";
import {
  type GraphQLObjectType,
  getNamedType,
  graphql,
  isLeafType,
  isObjectType,
} from "graphql";
import { describe, expect, it } from "vitest";
import { MULTILINGUAL_ENTITY_URI } from "../../lib/provider/dataset.js";
import {
  createExampleProvider,
  readProviderSdl,
} from "../../lib/provider/index.js";

describe("satisfiesContract(readProviderSdl())", () => {
  // No `providerName`: `satisfiesContract` does not take one — it names the
  // provider in a THROWN message, and this gate asserts on the result instead.
  const result = satisfiesContract(readProviderSdl());

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

describe("the runtime view answers what the schema promises", () => {
  const { schema, rootValue } = createExampleProvider();

  /**
   * Every field of `type` that can be selected with no arguments, spelled as
   * a selection set. Leaves are selected bare; object-valued fields get
   * `{ __typename }`, which is enough to force the resolver to run and to
   * fail a non-null field that resolves to nothing.
   *
   * Derived from the schema, so a field ADDED to the contract is selected here
   * the day it lands — which is the whole point. A field taking a required
   * argument (`field(name:)`) is skipped: there is no value to invent for it,
   * and its own tests cover it.
   */
  const probe = (type: GraphQLObjectType): string =>
    Object.values(type.getFields())
      .filter((field) =>
        field.args.every(
          (arg) =>
            arg.defaultValue !== undefined ||
            !arg.type.toString().endsWith("!"),
        ),
      )
      .map((field) =>
        isLeafType(getNamedType(field.type))
          ? field.name
          : `${field.name} { __typename }`,
      )
      .join(" ");

  const typeNamed = (name: string): GraphQLObjectType => {
    const type = schema.getType(name);
    if (!isObjectType(type)) {
      throw new Error(`${name} is not an object type in the provider schema`);
    }
    return type;
  };

  const run = async (source: string) => graphql({ schema, source, rootValue });

  it("resolves every argument-free EntityMeta field on a real entity", async () => {
    const result = await run(
      `{ node(id: "${MULTILINGUAL_ENTITY_URI}") { _meta { ${probe(typeNamed("EntityMeta"))} } } }`,
    );
    expect(result.errors?.map((error) => error.message) ?? []).toEqual([]);
  });

  it("resolves every argument-free ClassProperty field on a real entity", async () => {
    const result = await run(
      `{ node(id: "${MULTILINGUAL_ENTITY_URI}") { _meta { fields { ${probe(typeNamed("ClassProperty"))} } } } }`,
    );
    expect(result.errors?.map((error) => error.message) ?? []).toEqual([]);
  });
});
