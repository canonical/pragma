/**
 * `setup mcp` — register the pragma MCP server in detected AI harnesses.
 *
 * Split into `detectMcp` (harness detection runs FOR REAL up front, via
 * `runTask` over safe reads, and the resolved config targets are deduplicated
 * into per-file {@link TargetGroup}s for the chosen `--scope`) and `composeMcp`
 * (a pure, re-runnable write body driven by the SELECTED groups). Each write is
 * a distinct `(path, mcpKey)` so two harnesses sharing a file (VS Code + Cline)
 * each preserve the other. What a run SAYS about each file is the plan row's
 * per-file children, not a log line composed here.
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

import { dirname } from "node:path";
import type {
  McpServerConfig,
  PlatformEnv,
  TargetGroup,
} from "@canonical/harnesses";
import { mkdir, sequence_, type Task } from "@canonical/task";
import { MCP_SERVER_NAME } from "../../../constants.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { McpTargetState, ScopeBand } from "../types.js";

/** The `writeMcpConfigTargets` builder, captured from the dynamic harness import. */
type WriteMcpConfigTargets =
  typeof import("@canonical/harnesses").writeMcpConfigTargets;

/** The `removeMcpConfigFrom` builder, captured from the dynamic harness import. */
type RemoveMcpConfigFrom =
  typeof import("@canonical/harnesses").removeMcpConfigFrom;

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
  readonly removeMcpConfigFrom: RemoveMcpConfigFrom;
}

/**
 * The argv a registered harness spawns to reach the server.
 *
 * The server verb is `mcp serve`: `mcp` is the noun, and the noun on its own is
 * not the server entry. An entry still carrying the old single-token `mcp`
 * spawns something that no longer serves, so it must not survive.
 *
 * It does not have to: `mcpEntryMatches` treats `args` as a controlled field,
 * so an entry written before this rename classifies as `drifted` on the very
 * next detection and the ordinary forward write repairs it. That is the whole
 * migration — no flag, no prompt, no compatibility branch — and the run after
 * it converges, because the repaired entry then matches byte for byte.
 */
const MCP_SERVE_ARGV = ["mcp", "serve"] as const;

/**
 * The pragma MCP server entry we register — the SINGLE source of truth both the
 * classifier (does the existing entry match this?) and the writer (`composeMcp`)
 * consume, so "already configured" means byte-for-byte what a write would emit.
 *
 * The entry is BAND-shaped: a project-band entry records the project root as
 * `cwd` (that binding is the point of a per-repo registration), while a
 * global-band entry OMITS `cwd` entirely — a per-user server must not be
 * pinned to whatever directory `setup mcp --global` happened to run from
 * (observed: a global registration from `~/Downloads` permanently served
 * `~/Downloads`, and re-running from repo B "repaired" it to repo B,
 * ping-ponging the machine band between projects). The per-harness
 * serializers already omit an undefined `cwd`, and the matcher treats an
 * omitted controlled field as must-be-absent, so a stale global entry still
 * carrying a `cwd` classifies as `drifted` and converges on the next write.
 *
 * @param cwd - The project root (recorded only on project-band entries).
 * @param band - The config band the entry is written to.
 * @returns The pragma {@link McpServerConfig}.
 */
export function pragmaMcpEntry(cwd: string, band: ScopeBand): McpServerConfig {
  return band === "project"
    ? { command: MCP_SERVER_NAME, args: [...MCP_SERVE_ARGV], cwd }
    : { command: MCP_SERVER_NAME, args: [...MCP_SERVE_ARGV] };
}

/**
 * Classify one target group against its on-disk config: `absent` when no pragma
 * entry exists in ANY of the group's writes, `configured` when EVERY write
 * already carries a matching pragma entry, `drifted` otherwise (present in at
 * least one write but not matching everywhere). Reads each write's file for real
 * via `readMcpConfigFrom`, and matches each raw entry against what THAT write's
 * per-harness serializer would emit for the group's BAND (`mcpEntryMatches`
 * compares the serializer's controlled fields — so a global entry still
 * pinning a `cwd` reads as drifted — and ignores extra keys a harness or user
 * added, so we never churn a file we did not author).
 *
 * @param group - The target group whose writes to inspect.
 * @param want - The canonical pragma entry for the group's band.
 * @param harnessesApi - The dynamically imported harnesses module.
 * @param runTask - The node Task interpreter.
 * @returns The group's {@link McpTargetState}.
 * @note Impure — reads each write's config file.
 */
