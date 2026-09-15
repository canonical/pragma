import { describe, expect, it } from "vitest";
import spellColumnArrangement from "./spellColumnArrangement.js";

describe("spellColumnArrangement", () => {
  it("carries an arrangement's stored lists over the parameters, keeping the rest", () => {
    const params = new URLSearchParams("status=running&table.hidden=old");
    const spelled = spellColumnArrangement({
      params,
      columns: [{ id: "name" }, { id: "status" }],
      presentation: { "table.hidden": ["zone", "status"] },
    });
    expect(spelled.toString()).toBe(
      "status=running&table.order=name&table.order=status&table.hidden=zone&table.hidden=status",
    );
    expect(params.getAll("table.hidden")).toEqual(["old"]);
  });

  it("carries no arrangement when given none", () => {
    expect(
      spellColumnArrangement({
        params: new URLSearchParams("table.order=a&q=x"),
        columns: [{ id: "a" }],
        presentation: null,
      }).toString(),
    ).toBe("q=x");
  });
});
