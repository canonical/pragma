import { describe, expect, it } from "vitest";
import { queryFormatters } from "./query.render.js";

const EMPTY = { type: "select", bindings: [] } as never;

describe("graph query — zero rows names the next call", () => {
  it("says the query ran, and points at the catalogue and the namespaces as commands on the CLI", () => {
    const notice = queryFormatters.notice?.(EMPTY) as string;
    expect(notice).toContain("the query ran and matched nothing");
    expect(notice).toContain("`pragma capabilities`");
    expect(notice).toContain("`pragma ontology list`");
    // The condensed form is one stream, so it carries the same sentence.
    expect(queryFormatters.llm(EMPTY)).toBe(notice);
  });

  it("spells them as tool calls over MCP, and names no domain tool", () => {
    const notice = queryFormatters.notice?.(EMPTY, "mcp") as string;
    expect(notice).toContain("`capabilities {}`");
    expect(notice).toContain("`ontology_list {}`");
    expect(notice).not.toContain("pragma ");
    // Which tool answers the question is the catalogue's to say, not this
    // renderer's: the only tools it may name are the two it points at.
    const named = [...notice.matchAll(/`([a-z_]+) \{/g)].map((m) => m[1]);
    expect(named.sort()).toEqual(["capabilities", "ontology_list"]);
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
