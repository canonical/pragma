import { describe, expect, it } from "vitest";
import renderStringAsync from "./renderStringAsync.js";
import type TemplatingEngine from "./TemplatingEngine.js";

describe("renderStringAsync", () => {
  it("delegates to the engine's renderAsync method", async () => {
    const mockEngine: TemplatingEngine = {
      render: () => "",
      renderAsync: async (template, vars) =>
        `async: ${template} ${JSON.stringify(vars)}`,
      renderFile: async () => "",
    };

    const result = await renderStringAsync(
      "Hello <%= name %>",
      { name: "World" },
      mockEngine,
    );
    expect(result).toBe('async: Hello <%= name %> {"name":"World"}');
  });

  it("uses default ejs engine when no engine is provided", async () => {
    const result = await renderStringAsync("Hello, <%= name %>!", {
      name: "World",
    });
    expect(result).toBe("Hello, World!");
  });
});
