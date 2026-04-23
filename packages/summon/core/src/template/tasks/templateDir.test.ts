import { dryRunWith, type Effect, filterEffects } from "@canonical/task";
import { describe, expect, it } from "vitest";
import templateDir from "./templateDir.js";

/**
 * Helper: build a mocks Map for dryRunWith.
 * Glob returns the given files; ReadFile returns a simple template body.
 */
const buildMocks = (files: string[]) =>
  new Map<string, (e: Effect) => unknown>([
    ["Glob", () => files],
    ["ReadFile", (e) => `content of ${(e as { path: string }).path}`],
    ["WriteFile", () => undefined],
    ["MakeDir", () => undefined],
  ]);

describe("templateDir", () => {
  it("processes files from glob and creates write effects", () => {
    const t = templateDir({
      source: "/templates",
      dest: "/output",
      vars: { name: "Button" },
    });

    const { effects } = dryRunWith(t, buildMocks(["component.tsx.ejs"]));

    expect(effects.some((e) => e._tag === "Glob")).toBe(true);
    const writes = filterEffects(effects, "WriteFile");
    expect(writes).toHaveLength(1);
    expect((writes[0] as { path: string }).path).toBe("/output/component.tsx");
  });

  it("strips .ejs extension from output files", () => {
    const t = templateDir({
      source: "/tpl",
      dest: "/out",
      vars: {},
    });

    const { effects } = dryRunWith(t, buildMocks(["file.ts.ejs"]));
    const writes = filterEffects(effects, "WriteFile");
    expect((writes[0] as { path: string }).path).toBe("/out/file.ts");
  });

  it("applies rename mappings", () => {
    const t = templateDir({
      source: "/tpl",
      dest: "/out",
      vars: {},
      rename: { "file.ts": "renamed.ts" },
    });

    const { effects } = dryRunWith(t, buildMocks(["file.ts"]));
    const writes = filterEffects(effects, "WriteFile");
    expect((writes[0] as { path: string }).path).toBe("/out/renamed.ts");
  });

  it("renders template variables in destination filenames", () => {
    const t = templateDir({
      source: "/tpl",
      dest: "/out",
      vars: { name: "Button" },
    });

    const { effects } = dryRunWith(t, buildMocks(["<%= name %>.tsx"]));
    const writes = filterEffects(effects, "WriteFile");
    expect((writes[0] as { path: string }).path).toBe("/out/Button.tsx");
  });

  it("filters files matching ignore patterns", () => {
    const t = templateDir({
      source: "/tpl",
      dest: "/out",
      vars: {},
      ignore: ["*.md"],
    });

    const { effects } = dryRunWith(
      t,
      buildMocks(["component.ts", "README.md"]),
    );
    const writes = filterEffects(effects, "WriteFile");
    expect(writes).toHaveLength(1);
    expect((writes[0] as { path: string }).path).toBe("/out/component.ts");
  });

  it("filters files matching glob-star ignore patterns", () => {
    const t = templateDir({
      source: "/tpl",
      dest: "/out",
      vars: {},
      ignore: ["**/*.test.ts"],
    });

    const { effects } = dryRunWith(
      t,
      buildMocks(["component.ts", "tests/component.test.ts"]),
    );
    const writes = filterEffects(effects, "WriteFile");
    expect(writes).toHaveLength(1);
  });

  it("handles empty glob result", () => {
    const t = templateDir({
      source: "/empty",
      dest: "/out",
      vars: {},
    });

    const { effects } = dryRunWith(t, buildMocks([]));
    const writes = filterEffects(effects, "WriteFile");
    expect(writes).toHaveLength(0);
  });

  it("handles multiple files", () => {
    const t = templateDir({
      source: "/tpl",
      dest: "/out",
      vars: {},
    });

    const { effects } = dryRunWith(t, buildMocks(["a.ts", "b.ts", "c.ts"]));
    const writes = filterEffects(effects, "WriteFile");
    expect(writes).toHaveLength(3);
  });
});
