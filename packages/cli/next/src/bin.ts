#!/usr/bin/env bun
/**
 * CLI entry point for `pragma2` (v2 kernel).
 *
 * Scaffold body: prints version or a placeholder help banner. The real
 * command tree (lazy commander build, MCP `serve` special-case, dispatch)
 * lands in the CLI/MCP projector commits — this keeps the compiled binary
 * buildable and gives the perf spike a `--help` path to measure from day one.
 *
 * @note Impure — reads argv, writes stdout, sets exit code.
 */

import { BIN_NAME, PROGRAM_DESCRIPTION, VERSION } from "./constants.js";

const argv = process.argv.slice(2);

if (argv.includes("--version") || argv.includes("-v")) {
  process.stdout.write(`${VERSION}\n`);
} else {
  process.stdout.write(
    `${BIN_NAME} — ${PROGRAM_DESCRIPTION}\n\nUsage: ${BIN_NAME} <command> [options]\n`,
  );
}
