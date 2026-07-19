import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fixtureModule } from "../../testing/fixtures/fixtureCapability.js";
import { emitSurface } from "./emitSurface.js";
import {
  assertConforms,
  type Covenant,
  deepEqual,
} from "./surfaceConformance.js";

/** The committed covenant, read from disk exactly as a consumer would. */
const golden = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../surface/surface.v2.json", import.meta.url)),
    "utf-8",
  ),
) as Covenant;

describe("deepEqual", () => {
  it("compares JSON-shaped values structurally", () => {
    expect(deepEqual({ a: 1, b: [2, 3] }, { b: [2, 3], a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual("x", "x")).toBe(true);
  });
});

describe("surface conformance (PROTECTED)", () => {
  it("the committed golden's fixed sections match the live emitter", () => {
    // Emitting no modules conforms iff the golden's fixed sections agree with
    // FIXED_SURFACE — the golden and the kernel constant cannot drift apart.
    expect(() => assertConforms(emitSurface([]), golden)).not.toThrow();
  });

  it("accepts a surface whose emitted entries are all in the covenant", () => {
    const covenant: Covenant = {
      ...golden,
      nouns: {
        ...golden.nouns,
        widget: {
          verbs: [
            { v: "list", mcp: "widget_list" },
            {
              v: "make",
              args: ["<name>"],
              flags: ["--with-history"],
              mutates: true,
              needsStore: true,
              mcp: "widget_make",
            },
          ],
        },
      },
      mcpSurface: {
        tools: [...golden.mcpSurface.tools, "widget_list", "widget_make"],
      },
    };
    expect(() =>
      assertConforms(emitSurface([fixtureModule]), covenant),
    ).not.toThrow();
  });

  it("rejects an emitted verb that drifts from the covenant", () => {
    const covenant: Covenant = {
      ...golden,
      nouns: {
        ...golden.nouns,
        widget: { verbs: [{ v: "list", mcp: "widget_list_WRONG" }] },
      },
      mcpSurface: {
        tools: [...golden.mcpSurface.tools, "widget_list", "widget_make"],
      },
    };
    expect(() =>
      assertConforms(emitSurface([fixtureModule]), covenant),
    ).toThrow(/does not match the covenant/);
  });

  it("rejects an emitted tool the covenant does not bless", () => {
    // Same golden, but the fixture's tools are absent from mcpSurface.tools.
    expect(() => assertConforms(emitSurface([fixtureModule]), golden)).toThrow(
      /is not in the covenant/,
    );
  });

  it("freezes exactly 40 designed MCP tools including info, config_show, config_set, colophon", () => {
    expect(golden.mcpSurface.tools).toHaveLength(40);
    expect(golden.mcpSurface.tools).toContain("info");
    expect(golden.mcpSurface.tools).toContain("config_show");
    expect(golden.mcpSurface.tools).toContain("config_set");
    expect(golden.mcpSurface.tools).toContain("colophon");
  });
});
