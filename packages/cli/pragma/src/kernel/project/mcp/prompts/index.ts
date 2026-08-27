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
 * The barrel carries both halves. `promptProvider` is the MCP module hook,
 * registered by the prompt capability; `readPrompts` and `readPrompt` are the
 * reads the CLI verbs take. Their laziness is deliberate and survives the
 * barrel only if callers keep it: listing is STORELESS over the pack index,
 * a get is store-backed, and both the SDK request schemas and this module
 * itself are reached through DYNAMIC imports so neither the MCP SDK nor a
 * store boot lands on the `--help`/`__complete` fast path. A consumer that
 * imports this barrel statically from the capability graph would put them
 * there.
 *
 * `listPromptSummaries` — the storeless index projection both readers build on
 * — stays internal: it is the shared half of the two reads above, and a caller
 * choosing it directly is choosing a partial prompt without the store-backed
 * body that makes it usable.
 */

export { promptProvider } from "./provider.js";
export type { PromptArgument, PromptEntry } from "./source.js";
export { readPrompt, readPrompts } from "./source.js";
