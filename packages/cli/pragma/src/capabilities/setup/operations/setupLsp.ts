/**
 * `setup lsp` — ensure the Terrazzo LSP extension is installed in every
 * VS Code-family editor present on this machine.
 *
 * There is no marketplace listing yet: the install is a VSIX SIDELOAD. The
 * published npm package bundles the VSIX, so the install is two exec steps —
 * fetch the package into a pragma-owned staging dir (`bun add`, so the VSIX
 * lands at a DURABLE path a user can retry by hand, not bunx's ephemeral
 * `/tmp/bunx-…` cache), then `<editor cli> --install-extension <vsix>` for
 * each detected editor. The package's own `install.mjs` bin is deliberately
 * NOT used: it hardcodes the `code` CLI, which is precisely what left
 * VSCodium/Cursor/Windsurf/Antigravity machines unable to install at all.
 *
 * `detectLsp` probes FOR REAL up front, and spawns NOTHING. An editor is
 * detected THREE ways, and each row records which one found it, because "no
 * editor found" and "found but nothing can be installed into it" are different
 * answers and only one of them is about this machine lacking the editor:
 *
 * 1. its CLI on PATH (the `editorClis` registry names them);
 * 2. its CLI inside its macOS APP BUNDLE — a stock macOS install puts nothing
 *    on PATH until the user runs the palette's "Shell Command: Install
 *    '<cli>' command in PATH", which is opt-in and usually never taken, so a
 *    PATH-only probe reported a machine that HAS VS Code as having none;
 * 3. its per-user configuration DIRECTORY, which is the last trace a fresh
 *    install leaves. Nothing can be installed through a directory, so such an
 *    editor carries no CLI path at all and its remedy is the palette command
 *    that settles it.
 *
 * It carries the extension when its extensions dir holds a
 * `canonical.terrazzo-lsp-extension-<version>/` entry, and is "installed" when
 * that entry is also new enough to work. Running `--list-extensions` instead
 * would be the natural probe, but Cursor's Linux launcher OPENS THE EDITOR on
 * that flag — a detection step must never launch an app, so the fs is the
 * source of truth. The full extension id is matched (not the old `terrazzo`
 * substring, which any other terrazzo-named extension could false-positive).
 *
 * Detection also asks whether the extensions directory could be WRITTEN, via
 * `probeWritable`, BEFORE any install is composed. A home-manager-managed
 * `~/.vscode/extensions` is a symlink into `/nix/store`, so
 * `--install-extension` there failed with a raw fs error or silently changed
 * nothing; that is now a named skip carrying the declaration that does work.
 * Per the owner, 2026-09-16, the decision is made by the DIRECTORY, never by
 * the OS: a Nix user's home is ordinary, and a non-Nix user can have a
 * read-only mount.
 *
 * Every one of those is a NAMED SKIP, not an error: the message says what was
 * looked for and what to do, and the run exits 0 — there is nothing on this
 * machine the step could honestly fail at. Real failures (fetch, sideload)
 * travel the task failure channel (`checkExecOk`) with a recovery that names a
 * command runnable on THIS machine, so the run-all can isolate the step
 * (S1-1) and a direct `setup lsp` still renders the original error.
 */

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { EditorCliDefinition, PlatformEnv } from "@canonical/harnesses";
import {
  type ExecResult,
  exec,
  exists,
  flatMap,
  mkdir,
  pure,
  sequence,
  sequence_,
  type Task,
} from "@canonical/task";
import { BIN_NAME } from "../../../constants.js";
import { PragmaError } from "../../../kernel/error/index.js";
import {
  checkExecOk,
  failPragma,
  guardMissingBinary,
} from "../../shared/index.js";
import { type Roots, shortenPath } from "../plan.js";
import type { LspState, WriteBlock } from "../types.js";
import { type FsProbe, probeWritable } from "./writability.js";

/**
 * The extension's publisher and name. Separate constants because the Nix
 * declaration names all three parts (`vscodeExtPublisher`, `vscodeExtName`,
 * `vscodeExtUniqueId`), and composing the id from them is what keeps the three
 * from drifting apart in one string.
 */
const EXTENSION_PUBLISHER = "canonical";
const EXTENSION_NAME = "terrazzo-lsp-extension";

/** The full extension id, as the editor's extensions dir spells it. */
const EXTENSION_ID = `${EXTENSION_PUBLISHER}.${EXTENSION_NAME}`;

/** The npm package whose tarball bundles the VSIX. */
const LSP_PACKAGE = "@canonical/terrazzo-lsp-extension";

/**
 * What a probe found, and the evidence that travels with it — a UNION, because
 * the three probes do not produce the same thing.
 *
 * A CLI probe yields a file to run; the user-directory probe yields only the
 * knowledge that the editor is here. Making `cliPath` optional on one flat
 * record said instead that any editor MIGHT have one, which put a
 * `cliPath ?? editor.cli` fallback at every exec site — four of them, none
 * reachable, each quietly ready to spawn a bare name on a machine where the
 * probe had already proved there is none.
 */
