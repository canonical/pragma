/**
 * `setup skills` — symlink discovered skills into harness skill directories.
 *
 * SCOPE-MATCHED: the scope picks the source root AND the link destination, and
 * the two always match.
 *
 * - global (the default): INSTALLED skills (`$XDG_DATA_HOME/<bin>/skills`, where
 *   `sources update` puts package skills) AND the BUNDLED snapshot this package
 *   ships (`bundled-skills/`, last in precedence) link into user-level harness
 *   skill directories — the cross-client `~/.agents/skills`, plus the user-level
 *   directory of each detected harness whose user-level location is verified.
 *   The global scope is therefore a root SET, and every rule below that used to
 *   read one `sourceRoot` ranges over it: what a skill resolves to (first-seen
 *   wins, so an installed skill beats the shipped copy), what this command
 *   OWNS, and what its stale sweep is entitled to touch.
 * - project (`--local`): PROJECT skills (`<cwd>/.<bin>/skills`) link into the
 *   project's harness directories — the checked-in, team-shared arrangement.
 *
 * Cross-scope linking is what this replaces: linking installed skills into a
 * repository's directories leaks machine state into a checkout, and linking a
 * repository's skills into the home directory applies one project's skills
 * machine-wide. Neither is ever what the user asked for.
 *
 * A BUNDLED SKILL IS LINKED, NOT COPIED, and that is a decision about who owns
 * the target directory. Every other link this command writes points into a
 * directory pragma controls (`$XDG_DATA_HOME/<bin>/skills`, or the user's own
 * repository); a bundled one points into the package directory, which the
 * PACKAGE MANAGER owns and may move or delete without telling us — a pnpm or
 * npx layout puts the version in the path, so an upgrade leaves the link
 * dangling. Copying would avoid that and cost more than it saves: `linkState`
 * classifies a real directory as `other`, and this module treats `other` as
 * hand-placed and never touches it. So a copied skill could never be updated,
 * never be retired, and never be removed by `--undo` — pragma would be writing
 * permanent, silently stale directories into `~/.claude/skills`.
 *
 * A dangling link, by contrast, the reconcile ALREADY repairs, and this was
 * checked rather than assumed: `detectSkills` classifies a link that does not
 * resolve to the current skill as `replaced` (delete + relink) whatever it
 * points at, so the next `setup skills` — or the layer-2 pass `sources update`
 * runs — moves it onto the new package directory. The one thing that had to
 * change is ownership: `withinRoot` against the installed root alone read a
 * bundled-pointing link as somebody else's and skipped it, so the sweep and the
 * relink both range over the root SET now ({@link withinAnyRoot}). The residual
 * window is between an upgrade and the next reconcile, which is the same window
 * a `sources update` link into a cleared ref cache already has.
 *
 * Split into `detectSkills` (discovery, harness detection, and the per-link
 * create/skip/replace DECISION, all against the real filesystem up front, so
 * the plan and the recap reflect true state) and pure compose bodies performing
 * only the symlink/delete effects the dry-run interpreter mocks.
 */

import {
  existsSync,
  lstatSync,
  readdirSync,
  readlinkSync,
  statSync,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import {
  deleteFile,
  mkdir,
  sequence_,
  symlink,
  type Task,
} from "@canonical/task";
import { BIN_NAME } from "../../../constants.js";
import type { PragmaRuntime } from "../../../kernel/runtime/index.js";
import type { Scope } from "../types.js";

/** Cross-client skill directory, shared across all harnesses. */
const CROSS_CLIENT_DIR = ".agents/skills";

/**
 * The harnesses whose USER-LEVEL skills directory is verified against the
 * harness's own documentation, and therefore safe to link into on the global
 * scope. A harness absent from this set simply contributes no global link
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
   * Whether this link path currently holds a symlink INTO the scope's skill
   * root — the ownership test removal turns on. A link pointing anywhere else
   * is the user's and is never this command's to delete, and a real (non-link)
   * entry is never touched at all.
   */
  readonly owned: boolean;
  /**
   * Whether a REAL (non-symlink) entry occupies the link path. Such a path is
   * `skipped` for the same reason an already-correct link is — neither is
   * anything to do — but they are not the same state: one is a link this
   * command maintains, the other is a hand-placed directory it will never
   * touch, and reporting both as "current" told the user a link exists where
   * none does.
   */
  readonly blocked: boolean;
}

