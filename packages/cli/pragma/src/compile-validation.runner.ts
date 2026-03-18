/**
 * E1 WASM Embedding Validation — Compile Test Runner
 *
 * Compiles the pragma validation binary via `bun build --compile`, executes it,
 * and verifies that Oxigraph WASM loads and queries correctly inside the
 * compiled executable.
 *
 * Run: `bun run src/compile-validation.test.ts`
 *
 * @note This file is impure — it spawns processes, writes to disk, and reads
 * process output. It is a build validation script, not a unit test.
 */

import { existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const PRAGMA_ROOT = join(import.meta.dir, "..");
const DIST_DIR = join(PRAGMA_ROOT, "dist");
const VALIDATION_ENTRY = join(PRAGMA_ROOT, "src", "compile-validation.ts");
const BINARY_PATH = join(DIST_DIR, "pragma-validate");

async function main() {
  console.log("=== E1 WASM Embedding Validation ===\n");
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Platform: ${process.platform}-${process.arch}\n`);

  // --- Step 1: Compile ---
  console.log("[1/4] Compiling validation binary...");
  mkdirSync(DIST_DIR, { recursive: true });

  const compileStart = performance.now();
  const compileResult =
    await $`bun build --compile --minify ${VALIDATION_ENTRY} --outfile ${BINARY_PATH}`.quiet();
  const compileTime = performance.now() - compileStart;

  if (compileResult.exitCode !== 0) {
    console.error("  COMPILE FAILED:");
    console.error(compileResult.stderr.toString());
    process.exit(1);
  }
  console.log(`  Compiled in ${compileTime.toFixed(0)}ms`);

  // --- Step 2: Check binary ---
  console.log("\n[2/4] Checking binary...");
  if (!existsSync(BINARY_PATH)) {
    console.error("  Binary not found at", BINARY_PATH);
    process.exit(1);
  }
  const binarySize = statSync(BINARY_PATH).size;
  console.log(`  Binary size: ${(binarySize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  Path: ${BINARY_PATH}`);

  // --- Step 3: Run binary ---
  console.log("\n[3/4] Running compiled binary...");
  const runStart = performance.now();
  const runResult = await $`${BINARY_PATH}`.quiet().nothrow();
  const runTime = performance.now() - runStart;

  const stdout = runResult.stdout.toString();
  const stderr = runResult.stderr.toString();

  if (stdout) console.log(stdout.trim());
  if (stderr) console.error(stderr.trim());

  // --- Step 4: Validate output ---
  console.log("\n[4/4] Validating results...");

  const checks = [
    {
      name: "Exit code is 0",
      pass: runResult.exitCode === 0,
      detail: `exit code: ${runResult.exitCode}`,
    },
    {
      name: "WASM loaded",
      pass: stdout.includes("[validate] WASM loaded"),
      detail: "oxigraph dynamic import succeeded",
    },
    {
      name: "Store created",
      pass: stdout.includes("[validate] Store created"),
      detail: "createStore() completed",
    },
    {
      name: "Query executed",
      pass: stdout.includes("[validate] Query returned"),
      detail: "SPARQL SELECT ran successfully",
    },
    {
      name: "Correct results",
      pass: stdout.includes('"Alice"') && stdout.includes('"Bob"'),
      detail: "expected bindings present",
    },
    {
      name: "All checks passed marker",
      pass: stdout.includes("[validate] ALL CHECKS PASSED"),
      detail: "internal validation succeeded",
    },
  ];

  let allPassed = true;
  for (const check of checks) {
    const status = check.pass ? "PASS" : "FAIL";
    console.log(`  [${status}] ${check.name} — ${check.detail}`);
    if (!check.pass) allPassed = false;
  }

  // --- Summary ---
  console.log("\n=== Summary ===");
  console.log(`Binary size:    ${(binarySize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Compile time:   ${compileTime.toFixed(0)}ms`);
  console.log(`Runtime:        ${runTime.toFixed(0)}ms`);
  console.log(`Platform:       ${process.platform}-${process.arch}`);
  console.log(`Bun version:    ${Bun.version}`);
  console.log(`Result:         ${allPassed ? "SUCCESS" : "FAILED"}`);

  // --- Cleanup ---
  rmSync(BINARY_PATH, { force: true });

  if (!allPassed) {
    process.exit(1);
  }

  console.log(
    "\nConclusion: Oxigraph WASM embeds correctly in `bun build --compile`.",
  );
  console.log("Strategy DI.02 option 1 (manual WASM embedding) is NOT needed.");
  console.log(
    "Bun 1.3.9+ handles WASM embedding automatically via its bundler.",
  );
}

main().catch((err) => {
  console.error("Validation runner failed:", err);
  process.exit(1);
});
