import { describe, expect, it } from "vitest";
import mergeTomlSection from "./mergeTomlSection.js";

const sampleToml = `
[mcp_servers.figma]
url = "https://mcp.figma.com/mcp"

[mcp_servers.pragma]
command = "pragma"
enabled = true

[other_section]
key = "value"
`.trim();

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

  it("replaces content when file only contains the target section", () => {
    const onlySection = '[mcp_servers.only]\ncommand = "old"';
    const result = mergeTomlSection(onlySection, "mcp_servers", "only", {
      command: "new",
    });
    expect(result).toContain("[mcp_servers.only]");
    expect(result).toContain('command = "new"');
    expect(result).not.toContain('command = "old"');
  });
});
