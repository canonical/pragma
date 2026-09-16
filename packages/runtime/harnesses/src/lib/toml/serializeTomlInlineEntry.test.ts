import { describe, expect, it } from "vitest";
import serializeTomlInlineEntry from "./serializeTomlInlineEntry.js";
import serializeTomlSection from "./serializeTomlSection.js";

describe("serializeTomlInlineEntry", () => {
  it("writes the entry as one line of TOML", () => {
    expect(
      serializeTomlInlineEntry("mcp_servers", "pragma", {
        command: "pragma",
        args: ["mcp", "serve"],
      }),
    ).toBe(
      'mcp_servers.pragma = { command = "pragma", args = ["mcp", "serve"] }',
    );
  });

  it("formats values exactly as the table form does", () => {
    // One value formatter, two spellings — so a remedy a user pastes carries
    // the same string, number and array syntax the writer would have written.
    const fields = {
      command: "C:\\Program Files\\pragma",
      args: ["mcp", "serve"],
      enabled: true,
      retries: 3,
    };
    const inline = serializeTomlInlineEntry("mcp_servers", "pragma", fields);
    const table = serializeTomlSection("mcp_servers", { pragma: fields });
    // Every `key = value` the WRITER emits, compared as the writer spelled
    // it: the table form puts one per line under its header, so each of those
    // lines must appear verbatim inside the one-line form. Asserting that the
    // inline string merely mentions each key passes even if the quoting and
    // array syntax are dropped, which is the whole point of the case.
    const written = table
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("["));
    expect(written).toHaveLength(Object.keys(fields).length);
    for (const line of written) {
      expect(inline).toContain(line);
    }
    // The table form is what the file holds, and it cannot be one line: a
    // `[mcp_servers.pragma]` header owns its own line in TOML's grammar.
    expect(table).toContain("[mcp_servers.pragma]");
    expect(inline).not.toContain("\n");
  });

  it("writes an empty inline table for an entry with no fields", () => {
    expect(serializeTomlInlineEntry("mcp", "pragma", {})).toBe(
      "mcp.pragma = {  }",
    );
  });
});
