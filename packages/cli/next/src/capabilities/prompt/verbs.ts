/**
 * `prompt list` and `prompt lookup <name>` — the covenant `prompt` content noun.
 *
 * Bespoke (not compilePack): the covenant freezes `prompt_lookup` with a SINGLE
 * `<name>` positional, whereas a pack lookup always emits the variadic
 * `<name...>`. Both are `needsStore` (per covenant) and read the SAME
 * `ds:Prompt` source the native `prompts/*` provider uses, so the tool surface
 * and the native prompt surface are ONE data source, two projections.
 *
 * Run bodies dynamic-import the store-backed source, keeping the store code off
 * the `--help`/`__complete` fast path (the module barrel loads only specs +
 * formatters).
 */

import { PragmaError } from "../../kernel/error/PragmaError.js";
import type { PragmaRuntime } from "../../kernel/runtime/types.js";
import { asVerb } from "../../kernel/spec/asVerb.js";
import type { VerbSpec } from "../../kernel/spec/types.js";
import {
  promptListFormatters,
  promptLookupFormatters,
} from "./prompt.render.js";
import type { PromptListData, PromptLookupData } from "./types.js";

const READ_CAPABILITY = {
  needsStore: true,
  mutates: false,
  mcp: {
    expose: true as const,
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
};

const listVerb: VerbSpec<Record<string, unknown>, PromptListData> = {
  path: ["prompt", "list"],
  summary: "List the workflow prompt templates the design system offers.",
  doc: "Browse the ds:Prompt entities in the active graph — name, description, and argument names. The same prompts are offered natively over MCP prompts/list; use prompt_lookup for the full template body.",
  params: [],
  output: { formatters: promptListFormatters },
  examples: [{ cmd: "pragma prompt list" }],
  capability: READ_CAPABILITY,
  run: (_params: Record<string, unknown>, rt: PragmaRuntime) =>
    import("../../kernel/project/mcp/prompts/source.js").then(async (m) => {
      const prompts = await m.readPrompts(rt);
      return {
        prompts: prompts.map((prompt) => ({
          name: prompt.name,
          ...(prompt.description ? { description: prompt.description } : {}),
          arguments: prompt.arguments,
        })),
      };
    }),
};

const lookupVerb: VerbSpec<Record<string, unknown>, PromptLookupData> = {
  path: ["prompt", "lookup"],
  summary: "Show one workflow prompt template's body and arguments by name.",
  doc: "Fetch a single ds:Prompt entity's full template body (with {{arg}} placeholders) and its declared arguments.",
  params: [
    {
      kind: "string",
      name: "name",
      doc: "The prompt name (e.g. build-a-block).",
      positional: true,
      required: true,
    },
  ],
  output: { formatters: promptLookupFormatters },
  examples: [{ cmd: "pragma prompt lookup build-a-block" }],
  capability: READ_CAPABILITY,
  run: (params: Record<string, unknown>, rt: PragmaRuntime) =>
    import("../../kernel/project/mcp/prompts/source.js").then(async (m) => {
      const name = String(params.name);
      const entry = await m.readPrompt(rt, name);
      if (!entry) {
        const available = await m.readPrompts(rt);
        throw PragmaError.notFound("prompt", name, {
          suggestions: available.map((prompt) => prompt.name),
          recovery: {
            message: "List available prompts.",
            cli: "pragma prompt list",
            mcp: { tool: "prompt_list" },
          },
        });
      }
      return entry;
    }),
};

/** The `prompt` content verbs (`list`, `lookup`). */
export const promptListVerb = asVerb(listVerb);
export const promptLookupVerb = asVerb(lookupVerb);
