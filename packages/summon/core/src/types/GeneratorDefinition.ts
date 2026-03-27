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
  /** Pure function that returns a Task describing the generation */
  generate: (answers: TAnswers) => Task<void>;
}
