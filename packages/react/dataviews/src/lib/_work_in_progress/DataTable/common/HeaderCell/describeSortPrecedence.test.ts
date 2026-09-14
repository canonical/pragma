import { describe, expect, it } from "vitest";
import describeSortPrecedence from "./describeSortPrecedence.js";

describe("describeSortPrecedence", () => {
  it("states the direction alone for an ordering of one term", () => {
    expect(
      describeSortPrecedence({ direction: "asc", position: 1, count: 1 }),
    ).toBe("ascending");
    expect(
      describeSortPrecedence({ direction: "desc", position: 1, count: 1 }),
    ).toBe("descending");
  });

  it("adds the precedence once the ordering has several terms", () => {
    expect(
      describeSortPrecedence({ direction: "desc", position: 2, count: 3 }),
    ).toBe("descending, 2nd of 3");
    expect(
      describeSortPrecedence({ direction: "asc", position: 1, count: 2 }),
    ).toBe("ascending, 1st of 2");
  });

  it("spells every ordinal English writes differently", () => {
    const spelled = [3, 4, 11, 12, 13, 21, 22, 23, 101, 111].map((position) =>
      describeSortPrecedence({ direction: "asc", position, count: 200 }),
    );
    expect(spelled).toEqual([
      "ascending, 3rd of 200",
      "ascending, 4th of 200",
      "ascending, 11th of 200",
      "ascending, 12th of 200",
      "ascending, 13th of 200",
      "ascending, 21st of 200",
      "ascending, 22nd of 200",
      "ascending, 23rd of 200",
      "ascending, 101st of 200",
      "ascending, 111th of 200",
    ]);
  });
});
