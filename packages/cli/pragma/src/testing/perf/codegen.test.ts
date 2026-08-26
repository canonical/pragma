/**
 * Unit pins for the committed-codegen CHECK seam (`scripts/codegen.ts`) —
 * the mechanism behind two loop MAJORs: a gate's build must COMPARE the two
 * committed generated modules and fail on staleness instead of silently
 * repairing it before the PROTECTED drift guard (create.test.ts's
 * projection-fidelity cell) reads it. The generator cell drives the EXPORTED
 * generator with an injected `out` in a tmpdir — no spawn, no build, no repo
 * write. The wiring cells pin the two halves the
 * seam is made of and the fact that they MEET: the flag's VALUE (the
 * exported GATE_BUILD_ENV) and its READER (the exported
 * checkModeFromEnv). They do NOT pin the two CALL SITES — the gate
 * spawn's `...GATE_BUILD_ENV` spread (perf/globalSetup.ts) and
 * build.ts's `checkModeFromEnv(process.env)` read — which stay pinned by
 * CONSTRUCTION: scripts/build.ts is executed by no test at all, and
 * dropping the spread leaves every cell here green. A refactor that
 * severs either call site still reverts gate builds to write mode
 * silently; only a VALUE or READER change reddens.
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
  checkModeFromEnv,
  generateCreateSurface,
} from "../../../scripts/codegen.js";
import { GATE_BUILD_ENV } from "./globalSetup.js";

const SURFACE_COMMITTED = fileURLToPath(
  new URL(
    "../../capabilities/create/createSurface.generated.ts",
    import.meta.url,
  ),
);
describe("the committed-codegen CHECK seam (scripts/codegen.ts)", () => {
  let surfaceOut: string;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "codegen-check-"));
    surfaceOut = join(dir, "createSurface.generated.ts");
    copyFileSync(SURFACE_COMMITTED, surfaceOut);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("check mode over the committed bytes: green, nothing written, ZERO notices — the healthy-tree gate", () => {
    // Seeded with the bytes git holds, check mode must compute NO change (this
    // is also the healthy gate build's determinism: a fresh render equals the
    // committed bytes), must never write — and must log NOTHING. The
    // zero-notices half is what separates "byte-identical" from "tolerated".
    const before = readFileSync(surfaceOut, "utf-8");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const surface = generateCreateSurface({ check: true, out: surfaceOut });
    expect(surface.changed).toBe(false);
    expect(surface.surfaced).toBeGreaterThan(0);
    expect(log).not.toHaveBeenCalled();
    expect(readFileSync(surfaceOut, "utf-8")).toBe(before);
  });
});

describe("the CHECK seam's wiring (GATE_BUILD_ENV → checkModeFromEnv)", () => {
  it("checkModeFromEnv: exactly the documented flag value flips a build into the gate's check", () => {
    // The READ side of the seam, pinned: build.ts consumes this one-liner
    // over its process.env, so a build enters check mode exactly when the
    // flag is the string "1" — an ordinary developer env (no flag) and a
    // flag EXPLICITLY set to any other value both stay in write mode,
    // where `bun run build` repairs all three committed artifacts. The
    // third case is what makes "exactly" true: a predicate that merely
    // tested for the key's presence, or accepted "0" as well, would pass
    // the first two.
    expect(checkModeFromEnv({ PRAGMA_BUILD_SKIP_DOCS: "1" })).toBe(true);
    expect(checkModeFromEnv({})).toBe(false);
    expect(checkModeFromEnv({ PRAGMA_BUILD_SKIP_DOCS: "0" })).toBe(false);
  });

  it("GATE_BUILD_ENV carries the check-mode flag — the gate spawn's env enters check mode", () => {
    // The SET side of the seam, pinned against the read side: the exported
    // constant IS the object the gate spawn spreads into its child env
    // (perf/globalSetup.ts), and feeding it to checkModeFromEnv proves the
    // VALUE and the READER meet — changing the flag's value, or renaming
    // the key on either side, reddens here. What this cell does NOT see is
    // the spawn's `...GATE_BUILD_ENV` spread itself: dropping that leaves
    // every cell in this file green while gate builds silently revert to
    // write mode (repairing the stale committed tree every drift guard
    // exists to catch), so the call site stays pinned by construction.
    expect(GATE_BUILD_ENV.PRAGMA_BUILD_SKIP_DOCS).toBe("1");
    expect(checkModeFromEnv(GATE_BUILD_ENV)).toBe(true);
  });
});
