import { readFileSync } from "node:fs";
import { buildSchema } from "graphql";
import { describe, expect, it } from "vitest";
import { INVALID_SCHEMA, INVALID_SDL } from "./constants.js";
import { readContractSdl } from "./contractSdl.js";
import {
  assertSatisfiesContract,
  satisfiesContract,
} from "./satisfiesContract.js";
import type { ContractResult } from "./types.js";

const loadFixture = (name: string): string =>
  readFileSync(
    new URL(`../testing/__fixtures__/${name}.sdl.txt`, import.meta.url),
    "utf8",
  );

const toyContract = loadFixture("toyContract");
const getCodes = (sdl: string, contractSdl: string): string[] =>
  satisfiesContract(sdl, { contractSdl }).violations.map((v) => v.code);

/**
 * Assertions match on `code` and on the schema coordinate inside the message,
 * never on the whole message. `code` is a stable BreakingChangeType member in
 * both supported graphql majors; the surrounding prose is not — v16 says
 * "Widget.size was removed." where v17 says "Field Widget.size was removed."
 */
const joinMessages = (result: ContractResult): string =>
  result.violations.map((v) => v.message).join("\n");

/** The real contract with one coordinate mutated, for the negative cases. */
const mutateContract = (from: string, to: string): string => {
  const sdl = readContractSdl();
  if (!sdl.includes(from)) {
    throw new Error(
      `the contract no longer contains "${from}"; this test's mutation is stale`,
    );
  }
  return sdl.replace(from, to);
};

describe("satisfiesContract", () => {
  it("accepts a schema identical to the contract", () => {
    const result = satisfiesContract(toyContract, { contractSdl: toyContract });
    expect(result).toEqual({ satisfied: true, violations: [] });
  });

  it("accepts a strict superset: extra types, fields, optional args, enum values", () => {
    const result = satisfiesContract(loadFixture("toySuperset"), {
      contractSdl: toyContract,
    });
    expect(result.violations).toEqual([]);
    expect(result.satisfied).toBe(true);
  });

  it("rejects a provider that dropped a field", () => {
    const result = satisfiesContract(loadFixture("toyMissingField"), {
      contractSdl: toyContract,
    });
    expect(result.satisfied).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain("FIELD_REMOVED");
    expect(joinMessages(result)).toContain("Widget.size");
  });

  it("rejects a provider that narrowed a field type", () => {
    expect(getCodes(loadFixture("toyNarrowedField"), toyContract)).toContain(
      "FIELD_CHANGED_KIND",
    );
  });

  it("rejects a provider that removed an argument", () => {
    expect(getCodes(loadFixture("toyRemovedArg"), toyContract)).toContain(
      "ARG_REMOVED",
    );
  });

  it("rejects a provider that removed an enum value", () => {
    expect(getCodes(loadFixture("toyRemovedEnumValue"), toyContract)).toContain(
      "VALUE_REMOVED_FROM_ENUM",
    );
  });

  it("returns one INVALID_SDL violation for an unparseable provider", () => {
    const result = satisfiesContract(loadFixture("toyMalformed"), {
      contractSdl: toyContract,
    });
    expect(result.satisfied).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe(INVALID_SDL);
    expect(result.violations[0]?.message).toContain("could not be parsed");
  });

  it("throws when the CONTRACT itself is malformed: that is a programmer error", () => {
    expect(() =>
      satisfiesContract(toyContract, {
        contractSdl: loadFixture("toyMalformed"),
      }),
    ).toThrow(/Syntax Error/);
  });

  it("throws when the CONTRACT parses but is not a valid schema", () => {
    // The OTHER half of "broken contract", and the half a syntax-error fixture
    // cannot reach: this SDL parses, so `buildSchema` returns happily and only
    // `assertValidSchema` refuses it. Without a fixture that gets that far, the
    // validity check could be deleted and this suite would stay green while
    // the package certified providers against a schema graphql will not run.
    expect(() =>
      satisfiesContract(toyContract, {
        contractSdl: loadFixture("toyInvalidContract"),
      }),
    ).toThrow(/Interface field Described\.label expected/);
  });
});

describe("satisfiesContract: which type serves the operation", () => {
  it("rejects a provider that serves queries from another type", () => {
    // Every type the contract names is present and unchanged here, so
    // `findBreakingChanges` reports nothing at all — the provider just serves
    // its queries from `RootQuery` and leaves the conforming `Query` in the
    // type map unreachable. This is the one conformance failure graphql-js
    // structurally cannot see.
    const result = satisfiesContract(loadFixture("toyRootTypeMismatch"), {
      contractSdl: toyContract,
    });
    expect(result.satisfied).toBe(false);
    expect(result.violations.map((v) => v.code)).toEqual([
      "ROOT_TYPE_MISMATCH",
    ]);
    expect(joinMessages(result)).toContain('"RootQuery"');
  });

  it("puts no obligation on operations the contract does not name", () => {
    // The contract names a query root and nothing else, so a provider is free
    // to add a mutation root of any name: there is no contract operation that
    // could be routed to the wrong type.
    const result = satisfiesContract(
      `${toyContract}\ntype Mutation { rename(id: ID!, label: String!): Widget }\n`,
      { contractSdl: toyContract },
    );
    expect(result).toEqual({ satisfied: true, violations: [] });
  });
});

