/**
 * The prompt-handling seam types.
 *
 * A {@link PromptHandler} is exactly the shape the task interpreter's
 * `promptHandler` option expects — it receives the whole `Prompt` effect (whose
 * `.question` carries name/message/type/default/choices/validate) and resolves
 * the answer. Every front-end (Ink wizard, MCP args, non-interactive defaults)
 * is one implementation of this single function type, injected into the runner;
 * summon-core never owns a UI toolkit.
 */

import type {
  ConfirmPrompt,
  Effect,
  MultiselectPrompt,
  PromptQuestion,
  SelectPrompt,
  TextPrompt,
} from "@canonical/task";

/** A `Prompt` effect — the argument a {@link PromptHandler} resolves. */
export type PromptEffect = Effect & { _tag: "Prompt" };

/**
 * The one prompt-answering seam: resolve a `Prompt` effect to its answer. The
 * runner (`runTask` / `runGeneratorTask`) drives the task and calls this for
 * each interleaved `Prompt`.
 */
export type PromptHandler = (question: PromptEffect) => Promise<unknown>;

export type {
  ConfirmPrompt,
  MultiselectPrompt,
  PromptQuestion,
  SelectPrompt,
  TextPrompt,
};
