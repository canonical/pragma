import { describe, expect, it } from "vitest";
import {
  BIN_NAME,
  DEFAULT_DETAIL_LEVEL,
  DETAIL_LEVELS,
  ISSUES_URL,
  MCP_SERVER_NAME,
  OUTPUT_FORMATS,
  PROGRAM_DESCRIPTION,
  RECOVERY_CLI_PREFIX,
  VERSION,
} from "./constants.js";

describe("constants", () => {
  it("projects the shipped distribution's identity", () => {
    // Every value here is read from `pragma.conf.ts`, so this pins what THIS
    // distribution ships. That the projection is real — a fork changing the
    // config changes the CLI — is proven by `src/identity.test.ts`.
    expect(BIN_NAME).toBe("pragma");
    expect(MCP_SERVER_NAME).toBe("pragma");
    expect(PROGRAM_DESCRIPTION).toBe("Explore the design system");
    expect(RECOVERY_CLI_PREFIX).toBe("pragma ");
    expect(ISSUES_URL).toBe("https://github.com/canonical/pragma/issues");
  });

  it("reads a semver version from package.json", () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("exposes the stable output formats and detail levels", () => {
    expect(OUTPUT_FORMATS).toEqual(["plain", "llm", "json"]);
    expect(DETAIL_LEVELS).toEqual(["summary", "standard", "detailed"]);
    expect(DETAIL_LEVELS).toContain(DEFAULT_DETAIL_LEVEL);
  });
});
