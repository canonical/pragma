import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { embeddedManifest } from "./graphpack/embedded.js";

/**
 * The store-boot path at the PROCESS BOUNDARY: whether oxigraph's WASM and the
 * embedded pack actually load from the shipped artifact. vitest's in-process
 * suite cannot catch this — it imports the source tree directly, so a break in
 * how the emit resolves the WASM or the inlined pack would leave it green while
 * every store-backed command failed for a consumer.
 *
 * It used to compile a `bun build --compile` binary and spawn that, because the
 * shipped artifact WAS that binary and the question was whether the WASM
 * survived embedding. The package now ships emitted JavaScript, so the same
 * guard points at the same place it always did — what a consumer runs — which is
 * `node dist/src/bin.js`. Compiling a binary here would test an artifact nobody
 * receives.
 *
 * Every spawn runs in a scratch cwd with `HOME` and all three XDG roots inside
 * it, so anything the CLI answers it answered from its own shipped state.
 */
let workdir: string;

/** The shipped entry, provisioned by `testing/perf/globalSetup.ts`. */
const shippedEntry = fileURLToPath(
  new URL("../../../dist/src/bin.js", import.meta.url),
);

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), "pragma-wasm-smoke-"));
});

afterAll(() => {
  rmSync(workdir, { recursive: true, force: true });
});

/** Run the shipped entry in a scratch cwd with isolated XDG dirs (no real
 * config, cache or state) — anything it answers, it answered from itself. */
const runBinary = (args: string[]) =>
  spawnSync(process.execPath, [shippedEntry, ...args], {
    cwd: workdir,
    stdio: "pipe",
    encoding: "utf-8",
    env: {
      ...process.env,
      HOME: workdir,
      XDG_CACHE_HOME: join(workdir, "cache"),
      XDG_STATE_HOME: join(workdir, "state"),
      XDG_CONFIG_HOME: join(workdir, "config"),
    },
  });

describe("oxigraph WASM + embedded pack load from the shipped entry (PROTECTED)", () => {
  it("the shipped entry boots the embedded store via __store-probe (needsStore path)", () => {
    const run = runBinary(["__store-probe"]);
    expect(run.status, run.stderr).toBe(0);
    const out = JSON.parse(run.stdout.trim()) as {
      ok: boolean;
      entities: number;
      triples: string;
    };
    expect(out.ok).toBe(true);
    // Worth asserting only across the process boundary: the store booted from
    // the inlined `data.nq` must hold exactly what the committed
    // `manifest.json` claims was built into it.
    expect(Number(out.triples)).toBe(embeddedManifest().tripleCount);
    expect(out.entities).toBeGreaterThan(0);
  });

  it("the shipped entry runs storeless sources status", () => {
    const run = runBinary(["sources", "status", "--format", "json"]);
    expect(run.status, run.stderr).toBe(0);
    const envelope = JSON.parse(run.stdout.trim()) as {
      ok: boolean;
      data: { store: string };
    };
    expect(envelope.ok).toBe(true);
    // A fresh install: nothing built here, so the embedded pack answers reads.
    expect(envelope.data.store).toBe("embedded");
  });

  // Regression guard: `sources update` walks a package's TTL directories with
  // `node:fs` globSync, whose `**` handling has broken under a shipped runtime
  // before (returning bogus paths) where the in-process suite stayed green — so
  // exercise it through the real entry. This case also writes a real
  // `pragma.config.ts`, which the shipped entry loads through node's TypeScript
  // type stripping: the one test that exercises that path end-to-end.
  it("the shipped entry runs sources update end-to-end (build + point + status)", () => {
    const pkg = join(workdir, "pkg");
    const proj = join(workdir, "proj");
    mkdirSync(join(pkg, "definitions"), { recursive: true });
    mkdirSync(proj, { recursive: true });
    writeFileSync(
      join(pkg, "definitions", "w.ttl"),
      `@prefix ex: <https://ex.test/#> .
@prefix owl: <http://www.w3.org/2002/07/owl#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
ex:Widget a owl:Class ; rdfs:label "Widget" .
ex:one a ex:Widget ; rdfs:label "One" .
`,
    );
    writeFileSync(
      join(proj, "pragma.config.ts"),
      `export default { packs: [{ name: "pkg-a", source: "file://${pkg}" }] };\n`,
    );

    const env = {
      HOME: workdir,
      XDG_CACHE_HOME: join(workdir, "cache"),
      XDG_STATE_HOME: join(workdir, "state"),
      XDG_CONFIG_HOME: join(workdir, "config"),
    };
    const inProj = (args: string[]) =>
      spawnSync(process.execPath, [shippedEntry, ...args], {
        cwd: proj,
        stdio: "pipe",
        encoding: "utf-8",
        env: { ...process.env, ...env },
      });

    const update = inProj(["sources", "update", "--yes", "--format", "json"]);
    expect(update.status, update.stderr).toBe(0);
    const built = (
      JSON.parse(update.stdout.trim()) as {
        data: { contentHash: string };
      }
    ).data.contentHash;
    expect(built).toMatch(/^[0-9a-f]{64}$/);

    const status = inProj(["sources", "status", "--format", "json"]);
    const envelope = JSON.parse(status.stdout.trim()) as {
      data: { store: string; contentHash: string; entityCount: number };
    };
    // The project now reads its OWN pack — the one the update just built.
    expect(envelope.data.store).toBe("built");
    expect(envelope.data.contentHash).toBe(built);
    // Distinct abox subjects: the one individual (ex:one). The ex:Widget class
    // is tbox schema, not an entity — the raw entity count would double this (A1).
    expect(envelope.data.entityCount).toBe(1);
  });
});
