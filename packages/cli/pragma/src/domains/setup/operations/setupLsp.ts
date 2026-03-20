/**
 * `pragma setup lsp` — configure VS Code for the Terrazzo LSP.
 *
 * VS Code only in v0.2 (SU.01). Merges terrazzo-lsp settings into
 * .vscode/settings.json without overwriting existing entries.
 *
 * @see SU.01 in B.15.SETUP
 */

import {
  $,
  exists,
  gen,
  info,
  readFile,
  type Task,
  warn,
  writeFile,
} from "@canonical/task";
import { LSP_SETTINGS } from "../helpers/constants.js";

/**
 * Compose a Task that configures VS Code settings for the Terrazzo LSP.
 *
 * @param root - Project root directory.
 */
export default function setupLsp(root: string): Task<void> {
  return gen(function* () {
    const vscodeDirExists = yield* $(exists(`${root}/.vscode`));
    if (!vscodeDirExists) {
      yield* $(
        warn(
          "No .vscode/ directory detected. VS Code is the only supported editor in v0.2.",
        ),
      );
      return;
    }

    const tokensConfigExists = yield* $(exists(`${root}/tokens.config.mjs`));
    if (!tokensConfigExists) {
      yield* $(
        warn(
          "tokens.config.mjs not found. Run `pragma tokens add-config` first.",
        ),
      );
    }

    const settingsPath = `${root}/.vscode/settings.json`;
    const settingsExist = yield* $(exists(settingsPath));

    let settings: Record<string, unknown> = {};
    if (settingsExist) {
      const content = yield* $(readFile(settingsPath));
      try {
        settings = JSON.parse(content) as Record<string, unknown>;
      } catch {
        settings = {};
      }
    }

    const merged = { ...settings, ...LSP_SETTINGS };
    yield* $(writeFile(settingsPath, `${JSON.stringify(merged, null, 2)}\n`));
    yield* $(info("✓ LSP configured for VS Code."));
  });
}
