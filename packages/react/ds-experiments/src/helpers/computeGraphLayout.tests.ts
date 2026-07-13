import { describe, expect, it } from "vitest";
import type { GraphEntity } from "../graph/types.js";
import computeGraphLayout from "./computeGraphLayout.js";

const entity = (id: string, kind: GraphEntity["kind"]): GraphEntity => ({
  id,
  label: id,
  kind,
});

describe("computeGraphLayout", () => {
  it("stacks entities of the same kind in one column", () => {
    const positions = computeGraphLayout(
      [entity("a", "COMPONENT"), entity("b", "COMPONENT")],
      { columnGap: 200, rowGap: 100 },
    );

    expect(positions.get("a")).toEqual({ x: 400, y: 0 });
    // COMPONENT is column index 2 -> x = 2 * 200; second entity drops one row.
    expect(positions.get("b")).toEqual({ x: 400, y: 100 });
  });

  it("separates different kinds into different columns", () => {
    const positions = computeGraphLayout(
      [entity("s", "STANDARD"), entity("t", "TOKEN")],
      { columnGap: 200, rowGap: 100 },
    );

    expect(positions.get("s")?.x).toBe(0);
    expect(positions.get("t")?.x).toBe(600);
  });

  it("is deterministic for the same input", () => {
    const input = [entity("a", "COMPONENT"), entity("b", "TOKEN")];

    expect([...computeGraphLayout(input)]).toEqual([
      ...computeGraphLayout(input),
    ]);
  });
});
