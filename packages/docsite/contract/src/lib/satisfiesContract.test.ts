import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readContractSdl } from "./contractSdl.js";
import {
  assertSatisfiesContract,
  INVALID_SDL,
  satisfiesContract,
} from "./satisfiesContract.js";

const fixture = (name: string): string =>
  readFileSync(
    new URL(`../__fixtures__/${name}.sdl.txt`, import.meta.url),
    "utf8",
  );

const toyContract = fixture("toyContract");
const codesOf = (sdl: string, contractSdl: string): string[] =>
  satisfiesContract(sdl, { contractSdl }).violations.map((v) => v.code);

/**
 * Assertions match on `code` and on the schema coordinate inside the message,
 * never on the whole message. `code` is a stable BreakingChangeType member in
 * both supported graphql majors; the surrounding prose is not — v16 says
 * "Widget.size was removed." where v17 says "Field Widget.size was removed."
 */
const messagesOf = (result: { violations: readonly { message: string }[] }) =>
  result.violations.map((v) => v.message).join("\n");

describe("satisfiesContract", () => {
  it("accepts a schema identical to the contract", () => {
    const result = satisfiesContract(toyContract, { contractSdl: toyContract });
    expect(result).toEqual({ satisfied: true, violations: [] });
  });

  it("accepts a strict superset: extra types, fields, optional args, enum values", () => {
    const result = satisfiesContract(fixture("toySuperset"), {
      contractSdl: toyContract,
    });
    expect(result.violations).toEqual([]);
    expect(result.satisfied).toBe(true);
  });

  it("rejects a provider that dropped a field", () => {
    const result = satisfiesContract(fixture("toyMissingField"), {
      contractSdl: toyContract,
    });
    expect(result.satisfied).toBe(false);
    expect(result.violations.map((v) => v.code)).toContain("FIELD_REMOVED");
    expect(messagesOf(result)).toContain("Widget.size");
  });

  it("rejects a provider that narrowed a field type", () => {
    expect(codesOf(fixture("toyNarrowedField"), toyContract)).toContain(
      "FIELD_CHANGED_KIND",
    );
  });

  it("rejects a provider that removed an argument", () => {
    expect(codesOf(fixture("toyRemovedArg"), toyContract)).toContain(
      "ARG_REMOVED",
    );
  });

  it("rejects a provider that removed an enum value", () => {
    expect(codesOf(fixture("toyRemovedEnumValue"), toyContract)).toContain(
      "VALUE_REMOVED_FROM_ENUM",
    );
  });

  it("returns one INVALID_SDL violation for an unparseable provider", () => {
    const result = satisfiesContract(fixture("toyMalformed"), {
      contractSdl: toyContract,
    });
    expect(result.satisfied).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]?.code).toBe(INVALID_SDL);
    expect(result.violations[0]?.message).toContain("could not be parsed");
  });

  it("throws when the CONTRACT itself is malformed: that is a programmer error", () => {
    expect(() =>
      satisfiesContract(toyContract, { contractSdl: fixture("toyMalformed") }),
    ).toThrow();
  });
});

describe("the real contract", () => {
  it("satisfies itself", () => {
    expect(satisfiesContract(readContractSdl())).toEqual({
      satisfied: true,
      violations: [],
    });
  });

  it("rejects a provider deficient in three independent ways", () => {
    const result = satisfiesContract(fixture("deficientProvider"));
    expect(result.satisfied).toBe(false);
    expect(result.violations.map((v) => v.code)).toEqual(
      expect.arrayContaining([
        "FIELD_REMOVED",
        "FIELD_CHANGED_KIND",
        "ARG_REMOVED",
      ]),
    );
    const messages = messagesOf(result);
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

describe("assertSatisfiesContract", () => {
  it("returns quietly for a conformant provider", () => {
    expect(() =>
      assertSatisfiesContract(fixture("toySuperset"), {
        contractSdl: toyContract,
      }),
    ).not.toThrow();
  });

  it("throws listing every violation, naming the provider", () => {
    let message = "";
    try {
      assertSatisfiesContract(fixture("deficientProvider"), {
        providerName: "ke-graphql backend",
      });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("ke-graphql backend");
    // Derived, not pinned: the invariant is that the thrown message reports
    // EVERY violation the predicate found. A hardcoded count would break
    // whenever the contract legitimately grows a field, which says nothing
    // about whether the message is complete.
    const { violations } = satisfiesContract(fixture("deficientProvider"));
    expect(violations.length).toBeGreaterThan(2);
    expect(message).toContain(`${violations.length} violation(s)`);
    for (const violation of violations) {
      expect(message).toContain(violation.message);
    }
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
