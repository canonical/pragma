/**
 * Unit pins for the gate's per-root build-or-destroy wrapper — the loop's
 * one confirmed false-green producer (round 12), previously guarded by
 * nothing: a dropped rmSync (restoring the false green) or a restored
 * destroy-on-spawn-error (deleting a good dist the builder never touched)
 * stayed invisible to every suite until a real CI build failed. Drives the
 * EXPORTED wrapper in a tmpdir with an injected runner — no real builds,
 * no subprocesses. TWIN: cli/summon's globalSetup.test.ts pins the sibling
 * copy the same way.
 */

import { spawn } from "node:child_process";
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
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildDistOrDestroy, TEMPLATE_COPIER } from "./globalSetup.js";

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
        return { status: 2, signal: null, stdout: "out", stderr: "err" };
      }),
    ).toThrowError(`perf globalSetup: failed to build ${root}'s dist:\nouterr`);
    // The destroy: a fresh-looking dist compiled from erroring sources
    // must read STALE to the contender's re-stat and every later run.
    expect(existsSync(artifact)).toBe(false);
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });

  it("a builder that never STARTED preserves the previous good artifact and names the spawn error", () => {
    writeFileSync(artifact, "// previous good generation\n");
    expect(() =>
      buildDistOrDestroy(root, artifact, stale, () => ({
        // spawnSync's spawn-failure shape with NO child (ENOENT/EACCES):
        // status unset, signal null (no child was ever killed), both
        // streams null, the reason ONLY in `error`. NOT the only
        // `error`-carrying shape — spawnSync's own kills of a RUNNING
        // child set `error` too, WITH a signal (the cell below).
        status: undefined,
        signal: null,
        stdout: null,
        stderr: null,
        error: new Error("spawn bun ENOENT"),
      })),
    ).toThrowError(
      `perf globalSetup: failed to RUN the build for ${root}: spawn bun ENOENT`,
    );
    // No child ever ran, so nothing was emitted: the dist on disk is
    // still the previous good generation — pre-fix this was destroyed
    // and the message interpolated the null streams as `nullnull`.
    expect(readFileSync(artifact, "utf-8")).toBe(
      "// previous good generation\n",
    );
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });

  it("a build KILLED mid-run destroys what it emitted — `error` alone is not `never started`", () => {
    expect(() =>
      buildDistOrDestroy(root, artifact, stale, () => {
        // spawnSync's OWN kill of a running child (ENOBUFS at a
        // maxBuffer cap, or a timeout): the child RAN, emitted the
        // entry, and was then SIGTERMed — `status` null, `signal` set,
        // `error` set, a stream captured. Pre-fix the error-first
        // branch read this as "never started" and PRESERVED the
        // poisoned dist, which the next run's stats blessed FRESH: the
        // round-12 false green, reintroduced.
        writeFileSync(artifact, "// compiled from erroring sources\n");
        return {
          status: null,
          signal: "SIGTERM",
          stdout: "1 MiB of diagnostics…",
          stderr: "",
          error: new Error("spawnSync bun ENOBUFS"),
        };
      }),
    ).toThrowError(
      `perf globalSetup: failed to build ${root}'s dist: ` +
        "(killed mid-run: spawnSync bun ENOBUFS)\n1 MiB of diagnostics…",
    );
    // The destroy: the poisoned emit must read STALE to every later run.
    expect(existsSync(artifact)).toBe(false);
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });

  it("success leaves the artifact as built — no destroy, no lock residue", () => {
    buildDistOrDestroy(root, artifact, stale, () => {
      writeFileSync(artifact, "// good generation\n");
      return { status: 0, signal: null, stdout: "", stderr: "" };
    });
    expect(readFileSync(artifact, "utf-8")).toBe("// good generation\n");
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });

  it("a FRESH root's lock cycle never invokes the runner and never moves the artifact's parent-dir mtime chain", () => {
    writeFileSync(artifact, "// previous good generation\n");
    // Pin the watched dirs to a past instant: any directory mutation inside
    // them — e.g. a lockfile created and unlinked beside the artifact, the
    // round-14 regression that marked `dist/pragma` stale on EVERY run —
    // moves them to NOW and fails the equality below. The lock must live at
    // the ROOT, whose own mtime no freshness rule reads.
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
        return { status: 0, signal: null, stdout: "", stderr: "" };
      },
    );
    expect(invoked).toBe(false);
    expect(watched.map((dir) => statSync(dir).mtimeMs)).toEqual(before);
    expect(existsSync(join(root, ".dist-build.lock"))).toBe(false);
  });
});

