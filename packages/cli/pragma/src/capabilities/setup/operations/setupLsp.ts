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
 * `detectLsp` probes FOR REAL up front, and spawns NOTHING: an editor is
 * detected when its CLI resolves on PATH (the `editorClis` registry names
 * them), carries the extension when its extensions dir holds a
 * `canonical.terrazzo-lsp-extension-<version>/` entry, and is "installed" when
 * that entry is also new enough to work. Running
 * `--list-extensions` instead would be the natural probe, but Cursor's Linux
 * launcher OPENS THE EDITOR on that flag — a detection step must never launch
 * an app, so the fs is the source of truth. The full extension id is matched
 * (not the old `terrazzo` substring, which any other terrazzo-named extension
 * could false-positive).
 *
 * No editor CLI found is a NAMED SKIP, not an error: the message says what was
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
import type { LspState } from "../types.js";

/** The full extension id, as the editor's extensions dir spells it. */
const EXTENSION_ID = "canonical.terrazzo-lsp-extension";

/** The npm package whose tarball bundles the VSIX. */
const LSP_PACKAGE = "@canonical/terrazzo-lsp-extension";

/**
 * One detected editor: its registry row, its extensions directory, and the two
 * DIFFERENT questions about the extension.
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
export interface DetectedEditor {
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
}

/**
 * The detected LSP state: the editors whose CLI is on PATH (each with its
 * installed-state), the staging dir the VSIX is fetched into, and the
 * aggregate {@link LspState} — `unknown` when NO editor CLI was found (the
 * step becomes a named skip), `installed` when every found editor already has
 * the extension, `absent` otherwise (the installer runs for the missing ones).
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
 * Whether an editor CLI resolves on PATH, given the candidate paths the host
 * would consider for it.
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
 */
const cliOnPath = (candidates: readonly string[]): boolean =>
  candidates.some((candidate) => existsSync(candidate));

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
 * Probe every registry editor: CLI presence via PATH lookup, installed-state
 * via the extensions dir — no spawns (see the module docblock for why).
 *
 * @param _cwd - Unused; kept so every `detectX` shares the (cwd) shape.
 * @returns The detected {@link LspDetection}.
 * @note Impure — reads PATH dirs and editor extension dirs off the real fs.
 */
export async function detectLsp(_cwd: string): Promise<LspDetection> {
  const { editorClis, executableCandidates, readPlatformEnv, userDataBase } =
    await import("@canonical/harnesses");
  const platform = readPlatformEnv();
  const editors: DetectedEditor[] = editorClis
    .filter((editor) => cliOnPath(executableCandidates(editor.cli, platform)))
    .map((editor) => {
      const { present, current, entries } = extensionState(editor, platform);
      return {
        editor,
        present,
        installed: current,
        extensionsDir: editor.extensionsDir(platform),
        presentEntries: entries,
      };
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
    stagingDir: join(userDataBase(platform), BIN_NAME, "lsp"),
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
): readonly DetectedEditor[] => {
  const pending = d.editors.filter((e) => !e.installed);
  return chosen === undefined
    ? pending
    : pending.filter((e) => chosen.includes(e.editor.cli));
};

/** The editor names in a detection (for messages/results). */
export const lspEditorNames = (d: LspDetection): string[] =>
  d.editors.map((e) => e.editor.name);

/**
 * The named-skip reason for a machine with no VS Code-family CLI on PATH. It
 * names every CLI that was probed, because a skip the user cannot act on is
 * only honest if it says what would have counted.
 *
 * @param d - The detection gathered up front.
 * @returns The reason line.
 */
export const lspSkipReason = (d: LspDetection): string =>
  `no VS Code-family editor CLI on PATH (${d.probed.join(", ")})`;

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
  // Nothing to install: no editor CLI on PATH (a named skip the plan row
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

  const sideloads = pending.map(({ editor }) => {
    const command = `${editor.cli} --install-extension ${vsixPath}`;
    return guardMissingBinary(
      editor.cli,
      {
        message: `The \`${editor.cli}\` CLI disappeared from PATH mid-run — restore it, then run \`${BIN_NAME} setup lsp\` again.`,
      },
      flatMap(
        exec(editor.cli, ["--install-extension", vsixPath], d.stagingDir),
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
export const ownedLspEditors = (d: LspDetection): readonly DetectedEditor[] =>
  d.editors.filter((e) => e.present);

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
    owned.map(({ editor, extensionsDir, presentEntries }) => {
      const command = `${editor.cli} --uninstall-extension ${EXTENSION_ID}`;
      const ownedPaths = presentEntries.map((entry) =>
        join(extensionsDir, entry),
      );
      const uninstall = flatMap(
        exec(
          editor.cli,
          ["--uninstall-extension", EXTENSION_ID],
          extensionsDir,
        ),
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
          editor.cli,
          {
            message: `The \`${editor.cli}\` CLI disappeared from PATH mid-run — restore it, then run \`${BIN_NAME} setup lsp --undo\` again.`,
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
  const cli = ownedLspEditors(d).at(0)?.editor.cli;
  return cli === undefined
    ? undefined
    : `${cli} --uninstall-extension ${EXTENSION_ID}`;
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