type EditorSource =
  | {
      /**
       * WHICH CLI probe found it. Reported per editor by both surfaces,
       * because it is the fact that tells a user whose `setup lsp` did nothing
       * whether the editor was missed or merely unreachable — the question the
       * old single-line "no editor CLI on PATH" could not answer.
       */
      readonly foundBy: "path" | "bundle";
      /**
       * The CLI file the probe actually found. Every exec runs THIS path
       * rather than the bare name: a bundle CLI is not on PATH at all, and
       * even for a PATH hit the probed file is the one this run verified
       * exists — re-resolving the bare name at spawn time could reach another.
       */
      readonly cliPath: string;
    }
  | {
      /**
       * Found by its per-user configuration DIRECTORY and nothing else. There
       * is no CLI to run, so this editor is never what the installer runs for;
       * the palette command that creates one is its remedy.
       */
      readonly foundBy: "user-dir";
    };

/**
 * What every detected editor carries, whichever probe found it: its registry
 * row, its extensions directory, and the two DIFFERENT questions about the
 * extension.
 *
 * `present` and `installed` are deliberately separate, and collapsing them is a
 * silent wrong-removal. `installed` is version-gated — an entry older than
 * {@link MIN_EXTENSION_VERSION} reports false, because the forward plan and
 * doctor must treat a copy that cannot start as not installed. But a REMOVAL
 * keyed on that same boolean would walk past a dead pre-0.8.3 copy that pragma
 * itself put there, report "nothing to remove", and leave it behind forever.
 * So removal keys on `present` (any matching entry at all) and everything else
 * keys on `installed` (present AND new enough to work).
 */
interface EditorFacts {
  readonly editor: EditorCliDefinition;
  /** Any `canonical.terrazzo-lsp-extension-*` entry, whatever its version. */
  readonly present: boolean;
  /** Present AND at least {@link MIN_EXTENSION_VERSION} — i.e. it works. */
  readonly installed: boolean;
  /**
   * The editor's extensions directory. Kept because the removal's forward
   * carrier needs a path that DEMONSTRABLY already exists (see
   * {@link composeLspRemoval}); when `present` is true, this is that path.
   */
  readonly extensionsDir: string;
  /**
   * The matching entry NAMES under {@link extensionsDir} — the artifacts
   * `present` is true about. The removal's postcondition probes exactly
   * these after the uninstall (see {@link composeLspRemoval}): the editor
   * CLI's exit code and the directory listing are DIFFERENT success
   * criteria, and only the directory is the one detection (and doctor)
   * believe.
   */
  readonly presentEntries: readonly string[];
  /**
   * Why this editor's extensions directory must not be written, when that is
   * the case. Absent means the folder is fine — which is not the same as "the
   * install can proceed": an editor found only by its user directory has no
   * CLI to run whatever its folder permits (see {@link installable}).
   *
   * A block is carried on the DETECTION rather than discovered by the writer
   * on purpose. The write is what used to discover it, and it discovered it as
   * a raw `EACCES` on a `failed` row with no next step; probing first turns
   * the same machine into a named skip with a remedy, and lets doctor report it
   * without writing anything at all.
   */
  readonly block?: WriteBlock;
}

/** One detected editor: the facts, plus what found it. */
export type DetectedEditor = EditorFacts & EditorSource;

/** An editor with a CLI to run — what {@link installable} narrows to. */
type RunnableEditor = EditorFacts & Extract<EditorSource, { cliPath: string }>;

/**
 * An editor nothing can be installed into: no CLI to run at all, or a folder
 * this command must not write to. The two shapes {@link describeBlock} answers
 * for, and the type that lets it read `block` without re-asking whether it is
 * there.
 */
type BlockedEditor =
  | (EditorFacts & Extract<EditorSource, { foundBy: "user-dir" }>)
  | (EditorFacts & {
      readonly foundBy: "path" | "bundle";
      readonly cliPath: string;
      readonly block: WriteBlock;
    });

/**
 * Whether an install can act on an editor at all: there is a CLI to RUN, and
 * its extensions folder can be WRITTEN.
 *
 * One predicate, because the answer is one question. Five call sites used to
 * spell their own half of it (`!e.installed && e.block === undefined`,
 * `e.present && e.block === undefined`, …), so adding a third way to be
 * unreachable would have meant finding all five.
 *
 * @param e - One detected editor.
 * @returns Whether the sideload can run for it.
 * @note Pure — reads the detection record.
 */
const installable = (e: DetectedEditor): e is RunnableEditor =>
  e.foundBy !== "user-dir" && e.block === undefined;

