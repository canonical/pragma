/**
 * THE target table — the one list `setup` and `doctor` both read.
 *
 * Five rows, each with a scope column. This table drives the `setup <target>`
 * sub-verbs, the wizard's choices, the `--dry-run` plan, the progress lines, the
 * recap, the doctor rows, and each doctor row's `fix:` line. Adding a sixth
 * target is one row here — not a new sub-verb, a new check, a new recap branch
 * and a new fix string that four separate files have to agree about.
 *
 * A row owns: its identity (`id` is BOTH the sub-verb argument and the doctor
 * row name, so `mcp` and `setup mcp` visibly share a token), which scopes it can
 * be installed into, how to DETECT its current state, how to PLAN a run from
 * that detection, and how to COMPOSE the forward and removal effects. Detection
 * runs once per invocation and feeds every reader, so setup and doctor cannot
 * disagree about what they looked at.
 *
 * What a row does NOT own is diagnosis. `doctor/runChecks.ts` maps a row's
 * detection onto a check result itself: the completions check needs helpers that
 * live under `doctor/`, and importing them here would make the two directories
 * import each other. The bijection is unaffected — doctor enumerates THIS table
 * and derives every row name and `fix:` line from it.
 *
 * This module is reached only through the verb's lazy dynamic import (and
 * doctor's), so nothing here lands on the `--help`/`__complete` fast path.
 */

import type { Task } from "@canonical/task";
import { BIN_NAME } from "../../constants.js";
import type { PragmaRuntime } from "../../kernel/runtime/index.js";
import {
  type CompletionsDetection,
  composeCompletions,
  composeCompletionsRemoval,
  detectCompletions,
} from "./operations/setupCompletions.js";
import {
  type ConfigDetection,
  composeConfigFile,
  composeConfigRemoval,
  detectConfigFile,
} from "./operations/setupConfig.js";
import {
  composeLsp,
  composeLspRemoval,
  detectLsp,
  LSP_SKIP_REMEDY,
  type LspDetection,
  lspEditorNames,
  lspSkipReason,
  ownedLspEditors,
} from "./operations/setupLsp.js";
import {
  composeMcp,
  composeMcpRemoval,
  detectMcp,
  type McpDetection,
  mcpGroupState,
  ownedMcpGroups,
  selectedGroups,
} from "./operations/setupMcp.js";
import {
  composeSkills,
  composeSkillsRemoval,
  detectSkills,
  ownedSkillLinks,
  type SkillsDetection,
  skillsSkipReason,
  skillsSkipRemedy,
  staleSkillLinks,
} from "./operations/setupSkills.js";
import {
  type PlanAction,
  type PlanChildRow,
  type SetupPlan,
  shortenPath,
  type TargetId,
} from "./plan.js";
import type { Scope } from "./types.js";

/** What a target contributes to one plan row, before selection is applied. */
export interface TargetDraft {
  readonly action: PlanAction;
  readonly detail: string;
  /** REQUIRED when the action is `skip`. */
  readonly reason?: string;
  readonly children?: readonly PlanChildRow[];
  /** An action that works on THIS machine NOW, or absent. */
  readonly remedy?: string;
}

/** The context a draft is rendered against — the plan's two named roots. */
export type Roots = SetupPlan["roots"];

/**
 * One row of the table, generic over its own detection type. Every consumer
 * treats the detection as opaque and hands it straight back to the same row,
 * which is what lets five unrelated detections share one loop.
 */
export interface TargetDefinition<D> {
  readonly id: TargetId;
  /** Human title, used where a sentence needs one; the id is the row name. */
  readonly title: string;
  readonly scopes: readonly Scope[];
  /** Real reads, up front, once per (target, scope) per invocation. */
  detect(rt: PragmaRuntime, scope: Scope): Promise<D>;
  /** What a forward run would do. */
  plan(detection: D, scope: Scope, roots: Roots): TargetDraft;
  /** What a removal would do — composed from what detection says we own. */
  removalPlan(detection: D, scope: Scope, roots: Roots): TargetDraft;
  /**
   * The forward effects. `chosen` is the row's per-child selection (MCP file
   * paths); a row without children ignores it.
   */
  compose(detection: D, chosen?: readonly string[]): Task<void>;
  /** The removal effects: forward re-assertion carrying the reversal as `undo`. */
  composeRemoval(detection: D): Task<void>;
}

