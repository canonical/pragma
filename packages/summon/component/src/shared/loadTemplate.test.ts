import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import loadTemplate from "./loadTemplate.js";

describe("loadTemplate", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "pragma-load-template-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    // Ensure no embedded-files stub leaks between tests.
    delete (globalThis as { Bun?: unknown }).Bun;
  });

  it("reads template content from the filesystem", async () => {
    const path = join(dir, "component.tsx.ejs");
    writeFileSync(path, "export const <%= name %> = () => null;");

    const result = await loadTemplate(path);

    expect(result.source).toBe(path);
    expect(result.content).toBe("export const <%= name %> = () => null;");
  });

  it("falls back to Bun.embeddedFiles when the file is not on disk", async () => {
    // No file written to disk → fs read fails → embedded lookup runs.
    // Blob names are content-hashed (e.g. "component-a1b2c3.tsx.ejs"); the
    // loader dehashes by stripping the "-<hash>." segment.
    const missingPath = join(dir, "component.tsx.ejs");
    (globalThis as { Bun?: unknown }).Bun = {
      embeddedFiles: [
        Object.assign(new Blob(["EMBEDDED CONTENT"]), {
          name: "component-a1b2c3d4.tsx.ejs",
        }),
      ],
    };

    const result = await loadTemplate(missingPath);

    expect(result.content).toBe("EMBEDDED CONTENT");
    expect(result.source).toBe(missingPath);
  });

  it("returns the disk content even when an embedded blob also exists", async () => {
    const path = join(dir, "types.ts.ejs");
    writeFileSync(path, "DISK WINS");
    (globalThis as { Bun?: unknown }).Bun = {
      embeddedFiles: [
        Object.assign(new Blob(["EMBEDDED"]), {
          name: "types-deadbeef.ts.ejs",
        }),
      ],
    };

    const result = await loadTemplate(path);

    expect(result.content).toBe("DISK WINS");
  });

  // A total miss (no disk file, no matching embedded blob) must fail loud:
  // callers await this for required templates and do not guard against empty
  // content, so a silent "" would generate blank files (notably in a compiled
  // binary, where the disk read always fails).
  it("throws on a total miss (no disk, no embedded match)", async () => {
    const missingPath = join(dir, "nonexistent.ejs");

    await expect(loadTemplate(missingPath)).rejects.toThrow(
      /Template not found/,
    );
  });

  it("throws when an embedded blob exists but none matches the basename", async () => {
    const missingPath = join(dir, "wanted.ejs");
    (globalThis as { Bun?: unknown }).Bun = {
      embeddedFiles: [
        Object.assign(new Blob(["x"]), { name: "other-cafef00d.ejs" }),
      ],
    };

    await expect(loadTemplate(missingPath)).rejects.toThrow(
      /Template not found/,
    );
  });
});