/** The editors nothing can be installed into, in registry order. */
const blockedEditors = (d: LspDetection): readonly BlockedEditor[] =>
  d.editors.filter((e): e is BlockedEditor => !installable(e));

/**
 * The detected LSP state: every editor the three probes found (each with its
 * provenance, its CLI file when there is one, its installed-state and any
 * block on its extensions folder), the staging dir the VSIX is fetched into,
 * and the aggregate {@link LspState}.
 *
 * `probed` is every CLI name that was LOOKED for, kept so the skip row can name
 * them: a skip that says only "no editor found" leaves the user guessing what
 * would have counted.
 */
export interface LspDetection {
  readonly available: true;
  readonly state: LspState;
  readonly editors: readonly DetectedEditor[];
  readonly probed: readonly string[];
  readonly stagingDir: string;
}

/**
 * The FIRST candidate path that exists, or `undefined` when none does — used
 * for both candidate lists (PATH, then the macOS app bundle), so a caller
 * learns not only whether the CLI is there but which file it is.
 *
 * The candidates come from `@canonical/harnesses`' `executableCandidates` —
 * the same helper harness detection resolves `process` signals with — rather
 * than from a local `PATH`-join here. That local version joined the BARE name
 * onto each PATH directory, which resolves nothing on Windows: `code`,
 * `codium` and friends install as `.cmd` shims, so every installed editor
 * went unseen and `setup lsp` took the no-editor path. That path is a named
 * SKIP, so the run exited 0 reporting a clean answer on a machine that had
 * the editor — a wrong skip reads as correct, which is worse than a wrong
 * failure. One implementation of the platform rules means the probe cannot
 * drift away from detection's.
 *
 * @param candidates - The candidate paths, strongest first.
 * @returns The first candidate that exists, or `undefined` when none does.
 * @note Impure — stats each candidate until one exists.
 */
const resolveCli = (candidates: readonly string[]): string | undefined =>
  candidates.find((candidate) => existsSync(candidate));

/**
 * The oldest extension release whose bundled language server actually starts.
 *
 * Every VSIX before this one ships the server as ~166 loose modules importing
 * `colorjs.io`, `@lezer/common` and `@lezer/css` by BARE SPECIFIER, with no
 * `node_modules` beside them — so the server dies on load under `node` and
 * under `bun --no-install`. It appeared to work only because the extension
 * prefers Bun, and Bun silently fetches missing packages from the network at
 * spawn time; a machine without that behaviour got a language server that
 * never started, and one with it got a server resolving unpinned dependencies
 * over the wire. Fixed in 0.8.3, which bundles the server into one file
 * (canonical/design-tokens#110).
 */
const MIN_EXTENSION_VERSION = "0.8.3";

/** {@link MIN_EXTENSION_VERSION}, parsed once. */
const MINIMUM: number[] = MIN_EXTENSION_VERSION.split(".").map(Number);

/**
 * A version this check can actually read: dot-separated digit runs, nothing
 * else. Deliberately strict — see {@link parseVersion}.
 */
const NUMERIC_VERSION = /^\d+(?:\.\d+)*$/;

/**
 * Parse a dotted numeric version, or `undefined` when it is not one.
 *
 * `Number.parseInt` is the wrong tool here and quietly breaks the fail-closed
 * rule this module claims: it accepts numeric PREFIXES, so `1.0.0junk` reads
 * as `[1, 0, 0]`, and `|| 0` turns a `NaN` component into a zero, so
 * `1.invalid.0` also reads as `[1, 0, 0]`. Both then compare NEWER than the
 * minimum and report a broken extension as installed — the exact wrong-skip
 * this version check exists to prevent, reintroduced by the parser.
 *
 * So the whole string is validated before any component is trusted.
 */
const parseVersion = (value: string): number[] | undefined =>
  NUMERIC_VERSION.test(value)
    ? value.split(".").map((part) => Number(part))
    : undefined;

