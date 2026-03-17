import { describe, expect, it } from "vitest";
import {
  mergeTomlSection,
  parseTomlSection,
  removeTomlSection,
  serializeTomlSection,
} from "./toml.js";

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

describe("serializeTomlSection", () => {
  it("produces valid TOML table format", () => {
    const result = serializeTomlSection("mcp_servers", {
      pragma: { command: "pragma", enabled: true },
    });
    expect(result).toContain("[mcp_servers.pragma]");
    expect(result).toContain('command = "pragma"');
    expect(result).toContain("enabled = true");
  });

  it("serializes multiple entries", () => {
    const result = serializeTomlSection("mcp_servers", {
      a: { command: "a" },
      b: { command: "b" },
    });
    expect(result).toContain("[mcp_servers.a]");
    expect(result).toContain("[mcp_servers.b]");
  });
});

describe("mergeTomlSection", () => {
  it("replaces an existing table", () => {
    const result = mergeTomlSection(sampleToml, "mcp_servers", "pragma", {
      command: "new-pragma",
    });
    expect(result).toContain('command = "new-pragma"');
    expect(result).not.toContain("enabled = true");
  });

  it("appends a new table", () => {
    const result = mergeTomlSection(sampleToml, "mcp_servers", "new-server", {
      command: "new-cmd",
    });
    expect(result).toContain("[mcp_servers.new-server]");
    expect(result).toContain("[mcp_servers.figma]");
  });

  it("preserves unrelated sections", () => {
    const result = mergeTomlSection(sampleToml, "mcp_servers", "pragma", {
      command: "updated",
    });
    expect(result).toContain("[other_section]");
  });
});

describe("removeTomlSection", () => {
  it("removes a named table", () => {
    const result = removeTomlSection(sampleToml, "mcp_servers", "pragma");
    expect(result).not.toContain("[mcp_servers.pragma]");
    expect(result).toContain("[mcp_servers.figma]");
  });

  it("preserves unrelated content", () => {
    const result = removeTomlSection(sampleToml, "mcp_servers", "pragma");
    expect(result).toContain("[other_section]");
    expect(result).toContain('model = "o4-mini"');
  });

  it("is a no-op for non-existent table", () => {
    const result = removeTomlSection(sampleToml, "mcp_servers", "nonexistent");
    expect(result).toBe(sampleToml);
  });
});
