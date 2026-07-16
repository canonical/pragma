/**
 * Prompt-surface data shapes.
 *
 * A {@link PromptDefinition} is the neutral document a prompt author ships
 * (transitionally bundled as TS data, later loaded from `pragma/` pack
 * files with `kind: "prompt"` — the v2 loader will emit this exact type).
 * The MCP adapter projects definitions onto `prompts/list` / `prompts/get`;
 * the CLI `prompt` noun mirrors those payloads byte-exactly.
 */

/** Where a prompt argument's completions come from. */
export interface PromptCompleteFrom {
  /** A registered read-only list tool (e.g. `block_list`). */
  readonly tool: string;
  /** The row field whose values complete the argument (e.g. `name`). */
  readonly field: string;
}

/** One declared prompt argument. */
export interface PromptArgumentDef {
  readonly description: string;
  readonly required?: boolean;
  /** Declares `completion/complete` support for this argument. */
  readonly completeFrom?: PromptCompleteFrom;
}

/** A hydration embed that executes a registered read-only tool. */
export interface PromptToolEmbed {
  /** Registered tool name; must be `readOnly` and not a raw-query tool. */
  readonly tool: string;
  /**
   * Tool params as strings. `{{arg}}` placeholders splice BEFORE the
   * values pass through the tool's own param validation — never into
   * query text (raw-query tools are denied at validation).
   */
  readonly args?: Readonly<Record<string, string>>;
  /** Markdown heading the embed renders under. */
  readonly heading: string;
}

/** A hydration embed that reads an MCP resource. */
export interface PromptResourceEmbed {
  /** `pragma://state` or a graph-entity URI (prefixed or full). */
  readonly resource: string;
  /** Markdown heading the embed renders under. */
  readonly heading: string;
}

/** One hydration embed, executed in declaration order. */
export type PromptEmbed = PromptToolEmbed | PromptResourceEmbed;

/** A prompt document (authored, or projected from a skill). */
export interface PromptDefinition {
  /** Kebab-case name, unique across the prompt registry. */
  readonly name: string;
  /** One-line description served in `prompts/list`. */
  readonly description: string;
  /** Declared arguments; names become the `prompts/get` args map keys. */
  readonly arguments?: Readonly<Record<string, PromptArgumentDef>>;
  /** Markdown template; `{{arg}}` placeholders splice argument values. */
  readonly template: string;
  /** Hydration embeds, appended as sections in order (D3a). */
  readonly embed?: readonly PromptEmbed[];
  /** Hydration size budget in tokens (est. chars/4). Default 4000. */
  readonly budget?: number;
}

/** A validated prompt definition paired with where it was declared. */
export interface PromptRegistryEntry {
  readonly definition: PromptDefinition;
  readonly source: string;
}

/** `prompts/list` argument projection (the SDK's serialized shape). */
export interface PromptListArgument {
  readonly name: string;
  readonly description: string;
  readonly required: boolean;
}

/** One `prompts/list` entry (the SDK's serialized shape). */
export interface PromptListEntry {
  readonly name: string;
  readonly description: string;
  readonly arguments?: readonly PromptListArgument[];
}

/**
 * One message of a hydrated prompt (`prompts/get` result shape).
 *
 * A type alias (not an interface) with mutable members on purpose: the
 * MCP SDK's `GetPromptResult` carries an index signature and mutable
 * arrays, and only an alias is implicitly index-signature-compatible.
 */
export type HydratedPromptMessage = {
  role: "user";
  content: { type: "text"; text: string };
};

/** The `prompts/get` result shape (`GetPromptResult`). */
export type HydratedPrompt = {
  description: string;
  messages: HydratedPromptMessage[];
};
