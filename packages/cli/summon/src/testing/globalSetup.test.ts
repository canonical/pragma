/**
 * Unit pins for the gate's per-root build-or-destroy wrapper — the loop's
 * one confirmed false-green producer (round 12), previously guarded by
 * nothing: a dropped rmSync (restoring the false green) or a restored
 * destroy-on-spawn-error (deleting a good dist the builder never touched)
 * stayed invisible to every suite until a real CI build failed. Drives the
 * EXPORTED wrapper in a tmpdir with an injected runner — no real builds,
 * no subprocesses. TWIN: cli/pragma's perf globalSetup.test.ts pins the
 * sibling copy the same way.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDistOrDestroy } from "./globalSetup.js";

describe("buildDistOrDestroy — the per-root build-or-destroy wrapper", () => {
  let root: string;
  let artifact: string;
  // The wrapper judges freshness only UNDER the lock; always-stale makes
  // every cell take the build path.
  const stale = (): boolean => false;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "gate-wrapper-"));
    mkdirSync(join(root, "dist", "esm"), { recursive: true });
    artifact = join(root, "dist", "esm", "index.js");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it("a build that RAN and failed destroys the artifact it emitted — the round-12 rule", () => {
    expect(() =>
      buildDistOrDestroy(root, artifact, stale, () => {
        // tsc's failure shape: EMIT the served entry, then exit nonzero
        // (nothing sets noEmitOnError).
        writeFileSync(artifact, "// compiled from erroring sources\n");
        return { status: 2, stdout: "out", stderr: "err" };
      }),
    ).toThrowError(
      `summon globalSetup: failed to build ${root}'s dist:\nouterr`,
    );
    // The destroy: a fresh-looking dist compiled from erroring sources
    // must read STALE to the contender's re-stat and every later run.
    expect(existsSync(artifact)).toBe(false);
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });

  it("a builder that never STARTED preserves the previous good artifact and names the spawn error", () => {
    writeFileSync(artifact, "// previous good generation\n");
    expect(() =>
      buildDistOrDestroy(root, artifact, stale, () => ({
        // spawnSync's spawn-failure shape (ENOENT/EACCES): status unset,
        // both streams null, the reason ONLY in `error`.
        status: undefined,
        stdout: null,
        stderr: null,
        error: new Error("spawn bun ENOENT"),
      })),
    ).toThrowError(
      `summon globalSetup: failed to RUN the build for ${root}: spawn bun ENOENT`,
    );
    // Nothing ran, so nothing was emitted: the dist on disk is still the
    // previous good generation — pre-fix this was destroyed and the
    // message interpolated the null streams as `nullnull`.
    expect(readFileSync(artifact, "utf-8")).toBe(
      "// previous good generation\n",
    );
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });

  it("success leaves the artifact as built — no destroy, no lock residue", () => {
    buildDistOrDestroy(root, artifact, stale, () => {
      writeFileSync(artifact, "// good generation\n");
      return { status: 0, stdout: "", stderr: "" };
    });
    expect(readFileSync(artifact, "utf-8")).toBe("// good generation\n");
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });

  it("a FRESH root's lock cycle never invokes the runner and never moves the artifact's parent-dir mtime chain", () => {
    writeFileSync(artifact, "// previous good generation\n");
    // Pin the watched dirs to a past instant: any directory mutation inside
    // them — e.g. a lockfile created and unlinked beside the artifact, the
    // round-14 regression that marked the sibling gate's `dist/pragma`
    // stale on EVERY run — moves them to NOW and fails the equality below.
    // The lock must live at the ROOT, whose own mtime no freshness rule
    // reads.
    const watched = [join(root, "dist"), join(root, "dist", "esm")];
    const past = new Date(Date.now() - 60_000);
    for (const dir of watched) {
      utimesSync(dir, past, past);
    }
    const before = watched.map((dir) => statSync(dir).mtimeMs);
    let invoked = false;
    buildDistOrDestroy(
      root,
      artifact,
      () => true,
      () => {
        invoked = true;
        return { status: 0, stdout: "", stderr: "" };
      },
    );
    expect(invoked).toBe(false);
    expect(watched.map((dir) => statSync(dir).mtimeMs)).toEqual(before);
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });
});
