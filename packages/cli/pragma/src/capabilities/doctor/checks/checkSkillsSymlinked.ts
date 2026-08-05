import { type Dirent, lstatSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { DetectedHarness } from "@canonical/harnesses";
import { detectHarnesses } from "@canonical/harnesses";
import { runTask } from "@canonical/task/node";
import { BIN_NAME } from "../../../constants.js";
import { discoverSkills } from "../../../kernel/skills/discover.js";
import type { CheckResult } from "../types.js";

/**
 * Whether a directory holds at least one symlink.
 *
 * `readdirSync` throws for a missing directory, and for this check that is the
 * same answer as an empty one, so both arrive as `false` down one path rather
 * than two. `withFileTypes` is what keeps this to a single directory read:
 * `Dirent.isSymbolicLink()` reads the type the entry already carries. The
 * `lstat` fallback covers a filesystem that reports `DT_UNKNOWN`, where every
 * dirent predicate answers false and the entry needs a real stat to classify.
 *
 * @param dir - The directory to inspect.
 * @returns Whether the directory exists and holds at least one symlink.
 * @note Impure — reads a directory and may stat its entries.
 */
function hasSymlink(dir: string): boolean {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) return true;
    if (entry.isFile() || entry.isDirectory()) continue;
    try {
      if (lstatSync(join(dir, entry.name)).isSymbolicLink()) return true;
    } catch {
      // A racing unlink: the entry is gone, so it is not a link.
    }
  }
  return false;
}

/**
 * Check that each detected AI harness's skills directory actually holds
 * symlinks. Skipped when no harness is detected, or when there is nothing to
 * link.
 *
 * IT USED TO CHECK ONLY THAT THE DIRECTORY EXISTED. That reported `pass` on a
 * completely empty `.claude/skills/` — the exact state a user is in when the
 * install never ran, or ran and produced nothing — so the one command whose job
 * is to say the environment is wrong said it was fine, and printed no remedy to
 * follow. Reproduced before this change against a scratch project holding
 * nothing but an empty `.claude/skills/` and isolated XDG dirs:
 * `✓ Skills symlinked: Claude Code`, in a run summarised `6 passed, 2 failed`.
 *
 * The gate is a SYMLINK rather than any entry, because a symlink is what
 * `setup skills` writes — one per discovered skill, named for its folder — so
 * this check now tests the thing its name claims. A directory of real files
 * there is not an install; it is something else, and saying so is the point.
 *
 * `discoverSkills` gates the whole check because a project with no skill to
 * link is not misconfigured: `setup skills` would create nothing, so a failure
 * would print a remedy that cannot change the answer. That is a skip. It reads
 * the same source of truth `setup skills` does, so the two cannot disagree
 * about whether there was work to do.
 *
 * @param cwd - The project root to detect harnesses against.
 * @returns A CheckResult indicating pass, fail (with a remedy), or skip.
 * @note Impure — detects harnesses and probes the filesystem.
 */
export async function checkSkillsSymlinked(cwd: string): Promise<CheckResult> {
  let detected: DetectedHarness[];
  try {
    detected = await runTask(detectHarnesses(cwd));
  } catch {
    return {
      name: "Skills symlinked",
      status: "fail",
      detail: "harness detection failed",
      remedy: `${BIN_NAME} setup skills`,
    };
  }

  if (detected.length === 0) {
    return {
      name: "Skills symlinked",
      status: "skip",
      detail: "no AI harnesses detected",
    };
  }

  if (discoverSkills(cwd).length === 0) {
    return {
      name: "Skills symlinked",
      status: "skip",
      detail: "no skills to link",
    };
  }

  const linked: string[] = [];
  const missing: string[] = [];
  for (const d of detected) {
    if (hasSymlink(d.harness.skillsPath(cwd))) {
      linked.push(d.harness.name);
    } else {
      missing.push(d.harness.name);
    }
  }

  if (missing.length === 0) {
    return {
      name: "Skills symlinked",
      status: "pass",
      detail: linked.join(", "),
    };
  }

  return {
    name: "Skills symlinked",
    status: "fail",
    detail: `missing for ${missing.join(", ")}`,
    remedy: `${BIN_NAME} setup skills`,
  };
}
