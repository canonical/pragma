import type { CommandDefinition, CommandResult } from "@canonical/cli-core";
import {
  renderInfoJson,
  renderInfoLlm,
  renderInfoPlain,
} from "../formatters/index.js";
import collectInfo from "../operations/collectInfo.js";
import type { InfoData } from "../types.js";

/**
 * Selects the appropriate info renderer based on global CLI flags.
 *
 * @param flags - Global flags indicating output format.
 * @returns A render function mapping {@link InfoData} to a string.
 */
function selectInfoRenderer(flags: {
  llm: boolean;
  format: "text" | "json";
}): (data: InfoData) => string {
  if (flags.format === "json") return renderInfoJson;
  if (flags.llm) return renderInfoLlm;
  return renderInfoPlain;
}

/**
 * The `pragma info` command definition.
 *
 * Displays version, config, update status, and store summary.
 */
const infoCommand: CommandDefinition = {
  path: ["info"],
  description: "Show version, config, update status, and store summary",
  parameters: [],
  execute: async (
    _params: Record<string, unknown>,
    ctx: {
      cwd: string;
      globalFlags: { llm: boolean; format: "text" | "json" };
    },
  ): Promise<CommandResult> => {
    const data = await collectInfo(ctx.cwd);
    const render = selectInfoRenderer(ctx.globalFlags);
    return { tag: "output", value: data, render: { plain: render } };
  },
};

export default infoCommand;
