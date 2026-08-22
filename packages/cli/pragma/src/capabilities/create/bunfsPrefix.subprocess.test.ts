/**
 * PROTECTED — the `/$bunfs` PRECONDITION pin (round-7 F6).
 *
 * Both version walks refuse a compiled-host anchor by testing it against
 * summon-core's `BUNFS_PREFIX` (summon-application's `findInstalledVersion`,
 * summon-package's `findOwnVersion`). Their unit tests hand the anchor in
 * (`"/$bunfs/root"`), which pins the GUARDS but not their precondition: if a
 * bun release changed the virtual-filesystem prefix, `startsWith` would stop
 * matching, both walks would probe the REAL filesystem from inside the
 * binary again — the exact hijack the guards close — and every existing test
 * would stay green, because nothing observes a real compiled module anchor.
 *
 * So this probe compiles a real one: `bun build --compile` over a two-line
 * program that prints `dirname(fileURLToPath(import.meta.url))`, asserted to
 * start with the constant. A toolchain that moves the prefix turns the suite
 * red here, naming the new anchor.
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BUNFS_PREFIX } from "@canonical/summon-core";
import { describe, expect, it } from "vitest";

describe("the compiled virtual-filesystem prefix (PROTECTED)", () => {
  it("a real `bun build --compile` module anchor starts with BUNFS_PREFIX", () => {
    // Temp source + outfile, removed in `finally` — the probe binary must
    // never outlive the test run.
    const dir = mkdtempSync(join(tmpdir(), "pragma-bunfs-probe-"));
    try {
      const src = join(dir, "anchor.ts");
      const out = join(dir, "anchorbin");
      writeFileSync(
        src,
        'import { dirname } from "node:path";\n' +
          'import { fileURLToPath } from "node:url";\n' +
          "process.stdout.write(dirname(fileURLToPath(import.meta.url)));\n",
      );
      execFileSync("bun", ["build", "--compile", src, "--outfile", out], {
        stdio: "pipe",
      });
      const anchor = execFileSync(out, { encoding: "utf-8" });
      expect(anchor.startsWith(BUNFS_PREFIX), `real anchor: ${anchor}`).toBe(
        true,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
