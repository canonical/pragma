import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The store-boot path only fully lives in the standalone binary: this is the
 * one thing vitest's in-process suite cannot catch — whether oxigraph's WASM
 * and the embedded pack survive `bun build --compile`. So compile a fresh
 * binary from the current source and spawn it. If the WASM did not embed, the
 * probe crashes and this fails loudly (rather than the compiled CLI silently
 * failing every store-backed command in production).
 */
const packageRoot = fileURLToPath(new URL("../../../", import.meta.url));

let workdir: string;
let binary: string;

beforeAll(() => {
  workdir = mkdtempSync(join(tmpdir(), "pragma-wasm-smoke-"));
  binary = join(workdir, "pragma-smoke");
  const build = spawnSync(
    "bun",
    [
      "build",
      "--compile",
      "--target=bun-linux-x64",
      "src/bin.ts",
      "--outfile",
      binary,
    ],
    { cwd: packageRoot, stdio: "pipe", encoding: "utf-8" },
  );
  if (build.status !== 0) {
    throw new Error(`smoke build failed:\n${build.stderr}`);
  }
}, 120_000);

afterAll(() => {
  rmSync(workdir, { recursive: true, force: true });
});

/** Run the compiled binary in a scratch cwd with isolated XDG dirs (no local
 * node_modules, no real cache) — proves the binary is self-contained. */
const runBinary = (args: string[]) =>
  spawnSync(binary, args, {
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

describe("oxigraph WASM + embedded pack embed in the compiled binary (PROTECTED)", () => {
  it("dist binary boots the embedded store via __store-probe (needsStore path)", () => {
    const run = runBinary(["__store-probe"]);
    expect(run.status, run.stderr).toBe(0);
    const out = JSON.parse(run.stdout.trim()) as {
      ok: boolean;
      entities: number;
      triples: string;
    };
    expect(out.ok).toBe(true);
    expect(out.entities).toBe(6);
    expect(Number(out.triples)).toBeGreaterThan(0);
  });

  it("dist binary runs storeless sources status", () => {
    const run = runBinary(["sources", "status", "--format", "json"]);
    expect(run.status, run.stderr).toBe(0);
    const envelope = JSON.parse(run.stdout.trim()) as {
      ok: boolean;
      data: { lockPresent: boolean; cached: boolean };
    };
    expect(envelope.ok).toBe(true);
    // A fresh install: no lock, store not yet built.
    expect(envelope.data.lockPresent).toBe(false);
    expect(envelope.data.cached).toBe(false);
  });

  // Regression guard: `sources update` walks a package's TTL directories. The
  // compiled binary's node:fs globSync mishandles `**` (returns bogus paths),
  // which the in-process suite could not catch — so exercise the real binary.
  it("dist binary runs sources update end-to-end (build + lock + status)", () => {
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
      `export default { packages: [{ name: "pkg-a", source: "file://${pkg}" }] };\n`,
    );

    const env = {
      HOME: workdir,
      XDG_CACHE_HOME: join(workdir, "cache"),
      XDG_STATE_HOME: join(workdir, "state"),
      XDG_CONFIG_HOME: join(workdir, "config"),
    };
    const inProj = (args: string[]) =>
      spawnSync(binary, args, {
        cwd: proj,
        stdio: "pipe",
        encoding: "utf-8",
        env: { ...process.env, ...env },
      });

    const update = inProj(["sources", "update", "--yes", "--format", "json"]);
    expect(update.status, update.stderr).toBe(0);
    expect(existsSync(join(proj, "pragma.lock.json"))).toBe(true);

    const status = inProj(["sources", "status", "--format", "json"]);
    const envelope = JSON.parse(status.stdout.trim()) as {
      data: { lockPresent: boolean; cached: boolean; entityCount: number };
    };
    expect(envelope.data.lockPresent).toBe(true);
    expect(envelope.data.cached).toBe(true);
    expect(envelope.data.entityCount).toBe(2);
  });
});
