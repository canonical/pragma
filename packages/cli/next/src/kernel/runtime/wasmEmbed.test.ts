import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
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
  workdir = mkdtempSync(join(tmpdir(), "pragma2-wasm-smoke-"));
  binary = join(workdir, "pragma2-smoke");
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

describe("oxigraph WASM + embedded pack embed in the compiled binary (PROTECTED)", () => {
  it("dist binary boots the embedded store via __store-probe", () => {
    // Run in a scratch cwd with isolated XDG dirs — no local node_modules, no
    // real cache: proves the binary is self-contained.
    const run = spawnSync(binary, ["__store-probe"], {
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
});
