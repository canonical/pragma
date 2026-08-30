/**
 * Registry of VS Code-family editor CLIs — the table `setup lsp` (and any
 * future extension work) resolves editors through. Pure data, like
 * `harnesses.ts`: adding an editor is adding a row.
 *
 * Two columns per editor: the CLI binary name (every fork inherits VS Code's
 * `--install-extension <vsix>` / `--list-extensions` surface) and the user
 * extensions directory (every fork keeps the identical
 * `<dir>/<publisher>.<name>-<version>/` layout). The extensions dir — not a
 * `--list-extensions` spawn — is what detection reads: probing must never be
 * able to LAUNCH an editor, and Cursor's Linux launcher is known to open the
 * UI on `--list-extensions` (forum.cursor.com/t/command-line-list-extensions/103565).
 *
 * Designed for the registry-per-editor future: when the extension is published
 * to a marketplace, a `registry` column (`"marketplace" | "open-vsx" |
 * "sideload"`) is ADDED here — rows, not new code — and the VSIX sideload
 * stays the universal fallback. Until then sideload is the only install path,
 * which works identically on every row that has a CLI.
 *
 * Row sources (checked 2026-08-27):
 * - vscode: official CLI + marketplace docs
 *   (code.visualstudio.com/docs/configure/command-line,
 *   code.visualstudio.com/docs/editor/extension-marketplace).
 * - vscodium: binary is `codium` (github.com/VSCodium/vscodium README);
 *   `--install-extension` used verbatim in vendor-repo issues (#2564, #332);
 *   `.vscode-oss` is upstream's dataFolderName, kept by VSCodium's
 *   prepare_vscode.sh for stable builds.
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
 */

import type { PlatformEnv } from "./platformPaths.js";
import { userHome } from "./platformPaths.js";

/** One VS Code-family editor the extension installer can target. */
export interface EditorCliDefinition {
  readonly id: string;
  readonly name: string;
  /** The CLI binary name probed on PATH and used for the VSIX sideload. */
  readonly cli: string;
  /** The user extensions directory (the `<id>-<version>/` layout). */
  readonly extensionsDir: (platform: PlatformEnv) => string;
}

const editorClis: readonly EditorCliDefinition[] = [
  {
    id: "vscode",
    name: "VS Code",
    cli: "code",
    extensionsDir: (p) => `${userHome(p)}/.vscode/extensions`,
  },
  {
    id: "vscodium",
    name: "VSCodium",
    cli: "codium",
    extensionsDir: (p) => `${userHome(p)}/.vscode-oss/extensions`,
  },
  {
    id: "cursor",
    name: "Cursor",
    cli: "cursor",
    extensionsDir: (p) => `${userHome(p)}/.cursor/extensions`,
  },
  {
    id: "windsurf",
    name: "Windsurf",
    cli: "windsurf",
    // VERIFY(F1a): community-evidenced only (see module docblock).
    extensionsDir: (p) => `${userHome(p)}/.windsurf/extensions`,
  },
  {
    id: "antigravity",
    name: "Antigravity",
    cli: "antigravity",
    // VERIFY(F1b): community-evidenced only (see module docblock).
    extensionsDir: (p) => `${userHome(p)}/.antigravity/extensions`,
  },
];

export default editorClis;
