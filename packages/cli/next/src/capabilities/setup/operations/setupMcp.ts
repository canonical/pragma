/**
 * `setup mcp` — register the pragma MCP server in detected AI harnesses.
 *
 * Split into `detectMcp` (harness detection runs FOR REAL up front, via
 * `runTask` over safe reads, and the resolved config targets are deduplicated
 * into per-file {@link TargetGroup}s for the chosen `--scope`) and `composeMcp`
 * (a pure, re-runnable write body driven by the SELECTED groups). Each write is
 * a distinct `(path, mcpKey)` so two harnesses sharing a file (VS Code + Cline)
 * each preserve the other; every group emits a band-prefixed `info()` manifest
 * line, so the recap and a `--dry-run` show which band each file belongs to.
 */

import type { PlatformEnv, TargetGroup } from "@canonical/harnesses";
import { info, sequence_, type Task, warn } from "@canonical/task";
import { MCP_SERVER_NAME } from "../../../constants.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { ConfiguredTarget, ScopeSelection } from "../types.js";

/** The `writeMcpConfigTargets` builder, captured from the dynamic harness import. */
type WriteMcpConfigTargets =
  typeof import("@canonical/harnesses").writeMcpConfigTargets;

/**
 * The detected MCP state: the per-file target groups (already scoped to the
 * requested `--scope`), the project root, and the (dynamically imported)
 * target-based writer the pure `composeMcp` needs synchronously.
 */
export interface McpDetection {
  readonly groups: readonly TargetGroup[];
  readonly cwd: string;
  readonly platform: PlatformEnv;
  readonly writeMcpConfigTargets: WriteMcpConfigTargets;
}

/**
 * Detect the AI harnesses present in the project (real reads, up front) and
 * resolve+dedup their config targets for the chosen scope.
 *
 * @param rt - The per-invocation runtime.
 * @param scope - The resolved `--scope` selection.
 * @returns The scoped target groups + the writer used to compose config writes.
 * @note Impure — reads the filesystem via `detectHarnesses`.
 */
export async function detectMcp(
  rt: PragmaRuntime,
  scope: ScopeSelection,
): Promise<McpDetection> {
  const cwd = rt.cwd;
  const [
    {
      detectHarnesses,
      groupTargetsForScope,
      readPlatformEnv,
      writeMcpConfigTargets,
    },
    { runTask },
  ] = await Promise.all([
    import("@canonical/harnesses"),
    import("@canonical/task/node"),
  ]);
  const platform = readPlatformEnv();
  const detected = await runTask(detectHarnesses(cwd, platform));
  const groups = groupTargetsForScope(detected, cwd, scope, platform);
  return { groups, cwd, platform, writeMcpConfigTargets };
}

/** The target groups the user selected (by path), or all when none recorded. */
export function selectedGroups(
  d: McpDetection,
  selectedPaths: readonly string[],
): TargetGroup[] {
  return d.groups.filter((g) => selectedPaths.includes(g.path));
}

/**
 * Compose the per-target config writes for the SELECTED groups (pure —
 * re-runnable; builds ABSOLUTE config paths itself). Every distinct `(path,
 * mcpKey)` is written once; each group emits a band-prefixed manifest line.
 *
 * @param d - The detection gathered up front.
 * @param groups - The target groups the user chose (a subset of `d.groups`).
 * @returns A Task that writes the pragma MCP config into each chosen file.
 */
export function composeMcp(
  d: McpDetection,
  groups: readonly TargetGroup[],
): Task<void> {
  if (groups.length === 0) {
    return warn("No AI harnesses selected — nothing to configure.");
  }
  const pragmaMcpConfig = { command: "pragma", args: ["mcp"], cwd: d.cwd };
  // Re-runnable combinators (NOT a single-use `gen`): `execute` interprets the
  // task twice (preview + perform). One combined write per file keeps a shared
  // file (VS Code + Cline) a single read-modify-write — dry-run safe.
  const tasks: Task<unknown>[] = [];
  for (const group of groups) {
    tasks.push(
      d.writeMcpConfigTargets(group.writes, MCP_SERVER_NAME, pragmaMcpConfig),
    );
    tasks.push(
      info(
        `[${group.scope}] pragma MCP server → ${group.path} (${group.harnessNames.join(", ")})`,
      ),
    );
  }
  return sequence_(tasks);
}

/** The harness names configured across a selection (for the result summary). */
export function mcpConfigured(groups: readonly TargetGroup[]): string[] {
  const names = new Set<string>();
  for (const group of groups) {
    for (const name of group.harnessNames) names.add(name);
  }
  return [...names].sort();
}

/** The per-file {@link ConfiguredTarget}s for a selection (for the result). */
export function mcpTargets(groups: readonly TargetGroup[]): ConfiguredTarget[] {
  return groups.map((group) => ({
    name: group.harnessNames.join(", "),
    band: group.scope,
    path: group.path,
  }));
}
