/**
 * `setup mcp` — register the pragma MCP server in detected AI harnesses.
 *
 * Split into `detectMcp` (harness detection runs FOR REAL up front, via
 * `runTask` over safe reads, so the wizard recap and a `--dry-run` describe
 * writes against the TRUE harness set) and `composeMcp` (a pure, re-runnable
 * write body driven by the harnesses the user SELECTED — the per-harness confirm
 * is gone; selection now comes from the wizard's multiselect). The covenant
 * sub-verb carries no force-flags, so harness selection is detection-only.
 */

import type { DetectedHarness } from "@canonical/harnesses";
import { info, sequence_, type Task, warn } from "@canonical/task";
import { MCP_SERVER_NAME } from "../../../constants.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";

/** The `writeMcpConfig` Task-builder, captured from the dynamic harness import. */
type WriteMcpConfig = typeof import("@canonical/harnesses").writeMcpConfig;

/**
 * The detected MCP state: the harnesses found, the project root the config is
 * written against, and the (dynamically imported) config-writer the pure
 * `composeMcp` needs synchronously.
 */
export interface McpDetection {
  readonly harnesses: readonly DetectedHarness[];
  readonly cwd: string;
  readonly writeMcpConfig: WriteMcpConfig;
}

/**
 * Detect the AI harnesses present in the project (real reads, up front).
 *
 * @param rt - The per-invocation runtime.
 * @returns The detected harnesses + the writer used to compose config writes.
 * @note Impure — reads the filesystem via `detectHarnesses`.
 */
export async function detectMcp(rt: PragmaRuntime): Promise<McpDetection> {
  const cwd = rt.cwd;
  const [{ detectHarnesses, writeMcpConfig }, { runTask }] = await Promise.all([
    import("@canonical/harnesses"),
    import("@canonical/task/node"),
  ]);
  const harnesses = await runTask(detectHarnesses(cwd));
  return { harnesses, cwd, writeMcpConfig };
}

/**
 * Compose the per-harness config writes for the SELECTED harnesses (pure —
 * re-runnable; builds ABSOLUTE config paths itself).
 *
 * @param d - The detection gathered up front.
 * @param selectedIds - Harness ids the user chose (a subset of `d.harnesses`).
 * @returns A Task that writes the pragma MCP config into each chosen harness.
 */
export function composeMcp(
  d: McpDetection,
  selectedIds: readonly string[],
): Task<void> {
  const chosen = d.harnesses.filter((h) => selectedIds.includes(h.harness.id));
  if (chosen.length === 0) {
    return warn("No AI harnesses selected — nothing to configure.");
  }
  const pragmaMcpConfig = { command: "pragma", args: ["mcp"], cwd: d.cwd };
  // Re-runnable combinators (NOT a single-use `gen`): `execute` interprets the
  // task twice (preview + perform).
  const tasks: Task<unknown>[] = [];
  for (const h of chosen) {
    tasks.push(
      d.writeMcpConfig(h.harness, d.cwd, MCP_SERVER_NAME, pragmaMcpConfig),
    );
    tasks.push(info(`✓ pragma MCP server added to ${h.configPath}`));
  }
  return sequence_(tasks);
}

/** The harness names configured for a given selection (for the result shape). */
export function mcpConfigured(
  d: McpDetection,
  selectedIds: readonly string[],
): string[] {
  return d.harnesses
    .filter((h) => selectedIds.includes(h.harness.id))
    .map((h) => h.harness.name);
}
