import { describe, expect, it } from "vitest";
import {
  parseGlobalFlags,
  readRawFormat,
  stripGlobalFlags,
} from "./globalFlags.js";

const TTY = { isTty: true, noAutoLlm: false };
const PIPE = { isTty: false, noAutoLlm: false };

describe("parseGlobalFlags", () => {
  it("honours an explicit --format llm (condensed even on a TTY)", () => {
    expect(parseGlobalFlags(["--format", "llm"], TTY)).toMatchObject({
      llm: true,
      autoLlm: false,
      format: "llm",
    });
  });

  it("forces human output with --format plain down a pipe", () => {
    expect(parseGlobalFlags(["--format", "plain"], PIPE)).toMatchObject({
      llm: false,
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
      stripGlobalFlags(["block", "--verbose", "list", "--detail", "detailed"]),
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
    expect(readRawFormat(["--format", "--verbose"])).toBe("");
  });

  it("returns undefined when --format is absent", () => {
    expect(readRawFormat(["block", "list"])).toBeUndefined();
  });
});

describe("the option terminator bounds every scan (PROTECTED)", () => {
  // `--` means the rest is the user's data. A scanner that ignored it would
  // both misread a flag and STRIP it, so a lookup for a block literally named
  // `--format` would lose its own argument and change how the error rendered.
  it("does not read a flag that appears after `--`", () => {
    expect(readRawFormat(["block", "lookup", "--", "--format", "json"])).toBe(
      undefined,
    );
    expect(
      parseGlobalFlags(["block", "lookup", "--", "--verbose"], TTY).verbose,
    ).toBe(false);
    expect(
      parseGlobalFlags(["block", "lookup", "--", "--detail", "detailed"], TTY)
        .detail,
    ).toBe(undefined);
  });

  it("hands everything from `--` onward through untouched", () => {
    expect(
      stripGlobalFlags(["block", "lookup", "--", "--format", "json"]),
    ).toEqual(["block", "lookup", "--", "--format", "json"]);
  });

  it("still reads a flag that appears before `--`", () => {
    expect(
      readRawFormat(["--format", "json", "block", "lookup", "--", "x"]),
    ).toBe("json");
    expect(
      stripGlobalFlags(["--format", "json", "block", "lookup", "--", "x"]),
    ).toEqual(["block", "lookup", "--", "x"]);
  });
});

describe("a flag's value is never another flag (PROTECTED)", () => {
  // The defect this pins: a valueless `--detail` consumed the NEXT flag as its
  // value and stripped it, so `--detail --category css` silently answered over
  // the whole set instead of the filtered one — a wrong answer, no diagnostic.
  it("leaves a following flag standing when the value is absent", () => {
    expect(
      stripGlobalFlags(["standard", "list", "--detail", "--category", "css"]),
    ).toEqual(["standard", "list", "--category", "css"]);
  });

  it("reports no detail for a valueless --detail", () => {
    expect(
      parseGlobalFlags(["standard", "list", "--detail", "--category"], TTY)
        .detail,
    ).toBe(undefined);
  });

  it("still consumes a real value", () => {
    expect(
      stripGlobalFlags(["standard", "list", "--detail", "summary"]),
    ).toEqual(["standard", "list"]);
    expect(
      parseGlobalFlags(["standard", "list", "--detail", "summary"], TTY).detail,
    ).toBe("summary");
  });

  it("reports a valueless --format as empty so the caller rejects it", () => {
    // `""`, not `undefined` — `undefined` would fall through to the default.
    expect(readRawFormat(["--format", "--verbose"])).toBe("");
  });
});
