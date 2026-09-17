import { describe, expect, it, vi } from "vitest";
import { isDeclaredVerb, renderNextStep } from "./call.js";

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

  it("knows which verbs the distribution declares", () => {
    expect(isDeclaredVerb("token lookup")).toBe(true);
    expect(isDeclaredVerb("token nonsense")).toBe(false);
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
