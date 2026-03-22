/**
 * `pragma skill list` command definition.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { listFormatters } from "../formatters/index.js";
import type { SkillListInput } from "../formatters/types.js";
import { listSkills } from "../operations/index.js";

export default function buildListCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["skill", "list"],
    description: "List available agent skills from design system packages",
    parameters: [
      {
        name: "detailed",
        description: "Show full metadata for each skill",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma skill list",
        "pragma skill list --detailed",
        "pragma skill list --llm",
        "pragma skill list --format json",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const detailed = params.detailed === true;
      const { skills, sources } = await listSkills(ctx.cwd);

      if (skills.length === 0) {
        const allUnavailable = sources.every((s) => !s.available);
        throw PragmaError.emptyResults("skill", {
          recovery: {
            message: allUnavailable
              ? "Install @canonical packages first"
              : "No SKILL.md files found in source packages",
          },
        });
      }

      const input: SkillListInput = { skills, sources, detailed };

      return createOutputResult(input, {
        plain: selectFormatter(ctx, listFormatters),
      });
    },
  };
}
