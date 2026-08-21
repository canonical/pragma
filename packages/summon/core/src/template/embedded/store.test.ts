import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  hasEmbeddedTemplates,
  loadTemplate,
  loadTemplateSync,
  setEmbeddedTemplates,
} from "./store.js";

/** Write a file, creating parent dirs — for the disk-read cases. */
function writeTemplate(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

describe("the embedded-template store", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "core-embedded-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    // Clear the injected manifest so module-level state never leaks.
    setEmbeddedTemplates({});
  });

  it("hasEmbeddedTemplates reflects a non-empty injected manifest", () => {
    expect(hasEmbeddedTemplates()).toBe(false);
    setEmbeddedTemplates({ "component/react/x.ejs": "x" });
    expect(hasEmbeddedTemplates()).toBe(true);
    setEmbeddedTemplates({});
    expect(hasEmbeddedTemplates()).toBe(false);
  });

  it("reads template content from the filesystem first", () => {
    const path = join(dir, "templates", "react", "component.tsx.ejs");
    writeTemplate(path, "export const <%= name %> = () => null;");
    const result = loadTemplateSync("component", path);
    expect(result.source).toBe(path);
    expect(result.content).toBe("export const <%= name %> = () => null;");
  });

  it("falls back to the manifest by qualified key when the file is not on disk", () => {
    const missing = join(dir, "templates", "react", "types.ts.ejs");
    setEmbeddedTemplates({ "component/react/types.ts.ejs": "EMBEDDED" });
    expect(loadTemplateSync("component", missing)).toEqual({
      source: missing,
      content: "EMBEDDED",
    });
  });

  it("one manifest serves several prefixes (the whole point of the core store)", () => {
    setEmbeddedTemplates({
      "package/tsconfig.json.ejs": "PKG",
      "application/react/src/lib/index.ts.ejs": "APP",
    });
    expect(
      loadTemplateSync("package", join(dir, "templates", "tsconfig.json.ejs"))
        .content,
    ).toBe("PKG");
    expect(
      loadTemplateSync(
        "application/react",
        join(dir, "templates", "src", "lib", "index.ts.ejs"),
      ).content,
    ).toBe("APP");
  });

  // The historic collision-fix proof (moved from summon-component): several
  // component templates share a basename across frameworks, and a bare
  // basename match could emit the WRONG framework's file. Qualified keys make
  // the three frameworks resolve to DISTINCT contents.
  it("resolves shared basenames across sibling dirs to distinct contents", () => {
    setEmbeddedTemplates({
      "component/react/types.ts.ejs": "REACT_TYPES",
      "component/svelte/types.ts.ejs": "SVELTE_TYPES",
      "component/lit/types.ts.ejs": "LIT_TYPES",
    });
    const contents = ["react", "svelte", "lit"].map(
      (framework) =>
        loadTemplateSync(
          "component",
          join(dir, "templates", framework, "types.ts.ejs"),
        ).content,
    );
    expect(contents).toEqual(["REACT_TYPES", "SVELTE_TYPES", "LIT_TYPES"]);
    expect(new Set(contents).size).toBe(3);
  });

  it("disk wins even when an embedded entry also exists", () => {
    const path = join(dir, "templates", "react", "types.ts.ejs");
    writeTemplate(path, "DISK WINS");
    setEmbeddedTemplates({ "component/react/types.ts.ejs": "EMBEDDED" });
    expect(loadTemplateSync("component", path).content).toBe("DISK WINS");
  });

  it("empty-string content is a VALID entry (.gitkeep)", () => {
    const missing = join(dir, "templates", "src", "assets", ".gitkeep");
    setEmbeddedTemplates({ "application/react/src/assets/.gitkeep": "" });
    expect(loadTemplateSync("application/react", missing).content).toBe("");
  });

  it("throws on a total miss, NAMING the qualified key", () => {
    const missing = join(dir, "templates", "react", "wanted.ejs");
    setEmbeddedTemplates({ "component/svelte/wanted.ejs": "wrong" });
    expect(() => loadTemplateSync("component", missing)).toThrow(
      /Template not found: .* no embedded template for 'component\/react\/wanted\.ejs'/,
    );
  });

  it("throws for a path with no templates/ segment (no key derivable)", () => {
    const missing = join(dir, "stray.ejs");
    setEmbeddedTemplates({ "component/react/types.ts.ejs": "irrelevant" });
    expect(() => loadTemplateSync("component", missing)).toThrow(
      /no embedded template for this path/,
    );
  });

  it("the async wrapper resolves the same result", async () => {
    setEmbeddedTemplates({ "component/react/types.ts.ejs": "ASYNC" });
    await expect(
      loadTemplate(
        "component",
        join(dir, "templates", "react", "types.ts.ejs"),
      ),
    ).resolves.toEqual({
      source: join(dir, "templates", "react", "types.ts.ejs"),
      content: "ASYNC",
    });
  });
});
