import {
  type CommandDefinition,
  type CommandResult,
  createOutputResult,
} from "@canonical/cli-core";
import { PragmaError } from "#error";
import { collectToolSpecs } from "../../../mcp/tools/index.js";
import { buildToolListEntry } from "../../../mcp/tools/registerFromSpec.js";
import collectPrompts from "../../prompt/collectPrompts.js";
import { listFormatters as promptListFormatters } from "../../prompt/formatters/index.js";
import projectPromptList from "../../prompt/projectPromptList.js";
import type { PragmaContext } from "../../shared/context.js";
import { selectFormatter } from "../../shared/formatters.js";
import { buildLiveStatePayload } from "../../shared/state/index.js";
import { referenceFormatters, stateFormatters } from "../formatters/index.js";
import { CAPABILITY_LEVELS, type CapabilityLevel } from "../types.js";

/** Narrow a raw `--detail` value to a capability level. */
function isLevel(value: string): value is CapabilityLevel {
  return (CAPABILITY_LEVELS as readonly string[]).includes(value);
}

/**
 * Build the `pragma capabilities [--detail <level>]` command definition.
 *
 * THE MIRROR INVARIANT: each level's `--format json` output is the EXACT
 * protocol payload the MCP server serves — `state` ≡ the JSON text of
 * `resources/read pragma://state`, `prompts` ≡ the `prompts/list` result,
 * `reference` ≡ the `tools/list` result. Text rendering is a view over the
 * same payload object, never a parallel data source.
 *
 * Store-required (unlike its predecessor): the reference level compiles
 * pack tools and prompts hydrate against the registry, both of which need
 * a booted store. `doctor` is the storeless diagnostic.
 *
 * @param ctx - Pragma context providing store, config, and flags.
 * @returns The command definition for `pragma capabilities`.
 * @note - Impure — reads config layers from disk (state) and discovers
 *   skill stubs (prompts).
 */
export default function buildCapabilitiesCommand(
  ctx: PragmaContext,
): CommandDefinition {
  return {
    path: ["capabilities"],
    description:
      "Mirror the MCP orientation payloads: state, prompts, or tool reference",
    parameters: [
      {
        name: "detail",
        description: "Which protocol payload to mirror",
        type: "select",
        choices: CAPABILITY_LEVELS.map((level) => ({
          label: level,
          value: level,
        })),
        default: "state",
      },
    ],
    meta: {
      examples: [
        "pragma capabilities",
        "pragma capabilities --detail prompts",
        "pragma capabilities --detail reference --format json",
      ],
    },
    execute: async (
      params: Record<string, unknown>,
    ): Promise<CommandResult> => {
      const level = typeof params.detail === "string" ? params.detail : "state";
      if (!isLevel(level)) {
        throw PragmaError.invalidInput("detail", level, {
          validOptions: [...CAPABILITY_LEVELS],
        });
      }

      switch (level) {
        case "state": {
          const payload = buildLiveStatePayload(ctx);
          return createOutputResult(payload, {
            plain: selectFormatter(ctx, stateFormatters),
          });
        }
        case "prompts": {
          const registry = await collectPrompts(ctx, collectToolSpecs(ctx));
          const payload = projectPromptList(registry);
          return createOutputResult(payload, {
            plain: selectFormatter(ctx, promptListFormatters),
          });
        }
        case "reference": {
          const payload = {
            tools: collectToolSpecs(ctx).map(buildToolListEntry),
          };
          return createOutputResult(payload, {
            plain: selectFormatter(ctx, referenceFormatters),
          });
        }
      }
    },
  };
}
