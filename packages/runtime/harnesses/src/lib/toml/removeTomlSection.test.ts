import { describe, expect, it } from "vitest";
import removeTomlSection from "./removeTomlSection.js";

const sampleToml = `
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"

[mcp_servers.pragma]
command = "pragma"

[other_section]
key = "value"
`.trim();

describe("removeTomlSection", () => {
  it("removes a named table", () => {
    const result = removeTomlSection(sampleToml, "mcp_servers", "pragma");
    expect(result).not.toContain("[mcp_servers.pragma]");
    expect(result).toContain("[mcp_servers.figma]");
  });

  it("preserves unrelated content", () => {
    const result = removeTomlSection(sampleToml, "mcp_servers", "pragma");
    expect(result).toContain("[other_section]");
  });

  it("is a no-op for non-existent table", () => {
    const result = removeTomlSection(sampleToml, "mcp_servers", "nonexistent");
    expect(result).toBe(sampleToml);
  });
});
