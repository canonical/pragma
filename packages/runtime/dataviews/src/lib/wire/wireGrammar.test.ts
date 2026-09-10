/**
 * The wire grammar's names. Mutation-tested: each expectation fails if the
 * reserved list, the delimiter, an address spelling or key ownership moves.
 */

import { describe, expect, it } from "vitest";
import {
  fieldOfWireKey,
  isOwnedKey,
  OPERATOR_DELIMITER,
  RESERVED_QUERY_KEYS,
  SUFFIXED_OPERATORS,
  wireKeyOf,
  wireNameRejection,
} from "./wireGrammar.js";

describe("the wire grammar's names", () => {
  it("reserves the written keys, the cursor and the annotations", () => {
    expect([...RESERVED_QUERY_KEYS]).toEqual([
      "q",
      "sort",
      "group",
      "page",
      "size",
      "cursor",
      "as",
      "view",
      "item",
    ]);
    expect(Object.isFrozen(RESERVED_QUERY_KEYS)).toBe(true);
    expect(Object.isFrozen(SUFFIXED_OPERATORS)).toBe(true);
  });

  it("spells eq as the bare field name and the rest with the delimiter", () => {
    expect(OPERATOR_DELIMITER).toBe("__");
    expect(wireKeyOf("status", "eq")).toBe("status");
    expect(wireKeyOf("cpu", "gte")).toBe("cpu__gte");
    expect(wireKeyOf("cpu", "lte")).toBe("cpu__lte");
    expect(wireKeyOf("owner", "isSet")).toBe("owner__isSet");
  });

  it("reads the field a wire key addresses", () => {
    expect(fieldOfWireKey("status")).toBe("status");
    expect(fieldOfWireKey("cpu__gte")).toBe("cpu");
    expect(fieldOfWireKey("a__b__c")).toBe("a");
  });

  it("refuses a field name the grammar cannot spell", () => {
    expect(wireNameRejection("status")).toBeNull();
    expect(wireNameRejection("cpu__gte")).toBe(
      'field name "cpu__gte" must not contain "__"',
    );
    expect(wireNameRejection("sort")).toBe(
      'field name "sort" is a reserved query parameter',
    );
    expect(wireNameRejection("item")).toBe(
      'field name "item" is a reserved query parameter',
    );
  });

  it("owns the written keys and every address of a field, and nothing else", () => {
    const hasField = (name: string) => name === "cpu";
    for (const key of ["q", "sort", "group", "page", "size"]) {
      expect(isOwnedKey(key, hasField)).toBe(true);
    }
    expect(isOwnedKey("cpu", hasField)).toBe(true);
    expect(isOwnedKey("cpu__gte", hasField)).toBe(true);
    // A refused operator is still the field's, so a write clears it.
    expect(isOwnedKey("cpu__near", hasField)).toBe(true);
    // The cursor and the annotations are reserved but not owned: the host
    // interprets them. A delimited name whose prefix is no field is the
    // host's too.
    expect(isOwnedKey("cursor", hasField)).toBe(false);
    expect(isOwnedKey("view", hasField)).toBe(false);
    expect(isOwnedKey("utm__source", hasField)).toBe(false);
    expect(isOwnedKey("tab", hasField)).toBe(false);
  });
});
