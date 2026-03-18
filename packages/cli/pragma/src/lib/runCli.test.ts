import { describe, expect, it } from "vitest";
import { VERSION } from "../constants.js";
import { collectCommands, createProgram, parseGlobalFlags } from "./runCli.js";

describe("collectCommands", () => {
  it("returns an empty array", () => {
    expect(collectCommands()).toEqual([]);
  });
});

describe("parseGlobalFlags", () => {
  it("parses defaults", () => {
    const flags = parseGlobalFlags(["node", "pragma"]);
    expect(flags).toEqual({ llm: false, format: "text", verbose: false });
  });

  it("parses --llm", () => {
    const flags = parseGlobalFlags(["node", "pragma", "--llm"]);
    expect(flags.llm).toBe(true);
  });

  it("parses --format json", () => {
    const flags = parseGlobalFlags(["node", "pragma", "--format", "json"]);
    expect(flags.format).toBe("json");
  });

  it("parses --verbose", () => {
    const flags = parseGlobalFlags(["node", "pragma", "--verbose"]);
    expect(flags.verbose).toBe(true);
  });

  it("parses all flags together", () => {
    const flags = parseGlobalFlags([
      "node",
      "pragma",
      "--llm",
      "--format",
      "json",
      "--verbose",
    ]);
    expect(flags).toEqual({ llm: true, format: "json", verbose: true });
  });
});

describe("createProgram", () => {
  it("creates a Commander program named pragma", () => {
    const ctx = {
      cwd: "/tmp",
      globalFlags: { llm: false, format: "text" as const, verbose: false },
    };
    const program = createProgram([], ctx);
    expect(program.name()).toBe("pragma");
  });

  it("has version set", () => {
    const ctx = {
      cwd: "/tmp",
      globalFlags: { llm: false, format: "text" as const, verbose: false },
    };
    const program = createProgram([], ctx);
    expect(program.version()).toBe(VERSION);
  });

  it("has global flags registered", () => {
    const ctx = {
      cwd: "/tmp",
      globalFlags: { llm: false, format: "text" as const, verbose: false },
    };
    const program = createProgram([], ctx);
    const optionNames = program.options.map((o) => o.long);
    expect(optionNames).toContain("--llm");
    expect(optionNames).toContain("--format");
    expect(optionNames).toContain("--verbose");
  });
});
