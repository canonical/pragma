/**
 * Prompt entities, read two ways from one graph type.
 *
 * A prompt lives in the graph as an entity the distribution's vocabulary
 * declares, and two surfaces offer it: the native MCP `prompts/list` +
 * `prompts/get` handlers, and the `prompt list` / `prompt lookup` verbs behind
 * the covenant tools. The pair is the cohesion principle — the reader here is
 * the ONE place either surface learns what a prompt is, so the two can never
 * report a different set of prompts or a different template body for one.
 *
 * The barrel carries both halves, and they READ DIFFERENTLY — the distinction
 * matters to anyone rerouting imports through here, so it is stated rather
 * than implied.
 *
 * `promptProvider` is the MCP module hook. Its `prompts/list` is STORELESS:
 * it projects the pack index through `listPromptSummaries`, returning `[]`
 * when no index is reachable and never booting the store. Its `prompts/get`
 * is store-backed. The provider is imported STATICALLY by the prompt
 * capability (`capabilities/prompt/index.ts`) — what it defers is the MCP SDK
 * itself, whose request schemas it reaches through a dynamic import so the SDK
 * stays off the `--help`/`__complete` fast path.
 *
 * `readPrompts` and `readPrompt` are the reads the CLI verbs take, and BOTH
 * are store-backed: they query through `runSelect` directly, not through the
 * index projection. A caller that expects a listing here to be as cheap as the
 * MCP one is mistaken, and a reroute that makes either reachable statically
 * from the capability graph puts a store boot on the fast path.
 *
 * `listPromptSummaries` stays internal. It is the MCP list path's projection,
 * not a shared foundation under the two exported reads, and a caller choosing
 * it directly is choosing a partial prompt without the store-backed body that
 * makes it usable.
 */

export { promptProvider } from "./provider.js";
export type { PromptArgument, PromptEntry } from "./source.js";
export { readPrompt, readPrompts } from "./source.js";
