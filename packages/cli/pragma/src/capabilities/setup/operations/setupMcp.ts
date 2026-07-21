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
 *
 * Detection ALSO reads each group's existing config (via `readMcpConfigFrom`,
 * FOR REAL up front) and classifies every group as `absent` (no pragma entry
 * yet), `configured` (the pragma entry already matches what we'd write), or
 * `drifted` (a pragma entry exists but differs). The wizard shows that prior
 * state in each row and DEFAULT-DESELECTS the already-`configured` files; the
 * write itself stays idempotent (a re-merge of the identical entry is
 * byte-for-byte), so a re-run is a no-op the recap reports as "unchanged" — the
 * same state-awareness `setup skills` has always had.
 */

import type {
  McpServerConfig,
  PlatformEnv,
  TargetGroup,
} from "@canonical/harnesses";
import { info, sequence_, type Task, warn } from "@canonical/task";
import { MCP_SERVER_NAME } from "../../../constants.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type {
  ConfiguredTarget,
  McpTargetState,
  ScopeSelection,
} from "../types.js";

/** The `writeMcpConfigTargets` builder, captured from the dynamic harness import. */
type WriteMcpConfigTargets =
  typeof import("@canonical/harnesses").writeMcpConfigTargets;

/**
 * The detected MCP state: the per-file target groups (already scoped to the
 * requested `--scope`), a by-path map of each group's prior
 * {@link McpTargetState} (read up front), the project root, and the
 * (dynamically imported) target-based writer the pure `composeMcp` needs
 * synchronously. Keeping `groups` a plain {@link TargetGroup}[] leaves every
 * existing `.groups` consumer (path/harnessNames/scope) unchanged; the state
 * rides alongside, keyed by the group's `path`.
 */
export interface McpDetection {
  readonly groups: readonly TargetGroup[];
  readonly stateByPath: ReadonlyMap<string, McpTargetState>;
  readonly cwd: string;
  readonly platform: PlatformEnv;
  readonly writeMcpConfigTargets: WriteMcpConfigTargets;
}

/**
 * The pragma MCP server entry we register — the SINGLE source of truth both the
 * classifier (does the existing entry match this?) and the writer (`composeMcp`)
 * consume, so "already configured" means byte-for-byte what a write would emit.
 *
 * @param cwd - The project root recorded on the entry.
 * @returns The pragma {@link McpServerConfig}.
 */
export function pragmaMcpEntry(cwd: string): McpServerConfig {
  return { command: "pragma", args: ["mcp"], cwd };
}

/**
 * Whether an existing MCP entry equals the pragma entry we would write, over the
 * fields we control (`command`/`args`/`cwd`). A shallow structural compare — a
 * harness that carries extra keys (e.g. `env`) still reads as `configured` as
 * long as our three fields match, so we never churn a file we did not author.
 */
function entryMatches(
  existing: McpServerConfig,
  want: McpServerConfig,
): boolean {
  const sameArgs =
    (existing.args ?? []).length === (want.args ?? []).length &&
    (want.args ?? []).every((a, i) => existing.args?.[i] === a);
  return (
    existing.command === want.command && existing.cwd === want.cwd && sameArgs
  );
}

/**
 * Classify one target group against its on-disk config: `absent` when no pragma
 * entry exists in ANY of the group's writes, `configured` when EVERY write
 * already carries a matching pragma entry, `drifted` otherwise (present in at
 * least one write but not matching everywhere). Reads each write's file for real
 * via `readMcpConfigFrom`.
 *
 * @param group - The target group whose writes to inspect.
 * @param want - The pragma entry a write would emit.
 * @param readMcpConfigFrom - The harness reader (dynamically imported).
 * @param runTask - The node Task interpreter.
 * @returns The group's {@link McpTargetState}.
 * @note Impure — reads each write's config file.
 */