/** A table row with its detection type erased — how every consumer holds one. */
export type AnyTarget = TargetDefinition<never>;

/** Erase a row's detection type so the five rows can share one array. */
const defineTarget = <D>(target: TargetDefinition<D>): AnyTarget =>
  target as unknown as AnyTarget;

// =============================================================================
// The rows
// =============================================================================

const configTarget = defineTarget<ConfigDetection>({
  id: "config",
  title: "Global configuration",
  scopes: ["global"],
  detect: () => detectConfigFile(),
  plan: (d, _scope, roots) => {
    const path = shortenPath(d.path, roots);
    if (!d.exists) return { action: "install", detail: path };
    return { action: "none", detail: `${path} — present` };
  },
  removalPlan: (d, _scope, roots) => {
    const path = shortenPath(d.path, roots);
    if (!d.exists) return { action: "none", detail: `${path} — absent` };
    if (!d.isSeed) {
      return {
        action: "skip",
        detail: path,
        reason: `it holds your own settings, so ${path} stays`,
      };
    }
    return { action: "remove", detail: path };
  },
  compose: (d) => composeConfigFile(d),
  composeRemoval: (d) => composeConfigRemoval(d),
});

const completionsTarget = defineTarget<CompletionsDetection>({
  id: "completions",
  title: "Shell completions",
  scopes: ["global"],
  detect: (rt) => detectCompletions(rt.cwd),
  plan: (d, _scope, roots) => {
    // Never guess a shell. Installing for the wrong one is invisible until the
    // user presses TAB and nothing happens, so an unresolved shell is a named
    // skip whose remedy is the one action that DOES settle it.
    if (d.detection.kind === "ambiguous") {
      return {
        action: "skip",
        detail: "the running shell cannot be identified",
        reason: `the running shell cannot be identified — SHELL names ${d.detection.login}, which is the login shell, not necessarily the one in use`,
        remedy: `run \`${BIN_NAME} setup completions\` from the shell you want completions in`,
      };
    }
    if (d.detection.kind === "unknown" || d.shell === null || d.path === null) {
      return {
        action: "skip",
        detail: "no supported shell detected",
        reason: "no bash, zsh, or fish was found in this process tree",
        remedy: `run \`${BIN_NAME} setup completions\` from bash, zsh, or fish`,
      };
    }
    // The script spawns the binary for every name context. Installing one that
    // cannot reach it writes a file that silently does nothing.
    if (!d.binOnPath) {
      return {
        action: "skip",
        detail: `${BIN_NAME} is not on PATH`,
        reason: `the completion script runs \`${BIN_NAME}\`, which this shell cannot find on PATH`,
        remedy: `put \`${BIN_NAME}\` on your PATH, then run this again`,
      };
    }
    const where = `${d.shell} → ${shortenPath(d.path, roots)}`;
    // A no-op row says what it FOUND, not just where it looked: `no change`
    // beside a bare path leaves the reader to guess whether the script is
    // there and current or missing and unreachable.
    if (d.state === "installed") {
      return { action: "none", detail: `${where} — already up to date` };
    }
    return {
      action: d.state === "stale" ? "update" : "install",
      detail: where,
    };
  },
  removalPlan: (d, _scope, roots) => {
    if (d.path === null || d.state === "absent") {
      return { action: "none", detail: "no script installed" };
    }
    return { action: "remove", detail: shortenPath(d.path, roots) };
  },
  compose: (d) => composeCompletions(d),
  composeRemoval: (d) => composeCompletionsRemoval(d),
});

