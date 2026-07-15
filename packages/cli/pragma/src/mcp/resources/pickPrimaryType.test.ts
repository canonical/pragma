import { describe, expect, it } from "vitest";
import { DEFAULT_PREFIX_MAP } from "../../domains/shared/prefixes.js";
import pickPrimaryType from "./pickPrimaryType.js";

const COMPONENT = `${DEFAULT_PREFIX_MAP.ds}Component`;
const BLOCK = `${DEFAULT_PREFIX_MAP.ds}Block`;
const NAMED_INDIVIDUAL = `${DEFAULT_PREFIX_MAP.owl}NamedIndividual`;
const OWL_THING = `${DEFAULT_PREFIX_MAP.owl}Thing`;

describe("pickPrimaryType", () => {
  it("returns null for no types", () => {
    expect(pickPrimaryType([])).toBeNull();
  });

  it("picks the domain type over a meta-type that sorts first", () => {
    // owl: is http://… and ds: is https://…, so the meta-type sorts first;
    // the meaningful domain type must still win.
    expect([...[NAMED_INDIVIDUAL, COMPONENT]].sort().at(0)).toBe(
      NAMED_INDIVIDUAL,
    );
    expect(pickPrimaryType([NAMED_INDIVIDUAL, COMPONENT])).toBe(COMPONENT);
  });

  it("ignores owl:Thing and owl:NamedIndividual together", () => {
    expect(pickPrimaryType([OWL_THING, NAMED_INDIVIDUAL, COMPONENT])).toBe(
      COMPONENT,
    );
  });

  it("is deterministic among several domain types (lexicographic first)", () => {
    expect(pickPrimaryType([COMPONENT, BLOCK])).toBe(BLOCK);
    expect(pickPrimaryType([BLOCK, COMPONENT])).toBe(BLOCK);
  });

  it("falls back to the full set when only meta-types are present", () => {
    // Both share the owl# namespace, so "NamedIndividual" < "Thing".
    expect(pickPrimaryType([NAMED_INDIVIDUAL, OWL_THING])).toBe(
      NAMED_INDIVIDUAL,
    );
  });
});
