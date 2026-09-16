/**
 * Registry of VS Code-family editor CLIs — the table `setup lsp` (and any
 * future extension work) resolves editors through. Pure data, like
 * `harnesses.ts`: adding an editor is adding a row.
 *
 * Four columns per editor. The CLI binary name (every fork inherits VS Code's
 * `--install-extension <vsix>` / `--list-extensions` surface) and the user
 * extensions directory (every fork keeps the identical
 * `<dir>/<publisher>.<name>-<version>/` layout) are the two that have always
 * been here. The extensions dir — not a `--list-extensions` spawn — is what
 * detection reads: probing must never be able to LAUNCH an editor, and
 * Cursor's Linux launcher is known to open the UI on `--list-extensions`
 * (forum.cursor.com/t/command-line-list-extensions/103565).
 *
 * The two that follow exist because a stock macOS install is INVISIBLE to a
 * PATH probe, and a machine with the editor installed that reports "no editor
 * found" is a wrong skip — which reads as a correct answer:
 *
 * - `darwinBundles` names the editor's macOS application bundle(s). Every
 *   VS Code fork ships its CLI inside the bundle at
 *   `Contents/Resources/app/bin/<cli>`, but puts nothing on PATH until the
 *   user runs "Shell Command: Install '<cli>' command in PATH" from the
 *   command palette. `appBundleCandidates` (see `executablePaths.ts`) turns
 *   this column into the fallback candidate list.
 * - `product` names the VS Code product whose per-user configuration directory
 *   this editor keeps — the only trace a fresh install leaves that is neither a
 *   CLI nor an extension. The directory itself is resolved by
 *   {@link vscodeUserDir}, the ONE source of truth the harness rows'
 *   `homeConfigPath`, the CLI's editor probe and doctor all read, so the three
 *   cannot drift apart. The column is the PRODUCT NAME rather than a
 *   `(platform) => string` closure, because the name is the only thing a row
 *   knows that the helper does not: a closure would make every row a copy of
 *   the same call and leave the helper with no caller outside this file.
 *
 * Designed for the registry-per-editor future: when the extension is published
 * to a marketplace, a `registry` column (`"marketplace" | "open-vsx" |
 * "sideload"`) is ADDED here — rows, not new code — and the VSIX sideload
 * stays the universal fallback. Until then sideload is the only install path,
 * which works identically on every row that has a CLI.
 *
 * Row sources (checked 2026-08-27; the bundle names 2026-09-16):
 * - vscode: official CLI + marketplace docs
 *   (code.visualstudio.com/docs/configure/command-line,
 *   code.visualstudio.com/docs/editor/extension-marketplace). The bundle is
 *   `Visual Studio Code.app` and the palette command that puts `code` on PATH
 *   is documented on the first of those pages.
 * - vscode-insiders: the parallel-install channel
 *   (code.visualstudio.com/insiders) — binary `code-insiders`, bundle
 *   `Visual Studio Code - Insiders.app`, dataFolderName `.vscode-insiders`,
 *   user directory product name `Code - Insiders`.
 * - vscodium: binary is `codium` (github.com/VSCodium/vscodium README);
 *   `--install-extension` used verbatim in vendor-repo issues (#2564, #332);
 *   `.vscode-oss` is upstream's dataFolderName, kept by VSCodium's
 *   prepare_vscode.sh for stable builds; the bundle and the user directory are
 *   both `VSCodium`.
 * - cursor: `cursor` launcher installed via the palette's "Install 'cursor'
 *   command"; `--install-extension` and `~/.cursor/extensions` are community
 *   evidence only — Cursor's own docs cover extensions via GUI.
 * - windsurf: VERIFY(F1a) — `windsurf` launcher and `~/.windsurf/extensions`
 *   are community evidence (Exafunction/codeium#295); `--install-extension`
 *   unconfirmed officially.
 * - antigravity: VERIFY(F1b) — community reports the `antigravity` launcher
 *   (with a possible post-2.0 rename to `agy-ide`) and conflicting extension
 *   dirs (`~/.antigravity` vs `~/.antigravity-ide`); nothing official. The
 *   row keeps the launch-era names: a wrong CLI name degrades to "editor not
 *   found", never to a wrong install.
 *
 * Only the `vscode`/`vscode-insiders`/`vscodium` rows carry a `product`: those
 * three are the products {@link vscodeUserDir} is documented for. The forks
 * rename the directory as well as the app (`~/Library/Application
 * Support/Cursor/User`, and so on), and guessing one would be a path nothing
 * has confirmed — a row without a `product` simply falls back to its CLI and
 * extensions probes, which is what it did before this column existed.
 *
 * `darwinBundles` is REQUIRED: every row in this table is a macOS-shipping
 * editor, all six declare one, and an optional column would only have added a
 * `?? []` at the one call site with no row able to reach it.
 */