describe("the real contract", () => {
  it("satisfies itself, and is not degenerate", () => {
    // findBreakingChanges(X, X) is [] for EVERY X, including a truncated or
    // accidentally emptied contract.graphql — so this assertion alone would
    // survive the file being gutted. The floor underneath it is what makes it
    // mean anything.
    const sdl = readContractSdl();
    expect(satisfiesContract(sdl)).toEqual({ satisfied: true, violations: [] });
    expect(Object.keys(buildSchema(sdl).getTypeMap())).toEqual(
      expect.arrayContaining([
        "Node",
        "PageInfo",
        "NodeConnection",
        "NodeEdge",
        "Ontology",
        "OntologyClass",
        "ClassProperty",
        "OntologyProperty",
        "PropertyKind",
        "EntityMeta",
      ]),
    );
  });

  it("is satisfied by the post-1.6 provider emission shape", () => {
    // The fixture embeds what ke-graphql emits for a one-class ontology once
    // OntologyClass implements Node and carries _meta (the 1.6 change).
    expect(satisfiesContract(loadFixture("emittedProvider"))).toEqual({
      satisfied: true,
      violations: [],
    });
  });

  it("is satisfied by a fully prefixed emission: the contract names no ontology terms", () => {
    // prefixing: "all" renames every GENERATED field (name -> exName). The
    // contract's surface is purely structural, so the knob cannot affect it.
    expect(satisfiesContract(loadFixture("emittedPrefixedProvider"))).toEqual({
      satisfied: true,
      violations: [],
    });
  });

  it("flags a relay-less emission by exactly the field relay wiring adds", () => {
    // relay: false keeps the whole TBox (which still references Node) but
    // never claims Query.node. One violation — no more, no less — is the
    // teeth control: the gate distinguishes the two emissions precisely.
    const result = satisfiesContract(loadFixture("emittedNoRelayProvider"));
    expect(result.satisfied).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe("FIELD_REMOVED");
    expect(result.violations[0]?.message).toContain("Query.node");
  });

  it("rejects a provider deficient in three independent ways", () => {
    const result = satisfiesContract(loadFixture("deficientProvider"));
    expect(result.satisfied).toBe(false);
    expect(result.violations.map((v) => v.code)).toEqual(
      expect.arrayContaining([
        "FIELD_REMOVED",
        "FIELD_CHANGED_KIND",
        "ARG_REMOVED",
      ]),
    );
    const messages = joinMessages(result);
    expect(messages).toContain("Node._meta");
    expect(messages).toContain("PageInfo.hasNextPage");
    expect(messages).toContain("Query.ontology");
  });

  it("rejects an empty provider", () => {
    const result = satisfiesContract("type Query { noop: String }");
    expect(result.satisfied).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain("TYPE_REMOVED");
  });
});

describe("satisfiesContract: a provider that parses but is not a schema", () => {
  it("rejects a type that implements an interface without providing its fields", () => {
    // buildSchema runs DOCUMENT-level SDL rules only, so this builds happily
    // and differs from the contract in no way findBreakingChanges can see —
    // and then fails every query at execution with the message below. Calling
    // that conformance would be the worst answer this function can give.
    const result = satisfiesContract(
      `${loadFixture("emittedProvider")}\ntype Broken implements Node { uri: ID! }\n`,
    );
    expect(result.satisfied).toBe(false);
    expect(result.violations.map((v) => v.code)).toEqual([INVALID_SCHEMA]);
    expect(joinMessages(result)).toContain(
      "Interface field Node._meta expected but Broken does not provide it.",
    );
  });

  it("reports a parse failure with its source location, not just its message", () => {
    // GraphQLError.toString() prints the line, the column and a caret-marked
    // excerpt. Reading .message alone throws all of that away, which for a
    // package whose job is telling a provider author what is wrong with their
    // SDL is the difference between an answer and a shrug.
    const result = satisfiesContract(loadFixture("toyMalformed"));
    expect(result.violations.map((v) => v.code)).toEqual([INVALID_SDL]);
    expect(joinMessages(result)).toContain("Syntax Error");
    expect(joinMessages(result)).toMatch(/\d+:\d+/);
  });

  it("reports an SDL-validation failure, which is not a GraphQLError", () => {
    // The other half of the parse branch: assertValidSDL aggregates its
    // findings into a PLAIN Error with no location to print, so the two cases
    // are rendered differently on purpose.
    const result = satisfiesContract(
      "type Query { a: Int }\ntype Query { b: Int }",
    );
    expect(result.violations.map((v) => v.code)).toEqual([INVALID_SDL]);
    expect(joinMessages(result)).toContain(
      'There can be only one type named "Query".',
    );
  });
});

