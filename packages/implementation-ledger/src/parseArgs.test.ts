import { describe, expect, it } from "vitest";
import { parseArgs, UsageError } from "./parseArgs.js";

describe("parseArgs", () => {
  it("parses a plain collect invocation", () => {
    expect(parseArgs(["collect"])).toEqual({
      help: false,
      dryRun: false,
      quiet: false,
      tolerateDrift: false,
    });
  });

  it("parses options with values alongside boolean flags", () => {
    expect(
      parseArgs([
        "collect",
        "--package",
        ".",
        "--ledger",
        "l.ttl",
        "--dry-run",
      ]),
    ).toEqual({
      help: false,
      packageFilter: ".",
      ledgerPath: "l.ttl",
      dryRun: true,
      quiet: false,
      tolerateDrift: false,
    });
  });

  it("fails fast when an option's value is another flag", () => {
    // Regression: `--package --dry-run` used to consume "--dry-run" as the
    // package path (and swallow the flag) instead of failing.
    expect(() => parseArgs(["collect", "--package", "--dry-run"])).toThrow(
      UsageError,
    );
    expect(() => parseArgs(["collect", "--package", "--dry-run"])).toThrow(
      "Missing value for --package",
    );
    expect(() => parseArgs(["collect", "--ledger", "-h"])).toThrow(
      "Missing value for --ledger",
    );
  });

  it("fails fast when an option's value is missing at the end of args", () => {
    expect(() => parseArgs(["collect", "--package"])).toThrow(
      "Missing value for --package",
    );
    expect(() => parseArgs(["collect", "--ledger"])).toThrow(
      "Missing value for --ledger",
    );
  });

  it("rejects missing or unknown commands", () => {
    expect(() => parseArgs([])).toThrow("Unknown command: (none)");
    expect(() => parseArgs(["frobnicate"])).toThrow(UsageError);
    expect(() => parseArgs(["collect", "extra"])).toThrow(UsageError);
  });

  it("short-circuits on --help / -h", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
    // --help wins even without a command.
    expect(parseArgs(["--help", "whatever"]).help).toBe(true);
  });
});
