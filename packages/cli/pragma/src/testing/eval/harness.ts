/**
 * The eval harness.
 *
 * A minimal, typed runner over a fixture-graph-backed `PragmaRuntime` and
 * `McpHarness`, producing a machine-readable report. `eval.test.ts` is the ONE
 * driver. There was a standalone `report.ts` too, and the report shape existed
 * so both could run the same cases; it composed 2 of the 4 case sets the gate
 * composes, so it would have passed on a failure the gate catches, and nothing
 * invoked it — it is deleted. The report shape survives on its own merit: it
 * lets the gate report every case's pass/fail instead of aborting at the first.
 * It is the only harness in the tree — the other `eval` hits are the config
 * `evaluate` verb, an unrelated homonym.
 */

import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import type { McpHarness } from "../helpers/projectMcp.js";

/** The four kinds of thing an eval case can put under test. */
type EvalKind = "tool" | "content" | "disclosure" | "prompt";

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
interface EvalReport {
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
