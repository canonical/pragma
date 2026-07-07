/**
 * Serialise a value to a canonical, deterministic, lossless string.
 *
 * Unlike `JSON.stringify`, the output is stable across runs and injective over
 * the value domain it accepts: plain-object keys are sorted, arrays keep their
 * length and holes, `Map`/`Set` are tagged with sorted entries, `Date` and
 * `RegExp` are tagged, a typed array is tagged with its element values and a
 * `DataView` with its raw bytes, and the values `JSON.stringify` drops or
 * mangles — `undefined`, `NaN`, `±Infinity`, `-0`, and `bigint` — each get a
 * distinct bare token that can never collide with a string (strings are always
 * quoted). It fails closed with a `TypeError` on anything it cannot represent
 * injectively: a function, a symbol, a symbol-keyed or class-instance object, a
 * cyclic structure, or a property whose getter throws. Only own-enumerable
 * string keys are canonicalised; extra own properties added to a
 * Map/Set/array/typed array/Date/RegExp beyond its intrinsic contents are not
 * part of the canonical form.
 *
 * @param value - The value to serialise.
 * @returns A canonical string representation.
 * @throws TypeError When the value is outside the canonicalisable domain.
 */
export default function canonicalJSON(value: unknown): string {
  return encode(value, new WeakSet());
}

/**
 * Recursive worker threading the set of objects on the current path, so a cycle
 * (an object reachable from itself) fails closed instead of overflowing.
 */
function encode(value: unknown, seen: WeakSet<object>): string {
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
      return encodeObject(value as object, seen);
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
 * views, and plain records each get a distinct, deterministic form. A cyclic
 * reference or a class instance with opaque state is not representable
 * injectively, so it fails closed.
 */
function encodeObject(value: object, seen: WeakSet<object>): string {
  if (seen.has(value)) {
    throw new TypeError("canonicalJSON: cannot serialise a cyclic structure");
  }
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return encodeArray(value, seen);
    }
    if (value instanceof Map) {
      return encodeMap(value, seen);
    }
    if (value instanceof Set) {
      return encodeSet(value, seen);
    }
    if (value instanceof Date) {
      return `Date(${value.getTime()})`;
    }
    if (value instanceof RegExp) {
      return `RegExp(${JSON.stringify(value.source)},${JSON.stringify(value.flags)})`;
    }
    if (ArrayBuffer.isView(value)) {
      return encodeView(value, seen);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype === Object.prototype || prototype === null) {
      return encodeRecord(value as Record<string, unknown>, seen);
    }
    // A class instance's identity lives in opaque internal state, not its
    // enumerable keys — fail closed rather than conflate distinct instances.
    throw new TypeError(
      "canonicalJSON: cannot serialise a non-plain object (class instance)",
    );
  } finally {
    // Leave the path so a value shared across siblings (a DAG, not a cycle)
    // encodes normally on each visit.
    seen.delete(value);
  }
}

/**
 * Encode an array element-wise, giving an absent slot (a hole) a distinct bare
 * token so a sparse array never collapses to a shorter one.
 */
function encodeArray(value: unknown[], seen: WeakSet<object>): string {
  const parts: string[] = [];
  for (let index = 0; index < value.length; index++) {
    parts.push(index in value ? encode(value.at(index), seen) : "hole");
  }
  return `[${parts.join(",")}]`;
}

/**
 * Encode an ArrayBuffer view. A typed array is encoded by its logical element
 * values (endianness-independent); a `DataView`, which exposes no elements, by
 * its raw bytes. The constructor tag keeps view types distinct.
 */
function encodeView(value: ArrayBufferView, seen: WeakSet<object>): string {
  if (value instanceof DataView) {
    const bytes = new Uint8Array(
      value.buffer,
      value.byteOffset,
      value.byteLength,
    );
    return `DataView(${Array.from(bytes).join(",")})`;
  }
  const items = Array.from(value as unknown as ArrayLike<number | bigint>);
  return `${value.constructor.name}(${items.map((item) => encode(item, seen)).join(",")})`;
}

/** Encode a `Map` as a tagged, key-sorted set of canonical `key:value` pairs. */
function encodeMap(
  value: Map<unknown, unknown>,
  seen: WeakSet<object>,
): string {
  const entries = Array.from(value.entries())
    .map(([key, val]) => `${encode(key, seen)}:${encode(val, seen)}`)
    .sort();
  return `Map{${entries.join(",")}}`;
}

/** Encode a `Set` as a tagged, sorted list of canonical elements. */
function encodeSet(value: Set<unknown>, seen: WeakSet<object>): string {
  const items = Array.from(value)
    .map((item) => encode(item, seen))
    .sort();
  return `Set{${items.join(",")}}`;
}

/**
 * Encode a plain record with its own-enumerable string keys sorted, failing
 * closed on a throwing getter. Symbol keys are rejected (a symbol-keyed object
 * would otherwise collapse to `{}`); only own-enumerable string keys are
 * canonicalised.
 */
function encodeRecord(
  record: Record<string, unknown>,
  seen: WeakSet<object>,
): string {
  if (Object.getOwnPropertySymbols(record).length > 0) {
    throw new TypeError(
      "canonicalJSON: cannot serialise an object with symbol keys",
    );
  }
  const keys = Object.keys(record).sort();
  const entries = keys.map(
    (key) =>
      `${JSON.stringify(key)}:${encode(readProperty(record, key), seen)}`,
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
