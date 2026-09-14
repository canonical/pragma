import { describe, expect, it } from "vitest";
import createSnapshot from "./createSnapshot.js";

describe("createSnapshot", () => {
  it("keeps the query as the text its reader spelled, beside the arrangement", () => {
    expect(
      createSnapshot({
        query: new URLSearchParams(
          "view=v1&status=running&sort=cores__desc&page=2&size=50",
        ),
        presentation: { "table.width.name": 240 },
      }),
    ).toEqual({
      query: "view=v1&status=running&sort=cores__desc&page=2&size=50",
      presentation: { "table.width.name": 240 },
    });
  });

  it("survives JSON, and holds a frozen copy of the arrangement", () => {
    const arrangement: Record<string, string[]> = { "table.hidden": ["cores"] };
    const snapshot = createSnapshot({
      query: new URLSearchParams("page=1&size=50"),
      presentation: arrangement,
    });
    arrangement["table.order"] = ["cores"];
    expect(snapshot.presentation).toEqual({ "table.hidden": ["cores"] });
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.presentation)).toBe(true);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });
});
