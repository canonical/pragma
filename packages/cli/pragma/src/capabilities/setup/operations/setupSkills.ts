/**
 * `setup skills` — symlink discovered skills into harness skill directories.
 *
 * BAND-MATCHED: the band picks the source root AND the link destination, and
 * the two always match.
 *
 * - global (the default): INSTALLED skills (`$XDG_DATA_HOME/<bin>/skills`, where
 *   `sources update` puts package skills) link into user-level harness skill
 *   directories — the cross-client `~/.agents/skills`, plus the user-level
 *   directory of each detected harness whose user-level location is verified.
 * - project (`--local`): PROJECT skills (`<cwd>/.<bin>/skills`) link into the
 *   project's harness directories — the checked-in, team-shared arrangement.
 *
 * Cross-band linking is what this replaces: linking installed skills into a
 * repository's directories leaks machine state into a checkout, and linking a
 * repository's skills into the home directory applies one project's skills
 * machine-wide. Neither is ever what the user asked for.
 *
 * Split into `detectSkills` (discovery, harness detection, and the per-link
 * create/skip/replace DECISION, all against the real filesystem up front, so
 * the plan and the recap reflect true state) and pure compose bodies performing
 * only the symlink/delete effects the dry-run interpreter mocks.
 */

import { lstatSync, readlinkSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  deleteFile,
  mkdir,
  sequence_,
  symlink,
  type Task,
} from "@canonical/task";
import type { PragmaRuntime } from "../../../kernel/runtime/types.js";
import type { ScopeBand } from "../types.js";

/** Cross-client skill directory, shared across all harnesses. */
const CROSS_CLIENT_DIR = ".agents/skills";

/**
 * The harnesses whose USER-LEVEL skills directory is verified against the
 * harness's own documentation, and therefore safe to link into on the global
 * band. A harness absent from this set simply contributes no global link
 * directory: an invented `~/.<something>/skills` would be a directory nothing
 * reads, and creating it would be litter dressed up as configuration.
 *
 * The path itself is still the registry's — `skillsPath` is a function of a
 * root, so a user-level location is `skillsPath(home)`. What lives here is only
 * the JUDGEMENT that the location has been confirmed.
 */
const VERIFIED_GLOBAL_SKILL_HARNESSES: ReadonlySet<string> = new Set([
  "claude-code",
]);

/** One symlink create/skip/replace action decided during detection. */
export interface SymlinkAction {
  readonly skillName: string;
  readonly target: string;
  readonly linkPath: string;
  readonly action: "created" | "skipped" | "replaced";
  readonly harnessName: string;
  /**
   * Whether this link path currently holds a symlink INTO the band's skill
   * root — the ownership test removal turns on. A link pointing anywhere else
   * is the user's and is never this command's to delete, and a real (non-link)
   * entry is never touched at all.
   */
  readonly owned: boolean;
}

/**
 * The detected skill-linking plan for ONE band: the source root, the target
 * directories, the decided per-link actions, and the counts the plan row
 * reports. `available` is false when the band's root holds no skills.
 */
export interface SkillsDetection {
  readonly band: ScopeBand;
  /** The band's source root — the directory skills are discovered from. */
  readonly sourceRoot: string;
  readonly available: boolean;
  readonly targets: readonly { readonly dir: string; readonly name: string }[];
  readonly actions: readonly SymlinkAction[];
  readonly skillCount: number;
  readonly harnessCount: number;
  readonly warnings: readonly string[];
}

/** What currently occupies a candidate link path. */
type LinkState =
  | { readonly kind: "absent" }
  | { readonly kind: "symlink"; readonly target: string }
  | { readonly kind: "other" };

/**
 * Whether a link's destination lives INSIDE the band's skill root — the
 * ownership test, and the one that decides what `--undo` deletes.
 *
 * A raw `readlink` target may be relative, so it is resolved against the link's
 * own directory first; then containment is tested by PATH SEGMENT. A string
 * prefix answered yes for `<root>-backup/foo`, so a user's own link into a
 * sibling directory was classified as ours and removed by `--undo` — a file we
 * never created and had no business deleting.
 *
 * The root itself is not "inside" it: a link pointing AT the root is not one of
 * the per-skill links this command writes.
 *
 * @param root - The band's skill source root, absolute.
 * @param linkPath - The absolute path of the link being classified.
 * @param rawTarget - The link's destination exactly as `readlink` reported it.
 * @returns Whether the destination is a path under the root.
 * @note Pure — it resolves and compares strings, and reads nothing.
 */
