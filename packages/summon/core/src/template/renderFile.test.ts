import { describe, expect, it } from "vitest";
import renderFile from "./renderFile.js";
import type TemplatingEngine from "./TemplatingEngine.js";

describe("renderFile", () => {
  it("delegates to the engine's renderFile method", async () => {
    const mockEngine: TemplatingEngine = {
      render: () => "",
      renderAsync: async () => "",
      renderFile: async (templatePath, vars) =>
        `rendered ${templatePath} with ${JSON.stringify(vars)}`,
    };

    const result = await renderFile(
      "/tpl/foo.ejs",
      { name: "bar" },
      mockEngine,
    );
    expect(result).toBe('rendered /tpl/foo.ejs with {"name":"bar"}');
  });

  it("uses default ejs engine when no engine is provided", async () => {
    // We don't have a real template file, but we can verify it calls ejsEngine.
    // Since ejs.renderFile will fail without a real file, we expect it to throw.
    await expect(renderFile("/nonexistent.ejs", {})).rejects.toThrow();
  });
});
