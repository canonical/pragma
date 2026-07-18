#!/usr/bin/env bun
/**
 * Standalone eval runner — `bun run eval` (see package.json).
 *
 * Emits the {@link EvalReport} as JSON to stdout (machine-parseable, matching
 * the CLI's own stdout/stderr discipline) and a Markdown summary to stderr.
 * Exits non-zero when any case failed, so it composes into CI the same way
 * the vitest gate (`eval.test.ts`) does.
 */

import { capabilities } from "../../capabilities/index.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { TEST_FLAGS } from "../helpers/projectCli.js";
import { projectMcp } from "../helpers/projectMcp.js";
import { stableEvalCases } from "./cases/stable.js";
import type { EvalReport } from "./harness.js";
import { runEvals } from "./harness.js";

const KINDS = ["tool", "content", "disclosure", "prompt"] as const;

/** Render the report as a Markdown summary, grouped by kind. */
function toMarkdown(report: EvalReport): string {
  const lines = [
    "# Eval report",
    "",
    `${report.passed} passed, ${report.failed} failed, ${report.cases.length} total.`,
    "",
  ];
  for (const kind of KINDS) {
    const inKind = report.cases.filter((c) => c.kind === kind);
    if (inKind.length === 0) continue;
    lines.push(`## ${kind}`, "");
    for (const c of inKind) {
      lines.push(`- [${c.passed ? "PASS" : "FAIL"}] \`${c.id}\` — ${c.input}`);
      if (!c.passed) lines.push(`  - ${c.detail}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const runtime = bootRuntime(TEST_FLAGS);
  const mcp = await projectMcp(capabilities);
  try {
    const report = await runEvals(stableEvalCases, { runtime, mcp });
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.stderr.write(`${toMarkdown(report)}\n`);
    if (report.failed > 0) process.exitCode = 1;
  } finally {
    await mcp.cleanup();
  }
}

await main();