describe("buildUnderLock contention — a waiter blocks, then re-stats instead of building", () => {
  let root: string;
  let artifact: string;
  let lockPath: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "gate-contention-"));
    mkdirSync(join(root, "dist", "esm"), { recursive: true });
    artifact = join(root, "dist", "esm", "index.js");
    lockPath = join(root, ".dist-build.lock");
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  it("a contender waits out a held lock and blesses the holder's emit without building", async () => {
    // The EEXIST wait path, driven for real across processes: the parent
    // plays the HOLDER (lockfile on disk, build in flight), a bun child
    // plays the CONTENDER — buildDistOrDestroy with an isFresh that stats
    // the artifact and a runner that would drop a marker file. The child
    // must neither build while the lock is held (no concurrent double
    // build) nor build after release (the holder's emit re-stats FRESH) —
    // the marker never appears.
    const marker = join(root, "contender-built");
    const ready = join(root, "contender-ready");
    const driver = join(root, "driver.ts");
    const setupModule = fileURLToPath(
      new URL("./globalSetup.ts", import.meta.url),
    );
    writeFileSync(
      driver,
      [
        `import { existsSync, writeFileSync } from "node:fs";`,
        `import { buildDistOrDestroy } from ${JSON.stringify(setupModule)};`,
        `const [root, artifact, marker, ready] = process.argv.slice(2) as [string, string, string, string];`,
        `writeFileSync(ready, "");`,
        `buildDistOrDestroy(root, artifact, () => existsSync(artifact), () => {`,
        `  writeFileSync(marker, "// built by the contender\\n");`,
        `  return { status: 0, signal: null, stdout: "", stderr: "" };`,
        `});`,
      ].join("\n"),
    );

    // The holder's lock is on disk BEFORE the contender starts.
    writeFileSync(lockPath, "424242\n");
    const child = spawn("bun", [driver, root, artifact, marker, ready], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const exited = new Promise<number | null>((resolve) => {
      child.on("close", (code) => resolve(code));
    });
    let exitCode: number | null | undefined;
    void exited.then((code) => {
      exitCode = code;
    });

    try {
      // Wait for the contender to reach the lock loop (bailing out early —
      // with its stderr — if it dies instead)…
      const deadline = Date.now() + 15_000;
      while (
        !existsSync(ready) &&
        exitCode === undefined &&
        Date.now() < deadline
      ) {
        await sleep(20);
      }
      expect(existsSync(ready), `contender exited ${exitCode}: ${stderr}`).toBe(
        true,
      );

      // …then hold the lock across several poll intervals (LOCK_POLL_MS is
      // 200): the contender must still be waiting — alive, no marker, no
      // concurrent build.
      await sleep(700);
      expect(exitCode).toBeUndefined();
      expect(existsSync(marker)).toBe(false);

      // The holder finishes: emit lands, lock clears. The contender's
      // re-stat (isFresh under/after the wait) must bless the emit and
      // return WITHOUT running its own build.
      writeFileSync(artifact, "// the holder's emit\n");
      rmSync(lockPath);
      expect(await exited).toBe(0);
      expect(existsSync(marker)).toBe(false);
      expect(readFileSync(artifact, "utf-8")).toBe("// the holder's emit\n");
      expect(stderr).toBe("");
    } finally {
      child.kill("SIGKILL");
    }
  }, 30_000);
});

describe("TEMPLATE_COPIER — the watched repo-root constant", () => {
  it("resolves to a real file — a dangling constant would stat 0 and silently un-watch the copier", () => {
    // The gate's isFresh uses `newestMtime(TEMPLATE_COPIER) < built`, and
    // newestMtime returns 0 for a missing path — always true against an
    // existing artifact, i.e. the clause becomes a NO-OP with no red cell.
    // The module also throws at load when the path is missing; this pin
    // fails the suite loudly at the moment a relocation (PRA-138) orphans
    // the constant instead of quietly returning to the round-15 F8 hole.
    expect(existsSync(TEMPLATE_COPIER)).toBe(true);
  });
});
