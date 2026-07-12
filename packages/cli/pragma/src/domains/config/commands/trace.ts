import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { runTask } from "@canonical/task";
import { readConfig } from "#config";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { traceFormatters } from "../formatters/index.js";
import { setTraceTask } from "../tasks/index.js";
import { resolveConfigScope, SCOPE_PARAMETERS } from "./configScope.js";

/**
 * Build the `pragma config trace` command definition.
 *
 * Supports three modes: enable (`on`), disable (`off`), or query
 * when no argument is provided.
 */
export default function buildTraceCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["config", "trace"],
    description: "Enable or disable query access tracing",
    parameters: [
      {
        name: "value",
        description: "on or off",
        type: "string",
        positional: true,
      },
      ...SCOPE_PARAMETERS,
    ],
    meta: {
      examples: [
        "pragma config trace on",
        "pragma config trace off",
        "pragma config trace",
      ],
      extendedHelp:
        "Persists to pragma.config.json. The PRAGMA_TRACE=1 env var overrides this setting.",
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const scope = resolveConfigScope(params);
      const value = params.value as string | undefined;

      // Query mode — no argument
      if (!value) {
        const config = readConfig(ctx.cwd);
        const enabled = config.trace === true;
        const envOverride = process.env.PRAGMA_TRACE === "1";
        const status = envOverride
          ? "on (PRAGMA_TRACE=1 override)"
          : enabled
            ? "on"
            : "off";
        const format = selectFormatter(ctx, traceFormatters.query);
        return createOutputResult(status, { plain: format });
      }

      // Validate
      if (value !== "on" && value !== "off") {
        throw PragmaError.invalidInput("trace", value, {
          validOptions: ["on", "off"],
        });
      }

      // Set mode
      const enabled = value === "on";
      const result = await runTask(setTraceTask(ctx.cwd, enabled, scope));

      const format = selectFormatter(ctx, traceFormatters.set);
      return createOutputResult(
        { field: "trace", value: enabled, path: result.path },
        { plain: format },
      );
    },
  };
}
