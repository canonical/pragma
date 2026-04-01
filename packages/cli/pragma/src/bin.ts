#!/usr/bin/env bun
/**
 * CLI entry point for `pragma`.
 *
 * Detects local vs global install, warns if shadowed, then delegates
 * to the pipeline orchestrator.
 *
 * @note Impure
 */

import "./embedWasm.js";
import { detectLocalInstall } from "./package-manager/index.js";
import runCli from "./pipeline/runCli.js";

const localWarning = detectLocalInstall();
if (localWarning) {
  console.warn(localWarning);
}

await runCli(process.argv);
