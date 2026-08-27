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
 * "present" when its CLI resolves on PATH (the `editorClis` registry names
 * them), and "installed" when its extensions dir holds a
 * `canonical.terrazzo-lsp-extension-<version>/` entry. Running
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
  flatMap,
  mkdir,
  sequence_,
  type Task,
} from "@canonical/task";
import { BIN_NAME } from "../../../constants.js";
import { checkExecOk, guardMissingBinary } from "../../shared/assertExecOk.js";
import type { LspState } from "../types.js";

/** The full extension id, as the editor's extensions dir spells it. */
const EXTENSION_ID = "canonical.terrazzo-lsp-extension";

/** The npm package whose tarball bundles the VSIX. */
const LSP_PACKAGE = "@canonical/terrazzo-lsp-extension";

/** One detected editor: its registry row + whether the extension is present. */
export interface DetectedEditor {
  readonly editor: EditorCliDefinition;
  readonly installed: boolean;
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

/** Whether an editor's extensions dir holds a versioned copy of the extension. */
const extensionInstalled = (
  editor: EditorCliDefinition,
  platform: PlatformEnv,
): boolean => {
  let entries: string[];
  try {
    entries = readdirSync(editor.extensionsDir(platform));
  } catch {
    return false; // No extensions dir — nothing installed.
  }
  return entries.some((entry) =>
    entry.toLowerCase().startsWith(`${EXTENSION_ID}-`),
  );
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
    .map((editor) => ({
      editor,
      installed: extensionInstalled(editor, platform),
    }));
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
 * Compose the removal — deliberately empty. An extension install is an `exec`,
 * and an `exec` carries no reversal: pretending otherwise is what made
 * `setup lsp --undo` report a step count for work it never did. The honest
 * answer is the plan row's, which names the editor CLI that CAN uninstall it
 * (see {@link lspUninstallRemedy}) or states that this machine has none.
 *
 * @param _d - The detection (unused; the shape is the table's).
 * @returns An empty Task.
 */
export function composeLspRemoval(_d: LspDetection): Task<void> {
  return sequence_([]);
}

/**
 * The uninstall instruction for a detection — a command that runs on THIS
 * machine, or `undefined` when no editor CLI was found and there is therefore
 * nothing honest to print.
 *
 * @param d - The detection gathered up front.
 * @returns The uninstall command, or undefined.
 */
export function lspUninstallRemedy(d: LspDetection): string | undefined {
  const cli = d.editors.at(0)?.editor.cli;
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
