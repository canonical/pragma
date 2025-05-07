/**
 * Either all fields are provided or none are.
 *
 * @example
 * type Example = AllOrNone<{ a: string; b: number }>;
 * const example: Example = { a: "hello", b: 42 }; // OK
 * const example: Example = { a: "hello" }; // Error
 * const example: Example = { b: 42 }; // Error
 * const example: Example = {}; // OK
 */
export type AllOrNone<T extends Record<string, unknown>> =
  | T
  | { [K in keyof T]?: never };
