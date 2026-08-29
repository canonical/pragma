/**
 * Plan the symlink install of package-provided skills (U10).
 *
 * Design-system packages ship a top-level `skills/<name>/SKILL.md`, but skill
 * discovery only scans the project root and the installed-skills root — never a
 * resolved package's clone/dir. So `sources update` INSTALLS each package's
 * skills into the installed-skills root (`$XDG_DATA_HOME/<bin>/skills`) as
 * symlinks, exactly the root `discoverSkills` already reads. Precedence is
 * preserved (a project `.<bin>/skills` entry still wins — it is discovered
 * first), and the update Task stays reversible (each created link carries an
 * unlink undo).
 *
 * Installing alone leaks, because planning walks the PACKAGES and so only ever
 * visits a skill that still exists. When a package DROPS one (a `0.1.2` that
 * shipped `component-specifier` upgrading to a `0.2.0` that does not), the link
 * the previous update installed is never revisited and is left dangling at a
 * target that no longer exists — which reads as a broken install rather than the
 * intentional removal it is, and which `skill` commands can still list or try to
 * open. So planning ALSO walks the installed root and prunes those, under a
 * deliberately narrow rule: an entry is removed only when this run did not plan
 * it AND it is a symlink whose target is gone. A real directory is a
 * manually-installed skill and a still-resolving symlink is someone's own link;
 * neither is this update's to delete.
 *
 * Decisions run against REAL fs here so the update's `--dry-run` plan is
 * accurate; the composed Task performs only the symlink/delete effects.
 */

import {
  existsSync,
  lstatSync,
  readdirSync,
  readlinkSync,
  statSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";
import type { ResolvedPackage } from "../../kernel/runtime/refs/index.js";
// The ownership test, imported rather than reimplemented: `setup skills` and
// this module must not be able to disagree about which links belong to pragma.
// `setupSkills.ts` reaches `@canonical/harnesses` only through a DYNAMIC
// import, so this edge adds no static one (`capabilities/lazy.test.ts`).
import { withinAnyRoot } from "../setup/operations/setupSkills.js";
import { installedSkillsDir } from "../skill/discover.js";

/** One planned skill symlink into the installed-skills root. */
export interface SkillLinkAction {
  /**
   * The symlink target: the package's skill folder for an install, or — on a
   * `pruned` entry — the missing target the stale link still points at, kept so
   * the prune's undo can put the link back exactly as it was.
   */
  readonly target: string;
  /** `<installedSkillsDir>/<folderName>` — where the symlink is created. */
  readonly linkPath: string;
  /**
   * created (absent), skipped (already correct / a real dir), replaced, or
   * pruned (an unplanned link whose target is gone — deleted, not re-created).
   */
  readonly action: "created" | "skipped" | "replaced" | "pruned";
  /** The skill folder name (the discovery key). */
  readonly folderName: string;
  /**
   * The package the skill came from. Absent on a `pruned` entry: a stale link
   * records only a target path, and the package that installed it is precisely
   * the one that no longer provides the skill — there is nothing honest left to
   * attribute it to.
   */
  readonly packageName?: string;
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
      // `stat`, not `lstat`: a package that ships `skills/<name>` as a SYMLINK
      // — the ordinary pnpm / monorepo / `file:` layout — contributed nothing
      // at all, silently, because `lstat` reports the link and not the
      // directory behind it. Discovery uses `stat`; so does this now.
      if (statSync(dir).isDirectory() && existsSync(join(dir, "SKILL.md"))) {
        out.push(dir);
      }
    } catch {
      // Unreadable entry — skip.
    }
  }
  return out;
}

/**
 * Plan the removal of the links a package has since dropped.
 *
 * The install pass walks the packages, so it can only ever visit a skill that
 * still exists; this pass walks the installed root, which is the ONLY place a
 * dropped skill still shows up. An entry is pruned only when both hold: this run
 * did not plan it, and it is a symlink whose target is gone. Both halves matter —
 *
 * - a real (non-symlink) entry is a manually-installed skill, which the install
 *   pass already refuses to clobber (`skipped`) and which this pass must refuse
 *   just as firmly: "unplanned" is exactly what a hand-placed skill looks like;
 * - a symlink whose target still resolves is someone's own link into a checkout
 *   this command knows nothing about. Unplanned does not make it garbage, and an
 *   update that silently ate it would be a worse bug than the dangling link.
 *
 * A broken target, by contrast, cannot be anything but debris: nothing can read
 * it, and re-creating it is a matter of re-running the update that installed it
 * (which is also what this prune's undo does).
 *
 * @param dest - The installed-skills root.
 * @param planned - Every folder name the install pass planned, whatever action.
 * @returns One `pruned` action per stale link, for the plan and its preview.
 * @note Impure — reads the installed root and stats each entry's target.
 */
