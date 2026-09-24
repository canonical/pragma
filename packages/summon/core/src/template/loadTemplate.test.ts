import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { loadTemplate, loadTemplateSync } from "./loadTemplate.js";

// Every temp dir this file creates, removed after the run.
const tempRoots: string[] = [];
const tempDir = (prefix: string): string => {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  tempRoots.push(dir);
  return dir;
};
afterAll(() => {
  for (const dir of tempRoots) rmSync(dir, { recursive: true, force: true });
});

/** A real file on disk, since that is the only thing this loader reads. */
function writeTemplate(content: string): string {
  const dir = tempDir("load-template-");
  const file = path.join(dir, "component.ts.ejs");
  writeFileSync(file, content);
  return file;
}

describe("loadTemplateSync", () => {
  it("returns the file's contents and the path it read", () => {
    const file = writeTemplate("export const <%= name %> = 1;\n");
    expect(loadTemplateSync(file)).toEqual({
      source: file,
      content: "export const <%= name %> = 1;\n",
    });
  });

  it("throws NAMING the path when the file is not there", () => {
    // A miss must be loud. Callers pass the content straight into `template()`
    // without guarding it, so a silent `""` here would write an empty file and
    // the generator would report success.
    const missing = path.join(tmpdir(), "load-template-absent", "nope.ejs");
    expect(() => loadTemplateSync(missing)).toThrow(
      `Template not found: ${missing}`,
    );
  });

  it("keeps the underlying failure as the cause", () => {
    const missing = path.join(tmpdir(), "load-template-absent", "nope.ejs");
    try {
      loadTemplateSync(missing);
      expect.unreachable("the load should have thrown");
    } catch (error) {
      // The ENOENT survives for anyone debugging a permissions or path problem,
      // while the message stays about the template.
      expect((error as Error).cause).toBeDefined();
    }
  });
});

describe("loadTemplate", () => {
  it("resolves what the sync form returns", async () => {
    const file = writeTemplate("hello\n");
    await expect(loadTemplate(file)).resolves.toEqual({
      source: file,
      content: "hello\n",
    });
  });

  it("rejects when the sync form throws", async () => {
    const missing = path.join(tmpdir(), "load-template-absent", "nope.ejs");
    await expect(loadTemplate(missing)).rejects.toThrow("Template not found");
  });
});
