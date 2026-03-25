import type { CommandContext } from "@canonical/cli-core";
import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { selectFormatter } from "../../shared/formatters.js";
import { doctorFormatters } from "../formatters/index.js";
import { runChecks } from "../operations/index.js";

/**
 * `pragma doctor` command definition.
 *
 * Runs all environment health checks (Node version, pragma installation,
 * config file, ke store, shell completions, MCP, skills)
 * and sets exit code 1 when any check fails.
 *
 * @note Impure
 */
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
