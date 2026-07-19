import { describe, expect, it } from "vitest";
import {
  parseGlobalFlags,
  readRawFormat,
  stripGlobalFlags,
} from "./globalFlags.js";

const TTY = { isTty: true, noAutoLlm: false };
const PIPE = { isTty: false, noAutoLlm: false };

describe("parseGlobalFlags", () => {
  it("honours an explicit --llm", () => {
    expect(parseGlobalFlags(["--llm"], TTY)).toMatchObject({
      llm: true,
      autoLlm: false,
      format: "plain",
    });
  });

  it("selects json format (space and equals forms)", () => {
    expect(parseGlobalFlags(["--format", "json"], TTY).format).toBe("json");
    expect(parseGlobalFlags(["--format=json"], TTY).format).toBe("json");
  });

  it("renames --format text to plain", () => {
    expect(parseGlobalFlags(["--format", "text"], PIPE).format).toBe("plain");
  });

  it("auto-enables llm on a non-interactive stdout", () => {
    expect(parseGlobalFlags([], PIPE)).toMatchObject({
      llm: true,
      autoLlm: true,
    });
  });

  it("stays rich on an interactive terminal", () => {
    expect(parseGlobalFlags([], TTY)).toMatchObject({
      llm: false,
      autoLlm: false,
    });
  });

  it("respects PRAGMA_NO_AUTO_LLM", () => {
    expect(
      parseGlobalFlags([], { isTty: false, noAutoLlm: true }),
    ).toMatchObject({ llm: false, autoLlm: false });
  });

  it("does not auto-enable llm when a format is requested", () => {
    expect(parseGlobalFlags(["--format", "json"], PIPE).llm).toBe(false);
  });

  it("reads a valid --detail level and drops an invalid one", () => {
    expect(parseGlobalFlags(["--detail", "detailed"], TTY).detail).toBe(
      "detailed",
    );
    expect(parseGlobalFlags(["--detail", "bogus"], TTY).detail).toBeUndefined();
  });

  it("reads --verbose", () => {
    expect(parseGlobalFlags(["--verbose"], TTY).verbose).toBe(true);
  });
});

describe("stripGlobalFlags", () => {
  it("removes global flags and their values, keeping the command", () => {
    expect(stripGlobalFlags(["--format", "json", "block", "list"])).toEqual([
      "block",
      "list",
    ]);
    expect(
      stripGlobalFlags(["block", "--llm", "list", "--detail", "detailed"]),
    ).toEqual(["block", "list"]);
    expect(stripGlobalFlags(["--format=json", "config", "show"])).toEqual([
      "config",
      "show",
    ]);
    expect(stripGlobalFlags(["config", "show", "--verbose"])).toEqual([
      "config",
      "show",
    ]);
  });
});

describe("readRawFormat", () => {
  it("returns the raw value for validation", () => {
    expect(readRawFormat(["--format", "yaml"])).toBe("yaml");
    expect(readRawFormat(["--format=json"])).toBe("json");
  });

  it("reports a valueless --format as empty string", () => {
    expect(readRawFormat(["--format"])).toBe("");
    expect(readRawFormat(["--format", "--llm"])).toBe("");
  });

  it("returns undefined when --format is absent", () => {
    expect(readRawFormat(["block", "list"])).toBeUndefined();
  });
});
