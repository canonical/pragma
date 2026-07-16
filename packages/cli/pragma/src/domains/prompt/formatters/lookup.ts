import type { Formatters } from "../../shared/formatters.js";
import type { HydratedPrompt } from "../types.js";

/**
 * Formatters for `pragma prompt lookup`.
 *
 * MIRROR INVARIANT: json emits the exact `prompts/get` result
 * (`GetPromptResult`); text modes print the hydrated markdown itself.
 */
const lookupFormatters: Formatters<HydratedPrompt> = {
  plain: (hydrated) =>
    hydrated.messages.map((message) => message.content.text).join("\n\n"),
  llm: (hydrated) =>
    hydrated.messages.map((message) => message.content.text).join("\n\n"),
  json: (hydrated) => JSON.stringify(hydrated, null, 2),
};

export default lookupFormatters;
