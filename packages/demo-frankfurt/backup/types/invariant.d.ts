/**
 * Asserts that the given condition is truthy.
 *
 * @remarks
 * This is a minimalist invariant function. It throws an error with the provided message
 * (or a default one) if the condition is falsy. Unlike a more basic implementation, this version
 * supports lazy evaluation of the message (if provided as a function) and allows a custom prefix to be added.
 *
 * Tiny-invariant includes additional branches to:
 * - Check the runtime environment (development vs. production) and strip detailed messages in production.
 *
 * If you need these extra features (e.g., for optimized production bundles), tiny-invariant may
 * be a better choice. However, if simplicity and minimal code are your priorities, this version
 * may suffice.
 *
 * @param condition - The condition to assert. If falsy, an error is thrown.
 * @param message - Optional error message or a function that returns an error message. If not provided, a default message is used.
 * @param prefix - Optional prefix for the error message. Defaults to 'Invariant violation'.
 *
 * @throws {Error} If the condition is falsy.
 *
 * @example
 * ```typescript
 * const value: string | undefined = getValue();
 * invariant(typeof value === 'string', 'Expected value to be a string');
 * // After this assertion, TypeScript narrows `value` to `string`.
 *
 * // With a custom prefix and lazy evaluation:
 * invariant(value !== null, () => `Value should not be null, got ${value}`, 'Type Error');
 * ```
 */
declare const _default: (condition: unknown, message?: string | (() => string), prefix?: string) => asserts condition;
export default _default;
//# sourceMappingURL=invariant.d.ts.map