import { describe, expect, it } from "vitest";
import * as dataviews from "./index.js";

describe("public surface", () => {
  it("exports exactly the identity API", () => {
    expect(Object.keys(dataviews).sort()).toEqual([
      "createIdentity",
      "isIdentity",
    ]);
  });

  it("wires the barrel to working functions", () => {
    expect(dataviews.isIdentity(dataviews.createIdentity())).toBe(true);
  });
});
