import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import loadTemplate, { setEmbeddedTemplates } from "./loadTemplate.js";

/** Write a file, creating parent dirs — for the disk-read cases. */
function writeTemplate(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

describe("loadTemplate", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-load-template-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    // Clear the injected manifest so module-level state never leaks between tests.
    setEmbeddedTemplates({});
  });

  it("reads template content from the filesystem", async () => {
    const path = join(dir, "templates", "react", "component.tsx.ejs");
    writeTemplate(path, "export const <%= name %> = () => null;");

    const result = await loadTemplate(path);

    expect(result.source).toBe(path);
    expect(result.content).toBe("export const <%= name %> = () => null;");
  });

  it("falls back to the embedded manifest when the file is not on disk", async () => {
    // No file on disk → fs read fails → the injected manifest is consulted,
    // keyed by the directory-qualified path `component/react/types.ts.ejs`.
    const missingPath = join(dir, "templates", "react", "types.ts.ejs");
    setEmbeddedTemplates({
      "component/react/types.ts.ejs": "EMBEDDED CONTENT",
    });

    const result = await loadTemplate(missingPath);

    expect(result.content).toBe("EMBEDDED CONTENT");
    expect(result.source).toBe(missingPath);
  });

  it("resolves the shared/ styles template by its qualified key", async () => {
    // react pulls its stylesheet from templates/shared/, not templates/react/.
    const missingPath = join(dir, "templates", "shared", "styles.css.ejs");
    setEmbeddedTemplates({ "component/shared/styles.css.ejs": ".x{}" });

    const result = await loadTemplate(missingPath);

    expect(result.content).toBe(".x{}");
  });

  it("returns the disk content even when an embedded entry also exists", async () => {
    const path = join(dir, "templates", "react", "types.ts.ejs");
    writeTemplate(path, "DISK WINS");
    setEmbeddedTemplates({ "component/react/types.ts.ejs": "EMBEDDED" });

    const result = await loadTemplate(path);

    expect(result.content).toBe("DISK WINS");
  });

  // The collision-fix proof: the four basenames that exist in react/, svelte/
  // AND lit/ used to be matched by BARE BASENAME, so a compiled binary could
  // emit the wrong framework's file. Keyed by the framework-qualified path, the
  // three frameworks resolve to DISTINCT contents.
  it("resolves react/svelte/lit collisions to distinct contents (no basename collision)", async () => {
    setEmbeddedTemplates({
      "component/react/types.ts.ejs": "REACT_TYPES",
      "component/svelte/types.ts.ejs": "SVELTE_TYPES",
      "component/lit/types.ts.ejs": "LIT_TYPES",
      "component/react/index.ts.ejs": "REACT_INDEX",
      "component/svelte/index.ts.ejs": "SVELTE_INDEX",
      "component/lit/index.ts.ejs": "LIT_INDEX",
    });

    const react = await loadTemplate(
      join(dir, "templates", "react", "types.ts.ejs"),
    );
    const svelte = await loadTemplate(
      join(dir, "templates", "svelte", "types.ts.ejs"),
    );
    const lit = await loadTemplate(
      join(dir, "templates", "lit", "types.ts.ejs"),
    );

    expect(react.content).toBe("REACT_TYPES");
    expect(svelte.content).toBe("SVELTE_TYPES");
    expect(lit.content).toBe("LIT_TYPES");
    // All three distinct — a basename match would have collapsed them.
    expect(new Set([react.content, svelte.content, lit.content]).size).toBe(3);

    const reactIndex = await loadTemplate(
      join(dir, "templates", "react", "index.ts.ejs"),
    );
    const litIndex = await loadTemplate(
      join(dir, "templates", "lit", "index.ts.ejs"),
    );
    expect(reactIndex.content).toBe("REACT_INDEX");
    expect(litIndex.content).toBe("LIT_INDEX");
  });

  // A total miss (no disk file, no matching embedded entry) must fail loud:
  // callers await this for required templates and do not guard against empty
  // content, so a silent "" would generate blank files (notably in a compiled
  // binary, where the disk read always fails).
  it("throws on a total miss (no disk, no embedded match)", async () => {
    const missingPath = join(dir, "templates", "react", "nonexistent.ejs");

    await expect(loadTemplate(missingPath)).rejects.toThrow(
      /Template not found/,
    );
  });

  it("throws when the manifest exists but has no matching qualified key", async () => {
    const missingPath = join(dir, "templates", "react", "wanted.ejs");
    setEmbeddedTemplates({ "component/svelte/wanted.ejs": "wrong framework" });

    await expect(loadTemplate(missingPath)).rejects.toThrow(
      /Template not found/,
    );
  });

  it("throws for a path with no templates/ segment (no qualified key)", async () => {
    // No `/templates/` in the path → no qualified key can be derived, so the
    // manifest is never consulted and the loader fails loud.
    const missingPath = join(dir, "stray.ejs");
    setEmbeddedTemplates({ "component/react/types.ts.ejs": "irrelevant" });

    await expect(loadTemplate(missingPath)).rejects.toThrow(
      /Template not found/,
    );
  });
});