/**
 * The detected skill-linking plan for ONE scope: the source root, the target
 * directories, the decided per-link actions, and the counts the plan row
 * reports. `available` is false when the scope's root holds no skills.
 */
export interface SkillsDetection {
  readonly scope: Scope;
  /**
   * The scope's source roots, in PRECEDENCE order — the directories skills are
   * discovered from, and the set every ownership test ranges over. One entry
   * for the project scope; installed-then-bundled for the global one.
   */
  readonly sourceRoots: readonly string[];
  /**
   * The scope's PRIMARY source root — `sourceRoots[0]`, and the one the skip
   * reason and the doctor row name. It is the root a user can DO something
   * about: the project directory they fill by hand, or the installed root
   * `sources update` writes. Naming the bundled snapshot instead would point
   * them at a directory inside their node_modules that they must never edit.
   */
  readonly sourceRoot: string;
  /**
   * Whether ANY of {@link sourceRoots} exists on disk — deliberately NOT the
   * same question as {@link available}, which asks only whether they hold a
   * skill.
   *
   * The two were one flag, and conflating them is a wipe hazard. A run where
   * `XDG_DATA_HOME` points somewhere else, or where `sources update` has never
   * run, discovers zero skills — and a reconcile keyed on that alone would read
   * every link in `~/.claude/skills` as garbage and delete it. An ABSENT root
   * means this command has NO OPINION about the scope and touches nothing. Only
   * an EXISTING root that no longer holds a given skill is evidence the skill
   * was retired, which is the one thing the sweep is entitled to act on.
   */
  readonly rootExists: boolean;
  readonly available: boolean;
  readonly targets: readonly { readonly dir: string; readonly name: string }[];
  readonly actions: readonly SymlinkAction[];
  /**
   * Links this scope OWNS that no CURRENT skill accounts for: the source root
   * emptied, or one skill removed upstream. They are not part of the forward
   * plan — there is nothing left to link them to — but they are exactly what
   * removal exists to clear, and deriving removal from the per-skill actions
   * alone left them on disk while `--undo` reported zero work.
   */
  readonly orphans: readonly SymlinkAction[];
  readonly skillCount: number;
  readonly warnings: readonly string[];
}

/** What currently occupies a candidate link path. */
type LinkState =
  | { readonly kind: "absent" }
  | { readonly kind: "symlink"; readonly target: string }
  | { readonly kind: "other" };

/**
 * Whether a link's destination lives INSIDE the scope's skill root — the
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
 * @param root - The scope's skill source root, absolute.
 * @param linkPath - The absolute path of the link being classified.
 * @param rawTarget - The link's destination exactly as `readlink` reported it.
 * @returns Whether the destination is a path under the root.
 * @note Pure — it resolves and compares strings, and reads nothing.
 */
