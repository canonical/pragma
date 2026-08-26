import { dryRun } from "@canonical/task";
import { describe, expect, it } from "vitest";
import template from "./template.js";
import templateDir from "./templateDir.js";

describe("template task", () => {
  it("creates mkdir and writeFile effects", () => {
    const t = template({
      source: "/templates/component.tsx.ejs",
      dest: "/output/Button.tsx",
      vars: { name: "Button" },
    });

    const { effects } = dryRun(t);
    expect(effects.some((e) => e._tag === "MakeDir")).toBe(true);
    expect(effects.some((e) => e._tag === "ReadFile")).toBe(true);
    expect(effects.some((e) => e._tag === "WriteFile")).toBe(true);
  });

  it("renders destination path with variables", () => {
    const t = template({
      source: "/templates/component.tsx.ejs",
      dest: "/output/<%= name %>.tsx",
      vars: { name: "Button" },
    });

    const { effects } = dryRun(t);
    const writeEffect = effects.find((e) => e._tag === "WriteFile");
    expect((writeEffect as { path: string }).path).toBe("/output/Button.tsx");
  });

  it("creates parent directory", () => {
    const t = template({
      source: "/templates/test.txt.ejs",
      dest: "/deep/nested/path/file.txt",
      vars: {},
    });

    const { effects } = dryRun(t);
    const mkdirEffect = effects.find((e) => e._tag === "MakeDir");
    expect((mkdirEffect as { path: string }).path).toBe("/deep/nested/path");
  });

  it("uses provided content instead of reading from source", () => {
    // The compiled-binary path: `content` is pre-loaded (e.g. from
    // Bun.embeddedFiles), so no ReadFile effect should be emitted and the
    // inline content is rendered directly.
    const t = template({
      source: "/templates/component.tsx.ejs",
      content: "export const <%= name %> = () => null;",
      dest: "/output/<%= name %>.tsx",
      vars: { name: "Button" },
    });

    const { effects } = dryRun(t);
    expect(effects.some((e) => e._tag === "ReadFile")).toBe(false);
    expect(effects.some((e) => e._tag === "MakeDir")).toBe(true);
    const writeEffect = effects.find((e) => e._tag === "WriteFile") as {
      path: string;
      content: string;
    };
    expect(writeEffect.path).toBe("/output/Button.tsx");
    expect(writeEffect.content).toBe("export const Button = () => null;");
  });
});

describe("templateDir task", () => {
  it("creates effects for directory templating", () => {
    const t = templateDir({
      source: "/templates",
      dest: "/output",
      vars: { name: "MyComponent" },
    });

    const { effects } = dryRun(t);
    expect(effects.some((e) => e._tag === "Glob")).toBe(true);
  });

  it("handles empty directory (no files matched)", () => {
    const t = templateDir({
      source: "/empty-templates",
      dest: "/output",
      vars: {},
    });

    expect(() => dryRun(t)).not.toThrow();
  });
});
