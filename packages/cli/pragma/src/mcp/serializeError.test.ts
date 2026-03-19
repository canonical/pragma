import { describe, expect, it } from "vitest";
import { PragmaError } from "../error/PragmaError.js";
import serializeError from "./serializeError.js";
import type { McpErrorPayload } from "./types.js";

function parsePayload(result: { content: unknown[] }): McpErrorPayload {
  const first = result.content[0] as { text: string };
  return JSON.parse(first.text);
}

describe("serializeError", () => {
  it("serializes ENTITY_NOT_FOUND with recovery from backtick-wrapped command", () => {
    const error = PragmaError.notFound("component", "Buton", {
      suggestions: ["Button", "ButtonGroup"],
      recovery: "Run `pragma component list` to see available components.",
    });

    const result = serializeError(error);
    expect(result.isError).toBe(true);
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.type).toBe("text");

    const payload = parsePayload(result);
    expect(payload.code).toBe("ENTITY_NOT_FOUND");
    expect(payload.message).toContain("Buton");
    expect(payload.suggestions).toEqual(["Button", "ButtonGroup"]);
    expect(payload.recovery).toEqual({
      tool: "component_list",
      params: {},
      description: "to see available components.",
    });
  });

  it("parses --all-tiers flag into recovery params", () => {
    const error = PragmaError.emptyResults("component", {
      recovery: "Run `pragma component list --all-tiers` to search all tiers.",
    });

    const payload = parsePayload(serializeError(error));
    expect(payload.recovery?.tool).toBe("component_list");
    expect(payload.recovery?.params).toEqual({ allTiers: true });
    expect(payload.recovery?.description).toBe("to search all tiers.");
  });

  it("serializes EMPTY_RESULTS with filters and array recovery", () => {
    const error = PragmaError.emptyResults("component", {
      filters: { tier: "apps/lxd", channel: "normal" },
      recovery: [
        "Run `pragma component list --all-tiers` to search all tiers.",
        "Run `pragma config show` to see filter settings.",
      ],
    });

    const payload = parsePayload(serializeError(error));
    expect(payload.code).toBe("EMPTY_RESULTS");
    expect(payload.filters).toEqual({ tier: "apps/lxd", channel: "normal" });
    // First parseable entry from array
    expect(payload.recovery?.tool).toBe("component_list");
    expect(payload.recovery?.params).toEqual({ allTiers: true });
  });

  it("skips unparseable recovery entries in array", () => {
    const error = PragmaError.notFound("standard", "x", {
      recovery: [
        "Please report this issue.",
        "Run `pragma standard list` to see available standards.",
      ],
    });

    const payload = parsePayload(serializeError(error));
    expect(payload.recovery?.tool).toBe("standard_list");
  });

  it("omits recovery when string is unparseable", () => {
    const error = PragmaError.internalError("unexpected failure");

    const payload = parsePayload(serializeError(error));
    expect(payload.code).toBe("INTERNAL_ERROR");
    expect(payload.recovery).toBeUndefined();
  });

  it("parses plain recovery command (no backticks)", () => {
    const error = PragmaError.notFound("modifier", "x", {
      recovery: "pragma modifier list",
    });

    const payload = parsePayload(serializeError(error));
    expect(payload.recovery).toEqual({
      tool: "modifier_list",
      params: {},
      description: "Run pragma modifier list",
    });
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
