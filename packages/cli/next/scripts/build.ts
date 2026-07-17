/**
 * Build script for the `pragma2` compiled binary.
 *
 * Compiles the CLI entry (`src/bin.ts`) into a standalone executable with
 * `Bun.build({ compile })`. The v2 kernel is storeless in PR1 — no TTL
 * graphs, skills, or templates to embed — so asset discovery is intentionally
 * absent; it returns when the first store-backed capability lands.
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
