import { describe, expect, it } from "vitest";
import createOutputResult from "./createOutputResult.js";
import type { CommandResult, RenderPair } from "./types.js";

describe("createOutputResult", () => {
  it("creates a result with tag output", () => {
    const render: RenderPair<string[]> = {
      plain: (data) => data.join("\n"),
    };

    const result = createOutputResult(["a", "b"], render);

    expect(result.tag).toBe("output");
    expect(result.value).toEqual(["a", "b"]);
    expect(result.render.plain(["x"])).toBe("x");
  });

  it("discriminates in CommandResult union", () => {
    const result: CommandResult = createOutputResult("hello", {
      plain: (s) => s,
    });

    switch (result.tag) {
      case "output":
        expect(result.render.plain("test")).toBe("test");
        break;
      case "interactive":
        expect.unreachable("Should be output");
        break;
      case "exit":
        expect.unreachable("Should be output");
        break;
    }
  });
});
