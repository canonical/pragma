/**
 * `setup skills` — symlink discovered skills into each harness skill directory
 * and the cross-client `.agents/skills`.
 *
 * Split into `detectSkills` (skill discovery, harness detection, and the
 * per-link create/skip/replace DECISION all run against REAL fs up front, so the
 * wizard recap and a `--dry-run` plan reflect true state) and `composeSkills` (a
 * pure, re-runnable body performing only the symlink/delete effects the dry-run
 * interpreter mocks). Idempotent by construction.
 */

import { existsSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";
import {
  deleteFile,
  info,
  mkdir,
  sequence_,
  symlink,
  type Task,
} from "@canonical/task";
import { RECOVERY_CLI_PREFIX } from "../../../constants.js";
import { PragmaError } from "../../../kernel/error/PragmaError.js";
import { cliRecovery } from "../../../kernel/error/recovery.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { SetupSkillsResult, SymlinkAction } from "../types.js";

/** Cross-client skill directory, shared across all harnesses. */
const CROSS_CLIENT_DIR = ".agents/skills";

/**
 * The detected skill-linking plan: the target directories, the decided per-link
 * actions, and the counts/warnings the result surface reports. `available` is
 * false when no skills were discovered.
 */
export interface SkillsDetection {
  readonly available: boolean;
  readonly targets: readonly { readonly dir: string; readonly name: string }[];
  readonly actions: readonly SymlinkAction[];
  readonly skillCount: number;
  readonly harnessCount: number;
  readonly warnings: readonly string[];
}

/** The current target of a symlink, or `null` when absent / not a symlink. */
function currentLink(linkPath: string): string | null {
  if (!existsSync(linkPath)) return null;
  try {
    return readlinkSync(linkPath);
  } catch {
    return "";
  }
}

/**
 * Discover skills, detect harnesses, and decide each link action (real fs, up
 * front). Returns `available: false` (empty plan) when no skills exist — the
 * run-all omits the step; the direct sub-verb turns it into {@link skillsEmptyError}.
 *
 * @param rt - The per-invocation runtime.
 * @returns The link plan.
 * @note Impure — reads the filesystem (skills + harnesses + existing links).
 */
export async function detectSkills(
  rt: PragmaRuntime,
): Promise<SkillsDetection> {
  const cwd = rt.cwd;
  const [{ discoverSkills }, { detectHarnesses }, { runTask }] =
    await Promise.all([
      import("../../skill/discover.js"),
      import("@canonical/harnesses"),
      import("@canonical/task/node"),
    ]);

  const skills = discoverSkills(cwd);
  if (skills.length === 0) {
    return {
      available: false,
      targets: [],
      actions: [],
      skillCount: 0,
      harnessCount: 0,
      warnings: [],
    };
  }

  const detected = await runTask(detectHarnesses(cwd));

  // Target dirs (harness skill dirs + the cross-client dir), first-seen wins.
  const seen = new Set<string>();
  const targets: { dir: string; name: string }[] = [];
  for (const d of detected) {
    const dir = d.harness.skillsPath(cwd);
    if (!seen.has(dir)) {
      seen.add(dir);
      targets.push({ dir, name: d.harness.name });
    }
  }
  const crossDir = resolve(cwd, CROSS_CLIENT_DIR);
  if (!seen.has(crossDir)) {
    seen.add(crossDir);
    targets.push({ dir: crossDir, name: CROSS_CLIENT_DIR });
  }

  // Decide each action against REAL fs (so the preview is accurate).
  const actions: SymlinkAction[] = [];
  for (const { dir, name } of targets) {
    for (const skill of skills) {
      const linkPath = resolve(dir, skill.folderName);
      const current = currentLink(linkPath);
      const action: SymlinkAction["action"] =
        current === null
          ? "created"
          : current === skill.sourcePath
            ? "skipped"
            : "replaced";
      actions.push({
        skillName: skill.name,
        target: skill.sourcePath,
        linkPath,
        action,
        harnessName: name,
      });
    }
  }

  const warnings = actions
    .filter((a) => a.action === "replaced")
    .map(
      (a) => `Replaced stale symlink for ${a.skillName} in ${a.harnessName}`,
    );

  return {
    available: true,
    targets,
    actions,
    skillCount: skills.length,
    harnessCount: detected.length,
    warnings,
  };
}

/**
 * Compose the (re)link effects from a detection (builds ABSOLUTE link paths
 * itself).
 *
 * Built from re-runnable combinators (NOT a single-use `gen`) because `execute`
 * interprets the task twice (preview + perform). `created` links carry an undo;
 * a `replaced` link is delete-then-relink (idempotent); `skipped` is a no-op.
 *
 * @param d - The detection gathered up front.
 * @returns A Task that mkdirs each target and creates/replaces each symlink.
 */
export function composeSkills(d: SkillsDetection): Task<void> {
  if (!d.available) return sequence_([]);
  const tasks: Task<unknown>[] = [];
  for (const { dir } of d.targets) {
    tasks.push(mkdir(dir, true));
  }
  for (const a of d.actions) {
    if (a.action === "created") {
      tasks.push(
        symlink(a.target, a.linkPath, { undo: deleteFile(a.linkPath) }),
      );
    } else if (a.action === "replaced") {
      tasks.push(deleteFile(a.linkPath));
      tasks.push(symlink(a.target, a.linkPath));
    }
  }
  tasks.push(
    info(`Linked ${d.skillCount} skill(s) into ${d.targets.length} dir(s).`),
  );
  return sequence_(tasks);
}

/** Project a detection onto the {@link SetupSkillsResult} output shape. */
export function toSkillsResult(d: SkillsDetection): SetupSkillsResult {
  return {
    actions: d.actions,
    harnessCount: d.harnessCount,
    skillCount: d.skillCount,
    warnings: d.warnings,
  };
}

/**
 * The EMPTY_RESULTS error the DIRECT `setup skills` sub-verb raises when no
 * skills are discoverable (the run-all instead omits the step). Recovery points
 * at where skills COME FROM (U8): package skills install on `sources update`.
 */
export function skillsEmptyError(): PragmaError {
  return PragmaError.emptyResults("skill", {
    message: "No skills found to link.",
    recovery: cliRecovery(
      `${RECOVERY_CLI_PREFIX}sources update`,
      "Add a design-system package that ships skills to your config, then run `pragma sources update` to install them.",
    ),
  });
}
