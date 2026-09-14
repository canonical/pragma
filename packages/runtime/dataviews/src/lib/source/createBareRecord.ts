/**
 * Create a prototype-free record, so a key named for an `Object.prototype`
 * member reads as absent rather than as a function.
 */
export default function createBareRecord<TValue>(): Record<string, TValue> {
  return Object.create(null);
}