/** Compare two dotted numeric versions. Returns <0, 0, >0 like a comparator. */
const compareVersions = (left: number[], right: number[]): number => {
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const diff = (left[i] ?? 0) - (right[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

/**
 * The two facts an editor's extensions dir answers: is a copy THERE, and is it
 * new enough to WORK.
 *
 * `current` is version-aware on purpose. Matching any
 * `canonical.terrazzo-lsp-extension-*` entry meant a machine carrying a build
 * whose server cannot start reported `installed`, so `setup lsp` skipped it and
 * `doctor` called it healthy — a wrong skip that reads as correct, which is
 * worse than a wrong failure. Everyone who ran `setup lsp` before
 * {@link MIN_EXTENSION_VERSION} would have kept a dead language server forever,
 * with nothing telling them why. An unparseable suffix counts as too old: a
 * directory this function cannot read the version of is one it cannot vouch for.
 *
 * `present` is the same probe WITHOUT the version gate, and it exists because
 * removal asks a different question. A pre-0.8.3 copy is not `current`, but it
 * is unquestionably there, and it is a copy this command installed — so a
 * removal keyed on `current` would leave the dead extension on disk while
 * reporting success. See {@link DetectedEditor}.
 */
const extensionState = (
  editor: EditorCliDefinition,
  platform: PlatformEnv,
): { present: boolean; current: boolean; entries: string[] } => {
  let entries: string[];
  try {
    entries = readdirSync(editor.extensionsDir(platform));
  } catch {
    // No dir — nothing installed.
    return { present: false, current: false, entries: [] };
  }
  const prefix = `${EXTENSION_ID}-`;
  const matching = entries.filter((entry) =>
    entry.toLowerCase().startsWith(prefix),
  );
  const current = matching.some((entry) => {
    const version = parseVersion(entry.toLowerCase().slice(prefix.length));
    if (version === undefined) return false; // Unreadable: cannot vouch for it.
    return compareVersions(version, MINIMUM) >= 0;
  });
  return { present: matching.length > 0, current, entries: matching };
};

/**
 * The path helpers the editor probe resolves candidates with, captured from
 * the dynamic `@canonical/harnesses` import that keeps the package off the
 * fast path (so they cannot be static imports here).
 */
type EditorPaths = Pick<
  typeof import("@canonical/harnesses"),
  "appBundleCandidates" | "executableCandidates" | "vscodeUserDir"
>;

/**
 * WHICH of the three probes finds this editor, strongest first — or
 * `undefined` when none does.
 *
 * A resolved CLI always wins, because a CLI is what an install RUNS. The
 * per-user directory is last and yields no path: it proves the editor is on
 * this machine and nothing more.
 *
 * @param editor - One registry row.
 * @param host - The captured platform.
 * @param paths - The harness path helpers.
 * @returns The provenance and its evidence, or `undefined`.
 * @note Impure — stats PATH entries, app bundles and the user directory.
 */
const findEditorSource = (
  editor: EditorCliDefinition,
  host: PlatformEnv,
  paths: EditorPaths,
): EditorSource | undefined => {
  const onPath = resolveCli(paths.executableCandidates(editor.cli, host));
  if (onPath !== undefined) return { foundBy: "path", cliPath: onPath };
  const inBundle = resolveCli(
    paths.appBundleCandidates(editor.cli, host, editor.darwinBundles),
  );
  if (inBundle !== undefined) return { foundBy: "bundle", cliPath: inBundle };
  // The registry names the PRODUCT; `vscodeUserDir` owns the platform switch,
  // so this probe, the harness rows' `homeConfigPath` and their detection
  // signals cannot name different directories.
  const userDir =
    editor.product === undefined
      ? undefined
      : paths.vscodeUserDir(editor.product, host);
  if (userDir !== undefined && existsSync(userDir)) {
    return { foundBy: "user-dir" };
  }
  return undefined;
};

/**
 * One registry row as a {@link DetectedEditor} — or `undefined` when this
 * machine has no trace of the editor at all.
 *
 * @param editor - One registry row.
 * @param host - The captured platform.
 * @param paths - The harness path helpers.
 * @param probe - The writability filesystem seam; defaults to the real one.
 * @returns The detection record, or `undefined`.
 * @note Impure — reads PATH dirs, app bundles, the user directory and the
 * extensions directory off the real fs.
 */
const findEditor = (
  editor: EditorCliDefinition,
  host: PlatformEnv,
  paths: EditorPaths,
  probe?: FsProbe,
): DetectedEditor | undefined => {
  const source = findEditorSource(editor, host, paths);
  if (source === undefined) return undefined;
  const { present, current, entries } = extensionState(editor, host);
  const extensionsDir = editor.extensionsDir(host);
  // Writability is asked only where there is a CLI to run. An editor found
  // only by its user directory cannot be installed into whatever its folder
  // permits, and the palette command is its remedy either way — so the probe
  // would cost a stat to answer a question nothing reads.
  const block =
    source.foundBy === "user-dir"
      ? undefined
      : probeWritable(extensionsDir, probe);
  return {
    editor,
    ...source,
    present,
    installed: current,
    extensionsDir,
    presentEntries: entries,
    ...(block === undefined ? {} : { block }),
  };
};

/**
 * Probe every registry editor: its CLI on PATH, then inside its macOS app
 * bundle, then its per-user directory; its installed-state via the extensions
 * dir; and whether that dir could be written. No spawns (see the module
 * docblock for why).
 *
 * @param _cwd - Unused; kept so every `detectX` shares the (cwd) shape.
 * @param platform - The captured host; defaults to the live one. Injected so a
 *   test can drive the darwin arm — the one this repo's CI host cannot run.
 * @param probe - The writability filesystem seam; defaults to the real one.
 * @returns The detected {@link LspDetection}.
 * @note Impure — reads PATH dirs, app bundles and editor extension dirs off
 * the real fs.
 */
export async function detectLsp(
  _cwd: string,
  platform?: PlatformEnv,
  probe?: FsProbe,
): Promise<LspDetection> {
  const {
    appBundleCandidates,
    editorClis,
    executableCandidates,
    readPlatformEnv,
    userDataBase,
    vscodeUserDir,
  } = await import("@canonical/harnesses");
  // Not a default parameter value: `readPlatformEnv` arrives through the
  // dynamic import that keeps `@canonical/harnesses` off the fast path, so it
  // cannot be named in the signature.
  const host = platform ?? readPlatformEnv();
  const paths: EditorPaths = {
    appBundleCandidates,
    executableCandidates,
    vscodeUserDir,
  };
  const editors: DetectedEditor[] = editorClis.flatMap((editor) => {
    const found = findEditor(editor, host, paths, probe);
    return found === undefined ? [] : [found];
  });
  const state: LspState =
    editors.length === 0
      ? "unknown"
      : editors.every((e) => e.installed)
        ? "installed"
        : "absent";
  return {
    available: true,
    state,
    editors,
    probed: editorClis.map((editor) => editor.cli),
    stagingDir: join(userDataBase(host), BIN_NAME, "lsp"),
  };
}

/**
 * The editors an install would act on: those missing the extension, narrowed to
 * the user's per-editor selection when the wizard collected one.
 *
 * A machine commonly has several VS Code forks installed and the user wants the
 * extension in one of them. Installing into all of them because they are on
 * PATH is the same overreach the MCP row already avoids by offering its files.
 *
 * @param d - The detection gathered up front.
 * @param chosen - Selected editor CLI names, or undefined for "all pending".
 * @returns The editors to install into.
 */
export const selectedEditors = (
  d: LspDetection,
  chosen?: readonly string[],
): readonly RunnableEditor[] => {
  // A BLOCKED editor is never pending. It is not a candidate the user declined
  // — it is one this command cannot act on, and composing its sideload anyway
  // is what produced the raw fs failure the block exists to replace.
  const pending = d.editors.filter(
    (e): e is RunnableEditor => !e.installed && installable(e),
  );
  return chosen === undefined
    ? pending
    : pending.filter((e) => chosen.includes(e.editor.cli));
};

/**
 * The editors an install could act on, ignoring the wizard's selection — the
 * question both plan rows and doctor's row ask to decide whether there is any
 * work here at all.
 *
 * @param d - The detection gathered up front.
 * @returns The editors missing the extension that can be written to.
 */
export const installableEditors = (
  d: LspDetection,
): readonly RunnableEditor[] =>
  d.editors.filter((e): e is RunnableEditor => !e.installed && installable(e));

/** The editor names in a detection (for messages/results). */
export const lspEditorNames = (d: LspDetection): string[] =>
  d.editors.map((e) => e.editor.name);

/**
 * The named-skip reason for a machine with no VS Code-family editor at all. It
 * names every CLI that was probed AND every place it was looked for, because a
 * skip the user cannot act on is only honest if it says what would have
 * counted — and "not on PATH" was a misleading half of the answer once the
 * bundle and user-directory probes existed.
 *
 * @param d - The detection gathered up front.
 * @returns The reason line.
 */
export const lspSkipReason = (d: LspDetection): string =>
  `no VS Code-family editor found — looked for ${d.probed.join(", ")} on PATH, under /Applications or ~/Applications, or by its user directory`;

/**
 * How one editor was found, as a phrase both surfaces print — the provenance a
 * user needs to tell "pragma missed my editor" from "pragma found it and could
 * not act". Authored once, because `setup`'s child row and `doctor`'s item are
 * the same finding.
 *
 * The evidence path travels with it wherever there is one: the CLI file the
 * probe resolved. An editor found only by its user directory has no CLI, and
 * the phrase alone is the whole finding there.
 *
 * @param e - One detected editor.
 * @param roots - The two roots every path renders relative to.
 * @returns The phrase, e.g. `via PATH (/usr/bin/codium)`.
 */
export const describeEditorSource = (
  e: DetectedEditor,
  roots: Roots,
): string => {
  if (e.foundBy === "user-dir") return "via user directory";
  const where = e.foundBy === "path" ? "PATH" : "app bundle";
  return `via ${where} (${shortenPath(e.cliPath, roots)})`;
};

/**
 * The home-manager declaration for a Nix-managed extensions folder.
 *
 * It does NOT name a marketplace id, because there is no listing — the module
 * docblock above says so, and sideloading the bundled VSIX is the only install
 * path that exists. So the line gives both halves a home-manager user needs:
 * where to get the file, and the attribute that installs it.
 *
 * The expression is VALID NIX, which the shorter `{ src = <path>; }` sketch it
 * replaces was not twice over: `buildVscodeExtension` has no defaults for
 * `name`, `vscodeExtPublisher`, `vscodeExtName` or `vscodeExtUniqueId`
 * (nixpkgs `pkgs/build-support/vscode/extensions`), and an unquoted Nix path
 * literal cannot carry the `@` in `@canonical/…` — it is `builtins.path`
 * around a quoted string here for that reason. `version` is the ONE attribute
 * a user must fill in, so the line says so rather than guessing a number that
 * would be wrong the next release.
 */
const nixDeclarationRemedy = (d: LspDetection): string =>
  `fetch the VSIX with \`bun add ${LSP_PACKAGE}@latest\` in ${d.stagingDir}, then declare it yourself, filling in the version from the fetched package.json: programs.vscode.profiles.default.extensions = [ (pkgs.vscode-utils.buildVscodeExtension { name = "${EXTENSION_NAME}"; version = "<version>"; vscodeExtPublisher = "${EXTENSION_PUBLISHER}"; vscodeExtName = "${EXTENSION_NAME}"; vscodeExtUniqueId = "${EXTENSION_ID}"; src = builtins.path { path = "${lspVsixPath(d)}"; }; }) ];`;

/**
 * Why nothing can be installed into a blocked editor, and the ONE action that
 * settles it — both answers from one dispatch.
 *
 * Two `switch`es over the same three causes (one for the reason, one for the
 * remedy) is how a fourth cause gets a reason and no remedy; a table whose row
 * is a `{reason, remedy}` pair cannot drift that way. The remedy is a thunk
 * because only it needs the detection (for the staging dir and the VSIX path),
 * and the reason is read per child row where no detection is in hand.
 *
 * The reason does NOT name the editor. Every place it lands already does: the
 * setup child row is labelled `<cli> — <name> · <found via>`, doctor's item is
 * labelled with the name, and the row headline prefixes it
 * ({@link firstLspBlock}). Including it here made doctor print "VS Code: via
 * user directory · VS Code is installed but has no …" — the name twice in one
 * line and three times in two.
 *
 * @param e - An editor nothing can be installed into.
 * @returns Its reason, and a remedy awaiting the detection.
 * @note Pure — composes strings from the detection record.
 */
const describeBlock = (
  e: BlockedEditor,
): { reason: string; remedy: (d: LspDetection) => string } => {
  // Keyed by PROVENANCE, not by a block: an editor found only by its user
  // directory has no CLI whatever its folder permits, so "no launcher" is a
  // fact about how it was found. Its folder is never probed (see `findEditor`).
  if (e.foundBy === "user-dir") {
    return {
      reason: "no command-line launcher — found only its user directory",
      remedy: () =>
        `run "Shell Command: Install '${e.editor.cli}' command in PATH" from ${e.editor.name}'s command palette, then run \`${BIN_NAME} setup lsp\` again`,
    };
  }
  switch (e.block.kind) {
    case "nix-store":
      return {
        reason: `extensions folder managed by Nix (it resolves to ${e.block.resolved})`,
        remedy: nixDeclarationRemedy,
      };
    case "read-only":
      return {
        // The folder the row names is the one a `chmod` has to reach, so the
        // remedy can say "the extensions folder" instead of repeating it.
        reason: `extensions folder is not writable (${e.block.path})`,
        remedy: () =>
          `make the extensions folder writable, then run \`${BIN_NAME} setup lsp\` again`,
      };
  }
};

/**
 * Why nothing can be installed into one editor — one line, as the renderer
 * prints one — or `undefined` when the install can act on it.
 *
 * @param e - One detected editor.
 * @returns The reason, or `undefined` when the editor is actionable.
 */
export const lspBlockReason = (e: DetectedEditor): string | undefined =>
  installable(e) ? undefined : describeBlock(e).reason;

/**
 * The FIRST editor nothing can be installed into, with its row headline and
 * its remedy already derived — or `undefined` when every detected editor is
 * actionable.
 *
 * It hands back the derived strings rather than the editor, because the
 * blockedness is what makes the reason and the remedy exist: a caller that
 * took the editor and asked for them separately had to assert that both were
 * there, twice, on both surfaces. The headline names the editor, since nothing
 * else on a ROW has.
 *
 * @param d - The detection gathered up front.
 * @returns The first block's headline and remedy, or `undefined`.
 */
export const firstLspBlock = (
  d: LspDetection,
): { readonly headline: string; readonly remedy: string } | undefined => {
  const first = blockedEditors(d).at(0);
  if (first === undefined) return undefined;
  const { reason, remedy } = describeBlock(first);
  return { headline: `${first.editor.name}: ${reason}`, remedy: remedy(d) };
};

/**
 * The remedy beneath that skip. It states plainly that nothing is possible here
 * yet rather than offering a command for a binary this machine lacks — the rule
 * every remedy line in this capability holds to.
 */
export const LSP_SKIP_REMEDY =
  "no action is possible on this machine yet — install VS Code or VSCodium, then run this again";

/**
 * Compose the LSP-install effects for a detection.
 *
 * Built from re-runnable combinators (NOT a single-use `gen`) because
 * `execute` interprets the task twice (preview + perform); a dry-run mocks
 * every exec (exit 0), so the preview shows the fetch + per-editor sideloads
 * without spawning. Failures travel the task failure channel with
 * machine-honest recoveries (see module docblock).
 *
 * @param d - The detection gathered up front.
 * @returns A Task installing the extension into each editor missing it.
 */
export function composeLsp(
  d: LspDetection,
  chosen?: readonly string[],
): Task<void> {
  // Nothing to install: no editor found at all (a named skip the plan row
  // carries) or every detected editor already has it. Both compose NOTHING —
  // what the run SAYS about this target is the plan row's business.
  if (d.state !== "absent") return sequence_([]);

  const pending = selectedEditors(d, chosen);
  // Every pending editor was deselected — there is no fetch to do either.
  if (pending.length === 0) return sequence_([]);
  const vsixPath = lspVsixPath(d);

  // Fetch the VSIX-bundling package into the pragma-owned staging dir. `bun`
  // (not bunx) so the unpacked package — and its VSIX — survives at a stable
  // path the recovery lines below can honestly point at.
  const fetchCommand = `bun add ${LSP_PACKAGE}@latest`;
  const fetchVsix = guardMissingBinary(
    "bun",
    {
      message: `Install Bun (https://bun.sh), then run \`${BIN_NAME} setup lsp\` again.`,
    },
    sequence_([
      mkdir(d.stagingDir, true),
      flatMap(
        exec("bun", ["add", `${LSP_PACKAGE}@latest`], d.stagingDir),
        (result) =>
          checkExecOk(fetchCommand, result as ExecResult, {
            message:
              "The extension package cannot be fetched — this machine cannot reach registry.npmjs.org. Check the connection, then run " +
              `\`${BIN_NAME} setup lsp\` again.`,
          }),
      ),
    ]),
  );

  const sideloads = pending.map(({ editor, cliPath }) => {
    // The CLI FILE detection resolved, which is the only thing a pending
    // editor HAS: an editor found in its macOS app bundle has nothing on PATH
    // to spawn, and even a PATH hit is better spawned as the file this run
    // verified.
    const bin = cliPath;
    const command = `${bin} --install-extension ${vsixPath}`;
    return guardMissingBinary(
      bin,
      {
        message: `${editor.name}'s CLI disappeared mid-run — restore it, then run \`${BIN_NAME} setup lsp\` again.`,
      },
      flatMap(
        exec(bin, ["--install-extension", vsixPath], d.stagingDir),
        (result) =>
          checkExecOk(command, result as ExecResult, {
            message:
              `${editor.name} refused the VSIX (its output is above). The file is kept at ${vsixPath} — retry by hand with ` +
              `\`${command}\`, or update ${editor.name} first.`,
          }),
      ),
    );
  });

  return sequence_([fetchVsix, ...sideloads]);
}

/**
 * The editors this command OWNS an extension copy in right now — every detected
 * editor whose extensions dir holds a `canonical.terrazzo-lsp-extension-*`
 * entry, version-gate deliberately NOT applied (see {@link DetectedEditor}).
 *
 * Named and shaped like `ownedMcpGroups` and `ownedSkillLinks`, and for the
 * same reason those exist: a reversal is composed from what detection says this
 * command owns, never from what a fresh forward plan would create.
 *
 * @param d - The detection gathered up front.
 * @returns The editors carrying a copy.
 */
export const ownedLspEditors = (d: LspDetection): readonly RunnableEditor[] =>
  // A blocked editor is excluded even when it carries a copy: the uninstall
  // would need a CLI this machine has not got, or a write into a directory
  // pragma must not touch. The row says so rather than composing a reversal
  // that cannot run.
  d.editors.filter((e): e is RunnableEditor => e.present && installable(e));

/**
 * Compose the removal: one `<editor cli> --uninstall-extension <id>` per owned
 * editor, carried as the `undo` of a forward no-op — and each uninstall
 * asserts its own GOAL, not just its exit code.
 *
 * The docblock this replaces claimed "an `exec` carries no reversal". That was
 * factually wrong about the effect model — `Exec` has an `undo` slot and `exec`
 * takes `UndoOptions`. What is true is that `exec` has no DEFAULT undo; the
 * caller supplies one, exactly as `composeMcpRemoval` does for its `mkdir`.
 *
 * The carrier is copied from `composeMcpRemoval`, and its trap is the reason
 * for the shape: `runUndo` collects undos by walking the FORWARD task with
 * effects MOCKED, so the forward side must be walkable without reading or
 * mutating anything. A `mkdir` of the editor's own extensions directory — which
 * `present` proves already exists — reads nothing and is a genuine no-op. Phase
 * two then runs the uninstall against the real editor.
 *
 * THE POSTCONDITION is the removal's real success criterion. The exec's exit
 * code and the extensions DIRECTORY are two different judges — detection
 * deliberately reads the directory (probing via the CLI can launch an
 * editor), and VS Code-family CLIs are known to exit 0 while deferring or
 * skipping the deletion — so after `checkExecOk` the undo probes the exact
 * entries detection said this command owns, and FAILS (with the manual
 * deletion as the remedy — never the command that just claimed success) when
 * any survived. An in-task failure here is safe precisely because
 * `runCollectedUndos` executes each undo isolated: it used to abort every
 * reversal still pending, which is why no removal could afford to assert its
 * own goal.
 *
 * @param d - The detection gathered up front.
 * @param undoKey - Correlation key stamped on each reversal, echoed on its
 *   `UndoOutcome` so the caller can read the outcomes back per row.
 * @returns A Task whose undo uninstalls the extension from each owned editor
 *   and verifies the copy is gone.
 */
export function composeLspRemoval(
  d: LspDetection,
  undoKey?: string,
): Task<void> {
  const owned = ownedLspEditors(d);
  // Nothing on this machine carries a copy — there is no honest work to model,
  // and the plan row says so. Same shape as the other rows' empty removals.
  if (owned.length === 0) return sequence_([]);
  return sequence_(
    owned.map(({ editor, cliPath, extensionsDir, presentEntries }) => {
      // The resolved CLI file, for the reason `composeLsp` spells out.
      const bin = cliPath;
      const command = `${bin} --uninstall-extension ${EXTENSION_ID}`;
      const ownedPaths = presentEntries.map((entry) =>
        join(extensionsDir, entry),
      );
      const uninstall = flatMap(
        exec(bin, ["--uninstall-extension", EXTENSION_ID], extensionsDir),
        (result) =>
          checkExecOk(command, result as ExecResult, {
            message:
              `${editor.name} refused the uninstall (its output is above). ` +
              `Remove it by hand with \`${command}\`.`,
          }),
      );
      // The probe must apply DETECTION'S presence criterion, or the check can
      // quietly stop checking: `extensionState` calls an entry present when
      // `readdirSync` lists it, and a default `exists` (`fs.access`) follows
      // symlinks — so a dangling matching symlink would be "installed" to
      // detection and "absent" here, and an editor that exits 0 without
      // removing it would report `undone` while the next detection finds it
      // again. `followSymlinks: false` is `lstat` semantics: the entry
      // itself, exactly what the directory listing answers.
      const verified = flatMap(uninstall, () =>
        flatMap(
          sequence(ownedPaths.map((p) => exists(p, { followSymlinks: false }))),
          (stillThere) => {
            const survivors = ownedPaths.filter((_, i) => stillThere[i]);
            if (survivors.length === 0) return pure(undefined);
            // The remedy presents the surviving paths as DATA, never as a
            // synthesized shell line: the names come from `readdirSync`, so
            // no quoting is trustworthy, and one command cannot be right for
            // every platform the editor registry supports.
            return failPragma(
              new PragmaError({
                code: "UNSUPPORTED",
                message: `\`${command}\` exited 0, but the extension is still present after the undo ran.`,
                recovery: {
                  message: `Delete ${survivors.length === 1 ? "this entry" : "these entries"} from ${editor.name}'s extensions folder by hand, then restart it: ${survivors.join(" · ")}`,
                },
              }),
            );
          },
        ),
      );
      return mkdir(extensionsDir, true, {
        undo: guardMissingBinary(
          bin,
          {
            message: `${editor.name}'s CLI disappeared mid-run — restore it, then run \`${BIN_NAME} setup lsp --undo\` again.`,
          },
          verified,
        ),
        undoKey,
      });
    }),
  );
}

/**
 * The uninstall instruction for a detection — a command that runs on THIS
 * machine, or `undefined` when nothing here carries the extension and there is
 * therefore nothing honest to print.
 *
 * It names an OWNING editor. Reading `d.editors.at(0)` named the first editor
 * on PATH instead, so a machine with Cursor installed and the extension only in
 * VSCodium printed a command against the wrong editor — one that would report
 * success having uninstalled nothing.
 *
 * @param d - The detection gathered up front.
 * @returns The uninstall command, or undefined.
 */
export function lspUninstallRemedy(d: LspDetection): string | undefined {
  const owner = ownedLspEditors(d).at(0);
  return owner === undefined
    ? undefined
    : `${owner.cliPath} --uninstall-extension ${EXTENSION_ID}`;
}

/** The VSIX path a failed sideload leaves behind for a manual retry. */
export function lspVsixPath(d: LspDetection): string {
  return join(
    d.stagingDir,
    "node_modules",
    ...LSP_PACKAGE.split("/"),
    "terrazzo-lsp.vsix",
  );
}
