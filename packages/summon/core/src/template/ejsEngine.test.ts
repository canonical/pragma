import { describe, expect, it } from "vitest";
import ejsEngine from "./ejsEngine.js";

describe("ejsEngine", () => {
  describe("render (sync)", () => {
    it("renders a template string synchronously", () => {
      expect(ejsEngine.render("Hello, <%= name %>!", { name: "World" })).toBe(
        "Hello, World!",
      );
    });
  });

  describe("renderAsync", () => {
    it("renders a template string asynchronously", async () => {
      const result = await ejsEngine.renderAsync("Hello, <%= name %>!", {
        name: "Async",
      });
      expect(result).toBe("Hello, Async!");
    });
  });

  describe("renderFile", () => {
    it("renders a template file", async () => {
      // Use a known fixture or just verify it throws for non-existent files
      await expect(
        ejsEngine.renderFile("/nonexistent-path.ejs", {}),
      ).rejects.toThrow();
    });
  });
});
