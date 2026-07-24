/**
 * Data shapes for the `prompt` content noun (`prompt_list`/`prompt_lookup`).
 *
 * Both project the SAME `ds:Prompt` entities the native MCP `prompts/*` surface
 * reads (via the shared `kernel/project/mcp/prompts/source.ts`), so the tool and
 * the native prompt can never disagree. `list` returns summaries (no body);
 * `lookup` returns the full entry (body + arguments).
 */

import type {
  PromptArgument,
  PromptEntry,
} from "../../kernel/project/mcp/prompts/source.js";

/** One prompt in a `prompt_list` result — summary only (no template body). */
export interface PromptListing {
  readonly name: string;
  readonly description?: string;
  readonly arguments: readonly PromptArgument[];
}

/** The `prompt_list` payload. */
export interface PromptListData {
  readonly prompts: readonly PromptListing[];
}

/** The `prompt_lookup` payload — the full materialized prompt. */
export type PromptLookupData = PromptEntry;

export type { PromptArgument, PromptEntry };
