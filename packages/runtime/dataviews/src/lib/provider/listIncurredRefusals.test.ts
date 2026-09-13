import { describe, expect, it } from "vitest";
import type { SourceRefusal } from "../result/index.js";
import listIncurredRefusals from "./listIncurredRefusals.js";

const refusal = (overrides: Partial<SourceRefusal> = {}): SourceRefusal => ({
  part: "filter",
  code: "undeclared-field",
  field: "cpu",
  operator: "gte",
  reason: 'field "cpu" cannot be filtered',
  ...overrides,
});

describe("listIncurredRefusals", () => {
  it("answers with the whole list when nothing stood before", () => {
    const after = [refusal()];
    expect(listIncurredRefusals([], after)).toBe(after);
  });

  it("drops a refusal that stood before, whatever its reason says", () => {
    expect(
      listIncurredRefusals(
        [refusal({ reason: "spelled one way" })],
        [refusal({ reason: "spelled another" })],
      ),
    ).toEqual([]);
  });

  it("keeps a refusal that differs in address or code", () => {
    const standing = refusal();
    const otherOperator = refusal({ operator: "lte" });
    const otherCode = refusal({ code: "undeclared-operator" });
    const incurred = listIncurredRefusals(
      [standing],
      [standing, otherOperator, otherCode],
    );
    expect(incurred).toEqual([otherOperator, otherCode]);
    expect(Object.isFrozen(incurred)).toBe(true);
  });
});
