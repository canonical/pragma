import { describe, expect, it } from "vitest";
import parseTomlSection from "./parseTomlSection.js";

const sampleToml = `
# Global settings
model = "o4-mini"

[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"
bearer_token_env_var = "FIGMA_OAUTH_TOKEN"

[mcp_servers.pragma]
command = "pragma"
enabled = true

[other_section]
key = "value"
`.trim();

describe("parseTomlSection", () => {
  it("extracts named tables under a section prefix", () => {
    const result = parseTomlSection(sampleToml, "mcp_servers");
    expect(Object.keys(result)).toEqual(["figma", "pragma"]);
  });

  it("parses string values", () => {
    const result = parseTomlSection(sampleToml, "mcp_servers");
    expect(result.figma.url).toBe("https://mcp.figma.com/mcp");
  });

  it("parses boolean values", () => {
    const result = parseTomlSection(sampleToml, "mcp_servers");
    expect(result.pragma.enabled).toBe(true);
  });

  it("ignores unrelated sections", () => {
    const result = parseTomlSection(sampleToml, "mcp_servers");
    expect(result.other_section).toBeUndefined();
  });

  it("returns empty record for missing section prefix", () => {
    const result = parseTomlSection(sampleToml, "nonexistent");
    expect(result).toEqual({});
  });

  it("parses integer values", () => {
    const toml = "[mcp_servers.test]\ntimeout = 30";
    const result = parseTomlSection(toml, "mcp_servers");
    expect(result.test.timeout).toBe(30);
  });
});