async function classifyGroup(
  group: TargetGroup,
  want: McpServerConfig,
  harnessesApi: Pick<
    typeof import("@canonical/harnesses"),
    "readMcpConfigFrom" | "mcpEntryMatches"
  >,
  runTask: typeof import("@canonical/task/node").runTask,
): Promise<McpTargetState> {
  let present = 0;
  let matching = 0;
  for (const write of group.writes) {
    const servers = await runTask(harnessesApi.readMcpConfigFrom(write));
    const existing = servers[MCP_SERVER_NAME];
    if (existing === undefined) continue;
    present += 1;
    if (harnessesApi.mcpEntryMatches(existing, want, write.serializeEntry)) {
      matching += 1;
    }
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
 * @param band - The band being planned (global or project).
 * @returns The band's target groups, their prior states, + the config writer.
 * @note Impure — reads the filesystem via `detectHarnesses` + `readMcpConfigFrom`.
 */
export async function detectMcp(
  rt: PragmaRuntime,
  band: ScopeBand,
): Promise<McpDetection> {
  const cwd = rt.cwd;
  const [
    {
      detectHarnesses,
      groupTargetsForScope,
      mcpEntryMatches,
      readMcpConfigFrom,
      readPlatformEnv,
      removeMcpConfigFrom,
      writeMcpConfigTargets,
    },
    { runTask },
  ] = await Promise.all([
    import("@canonical/harnesses"),
    import("@canonical/task/node"),
  ]);
  const platform = readPlatformEnv();
  const detected = await runTask(detectHarnesses(cwd, platform));
  const groups = groupTargetsForScope(detected, cwd, band, platform);

  // Read each group's existing config (for real, up front) so the recap/preview
  // and the default selection reflect true prior state — the same discipline
  // `detectSkills` uses for its per-link create/skip/replace decision. The
  // wanted entry is BAND-shaped (a global entry omits `cwd`), so it is built
  // per group, not once.
  const stateByPath = new Map<string, McpTargetState>();
  await Promise.all(
    groups.map(async (group) => {
      const state = await classifyGroup(
        group,
        pragmaMcpEntry(cwd, group.scope),
        { readMcpConfigFrom, mcpEntryMatches },
        runTask,
      );
      stateByPath.set(group.path, state);
    }),
  );

  return {
    groups,
    stateByPath,
    cwd,
    platform,
    writeMcpConfigTargets,
    removeMcpConfigFrom,
  };
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
 * re-runnable; builds ABSOLUTE config paths itself). An already-`configured`
 * group composes NOTHING: the entry on disk is byte-for-byte what a write would
 * emit, so re-writing it would only move an mtime. Removal no longer depends on
 * the forward plan having written something ({@link composeMcpRemoval}), which
 * is what used to force the redundant write.
 *
 * The task carries no log effects — the plan row owns what the run says.
 *
 * @param d - The detection gathered up front.
 * @param groups - The target groups the user chose (a subset of `d.groups`).
 * @returns A Task that writes the pragma MCP config into each chosen file.
 */
export function composeMcp(
  d: McpDetection,
  groups: readonly TargetGroup[],
): Task<void> {
  // Re-runnable combinators (NOT a single-use `gen`): `execute` interprets the
  // task twice (preview + perform). One combined write per file keeps a shared
  // file (VS Code + Cline) a single read-modify-write — dry-run safe. The
  // written entry is BAND-shaped per group (a global entry omits `cwd`).
  const pending = groups.filter(
    (group) => mcpGroupState(d, group.path) !== "configured",
  );
  return sequence_(
    pending.map((group) =>
      d.writeMcpConfigTargets(
        group.writes,
        MCP_SERVER_NAME,
        pragmaMcpEntry(d.cwd, group.scope),
      ),
    ),
  );
}

/**
 * The groups this band OWNS right now — every file where detection classifies a
 * pragma entry as present (`configured` or `drifted`). Removal acts on exactly
 * this set, so a file that never carried the entry is never rewritten and a
 * foreign server in a file that does is never touched.
 */
export const ownedMcpGroups = (d: McpDetection): readonly TargetGroup[] =>
  d.groups.filter((group) => mcpGroupState(d, group.path) !== "absent");

/**
 * Compose the removal of the pragma entry from every owned file.
 *
 * The FORWARD side of this task must be walkable without reading anything.
 * `runUndo` collects undos by walking the forward task with effects MOCKED —
 * real `Exists`, but `ReadFile` deliberately returns a placeholder, so that the
 * walk cannot observe the forward run's own edits. Re-asserting the entry here
 * (the obvious composition, and the one this had) put a read-parse-merge on
 * that walk: the placeholder is not JSON, the parse failed closed, and the
 * collection aborted before gathering a single undo. `setup mcp --undo` could
 * not remove anything, and said so by refusing a config that was perfectly
 * valid.
 *
 * So the forward effect is a `mkdir` of the config's own directory — which
 * already exists, reads nothing, and is a genuine no-op — carrying the
 * key-scoped removal as its `undo`. Phase two then runs that removal against
 * the real file. Only the pragma key is ever deleted; a foreign server in the
 * same file is never touched.
 *
 * @param d - The detection gathered up front.
 * @returns A Task whose undo removes the pragma entry from each owned file.
 */
export function composeMcpRemoval(d: McpDetection): Task<void> {
  return sequence_(
    ownedMcpGroups(d).map((group) =>
      mkdir(dirname(group.path), true, {
        undo: sequence_(
          group.writes.map((write) =>
            d.removeMcpConfigFrom(write, MCP_SERVER_NAME),
          ),
        ),
      }),
    ),
  );
}
