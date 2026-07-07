/**
 * Serialise a value to a canonical, deterministic, lossless string.
 *
 * Unlike `JSON.stringify`, the output is stable across runs and injective over
 * the value domain it accepts: plain-object keys are sorted, arrays keep their
 * length and holes, `Map`/`Set` are tagged with sorted entries, `Date` and
 * `RegExp` are tagged, ArrayBuffer views are tagged with their raw bytes, and
 * the values `JSON.stringify` drops or mangles — `undefined`, `NaN`,
 * `±Infinity`, `-0`, and `bigint` — each get a distinct bare token that can
 * never collide with a string (strings are always quoted). It fails closed
 * with a `TypeError` on anything it cannot represent injectively: a function, a
 * symbol, a symbol-keyed or class-instance object, or a property whose getter
 * throws. Only own-enumerable string keys are canonicalised.
 *
 * @param value - The value to serialise.
 * @returns A canonical string representation.
 * @throws TypeError When the value is outside the canonicalisable domain.
 */
export default function canonicalJSON(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "undefined";
  }

  const type = typeof value;
  switch (type) {
    case "boolean":
      return value ? "true" : "false";
    case "bigint":
      return `${value as bigint}n`;
    case "string":
      return JSON.stringify(value);
    case "number":
      return encodeNumber(value as number);
    case "object":
      return encodeObject(value as object);
    default:
      // function | symbol — not representable deterministically.
      throw new TypeError(
        `canonicalJSON: cannot serialise a value of type ${type}`,
      );
  }
}

/**
 * Encode a number, giving `NaN`, `±Infinity`, and `-0` distinct bare tokens so
 * they survive the round trip that `JSON.stringify` would lose.
 */
function encodeNumber(value: number): string {
  if (Number.isNaN(value)) {
    return "NaN";
  }
  if (value === Number.POSITIVE_INFINITY) {
    return "Infinity";
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return "-Infinity";
  }
  if (Object.is(value, -0)) {
    return "-0";
  }
  return JSON.stringify(value);
}

/**
 * Encode a non-null object: arrays, `Map`, `Set`, `Date`, `RegExp`, ArrayBuffer
 * views, and plain records each get a distinct, deterministic form. A class
 * instance with opaque state is not representable injectively, so it fails
 * closed.
 */
function encodeObject(value: object): string {
  if (Array.isArray(value)) {
    return encodeArray(value);
  }
  if (value instanceof Map) {
    return encodeMap(value);
  }
  if (value instanceof Set) {
    return encodeSet(value);
  }
  if (value instanceof Date) {
    return `Date(${value.getTime()})`;
  }
  if (value instanceof RegExp) {
    return `RegExp(${JSON.stringify(value.source)},${JSON.stringify(value.flags)})`;
  }
  if (ArrayBuffer.isView(value)) {
    return encodeView(value);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype === Object.prototype || prototype === null) {
    return encodeRecord(value as Record<string, unknown>);
  }
  // A class instance's identity lives in opaque internal state, not its
  // enumerable keys — fail closed rather than conflate distinct instances.
  throw new TypeError(
    "canonicalJSON: cannot serialise a non-plain object (class instance)",
  );
}

/**
 * Encode an array element-wise, giving an absent slot (a hole) a distinct bare
 * token so a sparse array never collapses to a shorter one.
 */
function encodeArray(value: unknown[]): string {
  const parts: string[] = [];
  for (let index = 0; index < value.length; index++) {
    parts.push(index in value ? canonicalJSON(value.at(index)) : "hole");
  }
  return `[${parts.join(",")}]`;
}

/**
 * Encode an ArrayBuffer view (typed array or `DataView`) as its constructor tag
 * plus its raw bytes, so every view type and payload stays distinct.
 */
function encodeView(value: ArrayBufferView): string {
  const bytes = new Uint8Array(
    value.buffer,
    value.byteOffset,
    value.byteLength,
  );
  return `${value.constructor.name}(${Array.from(bytes).join(",")})`;
}

/** Encode a `Map` as a tagged, key-sorted set of canonical `key:value` pairs. */
function encodeMap(value: Map<unknown, unknown>): string {
  const entries = Array.from(value.entries())
    .map(([key, val]) => `${canonicalJSON(key)}:${canonicalJSON(val)}`)
    .sort();
  return `Map{${entries.join(",")}}`;
}

/** Encode a `Set` as a tagged, sorted list of canonical elements. */
function encodeSet(value: Set<unknown>): string {
  const items = Array.from(value)
    .map((item) => canonicalJSON(item))
    .sort();
  return `Set{${items.join(",")}}`;
}

/**
 * Encode a plain record with its own-enumerable string keys sorted, failing
 * closed on a throwing getter. Symbol keys are rejected (a symbol-keyed object
 * would otherwise collapse to `{}`); only own-enumerable string keys are
 * canonicalised.
 */
function encodeRecord(record: Record<string, unknown>): string {
  if (Object.getOwnPropertySymbols(record).length > 0) {
    throw new TypeError(
      "canonicalJSON: cannot serialise an object with symbol keys",
    );
  }
  const keys = Object.keys(record).sort();
  const entries = keys.map(
    (key) =>
      `${JSON.stringify(key)}:${canonicalJSON(readProperty(record, key))}`,
  );
  return `{${entries.join(",")}}`;
}

/**
 * Read a property, converting a throwing getter into a fail-closed `TypeError`
 * so a value that cannot be observed deterministically never yields output.
 */
function readProperty(record: Record<string, unknown>, key: string): unknown {
  try {
    return record[key];
  } catch (error) {
    throw new TypeError(
      `canonicalJSON: reading property ${JSON.stringify(key)} threw: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
