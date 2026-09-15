import { describe, expect, it } from "vitest";
import readLocatedArrangement from "./readLocatedArrangement.js";

describe("readLocatedArrangement", () => {
  it("reads a carried order and hidden columns as the keys they stand for", () => {
    expect(
      readLocatedArrangement(
        new URLSearchParams(
          "status=running&table.order=cores&table.order=name&table.hidden=status",
        ),
      ),
    ).toEqual({ "table.order": ["cores", "name"], "table.hidden": ["status"] });
  });

  it("keeps no order when only hidden columns are carried, and shows every column when only an order is", () => {
    expect(
      readLocatedArrangement(new URLSearchParams("table.hidden=status")),
    ).toEqual({ "table.hidden": ["status"] });
    expect(
      readLocatedArrangement(new URLSearchParams("table.order=cores")),
    ).toEqual({ "table.order": ["cores"], "table.hidden": [] });
  });

  it("reads no arrangement from a location carrying none, or from no location", () => {
    expect(
      readLocatedArrangement(new URLSearchParams("status=running")),
    ).toBeNull();
    expect(readLocatedArrangement(undefined)).toBeNull();
  });
});
