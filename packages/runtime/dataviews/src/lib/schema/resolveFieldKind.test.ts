import { describe, expect, it } from "vitest";
import resolveFieldKind from "./resolveFieldKind.js";
import type { FieldKind, SchemaFieldDefinition } from "./types.js";

const definitions: { readonly [TKind in FieldKind]: SchemaFieldDefinition } = {
  choices: { field: "status", kind: "choices", options: ["failed", 2] },
  number: { field: "cpu", kind: "number", min: 0, max: 64 },
  flag: { field: "owner", kind: "flag" },
  date: { field: "updated", kind: "date" },
  text: { field: "name", kind: "text" },
};

/** The rules of one kind, with the definition the table's row is typed for. */
const rulesOf = (kind: FieldKind) => ({
  rules: resolveFieldKind(kind),
  definition: definitions[kind],
});

describe("resolveFieldKind", () => {
  it("declares the operators each kind accepts", () => {
    expect(resolveFieldKind("choices").operators).toEqual(["eq"]);
    expect(resolveFieldKind("number").operators).toEqual(["gte", "lte"]);
    expect(resolveFieldKind("flag").operators).toEqual(["isSet"]);
    expect(resolveFieldKind("date").operators).toEqual(["gte", "lte"]);
    expect(resolveFieldKind("text").operators).toEqual([]);
  });

  it("parses a text input through the kind, or says the kind takes none", () => {
    const { rules, definition } = rulesOf("choices");
    if (rules.input.kind !== "text") {
      throw new Error("choices edit through a text input");
    }
    expect(rules.input.parse(definition, "2")).toEqual({
      status: "valid",
      operand: 2,
    });
    expect(rules.input.parse(definition, "ready")).toEqual({
      status: "invalid",
      reason: '"ready" is not an option of "status"',
    });
    expect(resolveFieldKind("flag").input).toEqual({
      kind: "none",
      reason: "flag fields edit through direct commands",
    });
    expect(resolveFieldKind("text").input).toEqual({
      kind: "none",
      reason: "text fields are ordered, not filtered",
    });
  });

  it("rejects operands outside each kind's domain, and none for a kind with no domain", () => {
    const number = rulesOf("number");
    expect(number.rules.rejectOperands(number.definition, [65])).toBe(
      "65 is above the maximum of 64",
    );
    const date = rulesOf("date");
    expect(date.rules.rejectOperands(date.definition, ["yesterday"])).toBe(
      '"yesterday" is not an ISO-8601 calendar date (YYYY-MM-DD)',
    );
    const flag = rulesOf("flag");
    expect(flag.rules.rejectOperands(flag.definition, [true])).toBeNull();
    const text = rulesOf("text");
    expect(text.rules.rejectOperands(text.definition, ["anything"])).toBeNull();
  });

  it("reads the applied value a predicate carries and compares two of them", () => {
    const choices = resolveFieldKind("choices");
    const applied = choices.readApplied({
      field: "status",
      operator: "eq",
      operands: ["failed", 2],
    });
    expect(applied).toEqual(new Set(["failed", 2]));
    expect(choices.areAppliedEqual(applied, new Set([2, "failed"]))).toBe(true);
    expect(choices.areAppliedEqual(applied, new Set([2]))).toBe(false);
    expect(choices.areAppliedEqual(applied, new Set([2, "ready"]))).toBe(false);
    expect(choices.areAppliedEqual(applied, "failed")).toBe(false);
    const text = resolveFieldKind("text");
    expect(
      text.readApplied({ field: "name", operator: "gte", operands: ["b"] }),
    ).toBe("b");
    expect(text.areAppliedEqual("b", "b")).toBe(true);
    expect(
      resolveFieldKind("flag").readApplied({
        field: "owner",
        operator: "isSet",
        operands: [],
      }),
    ).toBe(true);
  });

  it("compares a row value to a range bound through the kind", () => {
    expect(resolveFieldKind("number").compareToBound(3, 4)).toBe(-1);
    expect(resolveFieldKind("number").compareToBound(Number.NaN, 4)).toBeNull();
    expect(resolveFieldKind("text").compareToBound("b", "a")).toBe(1);
    expect(resolveFieldKind("text").compareToBound(1, "a")).toBeNull();
    expect(resolveFieldKind("flag").compareToBound(false, true)).toBe(-1);
    expect(resolveFieldKind("flag").compareToBound("yes", true)).toBeNull();
  });

  it("orders each kind's values, with a text order through the collator given", () => {
    const text = rulesOf("text");
    const collated = text.rules.createOrder(
      text.definition,
      new Intl.Collator("en-u-kn-true"),
    );
    expect(collated.compareText("item2", "item10")).toBeLessThan(0);
    const byCodePoint = text.rules.createOrder(text.definition, null);
    expect(byCodePoint.compareText("item2", "item10")).toBeGreaterThan(0);
    expect(byCodePoint.readKey("")).toBeNull();
    const choices = rulesOf("choices");
    const order = choices.rules.createOrder(choices.definition, null);
    expect(order.readKey(2)).toEqual({ rank: 1, text: "" });
    expect(order.readKey("ready")).toEqual({ rank: 2, text: "ready" });
    expect(order.readKey(true)).toBeNull();
  });
});
