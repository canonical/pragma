import { describe, expect, it, vi } from "vitest";
import {
  quoteArgument,
  quoteCall,
  renderCall,
  renderNextStep,
} from "./call.js";

describe("a call is spelled for the surface it is printed on", () => {
  const call = { verb: "token lookup", params: { name: ["color.text"] } };

  it("ends a dead end with a command on the CLI and a tool call over MCP", () => {
    expect(renderNextStep(call, "cli")).toBe(
      "Run `pragma token lookup color.text`.",
    );
    expect(renderNextStep(call, "mcp")).toBe(
      'Call `token_lookup { name: ["color.text"] }`.',
    );
  });

  it("a next step to a mutating tool never confirms: the tool is plan-first, and its plan says how to proceed", () => {
    const update = { verb: "sources update" };
    expect(renderNextStep(update, "mcp")).toBe("Call `sources_update {}`.");
    expect(renderNextStep(update, "cli")).toBe("Run `pragma sources update`.");
    expect(renderCall(update, "mcp")).toBe("sources_update {}");
  });

  it("a verb withheld from MCP is spelled as the command it is, on both surfaces", () => {
    expect(renderNextStep({ verb: "setup skills" }, "mcp")).toBe(
      "Run `pragma setup skills`.",
    );
  });

  it("carries global CLI flags on the command only", () => {
    const verbose = { verb: "sources update", cliFlags: ["--verbose"] };
    expect(renderCall(verbose, "cli")).toBe("pragma sources update --verbose");
    expect(renderCall(verbose, "mcp")).toBe("sources_update {}");
  });

  it("spells flags the way the CLI parses them", () => {
    // A default-true boolean is negated; a default-false one is simply absent.
    expect(
      renderCall(
        {
          verb: "create package",
          params: { name: "x", runInstall: false, withCli: false },
        },
        "cli",
      ),
    ).toBe("pragma create package --name x --no-run-install");
    // `undefined` is not an argument, on either surface.
    const sparse = {
      verb: "ontology lookup",
      params: { prefix: "ds", class: undefined },
    };
    expect(renderCall(sparse, "mcp")).toBe('ontology_lookup { prefix: "ds" }');
    expect(renderCall(sparse, "cli")).toBe("pragma ontology lookup ds");
  });

  it("fences a flag-like positional, and quotes a call containing a backtick safely", () => {
    expect(
      quoteCall({ verb: "graph inspect", params: { uri: "-x" } }, "cli"),
    ).toBe("`pragma graph inspect -- -x`");
    expect(
      quoteCall(
        { verb: "graph query", params: { sparql: 'ASK { ?s ?p "`" }' } },
        "mcp",
      ),
    ).toMatch(/^`` graph_query .* ``$/);
    expect(quoteArgument("channelOf", "x", "cli")).toBe("`--channel-of x`");
    // Shell-quoted like any other word, so the printed flag can be pasted.
    expect(quoteArgument("search", "two words; rm", "cli")).toBe(
      "`--search 'two words; rm'`",
    );
    expect(quoteArgument("channelOf", "x", "mcp")).toBe('`channelOf: "x"`');
  });

  it("outside the suite's checking, renders an undeclared verb's params as flags rather than throwing", async () => {
    // A shipped process never enables checking, and this runs inside error
    // rendering — a second failure there helps no one. A fresh module instance
    // is the unchecked, undeclared state a shipped process starts in.
    vi.resetModules();
    const fresh = await import("./call.js");
    expect(
      fresh.renderCall(
        { verb: "widget list", params: { kind: "input" } },
        "cli",
      ),
    ).toBe("pragma widget list --kind input");
    expect(fresh.callTool({ verb: "widget list" })).toEqual({
      tool: "widget_list",
      params: {},
    });
  });
});
