import { describe, expect, it } from "vitest";
import type { Predicate } from "../query/index.js";
import createFieldInteraction from "./createFieldInteraction.js";
import type { FieldValidation } from "./types.js";

/** Validator for a numeric bound: incomplete while partial, invalid beyond. */
const validateNumber = (input: string): FieldValidation => {
  if (input === "" || input === "-") {
    return { status: "incomplete" };
  }
  if (!/^-?\d+(\.\d+)?$/.test(input)) {
    return { status: "invalid", reason: "not a number" };
  }
  return { status: "valid", operands: [Number(input)] };
};

const interaction = (
  overrides: Partial<Parameters<typeof createFieldInteraction>[0]> = {},
) =>
  createFieldInteraction({
    field: "cpu",
    operator: "gte",
    validate: validateNumber,
    ...overrides,
  });

describe("createFieldInteraction", () => {
  it("requires a non-empty field name", () => {
    expect(() =>
      createFieldInteraction({
        field: "",
        operator: "eq",
        validate: validateNumber,
      }),
    ).toThrow("non-empty field");
    expect(() =>
      createFieldInteraction({
        field: "a\u0000b",
        operator: "eq",
        validate: validateNumber,
      }),
    ).toThrow("NUL");
  });

  it("returns the addressed replacement command on a valid edit", () => {
    const field = interaction();
    const command = field.edit("4");
    expect(command).toEqual({
      kind: "setPredicate",
      predicate: { field: "cpu", operator: "gte", operands: [4] },
    });
    expect(field.state.feedback).toEqual({ status: "applied" });
    expect(field.state.applied).toEqual({
      field: "cpu",
      operator: "gte",
      operands: [4],
    });
  });

  it("retains the applied predicate on an invalid edit and explains it", () => {
    const field = interaction();
    field.edit("4");
    const command = field.edit("four");
    expect(command).toBeNull();
    expect(field.state.applied).toEqual({
      field: "cpu",
      operator: "gte",
      operands: [4],
    });
    expect(field.state.feedback).toEqual({
      status: "invalid",
      reason: "not a number",
      retainsPredicate: true,
    });
  });

  it("flags an invalid edit without a prior predicate as not retaining", () => {
    const field = interaction();
    field.edit("nope");
    expect(field.state.feedback).toEqual({
      status: "invalid",
      reason: "not a number",
      retainsPredicate: false,
    });
    expect(field.state.applied).toBeNull();
  });

  it("keeps an incomplete new filter out of the query", () => {
    const field = interaction();
    const command = field.edit("-");
    expect(command).toBeNull();
    expect(field.state.applied).toBeNull();
    expect(field.state.feedback).toEqual({ status: "incomplete" });
  });

  it("retains the applied predicate while incomplete", () => {
    const field = interaction();
    field.edit("4");
    field.edit("-");
    expect(field.state.applied).toEqual({
      field: "cpu",
      operator: "gte",
      operands: [4],
    });
    expect(field.state.feedback).toEqual({ status: "incomplete" });
  });

  it("clears explicitly, distinct from invalid input", () => {
    const field = interaction();
    field.edit("4");
    const command = field.clear();
    expect(command).toEqual({
      kind: "removePredicate",
      field: "cpu",
      operator: "gte",
    });
    expect(field.state.applied).toBeNull();
    expect(field.state.input).toBe("");
    expect(field.state.feedback).toEqual({ status: "none" });
  });

  it("still returns the removal command when nothing is applied", () => {
    const field = interaction();
    expect(field.clear()).toEqual({
      kind: "removePredicate",
      field: "cpu",
      operator: "gte",
    });
  });

  it("discards stale inputs and feedback on an external query change", () => {
    const field = interaction();
    field.edit("four");
    const applied: Predicate = {
      field: "cpu",
      operator: "gte",
      operands: [8],
    };
    field.setApplied(applied);
    expect(field.state.input).toBe("");
    expect(field.state.feedback).toEqual({ status: "none" });
    expect(field.state.applied).toEqual(applied);
  });

  it("adopts external removal without replaying the stale input", () => {
    const field = interaction();
    field.edit("4");
    field.edit("nope");
    field.setApplied(null);
    expect(field.state.applied).toBeNull();
    expect(field.state.input).toBe("");
    expect(field.state.feedback).toEqual({ status: "none" });
  });

  it("formats the input from an external change when configured", () => {
    const field = interaction({
      format: (applied) =>
        applied === null ? "" : String(applied.operands[0] ?? ""),
    });
    field.setApplied({
      field: "cpu",
      operator: "gte",
      operands: [8],
    });
    expect(field.state.input).toBe("8");
    field.setApplied(null);
    expect(field.state.input).toBe("");
  });

  it("rejects a misrouted external predicate without side effects", () => {
    const field = interaction();
    field.edit("4");
    const before = field.state;
    expect(() =>
      field.setApplied({ field: "zone", operator: "eq", operands: ["north"] }),
    ).toThrow("zone");
    expect(() =>
      field.setApplied({ field: "cpu", operator: "lte", operands: [4] }),
    ).toThrow("lte");
    expect(field.state).toBe(before);
  });

  it("serves a referentially stable snapshot between mutations", () => {
    const field = interaction();
    const first = field.state;
    expect(field.state).toBe(first);
    field.edit("4");
    expect(field.state).not.toBe(first);
  });

  it("gives each record a distinct identity", () => {
    const a = interaction();
    const b = interaction();
    expect(a.identity).not.toBe(b.identity);
  });
});
