/**
 * Generator type definitions for the Summon code generator framework.
 *
 * Effect framework types (Task, Effect, TaskError, etc.) are in @canonical/task.
 *
 * @packageDocumentation
 */

import type { Task } from "@canonical/task";

// =============================================================================
// Generator Definition Types
// =============================================================================

/**
 * Metadata for a generator, displayed in CLI help and discovery.
 */
export interface GeneratorMeta {
  /** Generator name, used in CLI path (e.g., "component/react") */
  name: string;
  /** One-line description shown in generator listings */
  description: string;
  /** Semantic version of the generator */
  version: string;
  /** Author name or email */
  author?: string;
  /**
   * Extended help text shown when calling `summon <topic>` (without subgenerator)
   * and in --help. Use this for detailed explanation and examples.
   * Supports markdown-like formatting.
   */
  help?: string;
  /**
   * Usage examples shown in help. Each example should show a common invocation.
   */
  examples?: string[];
}

/**
 * Definition of a prompt in a generator.
 *
 * Each prompt becomes a CLI flag. The prompt name is converted to kebab-case
 * for the flag (e.g., `componentPath` → `--component-path`).
 */
export interface PromptDefinition {
  /** Unique identifier, used as answer key and CLI flag name */
  name: string;
  /** Question text displayed to the user */
  message: string;
  /** Type of input */
  type: "text" | "confirm" | "select" | "multiselect";
  /** Default value if user provides no input */
  default?: unknown;
  /** Choices for select/multiselect prompts */
  choices?: Array<{ label: string; value: string }>;
  /** Conditional function - prompt is skipped if this returns false */
  when?: (answers: Record<string, unknown>) => boolean;
  /** Validation function, returns true or error message */
  validate?: (value: unknown) => boolean | string;
  /**
   * Group name for organizing options in --help output.
   * Options without a group appear under "Options".
   */
  group?: string;
  /**
   * If true, this prompt can be provided as a positional argument.
   * Only one prompt per generator should be positional.
   * Only text prompts can be positional.
   */
  positional?: boolean;
}

/**
 * The complete definition of a generator.
 *
 * @typeParam TAnswers - Type of the answers object passed to generate
 */
export interface GeneratorDefinition<TAnswers = Record<string, unknown>> {
  /** Generator metadata for CLI display */
  meta: GeneratorMeta;
  /** Prompts to collect answers from user */
  prompts: PromptDefinition[];
  /** Pure function that returns a Task describing the generation */
  generate: (answers: TAnswers) => Task<void>;
}

/**
 * A generator definition without type parameters, used in barrels/collections.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for contravariant generator collections
export type AnyGenerator = GeneratorDefinition<any>;
