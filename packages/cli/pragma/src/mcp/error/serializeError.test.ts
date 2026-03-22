import { describe, expect, it } from "vitest";
import { PragmaError } from "#error";
import serializeError from "./serializeError.js";
import type { McpErrorPayload } from "./types.js";

function parsePayload(result: { content: unknown[] }): McpErrorPayload {
  const first = result.content[0] as { text: string };
  return JSON.parse(first.text);
}

describe("serializeError", () => {
  it("serializes ENTITY_NOT_FOUND with structured recovery", () => {
    const error = PragmaError.notFound("component", "Buton", {
      suggestions: ["Button", "ButtonGroup"],
      recovery: {
        message: "List available components.",
        cli: "pragma block list",
        mcp: { tool: "block_list" },
      },
    });

    const result = serializeError(error);
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.type).toBe("text");

    const payload = parsePayload(result);
    expect(payload.code).toBe("ENTITY_NOT_FOUND");
    expect(payload.message).toContain("Buton");
    expect(payload.suggestions).toEqual(["Button", "ButtonGroup"]);
    expect(payload.recovery).toEqual({ tool: "block_list" });
  });

  it("extracts mcp recovery with params", () => {
    const error = PragmaError.emptyResults("component", {
      recovery: {
        message: "Widen the search to show all tiers.",
        cli: "pragma block list --all-tiers",
        mcp: { tool: "block_list", params: { allTiers: true } },
      },
    });

    const payload = parsePayload(serializeError(error));
    expect(payload.recovery?.tool).toBe("block_list");
    expect(payload.recovery?.params).toEqual({ allTiers: true });
  });

  it("serializes EMPTY_RESULTS with filters", () => {
    const error = PragmaError.emptyResults("component", {
      filters: { tier: "apps/lxd", channel: "normal" },
      recovery: {
        message: "Widen the search to show all tiers.",
        cli: "pragma block list --all-tiers",
        mcp: { tool: "block_list", params: { allTiers: true } },
      },
    });

    const payload = parsePayload(serializeError(error));
    expect(payload.code).toBe("EMPTY_RESULTS");
    expect(payload.filters).toEqual({ tier: "apps/lxd", channel: "normal" });
    expect(payload.recovery?.tool).toBe("block_list");
  });

  it("omits recovery when no mcp field", () => {
    const error = PragmaError.internalError("unexpected failure");

    const payload = parsePayload(serializeError(error));
    expect(payload.code).toBe("INTERNAL_ERROR");
    expect(payload.recovery).toBeUndefined();
  });

  it("extracts mcp recovery from modifier error", () => {
    const error = PragmaError.notFound("modifier", "x", {
      recovery: {
        message: "List available modifiers.",
        cli: "pragma modifier list",
        mcp: { tool: "modifier_list" },
      },
    });

    const payload = parsePayload(serializeError(error));
    expect(payload.recovery).toEqual({ tool: "modifier_list" });
  });

  it("omits recovery when undefined", () => {
    const error = PragmaError.storeError("boot failed");
    const payload = parsePayload(serializeError(error));
    expect(payload.recovery).toBeUndefined();
  });

  it("serializes INVALID_INPUT with validOptions", () => {
    const error = PragmaError.invalidInput("channel", "aggressive", {
      validOptions: ["normal", "experimental", "prerelease"],
    });

    const payload = parsePayload(serializeError(error));
    expect(payload.code).toBe("INVALID_INPUT");
    expect(payload.validOptions).toEqual([
      "normal",
      "experimental",
      "prerelease",
    ]);
  });

  it("always sets isError to true", () => {
    const error = PragmaError.storeError("boot failed");
    expect(serializeError(error).isError).toBe(true);
  });

  it("always returns text content type", () => {
    const error = PragmaError.configError("bad config");
    const result = serializeError(error);
    expect(result.content[0]?.type).toBe("text");
  });

  it("omits suggestions when empty", () => {
    const error = PragmaError.storeError("boot failed");
    const payload = parsePayload(serializeError(error));
    expect(payload.suggestions).toBeUndefined();
  });
});