const lspTarget = defineTarget<LspDetection>({
  id: "lsp",
  title: "Terrazzo LSP extension",
  scopes: ["global"],
  detect: (rt) => detectLsp(rt.cwd),
  plan: (d) => {
    if (d.state === "unknown") {
      return {
        action: "skip",
        detail: lspSkipReason(d),
        reason: lspSkipReason(d),
        remedy: LSP_SKIP_REMEDY,
      };
    }
    // One child per detected editor, exactly like the mcp row's files: a
    // machine with several VS Code forks on PATH should not have the extension
    // pushed into all of them because they happen to be installed.
    const children: PlanChildRow[] = d.editors.map((e) => ({
      key: e.editor.cli,
      label: `${e.editor.cli} — ${e.editor.name}`,
      action: e.installed ? ("unchanged" as const) : ("add" as const),
    }));
    // The detail names WHAT is being placed and WHERE — never the row's own
    // state, which the action column already carries. `installed (VSCodium)`
    // beside a child row reading `codium — VSCodium (unchanged)` said the
    // editor's name twice and "nothing happens here" twice.
    if (d.state === "installed") {
      return {
        action: "none",
        detail: `Terrazzo extension in ${lspEditorNames(d).join(", ")}`,
        children,
      };
    }
    const pending = d.editors.filter((e) => !e.installed);
    return {
      action: "install",
      detail: `Terrazzo extension → ${pending
        .map((e) => e.editor.name)
        .join(", ")}`,
      children,
    };
  },
  removalPlan: (d) => {
    // No editor CLI on PATH is the SAME named skip the forward plan reports:
    // there is nothing on this machine to run an uninstall with.
    if (d.state === "unknown") {
      return {
        action: "skip",
        detail: lspSkipReason(d),
        reason: lspSkipReason(d),
        remedy: LSP_SKIP_REMEDY,
      };
    }
    // Removal is composed from what detection says we OWN — a copy that is
    // present, whatever its version. The forward plan's version gate would let
    // a dead pre-0.8.3 copy this command installed survive its own `--undo`.
    const owned = ownedLspEditors(d);
    if (owned.length === 0) {
      return { action: "none", detail: "no editor carries the extension" };
    }
    return {
      action: "remove",
      detail: `Terrazzo extension from ${owned
        .map((e) => e.editor.name)
        .join(", ")}`,
      children: owned.map((e) => ({
        key: e.editor.cli,
        label: `${e.editor.cli} — ${e.editor.name}`,
        action: "update" as const,
      })),
    };
  },
  compose: (d, chosen) => composeLsp(d, chosen),
  composeRemoval: (d) => composeLspRemoval(d),
});

/**
 * Why the `mcp` row has nothing to write in a scope — authored once, because
 * `setup`'s row and `doctor`'s row are the same finding and must not word it
 * differently. Neither sentence says "scope": the two scopes are `global` and
 * `local project`, after the `--global` / `--local` flags that select them.
 */
export const MCP_NO_LOCATION: Record<Scope, string> = {
  global: "no AI harness on this machine keeps a global config",
  project: "no AI harness in this project keeps a per-project config",
};

/** One MCP file as a plan child: its path, the harnesses sharing it, its state. */
const mcpChild = (
  d: McpDetection,
  group: McpDetection["groups"][number],
  roots: Roots,
): PlanChildRow => {
  const state = mcpGroupState(d, group.path);
  return {
    key: group.path,
    label: shortenPath(group.path, roots),
    action:
      state === "configured"
        ? "unchanged"
        : state === "drifted"
          ? "update"
          : "add",
  };
};

