import { describe, expect, it } from "vitest";
import { fixtureModule } from "../../testing/fixtures/fixtureCapability.js";
import {
  emitSurface,
  FIXED_SURFACE,
  kebabCase,
  toolName,
  verbLabel,
} from "./emitSurface.js";

describe("naming rules", () => {
  it("derives tool names from the path", () => {
    expect(toolName(["info"])).toBe("info");
    expect(toolName(["config", "show"])).toBe("config_show");
  });

  it("uses the last path segment as the verb label", () => {
    expect(verbLabel(["info"])).toBe("info");
    expect(verbLabel(["config", "show"])).toBe("show");
  });

  it("kebab-cases camelCase flag names", () => {
    expect(kebabCase("withHistory")).toBe("with-history");
    expect(kebabCase("allTiers")).toBe("all-tiers");
    expect(kebabCase("name")).toBe("name");
  });
});

describe("emitSurface", () => {
  const surface = emitSurface([fixtureModule]);

  it("excludes hidden verbs", () => {
    const labels = surface.nouns.widget?.verbs.map((v) => v.v);
    expect(labels).toEqual(["list", "make"]);
    expect(labels).not.toContain("internal");
  });

  it("emits a bare read verb with only v + mcp", () => {
    const list = surface.nouns.widget?.verbs.find((v) => v.v === "list");
    expect(list).toEqual({ v: "list", mcp: "widget_list" });
  });

  it("emits args, flags, mutates, needsStore for a mutating verb", () => {
    const make = surface.nouns.widget?.verbs.find((v) => v.v === "make");
    expect(make).toEqual({
      v: "make",
      args: ["<name>"],
      flags: ["--with-history"],
      mutates: true,
      needsStore: true,
      mcp: "widget_make",
    });
  });

  it("collects exposed tools, sorted, excluding hidden", () => {
    expect(surface.mcpSurface.tools).toEqual(["widget_list", "widget_make"]);
  });

  it("merges in the fixed kernel sections verbatim", () => {
    expect(surface.bins).toEqual(FIXED_SURFACE.bins);
    expect(surface.globalFlags).toEqual(FIXED_SURFACE.globalFlags);
    expect(surface.exitCodes).toEqual(FIXED_SURFACE.exitCodes);
    expect(surface.budgets).toEqual(FIXED_SURFACE.budgets);
  });
});
