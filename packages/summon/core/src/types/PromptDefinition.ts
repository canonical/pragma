/**
 * Definition of a prompt in a generator.
 *
 * Each prompt becomes a CLI flag. The prompt name is converted to kebab-case
 * for the flag (e.g., `componentPath` → `--component-path`).
 */
export default interface PromptDefinition {
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
