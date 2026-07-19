/**
 * Plan the symlink install of package-provided skills (U10).
 *
 * Design-system packages ship a top-level `skills/<name>/SKILL.md`, but skill
 * discovery only scans the project root and the installed-skills root — never a
 * resolved package's clone/dir. So `sources update` INSTALLS each package's
 * skills into the installed-skills root (`$XDG_DATA_HOME/pragma/skills`) as
 * symlinks, exactly the root `discoverSkills` already reads. Precedence is
 * preserved (a project `.pragma/skills` entry still wins — it is discovered
 * first), and the update Task stays reversible (each created link carries an
 * unlink undo).
 *
 * Decisions run against REAL fs here so the update's `--dry-run` plan is
 * accurate; the composed Task performs only the symlink/delete effects.
 */

import { existsSync, lstatSync, readdirSync, readlinkSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import type { ResolvedPackage } from "../../kernel/runtime/refs/resolve.js";
import { installedSkillsDir } from "../skill/discover.js";

/** One planned skill symlink into the installed-skills root. */
export interface SkillLinkAction {
  /** The package's skill folder — the symlink target. */
  readonly target: string;
  /** `<installedSkillsDir>/<folderName>` — where the symlink is created. */
  readonly linkPath: string;
  /** created (absent), skipped (already correct / a real dir), or replaced. */
  readonly action: "created" | "skipped" | "replaced";
  /** The skill folder name (the discovery key). */
  readonly folderName: string;
  /** The package the skill came from. */
  readonly packageName: string;
}

/** What currently occupies a candidate link path. */
type LinkState =
  | { readonly kind: "absent" }
  | { readonly kind: "symlink"; readonly target: string }
  | { readonly kind: "other" };

/** Classify a link path: absent, our-or-another symlink, or a real entry. */
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

/** Skill folders (immediate subdirs with a `SKILL.md`) under `<root>/skills`. */
function packageSkillDirs(root: string): string[] {
  const skillsDir = join(root, "skills");
  let names: string[];
  try {
    names = readdirSync(skillsDir);
  } catch {
    return []; // No `skills/` dir — the common case.
  }
  const out: string[] = [];
  for (const name of names) {
    const dir = join(skillsDir, name);
    try {
      if (lstatSync(dir).isDirectory() && existsSync(join(dir, "SKILL.md"))) {
        out.push(dir);
      }
    } catch {
      // Unreadable entry — skip.
    }
  }
  return out;
}

/**
 * Plan the symlink actions that install each resolved package's `skills/*` into
 * the installed-skills discovery root. First-seen wins on a folder-name clash
 * across packages. A real (non-symlink) entry at the link path is left untouched
 * (`skipped`) so a manually-installed skill is never clobbered.
 *
 * @param resolved - The resolved packages (each carrying its on-disk `root`).
 * @returns The planned actions (including `skipped`, for an accurate preview).
 * @note Impure — stats the filesystem to decide each action.
 */
export function planSkillInstall(
  resolved: readonly ResolvedPackage[],
): SkillLinkAction[] {
  const dest = installedSkillsDir();
  const actions: SkillLinkAction[] = [];
  const seen = new Set<string>();
  for (const pkg of resolved) {
    for (const skillDir of packageSkillDirs(pkg.root)) {
      const folderName = basename(skillDir);
      if (seen.has(folderName)) continue;
      seen.add(folderName);
      const linkPath = resolve(dest, folderName);
      const state = linkState(linkPath);
      const action: SkillLinkAction["action"] =
        state.kind === "absent"
          ? "created"
          : state.kind === "symlink" && state.target === skillDir
            ? "skipped"
            : state.kind === "symlink"
              ? "replaced"
              : "skipped";
      actions.push({
        target: skillDir,
        linkPath,
        action,
        folderName,
        packageName: pkg.name,
      });
    }
  }
  return actions;
}
