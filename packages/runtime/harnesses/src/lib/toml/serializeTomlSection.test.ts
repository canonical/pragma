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

  it("handles empty entries object", () => {
    const result = serializeTomlSection("mcp_servers", {});
    expect(result).toBe("");
  });

  it("handles entry with empty fields", () => {
    const result = serializeTomlSection("mcp_servers", {
      empty: {},
    });
    expect(result).toContain("[mcp_servers.empty]");
  });

  it("serializes number values", () => {
    const result = serializeTomlSection("mcp_servers", {
      test: { port: 3000 },
    });
    expect(result).toContain("port = 3000");
  });

  it("serializes non-string non-bool non-number values as quoted strings", () => {
    const result = serializeTomlSection("section", {
      test: { key: undefined },
    });
    expect(result).toContain('key = "undefined"');
  });

  it("serializes boolean false", () => {
    const result = serializeTomlSection("section", {
      test: { disabled: false },
    });
    expect(result).toContain("disabled = false");
  });
});
