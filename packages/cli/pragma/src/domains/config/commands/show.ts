/**
 * `pragma config show` command definition.
 *
 * Display the resolved configuration.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { configExists, readConfig, resolveConfigPath } from "#config";
import { detectPackageManager } from "#package-manager";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { showFormatters } from "../formatters/index.js";
import { resolveConfigShow } from "../operations/index.js";

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
      const pm = detectPackageManager();
      const cfgPath = resolveConfigPath(ctx.cwd);
      const cfgExists = configExists(ctx.cwd);

      const data = resolveConfigShow(config, {
        packageManager: pm,
        configFilePath: cfgPath,
        configFileExists: cfgExists,
      });

      return createOutputResult(data, {
        plain: selectFormatter(ctx, showFormatters),
      });
    },
  };
}
