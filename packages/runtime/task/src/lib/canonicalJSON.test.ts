import { describe, expect, it } from "vitest";
import canonicalJSON from "./canonicalJSON.js";

describe("canonicalJSON", () => {
  describe("primitives", () => {
    it("encodes null", () => {
      expect(canonicalJSON(null)).toBe("null");
    });

    it("encodes undefined with a bare token distinct from the string", () => {
      expect(canonicalJSON(undefined)).toBe("undefined");
      expect(canonicalJSON("undefined")).toBe('"undefined"');
    });

    it("encodes booleans", () => {
      expect(canonicalJSON(true)).toBe("true");
      expect(canonicalJSON(false)).toBe("false");
    });

    it("encodes bigint with an n suffix", () => {
      expect(canonicalJSON(42n)).toBe("42n");
    });

    it("encodes strings quoted and escaped", () => {
      expect(canonicalJSON("hi")).toBe('"hi"');
      expect(canonicalJSON('a"b')).toBe('"a\\"b"');
    });
  });

  describe("numbers", () => {
    it("encodes a finite number", () => {
      expect(canonicalJSON(42)).toBe("42");
      expect(canonicalJSON(-3.5)).toBe("-3.5");
    });

    it("encodes NaN distinct from the string", () => {
      expect(canonicalJSON(Number.NaN)).toBe("NaN");
      expect(canonicalJSON("NaN")).toBe('"NaN"');
    });

    it("encodes positive and negative Infinity", () => {
      expect(canonicalJSON(Number.POSITIVE_INFINITY)).toBe("Infinity");
      expect(canonicalJSON(Number.NEGATIVE_INFINITY)).toBe("-Infinity");
    });

    it("distinguishes negative zero from zero", () => {
      expect(canonicalJSON(-0)).toBe("-0");
      expect(canonicalJSON(0)).toBe("0");
    });
  });

  describe("collections", () => {
    it("encodes arrays preserving order", () => {
      expect(canonicalJSON([3, 1, 2])).toBe("[3,1,2]");
    });

    it("sorts object keys deterministically regardless of insertion order", () => {
      expect(canonicalJSON({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
      expect(canonicalJSON({ b: 1, a: 2 })).toBe(canonicalJSON({ a: 2, b: 1 }));
    });

    it("tags and sorts Map entries by canonical key", () => {
      const map = new Map<string, number>([
        ["b", 1],
        ["a", 2],
      ]);
      expect(canonicalJSON(map)).toBe('Map{"a":2,"b":1}');
    });

    it("tags and sorts Set elements", () => {
      expect(canonicalJSON(new Set([3, 1, 2]))).toBe("Set{1,2,3}");
    });

    it("tags typed arrays by their constructor", () => {
      expect(canonicalJSON(new Uint8Array([1, 2, 3]))).toBe(
        "Uint8Array(1,2,3)",
      );
    });

    it("recurses into nested structures", () => {
      expect(canonicalJSON({ xs: [{ b: 2, a: 1 }], n: null })).toBe(
        '{"n":null,"xs":[{"a":1,"b":2}]}',
      );
    });
  });

  describe("fail-closed behaviour", () => {
    it("throws on a function", () => {
      expect(() => canonicalJSON(() => undefined)).toThrow(TypeError);
    });

    it("throws on a symbol", () => {
      expect(() => canonicalJSON(Symbol("x"))).toThrow(TypeError);
    });

    it("throws when a property getter throws an Error", () => {
      const obj = {
        get bad(): unknown {
          throw new Error("boom");
        },
      };
      expect(() => canonicalJSON(obj)).toThrow(TypeError);
      expect(() => canonicalJSON(obj)).toThrow(/reading property "bad" threw/);
    });

    it("throws when a property getter throws a non-Error", () => {
      const obj = {
        get bad(): unknown {
          throw "raw";
        },
      };
      expect(() => canonicalJSON(obj)).toThrow(TypeError);
      expect(() => canonicalJSON(obj)).toThrow(/reading property "bad" threw/);
    });
  });
});

describe("canonicalJSON — injectivity edge cases", () => {
  it("distinguishes a sparse hole from an empty array and from undefined", () => {
    expect(canonicalJSON(new Array(1))).toBe("[hole]");
    expect(canonicalJSON([])).toBe("[]");
    expect(canonicalJSON(new Array(1))).not.toBe(canonicalJSON([]));
    expect(canonicalJSON([undefined])).toBe("[undefined]");
    expect(canonicalJSON([undefined])).not.toBe(canonicalJSON(new Array(1)));
  });

  it("encodes a DataView by its raw bytes, keeping distinct payloads distinct", () => {
    const dv = new DataView(new Uint8Array([255, 1]).buffer);
    expect(canonicalJSON(dv)).toBe("DataView(255,1)");
    expect(canonicalJSON(dv)).not.toBe(
      canonicalJSON(new DataView(new Uint8Array([0, 0]).buffer)),
    );
  });

  it("tags Date and RegExp so distinct values stay distinct", () => {
    expect(canonicalJSON(new Date(1_577_836_800_000))).toBe(
      "Date(1577836800000)",
    );
    expect(canonicalJSON(new Date(1_577_836_800_000))).not.toBe(
      canonicalJSON(new Date(1_609_459_200_000)),
    );
    expect(canonicalJSON(/abc/g)).not.toBe(canonicalJSON(/abd/g));
  });

  it("fails closed on a class instance rather than collapsing it to {}", () => {
    const instance = new (class Widget {})();
    expect(() => canonicalJSON(instance)).toThrow(TypeError);
  });

  it("fails closed on an object with symbol keys", () => {
    expect(() => canonicalJSON({ [Symbol("x")]: 1 })).toThrow(TypeError);
  });

  it("encodes a null-prototype object as a plain record", () => {
    const bare = Object.create(null) as Record<string, unknown>;
    bare.a = 1;
    expect(canonicalJSON(bare)).toBe('{"a":1}');
  });
});

describe("canonicalJSON — cycles and shared references", () => {
  it("fails closed on a cyclic object", () => {
    const a: Record<string, unknown> = {};
    a.self = a;
    expect(() => canonicalJSON(a)).toThrow(TypeError);
  });

  it("fails closed on a cycle through an array", () => {
    const arr: unknown[] = [];
    arr.push(arr);
    expect(() => canonicalJSON(arr)).toThrow(TypeError);
  });

  it("encodes a value shared across siblings without a false cycle", () => {
    const shared = { x: 1 };
    expect(canonicalJSON({ a: shared, b: shared })).toBe(
      '{"a":{"x":1},"b":{"x":1}}',
    );
  });
});

describe("canonicalJSON — bare-token and byte-order injectivity", () => {
  it("keeps Infinity, -Infinity, and bigint distinct from their string forms", () => {
    expect(canonicalJSON(Number.POSITIVE_INFINITY)).not.toBe(
      canonicalJSON("Infinity"),
    );
    expect(canonicalJSON(Number.NEGATIVE_INFINITY)).not.toBe(
      canonicalJSON("-Infinity"),
    );
    expect(canonicalJSON(42n)).not.toBe(canonicalJSON("42n"));
    expect(canonicalJSON(42n)).not.toBe(canonicalJSON(42));
  });

  it("encodes a typed array by element values, independent of byte order", () => {
    expect(canonicalJSON(new Uint16Array([1, 2]))).toBe("Uint16Array(1,2)");
  });
});