describe("satisfiesContract: the rulings the contract argues for", () => {
  // Each case mutates ONE coordinate of the real contract and offers the
  // result as a provider. These are the rulings the contract changed shape
  // for, so a check that cannot flag their loss is not checking them.

  it("rejects a provider whose OntologyClass stopped implementing Node", () => {
    // The post-1.6 headline ruling: OntologyClass implements Node, so classes
    // resolve through node(id:) and ride NodeConnections like any other entity.
    const result = satisfiesContract(
      mutateContract(
        "type OntologyClass implements Node {",
        "type OntologyClass {",
      ),
    );
    expect(result.satisfied).toBe(false);
    // One violation, no more: the mutation moved this coordinate and nothing
    // else, so the test still isolates it if the contract grows around it.
    expect(result.violations).toHaveLength(1);
    expect(result.violations.map((v) => v.code)).toContain(
      "IMPLEMENTED_INTERFACE_REMOVED",
    );
    expect(joinMessages(result)).toContain("OntologyClass");
  });

  it("rejects a provider that promoted a TBox lookup argument to ID!", () => {
    // The String!-not-ID! ruling: the argument accepts the prefixed
    // convenience form and live client operations declare $uri: String!.
    const result = satisfiesContract(
      mutateContract("ontologyClass(uri: String!)", "ontologyClass(uri: ID!)"),
    );
    expect(result.satisfied).toBe(false);
    // One violation, no more: the mutation moved this coordinate and nothing
    // else, so the test still isolates it if the contract grows around it.
    expect(result.violations).toHaveLength(1);
    expect(result.violations.map((v) => v.code)).toContain("ARG_CHANGED_KIND");
    expect(joinMessages(result)).toContain("Query.ontologyClass");
  });

  it("rejects a provider that added a required argument to a root field", () => {
    // Not a removal, so no fixture shape resembles it — and it silently breaks
    // every operation the docsite already ships.
    const result = satisfiesContract(
      mutateContract(
        "ontology(prefix: String!)",
        "ontology(prefix: String!, tenant: String!)",
      ),
    );
    expect(result.satisfied).toBe(false);
    // One violation, no more: the mutation moved this coordinate and nothing
    // else, so the test still isolates it if the contract grows around it.
    expect(result.violations).toHaveLength(1);
    expect(result.violations.map((v) => v.code)).toContain(
      "REQUIRED_ARG_ADDED",
    );
    expect(joinMessages(result)).toContain("Query.ontology");
  });

  it("rejects a provider that changed a contract type's kind", () => {
    const result = satisfiesContract(
      mutateContract("type EntityMeta {", "interface EntityMeta {"),
    );
    expect(result.satisfied).toBe(false);
    // One violation, no more: the mutation moved this coordinate and nothing
    // else, so the test still isolates it if the contract grows around it.
    expect(result.violations).toHaveLength(1);
    expect(result.violations.map((v) => v.code)).toContain("TYPE_CHANGED_KIND");
    expect(joinMessages(result)).toContain("EntityMeta");
  });
});

describe("satisfiesContract: what the check deliberately does NOT enforce", () => {
  // Negative space, measured rather than assumed. Both of these are supersets
  // in the sense the contract cares about — every operation legal against the
  // contract still runs — so accepting them is correct, not a gap. Pinned so
  // that a future change to the accepted set is a decision rather than a
  // side effect.

  it("accepts a provider that changed an argument's default value", () => {
    // A default changes what an OMITTED argument means, not which operations
    // are legal. graphql-js agrees: ARG_DEFAULT_VALUE_CHANGE is a DANGEROUS
    // change, not a breaking one, and findDangerousChanges is not consulted.
    const result = satisfiesContract(
      mutateContract('lang: String = "en"', 'lang: String = "fr"'),
    );
    expect(result).toEqual({ satisfied: true, violations: [] });
  });

  it("accepts a provider that added a value to a contract enum", () => {
    const result = satisfiesContract(
      mutateContract(
        "enum PropertyKind {",
        "enum PropertyKind {\n  PROVIDER_EXTENSION",
      ),
    );
    expect(result).toEqual({ satisfied: true, violations: [] });
  });
});

describe("assertSatisfiesContract", () => {
  it("returns quietly for a conformant provider", () => {
    expect(() =>
      assertSatisfiesContract(loadFixture("toySuperset"), {
        contractSdl: toyContract,
      }),
    ).not.toThrow();
  });

  it("throws listing every violation, naming the provider", () => {
    let message = "";
    try {
      assertSatisfiesContract(loadFixture("deficientProvider"), {
        providerName: "ke-graphql backend",
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("ke-graphql backend");
    expect(message).toContain("3 violation(s)");
    expect(message).toContain("[FIELD_REMOVED]");
    expect(message).toContain("Node._meta");
    expect(message).toContain("[ARG_REMOVED]");
    expect(message).toContain("[FIELD_CHANGED_KIND]");
  });

  it("defaults the provider name", () => {
    expect(() =>
      assertSatisfiesContract("type Query { noop: String }"),
    ).toThrow(/^provider does not satisfy the Prism data contract/);
  });
});