const mcpTarget = defineTarget<McpDetection>({
  id: "mcp",
  title: "MCP server registration",
  scopes: ["global", "project"],
  detect: (rt, scope) => detectMcp(rt, scope),
  plan: (d, scope, roots) => {
    if (d.groups.length === 0) {
      return {
        action: "skip",
        detail: MCP_NO_LOCATION[scope],
        reason: MCP_NO_LOCATION[scope],
      };
    }
    const children = d.groups.map((group) => mcpChild(d, group, roots));
    const pending = children.filter((c) => c.action !== "unchanged");
    return {
      action: pending.length === 0 ? "none" : "update",
      detail: `${d.groups.length} ${
        d.groups.length === 1 ? "config file" : "config files"
      }`,
      children,
    };
  },
  removalPlan: (d, _scope, roots) => {
    const owned = ownedMcpGroups(d);
    if (owned.length === 0) {
      return { action: "none", detail: "no entry to remove" };
    }
    return {
      action: "remove",
      detail: `${owned.length} ${owned.length === 1 ? "config file" : "config files"}`,
      children: owned.map((group) => ({
        key: group.path,
        label: shortenPath(group.path, roots),
        action: "update" as const,
      })),
    };
  },
  compose: (d, chosen) =>
    composeMcp(d, chosen ? selectedGroups(d, chosen) : d.groups),
  composeRemoval: (d) => composeMcpRemoval(d),
});

const skillsTarget = defineTarget<SkillsDetection>({
  id: "skills",
  title: "Skill symlinks",
  scopes: ["global", "project"],
  detect: (rt, scope) => detectSkills(rt, scope),
  plan: (d, scope, roots) => {
    // A forward run RECONCILES: stale links this scope owns are its work too, so
    // an orphan-only tree is actionable rather than a row that plans `none` and
    // is then deselected into doing nothing. `staleSkillLinks` carries the
    // absent-root safety gate, so a machine whose source root does not exist
    // contributes no sweep and the row falls back to the honest skip.
    const stale = staleSkillLinks(d);
    if (!d.available && stale.length === 0) {
      const short = shortenPath(d.sourceRoot, roots);
      const reason = skillsSkipReason(short, scope, d.rootExists);
      // A skip with no remedy is a dead end — this one names the command that
      // fills the scope's source root, exactly as the completions and lsp skips
      // beside it name theirs.
      return {
        action: "skip",
        detail: reason,
        reason,
        remedy: skillsSkipRemedy(short, scope),
      };
    }
    const dirs = d.targets.map((t) => shortenPath(t.dir, roots)).join(", ");
    const where = `${d.skillCount} ${d.skillCount === 1 ? "skill" : "skills"} → ${d.targets.length} ${d.targets.length === 1 ? "folder" : "folders"} (${dirs})`;
    const detail =
      stale.length === 0
        ? where
        : `${where}, ${stale.length} stale ${stale.length === 1 ? "link" : "links"} to remove`;
    const pending = d.actions.filter((a) => a.action !== "skipped");
    if (pending.length > 0) return { action: "link", detail };
    // Nothing to link, but something to retire: `update` is the table's word
    // for "this row has work that is not a fresh install".
    if (stale.length > 0) return { action: "update", detail };
    return { action: "none", detail };
  },
  removalPlan: (d, _scope, roots) => {
    const owned = ownedSkillLinks(d);
    if (owned.length === 0) {
      return { action: "none", detail: "no link to remove" };
    }
    const dirs = [...new Set(owned.map((a) => shortenPath(a.linkPath, roots)))];
    return {
      action: "remove",
      detail: `${owned.length} ${owned.length === 1 ? "link" : "links"}`,
      children: dirs.map((dir) => ({
        key: dir,
        label: dir,
        action: "update" as const,
      })),
    };
  },
  compose: (d) => composeSkills(d),
  composeRemoval: (d) => composeSkillsRemoval(d),
});

/** THE table, in display order. */
export const TARGETS: readonly AnyTarget[] = [
  configTarget,
  completionsTarget,
  lspTarget,
  mcpTarget,
  skillsTarget,
];

/** Look a row up by id. */
export const findTarget = (id: string): AnyTarget | undefined =>
  TARGETS.find((target) => target.id === id);

/** Whether a target can be installed into a scope. */
export const supportsScope = (target: AnyTarget, scope: Scope): boolean =>
  target.scopes.includes(scope);
