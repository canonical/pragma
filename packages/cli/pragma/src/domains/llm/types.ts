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
}

/** Complete payload rendered by `pragma llm`: context, trees, and reference. */
export interface LlmData {
  readonly context: LlmContext;
  readonly decisionTrees: readonly DecisionTree[];
  readonly commandReference: readonly CommandRefEntry[];
}