export function withinRoot(
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
 * Whether a link's destination lives inside ANY of the scope's skill roots.
 *
 * The scope ownership test, once the global scope stopped being a single
 * directory. Every caller that used to ask {@link withinRoot} about one path
 * asks this about the set, so a link into the bundled snapshot is as much this
 * command's to maintain as one into the installed root — and a link into
 * neither is still nobody's business but the user's.
 *
 * @param roots - The scope's skill source roots, absolute.
 * @param linkPath - The absolute path of the link being classified.
 * @param rawTarget - The link's destination exactly as `readlink` reported it.
 * @returns Whether the destination is a path under one of the roots.
 * @note Pure — {@link withinRoot} reads nothing, and neither does this.
 */
export function withinAnyRoot(
  roots: readonly string[],
  linkPath: string,
  rawTarget: string,
): boolean {
  return roots.some((root) => withinRoot(root, linkPath, rawTarget));
}

/**
 * The directory a release's bundled skills live in, inside the package.
 *
 * Named here because it is the ONE shape that identifies a link as pragma's
 * without asking where the package currently sits.
 */
const BUNDLED_DIR_SEGMENT = "bundled-skills";

/**
 * Whether this link is pragma's to rewrite or remove.
 *
 * Residence in a current root is not sufficient, in EITHER direction.
 *
 * Too narrow: after an upgrade under a version-stamped layout (pnpm, npx,
 * volta) a link points into `…/pragma-cli@0.34.0/bundled-skills/<name>`, a
 * directory that no longer exists and is inside no current root. Ownership by
 * residence alone reads pragma's own link as somebody else's, so the sweep
 * declines it and the per-skill pass cannot reach it once the skill is gone —
 * the dangling link then survives every reconcile, invisible to setup and to
 * doctor. The path SHAPE still says whose it is.
 *
 * Too wide: the bundled root is present on every install now, so a folder name
 * that collides with a bundled skill is reachable with no user action at all.
 * A user's own `~/.claude/skills/design-auditor -> ~/work/design-auditor`
 * must not become this command's to delete just because a bundled skill shares
 * its name. That is the same rule a hand-placed real directory already gets.
 *
 * @param roots - The scope's source roots.
 * @param linkPath - The link's own path, absolute.
 * @param rawTarget - Its unresolved `readlink` value.
 * @returns Whether pragma created this link.
 * @note Pure — resolves strings, reads nothing.
 */
function ownsLink(
  roots: readonly string[],
  linkPath: string,
  rawTarget: string,
): boolean {
  if (withinAnyRoot(roots, linkPath, rawTarget)) return true;
  return resolve(dirname(linkPath), rawTarget)
    .split(sep)
    .includes(BUNDLED_DIR_SEGMENT);
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
 * The link directories for a scope. Project: every detected harness's
 * project-rooted skills directory plus the cross-client one, exactly as
 * before. Global: the same construction rooted at the user's home directory,
 * but only for the harnesses in {@link VERIFIED_GLOBAL_SKILL_HARNESSES} —
 * plus the cross-client directory, which every client reads by convention.
 *
 * @param detected - The detected harnesses.
 * @param scope - The scope being set up.
 * @param root - The scope's link root (`cwd` for project, home for global).
 * @returns The deduplicated target directories, first-seen wins.
 */
function linkTargets(
  detected: readonly {
    harness: { id: string; name: string; skillsPath: (root: string) => string };
  }[],
  scope: Scope,
  root: string,
): { dir: string; name: string }[] {
  const seen = new Set<string>();
  const targets: { dir: string; name: string }[] = [];
  for (const d of detected) {
    if (
      scope === "global" &&
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
 * The GLOBAL scope's link directories that ALREADY EXIST — the converge-only set
 * `sources update` is allowed to refresh.
 *
 * The filter is the whole policy, and it is why this is a separate export
 * rather than `linkTargets` made public. `composeSkills` mkdirs its targets and
 * `linkTargets` unconditionally appends `~/.agents/skills`, so an update that
 * reused them would CREATE harness directories on a machine that never asked
 * for skill linking — and `sources update` is `mcp: { expose: true }` with
 * `mutates: true`, which would mean an agent, over MCP, after a network fetch,
 * conjuring `~/.claude/skills` into existence. Refresh what is there; never
 * bring a directory into being.
 *
 * The scope is not widened by this: `VERIFIED_GLOBAL_SKILL_HARNESSES` and the
 * scope covenant are exactly the ones `setup skills --global` already honours,
 * because this is the same `linkTargets` call it makes.
 *
 * @param cwd - The invocation's working directory (harness detection reads it).
 * @returns The existing global link directories.
 * @note Impure — detects harnesses and stats each candidate directory.
 */
export async function existingGlobalSkillDirs(
  cwd: string,
): Promise<readonly { dir: string; name: string }[]> {
  const [{ detectHarnesses, readPlatformEnv, userHome }, { runTask }] =
    await Promise.all([
      import("@canonical/harnesses"),
      import("@canonical/task/node"),
    ]);
  const detected = await runTask(detectHarnesses(cwd));
  const home = userHome(readPlatformEnv());
  return linkTargets(detected, "global", home).filter((t) =>
    rootIsPresent(t.dir),
  );
}

/**
 * Whether the scope's source root exists as a directory.
 *
 * `stat`, not `lstat`: a root the user symlinked into place is still a root.
 * Every failure — absent, unreadable, not a directory — answers false, which is
 * the fail-closed direction: the sweep then declines to act at all.
 *
 * @param root - The scope's skill source root, absolute.
 * @returns Whether it is a directory this run can have an opinion about.
 * @note Impure — stats the real filesystem.
 */
function rootIsPresent(root: string): boolean {
  try {
    return statSync(root).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Every owned link sitting in the target directories that the per-skill pass
 * did not already visit.
 *
 * The forward pass enumerates CURRENT skills, so it can only ever see links a
 * skill still exists for. Once the source root is emptied — or one skill is
 * removed upstream — the link it left behind is invisible to that pass, and
 * removal derived from it found nothing to do. Ownership is the same
 * containment test the forward pass applies, so a user's own link is no more
 * removable here than it is there.
 *
 * SAFETY GATE: nothing is orphaned when the source root does not EXIST. An
 * absent root is "no opinion", never "everything here is stale" — see
 * {@link SkillsDetection.rootExists}. The containment test below is a pure
 * string test that reads nothing, so it still answers correctly once the link's
 * target is gone; the root's own existence is the separate question of whether
 * this command is entitled to answer at all.
 *
 * THE GATE IS PER ROOT, not per scope. A scope with two roots must not let one
 * of them vouch for the other: if the installed root is deleted (or
 * `XDG_DATA_HOME` points elsewhere for one invocation) while the bundled
 * snapshot — which ships inside the package and so is essentially always there
 * — still exists, a scope-wide "some root exists" gate would hand the sweep every
 * link into the vanished root and call it stale. So `existingRoots` is passed
 * already filtered, and a link is orphanable only when the root it points into
 * is one of them.
 *
 * @param targets - The scope's link directories.
 * @param existingRoots - The scope's source roots that EXIST (empty ⇒ no
 *   orphans at all).
 * @param covered - Link paths the per-skill pass already decided.
 * @returns The owned links no current skill accounts for.
 * @note Impure — reads each target directory and lstats its entries.
 */
function orphanedLinks(
  targets: readonly { dir: string; name: string }[],
  existingRoots: readonly string[],
  covered: ReadonlySet<string>,
): SymlinkAction[] {
  if (existingRoots.length === 0) return [];
  const orphans: SymlinkAction[] = [];
  for (const { dir, name } of targets) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue; // The directory does not exist — it holds no links.
    }
    for (const entry of entries) {
      const linkPath = resolve(dir, entry);
      if (covered.has(linkPath)) continue;
      const state = linkState(linkPath);
      if (state.kind !== "symlink") continue;
      // `ownsLink`, not `withinAnyRoot`: a link into a REMOVED version-stamped
      // package directory is inside no current root, and once its skill is gone
      // from the release no per-skill action covers the path either. Residence
      // alone would leave it dangling forever.
      if (!ownsLink(existingRoots, linkPath, state.target)) continue;
      orphans.push({
        skillName: entry,
        target: resolve(dirname(linkPath), state.target),
        linkPath,
        action: "skipped",
        harnessName: name,
        blocked: false,
        owned: true,
      });
    }
  }
  return orphans;
}

/**
 * Discover the scope's skills, detect harnesses, and decide each link action
 * (real filesystem, up front).
 *
 * Target discovery runs even when the scope holds NO skills: the directories are
 * where this command's own links live, and a removal has to be able to find
 * them after the source root has been emptied.
 *
 * @param rt - The per-invocation runtime.
 * @param scope - Which scope to plan: global (installed skills) or project.
 * @returns The scope's link plan.
 * @note Impure — reads the filesystem (skills + harnesses + existing links).
 */
export async function detectSkills(
  rt: PragmaRuntime,
  scope: Scope,
): Promise<SkillsDetection> {
  const cwd = rt.cwd;
  const [
    { discoverSkillsFrom, globalSkillRoots, projectSkillsDir },
    { detectHarnesses, readPlatformEnv, userHome },
    { runTask },
  ] = await Promise.all([
    import("../../skill/discover.js"),
    import("@canonical/harnesses"),
    import("@canonical/task/node"),
  ]);

  // The scope picks the root SET; `globalSkillRoots` owns the global scope's
  // order (installed, then bundled) so this module and `sources update` cannot
  // drift on which directories the scope is.
  const sourceRoots =
    scope === "project" ? [projectSkillsDir(cwd)] : globalSkillRoots();
  const sourceRoot = sourceRoots[0] as string;
  const linkRoot = scope === "project" ? cwd : userHome(readPlatformEnv());
  // First-seen wins, so an installed skill shadows the bundled copy of the same
  // name: someone who ran `sources update` links the CURRENT skill.
  const skills = discoverSkillsFrom(sourceRoots);
  const existingRoots = sourceRoots.filter(rootIsPresent);
  const rootExists = existingRoots.length > 0;
  const detected = await runTask(detectHarnesses(cwd));
  const targets = linkTargets(detected, scope, linkRoot);

  // Decide each action against REAL fs (so the preview is accurate). Dangling
  // or wrong-target symlinks are `replaced` (delete + relink); a real
  // (non-symlink) file or directory at the path is `skipped` — a hand-placed
  // skill is never this command's to delete.
  const actions: SymlinkAction[] = [];
  for (const { dir, name } of targets) {
    for (const skill of skills) {
      const linkPath = resolve(dir, skill.folderName);
      const state = linkState(linkPath);
      // A link is already correct when it RESOLVES to the skill, not when its
      // raw `readlink` string equals an absolute path. Comparing the raw target
      // classified every RELATIVE link as `replaced`, so a functionally correct
      // link was torn down and rebuilt on every run and doctor reported it as
      // `N links point elsewhere`.
      const resolvesToSkill =
        state.kind === "symlink" &&
        resolve(dirname(linkPath), state.target) === skill.sourcePath;
      const owned =
        state.kind === "symlink" &&
        ownsLink(sourceRoots, linkPath, state.target);
      // A link is FOREIGN when it resolves to something real that pragma does
      // not own — a user's own `~/.claude/skills/design-auditor ->
      // ~/work/design-auditor`. That is `skipped`, the same answer a
      // hand-placed real directory gets: `composeSkills` composes every
      // non-skipped row, so calling it `replaced` would delete the link. The
      // bundled root is on every install now, so a name collision with a
      // shipped skill is reachable with no user action at all.
      //
      // A DANGLING link is replaced regardless of where it pointed. Nothing
      // depends on a broken link, so deleting it destroys nothing — while
      // leaving it blocks the skill forever and, for pragma's own link into a
      // cleared cache or a replaced package directory, is the repair. An
      // unresolvable target cannot vouch for its owner either way.
      const foreign =
        state.kind === "symlink" &&
        !owned &&
        existsSync(resolve(dirname(linkPath), state.target));
      const action: SymlinkAction["action"] =
        state.kind === "absent"
          ? "created"
          : resolvesToSkill
            ? "skipped"
            : state.kind === "symlink" && !foreign
              ? "replaced"
              : "skipped";
      actions.push({
        skillName: skill.name,
        target: skill.sourcePath,
        linkPath,
        action,
        harnessName: name,
        blocked: state.kind === "other",
        owned,
      });
    }
  }

  const warnings = actions
    .filter((a) => a.action === "replaced")
    .map(
      (a) => `Replaced a stale symlink for ${a.skillName} in ${a.harnessName}`,
    );

  return {
    scope,
    sourceRoots,
    sourceRoot,
    rootExists,
    available: skills.length > 0,
    targets,
    actions,
    // Ownership above spans EVERY root (a pure string test that reads nothing,
    // so it still answers after a target is gone); the sweep below spans only
    // the roots that EXIST. Those are two different questions and the split is
    // deliberate — see {@link orphanedLinks}.
    orphans: orphanedLinks(
      targets,
      existingRoots,
      new Set(actions.map((a) => a.linkPath)),
    ),
    skillCount: skills.length,
    warnings,
  };
}

/**
 * The links a FORWARD run must retire: the ones this scope owns that no current
 * skill accounts for.
 *
 * The forward pass used to read `d.actions` alone, and `d.actions` enumerates
 * CURRENT skills — so once a skill was dropped upstream, the link it left behind
 * was invisible to it. `d.orphans` was computed and then read only by `--undo`,
 * which removes EVERY owned link rather than just the stale ones, so there was
 * no command that reconciled. Forward is where a reconcile belongs: the plan row
 * says so, and re-running the installer is what a user does to converge.
 *
 * Gated on {@link SkillsDetection.rootExists}: the sweep declines entirely when
 * the source root is absent. `d.orphans` is already empty in that case; the
 * guard is restated here so the safety rule is visible at the site that deletes.
 *
 * @param d - The detection gathered up front.
 * @returns The owned links no current skill accounts for.
 */
export const staleSkillLinks = (
  d: SkillsDetection,
): readonly SymlinkAction[] => (d.rootExists ? d.orphans : []);

/**
 * Compose the (re)link effects from a detection (builds ABSOLUTE link paths
 * itself).
 *
 * Built from re-runnable combinators (NOT a single-use `gen`) because `execute`
 * interprets the task twice (preview + perform). `created` links carry an undo;
 * a `replaced` link is delete-then-relink (idempotent); `skipped` is a no-op —
 * and a detection where every action is `skipped` and nothing is stale composes
 * NOTHING, so a converged re-run performs zero filesystem mutations.
 *
 * A forward run is a RECONCILE, not an append: it also deletes the links this
 * scope owns that no current skill accounts for (see {@link staleSkillLinks}), each
 * carrying its own re-creation as `undo`.
 *
 * @param d - The detection gathered up front.
 * @returns A Task that mkdirs each needed target, creates/replaces links, and
 *   removes the stale ones.
 */
export function composeSkills(d: SkillsDetection): Task<void> {
  const pending = d.available
    ? d.actions.filter((a) => a.action !== "skipped")
    : [];
  const stale = staleSkillLinks(d);
  if (pending.length === 0 && stale.length === 0) return sequence_([]);
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
  // The undo clears the path before re-linking: the undo interpreter MOCKS the
  // forward effects when collecting, so the delete above may never have run and
  // `fs.symlink` refuses an occupied path. Same shape `sources update`'s own
  // prune undo uses, for the same reason.
  for (const a of stale) {
    tasks.push(
      deleteFile(a.linkPath, {
        undo: sequence_([
          deleteFile(a.linkPath),
          symlink(a.target, a.linkPath),
        ]),
      }),
    );
  }
  return sequence_(tasks);
}

/**
 * The links this scope OWNS right now — every existing symlink pointing into the
 * scope's skill root, including dangling ones, ones already correct, and the
 * ones no current skill accounts for. This is what removal acts on, and it is
 * deliberately NOT the forward plan: undoing a freshly composed forward plan on
 * an already-linked tree reversed the mkdirs and removed nothing, while
 * reporting a step count.
 */
/**
 * The named reason a skills row skips, shared by the setup plan and the doctor
 * row so the two surfaces cannot word the same finding differently. Two strings
 * for one condition is how a user ends up unsure whether they are looking at one
 * problem or two.
 *
 * ABSENT AND EMPTY ARE NOT THE SAME SKIP. `available` is false for both — the
 * root holds no skill either way — but the parenthetical names a filesystem
 * fact, and telling a user their directory "is absent" while they are looking
 * at it is a wrong diagnosis, not a terse one. {@link
 * SkillsDetection.rootExists} is the flag that separates the two states
 * everywhere else in this module, so it separates them here too, and both
 * callers pass it rather than each re-deciding the wording.
 *
 * The GLOBAL sentence names where skills come from, because "no skills
 * installed" on its own is a dead end: a reader has no way to know that skills
 * arrive inside the configured packs rather than inside this CLI. The scope is
 * named as `local project` — the phrase the `--local` flag that selects it
 * points at — never by a type-layer word.
 *
 * @param sourceRoot - The scope's skill source root, already root-relative.
 * @param scope - The scope being reported.
 * @param rootExists - Whether that root exists ({@link
 *   SkillsDetection.rootExists}) — an existing root that holds no skill reports
 *   as empty, never as absent.
 * @returns The reason line.
 */
export const skillsSkipReason = (
  sourceRoot: string,
  scope: Scope,
  rootExists: boolean,
): string =>
  scope === "project"
    ? rootExists
      ? `nothing to link — this project holds no skills (${sourceRoot} is empty)`
      : `nothing to link — this project holds no skills (${sourceRoot} does not exist)`
    : `nothing to link — no skills installed yet; they arrive with the packs \`${BIN_NAME} sources update\` builds`;

/**
 * The remedy beneath that skip — {@link skillsSkipReason}'s twin, and authored
 * here for the same reason: the setup row and the doctor row must not word the
 * same finding differently.
 *
 * A skip with no remedy is a dead end. `setup` printed "no skills installed",
 * exited 0 claiming success, and gave the user no next step — while the
 * completions and lsp skips beside it each named an action. The scope decides
 * which action that is, because the scope decides where the skills come from:
 * the global root is filled ONLY by `sources update` (skills ship in the
 * configured packages, not in this CLI), and the local project's is a directory
 * the user fills by hand.
 *
 * It is the IMPERATIVE half of the pair. {@link skillsSkipReason} states the
 * finding and where skills come from; this line is the command to type, so a
 * surface that renders both reads as a fact followed by a next step rather than
 * as the same sentence twice.
 *
 * @param sourceRoot - The scope's skill source root, already root-relative.
 * @param scope - The scope being reported.
 * @returns The remedy line — an action that works on THIS machine now.
 */
export const skillsSkipRemedy = (sourceRoot: string, scope: Scope): string =>
  scope === "project"
    ? `add a skill at ${sourceRoot}/<name>/SKILL.md, then run this again`
    : `run \`${BIN_NAME} sources update\`, then run this again`;

export const ownedSkillLinks = (
  d: SkillsDetection,
): readonly SymlinkAction[] => [
  ...d.actions.filter((a) => a.owned),
  ...d.orphans,
];

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
