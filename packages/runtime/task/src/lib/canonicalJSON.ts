/**
 * Serialise a value to a canonical, deterministic, lossless string.
 *
 * Unlike `JSON.stringify`, the output is stable across runs and injective over
 * the values effect descriptors carry: object keys are sorted, `Map`/`Set` are
 * tagged and their entries sorted, typed arrays are tagged, and the values
 * `JSON.stringify` drops or mangles — `undefined`, `NaN`, `±Infinity`, `-0`,
 * and `bigint` — are each given a distinct bare token that can never collide
 * with a string (strings are always quoted). It fails closed: a value it cannot
 * represent deterministically (a function, a symbol, or a property whose getter
 * throws) raises a `TypeError` rather than emitting ambiguous output.
 *
 * @param value - The value to serialise.
 * @returns A canonical string representation.
 * @throws TypeError When the value contains something non-serialisable.
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
 * Encode a non-null object: arrays, `Map`, `Set`, typed arrays, and plain
 * records each get a distinct, deterministic form.
 */
function encodeObject(value: object): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJSON(item)).join(",")}]`;
  }
  if (value instanceof Map) {
    return encodeMap(value);
  }
  if (value instanceof Set) {
    return encodeSet(value);
  }
  if (ArrayBuffer.isView(value)) {
    const items = Array.from(value as unknown as ArrayLike<number>);
    return `${value.constructor.name}(${items.map((n) => canonicalJSON(n)).join(",")})`;
  }
  return encodeRecord(value as Record<string, unknown>);
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

/** Encode a plain record with keys sorted, failing closed on a throwing getter. */
function encodeRecord(record: Record<string, unknown>): string {
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