function planStaleLinkPrunes(
  dest: string,
  planned: ReadonlySet<string>,
): SkillLinkAction[] {
  let names: string[];
  try {
    names = readdirSync(dest);
  } catch {
    return []; // No installed root — nothing was ever installed to go stale.
  }
  const out: SkillLinkAction[] = [];
  for (const folderName of names) {
    if (planned.has(folderName)) continue;
    const linkPath = resolve(dest, folderName);
    const state = linkState(linkPath);
    if (state.kind !== "symlink") continue;
    // A relative target is stored relative to the link's OWN directory, which
    // for an entry of the installed root is that root itself.
    if (existsSync(resolve(dest, state.target))) continue;
    out.push({ target: state.target, linkPath, action: "pruned", folderName });
  }
  return out;
}

/**
 * Plan the symlink actions that install each resolved package's `skills/*` into
 * the installed-skills discovery root, then the removals that retire the links
 * a package has since dropped. First-seen wins on a folder-name clash
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
      // Already correct means the link RESOLVES to the skill dir, not that its
      // raw `readlink` string equals an absolute path. A relative link was
      // therefore never "already correct": it was torn down and rebuilt on
      // every single update, and the sibling planner reported it as drift.
      const resolvesToSkill =
        state.kind === "symlink" &&
        resolve(dest, state.target) === resolve(skillDir);
      const action: SkillLinkAction["action"] =
        state.kind === "absent"
          ? "created"
          : resolvesToSkill
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
  // `seen` is every folder name this run planned — the `skipped` ones included,
  // so a name a package still provides is never a prune candidate even when the
  // install pass decided to leave its entry alone.
  actions.push(...planStaleLinkPrunes(dest, seen));
  return actions;
}

/**
 * One planned link action in a HARNESS skills directory (layer 2).
 *
 * Layer 1 (`<installedSkillsDir>/<name>` → the package's folder) is what
 * {@link planSkillInstall} owns. This is the layer above it: the links inside
 * `~/.claude/skills` and `~/.agents/skills` that point AT layer 1 — a link to a
 * link — and that `setup skills` owns.
 */
export interface BandLinkAction {
  readonly target: string;
  readonly linkPath: string;
  readonly action: "created" | "replaced" | "pruned";
  readonly folderName: string;
  /** The harness directory's display name, for the progress line. */
  readonly dirName: string;
  /**
   * The target the link ALREADY holds, recorded only for a `replaced` action so
   * its undo can put that link back. Without it the undo could only delete what
   * the forward run created, which restores an ABSENT path — a state that never
   * existed — instead of the link the run overwrote.
   *
   * Stored as `readlink` returned it, not resolved: a relative link is relative
   * to its own directory, which for a candidate of `dir` is `dir` itself, so
   * re-linking the raw value reproduces the link exactly as found.
   */
  readonly previousTarget?: string;
}