function withinRoot(
  root: string,
  linkPath: string,
  rawTarget: string,
): boolean {
  const destination = resolve(dirname(linkPath), rawTarget);
  const rel = relative(root, destination);
  return (
    rel.length > 0 &&
    rel !== ".." &&
    !rel.startsWith(`..${sep}`) &&
    !isAbsolute(rel)
  );
}

/**
 * Classify a link path WITHOUT following it: absent, a symlink (with its raw
 * target, resolving or not), or a real (non-symlink) entry. `lstat`-based, the
 * same classification `sources/installSkills.ts`'s `linkState` uses — probing
 * with `existsSync` FOLLOWS the link, so a DANGLING symlink read as "absent",
 * the plan said `created`, and the real `symlink()` crashed EEXIST while the
 * dry-run previewed a clean create.
 */
function linkState(linkPath: string): LinkState {
  let stat: ReturnType<typeof lstatSync>;
  try {
    stat = lstatSync(linkPath);
  } catch {
    return { kind: "absent" };
  }
  if (stat.isSymbolicLink()) {
    try {
      return { kind: "symlink", target: readlinkSync(linkPath) };
    } catch {
      return { kind: "other" };
    }
  }
  return { kind: "other" };
}

/**
 * The link directories for a band. Project: every detected harness's
 * project-rooted skills directory plus the cross-client one, exactly as
 * before. Global: the same construction rooted at the user's home directory,
 * but only for the harnesses in {@link VERIFIED_GLOBAL_SKILL_HARNESSES} —
 * plus the cross-client directory, which every client reads by convention.
 *
 * @param detected - The detected harnesses.
 * @param band - The band being set up.
 * @param root - The band's link root (`cwd` for project, home for global).
 * @returns The deduplicated target directories, first-seen wins.
 */
function linkTargets(
  detected: readonly {
    harness: { id: string; name: string; skillsPath: (root: string) => string };
  }[],
  band: ScopeBand,
  root: string,
): { dir: string; name: string }[] {
  const seen = new Set<string>();
  const targets: { dir: string; name: string }[] = [];
  for (const d of detected) {
    if (
      band === "global" &&
      !VERIFIED_GLOBAL_SKILL_HARNESSES.has(d.harness.id)
    ) {
      continue;
    }
    const dir = d.harness.skillsPath(root);
    if (seen.has(dir)) continue;
    seen.add(dir);
    targets.push({ dir, name: d.harness.name });
  }
  const crossDir = resolve(root, CROSS_CLIENT_DIR);
  if (!seen.has(crossDir))
    targets.push({ dir: crossDir, name: CROSS_CLIENT_DIR });
  return targets;
}

/**
 * Discover the band's skills, detect harnesses, and decide each link action
 * (real filesystem, up front).
 *
 * @param rt - The per-invocation runtime.
 * @param band - Which band to plan: global (installed skills) or project.
 * @returns The band's link plan.
 * @note Impure — reads the filesystem (skills + harnesses + existing links).
 */
