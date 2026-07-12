import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { runTask } from "@canonical/task";
import { readConfig } from "#config";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { frameworkFormatters } from "../formatters/index.js";
import { validateFramework } from "../operations/index.js";
import { setFrameworkTask } from "../tasks/index.js";
import { resolveConfigScope, SCOPE_PARAMETERS } from "./configScope.js";

/**
 * Build the `pragma config framework` command definition.
 *
 * Sets the preferred UI framework (`react` | `svelte` | `lit`). The value is
 * currently advisory only — no behaviour reads it yet; it is persisted for
 * future framework-defaulting. Supports set, reset, and query (no argument).
 *
 * @param ctx - Pragma context providing cwd and formatter selection.
 * @returns The command definition for `pragma config framework`.
 * @note - Impure — validates framework and writes config to disk.
 */
export default function buildFrameworkCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["config", "framework"],
    description: "Set or reset the preferred UI framework (advisory)",
    parameters: [
      {
        name: "value",
        description: "Framework (react, svelte, lit)",
        type: "string",
        positional: true,
      },
      {
        name: "reset",
        description: "Reset framework to default (none)",
        type: "boolean",
        default: false,
      },
      ...SCOPE_PARAMETERS,
    ],
    meta: {
      examples: [
        "pragma config framework react",
        "pragma config framework --reset",
      ],
      extendedHelp:
        "Advisory only for now: the value is persisted but no command reads it yet. Reserved for future framework defaulting.",
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const scope = resolveConfigScope(params);
      const reset = params.reset === true;
      const value = params.value as string | undefined;

      if (reset) {
        const result = await runTask(
          setFrameworkTask(ctx.cwd, undefined, scope),
        );
        const format = selectFormatter(ctx, frameworkFormatters.reset);
        return createOutputResult(
          { field: "framework", path: result.path },
          { plain: format },
        );
      }

      if (!value) {
        const config = readConfig(ctx.cwd);
        const format = selectFormatter(ctx, frameworkFormatters.query);
        return createOutputResult(config.framework ?? "none", {
          plain: format,
        });
      }

      const framework = validateFramework(value);

      const result = await runTask(setFrameworkTask(ctx.cwd, framework, scope));
      const format = selectFormatter(ctx, frameworkFormatters.set);
      return createOutputResult(
        { field: "framework", value: framework, path: result.path },
        { plain: format },
      );
    },
  };
}
