import { describe, expect, it } from "vitest";
import resolveCommandKind from "./resolveCommandKind.js";

describe("resolveCommandKind", () => {
  it("detects completions-client from --completions flag", () => {
    const result = resolveCommandKind([
      "node",
      "pragma",
      "--completions",
      "component",
      "li",
    ]);
    expect(result).toEqual({
      kind: "completions-client",
      partial: "component li",
    });
  });

  it("detects completions-server from _completions-server command", () => {
    const result = resolveCommandKind([
      "node",
      "pragma",
      "_completions-server",
    ]);
    expect(result).toEqual({ kind: "completions-server" });
  });

  it("detects doctor command", () => {
    const result = resolveCommandKind(["node", "pragma", "doctor"]);
    expect(result).toEqual({ kind: "doctor" });
  });

  it("detects store-skip for setup", () => {
    const result = resolveCommandKind(["node", "pragma", "setup"]);
    expect(result).toEqual({ kind: "store-skip", command: "setup" });
  });

  it("detects store-skip for mcp", () => {
    const result = resolveCommandKind(["node", "pragma", "mcp"]);
    expect(result).toEqual({ kind: "store-skip", command: "mcp" });
  });

  it("defaults to store-required for regular commands", () => {
    const result = resolveCommandKind(["node", "pragma", "component", "list"]);
    expect(result).toEqual({ kind: "store-required" });
  });

  it("defaults to store-required when no command given", () => {
    const result = resolveCommandKind(["node", "pragma"]);
    expect(result).toEqual({ kind: "store-required" });
  });

  it("skips flags when finding command argument", () => {
    const result = resolveCommandKind(["node", "pragma", "--llm", "doctor"]);
    expect(result).toEqual({ kind: "doctor" });
  });
});
