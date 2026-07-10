/**
 * The bridge from form-first generators to the dialog-first prompting model:
 * turn a static prompt-definition list into a Task that asks each question as
 * an interleaved `Prompt` effect through the executor's `promptHandler` seam.
 *
 * One builder makes every existing generator answerable by any front-end
 * handler — readline, Ink, or defaults — without touching the generator:
 * prompts already answered (CLI flags) are skipped, `when` conditions are
 * evaluated against the answers collected so far, and each remaining
 * definition maps onto the task alphabet's `PromptQuestion`.
 */

import {
  $,
  gen,
  type PromptQuestion,
  prompt,
  type Task,
} from "@canonical/task";

/**
 * A prompt definition a command can ask for: the structural shape shared by
 * generator prompt lists, kept free of any generator-package dependency.
 */
export interface AnswerablePrompt {
  /** Answer key, unique within the list. */
  readonly name: string;
  /** Question text displayed to the user. */
  readonly message: string;
  /** Prompt kind, deciding how the handler renders and parses the answer. */
  readonly type: "text" | "confirm" | "select" | "multiselect";
  /** Default value when the user provides no input. */
  readonly default?: unknown;
  /** Available options for select/multiselect prompts. */
  readonly choices?: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  /** Ask only when this predicate over the answers so far returns true. */
  readonly when?: (answers: Record<string, unknown>) => boolean;
  /** Text validation: true to accept, or an error message to re-ask with. */
  readonly validate?: (value: string) => boolean | string;
}

/** Map one definition onto the task alphabet's question for its type. */
function toQuestion(definition: AnswerablePrompt): PromptQuestion {
  const { name, message } = definition;
  switch (definition.type) {
    case "confirm":
      return {
        type: "confirm",
        name,
        message,
        default:
          typeof definition.default === "boolean"
            ? definition.default
            : undefined,
      };
    case "select":
      return {
        type: "select",
        name,
        message,
        choices: [...(definition.choices ?? [])],
        default:
          definition.default === undefined
            ? undefined
            : String(definition.default),
      };
    case "multiselect":
      return {
        type: "multiselect",
        name,
        message,
        choices: [...(definition.choices ?? [])],
        default: Array.isArray(definition.default)
          ? definition.default.map(String)
          : undefined,
      };
    default:
      return {
        type: "text",
        name,
        message,
        default:
          definition.default === undefined
            ? undefined
            : String(definition.default),
        validate: definition.validate,
      };
  }
}

/**
 * Build a Task that collects answers for the given prompt definitions by
 * asking each unanswered, applicable one as a `Prompt` effect.
 *
 * The returned task is single-use (it is `gen`-based): build a fresh one per
 * run. Prompts whose `name` is already present in `partialAnswers` are not
 * asked; `when` predicates observe flags and earlier answers alike.
 *
 * @param prompts - The prompt definitions, in asking order.
 * @param partialAnswers - Answers already provided (e.g. CLI flags).
 * @returns A task yielding the complete answers record.
 */
export default function promptForAnswers(
  prompts: readonly AnswerablePrompt[],
  partialAnswers: Readonly<Record<string, unknown>> = {},
): Task<Record<string, unknown>> {
  return gen(function* () {
    const answers: Record<string, unknown> = { ...partialAnswers };
    for (const definition of prompts) {
      if (definition.name in answers) {
        continue;
      }
      if (definition.when && definition.when(answers) !== true) {
        continue;
      }
      answers[definition.name] = yield* $(prompt(toQuestion(definition)));
    }
    return answers;
  });
}
