/**
 * `setup skills` — symlink discovered skills into each harness skill directory
 * and the cross-client `.agents/skills`.
 *
 * Preview-accurate: skill discovery, harness detection, and the per-link
 * create/skip/replace DECISION all run against REAL fs in the async-setup phase,
 * so a `--dry-run` plan reflects true state (an existing correct symlink is
 * skipped, a stale one is replaced). The composed Task then performs only the
 * actual symlink/delete effects — which the dry-run interpreter mocks. Idempotent
 * by construction.
 */

import { existsSync, readlinkSync } from "node:fs";
import { resolve } from "node:path";
import {
  $,
  deleteFile,
  gen,
  info,
  mkdir,
  symlink,
  type Task,
} from "@canonical/task";
import { RECOVERY_CLI_PREFIX } from "../../../constants.js";
import { PragmaError } from "../../../kernel/error/PragmaError.js";
import { cliRecovery } from "../../../kernel/error/recovery.js";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import { applyPromptStrategy } from "../promptStrategy.js";
import type { SetupResult, SymlinkAction } from "../types.js";

/** Cross-client skill directory, shared across all harnesses. */
const CROSS_CLIENT_DIR = ".agents/skills";

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
 * Build the `setup skills` Task.
 *
 * @param rt - The per-invocation runtime.
 * @returns A Task that (re)links skills into each target directory.
 * @throws PragmaError EMPTY_RESULTS when no skills are discoverable.
 * @note Impure — discovers skills, detects harnesses, and composes symlink writes.
 */
export async function setupSkills(
  rt: PragmaRuntime,
): Promise<Task<SetupResult>> {
  applyPromptStrategy(rt);
  const cwd = rt.cwd;
  const [{ discoverSkills }, { detectHarnesses }, { runTask }] =
    await Promise.all([
      import("../../skill/discover.js"),
      import("@canonical/harnesses"),
      import("@canonical/task/node"),
    ]);

  const skills = discoverSkills(cwd);
  if (skills.length === 0) {
    // Recovery points at where skills COME FROM (U8): package skills install on
    // `sources update`, not by re-running the command that just found none.
    throw PragmaError.emptyResults("skill", {
      message: "No skills found to link.",
      recovery: cliRecovery(
        `${RECOVERY_CLI_PREFIX}sources update`,
        "Add a design-system package that ships skills to your config, then run `pragma sources update` to install them.",
      ),
    });
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
  const result = {
    actions,
    harnessCount: detected.length,
    skillCount: skills.length,
    warnings,
  };

  return gen(function* () {
    for (const { dir } of targets) {
      yield* $(mkdir(dir, true));
    }
    for (const a of actions) {
      if (a.action === "created") {
        yield* $(
          symlink(a.target, a.linkPath, { undo: deleteFile(a.linkPath) }),
        );
      } else if (a.action === "replaced") {
        yield* $(deleteFile(a.linkPath));
        yield* $(symlink(a.target, a.linkPath));
      }
    }
    yield* $(
      info(`Linked ${skills.length} skill(s) into ${targets.length} dir(s).`),
    );
    return { kind: "skills" as const, result };
  });
}
