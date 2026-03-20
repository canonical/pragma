/**
 * `pragma setup skills` command definition.
 *
 * SK.03 — detects harnesses, discovers skills, symlinks skill folders.
 */

import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { detectHarnesses } from "@canonical/harnesses";
import { collectEffects, runTask } from "@canonical/task";
import { PragmaError } from "../../../error/index.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { discoverSkills } from "../../skill/operations/index.js";
import { skillsFormatters } from "../formatters/index.js";
import type { SetupSkillsOutput } from "../formatters/types.js";
import { setupSkills } from "../operations/index.js";

export default function buildSkillsCommand(): CommandDefinition {
  return {
    path: ["setup", "skills"],
    description:
      "Symlink agent skills from design system packages into AI harness directories",
    parameters: [
      {
        name: "yes",
        description: "Skip confirmation prompts",
        type: "boolean",
        default: false,
      },
      {
        name: "dryRun",
        description: "Preview symlinks without creating them",
        type: "boolean",
        default: false,
      },
    ],
    meta: {
      examples: [
        "pragma setup skills",
        "pragma setup skills --dry-run",
        "pragma setup skills --yes",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
      ctx,
    ): Promise<CommandResult> => {
      const dryRun = params.dryRun === true;
      const cwd = (ctx as PragmaContext).cwd;

      const skills = await discoverSkills(cwd);
      if (skills.length === 0) {
        throw PragmaError.emptyResults("skill", {
          recovery:
            "Install @canonical packages first, then run `pragma setup skills`",
        });
      }

      const harnesses = await runTask(detectHarnesses(cwd));

      const task = setupSkills(skills, harnesses, cwd);

      if (dryRun) {
        const effects = collectEffects(task);
        const symlinkCount = effects.filter((e) => e._tag === "Symlink").length;

        const output: SetupSkillsOutput = {
          result: {
            actions: [],
            harnessCount: harnesses.length,
            skillCount: skills.length,
            warnings: [],
          },
          dryRun: true,
        };

        process.stdout.write(
          `Would create ${symlinkCount} symlink(s) for ${skills.length} skill(s) across ${harnesses.length} harness(es)\n`,
        );

        return createOutputResult(output, {
          plain: selectFormatter(ctx as PragmaContext, skillsFormatters),
        });
      }

      const result = await runTask(task);

      const output: SetupSkillsOutput = { result, dryRun: false };

      return createOutputResult(output, {
        plain: selectFormatter(ctx as PragmaContext, skillsFormatters),
      });
    },
  };
}
