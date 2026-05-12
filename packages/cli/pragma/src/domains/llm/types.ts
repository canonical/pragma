import type { ToolEntry } from "./data/toolCatalog.js";

// — Capabilities ——————————————————————————————————————————————————————————————

/** Structured system map returned by `pragma capabilities`. */
export interface CapabilitiesData {
  readonly version: string;
  readonly conventions: {
    readonly system: string;
    readonly model: string;
    readonly querying: string;
  };
  readonly discovery_sequence: readonly DiscoveryStage[];
  readonly tools: readonly ToolEntry[];
  readonly counts: ToolCounts;
  readonly limits: {
    readonly output_modes: readonly string[];
    readonly condensed_available: boolean;
  };
}

/** A single stage in the discovery flow. */
export interface DiscoveryStage {
  readonly stage: number;
  readonly tool: string;
  readonly purpose: string;
}

/** Tool counts by category. */
export interface ToolCounts {
  readonly total: number;
  readonly read: number;
  readonly write: number;
  readonly orientation: number;
  readonly diagnostic: number;
}

// — LLM orientation ———————————————————————————————————————————————————————————

/** Dynamic context snapshot: tier, channel, entity counts, and namespaces. */
export interface LlmContext {
  readonly tier: string | undefined;
  readonly tierChain: readonly string[];
  readonly channel: string;
  readonly counts: {
    readonly blocks: number;
    readonly standards: number;
    readonly modifierFamilies: number;
    readonly tokens: number;
  };
  readonly namespaces: readonly string[];
}

/** A single intent-to-flowchart mapping used in LLM orientation output. */
export interface DecisionTree {
  readonly intent: string;
  readonly tree: string;
}

/** A command name paired with its approximate output token cost. */
export interface CommandRefEntry {
  readonly command: string;
  readonly tokens: string;
  readonly use_when: string;
}

/** Complete payload rendered by `pragma llm`: context, trees, and reference. */
export interface LlmData {
  readonly context: LlmContext;
  readonly decisionTrees: readonly DecisionTree[];
  readonly commandReference: readonly CommandRefEntry[];
}
