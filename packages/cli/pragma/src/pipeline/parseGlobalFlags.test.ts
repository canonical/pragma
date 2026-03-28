import { describe, expect, it } from "vitest";
import parseGlobalFlags, { stripGlobalFlags } from "./parseGlobalFlags.js";

describe("parseGlobalFlags", () => {
  it("extracts --llm", () => {
    const flags = parseGlobalFlags([
      "node",
      "pragma",
      "block",
      "list",
      "--llm",
    ]);
    expect(flags.llm).toBe(true);
  });

  it("extracts --format json", () => {
    const flags = parseGlobalFlags([
      "node",
      "pragma",
      "--format",
      "json",
      "info",
    ]);
    expect(flags.format).toBe("json");
  });

  it("defaults to text when --format is absent", () => {
    const flags = parseGlobalFlags(["node", "pragma", "info"]);
    expect(flags.format).toBe("text");
  });

  it("extracts --verbose", () => {
    const flags = parseGlobalFlags([
      "node",
      "pragma",
      "--verbose",
      "block",
      "list",
    ]);
    expect(flags.verbose).toBe(true);
  });
});

describe("stripGlobalFlags", () => {
  it("removes --llm from any position", () => {
    expect(
      stripGlobalFlags(["node", "pragma", "--llm", "tier", "list"]),
    ).toEqual(["node", "pragma", "tier", "list"]);
    expect(
      stripGlobalFlags(["node", "pragma", "tier", "list", "--llm"]),
    ).toEqual(["node", "pragma", "tier", "list"]);
  });

  it("removes --format and its value", () => {
    expect(
      stripGlobalFlags(["node", "pragma", "--format", "json", "info"]),
    ).toEqual(["node", "pragma", "info"]);
    expect(
      stripGlobalFlags(["node", "pragma", "info", "--format", "json"]),
    ).toEqual(["node", "pragma", "info"]);
  });

  it("removes --verbose from any position", () => {
    expect(
      stripGlobalFlags(["node", "pragma", "block", "list", "--verbose"]),
    ).toEqual(["node", "pragma", "block", "list"]);
  });

  it("removes all global flags at once", () => {
    expect(
      stripGlobalFlags([
        "node",
        "pragma",
        "--llm",
        "--verbose",
        "--format",
        "json",
        "block",
        "list",
      ]),
    ).toEqual(["node", "pragma", "block", "list"]);
  });

  it("preserves argv when no global flags present", () => {
    expect(stripGlobalFlags(["node", "pragma", "block", "list"])).toEqual([
      "node",
      "pragma",
      "block",
      "list",
    ]);
  });
});
