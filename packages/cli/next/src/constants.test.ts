import { describe, expect, it } from "vitest";
import {
  BIN_NAME,
  DEFAULT_DETAIL_LEVEL,
  DETAIL_LEVELS,
  MCP_SERVER_NAME,
  OUTPUT_FORMATS,
  PROGRAM_DESCRIPTION,
  RECOVERY_CLI_PREFIX,
  VERSION,
} from "./constants.js";

describe("constants", () => {
  it("names the v2 bin and the MCP server pragma", () => {
    expect(BIN_NAME).toBe("pragma");
    expect(MCP_SERVER_NAME).toBe("pragma");
  });

  it("reads a semver version from package.json", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("keeps the recovery prefix on the stable command name (D5)", () => {
    expect(RECOVERY_CLI_PREFIX).toBe("pragma ");
  });

  it("exposes the stable output formats and detail levels", () => {
    expect(OUTPUT_FORMATS).toEqual(["plain", "llm", "json"]);
    expect(DETAIL_LEVELS).toEqual(["summary", "standard", "detailed"]);
    expect(DETAIL_LEVELS).toContain(DEFAULT_DETAIL_LEVEL);
    expect(PROGRAM_DESCRIPTION.length).toBeGreaterThan(0);
  });
});
