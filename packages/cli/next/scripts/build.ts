/**
 * Build script for the `pragma2` compiled binary.
 *
 * Compiles the CLI entry (`src/bin.ts`) into a standalone executable with
 * `Bun.build({ compile })`. The v2 kernel is storeless in PR1 — no TTL
 * graphs, skills, or templates to embed — so asset discovery is intentionally
 * absent; it returns when the first store-backed capability lands.
 *
 * TRACKED DEFERRAL (PR7/PR8) — compiled `create`: `create` reaches summon-core +
 * the generators through a computed-specifier dynamic import (create.verb.ts's
 * `importRuntime`), so bun's `--compile` bundler cannot see them and they stay
 * OUT of this binary. That keeps every non-create fast path's cold-start
 * unchanged, but it means `pragma2 create` cannot run from the shipped binary
 * yet — and even if summon-core were bundled, the generators load their `.ejs`
 * templates from disk (top-level `await loadTemplate`), which are not embedded
 * here either. Until this build embeds those template assets (and resolves a
 * summon-core in the binary), `create` is a source-run feature; the binary path
 * fails gracefully via the gate in create.verb.ts's `loadCreateRuntime` instead
 * of a raw module-resolution error. Unblocking it: embed the generators' `.ejs`
 * assets + add a compiled-binary create smoke test.
 */

const result = await Bun.build({
  entrypoints: ["src/bin.ts"],
  minify: true,
  compile: {
    target: "bun-linux-x64",
    outfile: "dist/pragma2",
  },
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("Built dist/pragma2");
