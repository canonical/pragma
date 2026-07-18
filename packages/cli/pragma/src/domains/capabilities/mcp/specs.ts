/**
 * MCP tool spec for the capabilities domain — the `capabilities`
 * aggregator (D2a).
 *
 * A zero-content aggregator for tools-only harnesses: every field is the
 * byte-identical payload of a protocol surface (initialize instructions,
 * pragma://state, prompts/list, tools/list) built from the SAME producers
 * the server registers. Protocol-complete clients never need it.
 */

import { PragmaError } from "#error";
import buildInstructions from "../../../mcp/instructions.js";
import { buildToolListEntry } from "../../../mcp/tools/registerFromSpec.js";
import collectPrompts from "../../prompt/collectPrompts.js";
import hydratePrompt from "../../prompt/operations/hydratePrompt.js";
import projectPromptList from "../../prompt/projectPromptList.js";
import { buildLiveStatePayload } from "../../shared/state/index.js";
import { suggestNames } from "../../shared/suggestions/index.js";
import type { ToolSpec } from "../../shared/ToolSpec.js";
import type { CapabilitiesAggregate } from "../types.js";

const specs: readonly ToolSpec[] = [
  {
    name: "capabilities",
    description:
      "Aggregate orientation for tools-only harnesses: server instructions, live state " +
      "(pragma://state), prompt catalog, and tool reference in one call. Use when your " +
      "client cannot read MCP prompts or resources directly — protocol-complete clients " +
      "should use those surfaces instead. Pass prompt (+ args) to receive one hydrated " +
      "prompt — the tools-only fallback for prompts/get. Example: capabilities {} · " +
      'capabilities { prompt: "implement-component", args: { component: "Button" } }.',
    params: {
      prompt: {
        type: "string",
        description:
          "Prompt name to hydrate instead of returning the aggregate " +
          "(names are listed in the aggregate's prompts field)",
        optional: true,
      },
      args: {
        type: "record",
        description:
          "Arguments for the hydrated prompt (string map, as in prompts/get)",
        optional: true,
      },
    },
    readOnly: true,
    async execute(rt, { prompt, args }) {
      // Dynamic import: this spec is PART of the production collectToolSpecs
      // returns (the aggregator lists itself), so a static import would be a
      // module cycle. Resolved lazily at call time instead.
      const { collectToolSpecs } = await import("../../../mcp/tools/index.js");
      const toolSpecs = collectToolSpecs(rt);
      const registry = await collectPrompts(rt, toolSpecs);

      if (typeof prompt === "string" && prompt.length > 0) {
        const entry = registry.find((e) => e.definition.name === prompt);
        if (!entry) {
          throw PragmaError.notFound("prompt", prompt, {
            suggestions: suggestNames(
              prompt,
              registry.map((e) => e.definition.name),
            ),
            recovery: {
              message:
                "List available prompts (the aggregate's prompts field names them).",
              cli: "pragma prompt list",
              mcp: { tool: "capabilities" },
            },
          });
        }
        // No warning sink: stdio stdout must stay pure, and hydration
        // degradation notes are already lines in the returned text.
        const hydrated = await hydratePrompt(
          rt,
          entry.definition,
          (args ?? {}) as Record<string, string>,
          toolSpecs,
        );
        return { data: hydrated };
      }

      const data: CapabilitiesAggregate = {
        instructions: buildInstructions(rt),
        state: buildLiveStatePayload(rt),
        prompts: projectPromptList(registry).prompts,
        tools: toolSpecs.map(buildToolListEntry),
      };
      return { data };
    },
  },
];

export default specs;
