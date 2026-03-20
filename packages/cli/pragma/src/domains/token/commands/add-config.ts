import { writeFileSync } from "node:fs";
import {
  type CommandContext,
  type CommandDefinition,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "../../../error/index.js";
import { resolveAddConfig } from "../operations/index.js";

export default function addConfigCommand(): CommandDefinition {
  return {
    path: ["tokens", "add-config"],
    description: "Generate a tokens.config.mjs for terrazzo",
    parameters: [
      {
        name: "force",
        description: "Overwrite existing config file",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: ["pragma tokens add-config"],
    },
    async execute(params: Record<string, unknown>, ctx: CommandContext) {
      const force = (params.force as boolean) ?? false;
      const result = resolveAddConfig(ctx.cwd);

      if (result.alreadyExists && !force) {
        throw PragmaError.invalidInput("tokens.config.mjs", "already exists", {
          recovery:
            "Use `pragma tokens add-config --force` to overwrite the existing file.",
        });
      }

      writeFileSync(result.configPath, result.configContent, "utf-8");

      const lines: string[] = [];
      lines.push(`Created ${result.configPath}`);
      if (result.installHint) {
        lines.push(result.installHint);
      }
      const message = lines.join("\n");

      return createOutputResult(message, {
        plain: () => message,
      });
    },
  };
}
