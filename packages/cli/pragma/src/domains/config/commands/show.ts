/**
 * `pragma config show` command definition.
 *
 * Display the resolved configuration.
 *
 * @see CF.03, CF.04 in B.08.CONFIG
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { readConfig } from "../../../config.js";
import configExists from "../../../configExists.js";
import { detectPackageManager } from "../../../pm.js";
import resolveConfigPath from "../../../resolveConfigPath.js";
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
