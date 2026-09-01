import type { Task } from "@canonical/task";
import type GeneratorMeta from "./GeneratorMeta.js";
import type PromptDefinition from "./PromptDefinition.js";

/**
 * The complete definition of a generator.
 *
 * @typeParam TAnswers - Type of the answers object passed to generate
 */
export default interface GeneratorDefinition<
  TAnswers = Record<string, unknown>,
> {
  /** Generator metadata for CLI display */
  meta: GeneratorMeta;
  /** Prompts to collect answers from user */
  prompts: PromptDefinition[];
  /**
   * Pure function that returns a Task describing the generation.
   *
   * The returned task must be RE-INTERPRETABLE: compose it from combinators
   * (`sequence_`, `when`, `flatMap`, …), never from a single-use `gen()` —
   * a gen() task closes over one iterator, and the runners interpret a build
   * more than once (dry-run preview, undo collection with backtracking).
   * `execute()` shields callers by invoking `generate` freshly per
   * interpretation, but direct drivers of one build get truncated re-drives.
   */
  generate: (answers: TAnswers) => Task<void>;
}
