/**
 * CLI Type Definitions
 *
 * Types for generator authors to validate their prompt names at compile-time.
 */

/**
 * Reserved option names for CLI global options.
 * Generator prompts MUST NOT use these names.
 *
 * Use the `ForbidReserved` type to enforce at compile-time:
 * @example
 * ```typescript
 * interface MyAnswers {
 *   name: string;       // OK
 *   help: string;       // Will cause type error
 * }
 *
 * // This will produce a compile-time error if any key is reserved
 * type ValidatedAnswers = ForbidReserved<MyAnswers>;
 * ```
 */
export type ReservedOption =
  | "help"
  | "version"
  | "dryRun"
  | "dry-run"
  | "yes"
  | "output"
  | "preview"
  | "generators"
  | "run"
  | "init";

/**
 * Type helper that produces a compile-time error if T contains any reserved option names.
 *
 * @example
 * ```typescript
 * interface BadAnswers {
 *   name: string;
 *   help: string; // Reserved!
 * }
 *
 * // This will error: Type 'string' is not assignable to type '["Error: 'help' is a reserved option name"]'
 * const generator: GeneratorDefinition<ForbidReserved<BadAnswers>> = { ... };
 * ```
 */
export type ForbidReserved<T> = {
  [K in keyof T]: K extends ReservedOption
    ? [`Error: '${K & string}' is a reserved option name`]
    : T[K];
};
