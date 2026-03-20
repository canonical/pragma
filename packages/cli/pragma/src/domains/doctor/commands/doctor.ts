/**
 * `pragma doctor` command definition.
 *
 * Environment health check: validates Node version, pragma installation,
 * config, ke store, shell completions, terrazzo-lsp, MCP, and skills.
 *
 * @note Impure — delegates to runChecks which performs filesystem and
 * process checks.
 * @see IN.07 in B.11.INSTALL
 */

import type { CommandContext } from "@canonical/cli-core";
import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { selectFormatter } from "../../shared/formatters.js";
import { doctorFormatters } from "../formatters/index.js";
import { runChecks } from "../operations/index.js";

const doctorCommand: CommandDefinition = {
  path: ["doctor"],
  description: "Check environment health",
  parameters: [],
  meta: {
    examples: ["pragma doctor"],
  },
  execute: async (
    _params: Record<string, unknown>,
    ctx: CommandContext,
  ): Promise<CommandResult> => {
    const data = await runChecks({ cwd: ctx.cwd });

    if (data.failed > 0) {
      process.exitCode = 1;
    }

    return createOutputResult(data, {
      plain: selectFormatter(ctx, doctorFormatters),
    });
  },
};

export default doctorCommand;
