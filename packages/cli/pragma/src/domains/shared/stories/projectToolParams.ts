import type { ToolParamDef } from "../ToolSpec.js";
import type { StoryParam } from "./types.js";

/**
 * Project story parameters onto MCP `ToolParamDef`s.
 *
 * CLI-only parameters are dropped, along with CLI-only attributes
 * (defaults, positionals, completion). Required parameters set
 * `optional: false` explicitly — the MCP adapter treats anything
 * else as optional.
 */
export default function projectToolParams(
  params: readonly StoryParam[],
): Record<string, ToolParamDef> {
  const projected: Record<string, ToolParamDef> = {};

  for (const param of params) {
    if ((param.surfaces ?? "both") === "cli") continue;
    projected[param.name] = toToolParamDef(param);
  }

  return projected;
}

function toToolParamDef(param: StoryParam): ToolParamDef {
  return {
    type: param.type,
    description: param.toolDescription ?? param.description,
    optional: param.required !== true,
    ...(param.enum && { enum: param.enum }),
  };
}
