import { describe, expect, it } from "vitest";
import readArrangementParams from "./readArrangementParams.js";
import spellArrangementParams from "./spellArrangementParams.js";

describe("spellArrangementParams", () => {
  it("replaces the arrangement carried, keeping every other parameter and leaving the given ones alone", () => {
    const params = new URLSearchParams(
      "status=failed&table.hidden=old&status=running&table.order=old",
    );
    const spelled = spellArrangementParams(params, {
      order: ["cores", "a&b"],
      hidden: ["name"],
    });
    expect(spelled.toString()).toBe(
      "status=failed&status=running&table.order=cores&table.order=a%26b&table.hidden=name",
    );
    expect(params.getAll("table.order")).toEqual(["old"]);
  });

  it("spells no arrangement as none, and hidden columns alone without an order", () => {
    const params = new URLSearchParams("table.order=a&table.hidden=b&q=x");
    expect(spellArrangementParams(params, null).toString()).toBe("q=x");
    expect(
      spellArrangementParams(params, { order: null, hidden: ["b"] }).toString(),
    ).toBe("q=x&table.hidden=b");
  });

  it("is read back as the arrangement it spells", () => {
    const arrangements = [
      { order: ["name", "cores"], hidden: [] },
      { order: ["name"], hidden: ["cores", "status"] },
      { order: null, hidden: ["cores"] },
    ];
    for (const arrangement of arrangements) {
      expect(
        readArrangementParams(
          spellArrangementParams(new URLSearchParams("q=x"), arrangement),
        ),
      ).toEqual(arrangement);
    }
  });
});
