/**
 * The wire grammar's names. Mutation-tested: each expectation fails if the
 * reserved list, the delimiter, an address spelling or key ownership moves.
 */

import { describe, expect, it } from "vitest";
import { createSchema } from "../schema/index.js";
import {
  OPERATOR_DELIMITER,
  RESERVED_QUERY_KEYS,
  SUFFIXED_OPERATORS,
} from "./constants.js";
import isOwnedKey from "./isOwnedKey.js";
import readWireField from "./readWireField.js";
import rejectWireName from "./rejectWireName.js";
import spellWireKey from "./spellWireKey.js";

describe("the wire grammar's names", () => {
  it("reserves the written keys and the annotations", () => {
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
    expect(spellWireKey("status", "eq")).toBe("status");
    expect(spellWireKey("cpu", "gte")).toBe("cpu__gte");
    expect(spellWireKey("cpu", "lte")).toBe("cpu__lte");
    expect(spellWireKey("owner", "isSet")).toBe("owner__isSet");
  });

  it("reads the field a wire key addresses", () => {
    expect(readWireField("status")).toBe("status");
    expect(readWireField("cpu__gte")).toBe("cpu");
    expect(readWireField("a__b__c")).toBe("a");
  });

  it("refuses a field name the grammar cannot spell", () => {
    expect(rejectWireName("status")).toBeNull();
    expect(rejectWireName("cpu__gte")).toBe(
      'field name "cpu__gte" must not contain "__"',
    );
    expect(rejectWireName("sort")).toBe(
      'field name "sort" is a reserved query parameter',
    );
    expect(rejectWireName("cursor")).toBe(
      'field name "cursor" is a reserved query parameter',
    );
    expect(rejectWireName("item")).toBe(
      'field name "item" is a reserved query parameter',
    );
  });

  it("owns the written keys and every address of a field, and nothing else", () => {
    const hasField = createSchema([{ field: "cpu", kind: "number" }]);
    // The cursor is written now, so it is the collection's: a write that
    // does not carry one clears the token a previous page left behind.
    for (const key of ["q", "sort", "group", "page", "size", "cursor"]) {
      expect(isOwnedKey(key, hasField)).toBe(true);
    }
    expect(isOwnedKey("cpu", hasField)).toBe(true);
    expect(isOwnedKey("cpu__gte", hasField)).toBe(true);
    // A refused operator is still the field's, so a write clears it.
    expect(isOwnedKey("cpu__near", hasField)).toBe(true);
    // The annotations are reserved but not owned: the host interprets them.
    // A delimited name whose prefix is no field is the host's too.
    expect(isOwnedKey("view", hasField)).toBe(false);
    expect(isOwnedKey("as", hasField)).toBe(false);
    expect(isOwnedKey("utm__source", hasField)).toBe(false);
    expect(isOwnedKey("tab", hasField)).toBe(false);
  });
});
