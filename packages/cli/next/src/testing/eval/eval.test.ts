/**
 * The eval gate — runs the seed cases as part of `bun run test`, so CI
 * exercises the harness itself, not just the individual case bodies.
 *
 * `env.mcp` is built from the REAL, live `capabilities` array — never a
 * hard-coded noun subset — so this gate automatically grows to cover PR5/6/7's
 * tools as they land, with no edit here (R2 discipline).
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { capabilities } from "../../capabilities/index.js";
import { bootRuntime } from "../../kernel/runtime/boot.js";
import { TEST_FLAGS } from "../helpers/projectCli.js";
import { projectMcp } from "../helpers/projectMcp.js";
import { readNounEvalCases } from "./cases/readNouns.js";
import { stableEvalCases } from "./cases/stable.js";
import { type EvalCaseResult, type EvalEnv, runEvals } from "./harness.js";

const allSeedCases = [...stableEvalCases, ...readNounEvalCases];

/** Strip the (only-populated-on-failure) `detail` so a green report snapshots
 * as pure signal — a failure's message is diagnostic noise in the golden, not
 * something worth pinning byte-for-byte. */
function normalize(
  results: readonly EvalCaseResult[],
): { id: string; kind: string; passed: boolean }[] {
  return [...results]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, kind, passed }) => ({ id, kind, passed }));
}

describe("eval harness — seed gate", () => {
  let env: EvalEnv;
  let cleanup: () => Promise<void>;

  beforeAll(async () => {
    const runtime = bootRuntime(TEST_FLAGS);
    const mcp = await projectMcp(capabilities);
    env = { runtime, mcp };
    cleanup = () => mcp.cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("runs the full seed (stable + read-noun) cases clean", async () => {
    const report = await runEvals(allSeedCases, env);
    if (report.failed > 0) {
      const failures = report.cases.filter((c) => !c.passed);
      throw new Error(
        `${report.failed} eval case(s) failed:\n${failures
          .map((c) => `  - ${c.id}: ${c.detail}`)
          .join("\n")}`,
      );
    }
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(allSeedCases.length);
    // The plan's seed target: ~10-15 representative cases.
    expect(report.cases.length).toBeGreaterThanOrEqual(10);
    expect(report.cases.length).toBeLessThanOrEqual(15);
    expect(normalize(report.cases)).toMatchSnapshot();
  });
});