import type { PlatformEnv } from "./platformPaths.js";
import {
  userConfigBase,
  userDataBase,
  userHome,
  xdgConfigHome,
} from "./platformPaths.js";

/**
 * The three VS Code products whose per-user directory this module resolves —
 * spelled exactly as each one names its own directory under the platform base.
 */
export type VscodeProduct = "Code" | "Code - Insiders" | "VSCodium";

/**
 * A VS Code product's per-user directory: `<base>/<product>/User`, where the
 * base is the platform's DATA base on darwin (`~/Library/Application
 * Support`), its CONFIG base on win32 (`%APPDATA%`) and the XDG config home
 * everywhere else (`$XDG_CONFIG_HOME ?? ~/.config`).
 *
 * The three arms are NOT interchangeable and no single existing helper spans
 * them: `userConfigBase`'s darwin arm is `~/Library/Preferences`, which VS Code
 * does not use, and `xdgConfigHome` resolves under `~/.config` on darwin BY
 * DESIGN. So the product-specific mapping lives here once, and it is the one
 * source of truth for the harness rows' `homeConfigPath` (the per-user
 * `mcp.json` inside this directory), for their user-directory detection
 * signals, and for `setup lsp`'s last-resort editor probe. A second copy of
 * this switch is how `setup mcp` and `doctor` end up naming different files.
 *
 * @param product - The VS Code product whose directory is wanted.
 * @param p - The captured platform.
 * @returns The absolute per-user directory.
 * @note Pure — it composes strings and tests nothing on the filesystem.
 */
export const vscodeUserDir = (
  product: VscodeProduct,
  p: PlatformEnv,
): string => {
  switch (p.platform) {
    case "darwin":
      return `${userDataBase(p)}/${product}/User`;
    case "win32":
      return `${userConfigBase(p)}/${product}/User`;
    default:
      return `${xdgConfigHome(p)}/${product}/User`;
  }
};

/** One VS Code-family editor the extension installer can target. */
export interface EditorCliDefinition {
  readonly id: string;
  readonly name: string;
  /** The CLI binary name probed on PATH and used for the VSIX sideload. */
  readonly cli: string;
  /** The user extensions directory (the `<id>-<version>/` layout). */
  readonly extensionsDir: (platform: PlatformEnv) => string;
  /**
   * The macOS application bundle name(s) that carry this editor's CLI inside
   * them, for the machines that have the editor and no `code` on PATH.
   */
  readonly darwinBundles: readonly string[];
  /**
   * The VS Code product whose per-user configuration directory this editor
   * keeps, when it is one of the products {@link vscodeUserDir} covers. That
   * directory is the last trace a fresh install leaves — no CLI, no extension
   * — and therefore the last probe.
   */
  readonly product?: VscodeProduct;
}

const editorClis: readonly EditorCliDefinition[] = [
  {
    id: "vscode",
    name: "VS Code",
    cli: "code",
    extensionsDir: (p) => `${userHome(p)}/.vscode/extensions`,
    darwinBundles: ["Visual Studio Code.app"],
    product: "Code",
  },
  {
    id: "vscode-insiders",
    name: "VS Code Insiders",
    cli: "code-insiders",
    extensionsDir: (p) => `${userHome(p)}/.vscode-insiders/extensions`,
    darwinBundles: ["Visual Studio Code - Insiders.app"],
    product: "Code - Insiders",
  },
  {
    id: "vscodium",
    name: "VSCodium",
    cli: "codium",
    extensionsDir: (p) => `${userHome(p)}/.vscode-oss/extensions`,
    darwinBundles: ["VSCodium.app"],
    product: "VSCodium",
  },
  {
    id: "cursor",
    name: "Cursor",
    cli: "cursor",
    extensionsDir: (p) => `${userHome(p)}/.cursor/extensions`,
    darwinBundles: ["Cursor.app"],
  },
  {
    id: "windsurf",
    name: "Windsurf",
    cli: "windsurf",
    // VERIFY(F1a): community-evidenced only (see module docblock).
    extensionsDir: (p) => `${userHome(p)}/.windsurf/extensions`,
    // VERIFY(F1a): the bundle name follows the product name, like the CLI and
    // the extensions dir above it.
    darwinBundles: ["Windsurf.app"],
  },
  {
    id: "antigravity",
    name: "Antigravity",
    cli: "antigravity",
    // VERIFY(F1b): community-evidenced only (see module docblock).
    extensionsDir: (p) => `${userHome(p)}/.antigravity/extensions`,
    // VERIFY(F1b): the bundle name follows the launch-era product name, like
    // the CLI and the extensions dir above it.
    darwinBundles: ["Antigravity.app"],
  },
];

export default editorClis;
