import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { configExists, readConfig, resolveConfigPath } from "#config";
import { detectInstallSource } from "#package-manager";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { showFormatters } from "../formatters/index.js";
import { resolveConfigShow } from "../operations/index.js";

/**
 * Build the `pragma config show` command definition.
 *
 * Displays the resolved configuration including tier, channel,
 * package manager, and config file location.
 *
 * @param ctx - Pragma context providing cwd and formatter selection.
 * @returns The command definition for `pragma config show`.
 * @note Impure
 */
export default function buildShowCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["config", "show"],
    description: "Display resolved configuration",
    parameters: [],
    meta: {
      examples: ["pragma config show"],
    },
    execute: async (): Promise<CommandResult> => {
      const config = readConfig(ctx.cwd);
      const install = detectInstallSource();
      const cfgPath = resolveConfigPath(ctx.cwd);
      const cfgExists = configExists(ctx.cwd);

      const data = resolveConfigShow(config, {
        packageManager: install.packageManager,
        installSource: install.label,
        configFilePath: cfgPath,
        configFileExists: cfgExists,
      });

      return createOutputResult(data, {
        plain: selectFormatter(ctx, showFormatters),
      });
    },
  };
}
