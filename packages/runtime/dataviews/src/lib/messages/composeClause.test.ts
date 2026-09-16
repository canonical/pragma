import { describe, expect, it } from "vitest";
import composeClause from "./composeClause.js";

describe("composeClause", () => {
  it("leaves a fragment as it is", () => {
    expect(composeClause("not a number")).toBe("not a number");
  });

  it("drops the full stop a reason came with, so no message writes two", () => {
    expect(composeClause("not a number.")).toBe("not a number");
  });

  it("drops the stops and the space a reason came with", () => {
    expect(composeClause("not a number.. ")).toBe("not a number");
    expect(composeClause("  not a number  ")).toBe("not a number");
  });

  it("leaves a stop inside the reason alone", () => {
    expect(composeClause("version 1.2 is unreadable")).toBe(
      "version 1.2 is unreadable",
    );
  });
});
