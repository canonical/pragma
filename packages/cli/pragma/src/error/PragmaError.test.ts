import { describe, expect, it } from "vitest";
import { PragmaError } from "./PragmaError.js";

describe("PragmaError", () => {
  describe("notFound", () => {
    it("creates an ENTITY_NOT_FOUND error with entity info", () => {
      const err = PragmaError.notFound("component", "Buton", {
        suggestions: ["Button", "ButtonGroup"],
        recovery: {
          message: "List available components.",
          cli: "pragma block list",
          mcp: { tool: "block_list" },
        },
      });

      expect(err).toBeInstanceOf(PragmaError);
      expect(err.code).toBe("ENTITY_NOT_FOUND");
      expect(err.message).toBe('component "Buton" not found.');
      expect(err.entity).toEqual({ type: "component", name: "Buton" });
      expect(err.suggestions).toEqual(["Button", "ButtonGroup"]);
      expect(err.recovery).toEqual({
        message: "List available components.",
        cli: "pragma block list",
        mcp: { tool: "block_list" },
      });
    });

    it("defaults suggestions to empty array", () => {
      const err = PragmaError.notFound("standard", "react/fold");
      expect(err.suggestions).toEqual([]);
      expect(err.recovery).toBeUndefined();
    });
  });

  describe("emptyResults", () => {
    it("creates an EMPTY_RESULTS error with filters", () => {
      const err = PragmaError.emptyResults("component", {
        filters: { tier: "apps/lxd", channel: "normal" },
        recovery: {
          message: "Widen the search to show all tiers.",
          cli: "pragma block list --all-tiers",
          mcp: { tool: "block_list", params: { allTiers: true } },
        },
      });

      expect(err.code).toBe("EMPTY_RESULTS");
      expect(err.message).toBe("No components found.");
      expect(err.filters).toEqual({ tier: "apps/lxd", channel: "normal" });
      expect(err.recovery).toEqual({
        message: "Widen the search to show all tiers.",
        cli: "pragma block list --all-tiers",
        mcp: { tool: "block_list", params: { allTiers: true } },
      });
    });
  });

  describe("invalidInput", () => {
    it("creates an INVALID_INPUT error with valid options", () => {
      const err = PragmaError.invalidInput("channel", "aggressive", {
        validOptions: ["normal", "experimental", "prerelease"],
      });

      expect(err.code).toBe("INVALID_INPUT");
      expect(err.message).toBe('Invalid channel "aggressive".');
      expect(err.validOptions).toEqual([
        "normal",
        "experimental",
        "prerelease",
      ]);
    });
  });

  describe("storeError", () => {
    it("creates a STORE_ERROR with reason and recovery", () => {
      const err = PragmaError.storeError("WASM module failed to load", {
        recovery: {
          message: "Run pragma doctor to diagnose.",
          cli: "pragma doctor",
        },
      });

      expect(err.code).toBe("STORE_ERROR");
      expect(err.message).toContain("WASM module failed to load");
      expect(err.recovery).toEqual({
        message: "Run pragma doctor to diagnose.",
        cli: "pragma doctor",
      });
    });
  });

  describe("configError", () => {
    it("creates a CONFIG_ERROR with valid options", () => {
      const err = PragmaError.configError(
        'Tier "apps/nonexistent" not found in ontology.',
        { validOptions: ["global", "apps", "apps/lxd"] },
      );

      expect(err.code).toBe("CONFIG_ERROR");
      expect(err.message).toContain("apps/nonexistent");
      expect(err.validOptions).toEqual(["global", "apps", "apps/lxd"]);
    });
  });

  describe("internalError", () => {
    it("creates an INTERNAL_ERROR with recovery", () => {
      const err = PragmaError.internalError("Unexpected null in query result");

      expect(err.code).toBe("INTERNAL_ERROR");
      expect(err.message).toContain("Unexpected null");
      expect(err.recovery).toEqual({
        message: "Please report this issue.",
      });
    });
  });

  it("is an instance of Error", () => {
    const err = PragmaError.notFound("component", "Foo");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("PragmaError");
  });
});