export async function detectSkills(
  rt: PragmaRuntime,
  band: ScopeBand,
): Promise<SkillsDetection> {
  const cwd = rt.cwd;
  const [
    { discoverSkillsFrom, installedSkillsDir, projectSkillsDir },
    { detectHarnesses, readPlatformEnv, userHome },
    { runTask },
  ] = await Promise.all([
    import("../../skill/discover.js"),
    import("@canonical/harnesses"),
    import("@canonical/task/node"),
  ]);

  const sourceRoot =
    band === "project" ? projectSkillsDir(cwd) : installedSkillsDir();
  const linkRoot = band === "project" ? cwd : userHome(readPlatformEnv());
  const skills = discoverSkillsFrom([sourceRoot]);
  if (skills.length === 0) {
    return {
      band,
      sourceRoot,
      available: false,
      targets: [],
      actions: [],
      skillCount: 0,
      harnessCount: 0,
      warnings: [],
    };
  }

  const detected = await runTask(detectHarnesses(cwd));
  const targets = linkTargets(detected, band, linkRoot);

  // Decide each action against REAL fs (so the preview is accurate). Dangling
  // or wrong-target symlinks are `replaced` (delete + relink); a real
  // (non-symlink) file or directory at the path is `skipped` — a hand-placed
  // skill is never this command's to delete.
  const actions: SymlinkAction[] = [];
  for (const { dir, name } of targets) {
    for (const skill of skills) {
      const linkPath = resolve(dir, skill.folderName);
      const state = linkState(linkPath);
      const action: SymlinkAction["action"] =
        state.kind === "absent"
          ? "created"
          : state.kind === "symlink" && state.target === skill.sourcePath
            ? "skipped"
            : state.kind === "symlink"
              ? "replaced"
              : "skipped";
      actions.push({
        skillName: skill.name,
        target: skill.sourcePath,
        linkPath,
        action,
        harnessName: name,
        owned:
          state.kind === "symlink" &&
          withinRoot(sourceRoot, linkPath, state.target),
      });
    }
  }

  const warnings = actions
    .filter((a) => a.action === "replaced")
    .map(
      (a) => `Replaced a stale symlink for ${a.skillName} in ${a.harnessName}`,
    );

  return {
    band,
    sourceRoot,
    available: true,
    targets,
    actions,
    skillCount: skills.length,
    harnessCount: targets.length,
    warnings,
  };
}

/**
 * Compose the (re)link effects from a detection (builds ABSOLUTE link paths
 * itself).
 *
 * Built from re-runnable combinators (NOT a single-use `gen`) because `execute`
 * interprets the task twice (preview + perform). `created` links carry an undo;
 * a `replaced` link is delete-then-relink (idempotent); `skipped` is a no-op —
 * and a detection where every action is `skipped` composes NOTHING, so a
 * converged re-run performs zero filesystem mutations.
 *
 * @param d - The detection gathered up front.
 * @returns A Task that mkdirs each needed target and creates/replaces links.
 */
export function composeSkills(d: SkillsDetection): Task<void> {
  const pending = d.actions.filter((a) => a.action !== "skipped");
  if (!d.available || pending.length === 0) return sequence_([]);
  const dirs = new Set(pending.map((a) => dirname(a.linkPath)));
  const tasks: Task<unknown>[] = [...dirs]
    .sort()
    .map((dir) => mkdir(dir, true));
  for (const a of pending) {
    if (a.action === "created") {
      tasks.push(
        symlink(a.target, a.linkPath, { undo: deleteFile(a.linkPath) }),
      );
    } else {
      tasks.push(deleteFile(a.linkPath));
      tasks.push(
        symlink(a.target, a.linkPath, { undo: deleteFile(a.linkPath) }),
      );
    }
  }
  return sequence_(tasks);
}

/**
 * The links this band OWNS right now — every existing symlink pointing into the
 * band's skill root, including dangling ones and ones already correct. This is
 * what removal acts on, and it is deliberately NOT the forward plan: undoing a
 * freshly composed forward plan on an already-linked tree reversed the mkdirs
 * and removed nothing, while reporting a step count.
 */
/**
 * The named reason a skills row skips, shared by the setup plan and the doctor
 * row so the two surfaces cannot word the same finding differently. Two strings
 * for one condition is how a user ends up unsure whether they are looking at one
 * problem or two.
 *
 * @param sourceRoot - The band's skill source root, already root-relative.
 * @param band - The band being reported.
 * @returns The reason line.
 */
export const skillsSkipReason = (
  sourceRoot: string,
  band: ScopeBand,
): string =>
  band === "project"
    ? `no project skills (${sourceRoot} is absent)`
    : "no skills installed";

export const ownedSkillLinks = (d: SkillsDetection): readonly SymlinkAction[] =>
  d.actions.filter((a) => a.owned);

/**
 * Compose the removal of every owned link. Each forward effect re-asserts the
 * link (idempotent) and carries its deletion as `undo`, which is what the undo
 * interpreter executes — so the reversal is composed from what detection says
 * this command owns, never from what a fresh forward plan would create.
 *
 * @param d - The detection gathered up front.
 * @returns A Task whose undo removes every owned link.
 */
export function composeSkillsRemoval(d: SkillsDetection): Task<void> {
  const owned = ownedSkillLinks(d);
  if (owned.length === 0) return sequence_([]);
  return sequence_(
    owned.map((a) =>
      symlink(a.target, a.linkPath, { undo: deleteFile(a.linkPath) }),
    ),
  );
}