/**
 * Plan the CONVERGE-ONLY refresh of the global band's harness skill links.
 *
 * The reported bug lives here. `sources update` installed and pruned layer 1
 * and stopped, so a new pack skill reached no harness directory until the user
 * separately ran `setup skills`, and a dropped one left its layer-2 link
 * dangling with nothing that would ever clear it. This closes the loop, under
 * two rules that are the entire safety argument:
 *
 * 1. CONVERGE-ONLY. `dirs` are directories that already exist — this function
 *    never creates one, and the caller composes no `mkdir`. A `sources update`
 *    that materialised `~/.claude/skills` would be litter, and would silently
 *    opt the user into linking they never asked for.
 * 2. OWNERSHIP, by the SAME test `setup skills` uses. A path is this command's
 *    to touch only when it holds a symlink resolving INSIDE one of the global
 *    band's roots (`withinAnyRoot`, a pure path-SEGMENT test that reads nothing
 *    — so it still answers correctly after the layer-1 target is gone, which is
 *    exactly the stale case). A real directory is a hand-installed skill; a
 *    symlink pointing anywhere else is the user's own; a `<root>-backup/foo`
 *    sibling is not "inside" despite sharing a string prefix. None is removed.
 *
 *    THE SET, NOT JUST THE INSTALLED ROOT, and that is what keeps precedence
 *    true one layer up. A harness link left pointing at the BUNDLED snapshot
 *    for a skill this update has just installed for real is owned, so it is
 *    `replaced` onto the installed copy. Tested against the installed root
 *    alone it read as "someone else's link" and was skipped — and the user who
 *    deliberately ran `sources update` would have kept running the shipped copy.
 *
 * The plan is derived from the layer-1 plan rather than from a filesystem
 * re-read, because at planning time the layer-1 writes have not happened yet:
 * `surviving` is the post-update truth, and reading the disk would see the
 * pre-update state. That is also why a surviving name always targets
 * `roots[0]`: layer 1 is about to hold it, whether or not it does now.
 *
 * A RETIRED NAME IS NOT AUTOMATICALLY DEBRIS any more. The fallback roots
 * (today: the bundled snapshot) are NOT written by this update, so their
 * contents ARE readable at plan time — and a skill the packages dropped that
 * the shipped snapshot still carries is still discoverable, still listed by
 * `skill list`, and so still belongs in the harness directory. Such a link is
 * RETARGETED onto the surviving root rather than pruned; only a name no root
 * provides at all is deleted.
 *
 * @param dirs - The EXISTING global link directories.
 * @param roots - The global band's source roots in PRECEDENCE order.
 *   `roots[0]` is the installed root (layer 1) every surviving name targets;
 *   the rest are fallbacks a retired name may still resolve in. The whole set
 *   is the ownership set.
 * @param surviving - Folder names layer 1 will hold after this update.
 * @param retired - Folder names layer 1 is pruning in this update.
 * @returns The layer-2 actions, for the plan and its effects.
 * @note Impure — lstats each candidate link path, and stats the fallback roots
 *   for each retired name.
 */
export function planBandSkillLinks(
  dirs: readonly { dir: string; name: string }[],
  roots: readonly string[],
  surviving: readonly string[],
  retired: readonly string[],
): BandLinkAction[] {
  const dest = resolve(roots[0] as string);
  /** The first FALLBACK root that still holds `folderName`, if any. */
  const fallback = (folderName: string): string | undefined =>
    roots
      .slice(1)
      .map((root) => resolve(root, folderName))
      .find((candidate) => existsSync(candidate));
  const out: BandLinkAction[] = [];
  for (const { dir, name } of dirs) {
    for (const folderName of surviving) {
      const linkPath = resolve(dir, folderName);
      const target = resolve(dest, folderName);
      const state = linkState(linkPath);
      if (state.kind === "other") continue; // A hand-placed entry — never ours.
      if (state.kind === "absent") {
        out.push({
          target,
          linkPath,
          action: "created",
          folderName,
          dirName: name,
        });
        continue;
      }
      if (resolve(dir, state.target) === target) continue; // Already correct.
      // A symlink pointing outside every band root is the user's own link into
      // their own checkout. Unplanned does not make it ours to replace.
      if (!withinAnyRoot(roots, linkPath, state.target)) continue;
      out.push({
        target,
        linkPath,
        action: "replaced",
        folderName,
        dirName: name,
        previousTarget: state.target,
      });
    }
    for (const folderName of retired) {
      const linkPath = resolve(dir, folderName);
      const state = linkState(linkPath);
      if (state.kind !== "symlink") continue;
      if (!withinAnyRoot(roots, linkPath, state.target)) continue;
      const surviving = fallback(folderName);
      if (surviving !== undefined) {
        // Dropped upstream, still shipped: retarget rather than delete. Already
        // correct is nothing to do.
        if (resolve(dir, state.target) === surviving) continue;
        out.push({
          target: surviving,
          linkPath,
          action: "replaced",
          folderName,
          dirName: name,
          previousTarget: state.target,
        });
        continue;
      }
      out.push({
        target: resolve(dir, state.target),
        linkPath,
        action: "pruned",
        folderName,
        dirName: name,
      });
    }
  }
  return out;
}
