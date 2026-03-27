import type ReservedOption from "./ReservedOption.js";

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
type ForbidReserved<T> = {
  [K in keyof T]: K extends ReservedOption
    ? [`Error: '${K & string}' is a reserved option name`]
    : T[K];
};

export default ForbidReserved;
