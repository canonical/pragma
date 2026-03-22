/**
 * Types for `pragma llm` orientation output.
 */

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

export interface DecisionTree {
  readonly intent: string;
  readonly tree: string;
}

export interface CommandRefEntry {
  readonly command: string;
  readonly tokens: string;
}

export interface LlmData {
  readonly context: LlmContext;
  readonly decisionTrees: readonly DecisionTree[];
  readonly commandReference: readonly CommandRefEntry[];
}
