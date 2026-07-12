import type { ParameterDefinition } from "@canonical/cli-core";
import type { StoryParam } from "./types.js";

/**
 * Project story parameters onto cli-core `ParameterDefinition`s.
 *
 * MCP-only parameters are dropped; `string[]` becomes a multiselect;
 * an `enum` on a string parameter becomes a select with choices.
 */
export default function projectCliParameters(
  params: readonly StoryParam[],
): ParameterDefinition[] {
  return params
    .filter((param) => (param.surfaces ?? "both") !== "mcp")
    .map((param) => toParameterDefinition(param));
}

function toParameterDefinition(param: StoryParam): ParameterDefinition {
  const definition: {
    name: string;
    description: string;
    type: ParameterDefinition["type"];
    choices?: ParameterDefinition["choices"];
    default?: unknown;
    positional?: boolean;
    required?: boolean;
    complete?: ParameterDefinition["complete"];
  } = {
    name: param.name,
    description: param.description,
    type: resolveCliType(param),
  };

  if (param.enum) {
    definition.choices = param.enum.map((value) => ({ label: value, value }));
  }
  if (param.default !== undefined) {
    definition.default = param.default;
  }
  if (param.positional === true) {
    definition.positional = true;
  }
  if (param.required === true) {
    definition.required = true;
  }
  if (param.complete) {
    definition.complete = param.complete;
  }

  return definition;
}

function resolveCliType(param: StoryParam): ParameterDefinition["type"] {
  if (param.type === "string[]") return "multiselect";
  if (param.type === "string" && param.enum) return "select";
  return param.type;
}
