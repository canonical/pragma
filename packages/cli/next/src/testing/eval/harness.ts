/**
 * The eval harness — the runner PR4 seeds and PR7 populates.
 *
 * No formal eval harness existed anywhere in the old shell (confirmed — the
 * only `eval` hits there are the config `evaluate` verb, an unrelated
 * homonym). This is new: a minimal, typed runner over a fixture-graph-backed
 * `PragmaRuntime`/`McpHarness`, producing a machine-readable report so both a
 * vitest gate (`eval.test.ts`) and a standalone script (`report.ts`) can drive
 * the SAME cases.
 */

import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { McpHarness } from "../helpers/projectMcp.js";

/** The four eval kinds PR4 seeds; PR7 populates the full MCP matrix on top. */
export type EvalKind = "tool" | "content" | "disclosure" | "prompt";

/** What an eval case's `expect` is handed to probe the system under test. */
export interface EvalEnv {
  /** A booted runtime (default: the embedded pack) for direct verb/query calls. */
  readonly runtime: PragmaRuntime;
  /** An in-process MCP harness over the full live capability catalog. */
  readonly mcp: McpHarness;
}

/**
 * One eval case: a described input/expectation pair. `expect` throws (via
 * `vitest#expect` or a plain assertion) to signal failure — {@link runEvals}
 * catches it and records the case as failed rather than aborting the run.
 */
export interface EvalCase {
  /** A stable, distinct id (used in the report and the golden). */
  readonly id: string;
  readonly kind: EvalKind;
  /** A short human-readable description of what's being evaluated (for the report). */
  readonly input: string;
  expect(env: EvalEnv): void | Promise<void>;
}

/** One case's outcome. */
export interface EvalCaseResult {
  readonly id: string;
  readonly kind: EvalKind;
  readonly input: string;
  readonly passed: boolean;
  /** The failure message, when `passed` is false. */
  readonly detail?: string;
}

/** The full report: pass/fail counts plus every case's outcome. */
export interface EvalReport {
  readonly passed: number;
  readonly failed: number;
  readonly cases: readonly EvalCaseResult[];
}

/**
 * Run every case against the shared env, collecting pass/fail — never
 * throwing (a failing case is recorded, not fatal to the run).
 *
 * @param cases - The eval cases to run.
 * @param env - The shared runtime/mcp handles cases probe.
 * @returns The aggregate report.
 */
export async function runEvals(
  cases: readonly EvalCase[],
  env: EvalEnv,
): Promise<EvalReport> {
  const results: EvalCaseResult[] = [];
  for (const evalCase of cases) {
    try {
      await evalCase.expect(env);
      results.push({
        id: evalCase.id,
        kind: evalCase.kind,
        input: evalCase.input,
        passed: true,
      });
    } catch (error) {
      results.push({
        id: evalCase.id,
        kind: evalCase.kind,
        input: evalCase.input,
        passed: false,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const passed = results.filter((result) => result.passed).length;
  return { passed, failed: results.length - passed, cases: results };
}