async function classifyGroup(
  group: TargetGroup,
  want: McpServerConfig,
  readMcpConfigFrom: typeof import("@canonical/harnesses").readMcpConfigFrom,
  runTask: typeof import("@canonical/task/node").runTask,
): Promise<McpTargetState> {
  let present = 0;
  let matching = 0;
  for (const write of group.writes) {
    const servers = await runTask(readMcpConfigFrom(write));
    const existing = servers[MCP_SERVER_NAME];
    if (existing === undefined) continue;
    present += 1;
    if (entryMatches(existing, want)) matching += 1;
  }
  if (present === 0) return "absent";
  if (matching === group.writes.length) return "configured";
  return "drifted";
}

/**
 * Detect the AI harnesses present in the project (real reads, up front),
 * resolve+dedup their config targets for the chosen scope, AND read each
 * group's existing config to classify it `absent`/`configured`/`drifted` — so
 * the wizard can show prior state and default-deselect already-`configured`
 * files.
 *
 * @param rt - The per-invocation runtime.
 * @param scope - The resolved `--scope` selection.
 * @returns The scoped target groups, their prior states, + the config writer.
 * @note Impure — reads the filesystem via `detectHarnesses` + `readMcpConfigFrom`.
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
      readMcpConfigFrom,
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

  // Read each group's existing config (for real, up front) so the recap/preview
  // and the default selection reflect true prior state — the same discipline
  // `detectSkills` uses for its per-link create/skip/replace decision.
  const want = pragmaMcpEntry(cwd);
  const stateByPath = new Map<string, McpTargetState>();
  await Promise.all(
    groups.map(async (group) => {
      const state = await classifyGroup(
        group,
        want,
        readMcpConfigFrom,
        runTask,
      );
      stateByPath.set(group.path, state);
    }),
  );

  return { groups, stateByPath, cwd, platform, writeMcpConfigTargets };
}

/**
 * The prior state of a group, defaulting to `absent` for an unknown path (so a
 * caller never has to guard the map lookup).
 */
export function mcpGroupState(d: McpDetection, path: string): McpTargetState {
  return d.stateByPath.get(path) ?? "absent";
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
 * re-runnable; builds ABSOLUTE config paths itself). The prior
 * {@link McpTargetState} drives the manifest MESSAGE (already-configured /
 * updated / added) but NOT whether the write runs: the idempotent
 * read-modify-write is always composed so it carries its `undo` and a re-run is
 * byte-identical when already `configured`. The wizard already default-DESELECTS
 * `configured` files (so they are usually not in `groups` at all); a `configured`
 * file that IS selected is still rewritten idempotently.
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
  const pragmaMcpConfig = pragmaMcpEntry(d.cwd);
  // Re-runnable combinators (NOT a single-use `gen`): `execute` interprets the
  // task twice (preview + perform). One combined write per file keeps a shared
  // file (VS Code + Cline) a single read-modify-write — dry-run safe.
  const tasks: Task<unknown>[] = [];
  for (const group of groups) {
    const state = mcpGroupState(d, group.path);
    const names = group.harnessNames.join(", ");
    tasks.push(
      d.writeMcpConfigTargets(group.writes, MCP_SERVER_NAME, pragmaMcpConfig),
    );
    const verb =
      state === "configured"
        ? "already configured →"
        : state === "drifted"
          ? "updated →"
          : "→";
    tasks.push(
      info(
        `[${group.scope}] pragma MCP server ${verb} ${group.path} (${names})`,
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

/**
 * The per-file {@link ConfiguredTarget}s for a selection (for the result), each
 * carrying its prior {@link McpTargetState} so the recap distinguishes newly
 * added, updated, and already-configured targets.
 */
export function mcpTargets(
  d: McpDetection,
  groups: readonly TargetGroup[],
): ConfiguredTarget[] {
  return groups.map((group) => ({
    name: group.harnessNames.join(", "),
    band: group.scope,
    path: group.path,
    state: mcpGroupState(d, group.path),
  }));
}
