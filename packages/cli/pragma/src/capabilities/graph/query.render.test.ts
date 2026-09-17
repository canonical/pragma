import { describe, expect, it } from "vitest";
import { queryFormatters } from "./query.render.js";

const EMPTY = { type: "select", bindings: [] } as never;

describe("graph query — zero rows names the next call", () => {
  it("says the query ran, and spells the next calls as commands on the CLI", () => {
    const notice = queryFormatters.notice?.(EMPTY);
    expect(notice).toContain("the query ran and nothing matched");
    expect(notice).toContain("`pragma graph inspect '<prefix:name>'`");
    expect(notice).toContain("`pragma ontology list`");
    // The condensed form is one stream, so it carries the same sentence.
    expect(queryFormatters.llm(EMPTY)).toBe(notice);
  });

  it("spells them as tool calls over MCP", () => {
    const notice = queryFormatters.notice?.(EMPTY, "mcp");
    expect(notice).toContain('`graph_inspect { uri: "<prefix:name>" }`');
    expect(notice).toContain("`ontology_list {}`");
    expect(notice).not.toContain("pragma ");
  });

  it("says nothing when there are rows", () => {
    expect(
      queryFormatters.notice?.({
        type: "select",
        bindings: [{ s: "ds:x" }],
      } as never),
    ).toBeUndefined();
  });
});
