/**
 * The bound wrapper over summon-core's embedded seam: this package's loader
 * is the core loader under the `component/` prefix, sharing the core store.
 * The seam's own behavior (disk-first, qualified-key fallback, collision
 * safety, hard miss) is tested in summon-core; what is pinned HERE is the
 * binding — the prefix, and that the store a host fills through summon-core's
 * `setEmbeddedTemplates` is the one this loader reads.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setEmbeddedTemplates } from "@canonical/summon-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import loadTemplate, { loadTemplateSync } from "./loadTemplate.js";

describe("loadTemplate (component binding)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "component-load-template-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    setEmbeddedTemplates({});
  });

  it("resolves embedded entries under the component/ prefix", async () => {
    const missing = join(dir, "templates", "react", "types.ts.ejs");
    setEmbeddedTemplates({ "component/react/types.ts.ejs": "EMBEDDED" });
    expect(loadTemplateSync(missing)).toEqual({
      source: missing,
      content: "EMBEDDED",
    });
    await expect(loadTemplate(missing)).resolves.toEqual({
      source: missing,
      content: "EMBEDDED",
    });
  });

  it("a miss names the component-qualified key", () => {
    const missing = join(dir, "templates", "react", "wanted.ejs");
    setEmbeddedTemplates({});
    expect(() => loadTemplateSync(missing)).toThrow(
      /no embedded template for 'component\/react\/wanted\.ejs'/,
    );
  });
});
