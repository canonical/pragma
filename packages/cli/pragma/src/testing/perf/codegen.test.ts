/**
 * Unit pins for the committed-codegen CHECK seam (`scripts/codegen.ts`) —
 * the mechanism behind two loop MAJORs: a gate's build must COMPARE the two
 * committed generated modules and fail on staleness instead of silently
 * repairing them before the PROTECTED drift guards (create.test.ts's
 * projection-fidelity and reader-derivability cells) read them. Before
 * these cells the whole seam was two unpinned lines (build.ts reading
 * PRAGMA_BUILD_SKIP_DOCS; the gate spawn beside this file setting it) whose
 * silent loss every suite survived green. The cells drive the EXPORTED
 * generators with an injected `out` in a tmpdir — no spawn, no build, no
 * repo write; the third pins the seam's one ruled TOLERANCE: a difference
 * confined to the manifest's PACKAGE_VERSIONS block (a workspace version
 * bump's expected residue, which no release step rebuilds) must NOT fail
 * check mode — it logs a notice and is repaired by the next developer
 * `bun run build`.
 */

import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  generateCreateSurface,
  generateTemplateManifest,
} from "../../../scripts/codegen.js";

const SURFACE_COMMITTED = fileURLToPath(
  new URL(
    "../../capabilities/create/createSurface.generated.ts",
    import.meta.url,
  ),
);
const MANIFEST_COMMITTED = fileURLToPath(
  new URL(
    "../../capabilities/create/templates.embedded.generated.ts",
    import.meta.url,
  ),
);

describe("the committed-codegen CHECK seam (scripts/codegen.ts)", () => {
  let surfaceOut: string;
  let manifestOut: string;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "codegen-check-"));
    surfaceOut = join(dir, "createSurface.generated.ts");
    manifestOut = join(dir, "templates.embedded.generated.ts");
    copyFileSync(SURFACE_COMMITTED, surfaceOut);
    copyFileSync(MANIFEST_COMMITTED, manifestOut);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("check mode over the committed bytes: green, nothing written — the healthy-tree gate", () => {
    // Seeded with the bytes git holds, check mode must compute NO change on
    // either module (this is also the healthy gate build's determinism: a
    // fresh render equals the committed bytes) and must never write.
    const before = [
      readFileSync(surfaceOut, "utf-8"),
      readFileSync(manifestOut, "utf-8"),
    ];
    const surface = generateCreateSurface({ check: true, out: surfaceOut });
    expect(surface.changed).toBe(false);
    expect(surface.surfaced).toBeGreaterThan(0);
    const manifest = generateTemplateManifest({
      check: true,
      out: manifestOut,
    });
    expect(Object.keys(manifest).length).toBeGreaterThan(0);
    expect(readFileSync(surfaceOut, "utf-8")).toBe(before[0]);
    expect(readFileSync(manifestOut, "utf-8")).toBe(before[1]);
  });

  it("a stale module (surface / TEMPLATES class) throws naming itself and writes nothing", () => {
    // Surface: the check is the FULL module bytes — any drift fails.
    const surfaceStaled = `${readFileSync(surfaceOut, "utf-8")}\n// one generation behind\n`;
    writeFileSync(surfaceOut, surfaceStaled);
    expect(() =>
      generateCreateSurface({ check: true, out: surfaceOut }),
    ).toThrowError(/createSurface\.generated\.ts is STALE/);
    expect(readFileSync(surfaceOut, "utf-8")).toBe(surfaceStaled);

    // Manifest: drift INSIDE the TEMPLATES half (its first entry gains
    // bytes) fails naming the module…
    const manifestCommitted = readFileSync(manifestOut, "utf-8");
    const templatesStaled = manifestCommitted.replace('": "', '": "DRIFT ');
    writeFileSync(manifestOut, templatesStaled);
    expect(() =>
      generateTemplateManifest({ check: true, out: manifestOut }),
    ).toThrowError(/templates\.embedded\.generated\.ts is STALE/);
    expect(readFileSync(manifestOut, "utf-8")).toBe(templatesStaled);

    // …and a stale versions block must NOT mask it: both halves stale is
    // still the TEMPLATES failure, not the cell-below tolerance.
    const versionsAt = templatesStaled.indexOf("export const PACKAGE_VERSIONS");
    expect(versionsAt).toBeGreaterThan(0);
    const bothStaled =
      templatesStaled.slice(0, versionsAt) +
      templatesStaled.slice(versionsAt).replace(': "', ': "9');
    writeFileSync(manifestOut, bothStaled);
    expect(() =>
      generateTemplateManifest({ check: true, out: manifestOut }),
    ).toThrowError(/committed TEMPLATES no longer match/);
    expect(readFileSync(manifestOut, "utf-8")).toBe(bothStaled);
  });

  it("versions-only manifest staleness does NOT throw in check mode — a workspace bump must not redden the gate", () => {
    // Stage exactly a bump's residue: the first version value inside the
    // PACKAGE_VERSIONS block gains a digit; every byte of the TEMPLATES
    // half stays as committed. Check mode logs the notice, throws nothing,
    // and writes nothing — the staleness survives for the next developer
    // `bun run build` (write mode) to repair.
    const committed = readFileSync(manifestOut, "utf-8");
    const versionsAt = committed.indexOf("export const PACKAGE_VERSIONS");
    expect(versionsAt).toBeGreaterThan(0);
    const staled =
      committed.slice(0, versionsAt) +
      committed.slice(versionsAt).replace(': "', ': "9');
    expect(staled).not.toBe(committed);
    writeFileSync(manifestOut, staled);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    expect(() =>
      generateTemplateManifest({ check: true, out: manifestOut }),
    ).not.toThrow();
    expect(log.mock.calls.flat().join("\n")).toContain(
      "stale PACKAGE_VERSIONS block",
    );
    expect(readFileSync(manifestOut, "utf-8")).toBe(staled);
  });
});
