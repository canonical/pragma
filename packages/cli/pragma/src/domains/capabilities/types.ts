/**
 * Types for the capabilities domain — the mirror of the MCP protocol
 * orientation surfaces.
 */

import type { ToolListEntry } from "../../mcp/tools/registerFromSpec.js";
import type { PromptListEntry } from "../prompt/types.js";
import type { StatePayload } from "../shared/state/index.js";

/** The disclosure levels of `pragma capabilities` — each IS a protocol payload. */
export const CAPABILITY_LEVELS = ["state", "prompts", "reference"] as const;

/** One capability level name. */
export type CapabilityLevel = (typeof CAPABILITY_LEVELS)[number];

/** The `reference` level payload — the exact `tools/list` result. */
export interface ReferencePayload {
  readonly tools: ToolListEntry[];
}

/**
 * The `capabilities` MCP aggregator payload (no `prompt` argument): every
 * orientation surface in one call, for tools-only harnesses. Each field is
 * byte-identical to its protocol source — `instructions` from initialize,
 * `state` from `resources/read pragma://state`, `prompts` from
 * `prompts/list`, `tools` from `tools/list` (including this tool itself).
 */
export interface CapabilitiesAggregate {
  readonly instructions: string;
  readonly state: StatePayload;
  readonly prompts: PromptListEntry[];
  readonly tools: ToolListEntry[];
}
