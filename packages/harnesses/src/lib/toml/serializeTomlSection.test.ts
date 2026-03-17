import { describe, expect, it } from "vitest";
import serializeTomlSection from "./serializeTomlSection.js";

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
